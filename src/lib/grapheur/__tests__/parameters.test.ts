/**
 * Paramètres nommés — `a`, `b`, … — utilisables dans n'importe quelle
 * expression et balayés au curseur.
 *
 * L'enjeu n'est pas seulement le tracé : une lettre libre laissée dans l'AST
 * ferait voir une seconde inconnue à `solve`, et la dérivée la traînerait. Les
 * valeurs sont donc substituées avant tout travail symbolique.
 */

import { describe, expect, it } from 'vitest';
import {
	analyzeAllFunctions,
	bindParameters,
	derivativeCurve,
	tangentAt,
	toAnalysisInputs
} from '../analysis';
import { createEvaluator, parseFunction } from '../evaluator';
import { computeSequenceTerms, parseSequence, toComputeSpec } from '../sequence';
import { graphStateSchema, nextParameterName, RESERVED_PARAMETER_NAMES } from '../types';
import type { ExplicitFunction, Viewport } from '../types';

const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

function curve(latex: string): ExplicitFunction {
	const parsed = parseFunction(latex);

	return {
		id: latex,
		type: 'explicit',
		latex,
		ast: parsed.ast ?? undefined,
		parseError: parsed.error ?? undefined,
		variable: 'x',
		color: '#0000ff',
		visible: true,
		lineWidth: 2,
		lineStyle: 'solid',
		showDerivative: false,
		tangentAt: null
	};
}

describe('nextParameterName', () => {
	it('prend la première lettre libre', () => {
		expect(nextParameterName([])).toBe('a');
		expect(nextParameterName(['a'])).toBe('b');
		expect(nextParameterName(['a', 'b'])).toBe('c');
	});

	it('n’offre jamais une lettre réservée', () => {
		for (let i = 0; i < 8; i++) {
			const used = ['a', 'b', 'c', 'k', 'm', 'p', 'q'].slice(0, i);
			expect(RESERVED_PARAMETER_NAMES.has(nextParameterName(used))).toBe(false);
		}
	});
});

describe('bindParameters', () => {
	it('rend l’expression inchangée sans paramètre', () => {
		const ast = parseFunction('x^2').ast!;

		expect(bindParameters(ast, {})).toBe(ast);
	});

	it('mémoïse par valeurs : deux appels identiques rendent le même objet', () => {
		const ast = parseFunction('a*x').ast!;

		expect(bindParameters(ast, { a: 2 })).toBe(bindParameters(ast, { a: 2 }));
	});

	it('recalcule quand la valeur change', () => {
		const ast = parseFunction('a*x').ast!;

		expect(bindParameters(ast, { a: 2 })).not.toBe(bindParameters(ast, { a: 3 }));
	});
});

describe('une fonction paramétrée s’évalue', () => {
	it('n’évalue à rien sans liaison', () => {
		const evaluate = createEvaluator(parseFunction('a*x+b').ast!);

		expect(evaluate(2)).toBeNull();
	});

	it('trace y = ax + b une fois a et b liés', () => {
		const evaluate = createEvaluator(parseFunction('a*x+b').ast!, { a: 3, b: 1 });

		expect(evaluate(2)).toBeCloseTo(7);
		expect(evaluate(0)).toBeCloseTo(1);
	});
});

describe('l’analyse voit les paramètres substitués', () => {
	it('trouve le zéro de ax + b, qui dépend des valeurs', () => {
		const inputs = toAnalysisInputs([curve('a*x+b')], { a: 2, b: -4 });
		const [analysis] = analyzeAllFunctions(inputs, viewport);

		expect(analysis.roots).toHaveLength(1);
		expect(analysis.roots[0].x).toBeCloseTo(2);
	});

	it('suit le curseur : changer a déplace le zéro', () => {
		const zeroFor = (a: number) =>
			analyzeAllFunctions(toAnalysisInputs([curve('a*x+b')], { a, b: -4 }), viewport).at(0)
				?.roots[0]?.x;

		expect(zeroFor(2)).toBeCloseTo(2);
		expect(zeroFor(4)).toBeCloseTo(1);
	});

	it('donne le sommet exact de x² + a, où a n’apparaît plus', () => {
		const inputs = toAnalysisInputs([curve('x^2+a')], { a: -2 });
		const [analysis] = analyzeAllFunctions(inputs, viewport);

		expect(analysis.extrema).toHaveLength(1);
		expect(analysis.extrema[0].x).toBeCloseTo(0);
		expect(analysis.extrema[0].y).toBeCloseTo(-2);
	});

	it('ignore une courbe dont le paramètre n’est pas déclaré', () => {
		// `c` n'est lié par rien : l'expression reste inévaluable.
		const [analysis] = analyzeAllFunctions(toAnalysisInputs([curve('c*x')], { a: 1 }), viewport);

		expect(analysis.roots).toEqual([]);
	});
});

describe('une suite accepte les paramètres déclarés', () => {
	it('refuse une lettre non déclarée', () => {
		expect(parseSequence('a*u_n', 'recurrence', 'u').success).toBe(false);
	});

	it('accepte la même lettre une fois déclarée', () => {
		expect(parseSequence('a*u_n', 'recurrence', 'u', ['a']).success).toBe(true);
	});

	it('itère avec la valeur du paramètre', () => {
		const parsed = parseSequence('a*u_n', 'recurrence', 'u', ['a']);
		const spec = toComputeSpec(
			{ mode: 'recurrence', ast: parsed.ast ?? undefined, firstIndex: 0, firstTerm: 1 },
			{ a: 2 }
		);

		const terms = computeSequenceTerms(spec!, 4).map((t) => t.value);

		expect(terms).toEqual([1, 2, 4, 8, 16]);
	});
});

describe('persistance', () => {
	const BASE = {
		version: 2,
		viewport,
		showGrid: true,
		functions: []
	};

	it('rétablit une liste vide quand la clé manque', () => {
		const result = graphStateSchema.safeParse(BASE);

		expect(result.success).toBe(true);
		expect(result.data?.parameters).toEqual([]);
	});

	it('conserve les paramètres enregistrés', () => {
		const result = graphStateSchema.safeParse({
			...BASE,
			parameters: [
				{
					id: '11111111-1111-4111-8111-111111111111',
					name: 'a',
					value: 3,
					min: -5,
					max: 5
				}
			]
		});

		expect(result.data?.parameters[0].name).toBe('a');
		expect(result.data?.parameters[0].value).toBe(3);
	});

	it('rejette un nom réservé', () => {
		const result = graphStateSchema.safeParse({
			...BASE,
			parameters: [
				{ id: '11111111-1111-4111-8111-111111111111', name: 'x', value: 1, min: 0, max: 2 }
			]
		});

		expect(result.success).toBe(false);
	});
});

/**
 * La dérivée est construite à partir de la fonction à chaque image, jamais
 * stockée : éditer `f` redessine `f'`, ce qui est tout l'intérêt de les voir
 * ensemble.
 */
describe('courbe dérivée', () => {
	it('dérive une fonction simple', () => {
		const d = derivativeCurve(curve('x^2'));

		expect(d).toBeDefined();
		expect(createEvaluator(d!.ast!)(3)).toBeCloseTo(6);
		expect(createEvaluator(d!.ast!)(-2)).toBeCloseTo(-4);
	});

	it('se distingue de la fonction : pointillés, trait plus fin, id dérivé', () => {
		const d = derivativeCurve(curve('x^2'));

		expect(d?.lineStyle).toBe('dashed');
		expect(d?.lineWidth).toBeLessThan(curve('x^2').lineWidth);
		expect(d?.id).toBe('x^2:derivative');
	});

	it('ne se dérive pas elle-même', () => {
		expect(derivativeCurve(curve('x^2'))?.showDerivative).toBe(false);
	});

	it('substitue les paramètres avant de dériver', () => {
		// a·x² avec a = 3 donne 6x, et non une expression portant encore « a ».
		const d = derivativeCurve(curve('a*x^2'), { a: 3 });

		expect(createEvaluator(d!.ast!)(2)).toBeCloseTo(12);
	});

	it('suit le curseur du paramètre', () => {
		const slopeAt2 = (a: number) =>
			createEvaluator(derivativeCurve(curve('a*x^2'), { a })!.ast!)(2);

		expect(slopeAt2(1)).toBeCloseTo(4);
		expect(slopeAt2(5)).toBeCloseTo(20);
	});

	it('ne rend rien pour une expression invalide', () => {
		expect(derivativeCurve(curve(')('))).toBeUndefined();
	});

	it('rend une dérivée nulle pour une constante', () => {
		const d = derivativeCurve(curve('4'));

		expect(createEvaluator(d!.ast!)(7)).toBeCloseTo(0);
	});
});

/**
 * La tangente rend visible ce qu'est un nombre dérivé : une pente. La droite
 * est rendue comme un tracé ordinaire — elle est simplement droite — pour que
 * le rendu n'ait aucun cas particulier à connaître.
 */
describe('tangente', () => {
	it('touche la courbe au point demandé', () => {
		const t = tangentAt(curve('x^2'), 3);

		expect(t?.x).toBe(3);
		expect(t?.y).toBeCloseTo(9);
	});

	it('a pour pente le nombre dérivé', () => {
		expect(tangentAt(curve('x^2'), 3)?.slope).toBeCloseTo(6);
		expect(tangentAt(curve('x^3'), 2)?.slope).toBeCloseTo(12);
	});

	it('est bien la tangente : elle passe par le point et suit la pente', () => {
		const t = tangentAt(curve('x^2'), 3)!;
		const line = createEvaluator(t.line.ast!);

		// y = 6x − 9 : elle vaut 9 en 3, et monte de 6 par unité.
		expect(line(3)).toBeCloseTo(9);
		expect(line(4)! - line(3)!).toBeCloseTo(6);
	});

	it('est horizontale à un extremum', () => {
		expect(tangentAt(curve('x^2'), 0)?.slope).toBeCloseTo(0);
	});

	it('tient compte des paramètres', () => {
		expect(tangentAt(curve('a*x^2'), 1, { a: 5 })?.slope).toBeCloseTo(10);
	});

	it('ne se dérive ni ne se tangente elle-même', () => {
		const t = tangentAt(curve('x^2'), 1)!;

		expect(t.line.showDerivative).toBe(false);
		expect(t.line.tangentAt).toBeNull();
	});

	it('ne rend rien là où la fonction n’est pas définie', () => {
		expect(tangentAt(curve('1/x'), 0)).toBeUndefined();
		expect(tangentAt(curve('\\sqrt{x}'), -4)).toBeUndefined();
	});

	it('ne rend rien pour une abscisse non finie', () => {
		expect(tangentAt(curve('x^2'), Number.NaN)).toBeUndefined();
	});
});
