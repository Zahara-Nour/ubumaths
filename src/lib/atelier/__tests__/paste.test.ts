/**
 * Insertion d'un collage — §6 bis N1 à N4.
 *
 * La logique pure est ici ; l'annulation réelle est vérifiée dans un navigateur
 * par `paste.svelte.test.ts`.
 */

import { describe, it, expect, vi } from 'vitest';
import { insertPasted } from '../paste';

function fakeField() {
	return { executeCommand: vi.fn(() => true) };
}

describe('insertPasted', () => {
	// N1 — ce qui est collé est réécrit en LaTeX
	it('insère la forme normalisée d’un texte en syntaxe custom', () => {
		const field = fakeField();
		insertPasted(field, 'sin(x)');

		expect(field.executeCommand).toHaveBeenCalledTimes(1);
		const [command] = field.executeCommand.mock.calls[0];
		expect(Array.isArray(command)).toBe(true);
		expect((command as unknown[])[0]).toBe('insert');
		expect(String((command as unknown[])[1])).toContain('\\sin');
	});

	// N2 — du LaTeX collé reste du LaTeX
	it('insère une fraction LaTeX sans l’abîmer', () => {
		const field = fakeField();
		insertPasted(field, '\\frac{1}{2}');
		expect(String((field.executeCommand.mock.calls[0][0] as unknown[])[1])).toContain('frac');
	});

	// ⚠️ Le piège mesuré : setValue écrase la pile d'annulation, insert la nourrit
	it('passe par « insert », jamais par une réécriture complète', () => {
		const field = fakeField();
		insertPasted(field, 'sin(x)');
		expect((field.executeCommand.mock.calls[0][0] as unknown[])[0]).toBe('insert');
	});

	// E1 — collage vide
	it('ne fait rien pour un collage vide', () => {
		const field = fakeField();
		insertPasted(field, '');
		insertPasted(field, '   ');
		expect(field.executeCommand).not.toHaveBeenCalled();
	});
});
