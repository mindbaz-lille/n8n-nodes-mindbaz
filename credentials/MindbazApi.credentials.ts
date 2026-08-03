import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Mindbaz API authentication.
 *
 * Mirrors the Zapier integration: a static API key sent in the `X-API-Key`
 * header, scoped to a given site id (the database identifier). No OAuth2.
 */
export class MindbazApi implements ICredentialType {
	name = 'mindbazApi';

	displayName = 'Mindbaz API';

	documentationUrl = 'https://api.mindbaz.com';

	icon: Icon = 'file:mindbaz.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Site ID',
			name: 'siteId',
			type: 'string',
			default: '',
			required: true,
			description: 'The site id is the id of the database',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your Mindbaz API key for authentication',
		},
	];

	// Inject the API key into every request (equivalent to the Zapier
	// `handle_authorization` middleware).
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	// Lightweight credential test, same endpoint used by the Zapier auth test.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.mindbaz.com/api',
			url: '=/{{$credentials.siteId}}/thematics',
			method: 'GET',
		},
	};
}
