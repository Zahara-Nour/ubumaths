/**
 * Locked-zones template parser/reconstruction.
 *
 * The teacher writes a `starter_code` containing inline markers
 * `{{id}}` or `{{id | "default"}}`. The CodeMirror editor on the student
 * side renders the template with markers replaced by their defaults,
 * makes the rest of the buffer read-only, and only allows editing inside
 * the regions where the defaults landed. On submission, the student's
 * values are slotted back into the template via `reconstructCode` and
 * the resulting code is run as-is by the Pyodide worker.
 *
 * Constraints (V1):
 *   - Markers must fit on a single line.
 *   - Ids must match `/^[a-zA-Z_][a-zA-Z0-9_]*$/` (Python identifier).
 *   - Defaults must be quoted (`"…"` or `'…'`); `\"` and `\'` escape the
 *     matching quote inside.
 *   - A given id may appear at most once.
 *
 * Best-effort policy on malformed input:
 *   - `parseTemplate` reports errors; valid markers preceding a malformed
 *     one are still recognised.
 *   - `reconstructCode` leaves a malformed marker literally in the output
 *     so executing the result raises a SyntaxError — visible to the
 *     teacher at submission time without a parallel error channel.
 *   - `renderDefaults` returns the template unchanged when parsing fails,
 *     surfaces the errors, and yields an empty `zones` list (the UI can
 *     then fall back to free-edit mode and show a configuration warning).
 */

const PY_IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export interface Marker {
	id: string;
	/** Default value substituted when the student hasn't provided one. */
	default: string;
	/** Start index in the source template (position of the opening `{{`). */
	templateStart: number;
	/** End index in the source template (one past the closing `}}`). */
	templateEnd: number;
}

export type ParseErrorKind =
	| 'unterminated'
	| 'empty-id'
	| 'invalid-id'
	| 'duplicate-id'
	| 'cross-line'
	| 'unquoted-default'
	| 'unterminated-string';

export interface ParseError {
	kind: ParseErrorKind;
	message: string;
	/** Index in the source template where the offending marker started. */
	index: number;
}

export interface ParseResult {
	markers: Marker[];
	errors: ParseError[];
}

export interface RenderZone {
	id: string;
	defaultValue: string;
	/** Start index in the rendered code (where the default was substituted). */
	renderedStart: number;
	/** End index in the rendered code (one past the substituted default). */
	renderedEnd: number;
}

export interface RenderResult {
	rendered: string;
	zones: RenderZone[];
	errors: ParseError[];
}

export function parseTemplate(code: string): ParseResult {
	const markers: Marker[] = [];
	const errors: ParseError[] = [];
	const seenIds = new Set<string>();

	let i = 0;
	while (i < code.length) {
		const openIdx = code.indexOf('{{', i);
		if (openIdx === -1) break;

		const closeIdx = findClosingBraces(code, openIdx + 2);

		if (closeIdx === -1) {
			errors.push({
				kind: 'unterminated',
				message: 'Marqueur non terminé (manque `}}`).',
				index: openIdx
			});
			// Stop scanning: no point continuing past an unterminated marker.
			break;
		}

		const inner = code.slice(openIdx + 2, closeIdx);

		// Single-line constraint.
		if (inner.includes('\n')) {
			errors.push({
				kind: 'cross-line',
				message: 'Un marqueur doit tenir sur une seule ligne.',
				index: openIdx
			});
			i = closeIdx + 2;
			continue;
		}

		const parsed = parseInner(inner, openIdx);
		if (parsed.error) {
			errors.push(parsed.error);
			i = closeIdx + 2;
			continue;
		}

		if (seenIds.has(parsed.id)) {
			errors.push({
				kind: 'duplicate-id',
				message: `Identifiant '${parsed.id}' utilisé plusieurs fois.`,
				index: openIdx
			});
			i = closeIdx + 2;
			continue;
		}
		seenIds.add(parsed.id);

		markers.push({
			id: parsed.id,
			default: parsed.default,
			templateStart: openIdx,
			templateEnd: closeIdx + 2
		});

		i = closeIdx + 2;
	}

	return { markers, errors };
}

/**
 * Scan from `from` for the closing `}}`. Returns the index of the first
 * `}` of the closing pair, or -1 if not found before EOF. Quoted strings
 * inside the marker (`"..."`, `'...'`) are skipped so a literal `}}`
 * inside a default doesn't terminate the marker.
 */
function findClosingBraces(code: string, from: number): number {
	let i = from;
	while (i < code.length) {
		const c = code[i];
		if (c === '"' || c === "'") {
			// Skip quoted string; honour `\<quote>` escapes.
			const quote = c;
			i += 1;
			while (i < code.length && code[i] !== quote) {
				if (code[i] === '\\') i += 2;
				else i += 1;
			}
			if (i >= code.length) return -1; // unterminated string in marker
			i += 1; // consume closing quote
			continue;
		}
		if (c === '}' && code[i + 1] === '}') return i;
		i += 1;
	}
	return -1;
}

interface InnerParsed {
	id: string;
	default: string;
	error: ParseError | null;
}

function parseInner(inner: string, markerIndex: number): InnerParsed {
	const trimmed = inner.trim();

	if (trimmed.length === 0) {
		return makeInnerError('empty-id', 'Identifiant manquant dans le marqueur.', markerIndex);
	}

	const pipeIdx = findPipeOutsideQuotes(trimmed);
	if (pipeIdx === -1) {
		// No default — `{{id}}`.
		const id = trimmed;
		if (!PY_IDENTIFIER_RE.test(id)) {
			return makeInnerError(
				'invalid-id',
				`Identifiant '${id}' invalide (doit être un identifiant Python).`,
				markerIndex
			);
		}
		return { id, default: '', error: null };
	}

	const id = trimmed.slice(0, pipeIdx).trim();
	const defaultPart = trimmed.slice(pipeIdx + 1).trim();

	if (id.length === 0) {
		return makeInnerError('empty-id', 'Identifiant manquant dans le marqueur.', markerIndex);
	}
	if (!PY_IDENTIFIER_RE.test(id)) {
		return makeInnerError(
			'invalid-id',
			`Identifiant '${id}' invalide (doit être un identifiant Python).`,
			markerIndex
		);
	}

	if (defaultPart.length === 0 || (defaultPart[0] !== '"' && defaultPart[0] !== "'")) {
		return makeInnerError(
			'unquoted-default',
			'La valeur par défaut doit être entre guillemets ("…" ou \'…\').',
			markerIndex
		);
	}

	const quote = defaultPart[0];

	// Find the real closing quote, honouring `\<quote>` escapes. The
	// terminal-quote check alone (`defaultPart[length-1] === quote`)
	// would silently accept `"foo"bar"` — closing quote is at index 4,
	// then `bar"` follows. We need to locate the first un-escaped quote
	// and verify it sits at the end.
	let closingIdx = -1;
	let i = 1;
	while (i < defaultPart.length) {
		if (defaultPart[i] === '\\') {
			i += 2;
			continue;
		}
		if (defaultPart[i] === quote) {
			closingIdx = i;
			break;
		}
		i += 1;
	}

	if (closingIdx === -1) {
		return makeInnerError(
			'unterminated-string',
			'Chaîne de valeur par défaut non terminée.',
			markerIndex
		);
	}

	if (closingIdx !== defaultPart.length - 1) {
		return makeInnerError(
			'unquoted-default',
			'Caractères inattendus après la valeur par défaut.',
			markerIndex
		);
	}

	const raw = defaultPart.slice(1, closingIdx);
	const def = unescapeString(raw, quote);

	return { id, default: def, error: null };
}

function findPipeOutsideQuotes(s: string): number {
	let i = 0;
	while (i < s.length) {
		const c = s[i];
		if (c === '|') return i;
		if (c === '"' || c === "'") {
			const quote = c;
			i += 1;
			while (i < s.length && s[i] !== quote) {
				if (s[i] === '\\') i += 2;
				else i += 1;
			}
			i += 1;
			continue;
		}
		i += 1;
	}
	return -1;
}

function unescapeString(raw: string, quote: string): string {
	let out = '';
	let i = 0;
	while (i < raw.length) {
		if (raw[i] === '\\' && raw[i + 1] === quote) {
			out += quote;
			i += 2;
		} else if (raw[i] === '\\' && raw[i + 1] === '\\') {
			out += '\\';
			i += 2;
		} else {
			out += raw[i];
			i += 1;
		}
	}
	return out;
}

function makeInnerError(kind: ParseErrorKind, message: string, index: number): InnerParsed {
	return { id: '', default: '', error: { kind, message, index } };
}

/**
 * Slot student values back into the template. Best-effort: malformed
 * markers (which `parseTemplate` would flag) are left literally in the
 * output, so executing the resulting code surfaces the issue as a
 * Python SyntaxError at validation time.
 */
export function reconstructCode(template: string, values: Record<string, string>): string {
	const { markers } = parseTemplate(template);
	if (markers.length === 0) return template;

	let out = '';
	let cursor = 0;
	for (const m of markers) {
		out += template.slice(cursor, m.templateStart);
		const provided = Object.prototype.hasOwnProperty.call(values, m.id) ? values[m.id] : m.default;
		out += provided;
		cursor = m.templateEnd;
	}
	out += template.slice(cursor);
	return out;
}

/**
 * Render the template with each marker replaced by its `default`. Returns
 * the rendered string plus the position of each editable region in that
 * rendered string — what the CodeMirror integration needs to mark the
 * read-only ranges and decorate the editable ones.
 */
export function renderDefaults(template: string): RenderResult {
	const { markers, errors } = parseTemplate(template);

	if (errors.length > 0) {
		return { rendered: template, zones: [], errors };
	}

	if (markers.length === 0) {
		return { rendered: template, zones: [], errors: [] };
	}

	let rendered = '';
	const zones: RenderZone[] = [];
	let cursor = 0;
	for (const m of markers) {
		rendered += template.slice(cursor, m.templateStart);
		const renderedStart = rendered.length;
		rendered += m.default;
		zones.push({
			id: m.id,
			defaultValue: m.default,
			renderedStart,
			renderedEnd: rendered.length
		});
		cursor = m.templateEnd;
	}
	rendered += template.slice(cursor);

	return { rendered, zones, errors: [] };
}
