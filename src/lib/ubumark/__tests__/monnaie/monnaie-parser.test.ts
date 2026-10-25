/**
 * Bloc ```monnaie — analyse (phase 0 : `docs/wip/monnaie-progress.md` § 2, 3, 10 bis)
 */

import { describe, expect, it } from 'vitest';
import { parseMarkdown, type ListNode } from '$lib/ubumark';
import {
	decomposeAmount,
	parseMonnaieContent,
	withChoiceMonnaieSize
} from '$lib/ubumark/parser/monnaie-parser';
import { resolveText } from '$lib/ubumark/parameterization/resolver/text-resolver';
import type { MonnaieNode } from '$lib/ubumark/types/monnaie';

const doc = (...lines: string[]) => parseMarkdown(lines.join('\n')).children;

function monnaieOf(children: readonly { type: string }[]): MonnaieNode {
	const node = children.find((c) => c.type === 'monnaie');
	expect(node, 'un nœud monnaie attendu').toBeDefined();
	return node as MonnaieNode;
}

const parse = (...lines: string[]) => parseMonnaieContent(lines.join('\n'));
const messages = (node: MonnaieNode) => node.errors.map((e) => e.message);
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe('bloc ```monnaie — cas nominaux', () => {
	it('billets et pièces, réglages par défaut (nominal 1)', () => {
		const node = monnaieOf(doc('```monnaie', 'billets: 20 10 10', 'pièces: 2 2 2 1', '```'));
		expect(node.errors).toEqual([]);
		expect(node.spec).toEqual({
			sets: [{ notes: [20, 10, 10], coins: [2, 2, 2, 1] }],
			captions: null,
			layout: 'rangé',
			sizeCm: null
		});
	});

	it('forme comptée, × ou x ou *, triée du plus grand au plus petit (décision 3)', () => {
		const node = parse('billets: 2×10 1x20', 'pièces: 1*1 3 × 2');
		expect(node.errors).toEqual([]);
		expect(node.spec?.sets).toEqual([{ notes: [20, 10, 10], coins: [2, 2, 2, 1] }]);
	});

	it('`0×10` admis (un modèle qui tire 0), `10 €` et `10€` lus', () => {
		expect(parse('billets: 0×10 5', 'pièces: 2 €').spec?.sets).toEqual([
			{ notes: [5], coins: [2] }
		]);
		expect(parse('billets: 10€').spec?.sets).toEqual([{ notes: [10], coins: [] }]);
	});

	it('mélangé, sans accent aussi', () => {
		expect(parse('pièces: 1', 'disposition: mélangé').spec?.layout).toBe('mélangé');
		expect(parse('pieces: 1', 'disposition: melange').spec?.layout).toBe('mélangé');
	});

	it('plusieurs ensembles, ensemble vide, légendes (nominal 3, limite 9)', () => {
		const node = parse('billets: ; 1×10', 'pièces: 10×1 ;', 'légendes: Léa ; Tom', 'taille: 5cm');
		expect(node.errors).toEqual([]);
		expect(node.spec).toEqual({
			sets: [
				{ notes: [], coins: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
				{ notes: [10], coins: [] }
			],
			captions: ['Léa', 'Tom'],
			layout: 'rangé',
			sizeCm: 5
		});
	});

	it('billets seuls, pièces seules, ensemble vide (limites 9, 11)', () => {
		expect(parse('billets: 50').spec?.sets).toEqual([{ notes: [50], coins: [] }]);
		expect(parse('pièces: 2 1').spec?.sets).toEqual([{ notes: [], coins: [2, 1] }]);
		expect(parse('billets:').spec?.sets).toEqual([{ notes: [], coins: [] }]);
	});

	it('100 € : un billet, ou 50 + 20 + 20 + 10 ; 30 objets (limite 10, décision 5)', () => {
		expect(parse('billets: 100').errors).toEqual([]);
		expect(parse('billets: 50 20 20 10').errors).toEqual([]);
		expect(parse('pièces: 30×1').errors).toEqual([]);
	});

	it('montant: le moins d’objets (limite 12, décision 4)', () => {
		expect(parse('montant: 48').spec?.sets).toEqual([{ notes: [20, 20, 5], coins: [2, 1] }]);
		expect(parse('montant: 7 ; 0 ; 100').spec?.sets).toEqual([
			{ notes: [5], coins: [2] },
			{ notes: [], coins: [] },
			{ notes: [100], coins: [] }
		]);
	});

	it('décomposition exacte pour chaque montant de 0 à 100, jamais plus de 30 objets', () => {
		for (let amount = 0; amount <= 100; amount++) {
			const { notes, coins } = decomposeAmount(amount);
			expect(sum(notes) + sum(coins), `${amount} €`).toBe(amount);
			expect(notes.length + coins.length).toBeLessThanOrEqual(30);
		}
	});

	it('garde le texte du bloc pour l’éditeur riche', () => {
		expect(parse('billets: 10', 'pièces: 2').source).toBe('billets: 10\npièces: 2');
	});

	it('variables d’un modèle résolues avant le bloc (exemple 1)', () => {
		const text = resolveText('```monnaie\nbillets: {{b}}×10\npièces: {{p}}×2 {{u}}×1\n```', [
			{ name: 'b', value: '3' },
			{ name: 'p', value: '2' },
			{ name: 'u', value: '0' }
		]);
		expect(monnaieOf(parseMarkdown(text).children).spec?.sets).toEqual([
			{ notes: [10, 10, 10], coins: [2, 2] }
		]);
	});

	it('ne prend pas un $ de l’énoncé autour pour une formule du bloc', () => {
		const children = doc('Il coûte $13$ €.', '', '```monnaie', 'billets: 20', '```', '', 'Et $2$.');
		expect(monnaieOf(children).errors).toEqual([]);
		expect(children.map((c) => c.type)).toEqual(['paragraph', 'monnaie', 'paragraph']);
	});
});

describe('bloc ```monnaie — erreurs (le nœud reste, avec son message)', () => {
	it('rien à dessiner', () => {
		const node = parse('disposition: mélangé');
		expect(node.spec).toBeNull();
		expect(messages(node).join()).toContain('rien à dessiner');
	});

	it('bloc vide', () => {
		expect(parse('').spec).toBeNull();
	});

	it('coupure inconnue : le message dit ce qui existe', () => {
		const node = parse('pièces: 3');
		expect(node.spec).toBeNull();
		expect(messages(node)).toEqual([
			"Ligne 1 : 3 € n'existe pas (pièces : 1, 2 ; billets : 5, 10, 20, 50, 100)"
		]);
	});

	it('pièce écrite en billet, et l’inverse', () => {
		expect(messages(parse('billets: 2'))).toEqual([expect.stringContaining('2 € est une pièce')]);
		expect(messages(parse('pièces: 5'))).toEqual([expect.stringContaining('5 € est un billet')]);
	});

	it.each(['50c', '0,50', '1.20'])('centimes « %s » : pas encore disponibles', (value) => {
		const node = parse(`pièces: ${value}`);
		expect(node.spec).toBeNull();
		expect(messages(node)).toEqual([expect.stringContaining('pas encore disponible')]);
	});

	it.each([200, 500])('billet de %i € : réservé', (value) => {
		expect(messages(parse(`billets: ${value}`))).toEqual([
			expect.stringContaining('pas encore disponible')
		]);
	});

	it.each(['2,5×1', '-1×2', 'trois×2', '{{n}}×2'])('quantité illisible : « %s »', (token) => {
		const node = parse(`pièces: ${token}`);
		expect(node.spec).toBeNull();
		expect(messages(node)).toEqual([expect.stringContaining('nombre entier')]);
		expect(messages(node)[0]).toMatch(/^Ligne 1 : /);
	});

	it('variable non résolue à la place d’une valeur', () => {
		expect(parse('billets: {{b}}').spec).toBeNull();
	});

	it('plus de 100 € par ensemble', () => {
		const node = parse('billets: 100 ; 10', 'pièces: 1 ; 2');
		expect(node.spec).toBeNull();
		expect(messages(node)).toEqual([expect.stringContaining('101 € (ensemble 1) : 100 € au plus')]);
	});

	it('plus de 30 objets par ensemble, même écrits un à un ou d’un coup', () => {
		expect(messages(parse('pièces: 31×1')).join()).toContain('30 au plus');
		expect(messages(parse('pièces: 20×1 11×2')).join()).toContain('31 objets');
		// Un grand nombre ne fabrique pas un tableau géant
		expect(messages(parse('pièces: 1000000000×1')).join()).toContain('30 au plus');
	});

	it('montant hors bornes ou illisible', () => {
		expect(messages(parse('montant: 101'))).toEqual([expect.stringContaining('de 0 à 100')]);
		expect(messages(parse('montant: 4,50'))).toEqual([
			expect.stringContaining('pas encore disponible')
		]);
	});

	it('montant: mêlé à billets: ou pièces:', () => {
		const node = parse('montant: 48', 'pièces: 2');
		expect(node.spec).toBeNull();
		expect(messages(node)).toEqual([expect.stringContaining('pas les deux')]);
	});

	it('autant d’ensembles sur les deux lignes', () => {
		const node = parse('billets: 10 ; 5', 'pièces: 1 ; 2 ; 1');
		expect(node.spec).toBeNull();
		expect(messages(node).join()).toContain('une valeur par ensemble');
		expect(messages(node)[0]).toMatch(/^Ligne 2 : /);
	});

	it('plus de 3 ensembles', () => {
		const node = parse('pièces: 1 ; 1 ; 1 ; 1');
		expect(node.spec).toBeNull();
		expect(messages(node).join()).toContain('au plus 3 ensembles');
	});

	it('autant de légendes que d’ensembles ; légende trop longue', () => {
		expect(messages(parse('pièces: 1 ; 2', 'légendes: A')).join()).toContain(
			'une légende par ensemble'
		);
		expect(messages(parse('pièces: 1', `légendes: ${'a'.repeat(41)}`)).join()).toContain('40');
	});

	it.each([
		['disposition: tas', 'rangé, mélangé'],
		['taille: 20cm', '2 et 12'],
		['taille: 4', 'cm']
	])('valeur refusée : %s', (line, expected) => {
		const node = parse('pièces: 1', line);
		expect(node.spec).toBeNull();
		expect(messages(node)).toEqual([expect.stringContaining(expected)]);
		expect(messages(node)[0]).toMatch(/^Ligne 2 : /);
	});

	it('clé inconnue (prix: n’existe pas en v1, décision 11)', () => {
		const node = parse('pièces: 1', 'prix: 13');
		expect(node.spec).toBeNull();
		expect(messages(node)).toEqual([expect.stringContaining('« prix »')]);
	});

	it('ligne non comprise ; clé donnée deux fois, même sans accent', () => {
		expect(messages(parse('pièces: 1', 'n’importe quoi'))[0]).toMatch(/^Ligne 2 : /);
		expect(messages(parse('pièces: 1', 'pieces: 2'))).toEqual([
			expect.stringContaining('déjà donnée ligne 1')
		]);
	});
});

describe('bloc ```monnaie non fermé', () => {
	it('s’arrête à la première ligne vide, signale l’oubli, et la suite reste lue', () => {
		const children = doc('```monnaie', 'billets: 10', '', 'La suite du texte.');
		expect(messages(monnaieOf(children)).join()).toContain('non fermé');
		expect(children.at(-1)?.type).toBe('paragraph');
	});
});

describe('bloc ```monnaie dans un item de liste', () => {
	it('est lu comme un nœud monnaie', () => {
		const children = doc(
			'1. Combien d’argent ?',
			'',
			'   ```monnaie',
			'   billets: 20',
			'   pièces: 2 1',
			'   ```'
		);
		const list = children[0] as ListNode;
		const node = monnaieOf(list.items[0].children);
		expect(node.errors).toEqual([]);
		expect(node.spec?.sets).toEqual([{ notes: [20], coins: [2, 1] }]);
	});
});

describe('withChoiceMonnaieSize — choix de QCM imprimé', () => {
	it('ajoute la taille d’un choix à un bloc qui n’en donne pas', () => {
		const out = withChoiceMonnaieSize('```monnaie\nbillets: 20 20 5\npièces: 2 1\n```');
		expect(monnaieOf(parseMarkdown(out).children).spec?.sizeCm).toBe(3);
	});

	it('garde la taille donnée par l’auteur', () => {
		const out = withChoiceMonnaieSize('```monnaie\npièces: 2\ntaille: 5cm\n```');
		expect(monnaieOf(parseMarkdown(out).children).spec?.sizeCm).toBe(5);
	});

	it('ne touche pas un texte sans bloc', () => {
		expect(withChoiceMonnaieSize('Quarante-huit')).toBe('Quarante-huit');
	});
});
