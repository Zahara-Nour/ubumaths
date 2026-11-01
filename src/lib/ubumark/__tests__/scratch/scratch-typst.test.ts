/**
 * Bloc ```scratch au PDF, palier 1 : le programme en texte monospace (repli
 * décidé le 2026-11-01) ; le dessin au PDF viendra au palier 2.
 */
import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';

const typst = (...lines: string[]) => generateTypst(parseMarkdown(lines.join('\n')));

describe('bloc ```scratch au PDF (palier 1)', () => {
	it('le programme en bloc de texte brut, lignes et signes intacts', () => {
		const out = typst(
			'```scratch',
			'mettre [a v] à (5)',
			'si <(a) > [3]> alors',
			'dire (a)',
			'fin',
			'```'
		);
		expect(out).toContain('```\nmettre [a v] à (5)\nsi <(a) > [3]> alors\ndire (a)\nfin\n```');
	});

	it('bloc en erreur : « Programme indisponible »', () => {
		const out = typst('```scratch', '```');
		expect(out).toContain('Programme indisponible');
	});
});
