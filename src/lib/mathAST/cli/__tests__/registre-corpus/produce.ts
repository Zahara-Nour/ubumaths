/**
 * Ce que chaque outil rend pour une ligne du corpus du registre : la réponse
 * brute, un refus, ou rien de lisible (`compare.ts` juge ensuite).
 *
 * - **Registre** : le champ `answer` de `WebReplEngine`, sur la ligne aux
 *   noms traduits (`.dériver` → `.diff`) et RIEN d'autre de réécrit : ce qui
 *   ne se lit qu'à travers l'Atelier (virgule décimale…) se voit.
 * - **Atelier** : le `latex` de la ligne affichée par `runInput`.
 */

import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { runInput } from '$lib/atelier/calcul';
import { resolveCommand } from '$lib/atelier/commands';
import type { Produced } from './compare';

// =============================================================================
// Fonctions
// =============================================================================

/** La réponse du registre, dans une session neuve. */
export function produceRegistre(ligne: string): Produced {
	const result = new WebReplEngine().execute(resolveCommand(ligne));
	if (!result.success) {
		return { kind: 'refus', message: result.error?.message ?? result.output };
	}
	return result.answer === undefined
		? { kind: 'sans-reponse', detail: firstLine(result.output) }
		: { kind: 'reponse', latex: result.answer };
}

/** La réponse affichée par l'Atelier, dans un atelier neuf. */
export function produceAtelier(ligne: string): Produced {
	const result = runInput({ atelier: new Atelier(), engine: new WebReplEngine() }, ligne);
	if (result.kind === 'refus') return { kind: 'refus', message: result.message };
	if (result.kind !== 'commande' && result.kind !== 'calcul') {
		return { kind: 'sans-reponse', detail: `ligne ${result.kind}` };
	}
	return result.latex === undefined
		? { kind: 'sans-reponse', detail: firstLine(result.output) }
		: { kind: 'reponse', latex: result.latex };
}

function firstLine(text: string): string {
	return text.split('\n')[0].trim();
}
