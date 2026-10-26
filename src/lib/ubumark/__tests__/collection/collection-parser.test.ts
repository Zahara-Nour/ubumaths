/**
 * Bloc ```collection — analyse (phase 0 : `docs/archive/wip/collection-progress.md` § 2, 3, 8 bis)
 */

import { describe, expect, it } from 'vitest';
import { parseMarkdown, type ListNode } from '$lib/ubumark';
import {
	parseCollectionContent,
	withChoiceCollectionSize
} from '$lib/ubumark/parser/collection-parser';
import { resolveText } from '$lib/ubumark/parameterization/resolver/text-resolver';
import type { CollectionNode } from '$lib/ubumark/types/collection';

const doc = (...lines: string[]) => parseMarkdown(lines.join('\n')).children;

function collectionOf(children: readonly { type: string }[]): CollectionNode {
	const node = children.find((c) => c.type === 'collection');
	expect(node, 'un nœud collection attendu').toBeDefined();
	return node as CollectionNode;
}

const parse = (...lines: string[]) => parseCollectionContent(lines.join('\n'));
const messages = (node: CollectionNode) => node.errors.map((e) => e.message);

describe('bloc ```collection — cas nominaux', () => {
	it('vrac seul : réglages par défaut (comportement 1)', () => {
		const node = collectionOf(doc('```collection', 'unités: 23', '```'));
		expect(node.errors).toEqual([]);
		expect(node.spec).toEqual({
			sets: [{ tens: 0, units: 23 }],
			captions: null,
			drawing: 'barres',
			unitLayout: 'vrac',
			sizeCm: null
		});
	});

	it('dizaines et unités, paquets (comportements 2, 3)', () => {
		const node = parse('dizaines: 4', 'unités: 7', 'dessin: paquets');
		expect(node.errors).toEqual([]);
		expect(node.spec?.sets).toEqual([{ tens: 4, units: 7 }]);
		expect(node.spec?.drawing).toBe('paquets');
	});

	it('groupement partiel : plus de 9 unités à côté des dizaines (comportement 4)', () => {
		expect(parse('dizaines: 3', 'unités: 15').spec?.sets).toEqual([{ tens: 3, units: 15 }]);
	});

	it('dizaines seules : unités à 0 (limite 13)', () => {
		expect(parse('dizaines: 5').spec?.sets).toEqual([{ tens: 5, units: 0 }]);
	});

	it('plusieurs collections et leurs légendes (comportement 5, décision 7)', () => {
		const node = parse(
			'dizaines: 2 ; 3',
			'unités: 8 ; 1',
			'légendes: Léa ; Tom',
			'unités en: rangées',
			'taille: 4,5 cm'
		);
		expect(node.errors).toEqual([]);
		expect(node.spec).toEqual({
			sets: [
				{ tens: 2, units: 8 },
				{ tens: 3, units: 1 }
			],
			captions: ['Léa', 'Tom'],
			drawing: 'barres',
			unitLayout: 'rangées',
			sizeCm: 4.5
		});
	});

	it('une seule ligne de quantités pour plusieurs collections : l’autre vaut 0', () => {
		expect(parse('unités: 31 ; 0 ; 12').spec?.sets).toEqual([
			{ tens: 0, units: 31 },
			{ tens: 0, units: 0 },
			{ tens: 0, units: 12 }
		]);
	});

	it('collection vide, 100 en barres, 100 en vrac : acceptés (limites 9, 10, décision 3)', () => {
		expect(parse('unités: 0').errors).toEqual([]);
		expect(parse('dizaines: 10').errors).toEqual([]);
		expect(parse('unités: 100').errors).toEqual([]);
		expect(parse('dizaines: 9', 'unités: 10').errors).toEqual([]);
	});

	it('sans accent : unites, legendes, rangees, unites en', () => {
		const node = parse('unites: 4 ; 5', 'legendes: A ; B', 'unites en: rangees');
		expect(node.errors).toEqual([]);
		expect(node.spec?.unitLayout).toBe('rangées');
		expect(node.spec?.captions).toEqual(['A', 'B']);
	});

	it('garde le texte du bloc pour l’éditeur riche', () => {
		expect(parse('unités: 3', 'dessin: paquets').source).toBe('unités: 3\ndessin: paquets');
	});

	it('variables d’un modèle résolues avant le bloc', () => {
		const text = resolveText('```collection\ndizaines: {{d}}\nunités: {{u}}\n```', [
			{ name: 'd', value: '3' },
			{ name: 'u', value: '15' }
		]);
		expect(collectionOf(parseMarkdown(text).children).spec?.sets).toEqual([{ tens: 3, units: 15 }]);
	});

	it('ne prend pas un $ de l’énoncé autour pour une formule du bloc', () => {
		const children = doc('Calcule $1+1$.', '', '```collection', 'unités: 4', '```', '', 'Et $2$.');
		expect(collectionOf(children).errors).toEqual([]);
		expect(children.map((c) => c.type)).toEqual(['paragraph', 'collection', 'paragraph']);
	});
});

describe('bloc ```collection — erreurs (le nœud reste, avec son message)', () => {
	it('pas de quantité', () => {
		const node = parse('dessin: paquets');
		expect(node.spec).toBeNull();
		expect(messages(node).join()).toContain('unités:');
	});

	it('bloc vide', () => {
		expect(parse('').spec).toBeNull();
	});

	it.each(['2,5', '-1', 'trois', '{{n}}', ''])('quantité illisible : « %s »', (text) => {
		const node = parse(`unités: ${text}`);
		expect(node.spec).toBeNull();
		expect(messages(node)).toEqual([expect.stringContaining('nombre entier')]);
		expect(messages(node)[0]).toMatch(/^Ligne 1 : /);
	});

	it('plus de 10 dizaines', () => {
		const node = parse('dizaines: 11');
		expect(node.spec).toBeNull();
		expect(messages(node)).toEqual([expect.stringContaining('de 0 à 10')]);
	});

	it('plus de 100 unités', () => {
		const node = parse('unités: 101');
		expect(node.spec).toBeNull();
		expect(messages(node)).toEqual([expect.stringContaining('de 0 à 100')]);
	});

	it('plus de 100 objets en tout (décision 3)', () => {
		const node = parse('dizaines: 9 ; 1', 'unités: 11 ; 0');
		expect(node.spec).toBeNull();
		expect(messages(node).join()).toContain('101');
		expect(messages(node).join()).toContain('100 au plus');
	});

	it('autant de valeurs sur les deux lignes', () => {
		const node = parse('dizaines: 2 ; 3', 'unités: 1 ; 2 ; 3');
		expect(node.spec).toBeNull();
		expect(messages(node).join()).toContain('une par collection');
	});

	it('plus de 3 collections (décision 7)', () => {
		const node = parse('unités: 1 ; 2 ; 3 ; 4');
		expect(node.spec).toBeNull();
		expect(messages(node).join()).toContain('3');
	});

	it('autant de légendes que de collections', () => {
		const node = parse('unités: 1 ; 2', 'légendes: A');
		expect(node.spec).toBeNull();
		expect(messages(node).join()).toContain('une légende par collection');
	});

	it('légende trop longue', () => {
		const node = parse('unités: 1', `légendes: ${'a'.repeat(41)}`);
		expect(node.spec).toBeNull();
		expect(messages(node).join()).toContain('40');
	});

	it('centaines : réservée, pas encore disponible (décision 4)', () => {
		const node = parse('centaines: 1', 'unités: 3');
		expect(node.spec).toBeNull();
		expect(messages(node)).toEqual([expect.stringContaining('pas encore disponible')]);
	});

	it.each([
		['dessin: bûchettes', 'barres, paquets'],
		['unités en: tas', 'vrac, rangées'],
		['taille: 20cm', '2 et 12'],
		['taille: 1cm', '2 et 12'],
		['taille: 4', 'cm']
	])('valeur refusée : %s', (line, expected) => {
		const node = parse('unités: 9', line);
		expect(node.spec).toBeNull();
		expect(messages(node)).toEqual([expect.stringContaining(expected)]);
		expect(messages(node)[0]).toMatch(/^Ligne 2 : /);
	});

	it('clé inconnue, nommée dans le message', () => {
		const node = parse('unités: 9', 'couleur: rouge');
		expect(node.spec).toBeNull();
		expect(messages(node)).toEqual([expect.stringContaining('« couleur »')]);
	});

	it('ligne non comprise', () => {
		const node = parse('unités: 9', 'n’importe quoi');
		expect(node.spec).toBeNull();
		expect(messages(node)[0]).toMatch(/^Ligne 2 : /);
	});

	it('clé donnée deux fois, même écrite sans accent', () => {
		const node = parse('unités: 9', 'unites: 10');
		expect(node.spec).toBeNull();
		expect(messages(node)).toEqual([expect.stringContaining('déjà donnée ligne 1')]);
	});
});

describe('bloc ```collection non fermé', () => {
	it('s’arrête à la première ligne vide, signale l’oubli, et la suite reste lue', () => {
		const children = doc('```collection', 'unités: 9', '', 'La suite du texte.');
		expect(messages(collectionOf(children)).join()).toContain('non fermé');
		expect(children.at(-1)?.type).toBe('paragraph');
	});
});

describe('bloc ```collection dans un item de liste', () => {
	it('est lu comme un nœud collection', () => {
		const children = doc(
			'1. Combien de cubes ?',
			'',
			'   ```collection',
			'   dizaines: 3',
			'   unités: 5',
			'   ```'
		);
		const list = children[0] as ListNode;
		const node = collectionOf(list.items[0].children);
		expect(node.errors).toEqual([]);
		expect(node.spec?.sets).toEqual([{ tens: 3, units: 5 }]);
	});
});

describe('withChoiceCollectionSize — choix de QCM imprimé (décision 9)', () => {
	it('ajoute taille: 3cm à un bloc qui n’en donne pas', () => {
		const out = withChoiceCollectionSize('```collection\ndizaines: 4\nunités: 2\n```');
		expect(collectionOf(parseMarkdown(out).children).spec?.sizeCm).toBe(3);
	});

	it('garde la taille donnée par l’auteur', () => {
		const out = withChoiceCollectionSize('```collection\nunités: 2\ntaille: 5cm\n```');
		expect(collectionOf(parseMarkdown(out).children).spec?.sizeCm).toBe(5);
	});

	it('ne touche pas un texte sans bloc', () => {
		expect(withChoiceCollectionSize('Quarante-deux')).toBe('Quarante-deux');
	});
});
