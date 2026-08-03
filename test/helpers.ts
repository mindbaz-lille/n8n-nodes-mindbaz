import type { INode } from 'n8n-workflow';

/** Minimal INode used by the n8n error classes in tests. */
export function mockNode(): INode {
	return {
		id: 'test-node',
		name: 'Mindbaz',
		type: 'n8n-nodes-mindbaz.mindbaz',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};
}

type ParamValue = unknown | ((index: number) => unknown);

interface ExecuteMockOptions {
	items?: Array<{ json: Record<string, unknown> }>;
	params?: Record<string, ParamValue>;
	credentials?: Record<string, unknown>;
	httpImpl?: (options: any) => unknown;
	continueOnFail?: boolean;
}

/** Build a mock IExecuteFunctions covering everything the node touches. */
export function createExecuteMock(options: ExecuteMockOptions) {
	const {
		items = [{ json: {} }],
		params = {},
		credentials = { siteId: '42', apiKey: 'secret' },
		httpImpl = () => ({}),
		continueOnFail = false,
	} = options;

	const httpRequestWithAuthentication = jest.fn(async function (
		this: unknown,
		_name: string,
		requestOptions: any,
	) {
		return httpImpl(requestOptions);
	});

	const ctx = {
		getInputData: jest.fn(() => items),
		getNodeParameter: jest.fn((name: string, index: number, fallback?: unknown) => {
			const value = params[name];
			const resolved = typeof value === 'function' ? (value as Function)(index) : value;
			return resolved === undefined ? fallback : resolved;
		}),
		getCredentials: jest.fn(async () => credentials),
		getNode: jest.fn(() => mockNode()),
		continueOnFail: jest.fn(() => continueOnFail),
		helpers: {
			httpRequestWithAuthentication,
			returnJsonArray: (data: unknown) =>
				(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
		},
	};

	return { ctx, httpRequestWithAuthentication };
}
