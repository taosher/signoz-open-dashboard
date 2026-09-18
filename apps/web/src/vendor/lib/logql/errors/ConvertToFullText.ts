// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
export class ErrorConvertToFullText extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ErrorConvertToFullText';
		Object.setPrototypeOf(this, ErrorConvertToFullText.prototype);
	}
}
