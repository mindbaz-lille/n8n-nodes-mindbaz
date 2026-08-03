import type {
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { mindbazApiRequest } from '../Mindbaz/GenericFunctions';

// n8n event → Mindbaz `action` code (from the /Webhook API).
const EVENT_ACTIONS: { [key: string]: string } = {
	mailOpened: 'TRACKING_OPENING',
	linkClicked: 'TRACKING_CLICK',
	newSubscriber: 'SUBSCRIBER_CREATE',
	editSubscriber: 'SUBSCRIBER_UPDATE',
	deleteSubscriber: 'SUBSCRIBER_DELETE',
	unsubSubscriber: 'SUBSCRIBER_UNSUB',
};

const WEBHOOK_TYPE = 'n8n';

/**
 * Mindbaz Trigger — programmatic webhook registration via the Mindbaz REST API
 * (`/api/{siteId}/Webhook`), authenticated by the client's API key. No token.
 *
 * On activation the node registers its webhook URL; on deactivation it looks the
 * hook up by URL in `/Webhook/list` and deletes it by id.
 */
export class MindbazTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mindbaz Trigger',
		name: 'mindbazTrigger',
		icon: { light: 'file:mindbaz.svg', dark: 'file:mindbaz.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts a workflow when a Mindbaz subscriber or tracking event occurs',
		defaults: {
			name: 'Mindbaz Trigger',
		},
		usableAsTool: true,
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
				const url = this.getNodeWebhookUrl('default');
				const response = await mindbazApiRequest.call(this, 'GET', '/Webhook/list');
				const list = (response.data as IDataObject[]) ?? [];
				return list.some((webhook) => webhook.url === url);
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const url = this.getNodeWebhookUrl('default');
				const event = this.getNodeParameter('event') as string;

				await mindbazApiRequest.call(this, 'POST', '/Webhook', {
					action: EVENT_ACTIONS[event],
					webhookType: WEBHOOK_TYPE,
					webhookUrl: url,
					isEnabled: true,
				});
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const url = this.getNodeWebhookUrl('default');
				const response = await mindbazApiRequest.call(this, 'GET', '/Webhook/list');
				const list = (response.data as IDataObject[]) ?? [];
				const existing = list.find((webhook) => webhook.url === url);

				if (existing === undefined) {
					return true; // nothing registered for this URL
				}

				await mindbazApiRequest.call(this, 'DELETE', `/Webhook/${existing.id as number}`);
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
