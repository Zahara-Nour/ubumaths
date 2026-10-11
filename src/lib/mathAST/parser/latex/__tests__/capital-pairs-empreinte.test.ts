/**
 * Non-régression des longueurs de segments sur un large corpus (4 122 chaînes).
 *
 * L'empreinte (`fixtures/empreinte-majuscules-collees.json`) fige, le 2026-10-12 AVANT
 * l'introduction des longueurs, l'arbre rendu par `parseLatexSafe` pour chaque saisie :
 * tous les littéraux des tests de `mathAST/parser` et `mathAST/structure`, les arguments de
 * `parseLatex(…)` des autres tests, le corpus de saisies d'élèves de `structure/`, et une
 * liste de cas à majuscules (géométrie, matrices, probabilités). Une saisie = son texte et
 * l'empreinte (sha1 tronqué) de `JSON.stringify({ ast, errors })`.
 *
 * Ce que contiennent vraiment les 4 122 chaînes (mesuré le 2026-10-12, en mode produit) :
 * 3 315 se lisent sans erreur, dont environ 2 400 formules (les 200 saisies d'élèves du
 * corpus, 79 cas à majuscules ajoutés à la main, des formules de tests) et environ 940
 * titres de tests ou identifiants que le parseur lit comme des produits de lettres ;
 * 807 sont en erreur (phrases, identifiants, saisies invalides des tests). 179 formules
 * lues sans erreur ont deux majuscules collées. Les chaînes en erreur et les titres
 * restent utiles : ils prouvent que le mode longueur ne change ni les erreurs ni la
 * lecture des lettres en dehors des majuscules collées.
 *
 * Ce qui est prouvé :
 * 1. en mode `'product'`, et SANS OPTION (défaut du parseur, décision Q-M du 2026-10-12),
 *    le parseur rend EXACTEMENT l'arbre d'avant, partout ;
 * 2. en mode `'length'` explicite, seules changent les saisies à majuscules collées, et
 *    elles changent bien (la classe visée est dans le corpus).
 *
 * ⚠️ Si une évolution VOLONTAIRE du parseur change l'un de ces arbres, l'empreinte se
 * régénère en mode `'product'` (même fonction `fingerprint`, mêmes saisies) dans le même
 * commit que l'évolution, en disant pourquoi.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseLatexSafe } from '../../index';
import type { LatexParserOptions } from '../../index';

// =============================================================================
// Constantes
// =============================================================================

const FIXTURE_PATH = fileURLToPath(
	new URL('./fixtures/empreinte-majuscules-collees.json', import.meta.url)
);

/** Le mode longueur, demandé explicitement (questions, `/test-structure`). */
const LENGTH: LatexParserOptions = { capitalPairs: 'length' };

const FIXTURE: ReadonlyArray<readonly [string, string]> = JSON.parse(
	readFileSync(FIXTURE_PATH, 'utf-8')
);

/**
 * Deux majuscules collées, avec les décorations d'un point entre elles (primes, indice).
 * Une saisie qui n'y répond pas ne doit pas changer en mode longueur.
 */
const ADJACENT_CAPITALS = /[A-Z](?:'+|\^\{?(?:\\prime)+\}?|_\{?[a-z0-9]+\}?)*[A-Z]/;

// =============================================================================
// Helpers
// =============================================================================

function fingerprint(input: string, options?: LatexParserOptions): string {
	let payload: string;
	try {
		const r = parseLatexSafe(input, options);
		payload = JSON.stringify({ ast: r.ast, errors: r.errors.map((e) => e.message) });
	} catch (e) {
		payload = JSON.stringify({ thrown: (e as Error).message });
	}
	return createHash('sha1').update(payload).digest('hex').slice(0, 12);
}

// =============================================================================
// Tests
// =============================================================================

describe('empreinte des majuscules collées (corpus de 4 122 chaînes)', () => {
	it('le corpus est complet et contient la classe visée', () => {
		expect(FIXTURE.length).toBe(4122);
		const withCapitals = FIXTURE.filter(([input]) => ADJACENT_CAPITALS.test(input));
		expect(withCapitals.length).toBeGreaterThan(150);
	});

	it("mode 'product' : chaque arbre est celui d'avant", () => {
		const changed = FIXTURE.filter(
			([input, hash]) => fingerprint(input, { capitalPairs: 'product' }) !== hash
		).map(([input]) => input);
		expect(changed).toEqual([]);
	});

	it("sans option (défaut du parseur) : chaque arbre est celui d'avant", () => {
		const changed = FIXTURE.filter(([input, hash]) => fingerprint(input) !== hash).map(
			([input]) => input
		);
		expect(changed).toEqual([]);
	});

	it("mode 'length' explicite : aucune saisie sans majuscules collées ne change", () => {
		const changed = FIXTURE.filter(
			([input, hash]) => !ADJACENT_CAPITALS.test(input) && fingerprint(input, LENGTH) !== hash
		).map(([input]) => input);
		expect(changed).toEqual([]);
	});

	it("mode 'length' explicite : les longueurs et les noms de figure changent bien", () => {
		const changed = new Set(
			FIXTURE.filter(([input, hash]) => fingerprint(input, LENGTH) !== hash).map(([input]) => input)
		);
		for (const input of ['AB', 'AB^2', 'AB^2=AC^2+BC^2', 'ABC', "A'B'", 'A_1B_1', 'FG']) {
			expect(changed.has(input), input).toBe(true);
		}
		for (const input of ['A B', 'A\\,B', 'ab', 'x_{AB}', '\\pi R^2']) {
			expect(changed.has(input), input).toBe(false);
		}
	});
});
