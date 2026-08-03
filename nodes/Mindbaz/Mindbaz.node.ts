import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	assertMindbazSuccess,
	mindbazApiRequest,
	mindbazFieldTypeLabel,
	parseSubscriberFields,
} from './GenericFunctions';
import { subscriberFields, subscriberOperations } from './SubscriberDescription';
import { mailFields, mailOperations } from './MailDescription';

// Attachment validation, ported from the Zapier `action_send_mail` helpers.
const PDF_NAME_REGEX = /^[a-zA-Z0-9_.-]+\.pdf$/;
const BASE64_REGEX =
	/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/;
const MAX_ATTACHMENT_BYTES = 2097152; // 2MB

export class Mindbaz implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mindbaz',
		name: 'mindbaz',
		icon: { light: 'file:mindbaz.svg', dark: 'file:mindbaz.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage Mindbaz subscribers and send OneShot campaigns',
		defaults: {
			name: 'Mindbaz',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'mindbazApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Subscriber', value: 'subscriber' },
					{ name: 'Mail', value: 'mail' },
				],
				default: 'subscriber',
			},
			...subscriberOperations,
			...subscriberFields,
			...mailOperations,
			...mailFields,
		],
	};

	methods = {
		loadOptions: {
			// Fields available when creating a subscriber (id 0 excluded).
			async getFieldsCreate(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = await mindbazApiRequest.call(this, 'GET', '/fields/list');
				const values = (response.data as IDataObject[]) ?? [];
				return values
					.filter((item) => item.id !== 0)
					.map((item) => ({
						name: `${item.description} (${mindbazFieldTypeLabel(item.fieldType as number)})`,
						value: item.id as number,
					}));
			},

			// Editable fields available when updating a subscriber.
			async getFieldsUpdate(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = await mindbazApiRequest.call(this, 'GET', '/fields/list');
				const values = (response.data as IDataObject[]) ?? [];
				return values
					.filter((item) => item.isEditable === true && item.id !== 0)
					.map((item) => ({
						name: `${item.description} (${mindbazFieldTypeLabel(item.fieldType as number)})`,
						value: item.id as number,
					}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let result: IDataObject | IDataObject[];

				if (resource === 'subscriber') {
					result = await handleSubscriber.call(this, operation, i);
				} else if (resource === 'mail') {
					result = await handleMail.call(this, operation, i);
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`, {
						itemIndex: i,
					});
				}

				const asArray = Array.isArray(result) ? result : [result];
				for (const entry of asArray) {
					returnData.push({ json: entry, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

/** Build the `[{ fields: [{ idField, value }] }]` body from the UI collection. */
function buildFieldsBody(
	this: IExecuteFunctions,
	itemIndex: number,
	extra: Array<{ idField: number; value: unknown }> = [],
): string {
	const collection = this.getNodeParameter('fields', itemIndex, {}) as {
		field?: Array<{ idField: number | string; value: unknown }>;
	};

	const fields = [
		...extra,
		...(collection.field ?? []).map((f) => ({
			idField: typeof f.idField === 'string' ? Number(f.idField) : f.idField,
			value: f.value,
		})),
	];

	return JSON.stringify([{ fields }]);
}

async function handleSubscriber(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'create') {
		const body = buildFieldsBody.call(this, i);
		const response = await mindbazApiRequest.call(this, 'POST', '/subscribers', body);
		return assertMindbazSuccess.call(this, response, i);
	}

	if (operation === 'update') {
		const subscriberId = this.getNodeParameter('subscriberId', i) as number;
		const body = buildFieldsBody.call(this, i, [{ idField: 0, value: subscriberId }]);
		const response = await mindbazApiRequest.call(this, 'PUT', '/subscribers', body);
		return assertMindbazSuccess.call(this, response, i);
	}

	if (operation === 'unsubscribe') {
		const subscriberId = this.getNodeParameter('subscriberId', i) as number;
		const body = [
			{
				fields: [
					{ idField: 0, value: subscriberId },
					{ idField: 7, value: 1 },
				],
			},
		];
		const response = await mindbazApiRequest.call(this, 'PUT', '/subscribers', body);
		return assertMindbazSuccess.call(this, response, i);
	}

	if (operation === 'search') {
		const email = this.getNodeParameter('email', i) as string;
		const response = await mindbazApiRequest.call(this, 'GET', '/subscribers', {}, {
			by: 'email',
			emailEncoding: 'none',
			values: email,
		});
		const data = (response.data as IDataObject[]) ?? [];
		return parseSubscriberFields(data);
	}

	throw new NodeOperationError(this.getNode(), `Unknown subscriber operation: ${operation}`, {
		itemIndex: i,
	});
}

async function handleMail(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<IDataObject> {
	const campaignId = this.getNodeParameter('campaignId', i) as number;
	const subscriberId = this.getNodeParameter('subscriberId', i) as number;

	const body: IDataObject = { campaignId, subscriberId };

	if (operation === 'send') {
		const additional = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

		if (additional.fromAlias) body.fromAlias = additional.fromAlias;
		if (additional.subject) body.subject = additional.subject;
		if (additional.messageHTML) body.messageHTML = additional.messageHTML;
		if (additional.messageTXT) body.messageTXT = additional.messageTXT;
		if (additional.subscriberMD5) body.subscriberMD5 = additional.subscriberMD5;
		if (additional.subscriberSHA256) body.subscriberSHA256 = additional.subscriberSHA256;
		if (additional.idFields) {
			body.idFields = String(additional.idFields)
				.split(',')
				.map((id) => Number(id.trim()))
				.filter((id) => !Number.isNaN(id));
		}

		const attachments = this.getNodeParameter('attachments', i, {}) as {
			attachment?: Array<{ fileName: string; fileContent: string }>;
		};

		if (attachments.attachment?.length) {
			body.attachments = attachments.attachment.map(({ fileName, fileContent }) => {
				validateAttachment.call(this, fileName, fileContent, i);
				return { fileName, fileContent };
			});
		}
	}

	const response = await mindbazApiRequest.call(this, 'POST', '/OneShot', body);
	return assertMindbazSuccess.call(this, response, i);
}

/** Validate a PDF attachment name and Base64 content (Zapier parity). */
function validateAttachment(
	this: IExecuteFunctions,
	name: string,
	content: string,
	itemIndex: number,
): void {
	if (!PDF_NAME_REGEX.test(name)) {
		throw new NodeOperationError(this.getNode(), `Error with ${name}: file name is not valid`, {
			itemIndex,
		});
	}
	// Check size before regex to avoid RangeError on very large strings.
	if (Buffer.byteLength(content) > MAX_ATTACHMENT_BYTES) {
		throw new NodeOperationError(
			this.getNode(),
			`Error with ${name}: file size exceeds the 2MB Base64 limit`,
			{ itemIndex },
		);
	}
	if (!BASE64_REGEX.test(content)) {
		throw new NodeOperationError(
			this.getNode(),
			`Error with ${name}: file content is not valid Base64`,
			{ itemIndex },
		);
	}
}
