/**
 * Bloc ```operation à l'écran (phase 0 : `docs/wip/operations-posees-progress.md` § 3)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import Operation from '../Operation.svelte';
import MarkdownRenderer from '../../MarkdownRenderer.svelte';
import { parseOperationContent } from '$lib/ubumark/parser/operation-parser';
import { OPERATION_ARIA_LABEL, OPERATION_UNAVAILABLE } from '$lib/ubumark/types/operation';
import type { ResolvedMarkdown } from '$lib/ubumark';

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

const node = (...lines: string[]) => parseOperationContent(lines.join('\n'));
const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, '');

describe('Operation — grille', () => {
	it('à remplir : termes et signe écrits, ni résultat ni retenue dans le DOM', async () => {
		const screen = await render(Operation, {
			target: mainElement(),
			props: { node: node('calcul: 45 + 37') }
		});
		const grid = screen.container.querySelector('[role="group"]')!;
		expect(grid.getAttribute('aria-label')).toBe(OPERATION_ARIA_LABEL);
		expect(text(grid)).toBe('45+37');
		expect(screen.container.innerHTML).not.toMatch(/data-|title=/);
		// 3 cases de résultat, 2 cases de retenue
		expect(screen.container.querySelectorAll('.operation-case')).toHaveLength(3);
		expect(screen.container.querySelectorAll('.operation-case-petite')).toHaveLength(2);
	});

	it('résolue : résultat et retenue écrits', async () => {
		const screen = await render(Operation, {
			target: mainElement(),
			props: { node: node('calcul: 45 + 37', 'cases: aucune') }
		});
		expect(text(screen.container)).toBe('145+3782');
	});

	it('décimaux : une virgule par nombre décimal, carreaux alignés', async () => {
		const screen = await render(Operation, {
			target: mainElement(),
			props: { node: node('calcul: 56,75 + 234 + 0,8', 'cases: aucune', 'retenues: non') }
		});
		expect(screen.container.querySelectorAll('.operation-virgule')).toHaveLength(3);
		const cells = [...screen.container.querySelectorAll('.operation-carreau')];
		const widths = new Set(cells.map((c) => Math.round(c.getBoundingClientRect().width)));
		expect(widths.size).toBe(1);
	});

	it('cassage : chiffres barrés', async () => {
		const screen = await render(Operation, {
			target: mainElement(),
			props: { node: node('calcul: 302 - 7', 'méthode: cassage', 'cases: aucune') }
		});
		expect(screen.container.querySelectorAll('.operation-barre')).toHaveLength(3);
	});

	it('jamais plus large que le conteneur (téléphone, 10 chiffres)', async () => {
		const main = mainElement();
		main.style.width = '320px';
		const screen = await render(Operation, {
			target: main,
			props: { node: node('calcul: 9999999999 + 9999999999') }
		});
		const grid = screen.container.querySelector('.operation-grille')!;
		expect(grid.getBoundingClientRect().width).toBeLessThanOrEqual(320);
	});
});

describe('Operation — bloc en erreur', () => {
	it('élève : cadre neutre ; prof : messages situés', async () => {
		const eleve = await render(Operation, {
			target: mainElement(),
			props: { node: node('calcul: 3 - 5') }
		});
		expect(eleve.container.textContent).toContain(OPERATION_UNAVAILABLE);
		const prof = await render(Operation, {
			target: mainElement(),
			props: { node: node('calcul: 3 - 5'), showErrors: true }
		});
		expect(prof.container.textContent).toContain('résultat négatif');
	});

	it('via MarkdownRenderer, en item de liste', async () => {
		const content =
			'a) Calcule.\n\n   ```operation\n   calcul: 45 + 37\n   ```' as ResolvedMarkdown;
		const screen = await render(MarkdownRenderer, { target: mainElement(), props: { content } });
		expect(screen.container.querySelector('.operation-grille')).not.toBeNull();
	});
});

// Case d'une question (PR 1b, docs/wip/operations-posees-progress.md § 9)
describe('Operation — saisie (case d’une question)', () => {
	type Answer = {
		value: string;
		isCorrect: boolean | null;
		disabled: boolean;
		onChange: (value: string) => void;
		onSubmit?: () => void;
	};

	async function renderAnswer(lines: string[], answer: Partial<Answer> = {}) {
		const changes: string[] = [];
		const screen = await render(Operation, {
			target: mainElement(),
			props: {
				node: node('case: 0', ...lines),
				answer: {
					value: '',
					isCorrect: null,
					disabled: false,
					onChange: (value: string) => changes.push(value),
					...answer
				}
			}
		});
		const cells = () => [
			...screen.container.querySelectorAll<HTMLInputElement>(
				'input[data-operation-cell="résultat"]'
			)
		];
		const helpers = () => [
			...screen.container.querySelectorAll<HTMLInputElement>('input[data-operation-cell="aide"]')
		];
		return { screen, cells, helpers, changes };
	}

	it('de droite à gauche : le curseur passe à gauche, la réponse est lue (comportements 3-4)', async () => {
		const { cells, changes } = await renderAnswer(['calcul: 45 + 37']);
		expect(cells()).toHaveLength(3);
		await userEvent.click(cells()[2]);
		await userEvent.keyboard('2');
		expect(document.activeElement).toBe(cells()[1]);
		await userEvent.keyboard('8');
		expect(document.activeElement).toBe(cells()[0]);
		expect(changes.at(-1)).toBe('82');
	});

	it('une touche autre qu’un chiffre est ignorée (comportement 15)', async () => {
		const { cells, changes } = await renderAnswer(['calcul: 45 + 37']);
		await userEvent.click(cells()[2]);
		await userEvent.keyboard('a');
		expect(cells()[2].value).toBe('');
		expect(document.activeElement).toBe(cells()[2]);
		expect(changes.every((v) => v === '')).toBe(true);
	});

	it('effacer : case vide → on revient effacer celle de droite (comportement 3)', async () => {
		const { cells, changes } = await renderAnswer(['calcul: 45 + 37']);
		await userEvent.click(cells()[2]);
		await userEvent.keyboard('2');
		await userEvent.keyboard('{Backspace}');
		expect(document.activeElement).toBe(cells()[2]);
		expect(cells()[2].value).toBe('');
		expect(changes.at(-1)).toBe('');
	});

	it('Entrée : demande la validation', async () => {
		let submitted = 0;
		const { cells } = await renderAnswer(['calcul: 45 + 37'], { onSubmit: () => submitted++ });
		await userEvent.click(cells()[2]);
		await userEvent.keyboard('{Enter}');
		expect(submitted).toBe(1);
	});

	it('aucune valeur attendue dans le DOM ; noms accessibles par rang (comportement 16)', async () => {
		const { screen, cells, helpers } = await renderAnswer(['calcul: 45 + 37']);
		const html = screen.container.innerHTML;
		expect(html).not.toMatch(/82/);
		expect(cells().map((c) => c.getAttribute('aria-label'))).toEqual([
			'Chiffre des centaines',
			'Chiffre des dizaines',
			'Chiffre des unités'
		]);
		expect(helpers().map((c) => c.getAttribute('aria-label'))).toEqual([
			'Retenue, colonne des centaines',
			'Retenue, colonne des dizaines'
		]);
	});

	it('décimaux : noms des rangs après la virgule', async () => {
		const { cells } = await renderAnswer(['calcul: 2,5 + 1,25']);
		expect(
			cells()
				.map((c) => c.getAttribute('aria-label'))
				.slice(-2)
		).toEqual(['Chiffre des dixièmes', 'Chiffre des centièmes']);
	});

	it('compensation : une case par colonne en haut, le 1 du bas suit (décision c)', async () => {
		const { screen, helpers } = await renderAnswer(['calcul: 52 - 37']);
		expect(helpers()).toHaveLength(1);
		await userEvent.click(helpers()[0]);
		await userEvent.keyboard('1');
		const bottomRow = [...screen.container.querySelectorAll('.operation-retenue')];
		expect(bottomRow.map((e) => e.textContent)).toEqual(['1']);
	});

	it('retenues : jamais envoyées au juge (comportement 6)', async () => {
		const { helpers, changes } = await renderAnswer(['calcul: 45 + 37']);
		await userEvent.click(helpers()[1]);
		await userEvent.keyboard('1');
		expect(changes).toEqual([]);
	});

	it('réponse déjà saisie : remise dans les cases', async () => {
		const { cells } = await renderAnswer(['calcul: 56,75 + 234 + 0,8'], { value: '291{,}55' });
		expect(cells().map((c) => c.value)).toEqual(['', '2', '9', '1', '5', '5']);
	});

	it('réponse fausse : chiffres faux surlignés, opération résolue à côté (comportement 7)', async () => {
		const { screen, cells } = await renderAnswer(['calcul: 45 + 37'], {
			value: '72',
			isCorrect: false,
			disabled: true
		});
		expect(cells().map((c) => c.getAttribute('aria-invalid'))).toEqual([null, 'true', null]);
		const correction = screen.container.querySelector('.operation-correction')!;
		expect(text(correction)).toBe('Correction145+3782');
	});

	it('réponse juste : pas de surlignage, pas de correction', async () => {
		const { screen, cells } = await renderAnswer(['calcul: 45 + 37'], {
			value: '82',
			isCorrect: true,
			disabled: true
		});
		expect(cells().some((c) => c.getAttribute('aria-invalid'))).toBe(false);
		expect(screen.container.querySelector('.operation-correction')).toBeNull();
	});

	it('téléphone : la grille défile dans son cadre, la page ne déborde pas (comportement 13)', async () => {
		const main = mainElement();
		main.style.width = '320px';
		await render(Operation, {
			target: main,
			props: {
				node: node('case: 0', 'calcul: 9999999999 + 9999999999'),
				answer: { value: '', isCorrect: null, disabled: false, onChange: () => {} }
			}
		});
		const frame = main.querySelector('.operation-defile')!;
		expect(frame.getBoundingClientRect().width).toBeLessThanOrEqual(320);
		const cell = main.querySelector('input[data-operation-cell="résultat"]')!;
		expect(
			cell.closest('.operation-carreau')!.getBoundingClientRect().width
		).toBeGreaterThanOrEqual(40);
	});
});
