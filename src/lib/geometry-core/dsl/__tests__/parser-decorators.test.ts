/**
 * Parser tests for trailing decorators on assignment statements.
 *
 * Suffix decorators like `d = mediatrice(A, B) @euclide @arcs_egaux @epure`
 * are introduced in 2026-05-19 for the V1 choreography system in
 * `constructions-v2`. The parser captures them on `DslAssignment.decorators`.
 *
 * Statement-level directives (`@pause(500)`, `@instrument("compas")`) at the
 * start of a line keep their existing path via `parseDirective()` — verified
 * here as non-regression.
 *
 * Spec : docs/wip/v1-choreographies-phase0-tdd.md (section P0.2).
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';

function assignmentOf(script: string): { decorators?: readonly string[]; name: string } {
	const program = parse(script);
	const stmt = program.statements[0];
	if (stmt.kind !== 'assignment') throw new Error(`Expected assignment, got ${stmt.kind}`);
	return { decorators: stmt.decorators, name: stmt.name };
}

describe('parser — assignment-suffix decorators', () => {
	it('no decorator → decorators undefined or empty', () => {
		const a = assignmentOf('d = mediatrice(A, B)');
		expect(a.decorators).toBeUndefined();
	});

	it('1 decorator → decorators = [name]', () => {
		const a = assignmentOf('d = mediatrice(A, B) @euclide');
		expect(a.decorators).toEqual(['euclide']);
	});

	it('2 decorators in order', () => {
		const a = assignmentOf('d = mediatrice(A, B) @euclide @epure');
		expect(a.decorators).toEqual(['euclide', 'epure']);
	});

	it('3 decorators in order', () => {
		const a = assignmentOf('d = mediatrice(A, B) @euclide @arcs_egaux @epure');
		expect(a.decorators).toEqual(['euclide', 'arcs_egaux', 'epure']);
	});

	it('order is preserved when source order differs', () => {
		const a = assignmentOf('d = mediatrice(A, B) @epure @euclide');
		expect(a.decorators).toEqual(['epure', 'euclide']);
	});

	it('decorator with underscore', () => {
		const a = assignmentOf('d = mediatrice(A, B) @cercles_rayon_ab');
		expect(a.decorators).toEqual(['cercles_rayon_ab']);
	});

	it('decorator with digits', () => {
		const a = assignmentOf('d = mediatrice(A, B) @v1');
		expect(a.decorators).toEqual(['v1']);
	});

	it('multi-space separator between decorators', () => {
		const a = assignmentOf('d = mediatrice(A, B) @euclide    @epure');
		expect(a.decorators).toEqual(['euclide', 'epure']);
	});

	it('decorator with tab separator', () => {
		const a = assignmentOf('d = mediatrice(A, B) @euclide\t@epure');
		expect(a.decorators).toEqual(['euclide', 'epure']);
	});

	it('decorator before line-comment', () => {
		const a = assignmentOf('d = mediatrice(A, B) @euclide  # commentaire');
		expect(a.decorators).toEqual(['euclide']);
	});

	it('decorator on cercle_circonscrit (composition target)', () => {
		const a = assignmentOf('cc = cercle_circonscrit(A, B, C) @euclide @squelette');
		expect(a.decorators).toEqual(['euclide', 'squelette']);
		expect(a.name).toBe('cc');
	});

	it('case-sensitive identifiers (parser does not lowercase)', () => {
		// The parser does not validate decorator names — that's the resolver's job.
		// Just verifies the captured string preserves case.
		const a = assignmentOf('d = mediatrice(A, B) @Euclide');
		expect(a.decorators).toEqual(['Euclide']);
	});

	it('rejects decorator with arguments (KISS V1)', () => {
		expect(() => parse('d = mediatrice(A, B) @euclide(args)')).toThrow(
			/Decorateur.*arguments non supporte/
		);
	});

	it('rejects decorator on a subsequent line', () => {
		// V1 limits decorators to same-line suffix only.
		expect(() => parse('d = mediatrice(A, B)\n  @euclide')).toThrow();
	});

	it('rejects suffix decorator on an expression statement (no assignment)', () => {
		// V1 limits suffix decorators to assignments. exprStatement must reject.
		expect(() => parse('mediatrice(A, B) @euclide')).toThrow();
	});

	it('rejects suffix decorator on indexed assignment', () => {
		// Phase 1 covers DslAssignment only ; indexed/destructuring fall back to
		// `expectNewline()` which rejects AT_DIRECTIVE tokens.
		expect(() => parse('p[0] = 3 @euclide')).toThrow();
	});

	it('rejects suffix decorator on destructuring', () => {
		expect(() => parse('(a, b) = quelque_chose() @euclide')).toThrow();
	});

	it('regression : statement-level directives still work (no false positive)', () => {
		const program = parse(['@pause(500)', 'd = mediatrice(A, B)'].join('\n'));
		expect(program.statements).toHaveLength(2);
		expect(program.statements[0].kind).toBe('directive');
		expect(program.statements[1].kind).toBe('assignment');
		// Assignment after a statement-level directive has no decorators
		if (program.statements[1].kind === 'assignment') {
			expect(program.statements[1].decorators).toBeUndefined();
		}
	});

	it('mixes statement-level directive then suffix-decorated assignment', () => {
		const program = parse(
			['@instrument("compas")', 'd = mediatrice(A, B) @euclide @epure'].join('\n')
		);
		expect(program.statements).toHaveLength(2);
		expect(program.statements[0].kind).toBe('directive');
		if (program.statements[1].kind === 'assignment') {
			expect(program.statements[1].decorators).toEqual(['euclide', 'epure']);
		} else {
			throw new Error('expected assignment');
		}
	});

	it('multiple decorated assignments in sequence', () => {
		const program = parse(
			[
				'd1 = mediatrice(A, B) @euclide',
				'd2 = mediatrice(B, C) @euclide @cercles_rayon_ab',
				'cc = cercle_circonscrit(A, B, C) @euclide @complet'
			].join('\n')
		);
		expect(program.statements).toHaveLength(3);
		const a0 = program.statements[0];
		const a1 = program.statements[1];
		const a2 = program.statements[2];
		if (a0.kind !== 'assignment' || a1.kind !== 'assignment' || a2.kind !== 'assignment') {
			throw new Error('expected 3 assignments');
		}
		expect(a0.decorators).toEqual(['euclide']);
		expect(a1.decorators).toEqual(['euclide', 'cercles_rayon_ab']);
		expect(a2.decorators).toEqual(['euclide', 'complet']);
	});

	it('decorator after a free-point assignment', () => {
		const a = assignmentOf('A = point(0, 0) @epure');
		expect(a.decorators).toEqual(['epure']);
	});

	it('decorator after numeric assignment is also captured (parser is generic)', () => {
		// At parse time the parser is generic ; semantic rejection (decorators
		// only make sense on element-producing builtins) belongs to the resolver
		// in Phase 2. This test verifies the parser captures faithfully.
		const a = assignmentOf('x = 42 @marker');
		expect(a.decorators).toEqual(['marker']);
	});
});
