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
 * - Bloc ```collection ou ```monnaie à construire (`construire: N`) → UNE case, `case: N`
 *   posé dans le bloc ; droite à placer (```line, `placer: A=3 ; B=7`) → une case par point,
 *   N, N + 1…, seul N est posé
 * - Bloc ```figure-a-completer → UNE case (la figure de l'élève), `case: N` posé dans le bloc ;
 *   son contenu est mis à l'abri : ni `?` ni `[_]` n'y crée de case
 * - Bloc ```figure-de-travail → de même UNE case, jamais notée (l'élève trace pour vérifier)
 * - Bloc ```choix → UNE case (type 'choice'), `case: N` posé dans le bloc ; une case
 *   écrite dans un choix (`?` en formule, `[_]`) est refusée avec un message situé
 *
 * @module questions/generator/assign-blank-indices
 */

import { parseOperationContent } from '$lib/ubumark/parser/operation-parser';
import { findFigureBlocks } from '$lib/ubumark/parser/figure-parser';
import { findBuildCollections } from '$lib/ubumark/parser/collection-parser';
import { findBuildMonnaies } from '$lib/ubumark/parser/monnaie-parser';
import { findLinesToPlace, parseNumberLineContent } from '$lib/ubumark/parser/number-line-parser';
import { findHorlogesToPlace } from '$lib/ubumark/parser/horloge-parser';
import { buildKindName, type BuildKind } from '../types';
import { operationCaseCount } from '$lib/ubumark/utils/operation-division-answer';
import {
	CHOICE_BLOCK_NESTED_MESSAGE,
	CHOICE_BLOCK_UNCLOSED_MESSAGE,
	findChoiceBlocks,
	type ChoiceBlockRange,
	isChoiceBlockStart,
	isNestedChoiceBlockStart,
	parseChoiceBody
} from '$lib/ubumark/parser/choix-parser';

/** Type d'une case : formule, texte, ou case « choix » (bloc ```choix) */
export type AssignedBlankType = 'math' | 'text' | 'choice';

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
	/** Type of each blank in order: 'math' for ? in $...$, 'text' for [_] in text, 'choice' for ```choix */
	blankTypes: AssignedBlankType[];
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
	 * Case → genre et texte du bloc à construire (```collection, ```monnaie) ou de la
	 * droite à placer qui la porte (sans `case:`), pour que le générateur lise la valeur
	 * attendue ; droite : `point`, le rang du point de la case. Absent sans tel bloc.
	 */
	buildBlanks?: Record<number, BuildBlank>;
	/** Blocs à construire mal placés (liste, citation) : messages pour l'auteur */
	buildErrors?: string[];
	/**
	 * Case → texte du bloc ```figure-a-completer qui la porte (sans `case:`), pour que
	 * le générateur lise ses vérifications. Absent sans tel bloc.
	 */
	constructionBlanks?: Record<number, string>;
	/**
	 * Case → texte du bloc ```figure-de-travail qui la porte (sans `case:`) : case
	 * jamais notée. Absent sans tel bloc.
	 */
	workFigureBlanks?: Record<number, string>;
	/** Blocs ```figure-a-completer ou ```figure-de-travail mal placés (liste, citation) : messages pour l'auteur */
	constructionErrors?: string[];
	/**
	 * Case → corps du bloc ```choix qui la porte (sans `case:`, choix dans l'ordre
	 * écrit), pour que le générateur lise ses choix et ses réglages. Absent sans tel bloc.
	 */
	choiceBlanks?: Record<number, string>;
	/** Blocs ```choix mal placés, non fermés, ou qui contiennent une case : messages pour l'auteur */
	choiceErrors?: string[];
}

/** Marque d'un bloc ```choix mis à l'abri : début, rang du bloc, fin */
const CHOICE_MARK_START = '\u0000choice:';
const CHOICE_MARK_END = '\u0000';

interface MarkedChoiceBlock {
	/** Clôture d'ouverture (``` ou ````) */
	fence: string;
	/** Lignes du bloc entre les clôtures */
	body: string[];
	closed: boolean;
}

/** Ouverture d'un bloc délimité au premier niveau : clôture et nom (« » pour du code) */
const FENCE_OPEN_REGEX = /^(`{3,})([^`\s]*)\s*$/;
/** Blocs de question qui portent leur propre case : un bloc choix n'y a pas sa place */
const QUESTION_BLOCK_NAMES = new Set(['figure-a-completer', 'figure-de-travail', 'operation']);

/**
 * Bloc délimité (autre que ```choix) qui contient chaque ligne : son nom, ou `null`
 * hors de tout bloc. Fin : une ligne de ` au moins aussi longue que l'ouverture ;
 * ```operation finit aussi à la première ligne vide, comme son parseur.
 */
function enclosingBlockNames(lines: readonly string[]): (string | null)[] {
	const names: (string | null)[] = [];
	let open: { length: number; name: string } | null = null;
	for (const line of lines) {
		if (open) {
			const closes =
				new RegExp(`^\`{${open.length},}\\s*$`).test(line) ||
				(open.name === 'operation' && line.trim() === '');
			names.push(open.name === 'choix' ? null : open.name);
			if (closes) open = null;
			continue;
		}
		names.push(null);
		const fence = line.match(FENCE_OPEN_REGEX);
		if (fence) open = { length: fence[1].length, name: fence[2] };
	}
	return names;
}

/**
 * Met à l'abri les blocs ```choix (premier niveau) : chacun devient une marque d'une
 * ligne, numérotée ensuite avec les autres cases puis rendue avec `case: N`. Un bloc
 * en retrait ou cité est refusé (il ne peut pas porter de case), comme un bloc écrit
 * dans un bloc de question (```figure-a-completer, ```operation) ; dans un bloc de
 * code (ou tout autre bloc délimité), ce n'est que du texte.
 */
/**
 * Blocs ```choix qui portent une case, dans l'ordre des cases : ceux du premier
 * niveau, hors de tout autre bloc (repérage de `assignBlankIndices`). Pour
 * l'éditeur de cases, qui réécrit un bloc à sa place.
 */
export function findCaseChoiceBlocks(statement: string): ChoiceBlockRange[] {
	const lines = statement.split('\n');
	const enclosing = enclosingBlockNames(lines);
	return findChoiceBlocks(lines.map((line, i) => (enclosing[i] === null ? line : '')));
}

function markChoiceBlocks(statement: string): {
	statement: string;
	blocks: MarkedChoiceBlock[];
	errors: string[];
} {
	const lines = statement.split('\n');
	const enclosing = enclosingBlockNames(lines);
	// Lignes d'un autre bloc masquées : un ```choix n'y est pas repéré
	const ranges = findCaseChoiceBlocks(statement);
	const out: string[] = [];
	const blocks: MarkedChoiceBlock[] = [];
	const errors: string[] = [];
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const outer = enclosing[i];
		if (outer !== null) {
			if (QUESTION_BLOCK_NAMES.has(outer) && isChoiceBlockStart(line)) {
				errors.push(`Ligne ${i + 1} : un bloc choix ne peut pas être dans un bloc ${outer}`);
			}
			out.push(line);
			continue;
		}
		if (isNestedChoiceBlockStart(line)) errors.push(CHOICE_BLOCK_NESTED_MESSAGE);
		const range = ranges.find((r) => r.startIndex === i);
		if (!range) {
			out.push(line);
			continue;
		}
		out.push(`${CHOICE_MARK_START}${blocks.length}${CHOICE_MARK_END}`);
		blocks.push({
			fence: range.fence,
			body: lines.slice(i + 1, range.closed ? range.endIndex : range.endIndex + 1),
			closed: range.closed
		});
		i = range.endIndex;
	}
	return { statement: out.join('\n'), blocks, errors };
}

/** Le bloc rendu à son texte, sa case posée en première ligne */
function restoreChoiceBlock(block: MarkedChoiceBlock, caseIndex: number): string {
	return [
		`${block.fence}choix`,
		`case: ${caseIndex}`,
		...block.body,
		...(block.closed ? [block.fence] : [])
	].join('\n');
}

/** Un choix contient-il une case (`?` dans une formule, `[_]` dans le texte) ? */
function choiceHasBlank(choice: string): boolean {
	return splitIntoSegments(choice).some((segment) =>
		segment.type === 'math' ? segment.content.includes('?') : segment.content.includes('[_]')
	);
}

/** Messages d'un bloc ```choix numéroté (case `caseIndex`) : fermeture, case dans un choix */
function choiceBlockErrors(block: MarkedChoiceBlock, caseIndex: number): string[] {
	const prefix = `Case ${caseIndex + 1} (bloc choix) :`;
	const errors: string[] = [];
	if (!block.closed) errors.push(`${prefix} ${CHOICE_BLOCK_UNCLOSED_MESSAGE}`);
	parseChoiceBody(block.body).choices.forEach((choice, index) => {
		if (choiceHasBlank(choice)) {
			errors.push(
				`${prefix} le choix ${index + 1} contient une case (? ou [_]) ; une case ne peut pas être dans un choix`
			);
		}
	});
	return errors;
}

/** Fence d'ouverture d'un bloc ```figure-a-completer ou ```figure-de-travail, au premier niveau seulement */
const CONSTRUCTION_FENCE_REGEX = /^```(figure-a-completer|figure-de-travail)\s*$/;

/** La même, en retrait (liste) ou citée : le bloc ne peut pas porter de case */
const NESTED_CONSTRUCTION_FENCE_REGEX =
	/^(?:\s+|\s*>\s*)```(figure-a-completer|figure-de-travail)\s*$/;

/** Marque d'un bloc ```figure-a-completer ou ```figure-de-travail mis à l'abri : début, rang du bloc, fin */
const CONSTRUCTION_MARK_START = '\u0000construction:';
const CONSTRUCTION_MARK_END = '\u0000';

const constructionNestedMessage = (name: string) =>
	`Un bloc ${name} doit être au premier niveau de l’énoncé (ni dans une liste, ni dans une citation)`;

interface ConstructionBlock {
	/** Nom du bloc : figure à compléter (notée) ou figure de travail (jamais notée) */
	name: 'figure-a-completer' | 'figure-de-travail';
	/** Lignes du bloc entre les clôtures */
	body: string[];
	/** false : clôture ``` absente (le parseur dira « bloc non fermé ») */
	closed: boolean;
}

/**
 * Met à l'abri les blocs ```figure-a-completer et ```figure-de-travail : chacun devient une marque d'une
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
		const nested = NESTED_CONSTRUCTION_FENCE_REGEX.exec(line);
		if (nested) {
			errors.push(constructionNestedMessage(nested[1]));
		}
		const range = ranges.find((r) => r.startIndex === i);
		if (!range) {
			out.push(line);
			continue;
		}
		const closed = range.closed !== false;
		out.push(`${CONSTRUCTION_MARK_START}${blocks.length}${CONSTRUCTION_MARK_END}`);
		blocks.push({
			name: line.includes('figure-de-travail') ? 'figure-de-travail' : 'figure-a-completer',
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
		`\`\`\`${block.name}`,
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

const NESTED_BLOCK_NAMES: Record<BuildKind, string> = {
	collection: 'Un bloc collection à construire',
	monnaie: 'Un bloc monnaie à construire',
	line: 'Une droite à placer',
	horloge: 'Une horloge à placer'
};

const buildNestedMessage = (kind: BuildKind) =>
	`${NESTED_BLOCK_NAMES[kind]} doit être au premier niveau de l’énoncé (ni dans une liste, ni dans une citation)`;

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
	kind: BuildKind;
	source: string;
	closed: boolean;
	/** Nombre de cases : une par point d'une droite à placer, sinon une */
	cases: number;
}

/** Case d'un bloc à construire ou d'une droite à placer (`point` : rang du point) */
export interface BuildBlank {
	kind: BuildKind;
	source: string;
	point?: number;
}

/** Nombre de points d'une droite à placer ; une droite illisible compte une case (refusée au générateur) */
function targetCount(source: string): number {
	return Math.max(1, parseNumberLineContent(source).node?.placer?.length ?? 1);
}

/**
 * Repère les blocs ```collection et ```monnaie à construire : une marque est posée
 * après la fence de chacun. Délimités comme leur parseur (`findBuildCollections`,
 * `findBuildMonnaies`) : une ligne vide suivie d'une clé reste dans le bloc, sinon
 * sa case disparaîtrait.
 */
function markBuildBlocks(statement: string): {
	statement: string;
	blocks: BuildBlock[];
	errors: string[];
} {
	const found = [
		...findBuildCollections(statement).map((b) => ({ ...b, kind: 'collection' as const })),
		...findBuildMonnaies(statement).map((b) => ({ ...b, kind: 'monnaie' as const })),
		...findLinesToPlace(statement).map((b) => ({ ...b, kind: 'line' as const })),
		...findHorlogesToPlace(statement).map((b) => ({ ...b, kind: 'horloge' as const }))
	].sort((a, b) => a.startIndex - b.startIndex);
	const errors = found.filter((b) => b.nested).map((b) => buildNestedMessage(b.kind));
	const marked = found.filter((b) => !b.nested);
	const markAfter = new Set(marked.map((b) => b.startIndex));
	const out = statement
		.split('\n')
		.flatMap((line, i) => (markAfter.has(i) ? [line, BUILD_CASE_MARK] : [line]));
	return {
		statement: out.join('\n'),
		blocks: marked.map((b) => {
			const source = b.body.join('\n');
			const cases = b.kind === 'line' ? targetCount(source) : 1;
			return { kind: b.kind, source, closed: b.closed, cases };
		}),
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
	const blankTypes: AssignedBlankType[] = [];
	const modifiedAnswerFormats = answerFormats ? { ...answerFormats } : undefined;
	const expressionNameByIndex: Record<number, string> = {};
	const operationBlanks: Record<number, string> = {};
	const choices = markChoiceBlocks(rawStatement);
	const choiceBlanks: Record<number, string> = {};
	const choiceErrors: string[] = [...choices.errors];
	const constructions = markConstructionBlocks(choices.statement);
	const constructionBlanks: Record<number, string> = {};
	const workFigureBlanks: Record<number, string> = {};
	const operations = markCaseBlocks(constructions.statement, OPERATION_BLOCKS);
	const builds = markBuildBlocks(operations.statement);
	const statement = builds.statement;
	let operationCount = 0;
	const buildBlanks: Record<number, BuildBlank> = {};
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
				if (text.startsWith(CHOICE_MARK_START, i)) {
					const rankStart = i + CHOICE_MARK_START.length;
					const rankEnd = text.indexOf(CHOICE_MARK_END, rankStart);
					const block = choices.blocks[Number(text.slice(rankStart, rankEnd))];
					newText += restoreChoiceBlock(block, counter);
					choiceBlanks[counter] = block.body.join('\n');
					choiceErrors.push(...choiceBlockErrors(block, counter));
					counter++;
					blankTypes.push('choice');
					i = rankEnd + CHOICE_MARK_END.length;
				} else if (text.startsWith(CONSTRUCTION_MARK_START, i)) {
					const rankStart = i + CONSTRUCTION_MARK_START.length;
					const rankEnd = text.indexOf(CONSTRUCTION_MARK_END, rankStart);
					const block = constructions.blocks[Number(text.slice(rankStart, rankEnd))];
					newText += restoreConstructionBlock(block, counter);
					const blanksOfKind =
						block.name === 'figure-de-travail' ? workFigureBlanks : constructionBlanks;
					blanksOfKind[counter] = block.body.join('\n');
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
					if (!build.closed) {
						builds.errors.push(
							`Case ${counter + 1} (${buildKindName(build.kind)}) : bloc non fermé (\`\`\` manquant après la dernière ligne)`
						);
					}
					for (let point = 0; point < build.cases; point++) {
						buildBlanks[counter] = {
							kind: build.kind,
							source: build.source,
							...(build.kind === 'line' && { point })
						};
						counter++;
						// Horloge : la réponse est une heure (`9 h 25`), jamais lue comme un calcul
						blankTypes.push(build.kind === 'horloge' ? 'text' : 'math');
					}
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
		...(Object.keys(constructionBlanks).length > 0 && { constructionBlanks }),
		...(Object.keys(workFigureBlanks).length > 0 && { workFigureBlanks }),
		...(constructions.errors.length > 0 && { constructionErrors: constructions.errors }),
		...(choices.blocks.length > 0 && { choiceBlanks }),
		...(choiceErrors.length > 0 && { choiceErrors })
	};
}

/**
 * A segment of the statement — either a math zone or a text zone
 */
export interface Segment {
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
export function splitIntoSegments(statement: string): Segment[] {
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
