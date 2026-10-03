/**
 * Fonctions déclarées par le modèle (`shared.genericFunctions`) à l'ÉCRAN
 * ======================================================================
 *
 * Une formule en syntaxe maison (`~P'(2)~`) est relue au rendu : sans la liste du
 * modèle, `P'(2)` ne se lit pas et le rendu affiche l'erreur en rouge à la place.
 * L'instance porte la liste (`instance.genericFunctions`) jusqu'aux composants.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import QuestionCard from '../QuestionCard.svelte';
import CorrectionView from '../CorrectionView.svelte';
import CourseCardView from '../CourseCardView.svelte';
import type { QuestionInstance } from '$lib/questions/types';
import { templateGenericFunctions } from '$lib/questions/generic-functions';
import { resolvedMarkdown } from '$lib/ubumark';

const STATEMENT = "Le nombre dérivé ~P'(2)~ vaut :";

function qcm(genericFunctions?: string[]): QuestionInstance {
	return {
		templateId: 'tpl-fonctions',
		grades: ['1_SPE'],
		theme: 'Fonctions',
		domain: 'Dérivation',
		level: 1,
		generatedAt: new Date().toISOString(),
		statement: resolvedMarkdown(STATEMENT),
		choices: [
			{ content: resolvedMarkdown("~P'(1)~"), isCorrect: false },
			{ content: resolvedMarkdown('$12$'), isCorrect: true }
		],
		shuffledChoices: [
			{ content: resolvedMarkdown("~P'(1)~"), originalIndex: 0 },
			{ content: resolvedMarkdown('$12$'), originalIndex: 1 }
		],
		correctChoiceIndex: '1',
		...(genericFunctions && { genericFunctions })
	} as QuestionInstance;
}

/** Formules rendues en erreur : `\textcolor{red}{…}` (cf. expressionToRawLatex) */
function redErrors(container: HTMLElement): number {
	return [...container.querySelectorAll('math-span, math-div')].filter((el) =>
		(el.textContent ?? '').includes('\\textcolor{red}')
	).length;
}

describe('Fonctions déclarées — affichage', () => {
	it('QuestionCard : énoncé et choix lus avec la liste du modèle', async () => {
		const without = await render(QuestionCard, { instance: qcm(), interactive: true });
		const errorsWithout = redErrors(without.container);
		await without.unmount();

		const withList = await render(QuestionCard, { instance: qcm(['P']), interactive: true });
		expect(errorsWithout).toBeGreaterThan(0);
		expect(redErrors(withList.container)).toBe(0);
	});

	it('CorrectionView : prop genericFunctions', async () => {
		const markdown = "On calcule ~P'(2)~.";
		const without = await render(CorrectionView, { markdown });
		const errorsWithout = redErrors(without.container);
		await without.unmount();

		const withList = await render(CorrectionView, {
			markdown,
			genericFunctions: templateGenericFunctions(['P'])
		});
		expect(errorsWithout).toBeGreaterThan(0);
		expect(redErrors(withList.container)).toBe(0);
	});

	it('CourseCardView : recto lu avec la liste du modèle', async () => {
		const card = (genericFunctions?: string[]) =>
			({
				...qcm(genericFunctions),
				choices: undefined,
				shuffledChoices: undefined,
				correctChoiceIndex: undefined,
				options: { courseCard: true }
			}) as QuestionInstance;
		const without = await render(CourseCardView, { instance: card() });
		const errorsWithout = redErrors(without.container);
		await without.unmount();

		const withList = await render(CourseCardView, { instance: card(['P']) });
		expect(errorsWithout).toBeGreaterThan(0);
		expect(redErrors(withList.container)).toBe(0);
	});
});
