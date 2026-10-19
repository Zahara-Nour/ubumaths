/**
 * Les lignes de Calcul gardées au rechargement, vues depuis l'écran : un
 * atelier monté, des lignes tapées, démonté puis remonté (un rechargement).
 *
 * ⚠️ Ce qui revient du `localStorage` est NON FIABLE : la vue compose les
 * formules par `convertLatexToMarkup` puis `{@html}`. Les tests
 * d'empoisonnement regardent le DOM rendu, pas seulement les données.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { cleanup, render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import AtelierContainer from '$lib/components/atelier/AtelierContainer.svelte';
import { Atelier } from '../atelier.svelte';
import { CALC_HISTORY_STORAGE_KEY, CALC_HISTORY_VERSION } from '../history-storage';

const ATELIER_KEY = 'chiphre-atelier';

function forget() {
	localStorage.removeItem(CALC_HISTORY_STORAGE_KEY);
	localStorage.removeItem(ATELIER_KEY);
}

// ⚠️ Démonter AVANT d'oublier : le démontage range ce qui attendait encore, et
// les tests suivants (d'autres fichiers aussi) le reliraient
beforeEach(forget);
afterEach(() => {
	cleanup();
	forget();
});

/** La réponse d'une ligne, boutons compris, espaces réduits. */
function answer(li: Element): string {
	return (li.querySelector('.reponse')?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Tous les attributs du DOM rendu : aucun ne doit venir du stockage forgé. */
function attributes(root: Element): string[] {
	return [root, ...root.querySelectorAll('*')].flatMap((el) =>
		[...el.attributes].map((a) => `${a.name}=${a.value}`)
	);
}

/** Laisser Svelte appliquer ses effets ET le DOM se mettre à jour. */
async function settle() {
	await tick();
	await new Promise((r) => setTimeout(r, 0));
	await tick();
}

async function open(options: { ephemeral?: boolean } = {}) {
	const view = await render(AtelierContainer, { atelier: new Atelier(), ...options });
	await settle();
	const field = view.container.querySelector(
		'input[aria-label="Calcul, définition ou commande"]'
	) as HTMLInputElement;

	async function submit(text: string) {
		field.value = text;
		field.dispatchEvent(new Event('input', { bubbles: true }));
		await settle();
		(field.form as HTMLFormElement).requestSubmit();
		await settle();
	}

	const lines = () => [...view.container.querySelectorAll('.historique li')];
	const labels = () => lines().map((li) => li.querySelector('.saisie')?.textContent);

	return { container: view.container, unmount: view.unmount, field, submit, lines, labels };
}

describe('au rechargement, les lignes de Calcul reviennent', () => {
	it('telles qu’affichées, sans « Garder » ni « Comment ? », avec le bouton ≈', async () => {
		const first = await open();
		await first.submit('1/7');
		await first.submit('.résoudre 2x+1=5');
		await first.submit('.résoudre');
		expect(first.lines()).toHaveLength(3);
		const before = first.lines().map(answer);
		await first.unmount();

		const second = await open();

		expect(second.labels()).toEqual(['1/7', '.résoudre 2x+1=5', '.résoudre']);
		expect(second.lines().map(answer)).toEqual(
			before.map((text) => text.replace(/ ?(Garder…|Comment \?)/g, ''))
		);
		// En mathématiques, comme avant le rechargement
		expect(second.lines()[0].querySelector('.math .ML__latex')).not.toBeNull();
		expect(second.lines()[2].classList.contains('refus')).toBe(true);
		const buttons = second.lines().flatMap((li) => [...li.querySelectorAll('button')]);
		// Ni « Garder » ni « Comment ? » ; « Copier » reste, la réponse a sa formule
		expect(buttons.map((b) => b.textContent?.trim() || b.getAttribute('aria-label'))).toEqual([
			'Valeur approchée',
			'Copier',
			'Autres façons de copier',
			'Copier',
			'Autres façons de copier'
		]);
	});

	it('↑ rappelle la dernière saisie tapée', async () => {
		const first = await open();
		await first.submit('2+3');
		await first.unmount();

		const second = await open();
		second.field.focus();
		second.field.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
		await settle();

		expect(second.field.value).toBe('2+3');
	});

	it('« Repartir de zéro » vide aussi ce qui est rangé', async () => {
		const first = await open();
		await first.submit('2+3');
		await vi.waitFor(() => expect(localStorage.getItem(CALC_HISTORY_STORAGE_KEY)).not.toBeNull());
		(
			[...first.container.querySelectorAll('button')].find(
				(b) => b.getAttribute('aria-label') === 'Repartir de zéro'
			) as HTMLButtonElement
		).click();
		const confirm = await vi.waitFor(() => {
			const found = [...document.querySelectorAll('[role="dialog"] button')].find((b) =>
				b.textContent?.includes('Vider')
			) as HTMLButtonElement | undefined;
			expect(found).toBeTruthy();
			return found!;
		});
		confirm.click();
		// Les lignes d'avant partent (C3) ; reste la ligne de l'étape, que Ctrl+Z
		// barrerait (lot 5, PR 3)
		await vi.waitFor(() => expect(first.lines()).toHaveLength(1));
		await first.unmount();

		expect(localStorage.getItem(CALC_HISTORY_STORAGE_KEY)).not.toContain('2+3');
		const second = await open();
		expect(second.lines()).toHaveLength(1);
		expect(second.lines()[0].textContent).toContain('Atelier vidé.');
	});

	it('un atelier reçu par lien ne lit ni n’écrit l’historique de l’élève', async () => {
		const first = await open();
		await first.submit('2+3');
		await first.unmount();
		const kept = localStorage.getItem(CALC_HISTORY_STORAGE_KEY);
		expect(kept).not.toBeNull();

		const received = await open({ ephemeral: true });
		expect(received.lines()).toHaveLength(0);
		await received.submit('4+4');
		await new Promise((r) => setTimeout(r, 700));
		await received.unmount();

		expect(localStorage.getItem(CALC_HISTORY_STORAGE_KEY)).toBe(kept);
	});
});

describe('un stockage empoisonné ne compose rien de dangereux', () => {
	it('aucun lien, style, classe, id ni attribut data forgé dans le DOM', async () => {
		const poisons = [
			'\\href{https://evil.example}{x}',
			'\\htmlStyle{background:url(https://evil.example/x)}{x}',
			'\\class{evil}{x}',
			'\\cssId{evil}{x}',
			'\\htmlData{foo=bar}{x}',
			'\\text{\\htmlStyle{background:url(https://evil.example/y)}{x}}',
			// Un ZWJ fait avaler à MathLive le premier `\` de `\\` (audit du 2026-10-14)
			'a\u200D\\\\htmlStyle{background:url(https://evil.example/z)}{x}',
			'\u{1F1EB}\\\\class{evil}{x}'
		];
		localStorage.setItem(
			CALC_HISTORY_STORAGE_KEY,
			JSON.stringify({
				version: CALC_HISTORY_VERSION,
				lines: [
					...poisons.map((latex) => ({ label: 'piège', text: 'texte sûr', latex, failed: false })),
					{
						label: 'piège ≈',
						text: 'texte sûr',
						failed: false,
						alternative: { label: 'Valeur approchée', latex: poisons[1] }
					},
					{
						label: 'piège $',
						text: `refus : $${poisons[1]}$`,
						failed: true,
						formulas: true
					}
				],
				typed: ['<img src=x onerror=alert(1)>']
			})
		);

		const view = await open();

		expect(view.lines()).toHaveLength(poisons.length + 2);
		expect(view.container.querySelector('a[href]')).toBeNull();
		expect(view.container.querySelector('.evil, #evil, [data-foo]')).toBeNull();
		expect(view.container.querySelector('.historique img')).toBeNull();
		expect(view.container.querySelector('.historique .math')).toBeNull();
		// `evil.example` reste lisible dans le texte de repli, jamais dans un attribut
		expect(attributes(view.container).filter((a) => a.includes('evil'))).toEqual([]);
		// Le texte de repli, échappé par Svelte
		expect(view.lines()[0].querySelector('.texte')?.textContent).toBe('texte sûr');
		expect(view.lines().at(-1)?.querySelector('.texte')?.textContent).toBe(
			`refus : $${poisons[1]}$`
		);
		// L'atelier marche toujours
		await view.submit('1+1');
		expect(view.lines()).toHaveLength(poisons.length + 3);
	});

	it('un état illisible : Calcul repart vide, l’atelier marche', async () => {
		localStorage.setItem(CALC_HISTORY_STORAGE_KEY, '{"version":1,"lines":[{"label":');

		const view = await open();

		expect(view.lines()).toHaveLength(0);
		await view.submit('1+1');
		expect(view.lines()).toHaveLength(1);
	});
});
