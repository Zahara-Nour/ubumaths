/**
 * Step Renderer Base
 *
 * Abstract types for the rendering layer of step recorders.
 *
 * Step recorders (StepRecorderBase) capture transformations during a calculation
 * as raw `BaseStep` objects. Renderers convert those raw steps into a presentation
 * form adapted to the audience:
 *
 * - **TechnicalRenderer** — verbose dump for debug / devtools, no school adaptation
 * - **PedagogicalRenderer** — vocabulary adapted to a SchoolLevel for students
 *
 * Same source steps, two outputs (dual rendering pattern). See
 * `docs/wip/pedagogical-steppers-mvp-prompt.md` for the design rationale.
 *
 * @module mathAST/common/step-renderer-base
 */

import type { Verbosity } from './verbosity';
import type { BaseStep } from './step-recorder-base';

// =============================================================================
// School Level
// =============================================================================

/**
 * French school level used by pedagogical renderers to adapt vocabulary and
 * explanation depth.
 *
 * - `primaire` — elementary school (CP–CM2)
 * - `college` — middle school (6e–3e)
 * - `lycee` — high school (2nde–Terminale)
 * - `superieur` — post-secondary
 *
 * Canonical home for this type. Re-exported from `step-generator/types.ts`
 * for backwards compatibility with existing imports.
 */
export type SchoolLevel = 'primaire' | 'college' | 'lycee' | 'superieur';

// =============================================================================
// Render Format
// =============================================================================

/**
 * Output format for rendered steps.
 *
 * - `structured` — typed `RenderedStep` object (for UI / JSON consumers)
 * - `text` — plain string suitable for console.log and snapshot tests
 *
 * The type is intentionally a string union (not an enum) so additional formats
 * (`markdown`, `latex`) can be added when a real consumer needs them.
 */
export type RenderFormat = 'structured' | 'text';

// =============================================================================
// Render Options
// =============================================================================

/**
 * Common options accepted by any step renderer.
 */
export interface RenderOptions {
	/** Verbosity level — drives whether explanations are included */
	readonly verbosity: Verbosity;

	/** Output format (default: `'structured'`) */
	readonly format?: RenderFormat;

	/** Locale for descriptions (default: `'fr'`) */
	readonly locale?: 'fr' | 'en';
}

/**
 * Options for pedagogical renderers — adds school-level adaptation.
 */
export interface PedagogicalRenderOptions extends RenderOptions {
	/** Target school level for vocabulary and explanation depth */
	readonly schoolLevel: SchoolLevel;
}

// =============================================================================
// Rendered Step
// =============================================================================

/**
 * A step in its presentation form, produced by a `StepRenderer`.
 *
 * Decoupled from the raw recorder step (`BaseStep` and its specializations):
 * the renderer is free to combine, reword, or split source steps as needed.
 */
export interface RenderedStep {
	/** Unique identifier — typically mirrors the source step id */
	readonly id: number;

	/** Rule key — typically mirrors the source step rule */
	readonly rule: string;

	/** Short title displayed for the step */
	readonly title: string;

	/** Longer explanation (typically included only when `verbosity === 'detailed'`) */
	readonly explanation?: string;

	/** LaTeX representation of the transformation (e.g. `"before \\Rightarrow after"`) */
	readonly expressionLatex?: string;

	/** Plain-text dump of the step (only set when `format === 'text'`) */
	readonly text?: string;

	/** School level used to render this step (only set by pedagogical renderers) */
	readonly schoolLevel?: SchoolLevel;

	/** Sub-steps for collapsible / nested display */
	readonly subSteps?: readonly RenderedStep[];
}

// =============================================================================
// Renderer Interface
// =============================================================================

/**
 * Generic step renderer interface.
 *
 * @typeParam TStep — the step type consumed (extends `BaseStep`)
 * @typeParam TOptions — the options accepted (extends `RenderOptions`)
 *
 * @example Technical renderer (no school adaptation)
 * ```typescript
 * class GenericTechnicalRenderer<TStep extends BaseStep>
 *   implements StepRenderer<TStep, RenderOptions> {
 *   render(step, options) { ... }
 *   renderAll(steps, options) { return steps.map(s => this.render(s, options)); }
 * }
 * ```
 *
 * @example Pedagogical renderer (school-adapted)
 * ```typescript
 * class SolvePedagogicalRenderer
 *   implements StepRenderer<SolveStep, PedagogicalRenderOptions> {
 *   render(step, options) { ... }
 *   renderAll(steps, options) { return steps.map(s => this.render(s, options)); }
 * }
 * ```
 */
export interface StepRenderer<
	TStep extends BaseStep,
	TOptions extends RenderOptions = RenderOptions
> {
	/** Render a single step */
	render(step: TStep, options: TOptions): RenderedStep;

	/** Render an array of steps */
	renderAll(steps: readonly TStep[], options: TOptions): readonly RenderedStep[];
}
