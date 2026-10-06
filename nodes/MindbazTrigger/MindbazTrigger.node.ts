import type {
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { mindbazWebhookRequest } from '../Mindbaz/GenericFunctions';

// n8n event → Mindbaz (functionality, action) pair.
const EVENT_MAP: { [key: string]: { functionnality: string; action: string } } = {
	mailOpened: { functionnality: 'tracking', action: 'opening' },
	linkClicked: { functionnality: 'tracking', action: 'click' },
	newSubscriber: { functionnality: 'subscriber', action: 'create' },
	editSubscriber: { functionnality: 'subscriber', action: 'update' },
	deleteSubscriber: { functionnality: 'subscriber', action: 'delete' },
	unsubSubscriber: { functionnality: 'subscriber', action: 'unsub' },
};

/**
 * Mindbaz Trigger — programmatic webhook registration via the Mindbaz gateway
 * (`webhook.mindbaz.com/wh/n8n/{siteId}`), authenticated by the client's API
 * key. No shared token.
 *
 * On activation the node registers its webhook URL and stores the returned hook
 * id; on deactivation it deletes the hook by that id.
 */
export class MindbazTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mindbaz Trigger',
		name: 'mindbazTrigger',
		icon: { light: 'file:mindbaz.svg', dark: 'file:mindbaz.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts a workflow when a Mindbaz subscriber or tracking event occurs',
		defaults: {
			name: 'Mindbaz Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'mindbazApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				default: 'newSubscriber',
				description: 'Which Mindbaz event triggers this workflow',
				options: [
					{
						name: 'Link Clicked',
						value: 'linkClicked',
						description: 'Triggers when a link in a mail is clicked',
					},
					{
						name: 'Mail Opened',
						value: 'mailOpened',
						description: 'Triggers when a mail is opened',
					},
					{
						name: 'Subscriber Created',
						value: 'newSubscriber',
						description: 'Triggers when a subscriber is added to the database',
					},
					{
						name: 'Subscriber Deleted',
						value: 'deleteSubscriber',
						description: 'Triggers when a subscriber is deleted from the database',
					},
					{
						name: 'Subscriber Unsubscribed',
						value: 'unsubSubscriber',
						description: 'Triggers when a subscriber unsubscribes from the newsletter',
					},
					{
						name: 'Subscriber Updated',
						value: 'editSubscriber',
						description: 'Triggers when a subscriber is updated',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				return webhookData.hookId !== undefined;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const url = this.getNodeWebhookUrl('default');
				const event = this.getNodeParameter('event') as string;
				const { functionnality, action } = EVENT_MAP[event];

				const response = await mindbazWebhookRequest.call(this, 'POST', {
					hookUrl: url,
					action,
					functionnality,
				});

				// The gateway returns the created hook (directly or wrapped in an array).
				const created = Array.isArray(response) ? response[0] : response;
				const hookId = (created as IDataObject)?.id;

				if (hookId === undefined) {
					return false;
				}

				this.getWorkflowStaticData('node').hookId = hookId;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.hookId === undefined) {
					return true;
				}

				try {
					await mindbazWebhookRequest.call(this, 'DELETE', {
						hookId: webhookData.hookId as string | number,
					});
				} catch (error) {
					this.logger.error(
						`Mindbaz webhook deletion failed: ${(error as Error).message}`,
					);
					return false;
				}

				delete webhookData.hookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData() as IDataObject;
		return {
			workflowData: [this.helpers.returnJsonArray(body)],
		};
	}
}
