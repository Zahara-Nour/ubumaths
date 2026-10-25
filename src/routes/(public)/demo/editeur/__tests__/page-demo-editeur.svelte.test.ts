/**
 * Vitrine — l'éditeur de texte (`/demo/editeur`)
 * Comportements validés par David le 2026-10-25 (docs/wip/demo-debug-progress.md, PR 6h).
 *
 * - un visiteur voit le titre, le retour vers `/demo`, un éditeur et trois usages ;
 * - la phrase de départ, formules comprises, apparaît dans les trois usages ;
 * - une phrase changée dans l'éditeur change les trois usages ;
 * - éditeur vidé → les trois usages invitent à écrire ;
 * - rien n'est enregistré : aucune requête d'écriture.
 */
import { describe, it, expect, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from '../+page.svelte';

vi.mock('$lib/dictionary/fetch-dictionary', () => ({ fetchDictionary: async () => [] }));

const USAGES = ['usage-message', 'usage-cahier', 'usage-enonce'];

function usageText(container: HTMLElement, testId: string): string {
	return container.querySelector(`[data-testid="${testId}"]`)?.textContent ?? '';
}

async function editorParagraph(container: HTMLElement): Promise<HTMLElement> {
	await expect.poll(() => container.querySelector('.ProseMirror p')).not.toBeNull();
	return container.querySelector('.ProseMirror p') as HTMLElement;
}

// Un clic au milieu tomberait sur une formule (champ MathLive) : on vise le début du texte
async function focusEditor(container: HTMLElement): Promise<void> {
	await userEvent.click(await editorParagraph(container), { position: { x: 3, y: 5 } });
}

describe('/demo/editeur', () => {
	it('montre au visiteur le titre, le retour vers /demo et trois usages', async () => {
		await render(Page);

		await expect
			.element(page.getByRole('heading', { level: 1 }))
			.toHaveTextContent('L’éditeur de texte');
		await expect
			.element(page.getByRole('link', { name: /démonstrations/ }))
			.toHaveAttribute('href', '/demo');
		await expect
			.element(page.getByText('Un message au professeur', { exact: true }))
			.toBeInTheDocument();
		await expect.element(page.getByText('Le cahier de texte', { exact: true })).toBeInTheDocument();
		await expect
			.element(page.getByText('Un énoncé d’exercice', { exact: true }))
			.toBeInTheDocument();
		await expect
			.element(page.getByText('Rien n’est enregistré sur cette page.'))
			.toBeInTheDocument();
	});

	it('la phrase de départ et sa formule apparaissent dans les trois usages', async () => {
		const { container } = await render(Page);

		for (const testId of USAGES) {
			await expect.poll(() => usageText(container, testId)).toContain('La solution de');
		}
		// Au cahier de texte, la formule passe par la vraie transformation (champ MathLive en lecture)
		const formulas = [...container.querySelectorAll('[data-testid="usage-cahier"] math-field')];
		expect(formulas.map((f) => f.textContent)).toEqual(['2x+3=11', 'x=4']);
	});

	it('une phrase changée dans l’éditeur change les trois usages', async () => {
		const { container } = await render(Page);
		await focusEditor(container);
		await userEvent.keyboard('{End} Bravo');

		for (const testId of USAGES) {
			await expect.poll(() => usageText(container, testId)).toContain('Bravo');
		}
	});

	it('éditeur vidé : les trois usages invitent à écrire', async () => {
		const { container } = await render(Page);
		await focusEditor(container);
		await userEvent.keyboard('{ControlOrMeta>}a{/ControlOrMeta}{Backspace}');

		for (const testId of USAGES) {
			await expect
				.poll(() => usageText(container, testId))
				.toContain('Écrivez une phrase ci-dessus.');
		}
	});

	it('n’envoie aucune requête d’écriture', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		const { container } = await render(Page);
		await focusEditor(container);
		await userEvent.keyboard('{End} Bravo');
		await expect.poll(() => usageText(container, 'usage-enonce')).toContain('Bravo');

		const methods = fetchSpy.mock.calls.map(([, init]) => (init?.method ?? 'GET').toUpperCase());
		expect(methods.filter((method) => method !== 'GET')).toEqual([]);
	});
});
