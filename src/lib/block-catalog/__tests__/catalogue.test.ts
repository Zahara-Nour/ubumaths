/**
 * Catalogue des blocs : chaque exemple est accepté par le parseur, chaque
 * erreur typique produit bien le message annoncé.
 */
import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import { BLOCK_CATALOG } from '..';
import { checkScratchProgram } from '$lib/ubumark/utils/scratch-check';

/** Le seul bloc du document, et ses messages d'erreur */
function parseSingleBlock(source: string): { type: string; messages: string[] } {
	const children = parseMarkdown(source).children;
	expect(children).toHaveLength(1);
	// Messages situés (`{ message }`), ou phrases (```ranger)
	const node = children[0] as {
		type: string;
		source?: string;
		errors?: ({ message: string } | string)[];
	};
	const messages = (node.errors ?? []).map((e) => (typeof e === 'string' ? e : e.message));
	// ```scratch : les instructions sont vérifiées hors du parseur (au rendu)
	if (node.type === 'scratch' && node.source !== undefined) {
		messages.push(...checkScratchProgram(node.source).map((e) => e.message));
	}
	return { type: node.type, messages };
}

describe('catalogue des blocs', () => {
	it('a des segments d’adresse uniques', () => {
		const slugs = BLOCK_CATALOG.map((entry) => entry.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	describe.each(BLOCK_CATALOG)('$title', (entry) => {
		it.each([...entry.examples, { title: 'Essayer', source: entry.tryIt }])(
			'exemple « $title » accepté',
			({ source }) => {
				const { type, messages } = parseSingleBlock(source);
				expect(messages).toEqual([]);
				expect(type).toBe(entry.nodeType);
			}
		);

		it.each(entry.mistakes)('erreur « $title » signalée', ({ source, message }) => {
			const { type, messages } = parseSingleBlock(source);
			if (message === undefined) return;
			expect(type).toBe(entry.nodeType);
			expect(messages.join('\n')).toContain(message);
		});

		it('ouvre chaque exemple par l’un de ses mots de bloc', () => {
			for (const { source } of [...entry.examples, ...entry.mistakes]) {
				const language = source.split('\n')[0].slice(3);
				expect(entry.fences).toContain(language);
			}
		});
	});
});
