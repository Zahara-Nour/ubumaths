/**
 * Assemblage de cubes à geste à l'écran (```cubes + `dessiner:` / `retrouver:`,
 * chantier `solides`, `docs/archive/wip/solides-progress.md` § 7) : colorier une vue,
 * écrire les hauteurs, noms accessibles, correction.
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import CubesGeste from '../CubesGeste.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import FillBlanksInput from '$lib/components/question-inputs/FillBlanksInput.svelte';
import BuildAnswer from '$lib/components/questions/BuildAnswer.svelte';
import { parseEspaceContent } from '$lib/ubumark/parser/espace-parser';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { templateMarkdown, type ResolvedMarkdown } from '$lib/ubumark';
import type { QuestionTemplate } from '$lib/questions/types';

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

const node = (...lines: string[]) => parseEspaceContent(lines.join('\n'));

const tiles = (root: Element) => [
	...root.querySelectorAll<SVGRectElement>('.cubes-quadrillage [role="button"]')
];
const colored = (root: Element) =>
	tiles(root).filter((t) => t.getAttribute('aria-pressed') === 'true');
const heightInputs = (root: Element) => [
	...root.querySelectorAll<HTMLInputElement>('.cubes-saisie input')
];

function answerProbe(initial = '') {
	const probe = { value: initial, changes: [] as string[] };
	return {
		probe,
		answer: () => ({
			value: probe.value,
			isCorrect: null,
			disabled: false,
			onChange: (value: string) => {
				probe.value = value;
				probe.changes.push(value);
			}
		})
	};
}

const locked = (value: string, isCorrect: boolean | null) => ({
	value,
	isCorrect,
	disabled: true,
	onChange: () => {}
});

describe('dessiner: — colorier la vue', () => {
	const face = () => node('hauteurs: 2 1 1 / 1 0 1', 'dessiner: face');

	it('la perspective et un quadrillage vide agrandi d’un carreau (5 × 4)', async () => {
		const screen = await render(CubesGeste, {
			target: mainElement(),
			props: { node: face(), answer: answerProbe().answer() }
		});
		const root = screen.container;
		expect(root.querySelector('[aria-label="Assemblage de cubes en perspective"]')).not.toBeNull();
		expect(tiles(root)).toHaveLength(20);
		expect(colored(root)).toHaveLength(0);
		expect(root.textContent).toContain('Vue de face');
	});

	it('toucher un carreau le colorie, le retoucher l’efface', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(CubesGeste, {
			target: mainElement(),
			props: { node: face(), answer: answer() }
		});
		const root = screen.container;
		// rangée 2, colonne 2 : rang 7 (5 carreaux par rangée)
		await userEvent.click(tiles(root)[6]);
		await expect.poll(() => probe.value).toBe('00000/01000/00000/00000');
		await userEvent.click(tiles(root)[6]);
		await expect.poll(() => probe.value).toBe('');
	});

	it('chaque carreau est un bouton à bascule « Carreau rangée R, colonne C »', async () => {
		const screen = await render(CubesGeste, {
			target: mainElement(),
			props: { node: face(), answer: answerProbe('00000/01000/00000/00000').answer() }
		});
		const tile = tiles(screen.container)[6];
		expect(tile.getAttribute('aria-label')).toBe('Carreau rangée 2, colonne 2, colorié');
		expect(tile.getAttribute('aria-pressed')).toBe('true');
	});

	it('Espace ou Entrée basculent un carreau', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(CubesGeste, {
			target: mainElement(),
			props: { node: face(), answer: answer() }
		});
		tiles(screen.container)[0].focus();
		await userEvent.keyboard(' ');
		await expect.poll(() => probe.value).toBe('10000/00000/00000/00000');
	});

	it('faux : la phrase et la vue juste', async () => {
		const screen = await render(CubesGeste, {
			target: mainElement(),
			props: { node: face(), answer: locked('00000/01100/00000/00000', false) }
		});
		const root = screen.container;
		expect(root.textContent).toContain('Ce n’est pas la vue de face de l’assemblage.');
		expect(
			root.querySelector('.cubes-correction [aria-label="Vue de face d’un assemblage de cubes"]')
		).not.toBeNull();
		expect(colored(root)).toHaveLength(2);
		expect(tiles(root)[0].getAttribute('aria-disabled')).toBe('true');
	});

	it('juste : cadre vert, pas de correction', async () => {
		const screen = await render(CubesGeste, {
			target: mainElement(),
			props: { node: face(), answer: locked('00000/01000/01110/00000', true) }
		});
		expect(screen.container.querySelector('.placer-juste')).not.toBeNull();
		expect(screen.container.querySelector('.cubes-correction')).toBeNull();
	});
});

describe('retrouver: — écrire les hauteurs', () => {
	const retrouver = () => node('hauteurs: 2 1 1 / 1 0 1', 'retrouver: face, droite');

	it('pas de perspective ; les vues données ; une case par carreau de la vue de dessus', async () => {
		const screen = await render(CubesGeste, {
			target: mainElement(),
			props: { node: retrouver(), answer: answerProbe().answer() }
		});
		const root = screen.container;
		expect(root.querySelector('[aria-label="Assemblage de cubes en perspective"]')).toBeNull();
		expect(
			root.querySelector('[aria-label="Vue de face d’un assemblage de cubes"]')
		).not.toBeNull();
		expect(
			root.querySelector('[aria-label="Vue de droite d’un assemblage de cubes"]')
		).not.toBeNull();
		// 5 carreaux sur la vue de dessus (le trou n'a pas de case)
		expect(heightInputs(root)).toHaveLength(5);
		expect(root.textContent).toContain('Vue de dessus');
	});

	it('écrire une hauteur : la réponse suit, - pour une case vide', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(CubesGeste, {
			target: mainElement(),
			props: { node: retrouver(), answer: answer() }
		});
		const inputs = heightInputs(screen.container);
		await userEvent.fill(inputs[0], '2');
		await expect.poll(() => probe.value).toBe('2 - - / - 0 -');
		await userEvent.fill(inputs[0], '');
		await expect.poll(() => probe.value).toBe('');
	});

	it('un caractère refusé (7, lettre) est effacé de la case : affiché = jugé', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(CubesGeste, {
			target: mainElement(),
			props: { node: retrouver(), answer: answer() }
		});
		const inputs = heightInputs(screen.container);
		await userEvent.fill(inputs[0], '2');
		await userEvent.fill(inputs[1], '7');
		await expect.poll(() => probe.value).toBe('2 - - / - 0 -');
		await expect.poll(() => inputs[1].value).toBe('');
	});

	it('cases nommées par rangée et colonne', async () => {
		const screen = await render(CubesGeste, {
			target: mainElement(),
			props: { node: retrouver(), answer: answerProbe().answer() }
		});
		expect(heightInputs(screen.container)[0].getAttribute('aria-label')).toBe(
			'Nombre de cubes, rangée 1 (au fond), colonne 1'
		);
	});

	it('faux : une phrase par vue fausse, une solution, « d’autres réponses justes »', async () => {
		const screen = await render(CubesGeste, {
			target: mainElement(),
			props: {
				node: node('hauteurs: 2 1 / 1 2', 'retrouver: face, droite'),
				answer: locked('2 2 / 1 1', false)
			}
		});
		const root = screen.container;
		expect(root.textContent).toContain('Ton assemblage n’a pas la même vue de droite.');
		expect(root.textContent).toContain('Il y a d’autres réponses justes.');
		const solution = [...root.querySelectorAll('.cubes-correction .cubes-saisie-case')].map((c) =>
			c.textContent?.trim()
		);
		expect(solution).toEqual(['2', '1', '1', '2']);
	});
});

describe('hors question, dans une question, dans la copie corrigée', () => {
	it('hors question (cours, aperçu) : le geste, rien de jugé', async () => {
		const screen = await render(MarkdownRenderer, {
			target: mainElement(),
			props: {
				content: ['```cubes', 'hauteurs: 2 1', 'dessiner: face', '```'].join(
					'\n'
				) as ResolvedMarkdown
			}
		});
		expect(tiles(screen.container).length).toBeGreaterThan(0);
		expect(screen.container.textContent).not.toContain('Correction');
	});

	it('décor de la prod : la question générée remplit sa case', async () => {
		const generated = generateInstance(
			{
				id: 'test-cubes',
				title: 'Cubes',
				status: 'draft',
				variations: [
					{
						statement: templateMarkdown(
							['Colorie.', '', '```cubes', 'hauteurs: 2 1', 'dessiner: face', '```'].join('\n')
						)
					}
				],
				grades: ['6'],
				theme: 'Test',
				domain: 'Test',
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
		await userEvent.click(tiles(screen.container)[0]);
		// vue de face de 2 1 : 2 × 2, quadrillage 4 × 4
		await expect.poll(() => values[0]).toBe('1000/0000/0000/0000');
	});

	it('copie corrigée (BuildAnswer) : le quadrillage de l’élève, verrouillé', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'cubes',
				source: 'hauteurs: 2 1\ndessiner: face',
				answer: '0000/0110/0000/0000',
				status: 'incorrect'
			}
		});
		const root = screen.container;
		expect(colored(root)).toHaveLength(2);
		expect(tiles(root)[0].getAttribute('aria-disabled')).toBe('true');
		expect(root.textContent).toContain('Ce n’est pas la vue de face');
	});

	it('copie sans réponse (verso) : la vue juste, sans geste', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'cubes',
				source: 'hauteurs: 2 1\ndessiner: face',
				answer: null,
				status: 'solution'
			}
		});
		const root = screen.container;
		expect(colored(root)).toHaveLength(3);
		expect(root.querySelector('[role="button"]:not([aria-disabled="true"])')).toBeNull();
	});

	it('copie sans réponse, retrouver: : les hauteurs du bloc', async () => {
		const screen = await render(BuildAnswer, {
			target: mainElement(),
			props: {
				kind: 'cubes',
				source: 'hauteurs: 2 1\nretrouver: face',
				answer: null,
				status: 'solution'
			}
		});
		const cells = [...screen.container.querySelectorAll('.cubes-saisie-case')].map((c) =>
			c.textContent?.trim()
		);
		expect(cells).toEqual(['2', '1']);
		expect(heightInputs(screen.container)).toHaveLength(0);
	});
});
