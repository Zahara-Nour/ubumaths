/**
 * Labyrinthe à parcourir à l'écran (chantier `docs/wip/labyrinthe-progress.md`, PR 1)
 *
 * Phase 0 : l'élève touche l'entrée, puis une case voisine de la dernière ; toucher la
 * dernière l'efface ; réponse = le chemin en texte ; après la validation, le chemin vert ou
 * rouge, la case fautive, le bon chemin cerclé ; corrigé = « Sortie N : … ».
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import Labyrinthe from '../Labyrinthe.svelte';
import FillBlanksInput from '#lib/components/question-inputs/FillBlanksInput.svelte';
import BuildAnswer from '#lib/components/questions/BuildAnswer.svelte';
import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
import { templateMarkdown } from '#lib/ubumark/index.ts';
import type { QuestionTemplate } from '#lib/questions/types.ts';
import { parseLabyrintheContent } from '#lib/ubumark/parser/labyrinthe-parser.ts';
import {
	cheminDit,
	ecrireChemin,
	expectedLabyrintheAnswer
} from '#lib/ubumark/utils/labyrinthe-answer.ts';
import type { Case } from '#lib/ubumark/types/labyrinthe.ts';

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
	'grille: 5 x 4',
	'règle: premier',
	'parcourir: oui',
	'graine: 11',
	'case: 0'
].join('\n');
const node = parseLabyrintheContent(QUESTION);
const spec = node.spec!;

/** Le bouton d'une case */
const caseDe = (c: Case) =>
	page.getByRole('button', { name: new RegExp(`^ligne ${c.ligne}, colonne ${c.col} :`) });

/** Une case hors du chemin, voisine de l'entrée */
function intrusVoisinDeLEntree(): Case {
	const [debut] = spec.chemin;
	return [
		{ ligne: debut.ligne - 1, col: 1 },
		{ ligne: debut.ligne + 1, col: 1 },
		{ ligne: debut.ligne, col: 2 }
	].find(
		(c) =>
			c.ligne >= 1 &&
			c.ligne <= spec.lignes &&
			!spec.chemin.some((p) => p.ligne === c.ligne && p.col === c.col)
	)!;
}

describe('labyrinthe à parcourir : le geste', () => {
	it('l’entrée d’abord, puis une case voisine ; une case lointaine ne répond pas', async () => {
		await render(Labyrinthe, { target: mainElement(), props: { node } });
		const [debut, deuxieme] = spec.chemin;
		await expect.element(page.getByText('Touche l’entrée pour commencer.')).toBeVisible();
		// Une case loin de l'entrée : rien
		await caseDe({ ligne: debut.ligne, col: spec.colonnes }).click({ force: true });
		await expect.element(caseDe(debut)).toHaveAttribute('aria-pressed', 'false');
		await caseDe(debut).click();
		await expect.element(caseDe(debut)).toHaveAttribute('aria-pressed', 'true');
		await caseDe(deuxieme).click();
		await expect.element(caseDe(deuxieme)).toHaveAttribute('aria-pressed', 'true');
		await expect.element(page.getByText('2 cases dans ton chemin.')).toBeVisible();
	});

	it('toucher la dernière case l’efface ; « Tout effacer »', async () => {
		await render(Labyrinthe, { target: mainElement(), props: { node } });
		const [debut, deuxieme] = spec.chemin;
		await caseDe(debut).click();
		await caseDe(deuxieme).click();
		await caseDe(deuxieme).click();
		await expect.element(caseDe(deuxieme)).toHaveAttribute('aria-pressed', 'false');
		await expect.element(caseDe(debut)).toHaveAttribute('aria-pressed', 'true');
		await page.getByRole('button', { name: 'Tout effacer' }).click();
		await expect.element(caseDe(debut)).toHaveAttribute('aria-pressed', 'false');
	});

	it('une case déjà prise ne se reprend pas (seule la dernière s’efface)', async () => {
		await render(Labyrinthe, { target: mainElement(), props: { node } });
		const [debut, deuxieme] = spec.chemin;
		await caseDe(debut).click();
		await caseDe(deuxieme).click();
		await caseDe(debut).click({ force: true });
		await expect.element(caseDe(debut)).toHaveAttribute('aria-pressed', 'true');
		await expect.element(caseDe(deuxieme)).toHaveAttribute('aria-pressed', 'true');
	});

	it('sans parcourir: la grille seule, aucun bouton ; solution: oui teinte le chemin', async () => {
		const affichage = parseLabyrintheContent('grille: 5 x 4\nrègle: premier\ngraine: 11');
		const screen = await render(Labyrinthe, { target: mainElement(), props: { node: affichage } });
		expect(screen.container.querySelectorAll('button')).toHaveLength(0);
		expect(screen.container.querySelectorAll('.labyrinthe-case')).toHaveLength(20);
		const solution = parseLabyrintheContent(
			'grille: 5 x 4\nrègle: premier\ngraine: 11\nsolution: oui'
		);
		const autre = await render(Labyrinthe, { target: mainElement(), props: { node: solution } });
		expect(autre.container.querySelectorAll('.labyrinthe-pris')).toHaveLength(
			solution.spec!.chemin.length
		);
	});

	it('bloc en erreur, erreurs montrées : la liste pour l’auteur', async () => {
		await render(Labyrinthe, {
			target: mainElement(),
			props: { node: parseLabyrintheContent('grille: 9 x 4\nrègle: premier'), showErrors: true }
		});
		await expect.element(page.getByText('Bloc labyrinthe : question non affichée')).toBeVisible();
	});
});

describe('labyrinthe à parcourir : dans la question (FillBlanksInput)', () => {
	it('le bon chemin touché case par case devient la réponse ; « Sortie N atteinte. »', async () => {
		const generated = generateInstance(
			{
				id: 'test-labyrinthe',
				title: 'Labyrinthe',
				status: 'draft',
				variations: [
					{
						statement: templateMarkdown(
							[
								'Trouve la sortie.',
								'',
								'```labyrinthe',
								'grille: 5 x 4',
								'règle: multiple de 3',
								'parcourir: oui',
								'```'
							].join('\n')
						)
					}
				],
				grades: ['6'],
				level: 1
			} as QuestionTemplate,
			42
		);
		if (!generated.success) throw new Error(generated.errors.join(' ; '));
		const corps = generated.instance.statement.split('```labyrinthe\n')[1].split('\n```')[0];
		const chemin = parseLabyrintheContent(corps).spec!.chemin;
		const props = $state({
			statement: generated.instance.statement,
			blanks: generated.instance.blanks ?? [],
			values: [] as string[],
			validationResults: []
		});
		await render(FillBlanksInput, { target: mainElement(), props });
		for (const c of chemin) await caseDe(c).click();
		expect(props.values[0]).toBe(ecrireChemin(chemin));
		const fin = chemin[chemin.length - 1];
		await expect.element(page.getByText(`Sortie ${fin.ligne} atteinte.`)).toBeVisible();
	});
});

describe('labyrinthe à parcourir : après la validation', () => {
	const expected = expectedLabyrintheAnswer(spec);

	it('faux : verrouillé, la case fautive en rouge, le bon chemin cerclé', async () => {
		const intrus = intrusVoisinDeLEntree();
		const answer = {
			value: ecrireChemin([spec.chemin[0], intrus]),
			isCorrect: false,
			disabled: false,
			onChange: () => {}
		};
		const screen = await render(Labyrinthe, {
			target: mainElement(),
			props: { node, answer, expected }
		});
		const fautives = screen.container.querySelectorAll('.labyrinthe-fautive');
		expect(fautives).toHaveLength(1);
		expect(fautives[0].getAttribute('data-labyrinthe-case')).toBe(`${intrus.ligne},${intrus.col}`);
		expect(screen.container.querySelectorAll('.labyrinthe-attendu')).toHaveLength(
			spec.chemin.length
		);
		expect(screen.container.querySelectorAll('.labyrinthe-touchable')).toHaveLength(0);
		expect(page.getByRole('button', { name: 'Tout effacer' }).elements()).toHaveLength(0);
	});

	it('juste : le chemin en vert, sans pointillés', async () => {
		const answer = {
			value: ecrireChemin(spec.chemin),
			isCorrect: true,
			disabled: false,
			onChange: () => {}
		};
		const screen = await render(Labyrinthe, {
			target: mainElement(),
			props: { node, answer, expected }
		});
		expect(screen.container.querySelector('.labyrinthe-juste')).not.toBeNull();
		expect(screen.container.querySelectorAll('.labyrinthe-attendu')).toHaveLength(0);
	});

	it('bonne réponse affichée (BuildAnswer, sans réponse) : le chemin et sa sortie', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'labyrinthe',
				source: QUESTION,
				answer: null,
				status: 'solution',
				expected: [expected]
			}
		});
		expect(screen.container.querySelectorAll('.labyrinthe-pris')).toHaveLength(spec.chemin.length);
		expect(screen.container.textContent).toContain(`Le bon chemin : ${cheminDit(spec)}`);
	});
});
