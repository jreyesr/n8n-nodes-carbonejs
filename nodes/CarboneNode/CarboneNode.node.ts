import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeProperties,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	BINARY_ENCODING,
} from 'n8n-workflow';
import type { Readable } from 'stream';
import { convertDocumentToPdf, isWordDocument, renderDocument, buildOptions } from './CarboneUtils';

const nodeOperations: INodePropertyOptions[] = [
	{
		name: 'Render',
		value: 'render',
		description:
			'Fills a DOCX template with the contents of a JSON document, to generate a filled "report"',
		action: 'Render template',
	},
	{
		name: 'Convert to PDF',
		value: 'toPdf',
		description: 'Converts a document into a PDF, using LibreOffice',
		action: 'Convert to PDF',
	},
];

const nodeOperationOptions: INodeProperties[] = [
	{
		displayName: 'Context',
		name: 'context',
		type: 'json',
		default: '{}',
		description: 'This data will be used to fill the template',
		displayOptions: {
			show: { operation: ['render'] },
		},
	},
	{
		displayName: 'Property Name',
		name: 'dataPropertyName',
		type: 'string',
		default: 'data',
		description: 'Name of the binary property which holds the document to be used',
		displayOptions: {
			show: { operation: ['render', 'toPdf'] },
		},
	},
	{
		displayName: 'Property Name Out',
		name: 'dataPropertyNameOut',
		type: 'string',
		default: 'data',
		description: 'Name of the binary property which will hold the converted document',
		displayOptions: {
			show: { operation: ['render', 'toPdf'] },
		},
	},
];

const nodeOptions: INodeProperties[] = [
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Timezone',
				name: 'timezone',
				type: 'string',
				default: 'Europe/Paris',
				description:
					'Convert document dates to a timezone. The date must be chained with the `:formatD` formatter. See https://en.wikipedia.org/wiki/List_of_tz_database_time_zones#List, in the column "TZ identifier"',
			},
			{
				displayName: 'Locale',
				name: 'lang',
				type: 'string',
				default: 'en',
				description:
					'Locale of the generated document, it will used for translation `{t()}`, formatting numbers with `:formatN`, and currencies `:formatC`. See https://github.com/carboneio/carbone/blob/master/formatters/_locale.js.',
			},
			{
				displayName: 'Complement',
				name: 'complement',
				type: 'json',
				default: '{}',
				description: 'Extra data accessible in the template with {c.} instead of {d.}',
			},
			{
				displayName: 'Alias',
				name: 'variableStr',
				type: 'string',
				default: '',
				placeholder: 'e.g. {#def = d.id}', // eslint-disable-line n8n-nodes-base/node-param-placeholder-miscased-id
				description: 'Predefined alias. See https://carbone.io/documentation.html#alias.',
			},
			{
				displayName: 'Enums',
				name: 'enum',
				type: 'json',
				default: '',
				placeholder: 'e.g. {"ORDER_STATUS": ["open", "close"]}',
				description: 'Object with enumerations, use it in reports with `convEnum` formatters',
			},
			{
				displayName: 'Translations',
				name: 'translations',
				type: 'json',
				default: '',
				placeholder: 'e.g. {"es-es": {"one": "uno"}}',
				description:
					'When the report is generated, all text between `{t( )}` is replaced with the corresponding translation. The `lang` option is required to select the correct translation. See https://carbone.io/documentation.html#translations',
			},
		],
		displayOptions: {
			show: { operation: ['render'] },
		},
	},
];

export class CarboneNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Carbone',
		name: 'carboneNode',
		icon: 'file:fileword.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"]}}',
		description: 'Operations with the Carbone document generator',
		defaults: {
			name: 'Carbone',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: nodeOperations,
				default: 'render',
			},
			{
				displayName:
					'This operation requires LibreOffice to be installed! If using Docker, see <a href="https://www.npmjs.com/package/n8n-nodes-carbonejs#a-workaround-for-converting-docx-files-to-pdf-on-docker" target="_blank">this link</a> for a suggested alternative.',
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: { operation: ['toPdf'] },
				},
			},
			...nodeOperationOptions,
			...nodeOptions,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex);
				const dataPropertyName = this.getNodeParameter('dataPropertyName', itemIndex) as string;
				const dataPropertyNameOut = this.getNodeParameter(
					'dataPropertyNameOut',
					itemIndex,
				) as string;
				const item = items[itemIndex];

				if (operation === 'render') {
					const context = JSON.parse(this.getNodeParameter('context', itemIndex, '') as string);

					const binaryData = this.helpers.assertBinaryData(itemIndex, dataPropertyName);
					if (!isWordDocument(binaryData)) {
						// Sanity check: only allow DOCX docs for now
						throw new NodeOperationError(
							this.getNode(),
							`Binary property "${dataPropertyName}" should be a DOCX (Word) file, was ${binaryData.mimeType} instead`,
							{
								itemIndex,
							},
						);
					}
					let fileContent: Buffer | Readable;
					if (binaryData.id) {
						console.log(`Reading from file, id=${binaryData.id}`);
						fileContent = await this.helpers.getBinaryStream(binaryData.id);
					} else {
						console.log(`Reading directly into buffer, size=${binaryData.data.length}`);
						fileContent = Buffer.from(binaryData.data, BINARY_ENCODING);
					}

					const options = buildOptions(this, itemIndex);
					const rendered = await renderDocument(fileContent, context, options);

					item.json = context; // Overwrite the item's JSON data with the used context

					// Add the rendered file in a new property
					item.binary![dataPropertyNameOut] = await this.helpers.prepareBinaryData(
						rendered,
						item.binary![dataPropertyName].fileName,
						item.binary![dataPropertyName].mimeType,
					);
				} else if (operation === 'toPdf') {
					const binaryData = this.helpers.assertBinaryData(itemIndex, dataPropertyName);

					let fileContent: Buffer;
					if (binaryData.id) {
						fileContent = await this.helpers.binaryToBuffer(
							this.helpers.getBinaryStream(binaryData.id),
						);
					} else {
						fileContent = Buffer.from(binaryData.data, BINARY_ENCODING);
					}

					const converted = await convertDocumentToPdf(fileContent);

					// Add the converted file in a new property
					item.binary![dataPropertyNameOut] = await this.helpers.prepareBinaryData(
						converted,
						item.binary![dataPropertyName].fileName!.replace('.docx', '.pdf'),
						'application/pdf',
					);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					// Carry on with the data that was provided as input (short-circuit the node)
					items.push({
						json: this.getInputData(itemIndex)[0].json,
						binary: this.getInputData(itemIndex)[0].binary,
						error,
						pairedItem: itemIndex,
					});
				} else {
					// Adding `itemIndex` allows other workflows to handle this error
					if (error.context) {
						// If the error thrown already contains the context property,
						// only append the itemIndex
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return this.prepareOutputData(items);
	}
}
