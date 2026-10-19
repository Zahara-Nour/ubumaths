/**
 * La seconde figure du test d'équivalence (revue du chantier perf, 2026-10-19) :
 * là où les liaisons limitées (`wantedNames`, `engine.ts`) suivent les noms de
 * proche en proche — dérivée, réciproque, suites récurrente et explicites, noms
 * indicés, mesure reprise dans une valeur et dans une coordonnée, liste citée
 * dans une valeur. Tapée dans Calcul, comme le ferait l'élève.
 *
 * ⚠️ Constaté en l'écrivant, AVANT le chantier comme après (raccourcis éteints) :
 * `a_1` tapé seul répond « Écriture non reconnue », `c_2` reste `c_2`, et
 * `(AB ; c_2)` attend « c ». Ce n'est pas l'objet de ce test : il prouve que les
 * raccourcis rendent la même chose que le chemin long, quelle qu'elle soit.
 */

import { Atelier } from '../../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../../calcul';

export const FIGURE_FONCTIONS: readonly string[] = [
	'a = 2',
	'b = 1',
	'a_1 = 3',
	'c_2 = a_1 + a',
	'f(x) = a x^2',
	"g(x) = f'(x) + 1",
	'k(x) = a x + b',
	'h(x) = k⁻¹(x) + 1',
	'u(n+1) = u(n)/2 + b',
	'v(n) = 2n + a',
	'w(n) = v(n) + 1',
	'A = (0 ; 0)',
	'B = (a ; 1)',
	'm = AB + 1',
	'P = (AB ; b)',
	'r = g(1) + h(2) + w(3) + m'
];

/** Un atelier neuf qui porte la figure ; une ligne refusée lève. */
export function figureFonctions(): Atelier {
	const atelier = new Atelier();
	const session = { atelier, engine: new WebReplEngine(), seed: () => 1 };
	for (const line of FIGURE_FONCTIONS) {
		const done = runInput(session, line);
		if (done.kind !== 'definition') throw new Error(`${line} : ${JSON.stringify(done)}`);
	}
	// u : une récurrence de premier terme a ; une liste citée comme un nombre (refusée)
	atelier.setSequence('u', { firstTerm: 'a' });
	atelier.create({ kind: 'list', name: 'L', definition: '1;2;3' }, 'text');
	atelier.create({ kind: 'value', name: 'q', definition: 'L + 1' }, 'text');
	return atelier;
}
