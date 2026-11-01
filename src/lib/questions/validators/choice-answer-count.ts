/**
 * Bonnes réponses des cases choix (V1, chantier 2 ; case choix, ADR 0033)
 * =======================================================================
 *
 * Sans `plusieurs: oui`, une case choix a exactement une bonne réponse ; avec,
 * au moins une. Vérifié à l'enregistrement, côté serveur (routes des modèles,
 * `validateTemplate`) et dans l'éditeur, avec le même message en français. La
 * bonne réponse est portée par la case (`blanks[i].expectedAnswer`, indices
 * d'origine « 1 » ou « 0;2 »). Une bonne réponse dynamique (`{{eval:…}}`)
 * n'est vérifiée qu'au tirage (générateur).
 *
 * @module questions/validators/choice-answer-count
 */

import type { QuestionTemplate, QuestionVariation } from '../types';
import { assignBlankIndices } from '../generator/assign-blank-indices';
import { parseChoiceBody } from '$lib/ubumark/parser/choix-parser';
import { readExpectedChoices } from '../choice-case';

// Types
type ChoiceTemplate = Pick<QuestionTemplate, 'variations' | 'shared' | 'options'>;

// Functions
/** Énoncé avec un bloc ```choix (premier niveau ou non) */
const CHOICE_BLOCK_REGEX = /^\s*>?\s*`{3,}choix\s*$/m;

/**
 * Erreurs des cases choix d'une variation, situées (« Variation 1, case 2 (bloc
 * choix) : … »). Lecture de l'énoncé NON résolu, comme `figure-name-check` : la
 * position d'une case ne dépend pas des variables.
 */
function choiceCaseErrors(
	variation: QuestionVariation,
	template: ChoiceTemplate,
	index: number,
	settings: { draft?: boolean }
): string[] {
	const statement = String(variation.statement || template.shared?.statement || '');
	if (!CHOICE_BLOCK_REGEX.test(statement)) return [];
	const prefix = `Variation ${index + 1}`;

	const result = assignBlankIndices(statement);
	if (result.choiceErrors) {
		return result.choiceErrors.map((error) =>
			error.startsWith('Case ') ? `${prefix}, c${error.slice(1)}` : `${prefix} : ${error}`
		);
	}
	// Cases de blocs ```operation / ```figure-a-completer / ```figure-de-travail :
	// `blanks[]` peut les omettre
	const blockCases = new Set([
		...Object.keys(result.operationBlanks ?? {}).map(Number),
		...Object.keys(result.constructionBlanks ?? {}).map(Number),
		...Object.keys(result.workFigureBlanks ?? {}).map(Number)
	]);
	const blanks = variation.blanks ?? [];
	const others = Array.from({ length: result.totalBlanks }, (_, i) => i).filter(
		(i) => !blockCases.has(i)
	);
	const blankAt = (caseIndex: number) =>
		blanks.length === result.totalBlanks
			? blanks[caseIndex]
			: blanks.length === others.length
				? blanks[others.indexOf(caseIndex)]
				: undefined;

	const errors: string[] = [];
	for (const [key, body] of Object.entries(result.choiceBlanks ?? {})) {
		const caseIndex = Number(key);
		const casePrefix = `${prefix}, case ${caseIndex + 1} (bloc choix) :`;
		const spec = parseChoiceBody(body.split('\n'));
		const blockErrors = [
			...(spec.caseIndex !== undefined
				? ['case: est posée automatiquement, retirer cette ligne du bloc']
				: []),
			...spec.errors,
			// Même refus qu'au tirage : l'appariement ne sait pas lire une case choix
			...(template.options?.orderIndependent
				? ['une case choix ne se combine pas avec « ordre indifférent »']
				: [])
		];
		if (blockErrors.length > 0) {
			errors.push(`${casePrefix} ${blockErrors.join(' ; ')}`);
			continue;
		}
		const expected = blankAt(caseIndex)?.expectedAnswer ?? '';
		// Bonne réponse dynamique : vérifiée au tirage seulement
		if (expected.includes('{{')) continue;
		const read = readExpectedChoices(expected, spec.choices.length, spec.multiple, settings);
		if (read.errors.length > 0) errors.push(`${casePrefix} ${read.errors.join(' ; ')}`);
	}
	return errors;
}

/**
 * Erreurs (en français, une par variation fautive). Un brouillon (`draft`) peut
 * encore n'avoir aucune bonne réponse — il est en cours d'écriture —, jamais en
 * avoir plusieurs sans « plusieurs réponses ».
 */
export function choiceAnswerCountErrors(
	template: ChoiceTemplate,
	settings: { draft?: boolean } = {}
): string[] {
	const errors: string[] = [];
	(template.variations ?? []).forEach((variation, index) => {
		errors.push(...choiceCaseErrors(variation, template, index, settings));
	});
	return errors;
}
