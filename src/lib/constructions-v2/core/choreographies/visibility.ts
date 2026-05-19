/**
 * Apply the `@epure | @squelette | @complet` visibility decorator to the
 * elements produced by a choreography.
 *
 * Called by `ConstructionExecutor` AFTER the step's animation completes
 * (driven by the canvas reaching `drawProgress >= 1`), so that the user
 * sees the full choreography play out first, then the figure settles into
 * its final state.
 *
 * Rules :
 *   - `epure`     : only the principal element remains visible. Charnières
 *                   and traces are hidden.
 *   - `squelette` : principal + charnières visible. Traces hidden.
 *   - `complet`   : everything visible. Traces are restyled with a dashed
 *                   stroke and reduced opacity so they're recognisable as
 *                   construction aids rather than primary content.
 */

import type { Figure } from '$lib/geometry-core/graph/figure';
import type { ChoreographyProduced, Visibilite } from './types';

export function applyFinalVisibility(
	figure: Figure,
	produced: ChoreographyProduced,
	visibilite: Visibilite
): void {
	switch (visibilite) {
		case 'epure':
			for (const id of produced.charnieres) figure.hideElement(id);
			for (const id of produced.traces) figure.hideElement(id);
			break;
		case 'squelette':
			for (const id of produced.traces) figure.hideElement(id);
			break;
		case 'complet':
			// V1 minimal : keep everything visible. Style overrides (dashed +
			// reduced opacity for traces) are a Phase 5.1 enhancement.
			break;
	}
}
