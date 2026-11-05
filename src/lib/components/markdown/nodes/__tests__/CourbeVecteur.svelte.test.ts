/**
 * Vecteur à tracer à l'écran (chantier `docs/archive/wip/points-repere-progress.md` § 3 et § 10, lot 3)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Courbe from '../Courbe.svelte';
import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
import BuildAnswer from '$lib/components/questions/BuildAnswer.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';
import { parseCourbeContent } from '$lib/ubumark/parser/courbe-parser';
import { COURBE_PAD, courbeFrame } from '$lib/ubumark/utils/courbe-scene';

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

const WINDOW = ['x: -5 ; 5', 'y: -4 ; 4', 'grille: 1'];
const VECTEUR = 'tracer: vecteur (3 ; -2)';
const IMPOSED = ['points: A(-1;2)', 'tracer: vecteur u = (3 ; -2) depuis A'];

function node(...lines: string[]) {
	const parsed = parseCourbeContent(lines.join('\n'));
	if (!parsed.spec) throw new Error(parsed.errors.map((e) => e.message).join(' ; '));
	return parsed;
}

const zone = (root: Element) => root.querySelector<HTMLElement>('[role="slider"]')!;
const label = (root: Element, name: string) =>
	[...root.querySelectorAll<HTMLButtonElement>('button')].find(
		(b) => b.getAttribute('aria-label') === name
	);

/** Coordonnées écran du point (x ; y) du repère (fenêtre -5..5 / -4..4, taille moyenne) */
function screenAt(root: Element, x: number, y: number) {
	const svg = zone(root).querySelector('svg')!;
	const rect = svg.getBoundingClientRect();
	const scale = rect.width / svg.viewBox.baseVal.width;
	const { width, height } = courbeFrame('moyenne');
	return {
		clientX: rect.left + (COURBE_PAD + ((x + 5) / 10) * width) * scale,
		clientY: rect.top + (COURBE_PAD + ((4 - y) / 8) * height) * scale
	};
}

function tapAt(root: Element, x: number, y: number) {
	const init = { bubbles: true, ...screenAt(root, x, y), pointerId: 1 };
	zone(root).dispatchEvent(new PointerEvent('pointerdown', init));
	zone(root).dispatchEvent(new PointerEvent('pointerup', init));
}

const posed = (root: Element) => zone(root).querySelectorAll('circle.courbe-pose').length;
const arrows = (root: Element) => zone(root).querySelectorAll('.courbe-fleche').length;

function answerProbe(initial = '') {
	const probe = { value: initial };
	return {
		probe,
		answer: () => ({
			value: probe.value,
			isCorrect: null,
			disabled: false,
			onChange: (value: string) => {
				probe.value = value;
			}
		})
	};
}

const locked = (value: string, isCorrect: boolean) => ({
	value,
	isCorrect,
	disabled: true,
	onChange: () => {}
});

describe('Vecteur à tracer — le geste', () => {
	it('origine puis extrémité : la case reçoit x1;y1/x2;y2, la flèche se dessine', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, VECTEUR), answers: [answer()] }
		});
		const root = screen.container;
		expect(label(root, 'Origine')).toBeDefined();
		expect(label(root, 'Extrémité')).toBeDefined();
		tapAt(root, 0, 0);
		await expect.poll(() => probe.value).toBe('0;0/');
		expect(arrows(root)).toBe(0);
		await expect.poll(() => label(root, 'Extrémité')?.getAttribute('aria-pressed')).toBe('true');
		tapAt(root, 3, -2);
		await expect.poll(() => probe.value).toBe('0;0/3;-2');
		await expect.poll(() => arrows(root)).toBe(1);
		// La pointe n'est pas cachée : seul le disque de l'origine reste
		expect(posed(root)).toBe(1);
		expect(zone(root).getAttribute('aria-valuetext')).toBe('extrémité en (3 ; -2)');
	});

	it('origine imposée : A ne bouge pas, aucune étiquette, la case commence par A', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, ...IMPOSED), answers: [answer()] }
		});
		const root = screen.container;
		// Seule l'extrémité bouge : une étiquette seule ne choisirait rien
		expect(label(root, 'Origine')).toBeUndefined();
		expect(label(root, 'Extrémité')).toBeUndefined();
		// Toucher A ne le reprend pas : c'est l'extrémité qui s'y pose
		tapAt(root, -1, 2);
		await expect.poll(() => probe.value).toBe('-1;2/-1;2');
		tapAt(root, 2, 0);
		await expect.poll(() => probe.value).toBe('-1;2/2;0');
		await expect.poll(() => arrows(root)).toBe(1);
		// A est dessiné par points: ; l'extrémité, sous la pointe, n'a pas de disque
		expect(posed(root)).toBe(0);
	});

	it('jamais les coordonnées dans le DOM ni dans le dessin avant la correction', async () => {
		const withVector = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, VECTEUR) }
		});
		const without = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW) }
		});
		const svgOf = (root: Element) => root.querySelector('svg')!.innerHTML;
		expect(svgOf(withVector.container)).toBe(svgOf(without.container));
	});
});

describe('Vecteur à tracer — correction', () => {
	it('sens inversé : la phrase, la flèche juste en vert depuis l’origine de l’élève', async () => {
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, VECTEUR), answers: [locked('1;1/-2;3', false)] }
		});
		const root = screen.container;
		expect(root.textContent).toContain(
			'Ta flèche va dans le mauvais sens : elle représente le vecteur (-3 ; 2).'
		);
		const solution = root.querySelectorAll<SVGLineElement>('.placer-correction .courbe-fleche');
		expect(solution).toHaveLength(1);
		expect(root.querySelector('.placer-faux')).not.toBeNull();
	});

	it('nommé : le nom en formule dans la phrase', async () => {
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, ...IMPOSED), answers: [locked('-1;2/0;3', false)] }
		});
		const root = screen.container;
		const sentence = root.querySelector('p math-span')!.closest('p')!;
		// Une espace entre le texte et la formule (« pas u⃗ », jamais « pasu⃗ »)
		expect(sentence.textContent).toMatch(/^Ta flèche représente le vecteur \(1 ; 1\), pas\s+\S/);
	});

	it('extrémité manquante (origine imposée) : la phrase dédiée', async () => {
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, ...IMPOSED), answers: [locked('-1;2/', false)] }
		});
		expect(screen.container.textContent).toContain('Il faut placer l’extrémité.');
	});

	it('masqué (évaluation notée) : ni phrase ni flèche juste ; A reste fixe', async () => {
		const screen = await render(Courbe, {
			target: mainElement(),
			props: {
				node: node(...WINDOW, 'points: A(-1;2)', 'tracer: vecteur u = ? depuis A'),
				answers: [locked('-1;2/0;3', false)]
			}
		});
		const root = screen.container;
		expect(root.textContent).not.toContain('Ta flèche');
		expect(root.querySelectorAll('.placer-correction .courbe-fleche')).toHaveLength(0);
	});

	it('juste : cadre vert, pas de correction', async () => {
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, VECTEUR), answers: [locked('-4;3/-1;1', true)] }
		});
		expect(screen.container.querySelector('.placer-correction')).toBeNull();
		expect(screen.container.querySelector('.placer-juste')).not.toBeNull();
	});

	it('bonne réponse seule (BuildAnswer sans réponse) : la flèche juste', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'courbe',
				source: [...WINDOW, ...IMPOSED].join('\n'),
				answer: null,
				status: 'solution'
			}
		});
		const root = screen.container;
		expect(root.querySelectorAll('.courbe-fleche')).toHaveLength(1);
		expect(root.querySelector('[role="slider"]')).toBeNull();
	});

	it('copie corrigée (BuildAnswer) : la flèche de l’élève, la phrase', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'courbe',
				source: [...WINDOW, VECTEUR].join('\n'),
				answer: '0;0/2;1',
				status: 'incorrect'
			}
		});
		const root = screen.container;
		expect(root.textContent).toContain('Ta flèche représente le vecteur (2 ; 1), pas (3 ; -2).');
		expect(label(root, 'Origine')).toBeUndefined();
	});
});

describe('Vecteur à tracer — décor de la prod', () => {
	it('la question générée remplit sa case', async () => {
		const generated = generateInstance(
			{
				id: 'test-vecteur',
				title: 'Vecteur',
				status: 'draft',
				variations: [
					{
						statement: templateMarkdown(
							['Trace le vecteur.', '', '```courbe', ...WINDOW, VECTEUR, '```'].join('\n')
						)
					}
				],
				grades: ['2'],
				level: 1
			} as QuestionTemplate,
			42
		);
		if (!generated.success) throw new Error(generated.errors.join(' ; '));
		const values: string[] = [];
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: {
				statement: generated.instance.statement,
				blanks: generated.instance.blanks ?? [],
				values,
				validationResults: []
			}
		});
		const root = screen.container;
		tapAt(root, 0, 0);
		tapAt(root, 3, -2);
		await expect.poll(() => values[0]).toBe('0;0/3;-2');
	});
});
