import type {
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	IDataObject,
} from 'n8n-workflow';

/**
 * Mindbaz Trigger — manual webhook model, one event per node.
 *
 * Each node instance exposes its own webhook URL. The user picks the event
 * here, then registers a matching webhook in the Mindbaz back office
 * (Webhooks → add a webhook → paste this node's URL, choose the same event,
 * enable). Mindbaz routes one event type per URL, so the node simply outputs
 * whatever it receives. No credential or programmatic subscription required.
 */
export class MindbazTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mindbaz Trigger',
		name: 'mindbazTrigger',
		icon: 'file:mindbaz.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Receives a Mindbaz webhook event (one event per node)',
		defaults: {
			name: 'Mindbaz Trigger',
		},
		inputs: [],
		outputs: ['main'],
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
				default: 'mailOpened',
				description:
					'Which Mindbaz event this trigger handles. Create a webhook for this same event in Mindbaz, pointing to this node URL.',
				options: [
					{ name: 'Bounce', value: 'bounce' },
					{ name: 'Contact Added', value: 'contactAdded' },
					{ name: 'Contact Deleted', value: 'contactDeleted' },
					{ name: 'Contact Updated', value: 'contactUpdated' },
					{ name: 'Link Clicked', value: 'linkClicked' },
					{ name: 'List-Unsubscribe', value: 'listUnsubscribe' },
					{ name: 'Mail Opened', value: 'mailOpened' },
					{ name: 'Mail Opened (Deliverability)', value: 'mailOpenedDeliverability' },
					{ name: 'Spam Complaint', value: 'spamComplaint' },
					{ name: 'Unsubscribe', value: 'unsubscribe' },
				],
			},
			{
				displayName:
					'Copy the <b>Production URL</b> below. In Mindbaz (Webhooks → add a webhook), create a webhook for the event selected above, paste this URL, and enable it. Your n8n instance must be reachable from the internet for Mindbaz to deliver events.',
				name: 'setupNotice',
				type: 'notice',
				default: '',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData() as IDataObject;
		return {
			workflowData: [this.helpers.returnJsonArray(body)],
		};
	}
}
