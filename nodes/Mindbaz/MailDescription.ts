import type { INodeProperties } from 'n8n-workflow';

export const mailOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['mail'],
			},
		},
		options: [
			{
				name: 'Send (Simple)',
				value: 'sendSimple',
				action: 'Send a mail one shot',
				description: 'Campaign sending to a single recipient with only the required parameters',
			},
			{
				name: 'Send (Full Options)',
				value: 'send',
				action: 'Send a mail with full options',
				description: 'Campaign sending to a single recipient, overriding subject, message or fields',
			},
		],
		default: 'sendSimple',
	},
];

export const mailFields: INodeProperties[] = [
	// Shared required fields for both operations.
	{
		displayName: 'Campaign ID',
		name: 'campaignId',
		type: 'number',
		default: 0,
		required: true,
		description: 'Campaign identifier (simple or dynamic)',
		displayOptions: {
			show: {
				resource: ['mail'],
				operation: ['sendSimple', 'send'],
			},
		},
	},
	{
		displayName: 'Subscriber ID',
		name: 'subscriberId',
		type: 'number',
		default: 0,
		required: true,
		description: 'Subscriber identifier',
		displayOptions: {
			show: {
				resource: ['mail'],
				operation: ['sendSimple', 'send'],
			},
		},
	},

	// Full-options only.
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['mail'],
				operation: ['send'],
			},
		},
		options: [
			{
				displayName: 'Field IDs to Override',
				name: 'idFields',
				type: 'string',
				default: '',
				description: 'Comma-separated field IDs used (0, 1, 7, 8, 13, 14, 15, 43 by default) when overriding message or subject',
			},
			{
				displayName: 'From Alias',
				name: 'fromAlias',
				type: 'string',
				default: '',
				description: 'Alias of the sender, or leave blank to use the campaign alias',
			},
			{
				displayName: 'Message HTML',
				name: 'messageHTML',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				description: 'HTML message, or leave blank to use the campaign HTML',
			},
			{
				displayName: 'Message Text',
				name: 'messageTXT',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				description: 'Text version of the message, if the campaign is configured for one',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'Message subject, or leave blank to use the campaign subject',
			},
			{
				displayName: 'Subscriber MD5',
				name: 'subscriberMD5',
				type: 'string',
				default: '',
				description: "MD5 hash of the recipient's email address",
			},
			{
				displayName: 'Subscriber SHA256',
				name: 'subscriberSHA256',
				type: 'string',
				default: '',
				description: "SHA256 hash of the recipient's email address",
			},
		],
	},
	{
		displayName: 'Attachments',
		name: 'attachments',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		placeholder: 'Add Attachment',
		default: {},
		description:
			'Up to 3 PDF files, Base64 encoded, 2MB max each. File name must match "example.pdf".',
		displayOptions: {
			show: {
				resource: ['mail'],
				operation: ['send'],
			},
		},
		options: [
			{
				name: 'attachment',
				displayName: 'Attachment',
				values: [
					{
						displayName: 'File Name',
						name: 'fileName',
						type: 'string',
						default: '',
						placeholder: 'example.pdf',
					},
					{
						displayName: 'File Content (Base64)',
						name: 'fileContent',
						type: 'string',
						default: '',
						description: 'Base64-encoded content of the PDF file',
					},
				],
			},
		],
	},
];
