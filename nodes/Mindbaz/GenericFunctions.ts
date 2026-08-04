import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

export const MINDBAZ_API_BASE = 'https://api.mindbaz.com/api';

// Webhook registration goes through the Mindbaz webhook gateway, on the `n8n`
// integration path, authenticated by the client's API key (no shared token).
export const MINDBAZ_WEBHOOK_BASE = 'https://webhook.mindbaz.com/wh';
export const MINDBAZ_WEBHOOK_INTEGRATION = 'n8n';

/**
 * Perform an authenticated request on the Mindbaz REST API.
 * The `X-API-Key` header is added in the credential's authentication.
 */
export async function mindbazApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject | IDataObject[] | string = {},
	qs: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('mindbazApi');

	const options: IHttpRequestOptions = {
		method,
		url: `${MINDBAZ_API_BASE}/${credentials.siteId}${resource}`,
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		qs,
		json: true,
	};

	if (method !== 'GET') {
		options.body = body;
	}

	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'mindbazApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Register / unregister a webhook on the Mindbaz gateway (trigger lifecycle),
 * on the `n8n` integration path. Authenticated by the client's API key.
 */
export async function mindbazWebhookRequest(
	this: IHookFunctions,
	method: IHttpRequestMethods,
	body: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('mindbazApi');

	const options: IHttpRequestOptions = {
		method,
		url: `${MINDBAZ_WEBHOOK_BASE}/${MINDBAZ_WEBHOOK_INTEGRATION}/${credentials.siteId}`,
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		json: true,
		body,
	};

	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'mindbazApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

/**
 * Reproduces the Zapier `handle_null_error` middleware + OneShot "KO" check.
 * Throws when the API returns an error payload or no data, otherwise returns
 * the response stripped of its `data` envelope.
 */
export function assertMindbazSuccess(
	this: IExecuteFunctions,
	response: IDataObject,
	itemIndex: number,
): IDataObject {
	if (response === null || response === undefined) {
		throw new NodeOperationError(this.getNode(), 'No json content in API response', {
			itemIndex,
		});
	}

	const data = response.data;

	// OneShot mailing returns a "KO..." string in `data` on failure.
	if (typeof data === 'string' && data.slice(0, 2) === 'KO') {
		throw new NodeOperationError(this.getNode(), data, { itemIndex });
	}

	if (data === null) {
		const message =
			response.error !== undefined && response.error !== null
				? String(response.error)
				: 'No data has been returned';
		throw new NodeOperationError(this.getNode(), message, { itemIndex });
	}

	const { data: _omit, ...rest } = response;
	return rest;
}

/**
 * Flatten a Mindbaz subscriber `fields` array into `fld_<idField>` keys.
 * Mirrors the Zapier `data_parsing` util.
 */
export function parseSubscriberFields(data: IDataObject[]): IDataObject[] {
	return data.map((entry) => {
		const parsed: IDataObject = { ...entry };
		const fields = (entry.fields as IDataObject[]) ?? [];
		for (const field of fields) {
			parsed[`fld_${field.idField}`] = field.value;
		}
		delete parsed.fields;
		return parsed;
	});
}

/** Convert a Mindbaz field type id to a human-readable label (for dropdowns). */
export function mindbazFieldTypeLabel(id: number): string {
	const types: { [key: number]: string } = {
		0: 'undefined',
		1: 'string',
		2: 'integer',
		3: 'datetime',
		4: 'list',
		5: 'boolean',
	};
	return types[id] ?? 'string';
}
