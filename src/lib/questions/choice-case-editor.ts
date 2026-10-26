/**
 * Éditeur de cases : la case « choix » lue et réécrite dans l'énoncé
 * ===================================================================
 *
 * Le bloc ```choix de l'énoncé fait foi (liste des choix, `plusieurs:`,
 * `melanger:`) ; la bonne réponse est portée par la case (`blanks[i]`, `"1"`,
 * `"0;2"`, indices d'origine). L'éditeur repère les cases comme le générateur
 * (`assignBlankIndices`) et réécrit un bloc à sa place, le reste du texte rendu
 * à l'octet près. Chantier figure-et-choix, PR 1b.
 *
 * @module questions/choice-case-editor
 */

import {
	assignBlankIndices,
	findCaseChoiceBlocks,
	type AssignedBlankType
} from './generator/assign-blank-indices';
import {
	CHOICE_BLOCK_UNCLOSED_MESSAGE,
	parseChoiceBody,
	serializeTemplateChoiceBlock
} from '$lib/ubumark/parser/choix-parser';
import { parseChoiceAnswer } from './choice-case';

// Types
/** Ce que la carte « Case N : choix » édite */
export interface ChoiceCaseDraft {
	multiple: boolean;
	shuffle: boolean;
	/** Choix (markdown), dans l'ordre écrit */
	choices: string[];
}

export interface EditableChoiceCase extends ChoiceCaseDraft {
	/** Messages pour l'auteur (bloc mal écrit) */
	errors: string[];
	/** Réécrire le bloc ne perdrait rien : sinon, on le corrige dans l'énoncé */
	rewritable: boolean;
}

// Constantes
/** Ce que le générateur résout avant de compter les cases */
const UNRESOLVED_MARKERS = /\{\{|<<expr:/;

// Functions
/** Genre de chaque case de l'énoncé, dans l'ordre des cases (`blanks[i]`) */
export function statementCaseKinds(statement: string): AssignedBlankType[] {
	return assignBlankIndices(statement).blankTypes;
}

/**
 * `blanks[]` qui omet les cases des blocs (```operation, ```figure-a-completer,
 * ```figure-de-travail, ```collection / ```monnaie à construire), comme le permet
 * le générateur : la liste remise à une entrée par case, `empty()` au rang de
 * chaque case de bloc, les autres entrées dans l'ordre — le sens que leur donne
 * le générateur. `null` si la liste n'omet pas exactement ces cases.
 */
export function withBlockCases<T>(
	blanks: readonly T[],
	statement: string,
	empty: () => T
): T[] | null {
	const result = assignBlankIndices(statement);
	if (!countsLikeResolved(statement, result)) return null;
	const blockCases = new Set(
		[
			result.operationBlanks,
			result.constructionBlanks,
			result.workFigureBlanks,
			result.buildBlanks
		].flatMap((map) => Object.keys(map ?? {}).map(Number))
	);
	if (blockCases.size === 0 || blanks.length !== result.totalBlanks - blockCases.size) return null;
	const others = [...blanks];
	return Array.from({ length: result.totalBlanks }, (_, index) =>
		blockCases.has(index) ? empty() : others.shift()!
	);
}

/**
 * L'énoncé brut compte-t-il les cases comme l'énoncé résolu ? Le générateur les
 * compte APRÈS les variables (`{{a}}`, `{{if:…}}`) et les expressions
 * (`<<expr:…>>`). Une variable dans un ```operation peut en changer le nombre
 * (`{{a}} ÷ 7` : deux cases) ; ailleurs, seule une variable qui porte une case
 * (`{{if:k==1|[_]|…}}`) le fait : vue en comptant aussi l'énoncé où chacune vaut
 * `1` — même genre de cases dans le même ordre, sinon on ne sait pas. Une
 * expression peut porter des cases par son format de réponse (`?/?`), que
 * l'éditeur ne connaît pas : jamais réalignée.
 */
function countsLikeResolved(
	statement: string,
	raw: ReturnType<typeof assignBlankIndices>
): boolean {
	if (!UNRESOLVED_MARKERS.test(statement)) return true;
	if (statement.includes('<<expr:')) return false;
	if (Object.values(raw.operationBlanks ?? {}).some((source) => UNRESOLVED_MARKERS.test(source))) {
		return false;
	}
	const neutral = assignBlankIndices(withVariablesAsOne(statement));
	return (
		neutral.totalBlanks === raw.totalBlanks &&
		neutral.blankTypes.every((kind, index) => kind === raw.blankTypes[index])
	);
}

/**
 * Chaque `{{…}}` (imbriqués compris) remplacé par `1`. Une accolade LaTeX collée
 * (`\frac{a}{{{b}}}`) peut laisser une `}` orpheline : sans effet sur le compte
 * (seuls `?`, `[_]` et les blocs comptent) ; au pire les comptes diffèrent → rien.
 */
function withVariablesAsOne(text: string): string {
	let out = '';
	let depth = 0;
	for (let i = 0; i < text.length; i++) {
		if (text.startsWith('{{', i)) {
			if (depth === 0) out += '1';
			depth++;
			i++;
		} else if (depth > 0 && text.startsWith('}}', i)) {
			depth--;
			i++;
		} else if (depth === 0) {
			out += text[i];
		}
	}
	return out;
}

/** Le bloc choix de rang `ordinal` (0 = le premier), ou `null` s'il n'existe pas */
export function readChoiceCase(statement: string, ordinal: number): EditableChoiceCase | null {
	const range = findCaseChoiceBlocks(statement)[ordinal];
	if (!range) return null;
	const lines = statement.split('\n');
	const body = lines.slice(
		range.startIndex + 1,
		range.closed ? range.endIndex : range.endIndex + 1
	);
	const spec = parseChoiceBody(body);
	return {
		multiple: spec.multiple,
		shuffle: spec.shuffle,
		choices: spec.choices,
		errors: range.closed ? spec.errors : [...spec.errors, CHOICE_BLOCK_UNCLOSED_MESSAGE],
		rewritable: spec.rewritable && range.closed
	};
}

/** Réécrit le bloc choix de rang `ordinal` ; absent : énoncé inchangé */
export function writeChoiceCase(
	statement: string,
	ordinal: number,
	draft: ChoiceCaseDraft
): string {
	const range = findCaseChoiceBlocks(statement)[ordinal];
	if (!range) return statement;
	const lines = statement.split('\n');
	return [
		...lines.slice(0, range.startIndex),
		serializeTemplateChoiceBlock(draft),
		...lines.slice(range.endIndex + 1)
	].join('\n');
}

/** Ajoute un bloc choix en fin d'énoncé : sa case est la dernière */
export function appendChoiceCase(statement: string, draft: ChoiceCaseDraft): string {
	const block = serializeTemplateChoiceBlock(draft);
	const text = statement.trimEnd();
	return text === '' ? block : `${text}\n\n${block}`;
}

/**
 * Bonne réponse cochée (indices d'origine triés) ; `null` si elle ne se coche
 * pas : réponse calculée (`{{eval:…}}`) ou hors des choix.
 */
export function readCheckedChoices(expectedAnswer: string, count: number): number[] | null {
	return parseChoiceAnswer(expectedAnswer.trim(), count);
}

/** Bons choix après la suppression du choix `removed` : les suivants reculent d'un rang */
export function choiceIndexesAfterRemoval(indexes: readonly number[], removed: number): number[] {
	return indexes
		.filter((index) => index !== removed)
		.map((index) => (index > removed ? index - 1 : index));
}
