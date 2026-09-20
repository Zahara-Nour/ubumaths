/**
 * Pgcd multivarié : `gcdPolynomialsMultivariate`.
 *
 * Ces tests visent la fonction elle-même, pas le décideur d'équivalence — le
 * contrat de bout en bout vit dans `pgcd-multivarie.test.ts`.
 *
 * ## Ce qu'ils affirment, et ce qu'ils n'affirment PAS
 *
 * Ils n'affirment **pas** que la fonction rend le pgcd. Elle n'est pas prouvée,
 * et n'a pas à l'être : `normalFormFromFraction` revérifie tout candidat par
 * division exacte des deux côtés avant de s'en servir. Un candidat faux produit
 * un faux négatif — une fraction non réduite —, jamais un faux positif, et un
 * faux positif du décideur compterait une réponse d'élève FAUSSE.
 *
 * Ce qu'ils affirment :
 *
 * 1. sur les écritures que les élèves produisent, le candidat est bien le
 *    facteur commun attendu, **à une constante près** (un pgcd n'est défini
 *    qu'à un inversible près : on teste l'association, pas l'égalité) ;
 * 2. quand il n'y a rien à partager, la fonction rend `null` — et non un
 *    diviseur constant, qui défigurerait la fraction sans rien réduire ;
 * 3. tout candidat non nul divise EFFECTIVEMENT les deux entrées (c'est la
 *    propriété dont dépend la sûreté du branchement) ;
 * 4. elle sort du domaine plutôt que de deviner : exposants non entiers, trop
 *    de variables, signal d'interruption.
 */

import { describe, it, expect } from 'vitest';
import { AbortError, withActiveAbortChecker } from '../../common/abort';
import { parseLatex } from '../../parser';
import { normalize } from '../normalize';
import {
	exactDividePolynomials,
	gcdPolynomialsMultivariate,
	isConstantPolynomial
} from '../polynomial';
import type { NormalTerm } from '../types';

/** Polynôme normalisé (donc développé) à partir d'une écriture LaTeX. */
const poly = (latex: string): readonly NormalTerm[] => normalize(parseLatex(latex)).numerator;

const pgcd = (a: string, b: string): NormalTerm[] | null =>
	gcdPolynomialsMultivariate(poly(a), poly(b));

/**
 * `p` et `q` sont associés : chacun divise l'autre exactement, donc ils ne
 * diffèrent que d'un facteur constant. C'est la seule égalité qu'un pgcd
 * promette.
 */
const associes = (p: readonly NormalTerm[] | null, q: readonly NormalTerm[]): boolean => {
	if (p === null) return false;
	return exactDividePolynomials(p, q) !== null && exactDividePolynomials(q, p) !== null;
};

describe('le facteur commun est trouvé, à une constante près', () => {
	it.each([
		['x^2-y^2', 'x^2+2xy+y^2', 'x+y'],
		['(x+y)(x-y)', '(x+y)(x+2y)', 'x+y'],
		['(a+b)(a-b)', '(a+b)(a+2b)', 'a+b'],
		['x^3-y^3', 'x^2-y^2', 'x-y'],
		['x^4-y^4', 'x^3-y^3', 'x-y'],
		['2x^2-2y^2', '3x^2+6xy+3y^2', 'x+y'],
		['(x+y)^2(x-y)', '(x+y)(x-y)^2', '(x+y)(x-y)'],
		// Le facteur commun est un monôme : le cas que `gcdPolynomials` savait
		// déjà traiter doit continuer de passer par ici aussi.
		['x^2y+xy^2', 'xy', 'xy'],
		// Associés : chacun divise l'autre, le pgcd est l'un des deux.
		['x+y', '2x+2y', 'x+y'],
		// Trois variables.
		['(x+y)(x+z)', '(x+y)(y+z)', 'x+y'],
		// Un facteur commun de degré 2.
		['(x^2+xy+y^2)(x-y)', '(x^2+xy+y^2)(x+y)', 'x^2+xy+y^2']
	])('pgcd(%s, %s) ≈ %s', (a, b, attendu) => {
		expect(associes(pgcd(a, b), poly(attendu))).toBe(true);
	});
});

describe('rien à partager : null, et surtout pas un diviseur constant', () => {
	it.each([
		// Premiers entre eux.
		['x^2+y^2', 'x^2+2xy+y^2'],
		['(x+y)^2', 'x+2y'],
		['x+y', 'x-y'],
		// Le facteur commun apparent porte sur des variables différentes.
		['x^2-y^2', 'x^2-z^2'],
		// Deux constantes : un diviseur constant ne réduit rien.
		['4', '6'],
		// Un seul côté constant.
		['2', 'x+y']
	])('pgcd(%s, %s) = null', (a, b) => {
		expect(pgcd(a, b)).toBeNull();
	});

	it('ne rend jamais un polynôme constant', () => {
		// Si un jour le calcul retombait sur une constante, le branchement la
		// prendrait pour un facteur commun et diviserait tout par elle.
		const resultat = pgcd('6x^2-6y^2', '4x^2+8xy+4y^2');
		if (resultat === null) throw new Error('le facteur commun x+y devait être trouvé');
		expect(isConstantPolynomial(resultat)).toBe(false);
	});
});

describe('tout candidat non nul divise effectivement les deux entrées', () => {
	// C'est la propriété dont dépend la sûreté du branchement. Elle est
	// revérifiée à l'appel, mais si elle tombait systématiquement ici, la
	// réduction serait morte sans que rien ne devienne rouge.
	it.each([
		['x^2-y^2', 'x^2+2xy+y^2'],
		['x^4-y^4', 'x^3-y^3'],
		['(x+y)^2(x-y)', '(x+y)(x-y)^2'],
		['2x^2-2y^2', '3x^2+6xy+3y^2'],
		['(x+y)(x+z)', '(x+y)(y+z)'],
		['x^2y+xy^2', 'xy']
	])('pgcd(%s, %s) divise les deux', (a, b) => {
		const resultat = pgcd(a, b);
		if (resultat === null) throw new Error('un facteur commun devait être trouvé');
		expect(exactDividePolynomials(poly(a), resultat)).not.toBeNull();
		expect(exactDividePolynomials(poly(b), resultat)).not.toBeNull();
	});
});

describe('hors domaine : on renonce plutôt que de deviner', () => {
	it('un exposant non entier sort du domaine', () => {
		// L'ordre monomial n'est plus bien fondé : la terminaison ne tient plus.
		expect(pgcd('\\sqrt{x}+y', 'x+y')).toBeNull();
	});

	it('au-delà du plafond de variables, null', () => {
		// 7 bases distinctes > GCD_MAX_VARIABLES : le coût de la récursion est
		// exponentiel en ce nombre, on n'y va pas.
		expect(pgcd('(a+b)(c+d)(e+f)', '(a+b)(c+d)(e+g)')).toBeNull();
	});

	it('le signal d’interruption ambiant est consulté', () => {
		// Sans cette lecture, un `timeoutMs` ne bornerait rien sur ce chemin.
		expect(() =>
			withActiveAbortChecker(
				() => true,
				() => pgcd('x^4-y^4', 'x^3-y^3')
			)
		).toThrow(AbortError);
	});

	it('rend la main sur une entrée lourde', () => {
		// Décor : deux polynômes denses de degré 6 à 3 variables, un seul appel,
		// machine de développement. Le verdict importe peu — null est une
		// réponse valable —, c'est le fait de rendre la main qui est testé.
		const debut = performance.now();
		pgcd('(x+y+z)^6', '(x+y+z)^5+x^4+1');
		expect(performance.now() - debut).toBeLessThan(2000);
	});
});
