/**
 * Nombre de bonnes réponses d'un QCM (V1, chantier 2)
 * ===================================================
 *
 * Sans « plusieurs réponses » (`multipleAnswers`), un QCM a exactement une
 * bonne réponse ; avec, au moins une. Vérifié à l'enregistrement, côté serveur
 * (routes des modèles, `validateTemplate`) et dans l'éditeur, avec le même
 * message en français.
 *
 * Le décompte suit le générateur (`instance-generator`) : la bonne réponse
 * déclarée (`correctChoiceIndex`, de la variation sinon partagée) fait foi ; à
 * défaut, les choix marqués `isCorrect`. Une bonne réponse dynamique
 * (`{{if:…|0|1}}`) compte pour une.
 *
 * Case « choix » (bloc ```choix, chantier figure-et-choix) : mêmes règles, la
 * bonne réponse étant portée par la case (`blanks[i].expectedAnswer`, indices
 * d'origine « 1 » ou « 0;2 ») et « plusieurs réponses » par le bloc
 * (`plusieurs: oui`). Une bonne réponse dynamique (`{{eval:…}}`) n'est vérifiée
 * qu'au tirage (générateur).
 *
 * @module questions/validators/choice-answer-count
 */

import { getQuestionType, type QuestionTemplate, type QuestionVariation } from '../types';
import { assignBlankIndices } from '../generator/assign-blank-indices';
import { parseChoiceBody } from '$lib/ubumark/parser/choix-parser';
import { readExpectedChoices } from '../choice-case';

// Types
type ChoiceTemplate = Pick<
	QuestionTemplate,
	'variations' | 'shared' | 'multipleAnswers' | 'options'
>;

// Functions
/** Nombre de bonnes réponses d'une variation, parts partagées comprises */
function correctAnswerCount(variation: QuestionVariation, template: ChoiceTemplate): number {
	const declared = variation.correctChoiceIndex ?? template.shared?.correctChoiceIndex;
	// Même lecture que le générateur : une chaîne vide n'est pas une réponse déclarée
	if (declared !== undefined && declared !== '') {
		const list = Array.isArray(declared) ? declared : [declared];
		return new Set(list.filter((index) => String(index).trim() !== '')).size;
	}
	const choices = variation.choices ?? template.shared?.choices ?? [];
	return choices.filter((choice) => choice.isCorrect).length;
}

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
	const isChoice =
		getQuestionType({
			choices: variation.choices,
			shared: template.shared,
			options: template.options
		}) === 'multiple_choice';
	if (isChoice) return [`${prefix} : un bloc choix ne se combine pas avec les choix d’un QCM`];

	const result = assignBlankIndices(statement);
	if (result.choiceErrors) {
		return result.choiceErrors.map((error) =>
			error.startsWith('Case ') ? `${prefix}, c${error.slice(1)}` : `${prefix} : ${error}`
		);
	}
	// Cases de blocs ```operation / ```figure-a-completer : `blanks[]` peut les omettre
	const blockCases = new Set([
		...Object.keys(result.operationBlanks ?? {}).map(Number),
		...Object.keys(result.constructionBlanks ?? {}).map(Number)
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
			...spec.errors
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
		const isChoice =
			getQuestionType({
				choices: variation.choices,
				shared: template.shared,
				options: template.options
			}) === 'multiple_choice';
		if (!isChoice) return;

		const count = correctAnswerCount(variation, template);
		const prefix = `Variation ${index + 1} :`;
		if (count === 0 && !settings.draft) {
			errors.push(`${prefix} aucune bonne réponse n'est cochée.`);
		} else if (count > 1 && !template.multipleAnswers) {
			errors.push(
				`${prefix} ${count} bonnes réponses sont cochées, mais « plusieurs réponses » n'est pas activé : il en faut exactement une.`
			);
		}
	});
	return errors;
}
