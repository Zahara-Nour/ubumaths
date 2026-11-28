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

/**
 * Homographique décroissante, valeur interdite 2 : bornes sans valeur (forme de 1re), la ligne
 * de la double barre et les flèches cachées sont données par le test
 */
function homo(...lines: string[]): string {
	return [
		'variable: x',
		'domain: -inf, 2, +inf',
		'',
		'variation: f(x)',
		'  -inf: , top',
		'  +inf: , bottom',
		...lines
	].join('\n');
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

// Refusées jusqu'au chantier `variation-limite-infinie` (phase 0 du 2026-11-23) : une
// limite se cache aux bords et autour d'une double barre
describe('limites cachées : acceptées', () => {
	const acceptees: [string, string][] = [
		['valeur cachée sur -inf', withRow('  -inf: ?-inf, bottom', ...ROW.slice(1))],
		['valeur cachée sur +inf', withRow(...ROW.slice(0, 3), '  +inf: ?+inf, top')],
		['valeur cachée sur -\\infty', withRow('  -inf: ?-\\infty, bottom', ...ROW.slice(1))],
		['? sur une limite double', withRow(ROW[0], '  -2: ||, ?-inf, +inf', ROW[2], ROW[3])]
	];
	for (const [nom, texte] of acceptees) {
		it(`lit : ${nom}`, () => {
			expect(parseOk(texte).cases?.length).toBe(1);
		});
	}
});

describe('refus avec message en français', () => {
	const refus: [string, string, RegExp][] = [
		['? sur une asymptote', withRow(ROW[0], '  -2: ?||, -inf, +inf', ROW[2], ROW[3]), /\|\|/],
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
			'flèche entre une limite et une valeur à la même hauteur',
			withRow(ROW[0], '  -2: ||, +inf, -inf', ROW[2], ROW[3], '  -2,2: ?flèche'),
			/flèche/
		],
		[
			'flèche du côté vide d’une limite seule',
			homo('  2: ||, left, -inf, bottom', '  2,+inf: ?flèche'),
			/flèche/
		],
		['flèche à côté d’une zone interdite', homo('  2: |h|', '  -inf,2: ?flèche'), /flèche/],
		[
			'flèche à côté d’une discontinuité',
			homo('  2: d, -inf, bottom, +inf, top', '  -inf,2: ?flèche'),
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

// Outil 59 (phase 0 du 2026-11-28) : la flèche lit le côté de la double barre qu'elle touche,
// comme le tableau dessiné (limite de gauche en arrivant, de droite en repartant)
describe('flèche cachée à côté d’une double barre', () => {
	const FLECHES = ['  -inf,2: ?flèche', '  2,+inf: ?flèche'];

	it('C1 : sans limites (1re), les deux flèches se cachent', () => {
		const node = parseOk(homo('  2: ||, , bottom, , top', ...FLECHES));
		expect(node.cases).toEqual([
			{ index: 0, row: 0, key: '-inf,2', kind: 'fleche', answer: '↘' },
			{ index: 1, row: 0, key: '2,+inf', kind: 'fleche', answer: '↘' }
		]);
	});

	it('C1 : croissante des deux côtés', () => {
		const node = parseOk(
			[
				'variable: x',
				'domain: -inf, 2, +inf',
				'',
				'variation: f(x)',
				'  -inf: , bottom',
				'  2: ||, , top, , bottom',
				'  +inf: , top',
				...FLECHES
			].join('\n')
		);
		expect(node.cases?.map((c) => c.answer)).toEqual(['↗', '↗']);
	});

	it('C2 : limites cachées, quatre cases dans l’ordre de lecture', () => {
		const node = parseOk(homo('  2: ||, ?-inf, bottom, ?+inf, top', ...FLECHES));
		expect(node.cases?.map((c) => [c.key, c.kind, c.side, c.answer])).toEqual([
			['-inf,2', 'fleche', undefined, '↘'],
			['2', 'valeur', 'left', '-\\infty'],
			['2', 'valeur', 'right', '+\\infty'],
			['2,+inf', 'fleche', undefined, '↘']
		]);
	});

	it('C3 : limites écrites', () => {
		const node = parseOk(homo('  2: ||, -inf, bottom, +inf, top', ...FLECHES));
		expect(node.cases?.map((c) => c.answer)).toEqual(['↘', '↘']);
	});

	it('C3 : limites sans hauteur écrite (déduite de ±inf)', () => {
		const node = parseOk(homo('  2: ||, -inf, +inf', ...FLECHES));
		expect(node.cases?.map((c) => c.answer)).toEqual(['↘', '↘']);
	});

	it('C4 : limite seule, flèche cachée de son côté', () => {
		const node = parseOk(homo('  2: ||, left, -inf, bottom', FLECHES[0]));
		expect(node.cases?.map((c) => c.answer)).toEqual(['↘']);
	});

	it('C4 : limite seule à droite', () => {
		const node = parseOk(homo('  2: ||, right, +inf, top', FLECHES[1]));
		expect(node.cases?.map((c) => c.answer)).toEqual(['↘']);
	});
});

describe('affichage d’une flèche cachée à côté d’une double barre', () => {
	it('C2 : les limites qui touchent une flèche cachée passent au milieu', () => {
		const node = parseOk(
			homo('  2: ||, ?-inf, bottom, ?+inf, top', '  -inf,2: ?flèche', '  2,+inf: ?flèche')
		);
		const bar = variationRowForDisplay(node, 0).values.get('2');
		expect(bar?.marker).toBe('asymptote');
		expect(bar?.limits?.map((l) => l.position)).toEqual(['center', 'center']);
		// L'arbre n'est pas touché (correction)
		const vraie = (node.rows[0] as VariationRow).values.get('2');
		expect(vraie?.limits?.map((l) => l.position)).toEqual(['bottom', 'top']);
	});

	it('C5 : cacher la flèche de gauche laisse le côté droit tel quel', () => {
		const node = parseOk(homo('  2: ||, -inf, bottom, +inf, top', '  -inf,2: ?flèche'));
		const shown = variationRowForDisplay(node, 0);
		expect(shown.values.get('2')?.limits?.map((l) => [l.expression, l.position])).toEqual([
			['-inf', 'center'],
			['+inf', 'top']
		]);
		expect(shown.values.get('-inf')?.position).toBe('center');
		expect(shown.values.get('+inf')?.position).toBe('bottom');
	});

	it('C4 : limite seule du côté de la flèche cachée, au milieu', () => {
		const node = parseOk(homo('  2: ||, left, -inf, bottom', '  -inf,2: ?flèche'));
		const bar = variationRowForDisplay(node, 0).values.get('2');
		expect([bar?.limitSide, bar?.position]).toEqual(['left', 'center']);
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
