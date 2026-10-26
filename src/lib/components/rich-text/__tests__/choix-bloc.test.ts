/**
 * Bloc ```choix dans l'éditeur riche : un bloc de code `choix` porte le texte
 * source (comme ```horloge), y compris un bloc en erreur ; un choix qui contient
 * un bloc garde sa clôture ```` à l'aller-retour.
 */
import { describe, expect, it } from 'vitest';
import { markdownToTipTap } from '../markdown-import';
import { tipTapToMarkdown } from '../markdown-export';

describe('bloc ```choix — aller-retour de l’éditeur riche', () => {
	it('arrive en bloc de code `choix` avec son texte', () => {
		const json = markdownToTipTap('```choix\nmelanger: non\n- Vrai\n- Faux\n```');
		expect(json.content?.[0]).toEqual({
			type: 'codeBlock',
			attrs: { language: 'choix' },
			content: [{ type: 'text', text: 'melanger: non\n- Vrai\n- Faux' }]
		});
	});

	it('repart en ```choix identique', () => {
		const md = 'Lesquels sont pairs ?\n\n```choix\nplusieurs: oui\n- $2$\n- $3$\n- $4$\n```';
		expect(tipTapToMarkdown(markdownToTipTap(md)).trim()).toBe(md);
	});

	it('garde un bloc en erreur au lieu de le faire disparaître', () => {
		const json = markdownToTipTap('```choix\n- seul\n```');
		expect(json.content?.[0]?.attrs).toEqual({ language: 'choix' });
	});

	it('un choix qui contient un bloc : clôture ```` gardée', () => {
		const md = '````choix\n- ```horloge\n  heure: 3:00\n  ```\n- b\n````';
		expect(tipTapToMarkdown(markdownToTipTap(md)).trim()).toBe(md);
	});
});
