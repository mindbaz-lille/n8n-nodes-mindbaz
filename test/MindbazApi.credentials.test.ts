import { MindbazApi } from '../credentials/MindbazApi.credentials';

describe('MindbazApi credentials', () => {
	const credential = new MindbazApi();

	it('injects the API key into the X-API-Key header', () => {
		expect(credential.name).toBe('mindbazApi');
		expect(credential.authenticate.properties.headers).toEqual({
			'X-API-Key': '={{$credentials.apiKey}}',
		});
	});

	it('tests the connection against the thematics endpoint', () => {
		expect(credential.test.request.url).toBe('=/{{$credentials.siteId}}/thematics');
		expect(credential.test.request.method).toBe('GET');
	});
});
