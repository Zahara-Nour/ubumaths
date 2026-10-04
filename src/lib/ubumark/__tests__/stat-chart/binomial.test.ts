/**
 * Loi binomiale dans le bloc ```loi (Terminale spécialité, manche 11, PR a) :
 * `X ~ B(n ; p)` remplace `X =` / `P =`. Calcul exact, affichage arrondi.
 *
 * Spécification validée par David le 2026-10-03. Valeurs de référence :
 * B(10 ; 0,3), P(X = 0) = 0,0282475249, P(X = 3) = 0,2668279320,
 * P(X ⩽ 4) = 0,8497316674, P(X ⩽ 1) = 0,1493083459, P(X ⩽ 5) = 0,9526510126,
 * P(X ⩽ 7) = 0,9984096136.
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import { buildStatChartScene, type LawScene } from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import { binomialDistribution, binomialProbability, roundExact } from '$lib/statistics/binomial';
import { Fraction } from '$lib/statistics/fraction';

// =============================================================================
// Helpers
// =============================================================================

const B = 'X ~ B(10 ; 0,3)';

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

describe('binomial — calcul exact', () => {
	it('les probabilités exactes : C(n, k) a^k (b − a)^(n − k) / b^n', () => {
		const law = binomialDistribution(4, new Fraction(1n, 2n));
		expect(law.numerators).toEqual([1n, 4n, 6n, 4n, 1n]);
		expect(law.denominator).toBe(16n);
	});

	it('une somme exacte, un arrondi exact (y compris sur un demi)', () => {
		const law = binomialDistribution(10, new Fraction(3n, 10n));
		const atMost4 = binomialProbability(law, (k) => k <= 4);
		expect(roundExact(atMost4.num, atMost4.den, 3)).toEqual({ digits: '0.850', exact: false });
		// 1/8 = 0,125 : pile sur un demi au centième, arrondi au-dessus
		expect(roundExact(1n, 8n, 2)).toEqual({ digits: '0.13', exact: false });
		expect(roundExact(1n, 2n, 3)).toEqual({ digits: '0.500', exact: true });
	});
});

// =============================================================================
// Bloc
// =============================================================================

describe('X ~ B(n ; p) — le tableau de la loi', () => {
	it('les valeurs 0 à n et P(X = k) au millième', () => {
		const scene = lawOf(B);
		expect(scene.values).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
		expect(scene.probabilities[0].text).toBe('0,028');
		expect(scene.probabilities[3].text).toBe('0,267');
		expect(scene.variable).toBe('X');
	});

	it('`arrondi: 4` ; p écrit en fraction ; « suit » à la place de « ~ »', () => {
		expect(lawOf(`${B}\narrondi: 4`).probabilities[0].text).toBe('0,0282');
		expect(lawOf('X ~ B(10 ; 3/10)').probabilities[3].text).toBe('0,267');
		expect(lawOf('G suit B(10 ; 0,3)').variable).toBe('G');
	});

	it('une probabilité exacte au millième s’écrit sans zéros inutiles', () => {
		expect(lawOf('X ~ B(2 ; 1/2)').probabilities.map((p) => p.text)).toEqual([
			'0,25',
			'0,5',
			'0,25'
		]);
	});

	it('`indicateurs:` : E = np, V = np(1 − p), σ', () => {
		const scene = lawOf(`${B}\nindicateurs: espérance ; variance ; écart type`);
		expect(scene.indicators[0]).toBe('E(X) = 3');
		// p écrit en décimal : E et V en décimal exact
		expect(scene.indicators[1]).toBe('V(X) = 2,1');
		expect(scene.indicators[2]).toMatch(/^σ\(X\) ≈ 1,45$/);
	});

	it('p en fraction : E et V en fraction ; p très décimal : pas de fraction géante', () => {
		expect(lawOf('X ~ B(10 ; 1/3)\nindicateurs: espérance ; variance').indicators).toEqual([
			'E(X) = 10/3 ≈ 3,33',
			'V(X) = 20/9 ≈ 2,22'
		]);
		expect(lawOf('X ~ B(1000 ; 0,12345678901234)\nindicateurs: espérance').indicators[0]).toBe(
			'E(X) = 123,45678901234'
		);
	});

	it('p = 0 et p = 1 ; notation anglaise B(10, 0.3)', () => {
		expect(lawOf('X ~ B(3 ; 0)').probabilities.map((p) => p.text)).toEqual(['1', '0', '0', '0']);
		expect(lawOf('X ~ B(3 ; 1)').probabilities.map((p) => p.text)).toEqual(['0', '0', '0', '1']);
		expect(lawOf('X ~ B(10, 0.3)').probabilities[3].text).toBe('0,267');
	});

	it('`masquer:` comme une loi écrite à la main', () => {
		const scene = lawOf(`${B}\nmasquer: 3`);
		expect(scene.probabilities[3].hidden).toBe(true);
		expect(scene.probabilities[2].hidden).toBe(false);
	});

	it('vertical quand la ligne serait trop large pour une colonne de fiche', () => {
		expect(lawOf('X ~ B(5 ; 0,5)').vertical).toBe(false);
		expect(lawOf('X ~ B(10 ; 0,3)').vertical).toBe(true);
		// Même n, plus de décimales : plus large
		expect(lawOf('X ~ B(5 ; 0,5)\narrondi: 6').vertical).toBe(true);
	});

	it('le titre dit la loi', () => {
		expect(lawOf(B).accessibleTitle).toBe('Loi de X : B(10 ; 0,3)');
		expect(lawOf(B, 'en').accessibleTitle).toBe('Distribution of X: B(10, 0.3)');
		expect(lawOf(B, 'en').probabilities[0].text).toBe('0.028');
	});
});

describe('X ~ B(n ; p) — `probabilités:`', () => {
	it('une ligne par probabilité : =, ⩽, entre deux bornes, >', () => {
		const scene = lawOf(`${B}\nprobabilités: P(X = 3) ; P(X ⩽ 4) ; P(2 ⩽ X ⩽ 5) ; P(X > 7)`);
		expect(scene.indicators).toEqual([
			'P(X = 3) ≈ 0,267',
			'P(X ⩽ 4) ≈ 0,850',
			'P(2 ⩽ X ⩽ 5) ≈ 0,803',
			'P(X > 7) ≈ 0,002'
		]);
	});

	it('<=, >=, <, ≤ sont lus ; une valeur exacte s’écrit avec =', () => {
		expect(lawOf(`${B}\nprobabilités: P(X <= 4) ; P(X >= 8) ; P(X < 1)`).indicators).toEqual([
			'P(X ⩽ 4) ≈ 0,850',
			'P(X ⩾ 8) ≈ 0,002',
			'P(X < 1) ≈ 0,028'
		]);
		expect(lawOf('X ~ B(2 ; 1/2)\nprobabilités: P(X ≤ 1)').indicators).toEqual(['P(X ⩽ 1) = 0,75']);
	});

	it('après les indicateurs, dans l’ordre écrit', () => {
		const scene = lawOf(`${B}\nindicateurs: espérance\nprobabilités: P(X = 0)`);
		expect(scene.indicators).toEqual(['E(X) = 3', 'P(X = 0) ≈ 0,028']);
	});
});

describe('X ~ B(n ; p) — au-delà de 30 valeurs', () => {
	it('pas de tableau, un message pour l’auteur ; les probabilités restent', () => {
		const node = nodeOf('X ~ B(100 ; 0,5)\nprobabilités: P(X ⩽ 50)');
		const scene = buildStatChartScene(node.spec!) as LawScene;

		expect(scene.tableHidden).toBe(true);
		expect(node.warnings[0].message).toMatch(/101 valeurs : tableau non affiché \(au plus 30\)/);
		expect(scene.indicators).toEqual(['P(X ⩽ 50) ≈ 0,540']);
	});

	it('n = 1 000 se calcule', () => {
		expect(lawOf('X ~ B(1000 ; 0,5)\nprobabilités: P(X ⩽ 500)').indicators[0]).toMatch(
			/^P\(X ⩽ 500\) ≈ 0,513$/
		);
	});
});

// =============================================================================
// PDF
// =============================================================================

describe('X ~ B(n ; p) — Typst', () => {
	it('les mêmes probabilités qu’à l’écran, et les lignes de probabilités', () => {
		const source = `${B}\nprobabilités: P(X ⩽ 4)`;
		// Espaces insécables entre parenthèses dans le PDF : même texte
		const typst = generateStatChartTypst(nodeOf(source)).replace(/\u00a0/g, ' ');
		const scene = lawOf(source);

		for (const p of scene.probabilities) expect(typst).toContain(`[#"${p.text}"]`);
		expect(typst).toContain('P(X ⩽ 4) ≈ 0,850');
	});

	it('vertical : deux colonnes ; horizontal : une colonne par valeur', () => {
		expect(generateStatChartTypst(nodeOf(B))).toContain('columns: (auto,) * 2');
		expect(generateStatChartTypst(nodeOf('X ~ B(5 ; 0,5)'))).toContain('columns: (auto,) * 7');
	});

	it('au-delà de 30 valeurs : pas de tableau dans le PDF non plus', () => {
		const typst = generateStatChartTypst(
			nodeOf('X ~ B(100 ; 0,5)\nprobabilités: P(X ⩽ 50)')
		).replace(/\u00a0/g, ' ');
		expect(typst).not.toContain('#table(');
		expect(typst).toContain('P(X ⩽ 50)');
	});
});

// =============================================================================
// Erreurs
// =============================================================================

describe('X ~ B(n ; p) — erreurs situées', () => {
	it('n : un entier de 1 à 1 000 ; p : entre 0 et 1', () => {
		const n = 'Ligne 1 : B(n ; p) : n est un entier de 1 à 1 000';
		expect(errorOf('X ~ B(0 ; 0,3)')).toBe(n);
		expect(errorOf('X ~ B(1001 ; 0,3)')).toBe(n);
		expect(errorOf('X ~ B(2,5 ; 0,3)')).toBe(n);
		const p = 'Ligne 1 : B(n ; p) : p est un nombre entre 0 et 1';
		expect(errorOf('X ~ B(10 ; 1,2)')).toBe(p);
		expect(errorOf('X ~ B(10 ; -0,1)')).toBe(p);
		expect(errorOf('X ~ B(10 ; beaucoup)')).toBe(p);
	});

	it('p : division par zéro, écriture scientifique, trop de chiffres', () => {
		const p = 'Ligne 1 : B(n ; p) : p est un nombre entre 0 et 1';
		expect(errorOf('X ~ B(10 ; 1/0)')).toBe(p);
		expect(errorOf('X ~ B(1e3 ; 0,5)')).toBe('Ligne 1 : B(n ; p) : n est un entier de 1 à 1 000');
		expect(errorOf('X ~ B(10 ; 0,1234567890123456)')).toBe(
			'Ligne 1 : B(n ; p) : p a au plus 15 chiffres'
		);
	});

	it('des bornes : décimales, hors de [0 ; n], dans le désordre', () => {
		expect(lawOf(`${B}\nprobabilités: P(X < 2,5) ; P(X > 15) ; P(1 < X < 3)`).indicators).toEqual([
			'P(X < 2,5) ≈ 0,383',
			'P(X > 15) = 0',
			'P(1 < X < 3) ≈ 0,233'
		]);
		expect(errorOf(`${B}\nprobabilités: P(5 ⩽ X ⩽ 2)`)).toBe(
			'Ligne 2 : probabilités : « P(5 ⩽ X ⩽ 2) » : les bornes dans l’ordre (la plus petite d’abord)'
		);
	});

	it('`masquer:` sans tableau (plus de 30 valeurs)', () => {
		expect(errorOf('X ~ B(100 ; 0,5)\nmasquer: 3')).toBe(
			'Ligne 2 : masquer : pas de tableau au-delà de 30 valeurs'
		);
	});

	it('une probabilité mal écrite, ou d’une autre variable', () => {
		expect(errorOf(`${B}\nprobabilités: P(Y ⩽ 2)`)).toBe(
			'Ligne 2 : probabilités : « P(Y ⩽ 2) » parle de Y, la variable est X'
		);
		expect(errorOf(`${B}\nprobabilités: X ⩽ 2`)).toBe(
			'Ligne 2 : probabilités : écrire P(X = 3), P(X ⩽ 4) ou P(2 ⩽ X ⩽ 5)'
		);
	});

	it('pas de mélange avec des lignes X = / P =', () => {
		expect(errorOf(`${B}\nP = 1/2 ; 1/2`)).toBe(
			'Ligne 2 : une loi binomiale se donne seule : pas de ligne « X = » ni « P = »'
		);
	});

	it('`probabilités:`, `arrondi:`, `diagramme:` : seulement avec une loi nommée', () => {
		const named =
			'seulement avec une loi binomiale, géométrique ou uniforme (X ~ B(n ; p), G(p) ou U(a ; b))';
		expect(errorOf('X = 0 ; 1\nP = 1/2 ; 1/2\nprobabilités: P(X = 1)')).toBe(
			`Ligne 3 : probabilités : ${named}`
		);
		expect(errorOf('X = 0 ; 1\nP = 1/2 ; 1/2\ndiagramme: oui')).toBe(
			`Ligne 3 : diagramme : ${named}`
		);
	});

	it('une loi écrite à la main ne change pas', () => {
		expect(lawOf('X = 0 ; 1\nP = 1/2 ; 1/2').probabilities.map((p) => p.text)).toEqual([
			'1/2',
			'1/2'
		]);
	});
});
