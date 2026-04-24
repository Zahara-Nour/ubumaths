import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { DslParseError } from '../errors';
import type {
	DslAssignment,
	DslExprStatement,
	DslFunctionCallExpr,
	DslBinaryExpr,
	DslIndexedAssignment,
	DslDestructuringAssignment,
	DslMacroDef,
	DslForRange,
	DslForIn,
	DslIf,
	DslReturn
} from '../types';

describe('parser — assignments', () => {
	it('parses number assignment', () => {
		const prog = parse('n = 6');
		expect(prog.statements).toHaveLength(1);
		const s = prog.statements[0] as DslAssignment;
		expect(s.kind).toBe('assignment');
		expect(s.name).toBe('n');
		expect(s.value.kind).toBe('number');
	});

	it('parses point assignment', () => {
		const prog = parse('A = point(3, 4)');
		const s = prog.statements[0] as DslAssignment;
		expect(s.name).toBe('A');
		expect(s.value.kind).toBe('call');
		const call = s.value as DslFunctionCallExpr;
		expect(call.name).toBe('point');
		expect(call.args).toHaveLength(2);
	});

	it('parses string assignment', () => {
		const prog = parse('nom = "triangle"');
		const s = prog.statements[0] as DslAssignment;
		expect(s.value.kind).toBe('string');
	});

	it('parses indexed assignment', () => {
		const prog = parse('P[0] = point(3, 0)');
		const s = prog.statements[0] as DslIndexedAssignment;
		expect(s.kind).toBe('indexedAssignment');
		expect(s.name).toBe('P');
		expect(s.index.kind).toBe('number');
	});

	it('parses destructuring assignment', () => {
		const prog = parse('(M, d) = mediatrice(A, B)');
		const s = prog.statements[0] as DslDestructuringAssignment;
		expect(s.kind).toBe('destructuring');
		expect(s.names).toEqual(['M', 'd']);
		expect(s.value.kind).toBe('call');
	});
});

describe('parser — function calls', () => {
	it('parses function call without assignment', () => {
		const prog = parse('segment(A, B)');
		const s = prog.statements[0] as DslExprStatement;
		expect(s.kind).toBe('exprStatement');
		const call = s.expr as DslFunctionCallExpr;
		expect(call.name).toBe('segment');
		expect(call.args).toHaveLength(2);
	});

	it('parses named arguments', () => {
		const prog = parse('c = cercle(O, rayon=3)');
		const s = prog.statements[0] as DslAssignment;
		const call = s.value as DslFunctionCallExpr;
		expect(call.args).toHaveLength(1);
		expect(call.namedArgs.get('rayon')).toBeDefined();
		expect(call.namedArgs.get('rayon')?.kind).toBe('number');
	});

	it('parses multiple named arguments', () => {
		const prog = parse('B = rotation(A, centre=O, angle=90)');
		const s = prog.statements[0] as DslAssignment;
		const call = s.value as DslFunctionCallExpr;
		expect(call.args).toHaveLength(1); // A
		expect(call.namedArgs.size).toBe(2); // centre, angle
	});

	it('parses tuple in named argument', () => {
		const prog = parse('A2 = symetrie(A, axe=(P, Q))');
		const s = prog.statements[0] as DslAssignment;
		const call = s.value as DslFunctionCallExpr;
		const axe = call.namedArgs.get('axe');
		expect(axe?.kind).toBe('tuple');
	});

	it('parses keyword as function name', () => {
		const prog = parse('milieu(A, B)');
		const s = prog.statements[0] as DslExprStatement;
		const call = s.expr as DslFunctionCallExpr;
		expect(call.name).toBe('milieu');
	});
});

describe('parser — expressions', () => {
	it('parses arithmetic with correct precedence', () => {
		const prog = parse('n = 1 + 2 * 3');
		const s = prog.statements[0] as DslAssignment;
		const expr = s.value as DslBinaryExpr;
		expect(expr.op).toBe('+');
		expect(expr.right.kind).toBe('binary');
		expect((expr.right as DslBinaryExpr).op).toBe('*');
	});

	it('parses parenthesized expression', () => {
		const prog = parse('n = (1 + 2) * 3');
		const s = prog.statements[0] as DslAssignment;
		const expr = s.value as DslBinaryExpr;
		expect(expr.op).toBe('*');
		expect(expr.left.kind).toBe('binary');
	});

	it('parses modulo', () => {
		const prog = parse('n = (i + 1) % 6');
		const s = prog.statements[0] as DslAssignment;
		const expr = s.value as DslBinaryExpr;
		expect(expr.op).toBe('%');
	});

	it('parses power (right-associative)', () => {
		const prog = parse('n = 2 ^ 3 ^ 2');
		const s = prog.statements[0] as DslAssignment;
		const expr = s.value as DslBinaryExpr;
		expect(expr.op).toBe('^');
		expect(expr.right.kind).toBe('binary');
		expect((expr.right as DslBinaryExpr).op).toBe('^');
	});

	it('parses unary minus', () => {
		const prog = parse('n = -5');
		const s = prog.statements[0] as DslAssignment;
		expect(s.value.kind).toBe('unary');
	});

	it('parses comparison', () => {
		const prog = parse('b = i > 0');
		const s = prog.statements[0] as DslAssignment;
		const expr = s.value as DslBinaryExpr;
		expect(expr.op).toBe('>');
	});

	it('parses boolean operators', () => {
		const prog = parse('b = x > 0 et y > 0');
		const s = prog.statements[0] as DslAssignment;
		const expr = s.value as DslBinaryExpr;
		expect(expr.op).toBe('et');
	});

	it('parses non (unary boolean)', () => {
		const prog = parse('b = non vrai');
		const s = prog.statements[0] as DslAssignment;
		expect(s.value.kind).toBe('unary');
	});

	it('parses property access A.x', () => {
		const prog = parse('n = A.x');
		const s = prog.statements[0] as DslAssignment;
		expect(s.value.kind).toBe('propertyAccess');
	});

	it('parses indexed access P[i]', () => {
		const prog = parse('x = P[i]');
		const s = prog.statements[0] as DslAssignment;
		expect(s.value.kind).toBe('indexedAccess');
	});

	it('parses list literal', () => {
		const prog = parse('l = [1, 2, 3]');
		const s = prog.statements[0] as DslAssignment;
		expect(s.value.kind).toBe('list');
	});

	it('parses boolean literals', () => {
		const p1 = parse('b = vrai');
		expect((p1.statements[0] as DslAssignment).value.kind).toBe('bool');
		const p2 = parse('b = faux');
		expect((p2.statements[0] as DslAssignment).value.kind).toBe('bool');
	});

	it('parses complex expression: i * 360 / n', () => {
		const prog = parse('angle = i * 360 / n');
		const s = prog.statements[0] as DslAssignment;
		// (i * 360) / n
		const expr = s.value as DslBinaryExpr;
		expect(expr.op).toBe('/');
		expect(expr.left.kind).toBe('binary');
		expect((expr.left as DslBinaryExpr).op).toBe('*');
	});
});

describe('parser — blocks', () => {
	it('parses macro definition', () => {
		const script = ['macro mediatrice(A, B):', '    M = milieu(A, B)', '    retourne M'].join('\n');
		const prog = parse(script);
		expect(prog.statements).toHaveLength(1);
		const m = prog.statements[0] as DslMacroDef;
		expect(m.kind).toBe('macroDef');
		expect(m.name).toBe('mediatrice');
		expect(m.params).toHaveLength(2);
		expect(m.body).toHaveLength(2);
	});

	it('parses macro with default parameter', () => {
		const script = ['macro tri(A, B, angle=60):', '    retourne A'].join('\n');
		const prog = parse(script);
		const m = prog.statements[0] as DslMacroDef;
		expect(m.params[2].name).toBe('angle');
		expect(m.params[2].defaultValue?.kind).toBe('number');
	});

	it('parses pour...de...a', () => {
		const script = ['pour i de 0 a 5:', '    point(i, 0)'].join('\n');
		const prog = parse(script);
		const f = prog.statements[0] as DslForRange;
		expect(f.kind).toBe('forRange');
		expect(f.variable).toBe('i');
		expect(f.body).toHaveLength(1);
	});

	it('parses pour...dans', () => {
		const script = ['pour x dans [1, 2, 3]:', '    point(x, 0)'].join('\n');
		const prog = parse(script);
		const f = prog.statements[0] as DslForIn;
		expect(f.kind).toBe('forIn');
		expect(f.variable).toBe('x');
		expect(f.iterable.kind).toBe('list');
	});

	it('parses si/sinon', () => {
		const script = ['si i > 0:', '    segment(A, B)', 'sinon:', '    point(0, 0)'].join('\n');
		const prog = parse(script);
		const s = prog.statements[0] as DslIf;
		expect(s.kind).toBe('if');
		expect(s.body).toHaveLength(1);
		expect(s.elseBody).toHaveLength(1);
	});

	it('parses si without sinon', () => {
		const script = ['si i > 0:', '    segment(A, B)'].join('\n');
		const prog = parse(script);
		const s = prog.statements[0] as DslIf;
		expect(s.kind).toBe('if');
		expect(s.elseBody).toBeUndefined();
	});

	it('parses retourne', () => {
		const script = ['macro f(A):', '    retourne A'].join('\n');
		const prog = parse(script);
		const m = prog.statements[0] as DslMacroDef;
		const r = m.body[0] as DslReturn;
		expect(r.kind).toBe('return');
	});

	it('parses retourne tuple', () => {
		const script = ['macro f(A):', '    retourne (A, B)'].join('\n');
		const prog = parse(script);
		const m = prog.statements[0] as DslMacroDef;
		const r = m.body[0] as DslReturn;
		expect(r.value.kind).toBe('tuple');
	});
});

describe('parser — multi-line programs', () => {
	it('parses multiple statements', () => {
		const script = ['A = point(0, 0)', 'B = point(1, 1)', 'segment(A, B)'].join('\n');
		const prog = parse(script);
		expect(prog.statements).toHaveLength(3);
	});

	it('ignores blank lines and comments', () => {
		const script = [
			'# Un commentaire',
			'A = point(0, 0)',
			'',
			'# Autre commentaire',
			'B = point(1, 1)'
		].join('\n');
		const prog = parse(script);
		expect(prog.statements).toHaveLength(2);
	});
});

describe('parser — complex scripts', () => {
	it('parses polygone regulier script', () => {
		const script = [
			'n = 6',
			'O = point(0, 0)',
			'P[0] = point(3, 0)',
			'pour i de 1 a n - 1:',
			'    P[i] = rotation(P[0], centre=O, angle=i * 360 / n)',
			'pour i de 0 a n - 1:',
			'    segment(P[i], P[(i + 1) % n])'
		].join('\n');
		const prog = parse(script);
		expect(prog.statements).toHaveLength(5);
		expect(prog.statements[0].kind).toBe('assignment');
		expect(prog.statements[3].kind).toBe('forRange');
		expect(prog.statements[4].kind).toBe('forRange');
	});

	it('parses macro with multiple body statements', () => {
		const script = [
			'macro mediatrice(A, B):',
			'    M = milieu(A, B)',
			'    H = rotation(A, centre=M, angle=90)',
			'    d = droite(M, H)',
			'    retourne (M, d)',
			'',
			'(M, d) = mediatrice(P, Q)'
		].join('\n');
		const prog = parse(script);
		expect(prog.statements).toHaveLength(2);
		const m = prog.statements[0] as DslMacroDef;
		expect(m.body).toHaveLength(4);
		expect(prog.statements[1].kind).toBe('destructuring');
	});
});

describe('parser — errors', () => {
	it('throws on unexpected token', () => {
		expect(() => parse('= 5')).toThrow(DslParseError);
	});

	it('throws on unclosed parenthesis', () => {
		expect(() => parse('point(0, 0')).toThrow(DslParseError);
	});

	it('throws on standalone sinon', () => {
		expect(() => parse('sinon:')).toThrow(DslParseError);
	});

	it('error includes line number', () => {
		try {
			parse('A = point(0, 0)\n= 5');
		} catch (e) {
			expect((e as DslParseError).line).toBe(2);
		}
	});

	it('throws if named args before positional', () => {
		expect(() => parse('cercle(rayon=3, O)')).toThrow(DslParseError);
	});
});
