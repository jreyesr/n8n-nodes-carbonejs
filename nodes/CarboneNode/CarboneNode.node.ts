import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import type { Readable } from 'stream';
import { BINARY_ENCODING } from 'n8n-workflow';


export class CarboneNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Carbone Node',
		name: 'carboneNode',
		icon: 'file:fileword.svg',
		group: ['transform'],
		version: 1,
		description:
			'Fills a DOCX template with the contents of a JSON document, to generate a filled "report"',
		defaults: {
			name: 'Carbone Node',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Context',
				name: 'context',
				type: 'json',
				default: '{}',
				required: true,
				description: 'This data will be used to fill the template',
			},
			{
				displayName: 'Template',
				name: 'dataPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				description:
					'Name of the binary property which contains the data for the template to be used',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const dataPropertyName = this.getNodeParameter('dataPropertyName', itemIndex) as string;
				const context = JSON.parse(this.getNodeParameter('context', itemIndex, '') as string);
				const item = items[itemIndex];

				const binaryData = this.helpers.assertBinaryData(itemIndex, dataPropertyName);
				let fileContent: Buffer | Readable;
				if (binaryData.id) {
					fileContent = this.helpers.getBinaryStream(binaryData.id);
				} else {
					fileContent = Buffer.from(binaryData.data, BINARY_ENCODING);
				}
				console.log(fileContent)

				// TODO actually render!

				item.json = context; // Overwrite the item's JSON data with the used context
				delete item.binary![dataPropertyName]; // Overwrite the item's binary data with the used
			} catch (error) {
				if (this.continueOnFail()) {
					// Carry on with the data that was provided as input (short-circuit the node)
					items.push({
						json: this.getInputData(itemIndex)[0].json,
						binary: this.getInputData(itemIndex)[0].binary,
						error,
						pairedItem: itemIndex
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
