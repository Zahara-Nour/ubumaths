/**
 * Error types for the geometry DSL.
 */

export class DslParseError extends Error {
	constructor(
		message: string,
		readonly line: number,
		readonly col: number
	) {
		super(`Ligne ${line}, colonne ${col} : ${message}`);
	}
}

export class DslRuntimeError extends Error {
	constructor(
		message: string,
		readonly line: number
	) {
		super(`Ligne ${line} : ${message}`);
	}
}
