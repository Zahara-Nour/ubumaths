/**
 * Bloc ```scratch dans l'éditeur riche : un bloc de code `scratch` porte le
 * programme (comme ```qr) ; sans lui, le bloc disparaissait du document.
 */
import { describe, expect, it } from 'vitest';
import { markdownToTipTap } from '../markdown-import';
import { tipTapToMarkdown } from '../markdown-export';

const PROGRAMME =
	"mettre [a v] à (5)\nrépéter jusqu'à ce que <(a) > [20]>\nmettre [a v] à ((a) * (2))\nfin\n\ndire (a)";

describe('bloc ```scratch — aller-retour de l’éditeur riche', () => {
	it('arrive en bloc de code `scratch` avec son programme', () => {
		const json = markdownToTipTap(`\`\`\`scratch\n${PROGRAMME}\n\`\`\``);
		expect(json.content?.[0]).toEqual({
			type: 'codeBlock',
			attrs: { language: 'scratch' },
			content: [{ type: 'text', text: PROGRAMME }]
		});
	});

	it('repart en ```scratch identique', () => {
		const md = `\`\`\`scratch\n${PROGRAMME}\n\`\`\``;
		expect(tipTapToMarkdown(markdownToTipTap(md)).trim()).toBe(md);
	});

	it('garde un bloc vide (en erreur) au lieu de le faire disparaître', () => {
		const json = markdownToTipTap('```scratch\n```');
		expect(json.content?.[0]?.attrs).toEqual({ language: 'scratch' });
	});

	it('garde un bloc ```scratch dans un item de liste', () => {
		const md = '1. Que dit le lutin ?\n\n   ```scratch\n   dire [Bonjour]\n   ```';
		const out = tipTapToMarkdown(markdownToTipTap(md));
		expect(out).toContain('```scratch');
		expect(out).toContain('dire [Bonjour]');
	});
});
