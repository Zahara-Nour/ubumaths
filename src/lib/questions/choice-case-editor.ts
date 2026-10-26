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

// Functions
/** Genre de chaque case de l'énoncé, dans l'ordre des cases (`blanks[i]`) */
export function statementCaseKinds(statement: string): AssignedBlankType[] {
	return assignBlankIndices(statement).blankTypes;
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
