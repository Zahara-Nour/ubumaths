/**
 * Bloc ```tortue dans l'éditeur riche : un bloc de code `tortue` porte le texte source (comme
 * ```horloge), y compris un bloc en erreur — sinon le bloc disparaîtrait à l'enregistrement.
 */
import { describe, expect, it } from 'vitest';
import { markdownToTipTap } from '../markdown-import';
import { tipTapToMarkdown } from '../markdown-export';

const BLOC = '```tortue\nattendu: répéter 4 [ avancer 3 ; tourner à droite 90 ]\nmontrer: oui\n```';

describe('bloc ```tortue — aller-retour de l’éditeur riche', () => {
	it('arrive en bloc de code `tortue` avec son texte', () => {
		expect(markdownToTipTap(BLOC).content?.[0]).toEqual({
			type: 'codeBlock',
			attrs: { language: 'tortue' },
			content: [
				{
					type: 'text',
					text: 'attendu: répéter 4 [ avancer 3 ; tourner à droite 90 ]\nmontrer: oui'
				}
			]
		});
	});

	it('repart en ```tortue identique', () => {
		expect(tipTapToMarkdown(markdownToTipTap(BLOC)).trim()).toBe(BLOC);
	});

	it('garde un bloc en erreur au lieu de le faire disparaître', () => {
		const json = markdownToTipTap('```tortue\nattendu: sauter 3\n```');
		expect(json.content?.[0]?.attrs).toEqual({ language: 'tortue' });
	});

	it('garde un bloc ```tortue dans un item de liste', () => {
		const md = '1. Trace :\n\n   ```tortue\n   attendu: avancer 3\n   ```';
		const out = tipTapToMarkdown(markdownToTipTap(md));
		expect(out).toContain('```tortue');
		expect(out).toContain('attendu: avancer 3');
	});
});
