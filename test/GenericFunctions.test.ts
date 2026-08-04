import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	MINDBAZ_API_BASE,
	MINDBAZ_WEBHOOK_BASE,
	assertMindbazSuccess,
	mindbazApiRequest,
	mindbazFieldTypeLabel,
	mindbazWebhookRequest,
	parseSubscriberFields,
} from '../nodes/Mindbaz/GenericFunctions';
import { createExecuteMock, createHookMock } from './helpers';

describe('mindbazApiRequest', () => {
	it('builds a GET request without a body and returns the response', async () => {
		const { ctx, httpRequestWithAuthentication } = createExecuteMock({
			httpImpl: () => ({ data: [{ id: 1 }] }),
		});

		const result = await mindbazApiRequest.call(ctx as any, 'GET', '/subscribers', {}, { by: 'email' });

		expect(result).toEqual({ data: [{ id: 1 }] });
		const [, opts] = httpRequestWithAuthentication.mock.calls[0];
		expect(opts.method).toBe('GET');
		expect(opts.url).toBe(`${MINDBAZ_API_BASE}/42/subscribers`);
		expect(opts.qs).toEqual({ by: 'email' });
		expect(opts.body).toBeUndefined();
	});

	it('attaches the body for non-GET requests', async () => {
		const { ctx, httpRequestWithAuthentication } = createExecuteMock({
			httpImpl: () => ({ success: true }),
		});

		await mindbazApiRequest.call(ctx as any, 'POST', '/OneShot', { campaignId: 1 });

		const [, opts] = httpRequestWithAuthentication.mock.calls[0];
		expect(opts.method).toBe('POST');
		expect(opts.body).toEqual({ campaignId: 1 });
	});

	it('wraps transport errors in a NodeApiError', async () => {
		const { ctx } = createExecuteMock({
			httpImpl: () => {
				throw { message: 'boom' };
			},
		});

		await expect(mindbazApiRequest.call(ctx as any, 'GET', '/thematics')).rejects.toBeInstanceOf(
			NodeApiError,
		);
	});
});

describe('mindbazWebhookRequest', () => {
	it('targets the n8n api path with the site id and body', async () => {
		const { ctx, httpRequestWithAuthentication } = createHookMock({
			httpImpl: () => ({ id: 99 }),
		});

		const result = await mindbazWebhookRequest.call(ctx as any, 'POST', { hookUrl: 'x' });

		expect(result).toEqual({ id: 99 });
		const [, opts] = httpRequestWithAuthentication.mock.calls[0];
		expect(opts.method).toBe('POST');
		expect(opts.url).toBe(`${MINDBAZ_WEBHOOK_BASE}/n8n/42`);
		expect(opts.body).toEqual({ hookUrl: 'x' });
	});

	it('defaults the body to an empty object when none is provided', async () => {
		const { ctx, httpRequestWithAuthentication } = createHookMock({
			httpImpl: () => ({ success: true }),
		});

		await mindbazWebhookRequest.call(ctx as any, 'DELETE');

		const [, opts] = httpRequestWithAuthentication.mock.calls[0];
		expect(opts.body).toEqual({});
	});

	it('wraps transport errors in a NodeApiError', async () => {
		const { ctx } = createHookMock({
			httpImpl: () => {
				throw { message: 'down' };
			},
		});

		await expect(
			mindbazWebhookRequest.call(ctx as any, 'DELETE', { hookId: 1 }),
		).rejects.toBeInstanceOf(NodeApiError);
	});
});

describe('assertMindbazSuccess', () => {
	const run = (response: any) => {
		const { ctx } = createExecuteMock({});
		return () => assertMindbazSuccess.call(ctx as any, response, 0);
	};

	it('throws when the response is null', () => {
		expect(run(null)).toThrow(NodeOperationError);
	});

	it('throws the KO string returned by OneShot', () => {
		expect(run({ data: 'KO: invalid campaign' })).toThrow('KO: invalid campaign');
	});

	it('accepts a non-KO string payload and strips data', () => {
		expect(run({ data: 'OK', success: true })()).toEqual({ success: true });
	});

	it('throws the error message when data is null and an error is present', () => {
		expect(run({ data: null, error: 'bad request' })).toThrow('bad request');
	});

	it('throws a default message when data is null and no error is present', () => {
		expect(run({ data: null })).toThrow('No data has been returned');
	});

	it('returns the response without the data envelope on success', () => {
		expect(run({ data: [{ id: 1 }], success: true, error: null })()).toEqual({
			success: true,
			error: null,
		});
	});
});

describe('parseSubscriberFields', () => {
	it('flattens fields into fld_<id> keys and keeps entries without fields', () => {
		const parsed = parseSubscriberFields([
			{
				id: 1,
				fields: [
					{ idField: 0, value: 1 },
					{ idField: 1, value: 'test@mail.com' },
				],
			},
			{ id: 2 },
		]);

		expect(parsed[0]).toEqual({ id: 1, fld_0: 1, fld_1: 'test@mail.com' });
		expect(parsed[0]).not.toHaveProperty('fields');
		expect(parsed[1]).toEqual({ id: 2 });
	});
});

describe('mindbazFieldTypeLabel', () => {
	it('maps known ids and falls back to string for unknown ids', () => {
		expect(mindbazFieldTypeLabel(4)).toBe('list');
		expect(mindbazFieldTypeLabel(99)).toBe('string');
	});
});
