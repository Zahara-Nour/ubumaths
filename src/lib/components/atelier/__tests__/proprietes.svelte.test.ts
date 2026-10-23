/**
 * Le panneau « Propriétés » d'un objet, déplié sous sa carte (chantier
 * `docs/wip/atelier-proprietes-progress.md`, validé par David le 2026-10-23) :
 * ouvert par « Propriétés » ou « Renommer », il montre les mesures, renomme
 * (les objets qui citent le nom suivent), règle le style et l'étiquette ;
 * Échap le referme et rend le focus au menu de la carte.
 *
 * Asserte le RENDU.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import WithAtelier from './harness/WithAtelier.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { isCurve, isPoint } from '$lib/atelier/types';
import { cardOf, chooseObjectAction } from './harness/function-card';
import { onDesktopScreen } from './harness/desktop-screen';

// À 414 px (la page des tests), « Mes objets » est replié : on teste sur bureau
onDesktopScreen();

// =============================================================================
// Décor
// =============================================================================

type Entry = [kind: 'value' | 'function' | 'point' | 'curve', name: string, definition: string];

function atelierWith(entries: Entry[]): Atelier {
	const atelier = new Atelier();
	for (const [kind, name, definition] of entries) {
		const done = atelier.create({ kind, name, definition }, 'text');
		if (!done.ok) throw new Error(`${name} refusé : ${done.message}`);
	}
	return atelier;
}

const SEGMENT: Entry[] = [
	['point', 'A', '(0 ; 1)'],
	['point', 'B', '(1 ; 3)'],
	['curve', 's', '[AB]']
];

/** Le panneau déplié sous la carte `name`. */
function panelOf(container: HTMLElement, name: string): HTMLElement {
	const panel = [...container.querySelectorAll<HTMLElement>('section.proprietes')].find(
		(el) => el.querySelector('h3')?.textContent?.trim() === `Propriétés de ${name}`
	);
	if (!panel) throw new Error(`pas de panneau pour ${name}`);
	return panel;
}

/** Les lignes lues : `Libellé : valeur en clair`. */
function rowsOf(panel: HTMLElement): string[] {
	return [...panel.querySelectorAll('.lignes .ligne')].map((row) => {
		const label = row.querySelector('dt')?.textContent?.trim() ?? '';
		const value = row.querySelector('dd .sr-only')?.textContent?.trim() ?? '';
		return `${label} : ${value}`;
	});
}

function nameField(panel: HTMLElement): HTMLInputElement {
	const field = panel.querySelector<HTMLInputElement>('form.nom input');
	if (!field) throw new Error('pas de champ du nom');
	return field;
}

// =============================================================================
// Tests
// =============================================================================

describe('ouvrir le panneau', () => {
	it('« Propriétés » le déplie sous la carte, focus dedans, mesures du segment', async () => {
		const atelier = atelierWith(SEGMENT);
		const { container } = await render(WithAtelier, { atelier });

		await chooseObjectAction(container, 's', 'Propriétés');

		const panel = await vi.waitFor(() => panelOf(container, 's'));
		// Juste après la carte qu'il prolonge
		expect(cardOf(container, 's').nextElementSibling).toBe(panel);
		await vi.waitFor(() => expect(document.activeElement).toBe(panel));
		expect(rowsOf(panel)).toEqual(
			expect.arrayContaining(['Longueur : √5', 'Milieu : (1/2 ; 2)', 'Dépend de : A, B'])
		);
		// La valeur approchée d'une racine se lit à côté
		expect(panel.querySelector('.approche')?.textContent?.trim()).toBe('≈ 2,2361');
	});

	it('Échap le referme et rend le focus au menu de la carte', async () => {
		const atelier = atelierWith(SEGMENT);
		const { container } = await render(WithAtelier, { atelier });
		await chooseObjectAction(container, 's', 'Propriétés');
		await vi.waitFor(() => expect(document.activeElement).toBe(panelOf(container, 's')));

		await userEvent.keyboard('{Escape}');

		expect(container.querySelector('section.proprietes')).toBeNull();
		expect(document.activeElement?.getAttribute('aria-label')).toBe('Options de s');
	});

	// Revue de #1630 : le focus tombait sur `body` (l'effet ne rejouait pas)
	it('rechoisir « Propriétés » garde le focus dans le panneau', async () => {
		const atelier = atelierWith(SEGMENT);
		const { container } = await render(WithAtelier, { atelier });
		await chooseObjectAction(container, 's', 'Propriétés');
		await vi.waitFor(() => expect(document.activeElement).toBe(panelOf(container, 's')));

		await chooseObjectAction(container, 's', 'Propriétés');

		await vi.waitFor(() => expect(document.activeElement).toBe(panelOf(container, 's')));
	});

	// Revue de #1630 : le panneau d'un A supprimé se rouvrait sur le nouveau A
	it('un objet supprimé emporte son panneau ; un homonyme recréé ne le rouvre pas', async () => {
		const atelier = atelierWith(SEGMENT);
		const { container } = await render(WithAtelier, { atelier });
		await chooseObjectAction(container, 's', 'Propriétés');
		await vi.waitFor(() => panelOf(container, 's'));

		atelier.remove('s');
		await vi.waitFor(() => expect(container.querySelector('section.proprietes')).toBeNull());
		atelier.create({ kind: 'curve', name: 's', definition: '[AB]' }, 'text');

		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(container.querySelector('section.proprietes')).toBeNull();
	});

	it('un seul panneau à la fois', async () => {
		const atelier = atelierWith(SEGMENT);
		const { container } = await render(WithAtelier, { atelier });
		await chooseObjectAction(container, 's', 'Propriétés');
		await chooseObjectAction(container, 'A', 'Propriétés');

		await vi.waitFor(() => expect(container.querySelectorAll('section.proprietes').length).toBe(1));
		expect(panelOf(container, 'A')).toBeTruthy();
	});
});

describe('renommer', () => {
	it('« Renommer » met le focus sur le nom ; A → E réécrit s = [EB]', async () => {
		const atelier = atelierWith(SEGMENT);
		const { container } = await render(WithAtelier, { atelier });

		await chooseObjectAction(container, 'A', 'Renommer');
		const field = await vi.waitFor(() => {
			const input = nameField(panelOf(container, 'A'));
			expect(document.activeElement).toBe(input);
			return input;
		});
		await userEvent.keyboard('E{Enter}');

		await vi.waitFor(() => expect(atelier.get('E')).toBeDefined());
		expect(atelier.get('A')).toBeUndefined();
		expect(atelier.get('s')?.definition).toMatch(/E\s*B/);
		// Le panneau suit le nouveau nom, toujours ouvert, le focus sur le nom
		const panel = await vi.waitFor(() => panelOf(container, 'E'));
		await vi.waitFor(() => expect(document.activeElement).toBe(nameField(panel)));
		expect(field.isConnected).toBe(false);
	});

	it('un nom déjà pris est refusé, avec sa raison, et rien ne change', async () => {
		const atelier = atelierWith(SEGMENT);
		const { container } = await render(WithAtelier, { atelier });
		await chooseObjectAction(container, 'A', 'Renommer');
		const panel = await vi.waitFor(() => panelOf(container, 'A'));
		await vi.waitFor(() => expect(document.activeElement).toBe(nameField(panel)));

		await userEvent.keyboard('B{Enter}');

		const refusal = await vi.waitFor(() => {
			const alert = panel.querySelector<HTMLElement>('[role="alert"]');
			expect(alert).toBeTruthy();
			return alert!;
		});
		expect(refusal.textContent?.trim()).not.toBe('');
		expect(nameField(panel).getAttribute('aria-invalid')).toBe('true');
		expect(nameField(panel).getAttribute('aria-describedby')).toBe(refusal.id);
		expect(atelier.get('A')).toBeDefined();
	});

	it('le bouton « Renommer » est grisé tant que le nom n’a pas changé', async () => {
		const atelier = atelierWith(SEGMENT);
		const { container } = await render(WithAtelier, { atelier });
		await chooseObjectAction(container, 'A', 'Propriétés');
		const panel = await vi.waitFor(() => panelOf(container, 'A'));

		const button = panel.querySelector<HTMLButtonElement>('form.nom button[type="submit"]');
		expect(button?.disabled).toBe(true);
	});
});

describe('les réglages', () => {
	it('l’étiquette d’un point se décoche dans le panneau', async () => {
		const atelier = atelierWith(SEGMENT);
		const { container } = await render(WithAtelier, { atelier });
		await chooseObjectAction(container, 'A', 'Propriétés');
		const panel = await vi.waitFor(() => panelOf(container, 'A'));

		const box = panel.querySelector<HTMLButtonElement>(
			'button[aria-label="Afficher l’étiquette de A"]'
		);
		expect(box?.getAttribute('aria-checked')).toBe('true');
		box?.click();

		await vi.waitFor(() => {
			const a = atelier.get('A');
			expect(a && isPoint(a) && a.display?.showLabel).toBe(false);
		});
	});

	it('la couleur d’une courbe se règle dans le panneau', async () => {
		const atelier = atelierWith(SEGMENT);
		const { container } = await render(WithAtelier, { atelier });
		await chooseObjectAction(container, 's', 'Propriétés');
		const panel = await vi.waitFor(() => panelOf(container, 's'));

		const colors = panel.querySelector('[role="radiogroup"][aria-label="Couleur de la courbe"]');
		const second = colors?.querySelectorAll<HTMLButtonElement>('button[role="radio"]')[1];
		second?.click();

		await vi.waitFor(() => {
			const segment = atelier.get('s');
			expect(segment && isCurve(segment) && segment.display?.color).toBeTruthy();
		});
	});

	it('une valeur à curseur : ses bornes et son pas', async () => {
		const atelier = atelierWith([['value', 'a', '2']]);
		atelier.setSliderShown('a', true);
		const { container } = await render(WithAtelier, { atelier });
		await chooseObjectAction(container, 'a', 'Propriétés');
		const panel = await vi.waitFor(() => panelOf(container, 'a'));

		expect(rowsOf(panel)).toContain('Valeur : 2');
		expect(panel.querySelector('h4')?.textContent?.trim()).toBe('Curseur');
		expect(panel.querySelectorAll('input').length).toBeGreaterThan(1);
	});

	it('une fonction : variable, ensemble, et le style du tracé', async () => {
		const atelier = atelierWith([['function', 'f', '1/x']]);
		const { container } = await render(WithAtelier, { atelier });
		await chooseObjectAction(container, 'f', 'Propriétés');
		const panel = await vi.waitFor(() => panelOf(container, 'f'));

		expect(rowsOf(panel)).toEqual(['Variable : x', 'Ensemble de définition : ℝ \\ {0}']);
		expect(panel.querySelector('h4')?.textContent?.trim()).toBe('Style du tracé');
	});
});
