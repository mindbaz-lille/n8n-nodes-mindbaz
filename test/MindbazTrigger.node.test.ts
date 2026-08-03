import { MindbazTrigger } from '../nodes/MindbazTrigger/MindbazTrigger.node';
import { createHookMock } from './helpers';

const node = new MindbazTrigger();
const hooks = node.webhookMethods.default;
const URL = 'https://n8n.example.com/webhook/abc';

describe('MindbazTrigger - checkExists', () => {
	it('is true when a webhook with our URL is registered', async () => {
		const { ctx } = createHookMock({
			httpImpl: () => ({ data: [{ id: 1, url: URL, action: 'SUBSCRIBER_CREATE' }] }),
		});
		expect(await hooks.checkExists.call(ctx as any)).toBe(true);
	});

	it('is false when none matches (and tolerates a response without data)', async () => {
		const { ctx } = createHookMock({ httpImpl: () => ({}) });
		expect(await hooks.checkExists.call(ctx as any)).toBe(false);
	});
});

describe('MindbazTrigger - create', () => {
	it('registers the mapped action, type "n8n" and the node URL', async () => {
		const { ctx, httpRequestWithAuthentication } = createHookMock({
			params: { event: 'mailOpened' },
			httpImpl: () => ({ success: true }),
		});

		expect(await hooks.create.call(ctx as any)).toBe(true);

		const [, opts] = httpRequestWithAuthentication.mock.calls[0];
		expect(opts.method).toBe('POST');
		expect(opts.url).toContain('/Webhook');
		expect(opts.body).toEqual({
			action: 'TRACKING_OPENING',
			webhookType: 'n8n',
			webhookUrl: URL,
			isEnabled: true,
		});
	});
});

describe('MindbazTrigger - delete', () => {
	it('finds the webhook by URL and deletes it by id', async () => {
		const { ctx, httpRequestWithAuthentication } = createHookMock({
			httpImpl: (o: any) => (o.method === 'GET' ? { data: [{ id: 7, url: URL }] } : {}),
		});

		expect(await hooks.delete.call(ctx as any)).toBe(true);

		const del = httpRequestWithAuthentication.mock.calls.find(([, o]) => o.method === 'DELETE');
		expect(del).toBeDefined();
		expect(del![1].url).toContain('/Webhook/7');
	});

	it('returns true without deleting when none matches (tolerates missing data)', async () => {
		const { ctx, httpRequestWithAuthentication } = createHookMock({ httpImpl: () => ({}) });

		expect(await hooks.delete.call(ctx as any)).toBe(true);
		expect(httpRequestWithAuthentication.mock.calls.some(([, o]) => o.method === 'DELETE')).toBe(
			false,
		);
	});
});

describe('MindbazTrigger - webhook', () => {
	it('outputs the incoming Mindbaz payload as workflow data', async () => {
		const payload = { event: 'email.opened', id_site: 100, data: { id_subscriber: 0 } };
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
