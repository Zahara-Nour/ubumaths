/**
 * Retour arrière quand tout le document est sélectionné (Ctrl+A)
 * ==============================================================
 *
 * Les raccourcis Backspace de la droite graduée et du tableau de variations lisaient
 * `$from.before()` : avec une sélection de tout le document, `$from` est au niveau du document
 * et `before()` lève « There is no position before the top-level node ». Trouvé par la vitrine
 * `/demo/editeur` (chantier demo-debug, PR 6h).
 */
import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { NumberLineExtension } from '../number-line-extension';
import { VariationTableExtension } from '../variation-table-extension';

describe('Retour arrière avec tout le document sélectionné', () => {
	for (const [name, extension] of [
		['droite graduée', NumberLineExtension],
		['tableau de variations', VariationTableExtension]
	] as const) {
		it(`${name} : ne lève rien et laisse l’effacement se faire`, () => {
			const editor = new Editor({
				extensions: [StarterKit, extension],
				content: '<p>Une phrase</p>'
			});
			editor.commands.selectAll();

			expect(() => editor.commands.keyboardShortcut('Backspace')).not.toThrow();
			expect(editor.getText()).toBe('');
			editor.destroy();
		});
	}
});
