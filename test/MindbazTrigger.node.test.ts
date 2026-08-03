import { MindbazTrigger } from '../nodes/MindbazTrigger/MindbazTrigger.node';

const node = new MindbazTrigger();

describe('MindbazTrigger - webhook', () => {
	it('outputs the incoming Mindbaz payload as workflow data', async () => {
		const payload = {
			event: 'email.opened',
			event_id: 'd883a52e-dab4-404c-bae7-d9acba75a058',
			id_site: 100,
			type: 'Mindbaz',
			data: { id_subscriber: 0, email: '0123456789DAFDEF' },
		};

		const ctx = {
			getBodyData: () => payload,
			helpers: {
				returnJsonArray: (data: unknown) =>
					(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
			},
		};

		const result = await node.webhook.call(ctx as any);

		expect(result.workflowData).toEqual([[{ json: payload }]]);
	});
});
