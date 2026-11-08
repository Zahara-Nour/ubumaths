/**
 * RiddleForm — énoncé et correction écrits en ubumark (chantier cahier-ubumark, PR 4).
 *
 * Constat : le formulaire écrivait du HTML (`bind:htmlValue`) alors que toutes les
 * pages de lecture rendent l'énoncé et la correction en markdown (`MarkdownRenderer`) :
 * une énigme écrite s'affichait avec ses balises `<p>` en clair.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import RiddleForm from '../RiddleForm.svelte';
import type { CreateRiddleData, DbRiddle } from '$lib/types/riddle';

// ============================================================================
// CONSTANTES
// ============================================================================

const RIDDLE: DbRiddle = {
	id: '11111111-1111-4111-8111-111111111111',
	riddle_number: 3,
	title: 'Le puits',
	genre: null,
	difficulty: 1,
	statement: 'Énoncé **gras** et $x^2$',
	correction: 'Correction *ici*',
	image_url: null,
	answer: null,
	created_by: '22222222-2222-4222-8222-222222222222',
	status: 'draft',
	created_at: '2026-10-01T00:00:00Z',
	updated_at: '2026-10-01T00:00:00Z'
};

// ============================================================================
// FONCTIONS
// ============================================================================

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

function submitButton(container: HTMLElement): HTMLButtonElement {
	const button = container.querySelector<HTMLButtonElement>('button[type="submit"]');
	if (!button) throw new Error('bouton d’envoi introuvable');
	return button;
}

function editors(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>('.ProseMirror'));
}

function sent(onSubmit: ReturnType<typeof vi.fn>): CreateRiddleData {
	expect(onSubmit).toHaveBeenCalledTimes(1);
	return onSubmit.mock.calls[0][0] as CreateRiddleData;
}

// ============================================================================
// TESTS
// ============================================================================

describe('RiddleForm : énoncé et correction en ubumark', () => {
	it('édition : recharge le markdown et le renvoie sans perte, dernier mot compris', async () => {
		const onSubmit = vi.fn();
		const { container } = await render(RiddleForm, {
			riddle: RIDDLE,
			onSubmit,
			onCancel: () => {}
		});
		await pause(300);

		const [statementEditor] = editors(container);
		// Rendu dans l'éditeur, pas les marques en clair
		expect(statementEditor.querySelector('strong')?.textContent).toBe('gras');

		await userEvent.click(statementEditor);
		await userEvent.keyboard('{Control>}{End}{/Control} fin');
		// Envoi immédiat : la liaison markdown de l'éditeur attend 150 ms
		submitButton(container).click();

		const data = sent(onSubmit);
		expect(data.statement).toContain('**gras**');
		expect(data.statement).toContain('$x^2$');
		expect(data.statement).toContain('fin');
		expect(data.statement).not.toContain('<');
		expect(data.correction).toBe('Correction *ici*');
	});

	it('clic avant la création des éditeurs : le contenu chargé est gardé, rien n’est effacé', async () => {
		const onSubmit = vi.fn();
		const { container } = await render(RiddleForm, {
			riddle: RIDDLE,
			onSubmit,
			onCancel: () => {}
		});
		submitButton(container).click();

		const data = sent(onSubmit);
		expect(data.statement).toBe(RIDDLE.statement);
		expect(data.correction).toBe(RIDDLE.correction);
	});

	it('création : le texte tapé part en markdown, sans balise', async () => {
		const onSubmit = vi.fn();
		const { container } = await render(RiddleForm, { onSubmit, onCancel: () => {} });
		await pause(300);
		expect(submitButton(container).disabled).toBe(true);

		await userEvent.type(container.querySelector<HTMLInputElement>('#title')!, 'Titre');
		const [statementEditor, correctionEditor] = editors(container);
		await userEvent.click(statementEditor);
		await userEvent.keyboard('Un <b>texte</b>');
		await userEvent.click(correctionEditor);
		await userEvent.keyboard('La solution');
		await pause(300);
		submitButton(container).click();

		const data = sent(onSubmit);
		expect(data.statement).not.toMatch(/^<p>/);
		expect(data.statement).toContain('Un');
		expect(data.statement).toContain('texte');
		expect(data.correction).toBe('La solution');
	});
});
