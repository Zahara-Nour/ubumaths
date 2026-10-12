/**
 * Non-régression de la syntaxe maison (`parseCustom`) face aux longueurs de segments (lot 5).
 *
 * Le corpus (`fixtures/corpus-syntaxe-maison.json`, 1 299 saisies, dont 355 à majuscules
 * collées) réunit :
 * - les 678 formules `~…~` à majuscules des 43 exercices de la base de prod (lecture seule,
 *   2026-10-12), dont 300 à majuscules collées (`~AB=5~`, `~ABC~`, `~GGGG~`, `~(AB)~`…) ;
 * - les formules `~…~` du dépôt (articles, tests, données de relecture) ;
 * - les arguments littéraux de `parseCustom…(…)` des tests ;
 * - une liste de cas à la main (primes, indices, unités, espace, matrices, physique).
 *
 * L'empreinte (`fixtures/empreinte-syntaxe-maison.json`) fige, AVANT le code du lot 5,
 * pour chaque saisie : l'arbre et les erreurs des parseurs Pratt (`parseCustomSafe`) et rd
 * (`parseCustomRDSafe`), et le LaTeX affiché (`toLatex`). Ce qui est prouvé :
 * 1. sans option, et en mode `'product'` explicite, rien ne change (décision Q-M) ;
 * 2. en mode `'length'`, seules changent des saisies à majuscules collées, et elles
 *    changent bien (la classe visée est dans le corpus).
 *
 * Régénérer (évolution volontaire seulement) : `EMPREINTE_MAJ=1 pnpm test:server <ce fichier>`.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseCustomSafe, parseCustomRDSafe, type CustomParserOptions } from '../index';
import { toLatex } from '../../../latex-generator';

// =============================================================================
// Constantes
// =============================================================================

const CORPUS_PATH = fileURLToPath(
	new URL('./fixtures/corpus-syntaxe-maison.json', import.meta.url)
);
const FIXTURE_PATH = fileURLToPath(
	new URL('./fixtures/empreinte-syntaxe-maison.json', import.meta.url)
);

const CORPUS: { inputs: readonly string[] } = JSON.parse(readFileSync(CORPUS_PATH, 'utf-8'));

/** Deux majuscules collées, avec les décorations d'un point entre elles (primes, indice). */
const ADJACENT_CAPITALS = /[A-Z](?:'+|_\{?[a-z0-9]+\}?)*[A-Z]/;

// =============================================================================
// Helpers
// =============================================================================

function safeLatex(result: ReturnType<typeof parseCustomSafe>): string | null {
	if (!result.ast) return null;
	try {
		return toLatex(result.ast);
	} catch (error) {
		return `ERREUR:${error instanceof Error ? error.message : String(error)}`;
	}
}

function fingerprint(input: string, options?: CustomParserOptions): string {
	const pratt = parseCustomSafe(input, options);
	const rd = parseCustomRDSafe(input, options);
	const payload = JSON.stringify({
		pratt: { ast: pratt.ast, errors: pratt.errors },
		rd: { ast: rd.ast, errors: rd.errors },
		latex: safeLatex(pratt)
	});
	return createHash('sha1').update(payload).digest('hex').slice(0, 16);
}

// =============================================================================
// Tests
// =============================================================================

if (process.env.EMPREINTE_MAJ === '1') {
	const entries = CORPUS.inputs.map((input) => [input, fingerprint(input)] as const);
	writeFileSync(FIXTURE_PATH, JSON.stringify(entries, null, 0) + '\n');
}

const FIXTURE: ReadonlyArray<readonly [string, string]> = JSON.parse(
	readFileSync(FIXTURE_PATH, 'utf-8')
);

describe('syntaxe maison : empreinte du corpus (lot 5)', () => {
	it('le corpus contient la classe visée (majuscules collées)', () => {
		expect(FIXTURE.length).toBe(CORPUS.inputs.length);
		const targeted = FIXTURE.filter(([input]) => ADJACENT_CAPITALS.test(input));
		expect(targeted.length).toBeGreaterThan(300);
	});

	it('sans option : arbres, erreurs et LaTeX identiques à avant le lot 5', () => {
		const changed = FIXTURE.filter(([input, hash]) => fingerprint(input) !== hash);
		expect(changed.map(([input]) => input)).toEqual([]);
	});

	it("en mode 'product' explicite : identiques à avant le lot 5", () => {
		const changed = FIXTURE.filter(
			([input, hash]) => fingerprint(input, { capitalPairs: 'product' }) !== hash
		);
		expect(changed.map(([input]) => input)).toEqual([]);
	});

	it("en mode 'length' : seules changent des saisies à majuscules collées, et elles changent", () => {
		const changed = FIXTURE.filter(
			([input, hash]) => fingerprint(input, { capitalPairs: 'length' }) !== hash
		);
		const outsideTarget = changed.filter(([input]) => !ADJACENT_CAPITALS.test(input));
		expect(outsideTarget.map(([input]) => input)).toEqual([]);
		expect(changed.length).toBeGreaterThan(250);
	});

	it("en mode 'length' : aucune saisie lisible en produit ne devient une erreur (rien en rouge)", () => {
		const broken = CORPUS.inputs.filter(
			(input) =>
				Boolean(parseCustomSafe(input).ast) &&
				!parseCustomSafe(input, { capitalPairs: 'length' }).ast
		);
		expect(broken).toEqual([]);
	});
});
