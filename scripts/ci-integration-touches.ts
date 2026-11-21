/**
 * Tests touchés par une PR de code (nightly-integration.yml, job `portee`)
 * ========================================================================
 *
 * Sur une PR qui ne modifie que du code (`src/`), de la doc et des tests d'intégration, seuls
 * tournent les tests dont les imports atteignent un fichier modifié. Sur les 37 PR mesurées, une
 * PR `src/` seule atteignait 0 à 20 tests (0 à 42 s) au lieu de toute la suite.
 * Comportements validés : docs/archive/wip/ci-integration-progress.md § 9.
 *
 *   - fermeture des imports PAR test (`integrationClosures`, le calcul de la garde
 *     `check:integration-paths`) ;
 *   - fichiers chargés en lot (`import.meta.glob`, jusque sous `docs/`) : atteints par les tests
 *     qui atteignent leur chargeur ; un motif illisible → suite complète ;
 *   - tests d'intégration ajoutés ou modifiés par la PR : ajoutés à la liste ;
 *   - tests `@migration-de-donnees` : laissés de côté, sauf modifiés par la PR (règle de F) ;
 *   - suite complète : fichier hors `src/`, doc et tests d'intégration ; outillage de la suite ;
 *     fichier atteint par le global-setup ; `src/env.ts` ; fichier de `src/` ou test supprimé ;
 *     pas une PR ; dans le doute.
 *
 * Seulement sur `pull_request` : le checkout est le commit de merge, dont le premier parent est la
 * base ; `git diff HEAD^1 HEAD` = ce que la PR change (checkout avec fetch-depth: 2).
 *
 * Écrit sur la sortie standard (pour $GITHUB_OUTPUT) :
 *   fichiers=<tests séparés par des espaces>   (vide = suite complète, ou aucun test)
 *   aucun=true|false                           (true = aucun test n'atteint la PR : rien à lancer)
 * la raison sur l'erreur standard. Dans le doute : suite complète.
 * Tests : scripts/__tests__/ci-integration-touches.test.ts.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { integrationClosures } from './check-integration-paths';
import { charge, chargementsDe, type Chargement } from './lib/chargements-en-lot';
import { porteLaMention } from './lib/migrations-de-donnees';

export { charge, chargementsDe, type Chargement };

// Types

export type Changement = { statut: string; fichier: string };

export type Verdict =
	{ kind: 'complet'; raison: string } | { kind: 'aucun' } | { kind: 'tests'; tests: string[] };

export type Entree = {
	changements: Changement[];
	/** fichier de la suite (test ou global-setup) → fichiers qu'il atteint par ses imports */
	fermetures: Map<string, string[]>;
	chargements: Chargement[];
	/** tests marqués `@migration-de-donnees` */
	marques: Set<string>;
};

// Constantes

const GLOBAL_SETUP = 'tests/integration/global-setup.ts';

/** Au-delà, la sélection est découpée en 4 morceaux (une stack coûte ~2 min, un test ~2 s). */
export const SEUIL_UN_MORCEAU = 40;

/** Un test de la suite (cf. `include` de vitest.integration.config.ts), hors fixtures. */
const TEST_DE_LA_SUITE = /^tests\/integration\/(?!fixtures\/).*\.(test|spec)\.(js|ts)$/;

/** Lus par tous les tests : toute modification relance la suite entière. */
const COMMUNS = new Set(['src/env.ts', GLOBAL_SETUP]);

// Fonctions

/** Les fichiers de la suite (tests, global-setup) qui atteignent `fichier`, par import ou en lot. */
function atteignants(fichier: string, e: Entree): string[] {
	const chargeurs = e.chargements.filter((c) => charge(fichier, c)).map((c) => c.chargeur);
	const cibles = new Set([fichier, ...chargeurs]);
	return [...e.fermetures]
		.filter(([, atteints]) => atteints.some((f) => cibles.has(f)))
		.map(([test]) => test);
}

export function selectionner(e: Entree): Verdict {
	if (e.changements.length === 0) return { kind: 'complet', raison: 'aucun fichier changé' };
	if (!e.fermetures.has(GLOBAL_SETUP))
		return { kind: 'complet', raison: 'fermeture du global-setup absente' };

	const deLaPr = new Set<string>();
	const atteints = new Set<string>();
	for (const { statut, fichier } of e.changements) {
		if (COMMUNS.has(fichier))
			return { kind: 'complet', raison: `${fichier} : lu par tous les tests` };

		if (TEST_DE_LA_SUITE.test(fichier)) {
			if (statut === 'D') return { kind: 'complet', raison: `${fichier} : test supprimé` };
			deLaPr.add(fichier);
			continue;
		}

		const parCode = fichier.startsWith('src/');
		// La doc : `docs/` et les `.md` de la racine. Un `.md` ailleurs (fixture, `supabase/`) peut
		// être lu par un test : suite complète.
		const parDoc =
			fichier.startsWith('docs/') || (fichier.endsWith('.md') && !fichier.includes('/'));
		if (!parCode && !parDoc)
			return { kind: 'complet', raison: `${fichier} : ni code, ni doc, ni test d'intégration` };
		if (parCode && statut === 'D')
			return { kind: 'complet', raison: `${fichier} : supprimé ou renommé` };

		const par = atteignants(fichier, e);
		if (par.includes(GLOBAL_SETUP))
			return { kind: 'complet', raison: `${fichier} : atteint par le global-setup` };
		for (const t of par) atteints.add(t);
	}

	const tests = new Set(deLaPr);
	for (const t of atteints) if (!e.marques.has(t)) tests.add(t);
	if (tests.size === 0) return { kind: 'aucun' };
	return { kind: 'tests', tests: [...tests].sort() };
}

export function sortie(v: Verdict): string {
	const fichiers = v.kind === 'tests' ? v.tests.join(' ') : '';
	return `fichiers=${fichiers}\naucun=${v.kind === 'aucun'}`;
}

function changementsDeLaPr(root: string): Changement[] {
	const git = (...args: string[]) =>
		execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
	git('rev-parse', '-q', '--verify', 'HEAD^2');
	return git('diff', '--name-status', '--no-renames', 'HEAD^1', 'HEAD')
		.split('\n')
		.filter(Boolean)
		.map((ligne) => {
			const [statut, fichier] = ligne.split('\t');
			return { statut: statut.charAt(0), fichier };
		});
}

async function verdictDuDepot(root: string): Promise<Verdict> {
	if (process.env.GITHUB_EVENT_NAME !== 'pull_request')
		return { kind: 'complet', raison: 'pas une PR' };
	let changements: Changement[];
	try {
		changements = changementsDeLaPr(root);
	} catch {
		return { kind: 'complet', raison: 'pas un commit de merge, ou diff illisible' };
	}

	const fermetures = await integrationClosures(root);
	const atteints = new Set([...fermetures.values()].flat());
	const chargements: Chargement[] = [];
	const marques = new Set<string>();
	for (const f of atteints) {
		if (!/\.(ts|js|svelte)$/.test(f)) continue;
		const source = readFileSync(resolve(root, f), 'utf8');
		chargements.push(...chargementsDe(source, f));
		if (fermetures.has(f) && f !== GLOBAL_SETUP && porteLaMention(source)) marques.add(f);
	}
	return selectionner({ changements, fermetures, chargements, marques });
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
	let v: Verdict;
	try {
		v = await verdictDuDepot(process.cwd());
	} catch (err) {
		v = {
			kind: 'complet',
			raison: `calcul en échec : ${err instanceof Error ? err.message : err}`
		};
	}
	const message =
		v.kind === 'complet'
			? `${v.raison} → suite complète`
			: v.kind === 'aucun'
				? 'aucun test n’atteint les fichiers modifiés'
				: `${v.tests.length} test(s) atteint(s) : ${v.tests.join(' ')}`;
	console.error(`ci-integration-touches : ${message}`);
	console.log(sortie(v));
}
