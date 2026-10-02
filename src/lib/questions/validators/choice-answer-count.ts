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
 * @module questions/validators/choice-answer-count
 */

import { getQuestionType, type QuestionTemplate, type QuestionVariation } from '../types';

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
