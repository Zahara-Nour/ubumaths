/**
 * ORACLE des étapes de résolution — équations et inéquations du programme.
 *
 * Règle, pour chaque entrée : si `pedagogical-solve` produit des étapes qui
 * CONCLUENT, alors
 *   1. équation : l'ensemble conclu = l'ensemble du moteur (`solve`), et
 *      chaque solution vérifie l'équation par substitution numérique ;
 *   2. inéquation : en chaque point d'une grille (bornes comprises), la
 *      conclusion est vraie exactement quand l'inéquation l'est.
 * Sinon (le générateur refuse ou ne conclut pas), c'est un repli : permis.
 *
 * L'oracle interroge le GÉNÉRATEUR, pas `solveSteps` : le garde-fou de
 * `solveSteps` masquerait les étapes fausses, et l'oracle ne verrait plus rien.
 * Ses vérifications sont écrites ici, indépendamment de `solve-steps-check`.
 *
 * `KNOWN_WRONG` : les entrées dont les étapes concluent faux aujourd'hui. Figé,
 * vide visé. Une entrée qui y figure doit être réellement fausse (sinon la
 * retirer) et `solveSteps` doit la replier (le garde-fou la rattrape).
 */

import { describe, expect, it } from 'vitest';
import { astOf } from '../parse';
import { solveSteps } from '../solve-steps';
import { generateEquationSteps, generateInequalitySteps } from '$lib/mathAST/pedagogical-solve';
import type { EquationStep } from '$lib/mathAST/pedagogical-solve';
import { solve } from '$lib/mathAST/solve';
import { solveInequality } from '$lib/mathAST/solve/inequality';
import { containsValue } from '$lib/mathAST/domain/algebra';
import { compile } from '$lib/mathAST/eval/compile';
import type { MathNode, RelationNode } from '$lib/mathAST/types';

// =============================================================================
// Constantes
// =============================================================================

const EQUATIONS: readonly string[] = [
	// Premier degré
	'3x+5=14',
	'2x-4=0',
	'x+7=2',
	'-3x=6',
	'5x=0',
	'x/2=3',
	'2x/3-1=1',
	'3x+5=14x',
	'7-2x=3x+2',
	'0.5x+1=2',
	'4x-1=2x+5',
	'x=5',
	'-x+4=1',
	'10=2x',
	'3=x-1',
	// Parenthèses
	'(2x-4)=0',
	'(2x-3)=0',
	'(x+1)=3',
	'((x))=5',
	'((x-5))=0',
	'0=(x-4)',
	'(3x+1)=(x+5)',
	'2(x-1)=4',
	'-(x-3)=0',
	'3(x+2)=2(x-1)',
	'(2x-4)/2=0',
	'3+(x-1)=5',
	'2x-(x+1)=0',
	// Second degré
	'x^2-4=0',
	'x^2=9',
	'x^2+1=0',
	'x^2-3x=0',
	'x^2-3x+1=0',
	'x^2-5x+6=0',
	'2x^2-8=0',
	'x^2+2x+1=0',
	'3x^2-12=0',
	'(x^2-4)=0',
	'x^2=2x',
	'-x^2+4x-3=0',
	'(x-1)^2=0',
	'(x+1)^2=4',
	// Produits nuls
	'(x-1)(x+2)=0',
	'x(x-3)=0',
	'(2x-1)(x+5)=0',
	'(x-1)(x-1)=0',
	'3(x-2)(x+4)=0',
	// Fractions
	'x/3+x/6=1',
	'(x+1)/2=3',
	'1/x=2',
	'(x-1)/(x+1)=0',
	// Valeurs absolues
	'|x|=3',
	'|x-1|=2',
	'|2x+1|=5',
	// exp / ln
	'e^x=1',
	'exp(x)=2',
	'ln(x)=0',
	'ln(x)=1',
	'e^(2x)=e',
	// x^{p/q}, q impair : définie pour x < 0 (décision du 2026-10-08)
	'x^(1/3)=-2',
	'x^(2/3)=4',
	'x^(-1/3)=-1/2',
	'(2x-1)^(1/3)=-1',
	'x^(4/3)=16',
	'x^(2/5)=1',
	'(x-1)^(2/3)=4',
	'x^(-2/3)=4',
	'x^(2/3)=x',
	'x^(1/3)=x^3',
	'x^(0.5)=2',
	// Racines carrées du lycée (2026-10-08) : √u = c exact, √u = v avec v ≥ 0
	'sqrt(x)=sqrt(2)',
	'sqrt(x)=2sqrt(2)',
	'sqrt(x+1)=sqrt(5)',
	'sqrt(x)=x-2',
	'sqrt(x+3)=x+1',
	'sqrt(2x+3)=x',
	'sqrt(x+5)=x-1',
	'sqrt(x)=2x-1',
	'sqrt(x+1)=-x',
	'sqrt(x+2)=x',
	'2sqrt(x)=x',
	'sqrt(x)=3',
	'sqrt(x)=-1',
	'3sqrt(x)-6=0',
	// Suites géométriques : inconnue en exposant (2026-10-09)
	'2^x=1024',
	'3*2^x=96',
	'1.5^x=10',
	'2^(x+1)=32',
	// Formes à la marge
	'0x=5',
	'x=x',
	'2x+1=2x+3'
];

const INEQUALITIES: readonly string[] = [
	'x-1>0',
	'(x-1)>0',
	'2x+3<7',
	'-2x+4>=0',
	'3x-1<=2x+5',
	'-x<3',
	'x/2>1',
	'(3-x)<=1',
	'-(x-1)>0',
	'2(x-1)<4',
	'x^2-4>0',
	'x^2-4<=0',
	'x^2+1>0',
	'x^2-3x+2<0',
	'-x^2+1>=0',
	'(x-1)(x+2)<0',
	'1/x>0',
	'(x-1)/(x+2)>=0',
	'0x<5',
	'2<7',
	// x^{p/q}, q impair (2026-10-08)
	'x^(1/3)+1<0',
	'x^(2/3)>1',
	'x^(2/3)<4',
	'x^(1/3)+2>0',
	// Racines carrées du lycée (2026-10-08)
	'sqrt(x)<2',
	'sqrt(x)>3',
	'sqrt(x)<=1',
	'sqrt(x-1)>2',
	'sqrt(x)>=-1',
	'sqrt(x)< -1',
	'sqrt(x+2)<x',
	'1/sqrt(x)<2',
	// Suites géométriques : base < 1, le sens change (2026-10-09)
	'2^x>1000',
	'0.8^x<0.1',
	'0.5^x<=0.25'
];

/** Ce qui conclut faux aujourd'hui. Vide visé. */
const KNOWN_WRONG: ReadonlySet<string> = new Set<string>([]);

const EPS = 1e-7;

// =============================================================================
// Outils indépendants du garde-fou
// =============================================================================

function relationOf(input: string): RelationNode {
	const node = astOf(input, 'text');
	if (node === null || node.type !== 'relation') throw new Error(`pas une relation : ${input}`);
	return node;
}

function evalAt(node: MathNode, x: number): number {
	try {
		return compile(node)({ x });
	} catch {
		return NaN;
	}
}

function holds(r: RelationNode, x: number): boolean | null {
	const l = evalAt(r.left, x);
	const rr = evalAt(r.right, x);
	if (!Number.isFinite(l) || !Number.isFinite(rr)) return null;
	const d = l - rr;
	switch (r.relation) {
		case '=':
			return Math.abs(d) <= EPS * Math.max(1, Math.abs(l), Math.abs(rr));
		case '<':
			return d < -EPS;
		case '>':
			return d > EPS;
		case '<=':
			return d <= EPS;
		case '>=':
			return d >= -EPS;
		default:
			return null;
	}
}

/** Les étapes, ou `null` quand le générateur refuse (repli permis). */
function rawSteps(r: RelationNode): readonly EquationStep[] | null {
	try {
		return r.relation === '='
			? generateEquationSteps(r, { level: 'college', variable: 'x' })
			: generateInequalitySteps(r, { level: 'college', variable: 'x' });
	} catch {
		return null;
	}
}

/** Pourquoi la conclusion est fausse — ou `null` si elle est juste ou absente. */
function wrongness(input: string): string | null {
	const r = relationOf(input);
	const steps = rawSteps(r);
	if (steps === null || steps.length === 0) return null;
	const last = steps[steps.length - 1];
	const op = last.operation;

	if (r.relation === '=') {
		let concluded: number[];
		if (op?.kind === 'read-solution') concluded = [evalAt(op.value, 0)];
		else if (op?.kind === 'read-solutions') concluded = op.solutions.map((s) => evalAt(s, 0));
		else if (op?.kind === 'no-real-solution') concluded = [];
		else return null; // ne conclut pas → repli

		for (const v of concluded) {
			if (holds(r, v) !== true) return `${v} ne vérifie pas l'équation`;
		}
		let engine: number[];
		try {
			const result = solve(r, { variable: 'x' });
			if (result.status === 'no-solution' || result.status === 'no-real-solution') engine = [];
			else if (result.status === 'unique' || result.status === 'multiple')
				engine = result.solutions.map((s) => s.approximate ?? evalAt(s.value, 0));
			else return `moteur : ${result.status}`;
		} catch {
			return 'moteur en échec';
		}
		const a = [...new Set(concluded.map((v) => v.toFixed(9)))].sort();
		const b = [...new Set(engine.map((v) => v.toFixed(9)))].sort();
		return a.join(';') === b.join(';') ? null : `étapes {${a}} ≠ moteur {${b}}`;
	}

	// Inéquation : la conclusion est-elle vraie exactement quand r l'est ?
	let member: (x: number) => boolean | null;
	let bounds: number[] = [];
	if (last.after.left.type === 'variable' && last.after.left.name === 'x') {
		const final = last.after;
		member = (x) => holds(final, x);
		const c = evalAt(final.right, 0);
		if (Number.isFinite(c)) bounds = [c];
	} else if (
		op?.kind === 'inequality-conclude-quadratic' ||
		op?.kind === 'inequality-conclude-rational' ||
		op?.kind === 'inequality-conclude-from-isolated-square'
	) {
		// Ces conclusions lisent `solveInequality` : on vérifie son domaine.
		const domain = solveInequality(r).solution;
		member = (x) => containsValue(domain, x);
	} else {
		return null; // ne conclut pas → repli
	}
	const grid = [...bounds, ...[-2, -1, 0, 1, 2].flatMap((k) => [k, k + 1e-3, k - 1e-3])];
	for (let x = -10; x <= 10; x += 0.37) grid.push(x);
	for (const x of grid) {
		const truth = holds(r, x);
		if (truth === null) continue;
		if (member(x) !== truth) return `en x = ${x} : conclusion ${member(x)}, inéquation ${truth}`;
	}
	return null;
}

// =============================================================================
// Tests
// =============================================================================

describe('oracle des étapes de résolution', () => {
	it.each([...EQUATIONS, ...INEQUALITIES].filter((c) => !KNOWN_WRONG.has(c)))(
		'%s : conclusion juste (ou repli)',
		(input) => {
			expect(wrongness(input)).toBeNull();
		}
	);

	it.each([...KNOWN_WRONG])('%s (KNOWN_WRONG) est encore faux, et replié', (input) => {
		expect(wrongness(input)).not.toBeNull();
		expect(solveSteps(input)).toBeNull();
	});

	it('couvre le programme (≥ 80 entrées)', () => {
		expect(EQUATIONS.length + INEQUALITIES.length).toBeGreaterThanOrEqual(80);
	});

	it('n’est pas vert par repli : la plupart des entrées concluent', () => {
		// Mesuré le 2026-10-08 : 57 / 82 concluent ; les 25 autres se replient
		// (forme non développée, |x|, exp/ln, fractions en x, cas dégénérés).
		// Un oracle où tout se replierait serait vert sans rien vérifier.
		const all = [...EQUATIONS, ...INEQUALITIES];
		expect(all.filter((c) => solveSteps(c) !== null).length).toBeGreaterThanOrEqual(57);
	});
});
