/**
 * Final visibility pass for choreographies.
 *
 * After the last sub-step of a decorated statement runs, the executor calls
 * `applyFinalVisibility(figure, produced, visibilite)` to enforce the
 * end-state of the construction according to the `@squelette` / `@epure` /
 * `@complet` decorator :
 *
 *   - `@squelette` (default) : principal + charnières visible ; traces hidden.
 *   - `@epure`            : only the principal visible.
 *   - `@complet`          : everything visible ; traces shown with a faded
 *                            dashed style so they read as construction marks.
 *
 * The `hiddenSupport` ids (e.g. circles created only to drive the
 * intersection helper) are NEVER made visible by any mode — they are
 * structural plumbing, not pedagogical content.
 */

import type { Figure } from '$lib/geometry-core/graph/figure';
import type { ChoreographyProduced, Visibilite } from './types';

/** Final-state style applied to `traces` under `@complet`. */
const TRACE_STYLE_COMPLET = { dash: 'dashed', opacity: 0.4 } as const;

/**
 * Mutate `figure` so the elements produced by a choreography end the
 * animation in the configuration matching `visibilite`.
 */
export function applyFinalVisibility(
	figure: Figure,
	produced: ChoreographyProduced,
	visibilite: Visibilite
): void {
	// Hidden support is always hidden (structural, never displayed).
	if (produced.hiddenSupport) {
		for (const id of produced.hiddenSupport) figure.hideElement(id);
	}

	switch (visibilite) {
		case 'epure':
			for (const id of produced.traces) figure.hideElement(id);
			for (const id of produced.charnieres) figure.hideElement(id);
			figure.showElement(produced.principal);
			break;
		case 'squelette':
			for (const id of produced.traces) figure.hideElement(id);
			for (const id of produced.charnieres) figure.showElement(id);
			figure.showElement(produced.principal);
			break;
		case 'complet':
			for (const id of produced.traces) {
				figure.showElement(id);
				applyTraceStyle(figure, id);
			}
			for (const id of produced.charnieres) figure.showElement(id);
			figure.showElement(produced.principal);
			break;
	}
}

/**
 * Apply the trace style (dashed + reduced opacity) to an element. Figure's
 * public surface lacks a generic `applyStyle` method, so we mutate the
 * element's `style` field directly — same pattern used by
 * `applyInlineStyle` in `dsl/builtins.ts`.
 */
function applyTraceStyle(figure: Figure, id: string): void {
	const el = figure.getElementById(id);
	if (!el) return;
	const merged = {
		...el,
		style: {
			...(el.style ?? {}),
			dash: TRACE_STYLE_COMPLET.dash,
			opacity: TRACE_STYLE_COMPLET.opacity
		}
	};
	// Figure stores elements in a private Map ; the `hideElement` / `showElement`
	// helpers go through `this.elements.set(id, updated)` which is the
	// idiomatic mutation path. We piggy-back on the same internal Map via
	// `(figure as unknown as { elements: Map<string, GeoElement> }).elements`.
	(figure as unknown as { elements: Map<string, typeof el> }).elements.set(id, merged);
}
