/**
 * Final visibility pass for choreographies.
 *
 * After the last sub-step of a decorated statement runs, the executor calls
 * `applyFinalVisibility(figure, produced, triple)` to enforce the end-state
 * of the construction according to the resolved `DecoratorTriple`.
 *
 * Base visibility (`triple.visibilite`) :
 *   - `@squelette` (default) : principal + charnières visible ; traces hidden.
 *   - `@epure`            : only the principal visible.
 *   - `@complet`            : everything visible ; traces shown with a faded
 *                            dashed style so they read as construction marks.
 *
 * Tag modifiers (Design C ; `triple.tagModifiers`) refine this on a
 * per-category basis :
 *   - `+arcs`, `+traces`, `+marqueurs`, `+points_aux`
 *     → force the corresponding trace category visible.
 *   - `-arcs`, `-traces`, `-marqueurs`, `-points_aux`
 *     → force it hidden.
 *
 * Composes with any base, so e.g. `@squelette +marqueurs` shows
 * principal + charnières + only the markers.
 *
 * The `hiddenSupport` ids (e.g. circles created only to drive the
 * intersection helper) are NEVER made visible by any mode — they are
 * structural plumbing, not pedagogical content.
 */

import type { Figure } from '$lib/geometry-core/graph/figure';
import type { ChoreographyProduced, DecoratorTriple, TraceTag, Visibilite } from './types';

/** Final-state style applied to `traces` whenever they are visible. */
const TRACE_STYLE = { dash: 'dashed', opacity: 0.4 } as const;

/**
 * Default per-mode visible-tag set. Tags absent here are hidden by the
 * base mode unless explicitly included via `@avec_X`.
 */
const DEFAULT_VISIBLE_TAGS: Record<Visibilite, ReadonlySet<TraceTag>> = {
	epure: new Set(),
	squelette: new Set(),
	complet: new Set<TraceTag>(['arc', 'segment-trace', 'marker', 'auxiliary-point'])
};

/**
 * Mutate `figure` so the elements produced by a choreography end the
 * animation in the configuration matching the decorator triple. Accepts
 * either a full `DecoratorTriple` (preferred) or a bare `Visibilite`
 * string (backward-compat for legacy callers).
 */
export function applyFinalVisibility(
	figure: Figure,
	produced: ChoreographyProduced,
	tripleOrVisibility: DecoratorTriple | Visibilite
): void {
	const triple: DecoratorTriple =
		typeof tripleOrVisibility === 'string'
			? { contrainte: 'direct', methode: null, visibilite: tripleOrVisibility }
			: tripleOrVisibility;

	// Hidden support is always hidden (structural, never displayed).
	if (produced.hiddenSupport) {
		for (const id of produced.hiddenSupport) figure.hideElement(id);
	}

	// Compute the effective per-tag visibility from base + modifiers.
	const visibleTags = new Set<TraceTag>(DEFAULT_VISIBLE_TAGS[triple.visibilite]);
	if (triple.tagModifiers) {
		for (const [tag, include] of triple.tagModifiers) {
			if (include) visibleTags.add(tag);
			else visibleTags.delete(tag);
		}
	}

	// Principal always visible at end of animation.
	figure.showElement(produced.principal);

	// Charnières visible only in @squelette and @complet.
	const showCharnieres = triple.visibilite === 'squelette' || triple.visibilite === 'complet';
	for (const id of produced.charnieres) {
		if (showCharnieres) figure.showElement(id);
		else figure.hideElement(id);
	}

	// Each trace : visible iff its tag is in `visibleTags`. Untagged
	// traces fall back to the legacy rule (visible only in @complet).
	for (const id of produced.traces) {
		const tag = produced.traceTags?.get(id);
		const shouldShow = tag ? visibleTags.has(tag) : triple.visibilite === 'complet';
		if (shouldShow) {
			figure.showElement(id);
			applyTraceStyle(figure, id);
		} else {
			figure.hideElement(id);
		}
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
			dash: TRACE_STYLE.dash,
			opacity: TRACE_STYLE.opacity
		}
	};
	// Figure stores elements in a private Map ; the `hideElement` / `showElement`
	// helpers go through `this.elements.set(id, updated)` which is the
	// idiomatic mutation path. We piggy-back on the same internal Map via
	// `(figure as unknown as { elements: Map<string, GeoElement> }).elements`.
	(figure as unknown as { elements: Map<string, typeof el> }).elements.set(id, merged);
}
