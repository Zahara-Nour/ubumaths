/**
 * Loi géométrique dans le bloc ```loi (maths complémentaires, manche 13, PR a) :
 * `X ~ G(p)`, valeurs 1, 2, 3… Calcul exact, affichage arrondi une fois.
 *
 * Spécification validée par David le 2026-10-04. Valeurs de référence (Python,
 * fractions) : G(0,2) → 0,2 · 0,16 · 0,128 · 0,102 · 0,082 · 0,066 · 0,052 ·
 * 0,042 · 0,034 · 0,027 ; P(X = 3) 0,128, P(X ⩽ 3) 0,488, P(X > 3) 0,512,
 * P(2 ⩽ X ⩽ 4) 0,390, P(X > 5 | X > 2) 0,512 ; E 5, V 20, σ 4,472.
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import { buildStatChartScene, type LawScene } from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import { geometricMoments, geometricProbability } from '$lib/statistics/geometric';
import { roundExact } from '$lib/statistics/binomial';
import { Fraction } from '$lib/statistics/fraction';

// =============================================================================
// Helpers
// =============================================================================

const G = 'X ~ G(0,2)';

function nodeOf(source: string) {
	return parseStatChartContent('loi', source);
}

function lawOf(source: string, locale: 'fr' | 'en' = 'fr') {
	const node = nodeOf(source);
	if (node.spec === null) throw new Error(`erreurs inattendues : ${JSON.stringify(node.errors)}`);
	return buildStatChartScene(node.spec, { locale }) as LawScene;
}

function errorOf(source: string) {
	const node = nodeOf(source);
	expect(node.spec, 'le bloc devait être en erreur').toBeNull();
	return node.errors[0].message;
}

// =============================================================================
// Module statistique
// =============================================================================

describe('geometric — calcul exact', () => {
	const p = new Fraction(1n, 5n);

	it('P(low ⩽ X ⩽ high) exacte : (1 − p)^(low − 1) − (1 − p)^high', () => {
		// P(X = 3) = 0,8² × 0,2 = 16/125
		const three = geometricProbability(p, 3, 3);
		expect(new Fraction(three.num, three.den).equals(new Fraction(16n, 125n))).toBe(true);
		// P(X > 3) = 0,8³, sans borne haute
		const tail = geometricProbability(p, 4, null);
		expect(new Fraction(tail.num, tail.den).equals(new Fraction(64n, 125n))).toBe(true);
		const between = geometricProbability(p, 2, 4);
		expect(roundExact(between.num, between.den, 3).digits).toBe('0.390');
	});

	it('une borne basse sous 1 compte à partir de 1 ; un intervalle vide vaut 0', () => {
		const all = geometricProbability(p, -5, null);
		expect(new Fraction(all.num, all.den).equals(Fraction.ONE)).toBe(true);
		expect(geometricProbability(p, 0, 0).num).toBe(0n);
		expect(geometricProbability(p, 5, 3).num).toBe(0n);
	});

	it('k jusqu’à 1 000 se calcule exactement', () => {
		const far = geometricProbability(new Fraction(1n, 2n), 1001, null);
		expect(far.den).toBe(2n ** 1000n);
		expect(far.num).toBe(1n);
	});

	it('E = 1/p, V = (1 − p)/p²', () => {
		const moments = geometricMoments(p);
		expect(moments.expectation.equals(new Fraction(5n))).toBe(true);
		expect(moments.variance.equals(new Fraction(20n))).toBe(true);
		expect(moments.deviation).toBeCloseTo(4.472, 3);
	});
});

// =============================================================================
// Bloc
// =============================================================================

describe('X ~ G(p) — le tableau de la loi', () => {
	it('k = 1 à 10 au millième, puis une colonne « … »', () => {
		const scene = lawOf(G);
		expect(scene.values).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '…']);
		expect(scene.probabilities.map((p) => p.text)).toEqual([
			'0,2',
			'0,16',
			'0,128',
			'0,102',
			'0,082',
			'0,066',
			'0,052',
			'0,042',
			'0,034',
			'0,027',
			'…'
		]);
	});

	it('p en fraction, en pourcentage ; « suit » à la place de « ~ »', () => {
		expect(lawOf('X ~ G(1/5)').probabilities[2].text).toBe('0,128');
		expect(lawOf('X ~ G(20 %)').probabilities[2].text).toBe('0,128');
		expect(lawOf('T suit G(0,2)').variable).toBe('T');
	});

	it('`jusqu’à: 4` coupe le tableau à k = 4', () => {
		expect(lawOf(`${G}\njusqu'à: 4`).values).toEqual(['1', '2', '3', '4', '…']);
		expect(lawOf(`${G}\njusqu’à: 30`).values).toHaveLength(31);
	});

	it('`masquer:` comme les autres lois', () => {
		const scene = lawOf(`${G}\nmasquer: 2`);
		expect(scene.probabilities[1].hidden).toBe(true);
		expect(scene.probabilities[0].hidden).toBe(false);
	});

	it('le titre dit la loi, en français et en anglais', () => {
		expect(lawOf(G).accessibleTitle).toBe('Loi de X : G(0,2)');
		expect(lawOf(G, 'en').accessibleTitle).toBe('Distribution of X: Geo(0.2)');
		expect(lawOf(G, 'en').probabilities[0].text).toBe('0.2');
	});

	it('G(1) : P(X = 1) = 1', () => {
		const scene = lawOf('X ~ G(1)\nprobabilités: P(X = 1)');
		expect(scene.probabilities[0].text).toBe('1');
		expect(scene.probabilities[1].text).toBe('0');
		expect(scene.indicators).toContain('P(X = 1) = 1');
	});
});

describe('X ~ G(p) — indicateurs', () => {
	it('l’espérance par défaut', () => {
		expect(lawOf(G).indicators).toEqual(['E(X) = 5']);
	});

	it('variance et écart type seulement sur demande', () => {
		expect(lawOf(`${G}\nindicateurs: espérance ; variance ; écart type`).indicators).toEqual([
			'E(X) = 5',
			'V(X) = 20',
			'σ(X) ≈ 4,47'
		]);
		expect(lawOf(`${G}\nindicateurs: variance`).indicators).toEqual(['V(X) = 20']);
	});

	it('p sans décimal exact de 1/p : la fraction', () => {
		expect(lawOf('X ~ G(3/10)').indicators).toEqual(['E(X) = 10/3 ≈ 3,33']);
	});

	it('p écrit en décimal, E ou V non décimal : la valeur approchée seule, pas de fraction géante', () => {
		expect(lawOf('X ~ G(0,3)').indicators).toEqual(['E(X) ≈ 3,33']);
		const huge = lawOf('X ~ G(0,12345678901234)\nindicateurs: espérance ; variance').indicators;
		expect(huge[0]).toBe('E(X) ≈ 8,1');
		expect(huge[1]).toMatch(/^V\(X\) ≈ \d+,\d+$/);
	});
});

describe('X ~ G(p) — `probabilités:`', () => {
	it('=, ⩽, >, entre deux bornes : les valeurs de référence', () => {
		const scene = lawOf(
			`${G}\nindicateurs: espérance\nprobabilités: P(X = 3) ; P(X ⩽ 3) ; P(X > 3) ; P(2 ⩽ X ⩽ 4)`
		);
		expect(scene.indicators).toEqual([
			'E(X) = 5',
			'P(X = 3) = 0,128',
			'P(X ⩽ 3) = 0,488',
			'P(X > 3) = 0,512',
			'P(2 ⩽ X ⩽ 4) ≈ 0,390'
		]);
	});

	it('P(X > a | X > b) : (1 − p)^(a − b), sans mémoire', () => {
		expect(
			lawOf(`${G}\nindicateurs: espérance\nprobabilités: P(X > 5 | X > 2)`).indicators
		).toEqual(['E(X) = 5', 'P(X > 5 | X > 2) = 0,512']);
	});

	it('une valeur approchée s’écrit avec ≈ ; k = 1 000 se calcule', () => {
		const scene = lawOf(`X ~ G(1/3)\nprobabilités: P(X > 2) ; P(X ⩽ 1000)`);
		expect(scene.indicators).toEqual(['E(X) = 3', 'P(X > 2) ≈ 0,444', 'P(X ⩽ 1000) ≈ 1,000']);
	});

	it('conditionnelle : P(X > a | X > b) avec des bornes décimales ou négatives', () => {
		// P(X > 2,5) = P(X > 2) = 0,64 ; P(X > −1) = 1 (un bug P(X > a − b) donnerait 0,512)
		expect(lawOf(`${G}\nprobabilités: P(X > 2,5 | X > -1)`).indicators[1]).toBe(
			'P(X > 2,5 | X > -1) = 0,64'
		);
		expect(lawOf(`${G}\nprobabilités: P(X > 5,5 | X > 2,5)`).indicators[1]).toBe(
			'P(X > 5,5 | X > 2,5) = 0,512'
		);
	});

	it('P(X = 2,5) vaut 0, sans avertissement (la borne écrite est dans les valeurs)', () => {
		const node = nodeOf(`${G}\nprobabilités: P(X = 2,5)`);
		expect(node.warnings).toEqual([]);
		expect(lawOf(`${G}\nprobabilités: P(X = 2,5)`).indicators[1]).toBe('P(X = 2,5) = 0');
	});

	it('P(X ⩽ 0) avertit aussi', () => {
		expect(nodeOf(`${G}\nprobabilités: P(X ⩽ 0)`).warnings).toHaveLength(1);
	});

	it('rapide : p à 14 chiffres, 30 valeurs, bornes près de 1 000', () => {
		const source =
			"X ~ G(0,12345678901234)\njusqu'à: 30\nindicateurs: espérance ; variance ; écart type\n" +
			'probabilités: P(X ⩽ 999) ; P(X > 998) ; P(990 ⩽ X ⩽ 1000) ; P(X > 1000 | X > 2)';
		const start = performance.now();
		lawOf(source);
		lawOf(source, 'en');
		expect(performance.now() - start).toBeLessThan(200);
	});

	it('P(X = 0) vaut 0, avec un avertissement', () => {
		const node = nodeOf(`${G}\nprobabilités: P(X = 0)`);
		expect(node.spec).not.toBeNull();
		expect(node.warnings[0].message).toBe(
			'Ligne 2 : probabilités : « P(X = 0) » : X prend ses valeurs à partir de 1'
		);
		expect(lawOf(`${G}\nprobabilités: P(X = 0)`).indicators).toContain('P(X = 0) = 0');
	});
});

describe('X ~ G(p) — diagramme', () => {
	it('les bâtons coupés au même k que le tableau, et la mention', () => {
		const scene = lawOf(`${G}\njusqu'à: 6\ndiagramme: oui`);
		expect(scene.chart?.bars).toHaveLength(6);
		expect(scene.chartNote).toBe('valeurs suivantes non représentées');
		expect(lawOf(`${G}\ndiagramme: oui`, 'en').chartNote).toBe('following values not shown');
	});

	it('pas de mention sans diagramme', () => {
		expect(lawOf(G).chartNote).toBeUndefined();
	});
});

// =============================================================================
// PDF
// =============================================================================

describe('X ~ G(p) — Typst', () => {
	it('les mêmes cases qu’à l’écran, la colonne « … », la mention sous le diagramme', () => {
		const source = `${G}\ndiagramme: oui\nprobabilités: P(X > 5 | X > 2)`;
		const typst = generateStatChartTypst(nodeOf(source)).replace(/ /g, ' ');
		const scene = lawOf(source);

		for (const p of scene.probabilities) expect(typst).toContain(`[#"${p.text}"]`);
		expect(typst).toContain('Loi de X : G(0,2)');
		expect(typst).toContain('valeurs suivantes non représentées');
		expect(typst).toContain('P(X > 5 | X > 2) = 0,512');
	});
});

// =============================================================================
// Erreurs
// =============================================================================

describe('X ~ G(p) — erreurs situées', () => {
	it('p dans ]0 ; 1]', () => {
		const p = 'Ligne 1 : G(p) : p est un nombre strictement positif, au plus 1';
		expect(errorOf('X ~ G(0)')).toBe(p);
		expect(errorOf('X ~ G(1,2)')).toBe(p);
		expect(errorOf('X ~ G(-0,1)')).toBe(p);
		expect(errorOf('X ~ G(beaucoup)')).toBe(p);
	});

	it('`jusqu’à:` : un entier de 1 à 30 ; seulement avec G(p)', () => {
		const upTo = "Ligne 2 : jusqu'à : un entier de 1 à 30";
		expect(errorOf(`${G}\njusqu'à: 0`)).toBe(upTo);
		expect(errorOf(`${G}\njusqu'à: 31`)).toBe(upTo);
		expect(errorOf(`${G}\njusqu'à: 2,5`)).toBe(upTo);
		expect(errorOf("X ~ B(10 ; 0,3)\njusqu'à: 5")).toBe(
			"Ligne 2 : jusqu'à : seulement avec une loi géométrique (X ~ G(p))"
		);
	});

	it('`intervalle:` et `seuil:` sont réservés à la loi binomiale', () => {
		expect(errorOf(`${G}\nintervalle: 0,95`)).toBe(
			'Ligne 2 : intervalle : option réservée à la loi binomiale'
		);
		expect(errorOf(`${G}\nseuil: P(X > k) ⩽ 0,05`)).toBe(
			'Ligne 2 : seuil : option réservée à la loi binomiale'
		);
	});

	it('P(X > a | X > b) : a > b, sinon la forme attendue', () => {
		const form =
			'Ligne 2 : probabilités : « P(X > 2 | X > 5) » : écrire P(X > a | X > b) avec a > b';
		expect(errorOf(`${G}\nprobabilités: P(X > 2 | X > 5)`)).toBe(form);
		expect(errorOf(`${G}\nprobabilités: P(X ⩽ 2 | X > 1)`)).toBe(
			'Ligne 2 : probabilités : « P(X ⩽ 2 | X > 1) » : écrire P(X > a | X > b) avec a > b'
		);
	});

	it('G(1) : P(X > 3 | X > 1) n’existe pas', () => {
		expect(errorOf('X ~ G(1)\nprobabilités: P(X > 3 | X > 1)')).toBe(
			"Ligne 2 : probabilités : « P(X > 3 | X > 1) » : P(X > 1) = 0, la probabilité conditionnelle n'existe pas"
		);
	});

	it('bornes au plus 1 000', () => {
		expect(errorOf(`${G}\nprobabilités: P(X ⩽ 1001)`)).toBe(
			'Ligne 2 : probabilités : « P(X ⩽ 1001) » : bornes au plus 1 000'
		);
	});

	it('`masquer:` hors du tableau', () => {
		expect(errorOf(`${G}\nmasquer: 11`)).toBe(
			"Ligne 2 : masquer : la valeur « 11 » n'est pas dans le tableau"
		);
	});
});
