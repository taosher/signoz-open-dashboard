// @ts-nocheck - SigNoz 0.97.0 verbatim vendor (see third_party/PATCHES.md)
export class ErrorInvalidQueryPair extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ErrorInvalidQueryPair';
		Object.setPrototypeOf(this, ErrorInvalidQueryPair.prototype);
	}
}
