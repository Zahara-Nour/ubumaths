/**
 * Pedagogical Solve — rendu des équations avec valeur absolue
 *
 * Rend les étapes propres à la valeur absolue (isoler, séparer en deux
 * équations, conclure) et confie les étapes du premier degré de chaque
 * branche à `LinearEquationRenderer` : un seul rendu du premier degré dans
 * le dépôt. Les maths de la prose sont entre `$…$` (V25).
 *
 * @module mathAST/pedagogical-solve/absolute-value-renderer
 */

import type {
	PedagogicalRenderOptions,
	RenderedStep,
	StepRenderer
} from '../common/step-renderer-base';
import type { MathNode, RelationNode } from '../types';
import { toLatex } from '../latex-generator';
import { linearLevelFor } from './absolute-value';
import { LinearEquationRenderer } from './linear-renderer';
import type { EquationOperation, EquationStep } from './types';

// =============================================================================
// Fonctions
// =============================================================================

/**
 * LaTeX resserré (`2x`, pas `2 x`), comme le rendu du premier degré — sans
 * coller la barre fermante au chiffre qui la précède (`1 \right|`).
 */
function fmt(node: MathNode): string {
	return toLatex(node).replace(/(\d|\})\s+(?!\\right)([a-zA-Z\\])/g, '$1$2');
}

function eq(relation: RelationNode): string {
	return `${fmt(relation.left)} = ${fmt(relation.right)}`;
}

/** Dans la prose : `$u=c$`, serré. */
function eqProse(relation: RelationNode): string {
	return `$${fmt(relation.left)}=${fmt(relation.right)}$`;
}

function math(latex: string): string {
	return `$${latex}$`;
}

function formatSolutions(solutions: readonly MathNode[]): string {
	if (solutions.length === 0) return 'S = \\emptyset';
	return `S = \\left\\{ ${solutions.map(fmt).join(' \\,;\\, ')} \\right\\}`;
}

type Owned = Extract<
	EquationOperation,
	{
		kind:
			| 'identify-equation'
			| 'isolate-absolute-value'
			| 'split-absolute-value'
			| 'absolute-value-negative'
			| 'solve-branch'
			| 'branch-truth'
			| 'read-solutions'
			| 'read-all-reals';
	}
>;

function isOwned(op: EquationOperation): op is Owned {
	switch (op.kind) {
		case 'identify-equation':
		case 'isolate-absolute-value':
		case 'split-absolute-value':
		case 'absolute-value-negative':
		case 'solve-branch':
		case 'branch-truth':
		case 'read-solutions':
		case 'read-all-reals':
			return true;
		default:
			return false;
	}
}

interface Rendering {
	readonly title: string;
	readonly explanation?: string;
	readonly latex: string;
}

function renderOwned(op: Owned, step: EquationStep): Rendering {
	switch (op.kind) {
		case 'identify-equation':
			return {
				// Le générateur nomme la forme lue par l'analyse (`|x| + |x| = 4` a
				// UNE valeur absolue, écrite deux fois) : une seule source
				title: step.description,
				latex: eq(step.before)
			};
		case 'isolate-absolute-value': {
			const before = step.before;
			const after = step.after;
			return {
				title: 'On isole la valeur absolue',
				explanation:
					op.form === 'equal'
						? 'On se ramène à la forme $|u|=|v|$.'
						: 'On se ramène à la forme $|u|=c$.',
				latex: `\\begin{aligned} ${fmt(before.left)} &= ${fmt(before.right)} \\\\ ${fmt(after.left)} &= ${fmt(after.right)} \\end{aligned}`
			};
		}
		case 'split-absolute-value': {
			const branches = op.branches.map(eq).join(' \\;\\text{ou}\\; ');
			const latex = `${eq(step.before)} \\;\\Longleftrightarrow\\; ${branches}`;
			const proseBranches = op.branches.map(eqProse).join(' ou ');
			if (op.case === 'equal') {
				return {
					title: "Deux nombres ont la même valeur absolue s'ils sont égaux ou opposés",
					explanation: `${eqProse(step.before)} équivaut à ${proseBranches}.`,
					latex
				};
			}
			if (op.case === 'zero') {
				return {
					title: 'Seul $0$ a pour valeur absolue $0$',
					explanation: `${eqProse(step.before)} équivaut à ${proseBranches}.`,
					latex
				};
			}
			const c = op.value === undefined ? fmt(step.before.right) : fmt(op.value);
			const minusC = fmt(op.branches[1].right);
			return {
				title: `Deux nombres ont pour valeur absolue ${math(c)} : ${math(c)} et ${math(minusC)}`,
				explanation: `${math(`${c}>0`)}, donc ${eqProse(step.before)} équivaut à ${proseBranches}.`,
				latex
			};
		}
		case 'absolute-value-negative': {
			const c = fmt(op.value);
			return {
				title: 'Une valeur absolue est positive ou nulle',
				explanation: `Or ${math(`${c}<0`)} : aucun réel n'a pour valeur absolue ${math(c)}.`,
				latex: eq(step.before)
			};
		}
		case 'solve-branch':
			return { title: `On résout ${math(eq(op.equation))}`, latex: eq(op.equation) };
		case 'branch-truth': {
			const relation = eq(op.relation);
			return op.truth
				? {
						title: 'Cette équation est vérifiée par tout réel',
						explanation: `L'égalité ${math(relation)} est vraie quel que soit ${math(op.variable)}.`,
						latex: relation
					}
				: {
						title: "Cette équation n'a pas de solution",
						explanation: `L'égalité ${math(relation)} est fausse quel que soit ${math(op.variable)}.`,
						latex: relation
					};
		}
		case 'read-solutions':
			return {
				title:
					op.solutions.length === 0
						? "L'équation n'a pas de solution"
						: op.solutions.length === 1
							? "L'équation a une seule solution"
							: 'On réunit les solutions des deux équations',
				latex: formatSolutions(op.solutions)
			};
		case 'read-all-reals':
			return { title: 'Tout réel est solution', latex: 'S = \\mathbb{R}' };
	}
}

// =============================================================================
// Renderer
// =============================================================================

export class AbsoluteValueEquationRenderer implements StepRenderer<
	EquationStep,
	PedagogicalRenderOptions
> {
	private readonly linear = new LinearEquationRenderer();

	render(step: EquationStep, options: PedagogicalRenderOptions): RenderedStep {
		const op = step.operation;
		if (op === undefined || !isOwned(op)) {
			return this.linear.render(step, {
				...options,
				schoolLevel: linearLevelFor(options.schoolLevel)
			});
		}
		const { title, explanation, latex } = renderOwned(op, step);
		return {
			id: step.id,
			rule: step.rule,
			title,
			...(options.verbosity === 'detailed' && explanation !== undefined && { explanation }),
			expressionLatex: latex,
			schoolLevel: options.schoolLevel
		};
	}

	renderAll(
		steps: readonly EquationStep[],
		options: PedagogicalRenderOptions
	): readonly RenderedStep[] {
		return steps.map((s) => this.render(s, options));
	}
}
