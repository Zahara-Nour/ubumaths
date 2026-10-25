/**
 * Bloc ```construction dans l'éditeur riche : il garde son nom (pas ```figure)
 * et son texte, lignes `outils:` / `verifier:` comprises.
 */
import { describe, expect, it } from 'vitest';
import { markdownToTipTap } from '../markdown-import';
import { tipTapToMarkdown } from '../markdown-export';

const MD = [
	'```construction',
	'fenetre: 0 ; 10 ; 0 ; 6',
	'outils: droite',
	'verifier: droite_par A ; B',
	'---',
	'A = point(1, 2)',
	'B = point(7, 2)',
	'```'
].join('\n');

describe('bloc ```construction — aller-retour de l’éditeur riche', () => {
	it('arrive en bloc de code `construction`', () => {
		expect(markdownToTipTap(MD).content?.[0]?.attrs).toEqual({ language: 'construction' });
	});

	it('repart en ```construction identique', () => {
		expect(tipTapToMarkdown(markdownToTipTap(MD)).trim()).toBe(MD);
	});

	it('dans un item de liste aussi', () => {
		const md = `1. Trace :\n\n   ${MD.split('\n').join('\n   ')}`;
		const out = tipTapToMarkdown(markdownToTipTap(md));
		expect(out).toContain('```construction');
		expect(out).toContain('verifier: droite_par A ; B');
	});
});
