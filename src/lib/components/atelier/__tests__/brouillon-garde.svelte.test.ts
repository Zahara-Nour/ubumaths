/**
 * Une commande préparée par une carte s'ajoute à ce que l'élève a déjà tapé
 * dans la console, curseur en fin de ligne, dans les deux modes de saisie
 * (décision de David du 2026-10-18). Le pupitre seul : `brouillon-garde.test.ts`.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import type { MathfieldElement } from 'mathlive';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { INPUT_MODE_KEY } from '$lib/atelier/input-mode';
import { chooseObjectAction } from './harness/function-card';
import { onDesktopScreen } from './harness/desktop-screen';

// À 414 px (la page des tests), « Mes objets » est replié : on teste les cartes sur bureau
onDesktopScreen();

// =============================================================================
// Décor
// =============================================================================

// Le stockage est commun à tous les fichiers de tests du navigateur
beforeEach(() => localStorage.removeItem(INPUT_MODE_KEY));
afterEach(() => localStorage.removeItem(INPUT_MODE_KEY));

/** Un dé : L les valeurs, M leurs probabilités. */
async function openDie() {
	const atelier = new Atelier();
	atelier.create({ kind: 'list', name: 'L', definition: '1;2;3;4;5;6' });
	atelier.create({ kind: 'list', name: 'M', definition: '1/6;1/6;1/6;1/6;1/6;1/6' });
	const { container } = await render(AtelierContainer, { atelier, ephemeral: true });

	const textField = () =>
		container.querySelector('.calcul form input[type="text"]') as HTMLInputElement | null;
	const mathField = () =>
		container.querySelector('.calcul form math-field') as MathfieldElement | null;

	async function chooseMath() {
		const settings = [...container.querySelectorAll('button')].find(
			(b) => b.getAttribute('aria-label') === 'Réglages'
		);
		if (!settings) throw new Error('pas de bouton « Réglages »');
		await userEvent.click(settings);
		await page.getByRole('radio', { name: /^Écriture mathématique/ }).click();
		await userEvent.keyboard('{Escape}');
		await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
	}

	/** « Simuler avec probabilités M » sur la carte de L (sous-menu, lot 4a de la refonte). */
	async function simulate() {
		await chooseObjectAction(container, 'L', 'Simuler avec probabilités M');
	}

	return { textField, mathField, chooseMath, simulate };
}

// =============================================================================
// Les deux modes
// =============================================================================

describe('une commande préparée garde le brouillon de la console', () => {
	it('en texte : le brouillon, puis la commande, curseur à la fin', async () => {
		const { textField, simulate } = await openDie();
		const field = await vi.waitFor(() => {
			expect(textField()).toBeTruthy();
			return textField() as HTMLInputElement;
		});
		field.value = 'g(2)+';
		field.dispatchEvent(new Event('input', { bubbles: true }));

		await simulate();

		const expected = 'g(2)+ .simuler L M 100';
		await vi.waitFor(() => expect(textField()?.value).toBe(expected));
		await vi.waitFor(() => expect(document.activeElement).toBe(textField()));
		expect(textField()?.selectionStart).toBe(expected.length);
	});

	it('en texte, brouillon vide : la commande seule', async () => {
		const { textField, simulate } = await openDie();
		await vi.waitFor(() => expect(textField()).toBeTruthy());

		await simulate();

		await vi.waitFor(() => expect(textField()?.value).toBe('.simuler L M 100'));
	});

	it('en écriture mathématique : le brouillon reste, la commande suit, curseur à la fin', async () => {
		const { textField, mathField, chooseMath, simulate } = await openDie();
		// Le brouillon tapé en texte suit la bascule vers l'écriture mathématique
		// (phase 0 des réglages) : un décor sans frappes MathLive, stable en série
		const field = await vi.waitFor(() => {
			expect(textField()).toBeTruthy();
			return textField() as HTMLInputElement;
		});
		field.value = '2+3';
		field.dispatchEvent(new Event('input', { bubbles: true }));
		await chooseMath();
		await vi.waitFor(() => expect(mathField()?.value).toMatch(/2\s*\+\s*3/));

		await simulate();

		// ⚠️ Limite connue : un brouillon mathématique suivi d'une commande ne se
		// compose pas en une seule écriture (la commande n'est mise en forme que
		// seule sur sa ligne) ; rien n'est perdu, c'est ce qu'on vérifie
		await vi.waitFor(() => {
			const value = mathField()?.value ?? '';
			expect(value).toMatch(/2\s*\+\s*3/);
			expect(value).toContain('simuler');
		});
		await vi.waitFor(() => expect(document.activeElement).toBe(mathField()));
		const after = mathField() as MathfieldElement;
		expect(after.position).toBe(after.lastOffset);
	});
});
