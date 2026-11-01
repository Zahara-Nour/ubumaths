/**
 * Le test commun d'un outil contre le corpus du registre : chaque entrée est
 * juste, ou figure dans la liste « connues fausses » de l'outil avec la
 * réponse qu'il rend aujourd'hui (`connues-fausses.ts`).
 */

import { describe, it, expect } from 'vitest';
import {
	REGISTRE_CASES,
	REGISTRE_CORPUS
} from '../../../../../../tests/fixtures/mathast/registre-corpus';
import { judge, type Produced, type Verdict } from './compare';

// =============================================================================
// Fonctions
// =============================================================================

/** `statut : rendu`, la forme des valeurs de `connues-fausses.ts` */
export function describeVerdict(verdict: Verdict): string {
	return 'rendu' in verdict ? `${verdict.status} : ${verdict.rendu}` : verdict.status;
}

export function describeCorpus(
	tool: string,
	produce: (ligne: string) => Produced,
	known: Readonly<Record<string, string>>
): void {
	describe(`${tool} contre le corpus du registre`, () => {
		it('la liste « connues fausses » ne cite que des entrées du corpus', () => {
			const ids = new Set(REGISTRE_CASES.map((c) => c.id));
			expect(Object.keys(known).filter((id) => !ids.has(id))).toEqual([]);
		});

		for (const [command, cases] of Object.entries(REGISTRE_CORPUS)) {
			describe(command, () => {
				for (const c of cases) {
					it(`${c.id} : ${c.ligne}`, () => {
						const verdict = judge(c, produce(c.ligne));
						const knownWrong = known[c.id];
						if (knownWrong === undefined) {
							expect(describeVerdict(verdict), `attendu : ${c.attendu}`).toBe('juste');
						} else {
							// Devenue juste → retirer la ligne de `connues-fausses.ts`
							expect(describeVerdict(verdict), `attendu : ${c.attendu}`).toBe(knownWrong);
						}
					});
				}
			});
		}
	});
}
