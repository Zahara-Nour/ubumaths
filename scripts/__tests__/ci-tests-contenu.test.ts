/**
 * Tests serveur à lancer sur une PR de contenu (quality.yml, job `test-server`)
 * ============================================================================
 *
 * Sur une PR de contenu seul (`scripts/ci-nature-changement.sh` → `contenu=true`), les
 * tests serveur ne tournent pas en entier : seuls ceux qui lisent les modèles de
 * `scripts/questions/` peuvent changer de verdict. `scripts/ci-tests-contenu.sh` les
 * liste en cherchant le chemin dans les fichiers de test du projet vitest `server`
 * (`src/**` et `scripts/**`, `*.svelte.test.ts` exclus : projet `client`). Liste vide →
 * échec : mieux vaut une CI rouge qu'une PR de contenu sans aucun test.
 *
 * Dépôt jetable : git ne tourne jamais hors du dossier temporaire.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const SCRIPT = resolve(__dirname, '../ci-tests-contenu.sh');

let racine: string;

function env(): NodeJS.ProcessEnv {
	return {
		...process.env,
		HOME: racine,
		XDG_CONFIG_HOME: racine,
		GIT_CONFIG_NOSYSTEM: '1',
		GIT_CEILING_DIRECTORIES: dirname(racine)
	};
}

function git(...args: string[]): void {
	const r = spawnSync('git', args, { cwd: racine, env: env(), encoding: 'utf8' });
	if (r.status !== 0) throw new Error(`git ${args.join(' ')} → ${r.status}\n${r.stderr}`);
}

/** Écrit `fichier` avec `contenu` et l'indexe (le script lit les fichiers suivis). */
function ecrire(fichier: string, contenu: string): void {
	mkdirSync(join(racine, dirname(fichier)), { recursive: true });
	writeFileSync(join(racine, fichier), `${contenu}\n`);
	git('add', fichier);
}

function lancer(): { status: number | null; lignes: string[] } {
	const r = spawnSync('bash', [SCRIPT], { cwd: racine, env: env(), encoding: 'utf8' });
	return { status: r.status, lignes: r.stdout.split('\n').filter(Boolean).sort() };
}

const LIT = "const DIR = join(process.cwd(), 'scripts/questions');";

beforeEach(() => {
	racine = realpathSync(mkdtempSync(join(tmpdir(), 'ci-tests-contenu-')));
	git('init', '-q');
});

afterEach(() => {
	rmSync(racine, { recursive: true, force: true });
});

describe('ci-tests-contenu', () => {
	it('liste les tests serveur de src/ et scripts/ qui lisent scripts/questions', () => {
		ecrire('src/lib/q/__tests__/corpus.test.ts', LIT);
		ecrire('scripts/__tests__/lot.test.ts', "run(['--dir', 'scripts/questions/cp-c']);");
		ecrire('src/lib/q/__tests__/autre.spec.ts', "join(process.cwd(), 'scripts', 'questions')");
		ecrire('scripts/__tests__/vieux.test.js', LIT);
		ecrire('src/lib/q/__tests__/sans-rapport.test.ts', 'expect(1).toBe(1);');

		expect(lancer()).toEqual({
			status: 0,
			lignes: [
				'scripts/__tests__/lot.test.ts',
				'scripts/__tests__/vieux.test.js',
				'src/lib/q/__tests__/autre.spec.ts',
				'src/lib/q/__tests__/corpus.test.ts'
			]
		});
	});

	it('écarte les tests client (*.svelte.test.ts), d’intégration et le code non testé', () => {
		ecrire('src/lib/q/__tests__/corpus.test.ts', LIT);
		ecrire('src/lib/q/__tests__/Carte.svelte.test.ts', LIT);
		ecrire('tests/integration/rangement.test.ts', LIT);
		ecrire('src/lib/q/lecteur.ts', LIT);

		expect(lancer()).toEqual({ status: 0, lignes: ['src/lib/q/__tests__/corpus.test.ts'] });
	});

	it('échoue quand aucun test ne lit scripts/questions', () => {
		ecrire('src/lib/q/__tests__/sans-rapport.test.ts', 'expect(1).toBe(1);');

		expect(lancer()).toEqual({ status: 1, lignes: [] });
	});
});
