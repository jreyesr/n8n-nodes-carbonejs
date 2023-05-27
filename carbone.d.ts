// Overwrite an old @types/carbone declaration:
// carbone.convert() no longer is convert(data, convertTo, options?, callback)
// but convert(data, options?, callback), similar to the render() function
// convertTo is moved into the options param
// Can be deleted when PR https://github.com/DefinitelyTyped/DefinitelyTyped/pull/65614 is merged on DefinitelyTyped
// When deleting, also remove L29 on tsconfig.json, which includes the carbone.d.ts file

import type { RenderOptions, ConvertCallback } from 'carbone';

declare module 'carbone' {
	export function convert(
		data: Buffer,
		options: RenderOptions & { extension: string },
		callback: ConvertCallback,
	): void;
}
