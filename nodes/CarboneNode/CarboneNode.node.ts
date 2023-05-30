import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeProperties,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import type { Readable } from 'stream';
import { BINARY_ENCODING } from 'n8n-workflow';
import { convertDocumentToPdf, isWordDocument, renderDocument } from './CarboneUtils';

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
				displayName: 'This operation requires LibreOffice to be installed! If using Docker, see <a href="https://www.npmjs.com/package/n8n-nodes-carbonejs#a-workaround-for-converting-docx-files-to-pdf-on-docker" target="_blank">this link</a> for a suggested alternative.',
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: { operation: ['toPdf'] },
				},
			},
			...nodeOperationOptions,
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
						fileContent = this.helpers.getBinaryStream(binaryData.id);
					} else {
						fileContent = Buffer.from(binaryData.data, BINARY_ENCODING);
					}

					const rendered = await renderDocument(fileContent, context);

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
