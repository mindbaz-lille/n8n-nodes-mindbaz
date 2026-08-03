import { Mindbaz } from '../nodes/Mindbaz/Mindbaz.node';
import { createExecuteMock } from './helpers';

const node = new Mindbaz();

const runExecute = (ctx: any) => node.execute.call(ctx);

describe('Mindbaz node - subscriber', () => {
	it('create: builds the fields body and casts string ids to numbers', async () => {
		const { ctx, httpRequestWithAuthentication } = createExecuteMock({
			params: {
				resource: 'subscriber',
				operation: 'create',
				fields: { field: [{ idField: '1', value: 'a@b.com' }, { idField: 2, value: 5 }] },
			},
			httpImpl: () => ({ data: [{ id: 1 }], success: true, error: null }),
		});

		const out = await runExecute(ctx);

		expect(out[0][0].json).toEqual({ success: true, error: null });
		const [, opts] = httpRequestWithAuthentication.mock.calls[0];
		expect(opts.method).toBe('POST');
		expect(opts.url).toContain('/subscribers');
		expect(JSON.parse(opts.body)).toEqual([
			{ fields: [{ idField: 1, value: 'a@b.com' }, { idField: 2, value: 5 }] },
		]);
	});

	it('create: handles the absence of a fields collection', async () => {
		const { ctx, httpRequestWithAuthentication } = createExecuteMock({
			params: { resource: 'subscriber', operation: 'create' },
			httpImpl: () => ({ data: [], success: true }),
		});

		await runExecute(ctx);

		const [, opts] = httpRequestWithAuthentication.mock.calls[0];
		expect(JSON.parse(opts.body)).toEqual([{ fields: [] }]);
	});

	it('update: prepends field 0 with the subscriber id and uses PUT', async () => {
		const { ctx, httpRequestWithAuthentication } = createExecuteMock({
			params: {
				resource: 'subscriber',
				operation: 'update',
				subscriberId: 7,
				fields: { field: [{ idField: 1, value: 'x' }] },
			},
			httpImpl: () => ({ data: [], success: true }),
		});

		await runExecute(ctx);

		const [, opts] = httpRequestWithAuthentication.mock.calls[0];
		expect(opts.method).toBe('PUT');
		expect(JSON.parse(opts.body)).toEqual([
			{ fields: [{ idField: 0, value: 7 }, { idField: 1, value: 'x' }] },
		]);
	});

	it('unsubscribe: sends the fixed 0/7 body with PUT', async () => {
		const { ctx, httpRequestWithAuthentication } = createExecuteMock({
			params: { resource: 'subscriber', operation: 'unsubscribe', subscriberId: 9 },
			httpImpl: () => ({ data: [], success: true }),
		});

		await runExecute(ctx);

		const [, opts] = httpRequestWithAuthentication.mock.calls[0];
		expect(opts.method).toBe('PUT');
		expect(opts.body).toEqual([
			{ fields: [{ idField: 0, value: 9 }, { idField: 7, value: 1 }] },
		]);
	});

	it('search: sends the query string and flattens fld_<id> keys', async () => {
		const { ctx, httpRequestWithAuthentication } = createExecuteMock({
			params: { resource: 'subscriber', operation: 'search', email: 'a@b.com' },
			httpImpl: () => ({ data: [{ id: 1, fields: [{ idField: 0, value: 1 }] }] }),
		});

		const out = await runExecute(ctx);

		expect(out[0][0].json).toEqual({ id: 1, fld_0: 1 });
		const [, opts] = httpRequestWithAuthentication.mock.calls[0];
		expect(opts.method).toBe('GET');
		expect(opts.qs).toEqual({ by: 'email', emailEncoding: 'none', values: 'a@b.com' });
	});

	it('search: returns nothing when the API has no data', async () => {
		const { ctx } = createExecuteMock({
			params: { resource: 'subscriber', operation: 'search', email: 'none@b.com' },
			httpImpl: () => ({}),
		});

		const out = await runExecute(ctx);

		expect(out[0]).toEqual([]);
	});

	it('throws on an unknown subscriber operation', async () => {
		const { ctx } = createExecuteMock({
			params: { resource: 'subscriber', operation: 'bogus' },
		});

		await expect(runExecute(ctx)).rejects.toThrow('Unknown subscriber operation');
	});
});

describe('Mindbaz node - mail', () => {
	const base64 = 'aGVsbG8='; // "hello"

	it('sendSimple: posts only the required fields to OneShot', async () => {
		const { ctx, httpRequestWithAuthentication } = createExecuteMock({
			params: { resource: 'mail', operation: 'sendSimple', campaignId: 3, subscriberId: 4 },
			httpImpl: () => ({ data: 'OK', success: true }),
		});

		const out = await runExecute(ctx);

		expect(out[0][0].json).toEqual({ success: true });
		const [, opts] = httpRequestWithAuthentication.mock.calls[0];
		expect(opts.url).toContain('/OneShot');
		expect(opts.body).toEqual({ campaignId: 3, subscriberId: 4 });
	});

	it('send: forwards all optional fields, parses idFields and attachments', async () => {
		const { ctx, httpRequestWithAuthentication } = createExecuteMock({
			params: {
				resource: 'mail',
				operation: 'send',
				campaignId: 3,
				subscriberId: 4,
				additionalFields: {
					fromAlias: 'Alias',
					idFields: '1, 2, x',
					subject: 'Subject',
					messageHTML: '<b>hi</b>',
					messageTXT: 'hi',
					subscriberMD5: 'md5',
					subscriberSHA256: 'sha',
				},
				attachments: { attachment: [{ fileName: 'doc.pdf', fileContent: base64 }] },
			},
			httpImpl: () => ({ data: 'OK', success: true }),
		});

		await runExecute(ctx);

		const [, opts] = httpRequestWithAuthentication.mock.calls[0];
		expect(opts.body.fromAlias).toBe('Alias');
		expect(opts.body.idFields).toEqual([1, 2]); // "x" filtered out
		expect(opts.body.subject).toBe('Subject');
		expect(opts.body.messageHTML).toBe('<b>hi</b>');
		expect(opts.body.messageTXT).toBe('hi');
		expect(opts.body.subscriberMD5).toBe('md5');
		expect(opts.body.subscriberSHA256).toBe('sha');
		expect(opts.body.attachments).toEqual([{ fileName: 'doc.pdf', fileContent: base64 }]);
	});

	it('send: omits optional fields when additionalFields is empty', async () => {
		const { ctx, httpRequestWithAuthentication } = createExecuteMock({
			params: {
				resource: 'mail',
				operation: 'send',
				campaignId: 3,
				subscriberId: 4,
				additionalFields: {},
				attachments: {},
			},
			httpImpl: () => ({ data: 'OK', success: true }),
		});

		await runExecute(ctx);

		const [, opts] = httpRequestWithAuthentication.mock.calls[0];
		expect(opts.body).toEqual({ campaignId: 3, subscriberId: 4 });
	});

	it('send: rejects an attachment with an invalid name', async () => {
		const { ctx } = createExecuteMock({
			params: {
				resource: 'mail',
				operation: 'send',
				campaignId: 1,
				subscriberId: 1,
				additionalFields: {},
				attachments: { attachment: [{ fileName: 'bad.txt', fileContent: base64 }] },
			},
		});

		await expect(runExecute(ctx)).rejects.toThrow('file name is not valid');
	});

	it('send: rejects an attachment larger than 2MB', async () => {
		const { ctx } = createExecuteMock({
			params: {
				resource: 'mail',
				operation: 'send',
				campaignId: 1,
				subscriberId: 1,
				additionalFields: {},
				attachments: {
					attachment: [{ fileName: 'big.pdf', fileContent: 'A'.repeat(2097153) }],
				},
			},
		});

		await expect(runExecute(ctx)).rejects.toThrow('file size exceeds');
	});

	it('send: rejects an attachment with invalid Base64 content', async () => {
		const { ctx } = createExecuteMock({
			params: {
				resource: 'mail',
				operation: 'send',
				campaignId: 1,
				subscriberId: 1,
				additionalFields: {},
				attachments: { attachment: [{ fileName: 'x.pdf', fileContent: '@@@' }] },
			},
		});

		await expect(runExecute(ctx)).rejects.toThrow('not valid Base64');
	});
});

describe('Mindbaz node - execute plumbing', () => {
	it('throws on an unknown resource', async () => {
		const { ctx } = createExecuteMock({
			params: { resource: 'bogus', operation: 'create' },
		});

		await expect(runExecute(ctx)).rejects.toThrow('Unknown resource');
	});

	it('collects the error instead of throwing when continueOnFail is set', async () => {
		const { ctx } = createExecuteMock({
			params: { resource: 'subscriber', operation: 'bogus' },
			continueOnFail: true,
		});

		const out = await runExecute(ctx);

		expect(out[0][0].json.error).toContain('Unknown subscriber operation');
	});
});

describe('Mindbaz node - loadOptions', () => {
	const fieldsList = {
		data: [
			{ id: 0, fieldType: 2, description: 'Id', isEditable: false },
			{ id: 1, fieldType: 1, description: 'Email', isEditable: false },
			{ id: 4, fieldType: 4, description: 'Civility', isEditable: true },
		],
	};

	it('getFieldsCreate: returns every field except id 0', async () => {
		const { ctx } = createExecuteMock({ httpImpl: () => fieldsList });

		const options = await node.methods.loadOptions.getFieldsCreate.call(ctx as any);

		expect(options.map((o) => o.value)).toEqual([1, 4]);
		expect(options[0].name).toContain('Email');
		expect(options[1].name).toContain('list');
	});

	it('getFieldsUpdate: returns only editable fields (id 0 excluded)', async () => {
		const { ctx } = createExecuteMock({ httpImpl: () => fieldsList });

		const options = await node.methods.loadOptions.getFieldsUpdate.call(ctx as any);

		expect(options.map((o) => o.value)).toEqual([4]);
	});

	it('getFieldsCreate: tolerates a response without data', async () => {
		const { ctx } = createExecuteMock({ httpImpl: () => ({}) });

		const options = await node.methods.loadOptions.getFieldsCreate.call(ctx as any);

		expect(options).toEqual([]);
	});

	it('getFieldsUpdate: tolerates a response without data', async () => {
		const { ctx } = createExecuteMock({ httpImpl: () => ({}) });

		const options = await node.methods.loadOptions.getFieldsUpdate.call(ctx as any);

		expect(options).toEqual([]);
	});
});
