/**
 * Les cartes des objets de la figure (géométrie v2, lot 1, PR 1) : une carte
 * « d : y = 3x − 2 », « A = (1 ; 2) » (phase 0 `docs/archive/wip/atelier-geometrie-phase0.md`,
 * C1 et P1), et la création par « + Point », « + Courbe ».
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import type { MathfieldElement } from 'mathlive';
import WithAtelier from './harness/WithAtelier.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '$lib/atelier/calcul';
import { onDesktopScreen } from './harness/desktop-screen';

// À 414 px (la page des tests), « Mes objets » est replié : on teste les cartes sur bureau
onDesktopScreen();

// =============================================================================
// Décor
// =============================================================================

function cardFor(container: HTMLElement, name: string): HTMLElement {
	const card = [...container.querySelectorAll('.objet')].find(
		(el) => el.querySelector('.nom')?.textContent?.trim() === name
	);
	if (!card) throw new Error(`pas de carte ${name}`);
	return card as HTMLElement;
}

function fieldOf(card: HTMLElement): MathfieldElement {
	const field = card.querySelector('math-field');
	if (!field) throw new Error('pas de champ');
	return field as MathfieldElement;
}

/**
 * Le nom, le signe et le champ sont-ils sur la même ligne ? (revue de la PR 2 :
 * la carte se lit comme celle d'une fonction — le nom, puis l'équation ou les
 * coordonnées ; lot 4b de la refonte : une seule ligne).
 */
function onOneLine(card: HTMLElement): boolean {
	const boxes = ['.nom', '.egal', 'math-field'].map((selector) =>
		card.querySelector(selector)!.getBoundingClientRect()
	);
	const [first, ...others] = boxes;
	return others.every((box) => box.bottom > first.top && box.top < first.bottom);
}

/** Le premier clic de la session est parfois perdu par MathLive (mesuré). */
async function focusField(field: MathfieldElement) {
	await userEvent.click(field);
	await vi.waitFor(() => expect(document.activeElement).toBe(field));
}

// =============================================================================
// Tests
// =============================================================================

describe('la carte d’un objet de la figure', () => {
	it('C1 : la courbe se lit « d : y = … », en écriture mathématique, nature « droite »', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'curve', name: 'd', definition: 'y = 3x - 2' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const card = cardFor(container, 'd');

		expect(onOneLine(card)).toBe(true);
		expect(card.querySelector('.egal')?.textContent?.trim()).toBe(':');
		expect(fieldOf(card).value.replace(/\s+/g, '')).toBe('y=3x-2');
		// PR 2 : la nature remplace le type « courbe » (C1)
		expect(card.querySelector('.type')?.textContent?.trim()).toBe('droite');
	});

	it('C2 : C : x² + y² = 1 a la nature « cercle »', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'curve', name: 'C', definition: 'x^2 + y^2 = 1' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		expect(cardFor(container, 'C').querySelector('.type')?.textContent?.trim()).toBe('cercle');
	});

	it('C6 : la carte d’une courbe vide constate « Aucun point ne vérifie cette équation. »', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'curve', name: 'C', definition: 'x^2 + y^2 = -1' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const card = cardFor(container, 'C');
		// Constaté, pas refusé : la courbe reste acceptée, sans badge d'erreur
		expect(card.textContent).toContain('Aucun point ne vérifie cette équation.');
		expect(card.querySelector('.etat')).toBeNull();
		expect(card.querySelector('.type')?.textContent?.trim()).toBe('courbe');
	});

	it('P1 : le point se lit « A = (1 ; 2) », type « point », sans œil de tracé', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'point', name: 'A', definition: '(1 ; 2)' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const card = cardFor(container, 'A');

		expect(onOneLine(card)).toBe(true);
		expect(card.querySelector('.egal')?.textContent?.trim()).toBe('=');
		expect(card.querySelector('.type')?.textContent?.trim()).toBe('point');
		// Un point ne va pas dans Graphe (G0) : pas de bouton « Tracer »
		expect(card.querySelector('button[aria-label^="Tracer"]')).toBeNull();
	});

	it('« + Point » et « + Courbe » créent les cartes A et d, à compléter', async () => {
		const atelier = new Atelier();
		const { container } = await render(WithAtelier, { atelier });
		const button = (label: string) =>
			[...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;

		await userEvent.click(button('+ Point'));
		await userEvent.click(button('+ Courbe'));

		expect(atelier.get('A')?.kind).toBe('point');
		expect(atelier.get('d')?.kind).toBe('curve');
		expect(atelier.get('d')?.status).toBe('incomplete');
	});

	it('la carte d’une courbe se modifie : « d : » puis le champ, Entrée range', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'curve', name: 'd' });
		const { container } = await render(WithAtelier, { atelier });
		const card = cardFor(container, 'd');
		const field = fieldOf(card);

		expect(card.querySelector('.egal')?.textContent?.trim()).toBe(':');
		expect(onOneLine(card)).toBe(true);
		await focusField(field);
		await userEvent.keyboard('y=2x{Enter}');

		await vi.waitFor(() => expect(atelier.get('d')?.status).toBe('ok'));
		expect(atelier.get('d')?.kind).toBe('curve');
	});

	it('P1 : le champ du point montre (1 ; 2)', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'point', name: 'A', definition: '(1 ; 2)' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		expect(fieldOf(cardFor(container, 'A')).value.replace(/\s+/g, '')).toMatch(/1;2/);
	});

	it('P3 : la carte d’un point se tape, (1;2) puis (1,5;2) → A(3/2 ; 2)', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'point', name: 'A' });
		const { container } = await render(WithAtelier, { atelier });
		const field = fieldOf(cardFor(container, 'A'));
		await focusField(field);

		await userEvent.keyboard('(1;2){Enter}');
		await vi.waitFor(() => expect(atelier.get('A')?.status).toBe('ok'));
		// Mesuré : MathLive écrit `\left(1;2\right)` pour `(1;2)` tapé
		expect(atelier.get('A')?.definition).toBe('\\left(1;2\\right)');

		field.executeCommand('selectAll');
		await userEvent.keyboard('(1,5;2){Enter}');
		// Mesuré : la virgule arrive nue, `\left(1,5;2\right)`
		await vi.waitFor(() => expect(atelier.get('A')?.definition).toBe('\\left(1,5;2\\right)'));
		expect(atelier.get('A')?.status).toBe('ok');
		const s = { atelier, engine: new WebReplEngine(), seed: () => 1 };
		const line = runInput(s, 'A');
		expect(line.kind === 'calcul' && line.output).toBe('A(3/2 ; 2)');
	});
});
