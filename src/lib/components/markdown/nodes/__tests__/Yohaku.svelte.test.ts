/**
 * Grille yohaku à l'écran (chantier `outil-yohaku`, outil n° 56)
 *
 * Phase 0 : une grille 2 × 2, ses totaux au bout des lignes et sous les colonnes ; les cases
 * entre crochets sont des champs MathLive ; la réponse = leurs valeurs en tableau JSON ; après
 * la validation, cases vertes ou rouges, totaux faux en rouge ; corrigé = la solution et
 * « D'autres remplissages sont justes. »
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import Yohaku from '../Yohaku.svelte';
import FillBlanksInput from '#lib/components/question-inputs/FillBlanksInput.svelte';
import BuildAnswer from '#lib/components/questions/BuildAnswer.svelte';
import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
import { templateMarkdown } from '#lib/ubumark/index.ts';
import type { QuestionTemplate } from '#lib/questions/types.ts';
import { parseYohakuContent } from '#lib/ubumark/parser/yohaku-parser.ts';
import { ecrireReponse, expectedYohakuAnswer } from '#lib/ubumark/utils/yohaku-answer.ts';

let mains: HTMLElement[] = [];
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

const QUESTION = [
	'opération: produit',
	'ligne: [x+2] | [x+3]',
	'ligne: [2x+1] | x+1',
	'case: 0'
].join('\n');
const node = parseYohakuContent(QUESTION);
const spec = node.spec!;
const expected = expectedYohakuAnswer(spec);

/** Écrit dans un champ MathLive, comme une saisie */
function ecrire(champ: Element, valeur: string) {
	(champ as HTMLElement & { value: string }).value = valeur;
	champ.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('grille yohaku : l’écran', () => {
	it('3 champs (les cases entre crochets), 4 totaux, le signe ×', async () => {
		const screen = await render(Yohaku, {
			target: mainElement(),
			props: {
				node,
				answer: { value: '', isCorrect: null, disabled: false, onChange: () => {} }
			}
		});
		expect(screen.container.querySelectorAll('math-field')).toHaveLength(3);
		expect(screen.container.querySelectorAll('[data-yohaku-total]')).toHaveLength(4);
		expect(screen.container.querySelector('.yohaku-signe')?.textContent).toBe('×');
	});

	it('saisie dans les champs : la réponse est le tableau des valeurs', async () => {
		const reponses: string[] = [];
		const answer = $state({
			value: '',
			isCorrect: null as boolean | null,
			disabled: false,
			onChange: (v: string) => {
				reponses.push(v);
				answer.value = v;
			}
		});
		const screen = await render(Yohaku, { target: mainElement(), props: { node, answer } });
		const champs = screen.container.querySelectorAll('math-field');
		ecrire(champs[0], 'x+2');
		ecrire(champs[2], '2x+1');
		expect(reponses[reponses.length - 1]).toBe(ecrireReponse(['x+2', '', '2x+1']));
	});

	it('hors question : aucun champ, cases à remplir vides ; solution: oui les remplit', async () => {
		const cours = parseYohakuContent(QUESTION.replace('case: 0', ''));
		const vide = await render(Yohaku, { target: mainElement(), props: { node: cours } });
		expect(vide.container.querySelectorAll('math-field')).toHaveLength(0);
		expect(vide.container.querySelectorAll('.yohaku-case math-span')).toHaveLength(1);
		const corrige = parseYohakuContent(QUESTION.replace('case: 0', 'solution: oui'));
		const plein = await render(Yohaku, { target: mainElement(), props: { node: corrige } });
		expect(plein.container.querySelectorAll('.yohaku-case math-span')).toHaveLength(4);
	});

	it('faux : cases rouges, la ligne et la colonne fausses marquées, le message', async () => {
		const answer = {
			value: ecrireReponse(['x+2', 'x+4', '2x+1']),
			isCorrect: false,
			disabled: false,
			onChange: () => {}
		};
		const screen = await render(Yohaku, {
			target: mainElement(),
			props: { node, answer, expected }
		});
		expect(screen.container.querySelector('[data-etat="faux"]')).not.toBeNull();
		const fausses = [...screen.container.querySelectorAll('.yohaku-faux')].map((e) =>
			e.getAttribute('data-yohaku-total')
		);
		expect(fausses).toEqual(['ligne-0', 'colonne-1']);
		await expect
			.element(page.getByText('La 1re ligne et la 2e colonne ne donnent pas le bon produit.'))
			.toBeVisible();
	});

	it('juste : cases vertes, aucun total en rouge', async () => {
		const answer = {
			value: ecrireReponse(['x+2', 'x+3', '2x+1']),
			isCorrect: true,
			disabled: false,
			onChange: () => {}
		};
		const screen = await render(Yohaku, {
			target: mainElement(),
			props: { node, answer, expected }
		});
		expect(screen.container.querySelector('[data-etat="juste"]')).not.toBeNull();
		expect(screen.container.querySelectorAll('.yohaku-faux')).toHaveLength(0);
	});

	it('bloc en erreur, erreurs montrées : la liste pour l’auteur', async () => {
		await render(Yohaku, {
			target: mainElement(),
			props: { node: parseYohakuContent('opération: quotient'), showErrors: true }
		});
		await expect.element(page.getByText('Bloc yohaku : question non affichée')).toBeVisible();
	});
});

describe('grille yohaku : dans la question (FillBlanksInput)', () => {
	it('les valeurs saisies deviennent la réponse de la case', async () => {
		const generated = generateInstance(
			{
				id: 'test-yohaku',
				title: 'Yohaku',
				status: 'draft',
				variations: [
					{
						statement: templateMarkdown(
							[
								'Remplis la grille.',
								'',
								'```yohaku',
								'opération: produit',
								'ligne: [x+2] | [x+3]',
								'ligne: [2x+1] | x+1',
								'```'
							].join('\n')
						)
					}
				],
				grades: ['3'],
				level: 1
			} as QuestionTemplate,
			42
		);
		if (!generated.success) throw new Error(generated.errors.join(' ; '));
		const props = $state({
			statement: generated.instance.statement,
			blanks: generated.instance.blanks ?? [],
			values: [] as string[],
			validationResults: []
		});
		const screen = await render(FillBlanksInput, { target: mainElement(), props });
		const champs = screen.container.querySelectorAll('math-field');
		expect(champs).toHaveLength(3);
		ecrire(champs[0], 'x+2');
		ecrire(champs[1], 'x+3');
		ecrire(champs[2], '2x+1');
		expect(props.values[0]).toBe(ecrireReponse(['x+2', 'x+3', '2x+1']));
	});
});

describe('grille yohaku : le corrigé (BuildAnswer)', () => {
	it('sans réponse : la solution de l’auteur et « D’autres remplissages sont justes. »', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'yohaku',
				source: QUESTION,
				answer: null,
				status: 'solution',
				expected: [expected]
			}
		});
		expect(screen.container.querySelectorAll('.yohaku-case math-span')).toHaveLength(4);
		expect(screen.container.textContent).toContain("D'autres remplissages sont justes.");
	});

	it('avec la réponse de l’élève, fausse : sa grille, lignes et colonnes fausses en rouge', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'yohaku',
				source: QUESTION,
				answer: ecrireReponse(['x+2', 'x+4', '2x+1']),
				status: 'incorrect',
				expected: [expected]
			}
		});
		const fausses = [...screen.container.querySelectorAll('.yohaku-faux')].map((e) =>
			e.getAttribute('data-yohaku-total')
		);
		expect(fausses).toEqual(['ligne-0', 'colonne-1']);
		expect(screen.container.textContent).not.toContain("D'autres remplissages");
	});
});
