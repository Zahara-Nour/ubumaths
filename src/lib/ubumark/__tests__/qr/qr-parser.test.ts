/**
 * Bloc ```qr — analyse (lot 2 des QR codes, `docs/wip/qr-codes-phase0.md`)
 */

import { describe, expect, it } from 'vitest';
import { parseMarkdown, type ListNode } from '$lib/ubumark';
import type { QrNode } from '$lib/ubumark/types/qr';

const doc = (...lines: string[]) => parseMarkdown(lines.join('\n')).children;

function qrOf(children: readonly { type: string }[]): QrNode {
	const node = children.find((c) => c.type === 'qr');
	expect(node, 'un nœud qr attendu').toBeDefined();
	return node as QrNode;
}

const messages = (node: QrNode) => node.errors.map((e) => e.message);

describe('bloc ```qr — cas nominaux', () => {
	it('lit l’adresse, la légende et la taille', () => {
		const node = qrOf(
			doc(
				'```qr',
				'https://www.chiph.re/glossaire',
				'légende: Le glossaire en ligne',
				'taille: 4cm',
				'```'
			)
		);
		expect(node.errors).toEqual([]);
		expect(node.url).toBe('https://www.chiph.re/glossaire');
		expect(node.caption).toBe('Le glossaire en ligne');
		expect(node.sizeCm).toBe(4);
	});

	it('prend 3 cm et aucune légende par défaut', () => {
		const node = qrOf(doc('```qr', '/glossaire', '```'));
		expect(node.errors).toEqual([]);
		expect(node.url).toBe('https://www.chiph.re/glossaire');
		expect(node.caption).toBeNull();
		expect(node.sizeCm).toBe(3);
	});

	it('accepte la virgule décimale, une espace avant cm, et legende sans accent', () => {
		const node = qrOf(doc('```qr', '/shtam', 'taille: 2,5 cm', 'legende: Le Shtam', '```'));
		expect(node.errors).toEqual([]);
		expect(node.sizeCm).toBe(2.5);
		expect(node.caption).toBe('Le Shtam');
	});

	it('garde le texte du bloc pour l’éditeur riche', () => {
		const node = qrOf(doc('```qr', '/glossaire', 'taille: 3cm', '```'));
		expect(node.source).toBe('/glossaire\ntaille: 3cm');
	});

	it('garde une adresse extérieure telle quelle', () => {
		const node = qrOf(doc('```qr', 'https://fr.wikipedia.org/wiki/Pythagore', '```'));
		expect(node.url).toBe('https://fr.wikipedia.org/wiki/Pythagore');
	});

	it('ne prend pas un $ de l’adresse pour une formule', () => {
		const node = qrOf(doc('```qr', 'https://example.com/a$b$c', '```'));
		expect(node.url).toBe('https://example.com/a$b$c');
	});

	it('laisse le texte qui suit le bloc en paragraphe', () => {
		const children = doc('```qr', '/glossaire', '```', '', 'Scanne ce code.');
		expect(children.map((c) => c.type)).toEqual(['qr', 'paragraph']);
	});
});

describe('bloc ```qr — erreurs (le nœud reste, avec son message)', () => {
	it('adresse manquante', () => {
		const node = qrOf(doc('```qr', '```'));
		expect(node.url).toBeNull();
		expect(messages(node).join(' ')).toMatch(/adresse manquante/);
	});

	it('adresse refusée (javascript:)', () => {
		const node = qrOf(doc('```qr', 'javascript:alert(1)', '```'));
		expect(node.url).toBeNull();
		expect(messages(node)[0]).toMatch(/^Ligne 1 : /);
	});

	it('taille hors bornes', () => {
		expect(messages(qrOf(doc('```qr', '/a', 'taille: 8cm', '```')))[0]).toMatch(
			/Ligne 2 : .*entre 2 et 6 cm/
		);
		expect(messages(qrOf(doc('```qr', '/a', 'taille: 1cm', '```')))[0]).toMatch(/entre 2 et 6/);
	});

	it('taille sans unité', () => {
		expect(messages(qrOf(doc('```qr', '/a', 'taille: 3', '```')))[0]).toMatch(
			/Ligne 2 : .*centimètres/
		);
	});

	it('clé inconnue, nommée dans le message', () => {
		const node = qrOf(doc('```qr', '/a', 'couleur: rouge', '```'));
		expect(messages(node)[0]).toMatch(/Ligne 2 : .*« couleur ».*légende, taille/);
	});

	it('clé donnée deux fois', () => {
		const node = qrOf(doc('```qr', '/a', 'taille: 3cm', 'taille: 4cm', '```'));
		expect(messages(node)[0]).toMatch(/Ligne 3 : .*déjà/);
	});

	it('légende trop longue', () => {
		const node = qrOf(doc('```qr', '/a', `légende: ${'x'.repeat(121)}`, '```'));
		expect(messages(node)[0]).toMatch(/Ligne 2 : .*légende.*120/);
	});

	it('ligne non comprise après l’adresse', () => {
		const node = qrOf(doc('```qr', '/a', '/b', '```'));
		expect(messages(node)[0]).toMatch(/Ligne 2 : /);
	});
});

describe('bloc ```qr non fermé', () => {
	it('s’arrête à la première ligne vide, signale l’oubli, et la suite reste lue', () => {
		const children = doc('```qr', '/glossaire', '', 'Un paragraphe après.', '', '## Titre');
		expect(children.map((c) => c.type)).toEqual(['qr', 'paragraph', 'heading']);
		const node = qrOf(children);
		expect(node.url).toBe('https://www.chiph.re/glossaire');
		expect(messages(node).join(' ')).toMatch(/non fermé/);
	});
});

describe('bloc ```qr dans un item de liste', () => {
	it('est lu comme un nœud qr, fermé', () => {
		const children = doc('1. Scanne :', '', '   ```qr', '   /glossaire', '   ```');
		const list = children.find((c) => c.type === 'list') as ListNode;
		const item = list.items[0].children;
		const node = qrOf(item);
		expect(node.errors).toEqual([]);
		expect(node.url).toBe('https://www.chiph.re/glossaire');
	});
});
