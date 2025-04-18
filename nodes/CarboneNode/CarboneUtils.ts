import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import carbone from 'carbone';

import type {Readable} from 'stream';
import {IBinaryData, IExecuteFunctions} from 'n8n-workflow';

// These two functions come straight from https://advancedweb.hu/secure-tempfiles-in-nodejs-without-dependencies/#solution,
// plus typing. These should be safe (from pesky hackers and race conditions), and require no third-party dependencies
const withTempFile = <T>(fn: (fileName: string) => T) =>
	withTempDir((dir: string) => fn(path.join(dir, 'file')));

const withTempDir = async <T>(fn: (dirPath: string) => T): Promise<T> => {
	const dir = await fs.mkdtemp((await fs.realpath(os.tmpdir())) + path.sep);
	try {
		return await fn(dir);
	} finally {
		await fs.rm(dir, {recursive: true});
	}
};

const isOfficeDocument = (data: IBinaryData) =>
	[
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	].includes(data.mimeType);

const buildOptions = (node: IExecuteFunctions, index: number): object => {
	const additionalFields = node.getNodeParameter('options', index);
	// console.debug(additionalFields);

	let options: any = {};
	if (additionalFields.timezone) options.timezone = additionalFields.timezone;
	if (additionalFields.lang) options.lang = additionalFields.lang;
	if (additionalFields.variableStr) options.variableStr = additionalFields.variableStr;
	if (additionalFields.complement) options.complement = JSON.parse(additionalFields.complement as string);
	if (additionalFields.enum) options.enum = JSON.parse(additionalFields.enum as string);
	if (additionalFields.translations) options.translations = JSON.parse(additionalFields.translations as string);

	// console.debug(options)
	return options;
};

const renderDocument = async (
	document: Buffer | Readable,
	context: any,
	options: object,
): Promise<Buffer> => {
	return withTempFile(async (file) => {
		await fs.writeFile(file, document); // Save the template to temp dir, since Carbone needs to read from disk

		return await new Promise((resolve, reject) => {
			carbone.render(file, context, options, function (err, result) {
				if (err) {
					reject(err);
				}
				if (typeof result === 'string') {
					// manually cast result to Buffer first
					resolve(Buffer.from(result, 'utf-8'));
				} else {
					// result must be Buffer, and TS is happy again
					resolve(result);
				}
			});
		});
	});
};

const convertDocumentToPdf = async (document: Buffer): Promise<Buffer> => {
	var options = {
		convertTo: 'pdf',
		extension: 'docx',
	};

	return await new Promise((resolve, reject) => {
		carbone.convert(document, options, function (err, result) {
			if (err) {
				reject(err);
			}

			resolve(result);
		});
	});
};

export {
	withTempFile,
	withTempDir,
	isOfficeDocument,
	buildOptions,
	renderDocument,
	convertDocumentToPdf,
};
