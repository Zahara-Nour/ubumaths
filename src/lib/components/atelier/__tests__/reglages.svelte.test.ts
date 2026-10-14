/**
 * La fenêtre de réglages de l'atelier, et le choix de la saisie dans Calcul.
 *
 * Phase 0 `docs/wip/atelier-reglages-phase0.md` : « Texte » par défaut, le
 * choix prend effet tout de suite et reste dans ce navigateur, la ligne en
 * cours suit la bascule, les réponses ne changent pas.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import type { MathfieldElement } from 'mathlive';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { INPUT_MODE_KEY } from '$lib/atelier/input-mode';

// =============================================================================
// Décor
// =============================================================================

type Choice = 'Texte' | 'Écriture mathématique';

beforeEach(() => {
	localStorage.removeItem(INPUT_MODE_KEY);
});

/** Un atelier reçu par lien (éphémère) : les réglages y sont aussi. */
async function open() {
	const view = await render(AtelierContainer, { atelier: new Atelier(), ephemeral: true });
	const container = view.container;
	const calcul = () => container.querySelector('.calcul form') as HTMLFormElement;
	const textField = () => calcul().querySelector('input[type="text"]') as HTMLInputElement | null;
	const mathField = () => calcul().querySelector('math-field') as MathfieldElement | null;
	const settingsButton = () =>
		[...container.querySelectorAll('button')].find((b) => b.textContent?.includes('Réglages'));
	const history = () => container.querySelector('.historique')?.textContent ?? '';

	/** Un VRAI clic : c'est lui qui donne le focus au bouton, que la fenêtre rendra. */
	async function openSettings() {
		const button = settingsButton();
		if (button === undefined) throw new Error('pas de bouton « Réglages »');
		await userEvent.click(button);
		await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeTruthy());
	}

	async function choose(choice: Choice) {
		await openSettings();
		await page.getByRole('radio', { name: new RegExp(`^${choice}`) }).click();
		await userEvent.keyboard('{Escape}');
		await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
	}

	/** Le mode texte : la valeur posée, comme une frappe. */
	async function typeText(text: string) {
		const field = textField();
		if (field === null) throw new Error('pas de champ texte');
		field.value = text;
		field.dispatchEvent(new Event('input', { bubbles: true }));
		await vi.waitFor(() => expect(field.value).toBe(text));
	}

	/** Le mode mathématique : de VRAIES frappes, curseur en fin de champ. */
	async function typeMath(keys: string) {
		const field = mathField();
		if (field === null) throw new Error('pas de champ mathématique');
		await userEvent.click(field);
		await vi.waitFor(() => expect(document.activeElement).toBe(field));
		field.executeCommand('moveToMathfieldEnd');
		await userEvent.keyboard(keys);
	}

	return {
		container,
		calcul,
		textField,
		mathField,
		settingsButton,
		history,
		openSettings,
		choose,
		typeText,
		typeMath
	};
}

// =============================================================================
// La fenêtre
// =============================================================================

describe('la fenêtre de réglages', () => {
	it('un bouton « Réglages » l’ouvre ; « Texte » est choisi par défaut', async () => {
		const { settingsButton, openSettings, textField, mathField } = await open();

		expect(settingsButton()).toBeTruthy();
		await openSettings();

		await expect
			.element(page.getByRole('heading', { name: 'Réglages de l’atelier' }))
			.toBeVisible();
		await expect
			.element(page.getByRole('radio', { name: /^Texte/ }))
			.toHaveAttribute('aria-checked', 'true');
		await expect
			.element(page.getByRole('radio', { name: /^Écriture mathématique/ }))
			.toHaveAttribute('aria-checked', 'false');
		// Le mode mathématique est annoncé comme un essai (décision 2 de David)
		expect(document.querySelector('[role="dialog"]')?.textContent).toContain('en essai');
		expect(textField()).toBeTruthy();
		expect(mathField()).toBeNull();
	});

	it('Échap la ferme et rend le focus au bouton', async () => {
		const { settingsButton, openSettings } = await open();

		await openSettings();
		await userEvent.keyboard('{Escape}');

		await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
		await vi.waitFor(() => expect(document.activeElement).toBe(settingsButton()));
	});
});

// =============================================================================
// Le choix de la saisie
// =============================================================================

describe('le choix de la saisie dans Calcul', () => {
	it('« Écriture mathématique » met un champ MathLive à la place, tout de suite, et le retient', async () => {
		const { choose, textField, mathField } = await open();

		await choose('Écriture mathématique');

		await vi.waitFor(() => expect(mathField()).toBeTruthy());
		expect(textField()).toBeNull();
		expect(localStorage.getItem(INPUT_MODE_KEY)).toBe('math');
	});

	it('le choix retenu vaut dès l’ouverture de l’atelier', async () => {
		localStorage.setItem(INPUT_MODE_KEY, 'math');
		const { mathField, textField } = await open();

		await vi.waitFor(() => expect(mathField()).toBeTruthy());
		expect(textField()).toBeNull();
	});

	it('revenir à « Texte » rend le champ texte', async () => {
		const { choose, textField, mathField } = await open();

		await choose('Écriture mathématique');
		await choose('Texte');

		await vi.waitFor(() => expect(textField()).toBeTruthy());
		expect(mathField()).toBeNull();
		expect(localStorage.getItem(INPUT_MODE_KEY)).toBe('text');
	});

	it('la ligne en cours de frappe suit la bascule, dans les deux sens', async () => {
		const { choose, typeText, textField, mathField } = await open();

		await typeText('x^2+1');
		await choose('Écriture mathématique');
		await vi.waitFor(() => expect(mathField()?.value).toMatch(/x\^2\s*\+\s*1/));

		await choose('Texte');
		await vi.waitFor(() => expect(textField()?.value).toMatch(/x\^2\s*\+\s*1/));
	});
});

// =============================================================================
// Calculer en écriture mathématique
// =============================================================================

describe('Calcul en écriture mathématique', () => {
	it('Entrée calcule', async () => {
		const { choose, typeMath, history, mathField } = await open();
		await choose('Écriture mathématique');

		await typeMath('2+3{Enter}');

		await vi.waitFor(() => expect(history()).toContain('5'));
		// Le champ est vidé, prêt pour la ligne suivante
		expect(mathField()?.value).toBe('');
	});

	it('une commande s’écrit sans point', async () => {
		const { choose, typeMath, history } = await open();
		await choose('Écriture mathématique');

		await typeMath('dériver x^3{Enter}');

		// 3x² composé par MathLive : « 3x2 » en texte
		await vi.waitFor(() => expect(history()).toContain('3x2'));
	});

	it('le bouton « Calculer » calcule aussi', async () => {
		const { choose, typeMath, history, calcul } = await open();
		await choose('Écriture mathématique');

		await typeMath('4+3');
		const button = [...calcul().querySelectorAll('button')].find(
			(b) => b.textContent?.trim() === 'Calculer'
		);
		await vi.waitFor(() => expect(button?.disabled).toBe(false));
		button?.click();

		await vi.waitFor(() => expect(history()).toContain('7'));
	});

	it('↑ rappelle une saisie faite en mode texte, réécrite pour le champ', async () => {
		const { choose, typeText, calcul, typeMath, mathField } = await open();

		await typeText('.dériver x^3');
		calcul().dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
		await choose('Écriture mathématique');
		await typeMath('{ArrowUp}');

		await vi.waitFor(() => expect(mathField()?.value).toContain('\\text{dériver}'));
	});

	it('↑ une seconde fois remonte à la saisie d’avant', async () => {
		const { choose, typeText, calcul, typeMath, mathField } = await open();
		const submitText = async (text: string) => {
			await typeText(text);
			calcul().dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
		};

		await submitText('2+3');
		// Réécrite pour le champ (`\exponentialE^{2 x}`), puis rangée autrement
		// par MathLive (`{2x}`, mesuré) : ↑ ne doit pas la croire modifiée
		await submitText('e^(2x)');
		await choose('Écriture mathématique');
		await typeMath('{ArrowUp}');
		await vi.waitFor(() => expect(mathField()?.value).toContain('exponentialE'));
		await userEvent.keyboard('{ArrowUp}');

		await vi.waitFor(() => expect(mathField()?.value).toMatch(/^2\s*\+\s*3$/));
	});

	it('une case vide du modèle : la ligne reste, la raison est dite', async () => {
		const { choose, container, mathField, history, typeMath } = await open();
		await choose('Écriture mathématique');
		const field = mathField();
		if (field === null) throw new Error('pas de champ mathématique');
		field.value = String.raw`\text{intégrer}\,\placeholder{}`;

		await typeMath('{Enter}');

		await vi.waitFor(() =>
			expect(container.querySelector('.retour')?.textContent).toContain('case du modèle')
		);
		expect(field.value).toContain('placeholder');
		expect(history()).toBe('');
	});

	it('la liste et le modèle du mode texte ne s’ouvrent pas', async () => {
		const { choose, typeMath, container } = await open();
		await choose('Écriture mathématique');

		await typeMath('résoudre ');

		await vi.waitFor(() => expect(container.textContent).not.toContain('Modèle :'));
		expect(container.querySelector('[aria-label="Commandes disponibles"]')).toBeNull();
	});
});
