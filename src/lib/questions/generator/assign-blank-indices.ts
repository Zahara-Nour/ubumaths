/**
 * Assign Blank Indices
 * =====================
 *
 * Processes a resolved statement to assign sequential 0-based indices
 * to all blanks (math ?, text [_], and expression answerFormats).
 *
 * Pipeline position: after resolveMarkdownContent(), before parseMarkdown().
 *
 * Three types of blanks:
 * - `?` in math zones ($...$, $$...$$) → \placeholder[N]{}
 * - `[_]` in text (outside math) → {{blank:N}}
 * - `<<expr:NAME>>` in math → reserves indices for ? in answerFormats[NAME]
 * - Bloc ```operation à remplir → UNE case, numéro posé dans le bloc (`case: N`) ;
 *   division euclidienne : DEUX cases, N (quotient) et N + 1 (reste), seul N est posé
 * - Bloc ```collection à construire (`construire: N`) → UNE case, `case: N` posé dans le bloc
 * - Bloc ```figure-a-completer → UNE case (la figure de l'élève), `case: N` posé dans le bloc ;
 *   son contenu est mis à l'abri : ni `?` ni `[_]` n'y crée de case
 *
 * @module questions/generator/assign-blank-indices
 */

import { parseOperationContent } from '$lib/ubumark/parser/operation-parser';
import { findFigureBlocks } from '$lib/ubumark/parser/figure-parser';
import { findBuildCollections } from '$lib/ubumark/parser/collection-parser';
import { operationCaseCount } from '$lib/ubumark/utils/operation-division-answer';

/**
 * Result of assigning blank indices to a statement
 */
export interface AssignBlankIndicesResult {
	/** Statement with ? replaced by \placeholder[N]{} and [_] replaced by {{blank:N}} */
	statement: string;
	/** Modified answerFormats with ? replaced by \placeholder[N]{} (undefined if input was undefined) */
	answerFormats?: Record<string, string>;
	/** Total number of blanks assigned */
	totalBlanks: number;
	/** Type of each blank in order: 'math' for ? in $...$, 'text' for [_] in text */
	blankTypes: ('math' | 'text')[];
	/**
	 * Map blank index → expression name for blanks that originate from a
	 * `<<expr:NAME>>` marker (either the `?` in `answerFormats[NAME]` or the
	 * `?` in the matching math content). Allows downstream consumers (notably
	 * `instance-generator.ts`) to populate `InstanceBlank.expressionName` so
	 * pedagogical pipelines can look up the linked answerFormat without the
	 * caller having to know the mapping.
	 *
	 * Undefined when no `<<expr:NAME>>` marker matched a known answerFormat.
	 */
	expressionNameByIndex?: Record<number, string>;
	/**
	 * Case → texte du bloc ```operation à remplir qui la porte (sans `case:`),
	 * pour que le générateur calcule la réponse attendue ; les deux cases d'une
	 * division euclidienne portent le même texte. Absent sans tel bloc.
	 */
	operationBlanks?: Record<number, string>;
	/** Blocs ```operation à remplir mal placés (liste, citation) : messages pour l'auteur */
	operationErrors?: string[];
	/**
	 * Case → texte du bloc ```collection à construire qui la porte (sans `case:`), pour
	 * que le générateur lise la valeur attendue. Absent sans tel bloc.
	 */
	buildBlanks?: Record<number, string>;
	/** Blocs ```collection à construire mal placés (liste, citation) : messages pour l'auteur */
	buildErrors?: string[];
	/**
	 * Case → texte du bloc ```figure-a-completer qui la porte (sans `case:`), pour que
	 * le générateur lise ses vérifications. Absent sans tel bloc.
	 */
	constructionBlanks?: Record<number, string>;
	/** Blocs ```figure-a-completer mal placés (liste, citation) : messages pour l'auteur */
	constructionErrors?: string[];
}

/** Fence d'ouverture d'un bloc ```figure-a-completer, au premier niveau seulement */
const CONSTRUCTION_FENCE_REGEX = /^```figure-a-completer\s*$/;

/** La même, en retrait (liste) ou citée : le bloc ne peut pas porter de case */
const NESTED_CONSTRUCTION_FENCE_REGEX = /^(?:\s+|\s*>\s*)```figure-a-completer\s*$/;

/** Marque d'un bloc ```figure-a-completer mis à l'abri : début, rang du bloc, fin */
const CONSTRUCTION_MARK_START = '\u0000construction:';
const CONSTRUCTION_MARK_END = '\u0000';

const CONSTRUCTION_NESTED_MESSAGE =
	'Un bloc figure-a-completer doit être au premier niveau de l’énoncé (ni dans une liste, ni dans une citation)';

interface ConstructionBlock {
	/** Lignes du bloc entre les clôtures */
	body: string[];
	/** false : clôture ``` absente (le parseur dira « bloc non fermé ») */
	closed: boolean;
}

/**
 * Met à l'abri les blocs ```figure-a-completer : chacun devient une marque d'une
 * ligne, numérotée ensuite avec les autres cases puis rendue avec `case: N`.
 * Étendue du bloc : celle du parseur (`findFigureBlocks`, bloc non fermé compris).
 */
function markConstructionBlocks(statement: string): {
	statement: string;
	blocks: ConstructionBlock[];
	errors: string[];
} {
	const lines = statement.split('\n');
	const ranges = findFigureBlocks(lines).filter((r) =>
		CONSTRUCTION_FENCE_REGEX.test(lines[r.startIndex])
	);
	const out: string[] = [];
	const blocks: ConstructionBlock[] = [];
	const errors: string[] = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (NESTED_CONSTRUCTION_FENCE_REGEX.test(line)) {
			errors.push(CONSTRUCTION_NESTED_MESSAGE);
		}
		const range = ranges.find((r) => r.startIndex === i);
		if (!range) {
			out.push(line);
			continue;
		}
		const closed = range.closed !== false;
		out.push(`${CONSTRUCTION_MARK_START}${blocks.length}${CONSTRUCTION_MARK_END}`);
		blocks.push({
			body: lines.slice(i + 1, closed ? range.endIndex : range.endIndex + 1),
			closed
		});
		i = range.endIndex;
	}
	return { statement: out.join('\n'), blocks, errors };
}

/** Le bloc rendu à son texte, sa case posée en première ligne */
function restoreConstructionBlock(block: ConstructionBlock, caseIndex: number): string {
	return [
		'```figure-a-completer',
		`case: ${caseIndex}`,
		...block.body,
		...(block.closed ? ['```'] : [])
	].join('\n');
}

/** Fence d'ouverture d'un bloc ```operation, au premier niveau seulement */
const OPERATION_FENCE_REGEX = /^```operation\s*$/;

/** La même, en retrait (liste) ou citée : le bloc ne peut pas porter de case */
const NESTED_OPERATION_FENCE_REGEX = /^(?:\s+|\s*>\s*)```operation\s*$/;

/** Marque provisoire de la case d'un bloc, remplacée par `case: N` à son rang */
const OPERATION_CASE_MARK = '\u0000operation-case\u0000';

const OPERATION_NESTED_MESSAGE =
	'Un bloc operation à remplir doit être au premier niveau de l’énoncé (ni dans une liste, ni dans une citation)';

/** Marque provisoire de la case d'un bloc à construire */
const BUILD_CASE_MARK = '\u0000build-case\u0000';

const BUILD_NESTED_MESSAGE =
	'Un bloc collection à construire doit être au premier niveau de l’énoncé (ni dans une liste, ni dans une citation)';

/** Bloc `cases: aucune` : opération résolue, rien à remplir */
function isSolvedOperation(body: string[]): boolean {
	return body.some((line) => /^\s*cases\s*:\s*aucune\s*$/i.test(line));
}

/** Cases portées par un bloc à remplir : 1, ou 2 pour une division euclidienne ; bloc en erreur : 1 (refusé au générateur) */
function caseCountOf(source: string): number {
	const node = parseOperationContent(source);
	return node.spec === null || node.errors.length > 0 ? 1 : operationCaseCount(node.spec);
}

/** Un genre de bloc qui porte une case, repéré ligne à ligne : sa fence, et s'il en porte une */
interface CaseBlockKind {
	fence: RegExp;
	nestedFence: RegExp;
	hasCase: (body: string[]) => boolean;
	mark: string;
	nestedMessage: string;
}

const OPERATION_BLOCKS: CaseBlockKind = {
	fence: OPERATION_FENCE_REGEX,
	nestedFence: NESTED_OPERATION_FENCE_REGEX,
	hasCase: (body) => !isSolvedOperation(body),
	mark: OPERATION_CASE_MARK,
	nestedMessage: OPERATION_NESTED_MESSAGE
};

/**
 * Repère les blocs ```operation qui portent une case : une marque est posée en tête de chacun
 * (numérotée ensuite, dans l'ordre du texte, avec les autres cases).
 * Fin du bloc : ``` ou ligne vide, comme le parseur.
 */
function markCaseBlocks(
	statement: string,
	kind: CaseBlockKind
): {
	statement: string;
	sources: string[];
	errors: string[];
} {
	const lines = statement.split('\n');
	const out: string[] = [];
	const sources: string[] = [];
	const errors: string[] = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const nested = kind.nestedFence.test(line);
		if (!kind.fence.test(line) && !nested) {
			out.push(line);
			continue;
		}
		let end = i + 1;
		while (end < lines.length && !/^\s*>?\s*```\s*$/.test(lines[end]) && lines[end].trim() !== '') {
			end++;
		}
		const body = lines.slice(i + 1, end);
		out.push(line);
		if (kind.hasCase(body)) {
			if (nested) {
				errors.push(kind.nestedMessage);
			} else {
				out.push(kind.mark);
				sources.push(body.join('\n'));
			}
		}
		out.push(...body);
		i = end - 1;
	}
	return { statement: out.join('\n'), sources, errors };
}

/** Bloc à construire, et sa fermeture (un bloc non fermé est refusé au générateur) */
interface BuildBlock {
	source: string;
	closed: boolean;
}

/**
 * Repère les blocs ```collection à construire : une marque est posée après la
 * fence de chacun. Délimités comme le parseur (`findBuildCollections`) : une
 * ligne vide suivie d'une clé reste dans le bloc, sinon sa case disparaîtrait.
 */
function markBuildBlocks(statement: string): {
	statement: string;
	blocks: BuildBlock[];
	errors: string[];
} {
	const found = findBuildCollections(statement);
	const errors = found.filter((b) => b.nested).map(() => BUILD_NESTED_MESSAGE);
	const marked = found.filter((b) => !b.nested);
	const markAfter = new Set(marked.map((b) => b.startIndex));
	const out = statement
		.split('\n')
		.flatMap((line, i) => (markAfter.has(i) ? [line, BUILD_CASE_MARK] : [line]));
	return {
		statement: out.join('\n'),
		blocks: marked.map((b) => ({ source: b.body.join('\n'), closed: b.closed })),
		errors
	};
}

/**
 * Regex to match expression markers in math zones: <<expr:NAME>>
 * NAME MUST start with the literal string "expression" (e.g. `expression1`,
 * `expression2`, `expressionA`) — markers like `<<expr:foo>>` or
 * `<<expr:myVar>>` will NOT match and will fall through silently to the
 * regular `?` replacement path. Authors must follow the `expression*`
 * variable convention.
 */
const EXPR_MARKER_REGEX = /^<<expr:(expression[a-zA-Z0-9]*)>>/;

/**
 * Assign sequential 0-based indices to all blanks in a statement.
 *
 * Processes left-to-right with a global counter:
 * 1. For each math zone encountered (in order):
 *    - If it contains <<expr:NAME>>, reserve indices for ? in answerFormats[NAME]
 *    - Otherwise, replace each ? with \placeholder[N]{}
 * 2. For each [_] in text (outside math), replace with {{blank:N}}
 *
 * @param rawStatement - Resolved statement string (variables already replaced)
 * @param answerFormats - Optional map of expression names to answer format strings
 * @returns Modified statement, modified answerFormats, and total blank count
 */
export function assignBlankIndices(
	rawStatement: string,
	answerFormats?: Record<string, string>
): AssignBlankIndicesResult {
	let counter = 0;
	const blankTypes: ('math' | 'text')[] = [];
	const modifiedAnswerFormats = answerFormats ? { ...answerFormats } : undefined;
	const expressionNameByIndex: Record<number, string> = {};
	const operationBlanks: Record<number, string> = {};
	const constructions = markConstructionBlocks(rawStatement);
	const constructionBlanks: Record<number, string> = {};
	const operations = markCaseBlocks(constructions.statement, OPERATION_BLOCKS);
	const builds = markBuildBlocks(operations.statement);
	const statement = builds.statement;
	let operationCount = 0;
	const buildBlanks: Record<number, string> = {};
	let buildCount = 0;

	// Split statement into math zones and text zones, preserving order.
	// We need to process left-to-right, handling math zones and text zones differently.
	const segments = splitIntoSegments(statement);

	const resultParts: string[] = [];

	for (const segment of segments) {
		if (segment.type === 'math') {
			// Check for expression marker
			const exprMatch = segment.content.match(EXPR_MARKER_REGEX);

			if (exprMatch && modifiedAnswerFormats && exprMatch[1] in modifiedAnswerFormats) {
				// Expression with answerFormat: reserve indices for ? in answerFormat.
				const exprName = exprMatch[1];
				const answerFormat = modifiedAnswerFormats[exprName];
				const indices: number[] = [];
				let modifiedFormat = '';
				for (const char of answerFormat) {
					if (char === '?') {
						modifiedFormat += `\\placeholder[${counter}]{}`;
						indices.push(counter);
						expressionNameByIndex[counter] = exprName;
						counter++;
						blankTypes.push('math');
					} else {
						modifiedFormat += char;
					}
				}
				modifiedAnswerFormats[exprName] = modifiedFormat;

				// If expression content also has ?, replace with \placeholder
				// reusing the same indices (the ? in content IS the blank)
				const markerPrefix = exprMatch[0];
				const mathPart = segment.content.slice(markerPrefix.length);
				if (mathPart.includes('?')) {
					let idxPtr = 0;
					let newMathPart = '';
					for (const char of mathPart) {
						if (char === '?' && idxPtr < indices.length) {
							newMathPart += `\\placeholder[${indices[idxPtr]}]{}`;
							idxPtr++;
						} else {
							newMathPart += char;
						}
					}
					resultParts.push(
						`${segment.openDelim}${markerPrefix}${newMathPart}${segment.closeDelim}`
					);
				} else {
					resultParts.push(`${segment.openDelim}${segment.content}${segment.closeDelim}`);
				}
			} else {
				// No expression marker — replace ? in math content
				let newContent = '';
				for (const char of segment.content) {
					if (char === '?') {
						newContent += `\\placeholder[${counter}]{}`;
						counter++;
						blankTypes.push('math');
					} else {
						newContent += char;
					}
				}
				resultParts.push(`${segment.openDelim}${newContent}${segment.closeDelim}`);
			}
		} else {
			// Text zone — replace [_] with {{blank:N}}
			let newText = '';
			let i = 0;
			const text = segment.content;
			while (i < text.length) {
				if (text.startsWith(CONSTRUCTION_MARK_START, i)) {
					const rankStart = i + CONSTRUCTION_MARK_START.length;
					const rankEnd = text.indexOf(CONSTRUCTION_MARK_END, rankStart);
					const block = constructions.blocks[Number(text.slice(rankStart, rankEnd))];
					newText += restoreConstructionBlock(block, counter);
					constructionBlanks[counter] = block.body.join('\n');
					counter++;
					blankTypes.push('math');
					i = rankEnd + CONSTRUCTION_MARK_END.length;
				} else if (text.startsWith(OPERATION_CASE_MARK, i)) {
					newText += `case: ${counter}`;
					const source = operations.sources[operationCount++];
					for (let k = caseCountOf(source); k > 0; k--) {
						operationBlanks[counter] = source;
						counter++;
						blankTypes.push('math');
					}
					i += OPERATION_CASE_MARK.length;
				} else if (text.startsWith(BUILD_CASE_MARK, i)) {
					newText += `case: ${counter}`;
					const build = builds.blocks[buildCount++];
					buildBlanks[counter] = build.source;
					if (!build.closed) {
						builds.errors.push(
							`Case ${counter + 1} (bloc collection) : bloc non fermé (\`\`\` manquant après la dernière ligne)`
						);
					}
					counter++;
					blankTypes.push('math');
					i += BUILD_CASE_MARK.length;
				} else if (text[i] === '[' && text[i + 1] === '_' && text[i + 2] === ']') {
					newText += `{{blank:${counter}}}`;
					counter++;
					blankTypes.push('text');
					i += 3;
				} else {
					newText += text[i];
					i++;
				}
			}
			resultParts.push(newText);
		}
	}

	const hasExpressionMapping = Object.keys(expressionNameByIndex).length > 0;
	return {
		statement: resultParts.join(''),
		...(modifiedAnswerFormats !== undefined && { answerFormats: modifiedAnswerFormats }),
		totalBlanks: counter,
		blankTypes,
		...(hasExpressionMapping && { expressionNameByIndex }),
		...(operationCount > 0 && { operationBlanks }),
		...(operations.errors.length > 0 && { operationErrors: operations.errors }),
		...(buildCount > 0 && { buildBlanks }),
		...(builds.errors.length > 0 && { buildErrors: builds.errors }),
		...(constructions.blocks.length > 0 && { constructionBlanks }),
		...(constructions.errors.length > 0 && { constructionErrors: constructions.errors })
	};
}

/**
 * A segment of the statement — either a math zone or a text zone
 */
interface Segment {
	type: 'math' | 'text';
	content: string;
	/** Opening delimiter for math zones ($ or $$) */
	openDelim?: string;
	/** Closing delimiter for math zones ($ or $$) */
	closeDelim?: string;
}

/**
 * Split a statement string into alternating text and math segments.
 *
 * Handles:
 * - Block math: $$...$$ (matched first, greedy-safe)
 * - Inline math: $...$ (no newlines inside)
 * - Escaped dollars: \$ (treated as literal text)
 *
 * @param statement - The statement to split
 * @returns Array of segments in order of appearance
 */
function splitIntoSegments(statement: string): Segment[] {
	const segments: Segment[] = [];
	let pos = 0;

	while (pos < statement.length) {
		// Check for escaped dollar
		if (statement[pos] === '\\' && statement[pos + 1] === '$') {
			// Escaped dollar — add as text
			appendText(segments, '\\$');
			pos += 2;
			continue;
		}

		// Check for block math $$...$$
		if (statement[pos] === '$' && statement[pos + 1] === '$') {
			const start = pos + 2;
			const end = statement.indexOf('$$', start);
			if (end !== -1) {
				const content = statement.slice(start, end);
				segments.push({
					type: 'math',
					content,
					openDelim: '$$',
					closeDelim: '$$'
				});
				pos = end + 2;
				continue;
			}
		}

		// Check for inline math $...$
		if (statement[pos] === '$') {
			const start = pos + 1;
			// Find closing $ (not preceded by \, not followed by $, no newlines)
			let end = -1;
			for (let j = start; j < statement.length; j++) {
				if (statement[j] === '\n') break;
				if (statement[j] === '$' && statement[j - 1] !== '\\') {
					end = j;
					break;
				}
			}
			if (end !== -1) {
				const content = statement.slice(start, end);
				segments.push({
					type: 'math',
					content,
					openDelim: '$',
					closeDelim: '$'
				});
				pos = end + 1;
				continue;
			}
		}

		// Regular text character
		appendText(segments, statement[pos]);
		pos++;
	}

	return segments;
}

/**
 * Append a character or string to the last text segment, or create a new one
 */
function appendText(segments: Segment[], char: string): void {
	const last = segments[segments.length - 1];
	if (last && last.type === 'text') {
		last.content += char;
	} else {
		segments.push({ type: 'text', content: char });
	}
}
