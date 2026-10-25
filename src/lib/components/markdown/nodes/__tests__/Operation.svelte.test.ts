/**
 * Bloc ```operation à l'écran (phase 0 : `docs/wip/operations-posees-progress.md` § 3)
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
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
