import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import carbone from 'carbone';

import type { Readable } from 'stream';
import { IBinaryData } from 'n8n-workflow';

// These two functions come straight from https://advancedweb.hu/secure-tempfiles-in-nodejs-without-dependencies/#solution,
// plus typing. These should be safe (from pesky hackers and race conditions), and require no third-party dependencies
const withTempFile = <T>(fn: (fileName: string) => T) =>
	withTempDir((dir: string) => fn(path.join(dir, 'file')));

const withTempDir = async <T>(fn: (dirPath: string) => T): Promise<T> => {
	const dir = await fs.mkdtemp((await fs.realpath(os.tmpdir())) + path.sep);
	try {
		return await fn(dir);
	} finally {
		fs.rmdir(dir, { recursive: true });
	}
};

const isWordDocument = (data: IBinaryData) =>
	data.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const renderDocument = async (
	document: Buffer | Readable,
	context: any,
): Promise<Buffer | Readable> => {
	return withTempFile(async (file) => {
		await fs.writeFile(file, document); // Save the template to temp dir, since Carbone needs to read from disk

		return await new Promise((resolve, reject) => {
			carbone.render(file, context, {}, function (err, result) {
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

export { withTempFile, withTempDir, isWordDocument, renderDocument, convertDocumentToPdf };
