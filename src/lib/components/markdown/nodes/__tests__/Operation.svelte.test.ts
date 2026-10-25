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

	it('multiplication à remplir : produits partiels en cases d’aide, rien de l’attendu (lot 2)', async () => {
		const screen = await render(Operation, {
			target: mainElement(),
			props: { node: node('calcul: 16 × 548') }
		});
		const grid = screen.container.querySelector('[role="group"]')!;
		expect(text(grid)).toBe('548×16+');
		// 5 cases de résultat ; produits partiels 4 + 5 cases ; retenues 2 + 4
		expect(screen.container.querySelectorAll('.operation-case')).toHaveLength(5);
		expect(screen.container.querySelectorAll('.operation-case-aide')).toHaveLength(9);
		expect(screen.container.querySelectorAll('.operation-case-petite')).toHaveLength(6);
		expect(screen.container.querySelectorAll('.operation-trait')).not.toHaveLength(0);
	});

	it('multiplication résolue : produits partiels, retenue de l’addition, résultat', async () => {
		const screen = await render(Operation, {
			target: mainElement(),
			props: { node: node('calcul: 548 × 16', 'cases: aucune') }
		});
		expect(text(screen.container)).toBe('548×1613288+54808768');
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

	it('corriger une case pleine, curseur avant le chiffre : le nouveau chiffre remplace (revue #1726)', async () => {
		const { cells, changes } = await renderAnswer(['calcul: 45 + 37']);
		await userEvent.click(cells()[2]);
		await userEvent.keyboard('3');
		cells()[2].focus();
		cells()[2].setSelectionRange(0, 0);
		await userEvent.keyboard('2');
		expect(cells()[2].value).toBe('2');
		expect(changes.at(-1)).toBe('2');
	});

	it('au focus, le chiffre de la case est sélectionné (la saisie le remplace)', async () => {
		const { cells } = await renderAnswer(['calcul: 45 + 37'], { value: '82' });
		await userEvent.click(cells()[2]);
		expect(cells()[2].selectionStart).toBe(0);
		expect(cells()[2].selectionEnd).toBe(1);
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

describe('Operation — saisie d’une multiplication (PR 2b, § 11)', () => {
	async function renderAnswer(
		line: string,
		answer: { value?: string; isCorrect?: boolean | null; disabled?: boolean } = {}
	) {
		const changes: string[] = [];
		const screen = await render(Operation, {
			target: mainElement(),
			props: {
				node: node('case: 0', line),
				answer: {
					value: '',
					isCorrect: null,
					disabled: false,
					onChange: (value: string) => changes.push(value),
					...answer
				}
			}
		});
		const inputs = (kind: string) => [
			...screen.container.querySelectorAll<HTMLInputElement>(`input[data-operation-cell="${kind}"]`)
		];
		const byLabel = (label: string) =>
			screen.container.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
		/** Virgules dessinées dans la rangée du résultat */
		const resultCommas = () =>
			inputs('résultat').filter(
				(i) => i.closest('.operation-carreau')!.querySelector('.operation-virgule') !== null
			);
		return { screen, inputs, byLabel, changes, resultCommas };
	}

	it('saisissable : résultat, produits partiels, deux rangées de retenues (n° 1, 5, 6)', async () => {
		const { inputs } = await renderAnswer('calcul: 548 × 16');
		expect(inputs('résultat')).toHaveLength(5);
		expect(inputs('produit')).toHaveLength(9);
		expect(inputs('aide')).toHaveLength(6);
		expect(inputs('résultat').every((i) => i.inputMode === 'decimal')).toBe(true);
		expect(inputs('produit').every((i) => i.inputMode === 'numeric')).toBe(true);
	});

	it('virgule : posée à droite de la case, sans toucher au chiffre ; une seule (n° 3, 4)', async () => {
		const { inputs, changes, resultCommas } = await renderAnswer('calcul: 7 × 46,55');
		const cells = () => inputs('résultat');
		await userEvent.click(cells()[4]);
		await userEvent.keyboard('58523');
		expect(changes.at(-1)).toBe('32\\,585');
		await userEvent.click(cells()[2]);
		await userEvent.keyboard(',');
		expect(cells()[2].value).toBe('5');
		expect(document.activeElement).toBe(cells()[2]);
		expect(resultCommas()).toEqual([cells()[2]]);
		expect(changes.at(-1)).toBe('325{,}85');
		// Ailleurs : déplacée (le point vaut la virgule)
		await userEvent.click(cells()[3]);
		await userEvent.keyboard('.');
		expect(resultCommas()).toEqual([cells()[3]]);
		expect(changes.at(-1)).toBe('3258{,}5');
		// Même case : enlevée
		await userEvent.keyboard(',');
		expect(resultCommas()).toEqual([]);
		expect(changes.at(-1)).toBe('32\\,585');
	});

	it('virgule dans une case vide : posée, la case reste vide', async () => {
		const { inputs, changes, resultCommas } = await renderAnswer('calcul: 0,5 × 0,3');
		const cells = () => inputs('résultat');
		await userEvent.click(cells()[3]);
		await userEvent.keyboard('51');
		await userEvent.click(cells()[1]);
		await userEvent.keyboard(',');
		expect(cells()[1].value).toBe('');
		expect(resultCommas()).toEqual([cells()[1]]);
		expect(changes.at(-1)).toBe('0{,}15');
	});

	it('produits partiels : chiffres de droite à gauche, jamais envoyés au juge (n° 5, 16)', async () => {
		const { byLabel, changes } = await renderAnswer('calcul: 548 × 16');
		const first = byLabel('Produit partiel 1, case 1 en partant de la droite');
		await userEvent.click(first);
		await userEvent.keyboard('8');
		expect(first.value).toBe('8');
		expect(document.activeElement).toBe(
			byLabel('Produit partiel 1, case 2 en partant de la droite')
		);
		await userEvent.keyboard(',a');
		expect(byLabel('Produit partiel 1, case 2 en partant de la droite').value).toBe('');
		await userEvent.click(byLabel('Retenue de l’addition, case 2 en partant de la droite'));
		await userEvent.keyboard('1,');
		expect(byLabel('Retenue de l’addition, case 2 en partant de la droite').value).toBe('1');
		expect(changes).toEqual([]);
	});

	it('flèches haut et bas : d’une rangée à l’autre (n° 7)', async () => {
		const { byLabel } = await renderAnswer('calcul: 548 × 16');
		await userEvent.click(byLabel('Résultat, case 2 sur 5 en partant de la droite'));
		await userEvent.keyboard('{ArrowUp}');
		expect(document.activeElement).toBe(
			byLabel('Produit partiel 2, case 2 en partant de la droite')
		);
		await userEvent.keyboard('{ArrowUp}');
		expect(document.activeElement).toBe(
			byLabel('Produit partiel 1, case 2 en partant de la droite')
		);
		await userEvent.keyboard('{ArrowUp}');
		expect(document.activeElement).toBe(
			byLabel('Retenue de l’addition, case 2 en partant de la droite')
		);
		await userEvent.keyboard('{ArrowUp}');
		expect(document.activeElement).toBe(byLabel('Retenue, case 2 en partant de la droite'));
		await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}');
		expect(document.activeElement).toBe(byLabel('Résultat, case 2 sur 5 en partant de la droite'));
		// Colonne sans case au-dessus : on saute à la rangée suivante qui en a une
		await userEvent.click(byLabel('Résultat, case 5 sur 5 en partant de la droite'));
		await userEvent.keyboard('{ArrowUp}');
		expect(document.activeElement).toBe(
			byLabel('Produit partiel 2, case 5 en partant de la droite')
		);
		await userEvent.keyboard('{ArrowUp}');
		expect(document.activeElement).toBe(
			byLabel('Retenue de l’addition, case 5 en partant de la droite')
		);
	});

	it('noms accessibles neutres, aucune valeur attendue dans le DOM (n° 9, 17)', async () => {
		const { screen, inputs } = await renderAnswer('calcul: 548 × 16');
		expect(screen.container.innerHTML).not.toMatch(/8768|3288|5480/);
		expect(inputs('résultat').map((i) => i.getAttribute('aria-label'))).toEqual([
			'Résultat, case 5 sur 5 en partant de la droite',
			'Résultat, case 4 sur 5 en partant de la droite',
			'Résultat, case 3 sur 5 en partant de la droite',
			'Résultat, case 2 sur 5 en partant de la droite',
			'Résultat, case 1 sur 5 en partant de la droite'
		]);
		expect(inputs('aide').map((i) => i.getAttribute('aria-label'))).toEqual([
			'Retenue, case 3 en partant de la droite',
			'Retenue, case 2 en partant de la droite',
			'Retenue de l’addition, case 5 en partant de la droite',
			'Retenue de l’addition, case 4 en partant de la droite',
			'Retenue de l’addition, case 3 en partant de la droite',
			'Retenue de l’addition, case 2 en partant de la droite'
		]);
	});

	it('virgule annoncée dans le nom de la case', async () => {
		const { inputs } = await renderAnswer('calcul: 7 × 46,55', { value: '325{,}85' });
		expect(inputs('résultat')[2].getAttribute('aria-label')).toBe(
			'Résultat, case 3 sur 5 en partant de la droite, virgule à sa droite'
		);
	});

	it('réponse déjà saisie : chiffres et virgule remis (n° 14)', async () => {
		const { inputs, resultCommas } = await renderAnswer('calcul: 7 × 46,55', {
			value: '325{,}85'
		});
		expect(inputs('résultat').map((i) => i.value)).toEqual(['3', '2', '5', '8', '5']);
		expect(resultCommas()).toEqual([inputs('résultat')[2]]);
	});

	it('correction : virgule absente → sa place surlignée (n° 8)', async () => {
		const { screen, inputs } = await renderAnswer('calcul: 7 × 46,55', {
			value: '32\\,585',
			isCorrect: false,
			disabled: true
		});
		expect(inputs('résultat').some((i) => i.getAttribute('aria-invalid'))).toBe(false);
		const missing = screen.container.querySelectorAll('.operation-virgule-manquante');
		expect(missing).toHaveLength(1);
		expect(missing[0].closest('.operation-carreau')!.contains(inputs('résultat')[2])).toBe(true);
		expect(screen.container.querySelector('.operation-correction')).not.toBeNull();
	});

	it('correction : virgule mal placée → la virgule de l’élève surlignée (n° 8, 11)', async () => {
		const { screen, inputs } = await renderAnswer('calcul: 7 × 46,55', {
			value: '3258{,}5',
			isCorrect: false,
			disabled: true
		});
		expect(inputs('résultat').some((i) => i.getAttribute('aria-invalid'))).toBe(false);
		const wrongComma = screen.container.querySelectorAll('.operation-virgule-faux');
		expect(wrongComma).toHaveLength(1);
		expect(wrongComma[0].closest('.operation-carreau')!.contains(inputs('résultat')[3])).toBe(true);
	});

	it('correction : chiffres faux surlignés, produits partiels jamais (n° 8)', async () => {
		const { screen, inputs } = await renderAnswer('calcul: 548 × 16', {
			value: '8778',
			isCorrect: false,
			disabled: true
		});
		expect(inputs('résultat').map((i) => i.getAttribute('aria-invalid'))).toEqual([
			null,
			null,
			null,
			'true',
			null
		]);
		expect(inputs('produit').some((i) => i.getAttribute('aria-invalid'))).toBe(false);
		expect(screen.container.querySelector('.operation-virgule-manquante')).toBeNull();
	});

	it('réponse juste : aucun surlignage', async () => {
		const { screen } = await renderAnswer('calcul: 2,5 × 4', {
			value: '10',
			isCorrect: true,
			disabled: true
		});
		expect(screen.container.querySelector('.operation-virgule-manquante')).toBeNull();
		expect(screen.container.querySelector('.operation-correction')).toBeNull();
	});
});
