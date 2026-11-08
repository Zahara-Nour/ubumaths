/**
 * Tableau de variations à compléter (chantier `variations-a-completer`) : dans une ligne
 * `variation:`, `?` devant une valeur la cache (case math), `?flèche` sur un intervalle
 * cache la flèche (choix ↗ / ↘, réponse tirée des positions écrites par l'auteur).
 */
import { describe, it, expect } from 'vitest';
import {
	parseVariationTableContent,
	revealVariationBody,
	variationRowForDisplay
} from '../../parser/variation-table-parser';
import type { VariationRow, VariationTableNode } from '../../types/variation-table';

function parse(text: string) {
	return parseVariationTableContent(text.split('\n'));
}

function parseOk(text: string): VariationTableNode {
	const result = parse(text);
	expect(result.errors).toEqual([]);
	if (!result.node) throw new Error('nœud attendu');
	return result.node;
}

/** Cubique : monte jusqu'à 4 en -2, descend jusqu'à -4 en 2, remonte */
const HEAD = ['variable: x', 'domain: -inf, -2, 2, +inf', '', 'variation: f(x)'];
const ROW = ['  -inf: -inf, bottom', '  -2: 4, top', '  2: -4, bottom', '  +inf: +inf, top'];

function withRow(...lines: string[]): string {
	return [...HEAD, ...lines].join('\n');
}

describe('valeur cachée dans une ligne variation:', () => {
	it('range la vraie valeur et la numérote (case math)', () => {
		const node = parseOk(withRow(ROW[0], '  -2: ?4, top', ROW[2], ROW[3]));
		const row = node.rows[0] as VariationRow;
		expect(row.values.get('-2')).toEqual({ expression: '4', position: 'top' });
		expect(node.cases).toEqual([{ index: 0, row: 0, key: '-2', kind: 'valeur', answer: '4' }]);
		expect(node.source).toBeDefined();
	});

	it('accepte une valeur tirée de variables', () => {
		const node = parseOk(withRow(ROW[0], '  -2: ?{{m}}, top', ROW[2], ROW[3]));
		expect(node.cases?.[0].answer).toBe('{{m}}');
	});

	it('accepte ? seul (énoncé d’évaluation) : réponse inconnue', () => {
		const node = parseOk(withRow(ROW[0], '  -2: ?, top', ROW[2], ROW[3]));
		expect(node.cases).toEqual([{ index: 0, row: 0, key: '-2', kind: 'valeur', answer: '' }]);
	});
});

describe('flèche cachée', () => {
	it('déduit ↗ et ↘ des positions écrites', () => {
		const node = parseOk(withRow(...ROW, '  -inf,-2: ?flèche', '  -2,2: ?fleche'));
		expect(node.cases).toEqual([
			{ index: 0, row: 0, key: '-inf,-2', kind: 'fleche', answer: '↗' },
			{ index: 1, row: 0, key: '-2,2', kind: 'fleche', answer: '↘' }
		]);
		// La ligne garde ses valeurs : la correction dessine le tableau juste
		expect((node.rows[0] as VariationRow).values.size).toBe(4);
	});

	it('lit une borne laissée implicite (trinôme sans limites)', () => {
		const node = parseOk(
			'variable: x\ndomain: -inf, 1, +inf\n\nvariation: f(x)\n  1: -3, bottom\n  1,+inf: ?flèche'
		);
		expect(node.cases?.[0]).toMatchObject({ key: '1,+inf', answer: '↗' });
	});

	it('accepte ? seul sur un intervalle (énoncé d’évaluation) : réponse inconnue', () => {
		const node = parseOk(
			withRow('  -inf: ?, center', '  -2: ?, center', ROW[2], ROW[3], '  -inf,-2: ?')
		);
		// Colonnes : -inf (case 0), -inf,-2 (case 1), -2 (case 2)
		expect(node.cases?.find((c) => c.kind === 'fleche')).toEqual({
			index: 1,
			row: 0,
			key: '-inf,-2',
			kind: 'fleche',
			answer: ''
		});
	});

	it('normalise les espaces de la clé', () => {
		const node = parseOk(withRow(...ROW, '  -2 , 2: ?flèche'));
		expect(node.cases?.[0].key).toBe('-2,2');
	});
});

describe('ordre de lecture', () => {
	it('domaine, puis chaque ligne dans son ordre, colonne par colonne', () => {
		const node = parseOk(
			[
				'variable: x',
				'domain: -inf, ?-2, 2, +inf',
				'',
				'sign: f′(x)',
				'  -inf,-2: ?+',
				'  -2: z',
				'  -2,2: -',
				'  2: z',
				'  2,+inf: +',
				'',
				'variation: f(x)',
				'  2,+inf: ?flèche',
				'  -inf: -inf, bottom',
				'  -2: ?4, top',
				'  2: ?-4, bottom',
				'  +inf: +inf, top',
				'  -inf,-2: ?flèche'
			].join('\n')
		);
		expect(node.cases?.map((c) => [c.index, c.row, c.key, c.kind])).toEqual([
			[0, 'domain', '-2', 'valeur'],
			[1, 0, '-inf,-2', 'signe'],
			[2, 1, '-inf,-2', 'fleche'],
			[3, 1, '-2', 'valeur'],
			[4, 1, '2', 'valeur'],
			[5, 1, '2,+inf', 'fleche']
		]);
	});
});

describe('refus avec message en français', () => {
	const refus: [string, string, RegExp][] = [
		['valeur cachée sur -inf', withRow('  -inf: ?-inf, bottom', ...ROW.slice(1)), /infini/],
		['valeur cachée sur +inf', withRow(...ROW.slice(0, 3), '  +inf: ?+inf, top'), /infini/],
		['? sur une asymptote', withRow(ROW[0], '  -2: ?||, -inf, +inf', ROW[2], ROW[3]), /\|\|/],
		[
			'? sur une limite double',
			withRow(ROW[0], '  -2: ||, ?-inf, +inf', ROW[2], ROW[3]),
			/limite|\|\|/
		],
		['? sans valeur ni position', withRow(ROW[0], '  -2: ?', ROW[2], ROW[3]), /position/],
		['flèche sur un point', withRow(...ROW, '  -2: ?flèche'), /intervalle/],
		['flèche hors du domaine', withRow(...ROW, '  -2,7: ?flèche'), /domaine/],
		['flèche sur deux colonnes', withRow(...ROW, '  -inf,2: ?flèche'), /domaine/],
		[
			'flèche entre deux valeurs à la même hauteur',
			withRow(ROW[0], '  -2: 4, bottom', ROW[2], ROW[3], '  -2,2: ?flèche'),
			/flèche/
		],
		[
			'flèche à côté d’une valeur centrée',
			withRow(ROW[0], '  -2: 4, center', ROW[2], ROW[3], '  -2,2: ?flèche'),
			/flèche/
		],
		[
			'flèche à côté d’une asymptote',
			withRow(ROW[0], '  -2: ||, +inf, -inf', ROW[2], ROW[3], '  -2,2: ?flèche'),
			/flèche/
		],
		['flèche écrite deux fois', withRow(...ROW, '  -2,2: ?flèche', '  -2,2: ?flèche'), /deux fois/],
		['valeur écrite deux fois', withRow(...ROW, '  -2: ?4, top'), /deux fois/],
		['mot inconnu', withRow(...ROW, '  -2,2: ?monte'), /flèche/],
		['clé cachée', withRow(...ROW, '  ?-2: 4, top'), /clé|variation/]
	];

	for (const [nom, texte, motif] of refus) {
		it(`refuse : ${nom}`, () => {
			const result = parse(texte);
			expect(result.node).toBeNull();
			const messages = result.errors.map((e) => e.message);
			expect(messages.some((m) => motif.test(m) && /^Ligne \d+ : /.test(m))).toBe(true);
		});
	}
});

describe('affichage : rien ne dit la réponse', () => {
	it('centre les valeurs voisines d’une flèche cachée, pas les autres', () => {
		const node = parseOk(withRow(...ROW, '  -2,2: ?flèche'));
		const shown = variationRowForDisplay(node, 0);
		expect(shown.values.get('-2')?.position).toBe('center');
		expect(shown.values.get('2')?.position).toBe('center');
		expect(shown.values.get('-inf')?.position).toBe('bottom');
		expect(shown.values.get('+inf')?.position).toBe('top');
		// L'arbre n'est pas touché (correction)
		expect((node.rows[0] as VariationRow).values.get('-2')?.position).toBe('top');
	});

	it('ne pose pas de borne implicite à côté d’une flèche cachée', () => {
		const node = parseOk(
			'variable: x\ndomain: -inf, 1, +inf\n\nvariation: f(x)\n  1: -3, bottom\n  1,+inf: ?flèche'
		);
		const shown = variationRowForDisplay(node, 0);
		expect(shown.values.get('1')?.position).toBe('center');
		// Borne de gauche implicite (en haut, flèche donnée) ; celle de droite dirait la réponse
		expect(shown.values.get('-inf')?.position).toBe('top');
		expect(shown.values.get('+inf')?.position ?? 'center').toBe('center');
	});

	it('rend la ligne avec ses bornes implicites quand rien n’est caché', () => {
		const node = parseOk('variable: x\ndomain: -inf, 1, +inf\n\nvariation: f(x)\n  1: -3, bottom');
		const shown = variationRowForDisplay(node, 0);
		expect(shown.values.get('-inf')?.position).toBe('top');
		expect(shown.values.get('+inf')?.position).toBe('top');
	});
});

describe('corrigé imprimé : tableau révélé', () => {
	it('retire le ? des valeurs et les lignes ?flèche', () => {
		const body = [...HEAD, ROW[0], '  -2: ?4, top', ROW[2], ROW[3], '  -2,2: ?flèche', 'case: 3'];
		expect(revealVariationBody(body)).toEqual([...HEAD, ...ROW]);
	});
});

describe('un ? hors tête de valeur reste du texte', () => {
	it('accepte 1? dans une valeur', () => {
		const result = parse(withRow('  -inf: 1?, bottom', ...ROW.slice(1)));
		expect(result.errors.filter((e) => e.message.startsWith('Ligne'))).toEqual([]);
		expect(result.node?.cases).toBeUndefined();
	});
});
