/**
 * Bloc ```qr dans l'éditeur riche : un bloc de code `qr` porte le texte source
 * (comme ```courbe), y compris un bloc en erreur.
 */
import { describe, expect, it } from 'vitest';
import { markdownToTipTap } from '../markdown-import';
import { tipTapToMarkdown } from '../markdown-export';
import { QR_TEMPLATE } from '$lib/ubumark/parser/qr-parser';

describe('bloc ```qr — aller-retour de l’éditeur riche', () => {
	it('arrive en bloc de code `qr` avec son texte', () => {
		const json = markdownToTipTap('```qr\n/glossaire\nlégende: Le glossaire\n```');
		expect(json.content?.[0]).toEqual({
			type: 'codeBlock',
			attrs: { language: 'qr' },
			content: [{ type: 'text', text: '/glossaire\nlégende: Le glossaire' }]
		});
	});

	it('repart en ```qr identique', () => {
		const md = '```qr\n/glossaire\ntaille: 4cm\n```';
		expect(tipTapToMarkdown(markdownToTipTap(md)).trim()).toBe(md);
	});

	it('garde un bloc en erreur au lieu de le faire disparaître', () => {
		const json = markdownToTipTap('```qr\njavascript:alert(1)\n```');
		expect(json.content?.[0]?.attrs).toEqual({ language: 'qr' });
	});

	it('garde un bloc ```qr dans un item de liste', () => {
		const md = '1. Scanne :\n\n   ```qr\n   /glossaire\n   ```';
		const out = tipTapToMarkdown(markdownToTipTap(md));
		expect(out).toContain('```qr');
		expect(out).toContain('/glossaire');
	});

	it('le gabarit d’insertion est un bloc valide', () => {
		const json = markdownToTipTap(`\`\`\`qr\n${QR_TEMPLATE}\n\`\`\``);
		expect(json.content?.[0]?.attrs).toEqual({ language: 'qr' });
	});
});
