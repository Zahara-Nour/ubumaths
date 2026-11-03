/**
 * Cases à compléter dans un bloc ```variation : un `?` devant une cellule la cache.
 * L'auteur écrit le tableau JUSTE ; la réponse attendue est tirée du bloc.
 */
import { describe, it, expect } from 'vitest';
import { parseVariationTableContent } from '../../parser/variation-table-parser';
import type { VariationTableNode } from '../../types/variation-table';

function parse(text: string) {
	return parseVariationTableContent(text.split('\n'));
}

function parseOk(text: string): VariationTableNode {
	const result = parse(text);
	expect(result.errors).toEqual([]);
	if (!result.node) throw new Error('nœud attendu');
	return result.node;
}

const BASE = ['variable: x', 'domain: -inf, ?-3, 2, +inf', '', 'sign: f(x)'];

describe('cases cachées — valeurs de x', () => {
	it('range la valeur cachée sans le ? et la numérote', () => {
		const node = parseOk(BASE.join('\n'));
		expect(node.domain.map((p) => p.expression)).toEqual(['-inf', '-3', '2', '+inf']);
		expect(node.domain[1].hidden).toBe(true);
		expect(node.domain[0].hidden).toBeUndefined();
		expect(node.cases).toEqual([
			{ index: 0, row: 'domain', key: '-3', kind: 'valeur', answer: '-3' }
		]);
	});

	it('accepte une valeur tirée de variables', () => {
		const node = parseOk('variable: x\ndomain: -inf, ?{{r}}, +inf\n\nsign: f(x)');
		expect(node.domain[1].expression).toBe('{{r}}');
		expect(node.cases?.[0].answer).toBe('{{r}}');
	});

	it('accepte une valeur cachée avec borne ouverte', () => {
		const node = parseOk('variable: x\ndomain: ]?3[, ]+inf[\n\nsign: f(x)');
		expect(node.domain[0]).toEqual({ expression: '3', open: true, hidden: true });
	});

	it('accepte le jeton de masquage ??1 (expression inconnue)', () => {
		const node = parseOk('variable: x\ndomain: -inf, ??1, ??2, +inf\n\nsign: f(x)');
		expect(node.domain.map((p) => p.expression)).toEqual(['-inf', '??1', '??2', '+inf']);
		expect(node.domain[1].hidden).toBe(true);
		expect(node.cases?.map((c) => [c.index, c.key, c.answer])).toEqual([
			[0, '??1', ''],
			[1, '??2', '']
		]);
	});
});

describe('cases cachées — signes et marques', () => {
	it('cache un signe sur un intervalle et une marque sur un point', () => {
		const node = parseOk(
			[...BASE, '  -inf,-3: ?-', '  -3: ?z', '  -3,2: +', '  2: z', '  2,+inf: -'].join('\n')
		);
		const row = node.rows[0];
		if (row.type !== 'sign') throw new Error('ligne de signes attendue');
		// La vraie valeur reste dans `values` (corrigé, page à cocher)
		expect(row.values.get('-inf,-3')).toEqual({ type: 'sign', value: '-' });
		expect(row.values.get('-3')).toEqual({ type: 'marker', marker: 'zero' });
		expect(node.cases).toEqual([
			{ index: 0, row: 'domain', key: '-3', kind: 'valeur', answer: '-3' },
			{ index: 1, row: 0, key: '-inf,-3', kind: 'signe', answer: '-' },
			{ index: 2, row: 0, key: '-3', kind: 'marque', answer: 'z' }
		]);
	});

	it('ramène ?0 à z', () => {
		const node = parseOk([...BASE, '  -3: ?0'].join('\n'));
		expect(node.cases?.find((c) => c.kind === 'marque')?.answer).toBe('z');
	});

	it('cache une double barre', () => {
		const node = parseOk([...BASE, '  -3: ?||'].join('\n'));
		const row = node.rows[0];
		if (row.type !== 'sign') throw new Error('ligne de signes attendue');
		expect(row.values.get('-3')).toEqual({ type: 'marker', marker: 'asymptote' });
		expect(node.cases?.find((c) => c.kind === 'marque')?.answer).toBe('||');
	});

	it('cache une marque vide : absente de values, présente dans cases', () => {
		const node = parseOk([...BASE, '  -3: ?rien', '  -3,2: +'].join('\n'));
		const row = node.rows[0];
		if (row.type !== 'sign') throw new Error('ligne de signes attendue');
		expect(row.values.has('-3')).toBe(false);
		expect(node.cases?.find((c) => c.kind === 'marque')).toEqual({
			index: 1,
			row: 0,
			key: '-3',
			kind: 'marque',
			answer: 'rien'
		});
	});

	it('accepte ? seul comme signe ou marque masqué (réponse inconnue)', () => {
		const node = parseOk([...BASE, '  -inf,-3: ?', '  -3: ?'].join('\n'));
		expect(node.cases?.filter((c) => c.row === 0)).toEqual([
			{ index: 1, row: 0, key: '-inf,-3', kind: 'signe', answer: '' },
			{ index: 2, row: 0, key: '-3', kind: 'marque', answer: '' }
		]);
	});

	it('?? remplace la valeur dans les clés d’intervalles', () => {
		const node = parseOk(
			'variable: x\ndomain: -inf, ??1, +inf\n\nsign: f(x)\n  -inf,??1: ?-\n  ??1: ?z\n  ??1,+inf: +'
		);
		expect(node.cases?.map((c) => [c.kind, c.key, c.answer])).toEqual([
			['valeur', '??1', ''],
			['signe', '-inf,??1', '-'],
			['marque', '??1', 'z']
		]);
	});
});

describe('ordre de lecture des cases', () => {
	it('suit les colonnes, pas l’ordre d’écriture, sur plusieurs lignes sign:', () => {
		const node = parseOk(
			[
				'variable: x',
				'domain: -inf, ?-3, ?2, +inf',
				'',
				'sign: A',
				'  2,+inf: ?+',
				'  -3: ?z',
				'  -inf,-3: ?-',
				'',
				'sign: B',
				'  2: ?z',
				'  -3,2: ?-'
			].join('\n')
		);
		expect(node.cases?.map((c) => `${c.index}:${c.row}:${c.key}:${c.kind}`)).toEqual([
			'0:domain:-3:valeur',
			'1:domain:2:valeur',
			'2:0:-inf,-3:signe',
			'3:0:-3:marque',
			'4:0:2,+inf:signe',
			'5:1:-3,2:signe',
			'6:1:2:marque'
		]);
	});
});

describe('ligne case: N et source', () => {
	it('lit caseIndex et garde le texte source', () => {
		const text = [...BASE, '  -3: ?z', '', 'case: 2'].join('\n');
		const node = parseOk(text);
		expect(node.caseIndex).toBe(2);
		expect(node.source).toBe(text);
	});

	it('refuse un case: qui n’est pas un numéro', () => {
		const result = parse([...BASE, '  -3: ?z', 'case: x'].join('\n'));
		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors[0].message).toMatch(/case/);
	});
});

describe('refus avec message en français', () => {
	const refus: [string, string, RegExp][] = [
		['? sur -inf', 'variable: x\ndomain: ?-inf, 0, +inf\n\nsign: f(x)', /infini/],
		['? sur +inf', 'variable: x\ndomain: -inf, 0, ?+inf\n\nsign: f(x)', /infini/],
		['? dans une étiquette', 'variable: x\ndomain: -inf, 0, +inf\n\nsign: ?f(x)', /étiquette/],
		[
			'? dans une ligne variation',
			'variable: x\ndomain: -inf, 0, +inf\n\nvariation: f(x)\n  0: ?3, top',
			/variation/
		],
		['?|h|', [...BASE, '  -3: ?|h|'].join('\n'), /\|h\|/],
		['?d', [...BASE, '  -3: ?d'].join('\n'), /discontinuité|« d »|\bd\b/],
		['signe caché sur un point', [...BASE, '  -3: ?+'].join('\n'), /point/],
		['marque cachée sur un intervalle', [...BASE, '  -inf,-3: ?z'].join('\n'), /intervalle/],
		['clé hors du domaine', [...BASE, '  7: ?z'].join('\n'), /domaine/]
	];

	for (const [nom, texte, motif] of refus) {
		it(`refuse : ${nom}`, () => {
			const result = parse(texte);
			expect(result.errors.length).toBeGreaterThan(0);
			const erreur = result.errors[0];
			expect(erreur.message).toMatch(motif);
			expect(erreur.message).toMatch(/[Ll]igne \d+/);
			expect(erreur.line).toBeGreaterThan(0);
			expect(result.node).toBeNull();
		});
	}
});

describe('un bloc sans ? est inchangé', () => {
	it('n’a ni cases, ni source, ni caseIndex, ni hidden', () => {
		const node = parseOk(
			'variable: x\ndomain: -inf, -3, +inf\n\nsign: f(x)\n  -inf,-3: +\n  -3: z\n  -3,+inf: -'
		);
		expect('cases' in node).toBe(false);
		expect('source' in node).toBe(false);
		expect('caseIndex' in node).toBe(false);
		expect(node.domain.every((p) => !('hidden' in p))).toBe(true);
	});
});

describe('un ? hors tête de cellule reste du texte (revue #2267)', () => {
	it('accepte une étiquette sign: qui contient un ? ailleurs qu’en tête', () => {
		const node = parseOk('variable: x\ndomain: -inf, 0, +inf\n\nsign: f(x) vrai ?\n  0: z');
		expect(node.rows[0].label).toBe('f(x) vrai ?');
		expect('cases' in node).toBe(false);
	});

	it('accepte une valeur de ligne variation: qui contient un ? ailleurs qu’en tête', () => {
		const result = parse(
			'variable: x\ndomain: -inf, 0, +inf\n\nvariation: f(x)\n  -inf: 1?, top\n  0: 0, bottom'
		);
		expect(result.errors.filter((e) => e.message.startsWith('Ligne'))).toEqual([]);
	});

	it('refuse toujours un ? en tête de valeur dans une ligne variation:', () => {
		const result = parse(
			'variable: x\ndomain: -inf, 0, +inf\n\nvariation: f(x)\n  -inf: ?1, top\n  0: 0, bottom'
		);
		expect(result.node).toBeNull();
	});

	it('accepte une clé ??1 (valeur masquée) dans une ligne variation:, pas ?1', () => {
		const masked = parseOk(
			'variable: x\ndomain: -inf, ??1, +inf\n\nsign: f(x)\n  ??1: ?\n\nvariation: g(x)\n  ??1: 0, bottom'
		);
		expect(masked.rows[1].values.get('??1')).toBeDefined();
		const cell = parse('variable: x\ndomain: -inf, 0, +inf\n\nvariation: f(x)\n  ?0: 0, bottom');
		expect(cell.node).toBeNull();
	});
});

describe('valeur de x répétée avec des cases cachées', () => {
	it('refuse le bloc, message situé', () => {
		const result = parse('variable: x\ndomain: -inf, ?0, ?0, +inf\n\nsign: f(x)\n  0: ?z');
		expect(result.node).toBeNull();
		expect(result.errors.some((e) => /^Ligne 2 : .*répétée/.test(e.message))).toBe(true);
	});

	it('laisse un bloc sans ? comme avant', () => {
		const result = parse('variable: x\ndomain: -inf, 0, 0, +inf\n\nsign: f(x)\n  0: z');
		expect(result.errors.filter((e) => e.message.includes('répétée'))).toEqual([]);
	});
});

describe('domaine simple : pas de clé open sans borne ouverte', () => {
	it('ne pose pas open: undefined', () => {
		const node = parseOk('variable: x\ndomain: -inf, 0, +inf\n\nsign: f(x)\n  0: z');
		expect(node.domain.every((p) => !('open' in p))).toBe(true);
	});
});
