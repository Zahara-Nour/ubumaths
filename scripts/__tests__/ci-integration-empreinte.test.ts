/**
 * Empreinte d'un passage de la suite d'intégration (nightly-integration.yml, job `portee`)
 * ========================================================================================
 *
 * `scripts/ci-integration-empreinte.sh` rend `empreinte=<sha>` sur une PR (commit de merge) : les
 * fichiers couverts par le filtre `paths` du workflow, plus la portée du passage. Un push qui ne
 * touche aucun fichier couvert garde l'empreinte ; tout le reste la change. Hors PR : vide.
 *
 * Deux parties : un dépôt jetable (git ne tourne jamais hors du dossier temporaire), puis le vrai
 * workflow, pour que la lecture du filtre par le script (awk + `:(glob)` de git) retrouve
 * exactement ce que couvre GitHub (`githubPathPattern` de check-integration-paths).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { parse } from 'yaml';
import { githubPathPattern } from '../check-integration-paths';

// ============================================================================
// Constantes
// ============================================================================

const SCRIPT = resolve(__dirname, '../ci-integration-empreinte.sh');
const RACINE_DEPOT = resolve(__dirname, '../..');
const WORKFLOW = '.github/workflows/nightly-integration.yml';

/** Workflow réduit, de la même forme que le vrai (commentaires et clés voisines compris). */
const WORKFLOW_JETABLE = `name: Nightly Integration Tests

on:
  schedule:
    - cron: '17 2 * * *'
  workflow_dispatch:
  pull_request:
    # commentaire
    paths:
      - 'supabase/**'
      - 'tests/integration/**'
      # src/lib : fichiers atteints ponctuellement
      - 'src/lib/server/**'
      - 'src/routes/*/dashboard/*page.server.ts'
      - '${WORKFLOW}'
concurrency:
  group: x
`;

// ============================================================================
// Variables
// ============================================================================

let racine: string;

// ============================================================================
// Fonctions
// ============================================================================

function env(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
	return {
		...process.env,
		HOME: racine,
		XDG_CONFIG_HOME: racine,
		GIT_CONFIG_NOSYSTEM: '1',
		GIT_CEILING_DIRECTORIES: dirname(racine),
		GIT_AUTHOR_NAME: 'test',
		GIT_AUTHOR_EMAIL: 'test@example.com',
		GIT_COMMITTER_NAME: 'test',
		GIT_COMMITTER_EMAIL: 'test@example.com',
		GITHUB_EVENT_NAME: 'pull_request',
		FICHIERS: '',
		EXCLURE: '',
		TOTAL: '4',
		...extra
	};
}

function git(...args: string[]): void {
	const r = spawnSync('git', args, { cwd: racine, env: env(), encoding: 'utf8' });
	if (r.status !== 0) throw new Error(`git ${args.join(' ')} → ${r.status}\n${r.stderr}`);
}

function ecrire(fichier: string, contenu: string): void {
	mkdirSync(join(racine, dirname(fichier)), { recursive: true });
	writeFileSync(join(racine, fichier), contenu);
	git('add', fichier);
}

function depot(): void {
	racine = realpathSync(mkdtempSync(join(tmpdir(), 'ci-empreinte-')));
	if (!racine || racine === sep) throw new Error('dossier jetable invalide');
	git('init', '-q', '-b', 'main');
	ecrire(WORKFLOW, WORKFLOW_JETABLE);
	ecrire('supabase/migrations/20250101000000_init.sql', 'create table t ();\n');
	ecrire('tests/integration/a.test.ts', 'export {};\n');
	ecrire('src/lib/server/a.ts', 'export const a = 1;\n');
	ecrire('src/routes/(protected)/dashboard/+page.server.ts', 'export {};\n');
	ecrire('src/routes/(protected)/dashboard/+page.svelte', '<p>a</p>\n');
	git('commit', '-q', '-m', 'init');
	git('switch', '-q', '-c', 'feat/x');
	ecrire('src/app.ts', 'export {};\n');
	git('commit', '-q', '-m', 'pr');
	merger();
}

/** Commit de merge de feat/x dans main, comme le checkout d'une PR (refs/pull/N/merge). */
function merger(): void {
	git('switch', '-q', 'main');
	git('switch', '-q', '--detach');
	git('merge', '-q', '--no-ff', '-m', 'merge', 'feat/x');
}

/** Un push sur la PR : `fichiers` écrits sur feat/x, puis nouveau commit de merge. */
function push(fichiers: Record<string, string>): void {
	git('switch', '-q', 'feat/x');
	for (const [f, contenu] of Object.entries(fichiers)) ecrire(f, contenu);
	git('commit', '-q', '-m', 'push');
	merger();
}

/** `main` avance (hors PR), puis nouveau commit de merge. */
function mainAvance(fichiers: Record<string, string>): void {
	git('switch', '-q', 'main');
	for (const [f, contenu] of Object.entries(fichiers)) ecrire(f, contenu);
	git('commit', '-q', '-m', 'main avance');
	merger();
}

function empreinte(extra: NodeJS.ProcessEnv = {}): string {
	const r = spawnSync('bash', [SCRIPT], { cwd: racine, env: env(extra), encoding: 'utf8' });
	expect(r.status, r.stderr).toBe(0);
	const ligne = r.stdout.trim();
	expect(ligne.startsWith('empreinte=')).toBe(true);
	return ligne.slice('empreinte='.length);
}

// ============================================================================
// Tests
// ============================================================================

describe('ci-integration-empreinte (dépôt jetable)', () => {
	beforeEach(() => depot());

	afterEach(() => {
		if (racine && racine.startsWith(realpathSync(tmpdir())))
			rmSync(racine, { recursive: true, force: true });
	});

	it('rend une empreinte sur un commit de merge de PR', () => {
		expect(empreinte()).toMatch(/^[0-9a-f]{40}$/);
	});

	it('un push qui ne touche aucun fichier couvert garde l’empreinte', () => {
		const avant = empreinte();
		push({
			'src/app.ts': 'export const b = 2;\n',
			'src/routes/(protected)/dashboard/+page.svelte': '<p>b</p>\n'
		});
		expect(empreinte()).toBe(avant);
	});

	it('un push qui touche un fichier couvert change l’empreinte', () => {
		for (const fichier of [
			'tests/integration/a.test.ts',
			'supabase/migrations/20250101000000_init.sql',
			'src/lib/server/a.ts',
			'src/routes/(protected)/dashboard/+page.server.ts',
			WORKFLOW
		]) {
			const avant = empreinte();
			const contenu = readFileSync(join(racine, fichier), 'utf8');
			push({ [fichier]: `${contenu}\n# ${fichier}\n` });
			expect(empreinte(), fichier).not.toBe(avant);
		}
	});

	it('un fichier couvert AJOUTÉ change l’empreinte', () => {
		const avant = empreinte();
		push({ 'tests/integration/b.test.ts': 'export {};\n' });
		expect(empreinte()).not.toBe(avant);
	});

	it('main qui avance sur un fichier couvert change l’empreinte ; ailleurs, non', () => {
		const avant = empreinte();
		mainAvance({ 'README.md': 'x\n' });
		expect(empreinte()).toBe(avant);
		mainAvance({ 'src/lib/server/b.ts': 'export const b = 1;\n' });
		expect(empreinte()).not.toBe(avant);
	});

	it('la portée du passage (tests lancés, laissés de côté, morceaux) entre dans l’empreinte', () => {
		const avant = empreinte();
		expect(empreinte({ FICHIERS: 'tests/integration/a.test.ts' })).not.toBe(avant);
		expect(empreinte({ EXCLURE: 'tests/integration/a.test.ts' })).not.toBe(avant);
		expect(empreinte({ TOTAL: '1' })).not.toBe(avant);
	});

	it('hors PR : pas d’empreinte', () => {
		expect(empreinte({ GITHUB_EVENT_NAME: 'schedule' })).toBe('');
		expect(empreinte({ GITHUB_EVENT_NAME: 'workflow_dispatch' })).toBe('');
	});

	it('pas un commit de merge : pas d’empreinte', () => {
		git('switch', '-q', 'feat/x');
		expect(empreinte()).toBe('');
	});

	it('un motif que la lecture glob ne sait pas lire (`?`, `+`, `[]`, `!`) : pas d’empreinte', () => {
		for (const motif of ['src/a?.ts', 'src/a+.ts', 'src/[ab].ts', '!src/a.ts']) {
			push({ [WORKFLOW]: WORKFLOW_JETABLE.replace("'supabase/**'", `'${motif}'`) });
			expect(empreinte(), motif).toBe('');
		}
	});

	it('un `**` collé à un nom (lu `*` par git) : pas d’empreinte', () => {
		for (const motif of ['src/**server.ts', 'src/**.ts', 'src/a**/b.ts']) {
			push({ [WORKFLOW]: WORKFLOW_JETABLE.replace("'supabase/**'", `'${motif}'`) });
			expect(empreinte(), motif).toBe('');
		}
	});

	it('espace après le guillemet fermant : motif lu sans elle', () => {
		const avant = empreinte();
		push({ [WORKFLOW]: WORKFLOW_JETABLE.replace("'supabase/**'", "'supabase/**'   ") });
		const apres = empreinte();
		expect(apres).not.toBe('');
		expect(apres).not.toBe(avant); // le workflow lui-même a changé
		const contenu = readFileSync(
			join(racine, 'supabase/migrations/20250101000000_init.sql'),
			'utf8'
		);
		push({ 'supabase/migrations/20250101000000_init.sql': `${contenu}-- x\n` });
		expect(empreinte()).not.toBe(apres);
	});

	it('motif entre guillemets mal fermés : pas d’empreinte', () => {
		push({ [WORKFLOW]: WORKFLOW_JETABLE.replace("'supabase/**'", "'supabase/** '") });
		expect(empreinte()).toBe('');
	});

	it('filtre introuvable : pas d’empreinte', () => {
		push({ [WORKFLOW]: 'name: x\non:\n  pull_request:\n' });
		expect(empreinte()).toBe('');
	});

	it('l’index du dépôt n’entre pas dans l’empreinte (seul HEAD compte)', () => {
		const avant = empreinte();
		writeFileSync(join(racine, 'src/lib/server/a.ts'), 'export const a = 99;\n');
		git('add', 'src/lib/server/a.ts');
		expect(empreinte()).toBe(avant);
	});
});

describe('ci-integration-empreinte (vrai workflow)', () => {
	const workflow = parse(readFileSync(join(RACINE_DEPOT, WORKFLOW), 'utf8'));
	const motifs: string[] = workflow.on.pull_request.paths;

	it('le filtre n’emploie que `*` et `**` (sens identique chez GitHub et en `:(glob)` de git)', () => {
		expect(motifs.filter((m) => /[[\]?+!]/.test(m))).toEqual([]);
	});

	it('les fichiers retenus par le script sont exactement ceux que couvre le filtre GitHub', () => {
		// Fichiers suivis de HEAD sélectionnés par `githubPathPattern`, contre ceux que retient le
		// script (LISTER=1).
		const suivis = execFileSync('git', ['ls-tree', '-r', '--name-only', 'HEAD'], {
			cwd: RACINE_DEPOT,
			encoding: 'utf8',
			maxBuffer: 64 * 1024 * 1024
		})
			.split('\n')
			.filter(Boolean);
		const regexps = motifs.map((m) => githubPathPattern(m));
		const attendus = suivis.filter((f) => regexps.some((r) => r.test(f))).sort();

		const r = spawnSync('bash', [SCRIPT], {
			cwd: RACINE_DEPOT,
			env: { ...process.env, LISTER: '1' },
			encoding: 'utf8',
			maxBuffer: 64 * 1024 * 1024
		});
		expect(r.status, r.stderr).toBe(0);
		const retenus = r.stdout.split('\n').filter(Boolean).sort();
		expect(retenus.length).toBeGreaterThan(1000);
		expect(retenus).toEqual(attendus);
	});
});
