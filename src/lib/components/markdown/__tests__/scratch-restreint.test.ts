/**
 * Bloc ```scratch dans le chat élève (rendu restreint, liste blanche) : pas
 * dessiné, comme tous les blocs spéciaux (invariant 8 de `ubumark.md`).
 */
import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import {
	RESTRICTED_BLOCK_PLACEHOLDER,
	restrictDocument,
	stripFenceLanguages
} from '../restricted-rendering';

const SOURCE = '```scratch\ndire [Bonjour]\n```';

describe('bloc ```scratch en rendu restreint', () => {
	it('la langue retirée, le bloc n’est plus qu’un bloc de code en texte', () => {
		const doc = parseMarkdown(stripFenceLanguages(SOURCE));
		expect(doc.children.map((c) => c.type)).toEqual(['code-block']);
	});

	it('un nœud scratch qui aurait échappé au retrait devient le cadre neutre', () => {
		const doc = restrictDocument(parseMarkdown(SOURCE));
		expect(doc.children).toEqual([{ type: 'code-block', code: RESTRICTED_BLOCK_PLACEHOLDER }]);
	});
});
