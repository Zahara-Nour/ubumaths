/**
 * Somme de vecteurs à tracer à l'écran (chantier `docs/archive/wip/somme-vecteurs-progress.md`,
 * phase 0 validée le 2026-11-08) : flèches données, phrase nommée, pointillés.
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Courbe from '../Courbe.svelte';
import BuildAnswer from '$lib/components/questions/BuildAnswer.svelte';
import { parseCourbeContent } from '$lib/ubumark/parser/courbe-parser';

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

const WINDOW = ['x: -6 ; 6', 'y: -6 ; 6', 'grille: 1'];
const GIVEN = ['points: A(-2;-1), B(1;0), C(-1;2)', 'vecteurs: u = AB, v = AC'];
const SUM = 'tracer: vecteur u + v depuis A';

function node(...lines: string[]) {
	const parsed = parseCourbeContent(lines.join('\n'));
	if (!parsed.spec) throw new Error(parsed.errors.map((e) => e.message).join(' ; '));
	return parsed;
}

const locked = (value: string, isCorrect: boolean) => ({
	value,
	isCorrect,
	disabled: true,
	onChange: () => {}
});

describe('Vecteurs donnés — affichage', () => {
	it('deux flèches et leurs noms, hors question', async () => {
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, ...GIVEN) }
		});
		const root = screen.container;
		expect(root.querySelectorAll('.courbe-vecteur-donne')).toHaveLength(2);
		const names = [...root.querySelectorAll('.courbe-vecteur-nom')].map((t) => t.textContent);
		expect(names).toEqual(['u', 'v']);
	});

	it('dans la question : les flèches données, pas la somme', async () => {
		const screen = await render(Courbe, {
			target: mainElement(),
			props: {
				node: node(...WINDOW, ...GIVEN, SUM),
				answers: [{ value: '', isCorrect: null, disabled: false, onChange: () => {} }]
			}
		});
		const root = screen.container;
		expect(root.querySelectorAll('.courbe-vecteur-donne')).toHaveLength(2);
		expect(root.querySelectorAll('.courbe-fleche:not(.courbe-vecteur-donne)')).toHaveLength(0);
	});
});

describe('Somme à tracer — correction', () => {
	it('u⃗ seul : la phrase nommée, la flèche juste et deux côtés en pointillés', async () => {
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, ...GIVEN, SUM), answers: [locked('-2;-1/1;0', false)] }
		});
		const root = screen.container;
		const sentence = root.querySelector('p math-span')!.closest('p')!;
		expect(sentence.textContent).toMatch(/^Ta flèche représente\s+\S.*seul, pas\s+\S/);
		const correction = root.querySelector('.placer-correction')!;
		expect(correction.querySelectorAll('.courbe-trace.pointille')).toHaveLength(2);
		expect(correction.querySelectorAll('.courbe-fleche:not(.courbe-vecteur-donne)')).toHaveLength(
			1
		);
	});

	it('bonne réponse seule (BuildAnswer sans réponse) : la flèche juste et les pointillés', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'courbe',
				source: [...WINDOW, ...GIVEN, SUM].join('\n'),
				answer: null,
				status: 'solution'
			}
		});
		const root = screen.container;
		expect(root.querySelectorAll('.courbe-trace.pointille')).toHaveLength(2);
		expect(root.querySelectorAll('.courbe-vecteur-donne')).toHaveLength(2);
	});
});
