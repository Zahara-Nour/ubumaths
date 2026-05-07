/**
 * Pedagogical Domain — Renderer tests.
 *
 * Validates titles, explanations, format aligned 3-lignes, and verbosity
 * gating per school level.
 */

import { describe, expect, it } from 'vitest';
import { parseLatex } from '$lib/mathAST/parser';
import { generatePedagogicalDomainSteps, PedagogicalDomainRenderer } from '../index';
import type { PedagogicalRenderOptions } from '$lib/mathAST/common/step-renderer-base';

const RENDER_OPTIONS_LYCEE: PedagogicalRenderOptions = {
	schoolLevel: 'lycee',
	verbosity: 'detailed'
};
const RENDER_OPTIONS_SUP: PedagogicalRenderOptions = {
	schoolLevel: 'superieur',
	verbosity: 'detailed'
};
const RENDER_OPTIONS_LYCEE_SUMMARIZED: PedagogicalRenderOptions = {
	schoolLevel: 'lycee',
	verbosity: 'summarized'
};

describe('PedagogicalDomainRenderer — titles', () => {
	const renderer = new PedagogicalDomainRenderer();

	it('renders sqrt title at lycée', () => {
		const expr = parseLatex('\\sqrt{x - 2}');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		const rendered = renderer.render(result.steps[0], RENDER_OPTIONS_LYCEE);
		expect(rendered.title).toBe('Contrainte de la racine carrée');
	});

	it('renders sqrt title at supérieur (compact)', () => {
		const expr = parseLatex('\\sqrt{x - 2}');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'superieur' });
		const rendered = renderer.render(result.steps[0], RENDER_OPTIONS_SUP);
		expect(rendered.title).toBe('√u défini');
	});

	it('renders division title at lycée', () => {
		const expr = parseLatex('\\dfrac{1}{x}');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		const rendered = renderer.render(result.steps[0], RENDER_OPTIONS_LYCEE);
		expect(rendered.title).toBe('Contrainte de la division');
	});

	it('renders ln title at supérieur', () => {
		const expr = parseLatex('\\ln(x)');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'superieur' });
		const rendered = renderer.render(result.steps[0], RENDER_OPTIONS_SUP);
		expect(rendered.title).toBe('ln u défini');
	});

	it('renders intersection title at lycée', () => {
		const expr = parseLatex('\\dfrac{\\sqrt{x}}{x - 1}');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		const intersection = result.steps.find((s) => s.rule === 'intersection');
		expect(intersection).toBeDefined();
		const rendered = renderer.render(intersection!, RENDER_OPTIONS_LYCEE);
		expect(rendered.title).toBe('Intersection des contraintes');
	});

	it('renders universal title at lycée', () => {
		const expr = parseLatex('x^2 + 1');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		const rendered = renderer.render(result.steps[0], RENDER_OPTIONS_LYCEE);
		expect(rendered.title).toBe('Domaine universel');
	});
});

describe('PedagogicalDomainRenderer — explanations & verbosity', () => {
	const renderer = new PedagogicalDomainRenderer();

	it('emits explanation at detailed verbosity', () => {
		const expr = parseLatex('\\sqrt{x - 2}');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		const rendered = renderer.render(result.steps[0], RENDER_OPTIONS_LYCEE);
		expect(rendered.explanation).toBeDefined();
		expect(rendered.explanation).toContain('définie');
	});

	it('omits explanation at summarized verbosity', () => {
		const expr = parseLatex('\\sqrt{x - 2}');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		const rendered = renderer.render(result.steps[0], RENDER_OPTIONS_LYCEE_SUMMARIZED);
		expect(rendered.explanation).toBeUndefined();
	});

	it('uses lycée vocabulary at lycée', () => {
		const expr = parseLatex('\\sqrt{x}');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		const rendered = renderer.render(result.steps[0], RENDER_OPTIONS_LYCEE);
		// Lycée explanation includes a full sentence (didactic register).
		expect(rendered.explanation).toMatch(/définie|positif|0/);
	});

	it('uses supérieur vocabulary at supérieur', () => {
		const expr = parseLatex('\\sqrt{x}');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'superieur' });
		const rendered = renderer.render(result.steps[0], RENDER_OPTIONS_SUP);
		// Supérieur explanation is more compact.
		expect(rendered.explanation).toBeDefined();
	});
});

describe('PedagogicalDomainRenderer — schoolLevel bumping', () => {
	const renderer = new PedagogicalDomainRenderer();

	it('bumps primaire to lycée at the renderer (defensive)', () => {
		// Pipeline-level refusal happens upstream (dispatch.ts). Direct
		// renderer invocation with primaire should still work — it bumps
		// to lycée vocabulary.
		const expr = parseLatex('\\sqrt{x}');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		const rendered = renderer.render(result.steps[0], {
			schoolLevel: 'primaire',
			verbosity: 'detailed'
		});
		expect(rendered.schoolLevel).toBe('lycee');
		expect(rendered.title).toBe('Contrainte de la racine carrée');
	});

	it('bumps college to lycée at the renderer (defensive)', () => {
		const expr = parseLatex('\\sqrt{x}');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		const rendered = renderer.render(result.steps[0], {
			schoolLevel: 'college',
			verbosity: 'detailed'
		});
		expect(rendered.schoolLevel).toBe('lycee');
	});
});

describe('PedagogicalDomainRenderer — format aligned 3-lignes', () => {
	const renderer = new PedagogicalDomainRenderer();

	it('uses \\begin{aligned} block', () => {
		const expr = parseLatex('\\sqrt{x - 2}');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		const rendered = renderer.render(result.steps[0], RENDER_OPTIONS_LYCEE);
		expect(rendered.expressionLatex).toContain('\\begin{aligned}');
		expect(rendered.expressionLatex).toContain('\\end{aligned}');
	});

	it('shows Expression / Contrainte / Domaine 3 lines for sqrt', () => {
		const expr = parseLatex('\\sqrt{x - 2}');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		const rendered = renderer.render(result.steps[0], RENDER_OPTIONS_LYCEE);
		expect(rendered.expressionLatex).toContain('\\text{Expression : }');
		expect(rendered.expressionLatex).toContain('\\text{Contrainte : }');
		expect(rendered.expressionLatex).toContain('\\text{Domaine : }');
	});

	it('wraps the expression in blue color', () => {
		const expr = parseLatex('\\sqrt{x - 2}');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		const rendered = renderer.render(result.steps[0], RENDER_OPTIONS_LYCEE);
		expect(rendered.expressionLatex).toContain('\\textcolor{blue}{');
	});

	it('renders intersection step with only Domaine line', () => {
		const expr = parseLatex('\\dfrac{\\sqrt{x}}{x - 1}');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		const intersection = result.steps.find((s) => s.rule === 'intersection');
		const rendered = renderer.render(intersection!, RENDER_OPTIONS_LYCEE);
		expect(rendered.expressionLatex).toContain('\\text{Domaine : }');
		expect(rendered.expressionLatex).not.toContain('\\text{Expression : }');
	});

	it('renders universal step with \\mathbb{R}', () => {
		const expr = parseLatex('x');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		const rendered = renderer.render(result.steps[0], RENDER_OPTIONS_LYCEE);
		expect(rendered.expressionLatex).toContain('\\mathbb{R}');
	});

	it('converts Unicode infinity to \\infty in the Domaine line', () => {
		const expr = parseLatex('\\sqrt{x - 2}');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		const rendered = renderer.render(result.steps[0], RENDER_OPTIONS_LYCEE);
		expect(rendered.expressionLatex).toContain('\\infty');
		expect(rendered.expressionLatex).not.toContain('∞');
	});

	it('converts the backslash + braces of excluded points to LaTeX \\setminus \\{...\\}', () => {
		// `1/x` → domain ℝ \ {0} from formatInterval. The renderer must produce
		// `\\mathbb{R} \\setminus \\{0\\}`, not `\\mathbb{R} \\ {0}` (broken LaTeX).
		const expr = parseLatex('\\dfrac{1}{x}');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		const rendered = renderer.render(result.steps[0], RENDER_OPTIONS_LYCEE);
		expect(rendered.expressionLatex).toContain('\\setminus');
		expect(rendered.expressionLatex).toContain('\\{0\\}');
		expect(rendered.expressionLatex).not.toMatch(/\\mathbb\{R\} \\ \{/);
	});

	it('handles multi-point exclusions ℝ \\ {a, b} → \\mathbb{R} \\setminus \\{a, b\\}', () => {
		// `1/((x-1)(x+2))` → domain ℝ \ {-2, 1}.
		const expr = parseLatex('\\dfrac{1}{(x - 1)(x + 2)}');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		const rendered = renderer.render(result.steps[0], RENDER_OPTIONS_LYCEE);
		expect(rendered.expressionLatex).toContain('\\setminus');
		expect(rendered.expressionLatex).toMatch(/\\\{[^{}]*\\\}/); // \{...\} block
	});
});

describe('PedagogicalDomainRenderer — renderAll', () => {
	const renderer = new PedagogicalDomainRenderer();

	it('renders all steps in sequence', () => {
		const expr = parseLatex('\\dfrac{\\sqrt{x}}{x - 1}');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		const rendered = renderer.renderAll(result.steps, RENDER_OPTIONS_LYCEE);
		expect(rendered).toHaveLength(3);
		expect(rendered[0].rule).toBe('sqrt_constraint');
		expect(rendered[1].rule).toBe('division_constraint');
		expect(rendered[2].rule).toBe('intersection');
	});

	it('preserves step ids', () => {
		const expr = parseLatex('\\sqrt{x - 2}');
		const result = generatePedagogicalDomainSteps(expr, { schoolLevel: 'lycee' });
		const rendered = renderer.renderAll(result.steps, RENDER_OPTIONS_LYCEE);
		expect(rendered[0].id).toBe(result.steps[0].id);
	});
});
