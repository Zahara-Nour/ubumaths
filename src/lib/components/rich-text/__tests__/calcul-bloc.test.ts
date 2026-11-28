/**
 * Bloc ```calcul dans l’éditeur riche : un bloc de code `calcul` porte le texte source (comme
 * ```horloge), y compris un bloc en erreur — sinon le bloc disparaîtrait à l'enregistrement.
 */
import { describe, expect, it } from 'vitest';
import { markdownToTipTap } from '../markdown-import';
import { tipTapToMarkdown } from '../markdown-export';

const BLOC = '```calcul\nattendu: afficher (nombre + 2) × 4\nessais: 1 ; 2\n```';

describe('bloc ```calcul — aller-retour de l’éditeur riche', () => {
	it('arrive en bloc de code `calcul` avec son texte', () => {
		expect(markdownToTipTap(BLOC).content?.[0]).toEqual({
			type: 'codeBlock',
			attrs: { language: 'calcul' },
			content: [
				{
					type: 'text',
					text: 'attendu: afficher (nombre + 2) × 4\nessais: 1 ; 2'
				}
			]
		});
	});

	it('repart en ```calcul identique', () => {
		expect(tipTapToMarkdown(markdownToTipTap(BLOC)).trim()).toBe(BLOC);
	});

	it('garde un bloc en erreur au lieu de le faire disparaître', () => {
		const json = markdownToTipTap('```calcul\nattendu: afficher (\n```');
		expect(json.content?.[0]?.attrs).toEqual({ language: 'calcul' });
	});

	it('garde un bloc ```calcul dans un item de liste', () => {
		const md = '1. Calcule :\n\n   ```calcul\n   attendu: afficher nombre\n   ```';
		const out = tipTapToMarkdown(markdownToTipTap(md));
		expect(out).toContain('```calcul');
		expect(out).toContain('attendu: afficher nombre');
	});
});
