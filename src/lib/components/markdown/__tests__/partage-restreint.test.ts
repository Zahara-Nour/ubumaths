/**
 * Bloc ```partage dans le chat élève (rendu restreint) : exclu par défaut, comme
 * tout bloc spécial (invariant 8 de `docs/systeme/ubumark.md`).
 */
import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import {
	RESTRICTED_BLOCK_PLACEHOLDER,
	restrictDocument,
	stripFenceLanguages
} from '../restricted-rendering';

const SOURCE = '```partage\nforme: bande 8\n```';

describe('bloc ```partage en rendu restreint', () => {
	it('la langue retirée, le bloc n’est plus qu’un bloc de code en texte', () => {
		const doc = parseMarkdown(stripFenceLanguages(SOURCE));
		expect(doc.children.map((c) => c.type)).toEqual(['code-block']);
	});

	it('un nœud partage qui aurait échappé au retrait devient le cadre neutre', () => {
		const doc = restrictDocument(parseMarkdown(SOURCE));
		expect(doc.children).toEqual([{ type: 'code-block', code: RESTRICTED_BLOCK_PLACEHOLDER }]);
	});

	it('même dans un item de liste', () => {
		const doc = restrictDocument(
			parseMarkdown(`1. Voir :\n\n   ${SOURCE.replace(/\n/g, '\n   ')}`)
		);
		const list = doc.children[0];
		expect(list.type).toBe('list');
		const children = list.type === 'list' ? list.items[0].children : [];
		expect(children.some((c) => c.type === 'partage')).toBe(false);
	});
});
