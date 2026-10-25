/**
 * Bloc ```operation dans l'éditeur riche : un bloc de code `operation` porte le
 * texte source (comme ```qr), y compris un bloc en erreur.
 */
import { describe, expect, it } from 'vitest';
import { markdownToTipTap } from '../markdown-import';
import { tipTapToMarkdown } from '../markdown-export';

describe('bloc ```operation — aller-retour de l’éditeur riche', () => {
	it('arrive en bloc de code `operation` avec son texte', () => {
		const json = markdownToTipTap('```operation\ncalcul: 45 + 37\ncases: aucune\n```');
		expect(json.content?.[0]).toEqual({
			type: 'codeBlock',
			attrs: { language: 'operation' },
			content: [{ type: 'text', text: 'calcul: 45 + 37\ncases: aucune' }]
		});
	});

	it('repart en ```operation identique', () => {
		const md = '```operation\ncalcul: 302 − 7\nméthode: cassage\n```';
		expect(tipTapToMarkdown(markdownToTipTap(md)).trim()).toBe(md);
	});

	it('garde un bloc en erreur au lieu de le faire disparaître', () => {
		const json = markdownToTipTap('```operation\ncalcul: 3 - 5\n```');
		expect(json.content?.[0]?.attrs).toEqual({ language: 'operation' });
	});

	it('garde un bloc ```operation dans un item de liste', () => {
		const md = '1. Pose et calcule :\n\n   ```operation\n   calcul: 45 + 37\n   ```';
		const out = tipTapToMarkdown(markdownToTipTap(md));
		expect(out).toContain('```operation');
		expect(out).toContain('calcul: 45 + 37');
	});
});
