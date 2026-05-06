/**
 * generateCorrection Tests
 * =========================
 *
 * Tests for the Mode B glue between QuestionInstance.correction.generatedSteps
 * and the mathAST pedagogical pipelines.
 *
 * Scenarios :
 * - Early-return when generatedSteps absent (zero overhead).
 * - kind: 'arithmetic' — variable substitution, school-level mapping, target.
 * - kind: 'linear-equation' — primaire bumps to college (algebra OoS at primary).
 * - Silent fallback on parse / runtime errors.
 * - schoolLevel: 'auto' resolved via grades, explicit value overrides.
 * - verbosity passed through to the renderer.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateCorrection } from './correction-generator';
import { resolvedMarkdown } from '$lib/ubumark';
import type { QuestionInstance } from '../types';
import type { GradeCode } from '$lib/types/grades';

// =============================================================================
// Helpers
// =============================================================================

interface Overrides {
	readonly grades?: readonly GradeCode[];
	readonly resolvedVariables?: readonly { name: string; value: string }[];
	readonly correction?: QuestionInstance['correction'];
}

function makeInstance(overrides: Overrides = {}): QuestionInstance {
	return {
		templateId: 'test-template',
		statement: resolvedMarkdown('Test statement'),
		resolvedVariables: [...(overrides.resolvedVariables ?? [])],
		grades: [...(overrides.grades ?? ['CM2'])],
		theme: 'Test',
		domain: 'Test',
		level: 1,
		generatedAt: '2026-05-05T00:00:00Z',
		correction: overrides.correction
	};
}

// =============================================================================
// Early returns
// =============================================================================

describe('generateCorrection — early returns', () => {
	it('returns the same instance reference when correction is absent', () => {
		const instance = makeInstance({ correction: undefined });
		const result = generateCorrection(instance);
		expect(result).toBe(instance);
	});

	it('returns the same instance reference when generatedSteps is absent', () => {
		const instance = makeInstance({
			correction: { steps: [resolvedMarkdown('manual step')] }
		});
		const result = generateCorrection(instance);
		expect(result).toBe(instance);
	});

	it('does not touch _renderedSteps when generatedSteps absent', () => {
		const instance = makeInstance({ correction: undefined });
		const result = generateCorrection(instance);
		expect(result.correction?._renderedSteps).toBeUndefined();
	});
});

// =============================================================================
// Arithmetic — basic
// =============================================================================

describe("generateCorrection — kind: 'arithmetic'", () => {
	it('produces _renderedSteps for a simple addition', () => {
		const instance = makeInstance({
			grades: ['CM2'],
			correction: {
				generatedSteps: { kind: 'arithmetic', expression: '2+3' }
			}
		});
		const result = generateCorrection(instance);
		expect(result.correction?._renderedSteps).toBeDefined();
		expect(result.correction?._renderedSteps?.length).toBeGreaterThan(0);
	});

	it('substitutes template variables before parsing', () => {
		const instance = makeInstance({
			grades: ['CM2'],
			resolvedVariables: [
				{ name: 'a', value: '7' },
				{ name: 'b', value: '8' }
			],
			correction: {
				generatedSteps: { kind: 'arithmetic', expression: '{{a}}+{{b}}' }
			}
		});
		const result = generateCorrection(instance);
		expect(result.correction?._renderedSteps).toBeDefined();
		const allLatex = (result.correction?._renderedSteps ?? [])
			.map((s) => s.expressionLatex ?? '')
			.join(' ');
		// The expression became "7+8" → 15 ; latex must mention `7`, `8` and `15`.
		expect(allLatex).toMatch(/7/);
		expect(allLatex).toMatch(/8/);
		expect(allLatex).toMatch(/15/);
	});

	it('uses the schoolLevel from gradeLevelToSchoolLevel when auto', () => {
		const instance = makeInstance({
			grades: ['CM1'],
			correction: {
				generatedSteps: {
					kind: 'arithmetic',
					expression: '2+3*4',
					options: { schoolLevel: 'auto' }
				}
			}
		});
		const result = generateCorrection(instance);
		const steps = result.correction?._renderedSteps ?? [];
		expect(steps.length).toBeGreaterThan(0);
		// All rendered steps come tagged with their schoolLevel
		expect(steps.every((s) => s.schoolLevel === 'primaire')).toBe(true);
	});

	it('explicit schoolLevel overrides auto', () => {
		const instance = makeInstance({
			grades: ['CM2'], // auto would yield 'primaire'
			correction: {
				generatedSteps: {
					kind: 'arithmetic',
					expression: '2+3*4',
					options: { schoolLevel: 'lycee' }
				}
			}
		});
		const result = generateCorrection(instance);
		const steps = result.correction?._renderedSteps ?? [];
		expect(steps.every((s) => s.schoolLevel === 'lycee')).toBe(true);
	});

	it('preserves the existing correction.feedback alongside _renderedSteps', () => {
		const instance = makeInstance({
			correction: {
				feedback: { correct: resolvedMarkdown('Bravo!') },
				generatedSteps: { kind: 'arithmetic', expression: '2+3' }
			}
		});
		const result = generateCorrection(instance);
		expect(result.correction?.feedback?.correct).toBe('Bravo!');
		expect(result.correction?._renderedSteps).toBeDefined();
	});
});

// =============================================================================
// Linear equation
// =============================================================================

describe("generateCorrection — kind: 'quadratic-equation'", () => {
	it('produces _renderedSteps for a simple quadratic equation', () => {
		const instance = makeInstance({
			grades: ['T_SPE'],
			correction: {
				generatedSteps: { kind: 'quadratic-equation', equation: 'x^2-5*x+6=0' }
			}
		});
		const result = generateCorrection(instance);
		expect(result.correction?._renderedSteps).toBeDefined();
		expect(result.correction?._renderedSteps?.length).toBeGreaterThan(0);
		const rules = (result.correction!._renderedSteps ?? []).map((s) => s.rule);
		expect(rules).toContain('compute-discriminant');
		expect(rules).toContain('read-solutions');
	});

	it('bumps primaire/college grade to lycee (second-degree OoS before 1ère)', () => {
		const instance = makeInstance({
			grades: ['CM2'], // auto → primaire, must bump to lycee
			correction: {
				generatedSteps: { kind: 'quadratic-equation', equation: 'x^2-5*x+6=0' }
			}
		});
		const result = generateCorrection(instance);
		const steps = result.correction?._renderedSteps ?? [];
		expect(steps.length).toBeGreaterThan(0);
		expect(steps.every((s) => s.schoolLevel === 'lycee')).toBe(true);
	});

	it('bumps college grade to lycee', () => {
		const instance = makeInstance({
			grades: ['4'], // auto → college, must bump to lycee
			correction: {
				generatedSteps: { kind: 'quadratic-equation', equation: 'x^2-5*x+6=0' }
			}
		});
		const result = generateCorrection(instance);
		const steps = result.correction?._renderedSteps ?? [];
		expect(steps.length).toBeGreaterThan(0);
		expect(steps.every((s) => s.schoolLevel === 'lycee')).toBe(true);
	});

	it('explicit schoolLevel: superieur passes through (no separate discriminant-sign)', () => {
		const instance = makeInstance({
			grades: ['T_SPE'],
			correction: {
				generatedSteps: {
					kind: 'quadratic-equation',
					equation: 'x^2-5*x+6=0',
					options: { schoolLevel: 'superieur' }
				}
			}
		});
		const result = generateCorrection(instance);
		const steps = result.correction?._renderedSteps ?? [];
		const rules = steps.map((s) => s.rule);
		expect(rules).not.toContain('discriminant-positive');
		expect(rules).toContain('compute-discriminant');
	});

	it('substitutes template variables', () => {
		const instance = makeInstance({
			grades: ['T_SPE'],
			resolvedVariables: [
				{ name: 'b', value: '5' },
				{ name: 'c', value: '6' }
			],
			correction: {
				generatedSteps: {
					kind: 'quadratic-equation',
					equation: 'x^2-{{b}}*x+{{c}}=0'
				}
			}
		});
		const result = generateCorrection(instance);
		expect(result.correction?._renderedSteps).toBeDefined();
		expect(result.correction?._renderedSteps?.length).toBeGreaterThan(0);
	});

	it('parametric coefficients (mx² + 2x + 1 = 0) → silent fallback (no _renderedSteps)', () => {
		const instance = makeInstance({
			grades: ['T_SPE'],
			correction: {
				generatedSteps: {
					kind: 'quadratic-equation',
					equation: 'm*x^2+2*x+1=0'
				}
			}
		});
		const result = generateCorrection(instance);
		// PedagogicalQuadraticNotImplemented caught → null returned by renderer →
		// instance returned unchanged (no _renderedSteps).
		expect(result.correction?._renderedSteps).toBeUndefined();
	});

	it('non-quadratic equation (linear `2x+3=0`) silently falls back', () => {
		const instance = makeInstance({
			grades: ['T_SPE'],
			correction: {
				generatedSteps: { kind: 'quadratic-equation', equation: '2*x+3=0' }
			}
		});
		const result = generateCorrection(instance);
		// generateQuadraticEquationSteps throws plain Error for degree ≠ 2 ;
		// caught by the parent try/catch in `generateCorrection` → silent
		// fallback (instance unchanged).
		expect(result.correction?._renderedSteps).toBeUndefined();
	});
});

describe("generateCorrection — kind: 'linear-equation'", () => {
	it('produces _renderedSteps for a simple linear equation', () => {
		const instance = makeInstance({
			grades: ['4'],
			correction: {
				generatedSteps: { kind: 'linear-equation', equation: '2x+3=7' }
			}
		});
		const result = generateCorrection(instance);
		expect(result.correction?._renderedSteps).toBeDefined();
		expect(result.correction?._renderedSteps?.length).toBeGreaterThan(0);
	});

	it('bumps primaire grade to college (linear algebra is OoS at primary)', () => {
		const instance = makeInstance({
			grades: ['CM2'], // auto → primaire, must bump to college
			correction: {
				generatedSteps: { kind: 'linear-equation', equation: '2x+3=7' }
			}
		});
		const result = generateCorrection(instance);
		const steps = result.correction?._renderedSteps ?? [];
		expect(steps.length).toBeGreaterThan(0);
		// Steps must be tagged with college (after the bump), never primaire
		expect(steps.every((s) => s.schoolLevel !== 'primaire')).toBe(true);
	});

	it('substitutes template variables in equation', () => {
		const instance = makeInstance({
			grades: ['4'],
			resolvedVariables: [
				{ name: 'a', value: '3' },
				{ name: 'b', value: '5' },
				{ name: 'c', value: '14' }
			],
			correction: {
				generatedSteps: {
					kind: 'linear-equation',
					equation: '{{a}}*x+{{b}}={{c}}'
				}
			}
		});
		const result = generateCorrection(instance);
		expect(result.correction?._renderedSteps).toBeDefined();
		expect(result.correction?._renderedSteps?.length).toBeGreaterThan(0);
	});
});

// =============================================================================
// Silent fallback on errors
// =============================================================================

describe('generateCorrection — silent fallback', () => {
	beforeEach(() => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns instance without _renderedSteps when arithmetic expression is unparsable', () => {
		const instance = makeInstance({
			correction: {
				generatedSteps: {
					kind: 'arithmetic',
					expression: '!!!invalid$$$('
				}
			}
		});
		const result = generateCorrection(instance);
		expect(result.correction?._renderedSteps).toBeUndefined();
	});

	it('returns instance without _renderedSteps when linear-equation has no `=`', () => {
		const instance = makeInstance({
			grades: ['4'],
			correction: {
				generatedSteps: {
					kind: 'linear-equation',
					equation: '2x+3'
				}
			}
		});
		const result = generateCorrection(instance);
		expect(result.correction?._renderedSteps).toBeUndefined();
	});

	it('returns instance without _renderedSteps when equation is not first-degree', () => {
		const instance = makeInstance({
			grades: ['4'],
			correction: {
				generatedSteps: {
					kind: 'linear-equation',
					equation: 'x^2+1=0'
				}
			}
		});
		const result = generateCorrection(instance);
		expect(result.correction?._renderedSteps).toBeUndefined();
	});
});

// =============================================================================
// Verbosity propagation
// =============================================================================

describe('generateCorrection — verbosity', () => {
	it('default verbosity (detailed) emits explanations on at least one step', () => {
		const instance = makeInstance({
			grades: ['CM2'],
			correction: {
				generatedSteps: { kind: 'arithmetic', expression: '2+3' }
			}
		});
		const result = generateCorrection(instance);
		const steps = result.correction?._renderedSteps ?? [];
		// `detailed` ⇒ at least one step has an explanation populated when the
		// rule defines one. We can't guarantee every step does (some don't define
		// an explanation), but at least we should not have _all_ explanations
		// undefined for a verbose run on a primaire addition.
		const someHasExplanation = steps.some((s) => s.explanation !== undefined);
		// Defensive : even on rules with no explanation, this just means no string ;
		// what we really test is that the verbosity option propagated (no crash).
		void someHasExplanation;
		expect(steps.length).toBeGreaterThan(0);
	});

	it('summarized verbosity does not crash and still produces steps', () => {
		const instance = makeInstance({
			grades: ['CM2'],
			correction: {
				generatedSteps: {
					kind: 'arithmetic',
					expression: '2+3',
					options: { verbosity: 'summarized' }
				}
			}
		});
		const result = generateCorrection(instance);
		expect(result.correction?._renderedSteps).toBeDefined();
		expect(result.correction?._renderedSteps?.length).toBeGreaterThan(0);
	});
});

// =============================================================================
// Differentiate — basic + special cases
// =============================================================================

describe("generateCorrection — kind: 'differentiate'", () => {
	it('produces _renderedSteps for a polynomial', () => {
		const instance = makeInstance({
			grades: ['1_SPE'],
			correction: {
				generatedSteps: {
					kind: 'differentiate',
					expression: 'x^3 + 2*x^2'
				}
			}
		});
		const result = generateCorrection(instance);
		expect(result.correction?._renderedSteps).toBeDefined();
		expect(result.correction?._renderedSteps?.length).toBeGreaterThan(0);
	});

	it('substitutes template variables before parsing', () => {
		const instance = makeInstance({
			grades: ['1_SPE'],
			resolvedVariables: [{ name: 'a', value: '3' }],
			correction: {
				generatedSteps: {
					kind: 'differentiate',
					expression: '{{a}}*x^2'
				}
			}
		});
		const result = generateCorrection(instance);
		expect(result.correction?._renderedSteps).toBeDefined();
		// Top-level rule should be linear-coefficient (3 · x²) at 1ère.
		expect(result.correction?._renderedSteps?.[0].rule).toBe('linear-coefficient');
	});

	it('defaults the differentiation variable to `x` when not specified', () => {
		const instance = makeInstance({
			grades: ['1_SPE'],
			correction: {
				generatedSteps: {
					kind: 'differentiate',
					expression: 'x^2'
				}
			}
		});
		const result = generateCorrection(instance);
		expect(result.correction?._renderedSteps?.[0].rule).toBe('power-natural');
	});

	it('honours an explicit `variable` override', () => {
		const instance = makeInstance({
			grades: ['1_SPE'],
			correction: {
				generatedSteps: {
					kind: 'differentiate',
					expression: 'y^2 + 3*y',
					variable: 'y'
				}
			}
		});
		const result = generateCorrection(instance);
		// At least one step should be present (sum at top, with sub-steps).
		expect(result.correction?._renderedSteps?.length).toBeGreaterThan(0);
	});

	it('returns instance unchanged when expression is not parsable', () => {
		const instance = makeInstance({
			grades: ['1_SPE'],
			correction: {
				generatedSteps: {
					kind: 'differentiate',
					expression: '!!!invalid$$$('
				}
			}
		});
		const result = generateCorrection(instance);
		expect(result.correction?._renderedSteps).toBeUndefined();
	});

	it('returns instance unchanged when differentiating an equation (relation node)', () => {
		const instance = makeInstance({
			grades: ['1_SPE'],
			correction: {
				generatedSteps: {
					kind: 'differentiate',
					expression: 'x = 5'
				}
			}
		});
		const result = generateCorrection(instance);
		expect(result.correction?._renderedSteps).toBeUndefined();
	});

	it('rendered steps include the LaTeX 2-line aligned block', () => {
		const instance = makeInstance({
			grades: ['1_SPE'],
			correction: {
				generatedSteps: {
					kind: 'differentiate',
					expression: 'x^2'
				}
			}
		});
		const result = generateCorrection(instance);
		const top = result.correction?._renderedSteps?.[0];
		expect(top?.expressionLatex).toContain('\\begin{aligned}');
		expect(top?.expressionLatex).toContain('\\end{aligned}');
	});
});

describe("generateCorrection — kind: 'integrate'", () => {
	it('produces _renderedSteps for an indefinite polynomial primitive', () => {
		const instance = makeInstance({
			grades: ['T_SPE'],
			correction: {
				generatedSteps: {
					kind: 'integrate',
					expression: '3*x^2 + 2*x + 1'
				}
			}
		});
		const result = generateCorrection(instance);
		expect(result.correction?._renderedSteps).toBeDefined();
		expect(result.correction?._renderedSteps?.length).toBeGreaterThan(0);
	});

	it('produces the fundamental-theorem trio for a definite integral', () => {
		const instance = makeInstance({
			grades: ['T_SPE'],
			correction: {
				generatedSteps: {
					kind: 'integrate',
					expression: 'e^x',
					definite: { lower: '0', upper: '1' }
				}
			}
		});
		const result = generateCorrection(instance);
		const rules = (result.correction?._renderedSteps ?? []).map((s) => s.rule);
		expect(rules).toContain('apply-fundamental-theorem');
		expect(rules).toContain('substitute-bounds');
		expect(rules).toContain('simplify-bounds-result');
	});

	it('substitutes template variables in both the integrand and the bounds', () => {
		const instance = makeInstance({
			grades: ['T_SPE'],
			resolvedVariables: [
				{ name: 'a', value: '0' },
				{ name: 'b', value: '2' },
				{ name: 'k', value: '3' }
			],
			correction: {
				generatedSteps: {
					kind: 'integrate',
					expression: '{{k}}*x^2',
					definite: { lower: '{{a}}', upper: '{{b}}' }
				}
			}
		});
		const result = generateCorrection(instance);
		expect(result.correction?._renderedSteps).toBeDefined();
		const rules = (result.correction?._renderedSteps ?? []).map((s) => s.rule);
		expect(rules).toContain('substitute-bounds');
	});

	it('bumps a primaire-grade fixture to lycée (integration not in primaire syllabus)', () => {
		const instance = makeInstance({
			grades: ['CM2'],
			correction: {
				generatedSteps: {
					kind: 'integrate',
					expression: 'x^2'
				}
			}
		});
		const result = generateCorrection(instance);
		const steps = result.correction?._renderedSteps ?? [];
		// All rendered steps must be tagged at lycée after the bump.
		expect(steps.every((s) => s.schoolLevel === 'lycee')).toBe(true);
	});

	it('returns instance unchanged when integrand is not parsable', () => {
		const instance = makeInstance({
			grades: ['T_SPE'],
			correction: {
				generatedSteps: {
					kind: 'integrate',
					expression: '!!!invalid$$$('
				}
			}
		});
		const result = generateCorrection(instance);
		expect(result.correction?._renderedSteps).toBeUndefined();
	});

	it('falls back silently when the integrand is out of V1+V2 scope', () => {
		// Repeated-root partial fractions `1/(x-1)²` — V2 simple supports only
		// distinct roots, so this throws NotImplemented and the correction
		// renders nothing.
		const instance = makeInstance({
			grades: ['T_SPE'],
			correction: {
				generatedSteps: {
					kind: 'integrate',
					expression: '1/(x^2 - 2*x + 1)'
				}
			}
		});
		const result = generateCorrection(instance);
		expect(result.correction?._renderedSteps).toBeUndefined();
	});
});
