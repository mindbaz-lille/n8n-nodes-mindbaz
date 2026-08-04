import { MindbazTrigger } from '../nodes/MindbazTrigger/MindbazTrigger.node';
import { createHookMock } from './helpers';

const node = new MindbazTrigger();
const hooks = node.webhookMethods.default;

describe('MindbazTrigger - checkExists', () => {
	it('is false when no hook id is stored', async () => {
		const { ctx } = createHookMock({ staticData: {} });
		expect(await hooks.checkExists.call(ctx as any)).toBe(false);
	});

	it('is true when a hook id is already stored', async () => {
		const { ctx } = createHookMock({ staticData: { hookId: 5 } });
		expect(await hooks.checkExists.call(ctx as any)).toBe(true);
	});
});

describe('MindbazTrigger - create', () => {
	it('registers on the n8n gateway path with the mapped event and stores the id', async () => {
		const { ctx, httpRequestWithAuthentication, staticData } = createHookMock({
			params: { event: 'mailOpened' },
			httpImpl: () => ({ id: 42 }),
		});

		expect(await hooks.create.call(ctx as any)).toBe(true);
		expect(staticData.hookId).toBe(42);

		const [, opts] = httpRequestWithAuthentication.mock.calls[0];
		expect(opts.method).toBe('POST');
		expect(opts.url).toBe('https://webhook.mindbaz.com/wh/n8n/42');
		expect(opts.body).toEqual({
			hookUrl: 'https://n8n.example.com/webhook/abc',
			functionnality: 'tracking',
			action: 'opening',
		});
	});

	it('accepts an array-wrapped gateway response', async () => {
		const { ctx, staticData } = createHookMock({
			params: { event: 'newSubscriber' },
			httpImpl: () => [{ id: 7 }],
		});

		expect(await hooks.create.call(ctx as any)).toBe(true);
		expect(staticData.hookId).toBe(7);
	});

	it('returns false when the gateway returns no id', async () => {
		const { ctx, staticData } = createHookMock({
			params: { event: 'newSubscriber' },
			httpImpl: () => [],
		});

		expect(await hooks.create.call(ctx as any)).toBe(false);
		expect(staticData.hookId).toBeUndefined();
	});
});

describe('MindbazTrigger - delete', () => {
	it('returns true immediately when there is no stored hook', async () => {
		const { ctx, httpRequestWithAuthentication } = createHookMock({ staticData: {} });

		expect(await hooks.delete.call(ctx as any)).toBe(true);
		expect(httpRequestWithAuthentication).not.toHaveBeenCalled();
	});

	it('deletes the stored hook and clears the static data', async () => {
		const { ctx, httpRequestWithAuthentication, staticData } = createHookMock({
			staticData: { hookId: 5 },
			httpImpl: () => ({ success: true }),
		});

		expect(await hooks.delete.call(ctx as any)).toBe(true);
		expect(staticData.hookId).toBeUndefined();

		const [, opts] = httpRequestWithAuthentication.mock.calls[0];
		expect(opts.method).toBe('DELETE');
		expect(opts.body).toEqual({ hookId: 5 });
	});

	it('returns false and keeps the id when the gateway deletion fails', async () => {
		const { ctx, staticData } = createHookMock({
			staticData: { hookId: 5 },
			httpImpl: () => {
				throw new Error('gateway down');
			},
		});

		expect(await hooks.delete.call(ctx as any)).toBe(false);
		expect(staticData.hookId).toBe(5);
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
