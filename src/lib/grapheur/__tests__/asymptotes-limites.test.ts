/**
 * Asymptotes horizontales, obliques et courbes.
 *
 * Trois défauts mesurés le 2026-09-15 :
 * - `estimateLimit` exigeait que les écarts rétrécissent STRICTEMENT, or une
 *   convergence exacte donne des écarts nuls et `0 >= 0 × 0,9` est vrai : une
 *   limite atteinte au flottant près était rejetée ;
 * - l'ordonnée à l'origine d'une oblique se calculait par `f(x) − m·x` avec un
 *   `m` estimé, dont l'erreur est multipliée par x (jusqu'à 100 000) ;
 * - les asymptotes courbes n'existaient pas.
 */

import { describe, it, expect } from 'vitest';
import {
	analyzeFunction,
	buildAnalysisAST,
	cachedEvaluator,
	findHorizontalAsymptotes,
	findObliqueAsymptotes,
	findPolynomialAsymptotes
} from '../analysis';
import { parseFunction } from '../evaluator';

describe('asymptotes horizontales', () => {
	it('trouve une limite atteinte exactement', () => {
		// exp(-x) vaut 0 au flottant près : les écarts entre sondes sont NULS.
		const found = findHorizontalAsymptotes((x) => Math.exp(x), 'f');

		expect(found.length).toBe(1);
		expect(found[0].y).toBeCloseTo(0, 6);
		expect(found[0].direction).toBe('left');
	});

	it("trouve les deux paliers d'une sigmoïde", () => {
		const found = findHorizontalAsymptotes((x) => 1 / (1 + Math.exp(-x)), 'f');
		const levels = found.map((a) => a.y).sort((a, b) => a - b);

		expect(found.length).toBe(2);
		expect(levels[0]).toBeCloseTo(0, 6);
		expect(levels[1]).toBeCloseTo(1, 6);
	});

	it('garde les cas qui marchaient déjà', () => {
		const inverse = findHorizontalAsymptotes((x) => (x === 0 ? null : 1 / x), 'f');
		expect(inverse.length).toBe(1);
		expect(inverse[0].y).toBeCloseTo(0, 6);
		expect(inverse[0].direction).toBe('both');

		const arctan = findHorizontalAsymptotes((x) => Math.atan(x), 'f');
		expect(arctan.length).toBe(2);
	});

	it('ne signale rien sur un polynôme', () => {
		expect(findHorizontalAsymptotes((x) => x * x, 'f')).toEqual([]);
		expect(findHorizontalAsymptotes((x) => Math.sin(x), 'f')).toEqual([]);
	});
});

describe('asymptotes obliques', () => {
	it("trouve une oblique dont l'ordonnée à l'origine n'est pas nulle", () => {
		const found = findObliqueAsymptotes((x) => (x === 2 ? null : (x * x + 3 * x) / (x - 2)), 'f');

		expect(found.length).toBe(1);
		expect(found[0].m).toBeCloseTo(1, 4);
		expect(found[0].b).toBeCloseTo(5, 3);
	});

	it("trouve une oblique de pente et d'ordonnée quelconques", () => {
		// (2x² - x + 1)/(x + 1) = 2x - 3 + 4/(x+1)
		const found = findObliqueAsymptotes(
			(x) => (x === -1 ? null : (2 * x * x - x + 1) / (x + 1)),
			'f'
		);

		expect(found.length).toBe(1);
		expect(found[0].m).toBeCloseTo(2, 4);
		expect(found[0].b).toBeCloseTo(-3, 3);
	});

	it('garde les cas qui marchaient déjà', () => {
		const simple = findObliqueAsymptotes((x) => (x === 0 ? null : x + 1 / x), 'f');
		expect(simple.length).toBe(1);
		expect(simple[0].m).toBeCloseTo(1, 4);
		expect(simple[0].b).toBeCloseTo(0, 4);

		// √(x²+1) : y = x à droite, y = -x à gauche
		const racine = findObliqueAsymptotes((x) => Math.sqrt(x * x + 1), 'f');
		expect(racine.length).toBe(2);
		expect(racine.map((a) => a.direction).sort()).toEqual(['left', 'right']);
	});

	it('ne confond pas une horizontale avec une oblique de pente nulle', () => {
		expect(findObliqueAsymptotes((x) => (x === 0 ? null : 1 / x), 'f')).toEqual([]);
	});
});

describe('asymptotes courbes', () => {
	it('trouve une parabole asymptote', () => {
		// (x³ + 1)/x = x² + 1/x
		const found = findPolynomialAsymptotes((x) => (x === 0 ? null : (x ** 3 + 1) / x), 'f');

		expect(found.length).toBe(1);
		expect(found[0].coefficients.length).toBe(3); // degré 2
		expect(found[0].coefficients[2]).toBeCloseTo(1, 3); // x²
		expect(found[0].coefficients[1]).toBeCloseTo(0, 3); // x
		expect(found[0].coefficients[0]).toBeCloseTo(0, 3); // constante
	});

	it('trouve une parabole décalée', () => {
		// (x³ + 2x² - x + 1)/(x - 1) = x² + 3x + 2 + 3/(x-1)
		const found = findPolynomialAsymptotes(
			(x) => (x === 1 ? null : (x ** 3 + 2 * x * x - x + 1) / (x - 1)),
			'f'
		);

		expect(found.length).toBe(1);
		expect(found[0].coefficients[2]).toBeCloseTo(1, 3);
		expect(found[0].coefficients[1]).toBeCloseTo(3, 2);
		expect(found[0].coefficients[0]).toBeCloseTo(2, 1);
	});

	it('ne signale rien quand la fonction EST le polynôme', () => {
		// Une parabole n'est pas asymptote d'elle-même : rien à tracer.
		expect(findPolynomialAsymptotes((x) => x * x, 'f')).toEqual([]);
	});

	it('ne signale rien pour une horizontale ou une oblique', () => {
		expect(findPolynomialAsymptotes((x) => (x === 0 ? null : 1 / x), 'f')).toEqual([]);
		expect(findPolynomialAsymptotes((x) => (x === 0 ? null : x + 1 / x), 'f')).toEqual([]);
	});

	it('ne signale rien au-delà du degré traité', () => {
		expect(findPolynomialAsymptotes((x) => Math.exp(x), 'f')).toEqual([]);
		expect(findPolynomialAsymptotes((x) => Math.sin(x), 'f')).toEqual([]);
	});
});

describe('pièges de la détection numérique', () => {
	it('ne prend pas une oscillation échantillonnée à sa période pour une asymptote', () => {
		// cos(πx/50) a pour période 100 : sondée sur 100, 1000, 10000… elle rend
		// EXACTEMENT 1 à chaque fois. Les écarts sont nuls, et « les écarts sont
		// nuls » vaut désormais convergence — d'où une horizontale y = 1 tracée
		// sur une fonction qui oscille entre -1 et 1.
		expect(findHorizontalAsymptotes((x) => Math.cos((Math.PI * x) / 50), 'f')).toEqual([]);
	});

	it("ne trace pas d'asymptote sur une fonction constante", () => {
		// Le pointillé serait posé exactement sur la courbe. Les obliques et les
		// courbes refusent déjà ce cas ; l'horizontale l'acceptait.
		expect(findHorizontalAsymptotes(() => 3, 'f')).toEqual([]);
	});

	it("trouve les branches d'une hyperbole", () => {
		// √(x² - 250000) n'est pas définie sur [-500 ; 500] : les sondes de
		// vérification y tombaient, ne mesuraient rien, et « rien mesuré » était
		// lu comme « la fonction EST son asymptote » — donc rejet.
		const hyperbole = (x: number): number | null => {
			const under = x * x - 250000;
			return under < 0 ? null : Math.sqrt(under);
		};
		const found = findObliqueAsymptotes(hyperbole, 'f');

		expect(found.length).toBe(2);
		expect(found.map((a) => a.direction).sort()).toEqual(['left', 'right']);
		expect(Math.abs(found[0].m)).toBeCloseTo(1, 3);
	});

	it('trouve une asymptote approchée exponentiellement', () => {
		// x + e^(-x) : à x = 100, e^(-100) est inférieur à l'ulp, donc l'écart
		// mesuré est nul — le même piège que la convergence exacte, redéposé
		// dans la vérification.
		const found = findObliqueAsymptotes((x) => x + Math.exp(-x), 'f');

		expect(found.some((a) => a.direction !== 'left')).toBe(true);
		expect(found[0].m).toBeCloseTo(1, 4);
	});
});

describe('limites assumées de la voie numérique', () => {
	it('trouve une oblique dont le pôle est loin de zéro', () => {
		// L'écart à l'asymptote vaut A/x + A·a/x² + … : le terme en 1/x² survit
		// au premier niveau d'extrapolation. `(x²+3x)/(x−a)` était perdu dès
		// a = 20.
		for (const [pole, expected] of [
			[20, 23],
			[100, 103]
		] as const) {
			const found = findObliqueAsymptotes(
				(x) => (x === pole ? null : (x * x + 3 * x) / (x - pole)),
				'f'
			);
			expect(found.length, `pôle ${pole}`).toBe(1);
			expect(found[0].b, `pôle ${pole}`).toBeCloseTo(expected, 2);
		}
	});

	it('trouve une parabole asymptote dont les coefficients sont grands', () => {
		// x³/(x−20) = x² + 20x + 400 + 8000/(x−20)
		const found = findPolynomialAsymptotes((x) => (x === 20 ? null : x ** 3 / (x - 20)), 'f');

		expect(found.length).toBe(1);
		expect(found[0].coefficients[2]).toBeCloseTo(1, 3);
		expect(found[0].coefficients[1]).toBeCloseTo(20, 1);
		expect(found[0].coefficients[0]).toBeCloseTo(400, 0);
	});

	it("s'arrête au degré 2, et l'assume", () => {
		// (x⁴+1)/(x−1) suit y = x³ + x² + x + 1. Au degré 3, le coefficient
		// constant se reconstruit par annulation catastrophique : à x = 16 000,
		// x³ vaut 4e12. La voie symbolique le lèvera ; la voie numérique ne le
		// promet pas.
		expect(findPolynomialAsymptotes((x) => (x === 1 ? null : (x ** 4 + 1) / (x - 1)), 'f')).toEqual(
			[]
		);
	});
});

describe('pièges introduits par les corrections', () => {
	it('garde les horizontales des fonctions qui saturent vite', () => {
		// tanh(17) vaut 1 à 3,4e-15 près : un garde « la fonction est-elle
		// constante ? » qui ne sonde qu'au loin conclut qu'elle EST la
		// constante, et supprime l'asymptote — la famille même que la
		// correction d'origine visait.
		expect(findHorizontalAsymptotes((x) => Math.tanh(x), 'f').length).toBe(2);
		expect(findHorizontalAsymptotes((x) => 5 * Math.tanh(x) + 2, 'f').length).toBe(2);

		const gaussienne = findHorizontalAsymptotes((x) => Math.exp(-x * x), 'f');
		expect(gaussienne.length).toBeGreaterThan(0);
		expect(gaussienne[0].y).toBeCloseTo(0, 6);
	});

	it("refuse une constante définie d'un seul côté", () => {
		// Le garde exigeait les DEUX limites : une demi-constante gardait son
		// pointillé posé sur elle-même.
		expect(findHorizontalAsymptotes((x) => (x < 0 ? null : 3), 'f')).toEqual([]);
	});

	it("ne prend pas une oscillation autour d'un polynôme pour une asymptote", () => {
		// x² + 3cos(x) oscille de ±3 autour de x², indéfiniment. Un critère de
		// convergence fondé sur un SEUL rapport d'écarts se laisse convaincre :
		// une suite quasi aléatoire franchit souvent un rapport unique.
		expect(findPolynomialAsymptotes((x) => x * x + 3 * Math.cos(x), 'f')).toEqual([]);
		expect(findObliqueAsymptotes((x) => x + 1.41 * Math.sin(0.9545 * x), 'f')).toEqual([]);
	});

	it('trouve une parabole asymptote de coefficient minuscule', () => {
		// Le plancher `Math.max(..., 1)` ramenait le seuil relatif à un seuil
		// absolu de 1e-4 dès que les coefficients sont petits.
		const found = findPolynomialAsymptotes(
			(x) => (x === 0 ? null : 5e-5 * x * x + 10 * x + 1 / x),
			'f'
		);

		expect(found.length).toBe(1);
		expect(found[0].coefficients[2]).toBeCloseTo(5e-5, 8);
		expect(found[0].coefficients[1]).toBeCloseTo(10, 4);
	});
});

describe('limite nulle estimée de loin', () => {
	// La limite est lue en x = 137 299, où ln(x)/x vaut encore 8,6·10⁻⁵ : sans
	// arrondi, une fenêtre zoomée affichait « y = 0.00008616 ».
	const lnOverX = (x: number): number | null => (x > 0 ? Math.log(x) / x : null);

	it('rend y = 0 exactement pour ln(x)/x et sin(x)/x', () => {
		expect(findHorizontalAsymptotes(lnOverX, 'f').map((a) => a.y)).toEqual([0]);
		expect(findHorizontalAsymptotes((x) => Math.sin(x) / x, 'f').map((a) => a.y)).toEqual([0]);
	});

	it('garde une petite limite non nulle', () => {
		const found = findHorizontalAsymptotes((x) => 0.001 + Math.exp(-x), 'f');
		expect(found.map((a) => a.y)).toEqual([0.001]);
	});

	it('ne touche pas une limite non nulle approchée lentement', () => {
		const found = findHorizontalAsymptotes(Math.atan, 'f');
		expect(found.map((a) => a.y.toFixed(4))).toEqual(['1.5708', '-1.5708']);
	});

	it("rend une ordonnée à l'origine nulle pour x + ln(x)/x", () => {
		const found = findObliqueAsymptotes((x) => (x > 0 ? x + Math.log(x) / x : null), 'f');
		expect(found.map((a) => a.b)).toEqual([0]);
	});

	it('rend un terme constant nul pour x² + ln(x)/x', () => {
		// 1,09·10⁻⁴ dépassait le seuil de masquage de l'étiquette : « y = x² + 0.000109 ».
		const found = findPolynomialAsymptotes((x) => (x > 0 ? x * x + Math.log(x) / x : null), 'f');
		expect(found.length).toBe(1);
		expect(found[0].coefficients[0]).toBe(0);
	});
});

describe('limites horizontales : le symbolique en renfort', () => {
	const analyze = (latex: string) => {
		const parsed = parseFunction(latex);
		if (!parsed.ast) throw new Error(`illisible : ${latex}`);
		return analyzeFunction(
			cachedEvaluator(parsed.ast),
			{ xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
			'f',
			buildAnalysisAST(parsed.ast)
		).horizontalAsymptotes;
	};

	it('trouve y = 0 pour ln(x)/√x, que les sondes voient converger trop lentement', () => {
		// En x = 137 299, ln(x)/√x vaut encore 0,032 : l'estimation numérique renonce.
		const found = analyze('\\frac{\\ln(x)}{\\sqrt{x}}');
		expect(found.map((a) => [a.direction, a.y])).toEqual([['right', 0]]);
	});

	it('écrit la limite exacte quand le symbolique confirme le numérique', () => {
		const found = analyze('\\left(1+\\frac{1}{x}\\right)^{x}');
		const right = found.find((a) => a.direction !== 'left');
		expect(right?.exactLatex).toBe('y = \\exponentialE');
		expect(right?.y).toBeCloseTo(Math.E, 9);
	});

	it('garde le numérique là où le symbolique ne sait pas (arctan)', () => {
		const found = analyze('\\arctan(x)');
		expect(found.map((a) => a.y.toFixed(4))).toEqual(['1.5708', '-1.5708']);
	});

	it("ne pose pas d'asymptote sur une constante", () => {
		expect(analyze('3')).toEqual([]);
	});
});
