import { IBinaryData } from 'n8n-workflow';
import { PDFDocument } from 'pdf-lib';

const isPDFDocument = (data: IBinaryData) => data.mimeType === 'application/pdf';

const mergePdfs = async (document1: Buffer, document2: Buffer): Promise<Buffer> => {
	// This code is blessed by the author of pdf-lib himself,
	// see https://github.com/Hopding/pdf-lib/issues/252#issuecomment-566063380
	// Only change is to provide the input docs as buffers, not as fs.readFileSync calls

	const mergedPdf = await PDFDocument.create();

	const pdfA = await PDFDocument.load(document1);
	const pdfB = await PDFDocument.load(document2);

	const copiedPagesA = await mergedPdf.copyPages(pdfA, pdfA.getPageIndices());
	copiedPagesA.forEach((page) => mergedPdf.addPage(page));

	const copiedPagesB = await mergedPdf.copyPages(pdfB, pdfB.getPageIndices());
	copiedPagesB.forEach((page) => mergedPdf.addPage(page));

	const mergedPdfFile = await mergedPdf.save();

	return Buffer.from(mergedPdfFile);
};

export { isPDFDocument, mergePdfs };
