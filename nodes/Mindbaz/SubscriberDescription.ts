import type { INodeProperties } from 'n8n-workflow';

export const subscriberOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['subscriber'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Add a subscriber',
				description: 'Add a new subscriber to the mailing list (static and custom fields)',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Edit a subscriber',
				description: 'Edit an existing subscriber (static and custom fields)',
			},
			{
				name: 'Unsubscribe',
				value: 'unsubscribe',
				action: 'Unsubscribe a subscriber',
				description: 'Change a subscriber state from subscribed to unsubscribed',
			},
			{
				name: 'Search',
				value: 'search',
				action: 'Search for a subscriber',
				description: 'Return a subscriber with its fields based on its email',
			},
		],
		default: 'create',
	},
];

const dynamicFieldsCollection = (
	operation: 'create' | 'update',
	loadMethod: string,
): INodeProperties => ({
	displayName: 'Fields',
	name: 'fields',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	placeholder: 'Add Field',
	default: {},
	displayOptions: {
		show: {
			resource: ['subscriber'],
			operation: [operation],
		},
	},
	options: [
		{
			name: 'field',
			displayName: 'Field',
			values: [
				{
					displayName: 'Field Name or ID',
					name: 'idField',
					type: 'options',
					typeOptions: {
						loadOptionsMethod: loadMethod,
					},
					default: '',
					description:
						'Subscriber field to set. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
				},
			],
		},
	],
});

export const subscriberFields: INodeProperties[] = [
	// ----- create -----
	dynamicFieldsCollection('create', 'getFieldsCreate'),

	// ----- update -----
	{
		displayName: 'Subscriber ID',
		name: 'subscriberId',
		type: 'number',
		default: 0,
		required: true,
		description: 'Unique contact identifier used to find the contact (field 0)',
		displayOptions: {
			show: {
				resource: ['subscriber'],
				operation: ['update'],
			},
		},
	},
	dynamicFieldsCollection('update', 'getFieldsUpdate'),

	// ----- unsubscribe -----
	{
		displayName: 'Subscriber ID',
		name: 'subscriberId',
		type: 'number',
		default: 0,
		required: true,
		description: 'Subscriber identifier',
		displayOptions: {
			show: {
				resource: ['subscriber'],
				operation: ['unsubscribe'],
			},
		},
	},

	// ----- search -----
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		required: true,
		description: 'Email of the subscriber to look up',
		displayOptions: {
			show: {
				resource: ['subscriber'],
				operation: ['search'],
			},
		},
	},
];
