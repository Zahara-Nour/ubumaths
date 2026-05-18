/**
 * Error types for the geometry DSL.
 */

/**
 * Structured supplement for a runtime error. Rendered with rich formatting
 * by the player UI (inline code styling, bullet list of usage forms).
 * Falls back gracefully to the plain `message` when absent.
 */
export interface DslRuntimeErrorDetails {
	/** Short summary, plain text. Will be the headline. */
	summary: string;
	/** Optional hint about what the user likely intended. */
	hint?: string;
	/** Optional list of valid invocation forms with a one-line description. */
	forms?: { syntax: string; description: string }[];
}

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
	readonly details: DslRuntimeErrorDetails | null;

	constructor(
		messageOrDetails: string | DslRuntimeErrorDetails,
		readonly line: number
	) {
		const details = typeof messageOrDetails === 'string' ? null : messageOrDetails;
		const summary =
			typeof messageOrDetails === 'string' ? messageOrDetails : messageOrDetails.summary;
		const flat = details
			? [
					summary,
					details.hint ? `\n${details.hint}` : '',
					details.forms && details.forms.length > 0
						? '\nFormes acceptees :\n' +
							details.forms.map((f) => `  • ${f.syntax}   ${f.description}`).join('\n')
						: ''
				].join('')
			: summary;
		super(`Ligne ${line} : ${flat}`);
		this.details = details;
	}
}
