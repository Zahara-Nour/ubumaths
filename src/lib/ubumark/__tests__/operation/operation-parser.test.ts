/**
 * Bloc ```operation — analyse (phase 0 : `docs/wip/operations-posees-progress.md` § 4)
 */

import { describe, expect, it } from 'vitest';
import { parseMarkdown, type ListNode } from '$lib/ubumark';
import { parseOperationContent } from '$lib/ubumark/parser/operation-parser';
import { resolveText } from '$lib/ubumark/parameterization/resolver/text-resolver';
import type { OperationNode } from '$lib/ubumark/types/operation';

const doc = (...lines: string[]) => parseMarkdown(lines.join('\n')).children;

function operationOf(children: readonly { type: string }[]): OperationNode {
	const node = children.find((c) => c.type === 'operation');
	expect(node, 'un nœud operation attendu').toBeDefined();
	return node as OperationNode;
}

const parse = (...lines: string[]) => parseOperationContent(lines.join('\n'));
const messages = (node: OperationNode) => node.errors.map((e) => e.message);
const term = (integer: string, decimal = '') => ({ integer, decimal });

describe('bloc ```operation — cas nominaux', () => {
	it('addition : réglages par défaut (comportement 1)', () => {
		const node = operationOf(doc('```operation', 'calcul: 45 + 37', '```'));
		expect(node.errors).toEqual([]);
		expect(node.source).toBe('calcul: 45 + 37');
		expect(node.spec).toEqual({
			operator: '+',
			terms: [term('45'), term('37')],
			cells: 'résultat',
			carries: true,
			method: 'compensation',
			steps: 'soustractions',
			quotient: 'entier'
		});
	});

	it('trois termes (comportement 2)', () => {
		expect(parse('calcul: 28 + 8 + 56').spec?.terms).toEqual([term('28'), term('8'), term('56')]);
	});

	it('tous les réglages (comportements 3, 6)', () => {
		const node = parse('calcul: 302 − 7', 'cases: aucune', 'retenues: non', 'méthode: cassage');
		expect(node.errors).toEqual([]);
		expect(node.spec).toMatchObject({
			operator: '-',
			cells: 'aucune',
			carries: false,
			method: 'cassage'
		});
	});

	it('décimaux, virgule ou point (comportements 4, 7)', () => {
		expect(parse('calcul: 56,75 + 234 + 0,8').spec?.terms).toEqual([
			term('56', '75'),
			term('234'),
			term('0', '8')
		]);
		expect(parse('calcul: 12.5 + 3').spec?.terms).toEqual([term('12', '5'), term('3')]);
	});

	it('trait d’union, signe moins, espaces de milliers (comportement 7)', () => {
		for (const text of ['1 234 - 56', '1 234 − 56', '1234-56', '1 234 – 56']) {
			const node = parse(`calcul: ${text}`);
			expect(node.errors, text).toEqual([]);
			expect(node.spec?.operator, text).toBe('-');
			expect(node.spec?.terms, text).toEqual([term('1234'), term('56')]);
		}
	});

	it('zéros de tête retirés, zéros décimaux gardés', () => {
		expect(parse('calcul: 007 + 2,50').spec?.terms).toEqual([term('7'), term('2', '50')]);
		expect(parse('calcul: 0 + 0,5').spec?.terms).toEqual([term('0'), term('0', '5')]);
	});

	it('valeurs sans accents ni casse : resultat, Aucune, Cassage', () => {
		expect(parse('calcul: 5 - 3', 'cases: resultat').spec?.cells).toBe('résultat');
		expect(parse('calcul: 5 - 3', 'Cases: Aucune').spec?.cells).toBe('aucune');
		expect(parse('calcul: 5 - 3', 'methode: Cassage').spec?.method).toBe('cassage');
	});

	it('variables résolues avant le bloc (comportement 8)', () => {
		const text = resolveText('```operation\ncalcul: {{a}} + {{b}}\n```', [
			{ name: 'a', value: '245' },
			{ name: 'b', value: '437' }
		]);
		const node = operationOf(parseMarkdown(text).children);
		expect(node.spec?.terms).toEqual([term('245'), term('437')]);
	});

	it('dans un item de liste (comportement 9)', () => {
		const children = doc(
			'a) Pose et calcule.',
			'',
			'   ```operation',
			'   calcul: 45 + 37',
			'   ```'
		);
		const list = children.find((c) => c.type === 'list') as ListNode | undefined;
		expect(list).toBeDefined();
		const item = list!.items[0];
		const node = operationOf(item.children);
		expect(node.errors).toEqual([]);
	});
});

describe('bloc ```operation — erreurs (comportements 13 à 17)', () => {
	it.each([
		[['cases: aucune'], 'il manque la ligne calcul:'],
		[['calcul: 4a + 2'], '« 4a » n’est pas un nombre'],
		[['calcul: 4 + 2 - 1'], 'un seul signe'],
		[['calcul: 45'], 'deux termes au moins'],
		[['calcul: 12 - 30'], 'résultat négatif'],
		[['calcul: 30 - 3 - 1'], 'une soustraction a deux termes'],
		[['calcul: 1 + 2 + 3 + 4'], 'trois termes au plus'],
		[['calcul: 12345678901 + 1'], '10 chiffres au plus avant la virgule'],
		[['calcul: 1,2345 + 1'], '3 chiffres au plus après la virgule'],
		[['calcul: 12 × 3 × 2'], 'deux facteurs'],
		[['calcul: 12 + 3', 'méthode: cassage'], 'seulement pour une soustraction'],
		[['calcul: 12 + 3', 'couleur: rouge'], 'clé « couleur » inconnue'],
		[['calcul: 12 + 3', 'cases: toutes'], 'cases « toutes »'],
		[['calcul: 12 + 3', 'calcul: 1 + 1'], 'déjà donnée ligne 1'],
		[['calcul 12 + 3'], 'non comprise']
	])('%j → %s', (lines, expected) => {
		const node = parse(...lines);
		expect(node.spec).toBeNull();
		expect(messages(node).join(' | ')).toContain(expected);
	});

	it('message situé : numéro de ligne', () => {
		const node = parse('calcul: 12 + 3', '', 'cases: toutes');
		expect(node.errors[0]).toMatchObject({ line: 3 });
		expect(node.errors[0].message).toMatch(/^Ligne 3 : /);
	});

	it('bloc non fermé : le nœud existe, en erreur, la suite est du texte', () => {
		const children = doc('```operation', 'calcul: 45 + 37', '', 'La suite.');
		const node = operationOf(children);
		expect(messages(node).join(' ')).toContain('bloc non fermé');
		expect(children.some((c) => c.type === 'paragraph')).toBe(true);
	});
});

describe('bloc ```operation — clé case: (posée par le générateur de questions, PR 1b)', () => {
	it('case: 2 → numéro de la case de la question', () => {
		const node = parse('case: 2', 'calcul: 45 + 37');
		expect(node.errors).toEqual([]);
		expect(node.caseIndex).toBe(2);
	});

	it('sans case: → aucun numéro (bloc d’affichage)', () => {
		expect(parse('calcul: 45 + 37').caseIndex).toBeUndefined();
	});

	it('case: illisible → erreur située', () => {
		expect(messages(parse('case: deux', 'calcul: 45 + 37'))).toEqual([
			'Ligne 1 : case: attend un numéro de case (0, 1, 2…)'
		]);
	});

	it('case: avec cases: aucune → erreur (rien à remplir)', () => {
		expect(messages(parse('case: 0', 'calcul: 45 + 37', 'cases: aucune'))).toEqual([
			'Ligne 1 : case: sans objet avec cases: aucune'
		]);
	});

	it('case: répétée → erreur (le modèle l’a écrite à la main)', () => {
		expect(messages(parse('case: 0', 'case: 1', 'calcul: 45 + 37'))).toEqual([
			'Ligne 2 : « case » déjà donnée ligne 1'
		]);
	});
});
