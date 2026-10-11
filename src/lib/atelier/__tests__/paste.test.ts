/**
 * Insertion d'un collage — §6 bis N1 à N4.
 *
 * La logique pure est ici ; l'annulation réelle est vérifiée dans un navigateur
 * par `paste.svelte.test.ts`.
 */

import { describe, it, expect, vi } from 'vitest';
import { insertPasted, type InsertableField } from '../paste';

function fakeField() {
	return { executeCommand: vi.fn<InsertableField['executeCommand']>(() => true) };
}

/** La commande du premier appel, AFFIRMÉE sous forme de tableau `[nom, ...args]`. */
function firstCommand(field: ReturnType<typeof fakeField>): [string, ...unknown[]] {
	const call = field.executeCommand.mock.calls[0];
	expect(call).toBeDefined();
	const [command] = call;
	expect(Array.isArray(command)).toBe(true);
	if (!Array.isArray(command)) throw new Error('commande attendue sous forme de tableau');
	return command;
}

describe('insertPasted', () => {
	// N1 — ce qui est collé est réécrit en LaTeX
	it('insère la forme normalisée d’un texte en syntaxe custom', () => {
		const field = fakeField();
		insertPasted(field, 'sin(x)');

		expect(field.executeCommand).toHaveBeenCalledTimes(1);
		const command = firstCommand(field);
		expect(command[0]).toBe('insert');
		expect(String(command[1])).toContain('\\sin');
	});

	// N2 — du LaTeX collé reste du LaTeX
	it('insère une fraction LaTeX sans l’abîmer', () => {
		const field = fakeField();
		insertPasted(field, '\\frac{1}{2}');
		expect(String(firstCommand(field)[1])).toContain('frac');
	});

	// ⚠️ Le piège mesuré : setValue écrase la pile d'annulation, insert la nourrit
	it('passe par « insert », jamais par une réécriture complète', () => {
		const field = fakeField();
		insertPasted(field, 'sin(x)');
		expect(firstCommand(field)[0]).toBe('insert');
	});

	// E1 — collage vide
	it('ne fait rien pour un collage vide', () => {
		const field = fakeField();
		insertPasted(field, '');
		insertPasted(field, '   ');
		expect(field.executeCommand).not.toHaveBeenCalled();
	});
});
