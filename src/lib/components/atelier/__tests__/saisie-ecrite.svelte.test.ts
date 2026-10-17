/**
 * En écriture mathématique, l'historique montre ce que l'élève a ÉCRIT, pas le
 * texte envoyé au moteur (`.dériver x^3`, avec le point qu'il n'a jamais tapé).
 * Et le champ vide dit quoi y écrire.
 *
 * Suite de `docs/wip/atelier-reglages-phase0.md` (points restés ouverts au merge
 * de #1385, demandés par David le 2026-10-14).
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import type { MathfieldElement } from 'mathlive';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { INPUT_MODE_KEY } from '$lib/atelier/input-mode';
import { CALC_HISTORY_STORAGE_KEY, CALC_HISTORY_VERSION } from '$lib/atelier/history-storage';

// =============================================================================
// Décor
// =============================================================================

const ATELIER_KEY = 'chiphre-atelier';

function forget() {
	for (const key of [INPUT_MODE_KEY, CALC_HISTORY_STORAGE_KEY, ATELIER_KEY]) {
		localStorage.removeItem(key);
	}
}

// Le stockage est commun à tous les fichiers de tests du navigateur : démonter
// (qui range ce qui attendait) AVANT d'oublier
beforeEach(forget);
afterEach(() => {
	cleanup();
	forget();
});

async function open(mode: 'text' | 'math', options: { ephemeral?: boolean } = {}) {
	localStorage.setItem(INPUT_MODE_KEY, mode);
	const view = await render(AtelierContainer, { atelier: new Atelier(), ...options });
	const container = view.container;
	const mathField = () => container.querySelector('.calcul form math-field') as MathfieldElement;
	const textField = () =>
		container.querySelector('.calcul form input[type="text"]') as HTMLInputElement;
	const saisies = () => [...container.querySelectorAll('.historique li .saisie')];

	/** De VRAIES frappes dans le champ mathématique, curseur en fin de champ. */
	async function typeMath(keys: string) {
		const field = await vi.waitFor(() => {
			expect(mathField()).toBeTruthy();
			return mathField();
		});
		await userEvent.click(field);
		await vi.waitFor(() => expect(document.activeElement).toBe(field));
		field.executeCommand('moveToMathfieldEnd');
		await userEvent.keyboard(keys);
	}

	async function submitText(text: string) {
		const field = textField();
		field.value = text;
		field.dispatchEvent(new Event('input', { bubbles: true }));
		await vi.waitFor(() => expect(field.value).toBe(text));
		(field.form as HTMLFormElement).requestSubmit();
	}

	return { container, view, mathField, saisies, typeMath, submitText };
}

// =============================================================================
// L'historique
// =============================================================================

describe('l’historique montre la saisie écrite', () => {
	it('en mathématiques, sans le point ; lue en texte par un lecteur d’écran', async () => {
		const { typeMath, saisies } = await open('math', { ephemeral: true });

		await typeMath('dériver x^3{Enter}');

		const saisie = await vi.waitFor(() => {
			expect(saisies()).toHaveLength(1);
			return saisies()[0];
		});
		// Composée par MathLive, cachée aux lecteurs d'écran…
		const shown = saisie.querySelector('[aria-hidden="true"]');
		expect(shown?.querySelector('.ML__latex, .ML__base')).toBeTruthy();
		expect(shown?.textContent).toContain('dériver');
		expect(shown?.textContent?.trim().startsWith('.')).toBe(false);
		// …qui lisent l'écriture sans le point
		expect(saisie.querySelector('.sr-only')?.textContent).toBe('dériver x^3');
	});

	it('une ligne tapée en mode texte reste telle qu’elle a été tapée', async () => {
		const { submitText, saisies } = await open('text', { ephemeral: true });

		await submitText('.dériver x^3');

		await vi.waitFor(() => expect(saisies()).toHaveLength(1));
		expect(saisies()[0].textContent).toBe('.dériver x^3');
	});

	it('au rechargement, la ligne revient écrite de même', async () => {
		const first = await open('math');
		await first.typeMath('dériver x^3{Enter}');
		await vi.waitFor(() => expect(first.saisies()).toHaveLength(1));
		// Le démontage range ce qui attendait encore (rangement différé)
		await first.view.unmount();

		const second = await open('math');

		const saisie = await vi.waitFor(() => {
			expect(second.saisies()).toHaveLength(1);
			return second.saisies()[0];
		});
		expect(
			saisie.querySelector('[aria-hidden="true"] .ML__latex, [aria-hidden="true"] .ML__base')
		).toBeTruthy();
		expect(saisie.querySelector('.sr-only')?.textContent).toBe('dériver x^3');
	});

	it('une saisie écrite forgée dans le stockage ne compose rien', async () => {
		localStorage.setItem(
			CALC_HISTORY_STORAGE_KEY,
			JSON.stringify({
				version: CALC_HISTORY_VERSION,
				lines: [
					{
						label: 'piège',
						text: 'texte sûr',
						failed: false,
						inputLatex: '\\htmlStyle{background:url(https://evil.example/x)}{x}'
					}
				],
				typed: []
			})
		);

		const { saisies, container } = await open('math');

		const saisie = await vi.waitFor(() => {
			expect(saisies()).toHaveLength(1);
			return saisies()[0];
		});
		expect(saisie.textContent).toBe('piège');
		expect(container.querySelector('.historique [style*="evil"]')).toBeNull();
	});
});

describe('une saisie forgée dans le stockage, rappelée puis validée', () => {
	// Audit du 2026-10-14 : les `typed` relus ne sont filtrés qu'en longueur ;
	// ↑ les remet dans le champ, Entrée les validait composés dans la page
	it('se montre en texte, sans rien composer', async () => {
		const poison = String.raw`\htmlStyle{position:fixed;background:url(https://evil.example/p.png)}{x}`;
		localStorage.setItem(
			CALC_HISTORY_STORAGE_KEY,
			JSON.stringify({ version: CALC_HISTORY_VERSION, lines: [], typed: [poison] })
		);
		const { typeMath, saisies, container } = await open('math');

		await typeMath('{ArrowUp}');
		await userEvent.keyboard('{Enter}');

		await vi.waitFor(() => expect(saisies()).toHaveLength(1));
		expect(saisies()[0].querySelector('[aria-hidden="true"]')).toBeNull();
		expect(container.querySelector('[style*="evil"]')).toBeNull();
	});
});

// =============================================================================
// La consigne du champ vide
// =============================================================================

describe('le champ mathématique vide dit quoi y écrire', () => {
	it('une consigne, comme le champ texte', async () => {
		const { mathField } = await open('math', { ephemeral: true });

		const field = await vi.waitFor(() => {
			expect(mathField()).toBeTruthy();
			return mathField();
		});

		expect(field.placeholder).toContain('résoudre');
		expect(field.placeholder).toContain('km');
	});
});
