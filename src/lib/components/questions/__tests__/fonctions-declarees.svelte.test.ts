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

/** Case choix : un choix écrit avec la fonction déclarée `P` */
function choiceQuestion(genericFunctions?: string[]): QuestionInstance {
	return {
		templateId: 'tpl-fonctions',
		grades: ['1_SPE'],
		theme: 'Fonctions',
		domain: 'Dérivation',
		level: 1,
		generatedAt: new Date().toISOString(),
		statement: resolvedMarkdown(`${STATEMENT}\n\n\`\`\`choix\ncase: 0\n- ~P'(1)~\n- $12$\n\`\`\``),
		blanks: [
			{
				expectedAnswer: '1',
				type: 'choice',
				choice: { choices: ["~P'(1)~", '$12$'], order: [0, 1], multiple: false }
			}
		],
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
		const without = await render(QuestionCard, { instance: choiceQuestion(), interactive: true });
		const errorsWithout = redErrors(without.container);
		await without.unmount();

		const withList = await render(QuestionCard, {
			instance: choiceQuestion(['P']),
			interactive: true
		});
		expect(errorsWithout).toBeGreaterThan(0);
		expect(redErrors(withList.container)).toBe(0);
		// Les choix sont bien rendus (sinon « 0 erreur » ne prouverait rien pour eux)
		expect(withList.container.querySelectorAll('.choice-button')).toHaveLength(2);
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
				...choiceQuestion(genericFunctions),
				statement: resolvedMarkdown(STATEMENT),
				blanks: undefined,
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
