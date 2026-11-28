/**
 * Escalier à construire à l'écran (```courbe + `construire N`, outil 48,
 * `docs/wip/outil-escalier-suite-progress.md`)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Courbe from '../Courbe.svelte';
import FillBlanksInput from '#lib/components/question-inputs/FillBlanksInput.svelte';
import BuildAnswer from '#lib/components/questions/BuildAnswer.svelte';
import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
import type { QuestionTemplate } from '#lib/questions/types.ts';
import { templateMarkdown } from '#lib/ubumark/index.ts';
import { parseCourbeContent } from '#lib/ubumark/parser/courbe-parser.ts';
import { COURBE_PAD, courbeFrame } from '#lib/ubumark/utils/courbe-scene.ts';

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

const WINDOW = ['x: 0 ; 4', 'y: 0 ; 4'];
const RACINE = 'u(0) = 0 ; u(n+1) = sqrt(2*u(n)+3) pour n de 0 à 3 construire 3';
const SPIRALE = 'u(0) = 0 ; u(n+1) = -0.5*u(n)+3 pour n de 0 à 4 construire 4';

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

/** Coordonnées écran du point (x ; y) du repère (fenêtre 0..4 / 0..4, taille moyenne) */
function screenAt(root: Element, x: number, y: number) {
	const svg = zone(root).querySelector('svg')!;
	const rect = svg.getBoundingClientRect();
	const scale = rect.width / svg.viewBox.baseVal.width;
	const { width, height } = courbeFrame('moyenne');
	return {
		clientX: rect.left + (COURBE_PAD + (x / 4) * width) * scale,
		clientY: rect.top + (COURBE_PAD + ((4 - y) / 4) * height) * scale
	};
}

function tapAt(root: Element, x: number, y: number) {
	const init = { bubbles: true, ...screenAt(root, x, y), pointerId: 1 };
	zone(root).dispatchEvent(new PointerEvent('pointerdown', init));
	zone(root).dispatchEvent(new PointerEvent('pointerup', init));
}

const posed = (root: Element) => zone(root).querySelectorAll('circle.courbe-pose').length;
const strokes = (root: Element) => zone(root).querySelectorAll('line.courbe-trace').length;

function probes(count: number) {
	const values: string[] = Array.from({ length: count }, () => '');
	const answers = values.map((_, i) => ({
		get value() {
			return values[i];
		},
		isCorrect: null,
		disabled: false,
		onChange: (value: string) => {
			values[i] = value;
		}
	}));
	return { values, answers };
}

const locked = (value: string, isCorrect: boolean) => ({
	value,
	isCorrect,
	disabled: true,
	onChange: () => {}
});

describe('Escalier à construire — le dessin', () => {
	it('courbe, y = x, u₀ marqué ; jamais les vrais termes dans le DOM', async () => {
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, RACINE) }
		});
		const root = screen.container;
		const svg = zone(root).querySelector('svg')!;
		expect(svg.querySelectorAll('.courbe-relation').length).toBeGreaterThan(0);
		expect(svg.querySelectorAll('.courbe-diagonale')).toHaveLength(1);
		expect(svg.querySelectorAll('.courbe-depart')).toHaveLength(1);
		expect(svg.querySelectorAll('.courbe-escalier')).toHaveLength(0);
		expect([...svg.querySelectorAll('.courbe-rang')].map((t) => t.textContent)).toEqual(['u0']);
		expect(label(root, 'Terme u₁')).toBeDefined();
		expect(label(root, 'Terme u₃')).toBeDefined();
		// Rien de posé, rien de tracé : les vrais termes ne sont nulle part
		expect(posed(root)).toBe(0);
		expect(strokes(root)).toBe(0);
		expect(root.textContent).not.toMatch(/u₁ ≈|1,73/);
	});
});

describe('Escalier à construire — le geste', () => {
	it('toucher pose u₁ sur l’axe, la marche se dessine, puis u₂ ; les chaînes des cases', async () => {
		const { values, answers } = probes(3);
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, RACINE), answers }
		});
		const root = screen.container;
		// Hauteur indifférente : seule l'abscisse compte
		tapAt(root, 1.73, 2.5);
		await expect.poll(() => values[0]).toMatch(/^1\.7\d$/);
		await expect.poll(() => posed(root)).toBe(1);
		expect(strokes(root)).toBe(3);
		await expect.poll(() => label(root, 'Terme u₂')?.getAttribute('aria-pressed')).toBe('true');
		tapAt(root, 2.54, 0);
		await expect.poll(() => values[1]).toMatch(/^1\.7\d;2\.5\d$/);
		await expect.poll(() => strokes(root)).toBe(6);
		expect(values[2]).toMatch(/^1\.7\d;2\.5\d;$/);
	});

	it('u₂ posé sans u₁ : pas de marche (un terme absent arrête le dessin)', async () => {
		const { values, answers } = probes(3);
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, RACINE), answers }
		});
		const root = screen.container;
		label(root, 'Terme u₂')!.click();
		tapAt(root, 2.5, 0);
		await expect.poll(() => values[1]).toBe(';2.5');
		expect(values[0]).toBe('');
		expect(strokes(root)).toBe(0);
	});

	it('spirale : même geste', async () => {
		const { values, answers } = probes(4);
		const screen = await render(Courbe, {
			target: mainElement(),
			props: { node: node(...WINDOW, SPIRALE), answers }
		});
		const root = screen.container;
		tapAt(root, 3, 0);
		tapAt(root, 1.5, 0);
		await expect.poll(() => values[1]).toBe('3;1.5');
		await expect.poll(() => strokes(root)).toBe(6);
	});
});

describe('Escalier à construire — correction', () => {
	it('u₁ faux : la phrase, le vrai escalier en vert ; u₂ juste depuis le u₁ de l’élève', async () => {
		const screen = await render(Courbe, {
			target: mainElement(),
			props: {
				node: node(...WINDOW, RACINE),
				answers: [locked('1', false), locked('1;2.24', true), locked('1;2.24;', false)]
			}
		});
		const root = screen.container;
		expect(root.textContent).toContain('Depuis u₀, la construction mène à u₁ ≈ 1,73.');
		expect(root.textContent).toContain('Il faut placer u₃.');
		expect(root.textContent).not.toContain('mène à u₂');
		expect(root.querySelector('.construire-faux')).not.toBeNull();
		const correction = root.querySelector('.construire-correction')!;
		expect(correction.querySelectorAll('line.courbe-trace')).toHaveLength(9);
		// Les étiquettes ne servent plus (cases verrouillées)
		expect(label(root, 'Terme u₁')?.disabled).toBe(true);
	});

	it('tout juste : cadre vert, pas de correction', async () => {
		const screen = await render(Courbe, {
			target: mainElement(),
			props: {
				node: node(...WINDOW, RACINE),
				answers: [locked('1.73', true), locked('1.73;2.54', true), locked('1.73;2.54;2.84', true)]
			}
		});
		expect(screen.container.querySelector('.construire-correction')).toBeNull();
		expect(screen.container.querySelector('.construire-juste')).not.toBeNull();
	});

	it('bonne réponse seule (BuildAnswer sans réponse) : le vrai escalier, sans geste', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'courbe',
				source: [...WINDOW, RACINE].join('\n'),
				answer: null,
				status: 'solution'
			}
		});
		const root = screen.container;
		expect(root.querySelectorAll('line.courbe-trace')).toHaveLength(9);
		expect(root.querySelector('[role="slider"]')).toBeNull();
	});
});

describe('Escalier à construire — décor de la prod', () => {
	it('la question générée remplit ses cases', async () => {
		const generated = generateInstance(
			{
				id: 'test-escalier',
				title: 'Escalier',
				status: 'draft',
				variations: [
					{
						statement: templateMarkdown(
							['Construis u₁, u₂ et u₃.', '', '```courbe', ...WINDOW, RACINE, '```'].join('\n')
						)
					}
				],
				grades: ['T_SPE'],
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
		tapAt(root, 1.73, 0);
		await expect.poll(() => values[0]).toMatch(/^1\.7\d$/);
		tapAt(root, 2.54, 0);
		await expect.poll(() => values[1]).toMatch(/^1\.7\d;2\.5\d$/);
	});
});
