/**
 * Tests de migration de données laissés de côté sur une PR (nightly-integration.yml)
 * =================================================================================
 *
 * `scripts/ci-integration-exclusions.sh` rend `exclure=<tests marqués @migration-de-donnees>` sur
 * une PR (commit de merge), sauf ceux que la PR touche (le test ou sa migration), et rien du tout
 * si la PR touche l'outillage de la suite ou la règle elle-même. Hors PR : `exclure=`.
 *
 * Dépôt jetable : git ne tourne jamais hors du dossier temporaire.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';

// ============================================================================
// Constantes
// ============================================================================

const SCRIPT = resolve(__dirname, '../ci-integration-exclusions.sh');
const MIGRATION_A = 'supabase/migrations/20261120120749_questions_a_rangement_tags.sql';
const MIGRATION_B = 'supabase/migrations/20261120130500_questions_b_rangement_tags.sql';
const TEST_A = 'tests/integration/questions-a-rangement-tags.test.ts';
const TEST_B = 'tests/integration/questions-b-rangement-tags.test.ts';
const TEST_RLS = 'tests/integration/database/policies.test.ts';

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

/** Test marqué qui cite sa migration, comme les vrais (chemin dans une constante). */
function testMarque(migration: string): string {
	return `/**\n * @migration-de-donnees : hors des PR\n */\nconst MIGRATION = '${migration}';\n`;
}

/** Dépôt neuf : deux tests marqués, leurs migrations, un test de règles d'accès non marqué. */
function depot(): void {
	if (racine && racine.startsWith(realpathSync(tmpdir())))
		rmSync(racine, { recursive: true, force: true });
	racine = realpathSync(mkdtempSync(join(tmpdir(), 'ci-excl-')));
	if (!racine || racine === sep) throw new Error('dossier jetable invalide');
	git('init', '-q', '-b', 'main');
	ecrire(MIGRATION_A, 'update public.question_templates set node_id = null;\n');
	ecrire(MIGRATION_B, 'update public.question_templates set node_id = null;\n');
	ecrire(TEST_A, testMarque(MIGRATION_A));
	ecrire(TEST_B, testMarque(`../../${MIGRATION_B}`));
	ecrire(TEST_RLS, "const MIGRATION = 'supabase/migrations/20250101000000_policies.sql';\n");
	ecrire('src/app.ts', 'export {};\n');
	git('commit', '-q', '-m', 'init');
}

/** Une PR qui écrit `fichiers` (ajout ou modification), mergée dans main par un commit de merge. */
function pr(fichiers: Record<string, string>): void {
	git('switch', '-q', '-c', 'feat/x');
	for (const [f, contenu] of Object.entries(fichiers)) ecrire(f, contenu);
	git('commit', '-q', '-m', 'pr');
	git('switch', '-q', 'main');
	ecrire('autre-chose-sur-main.txt', 'x\n');
	git('commit', '-q', '-m', 'main avance');
	git('merge', '-q', '--no-ff', '-m', 'merge', 'feat/x');
}

function exclus(extra: NodeJS.ProcessEnv = {}): string[] {
	const r = spawnSync('bash', [SCRIPT], { cwd: racine, env: env(extra), encoding: 'utf8' });
	expect(r.status, r.stderr).toBe(0);
	const ligne = r.stdout.trim();
	expect(ligne.startsWith('exclure=')).toBe(true);
	const liste = ligne.slice('exclure='.length);
	return liste ? liste.split(' ').sort() : [];
}

// ============================================================================
// Tests
// ============================================================================

beforeEach(() => depot());

afterEach(() => {
	if (racine && racine.startsWith(realpathSync(tmpdir())))
		rmSync(racine, { recursive: true, force: true });
});

describe('ci-integration-exclusions', () => {
	it('PR de code : les tests marqués sont laissés de côté, pas le test de règles d’accès', () => {
		pr({ 'src/lib/server/a.ts': 'export const a = 1;\n' });
		expect(exclus()).toEqual([TEST_A, TEST_B]);
	});

	it('un test marqué que la PR modifie tourne', () => {
		pr({ 'src/app.ts': 'export const b = 2;\n', [TEST_A]: `${testMarque(MIGRATION_A)}// +\n` });
		expect(exclus()).toEqual([TEST_B]);
	});

	it('un test marqué que la PR ajoute tourne', () => {
		const neuf = 'tests/integration/questions-c-rangement-tags.test.ts';
		const migration = 'supabase/migrations/20261121090000_questions_c_rangement_tags.sql';
		pr({ [neuf]: testMarque(migration), [migration]: 'update public.x set y = 1;\n' });
		expect(exclus()).toEqual([TEST_A, TEST_B]);
	});

	it('un test marqué dont la PR modifie la migration tourne (chemin relatif compris)', () => {
		pr({ [MIGRATION_B]: 'update public.question_templates set node_id = gen_random_uuid();\n' });
		expect(exclus()).toEqual([TEST_A]);
	});

	it('migration de rangement d’un autre lot : seuls ses tests tournent, les autres restent de côté', () => {
		const migration = 'supabase/migrations/20261121090000_questions_c_rangement_tags.sql';
		pr({ [migration]: 'update public.x set y = 1;\n' });
		expect(exclus()).toEqual([TEST_A, TEST_B]);
	});

	it('outillage, schéma ou règle elle-même : aucun test laissé de côté', () => {
		for (const f of [
			'supabase/migrations/20261121090000_garde_tags_noeud.sql',
			'supabase/config.toml',
			'supabase/seed.sql',
			'tests/integration/fixtures/rangements.json',
			'tests/integration/global-setup.ts',
			'vitest.integration.config.ts',
			'vitest.base.config.ts',
			'scripts/with-db-lock.sh',
			'pnpm-lock.yaml',
			'tests/helpers/database/migration-rollback.ts',
			'tests/helpers/database/prod-copies.ts',
			'scripts/lib/migrations-de-donnees.ts',
			'scripts/ci-integration-exclusions.sh'
		]) {
			depot();
			pr({ [f]: '// modifié\n' });
			expect(exclus(), f).toEqual([]);
		}
	});

	it('hors PR (nuit, lancement à la main) : aucun test laissé de côté', () => {
		pr({ 'src/app.ts': 'export const b = 2;\n' });
		expect(exclus({ GITHUB_EVENT_NAME: 'schedule' })).toEqual([]);
		expect(exclus({ GITHUB_EVENT_NAME: 'workflow_dispatch' })).toEqual([]);
	});

	it('pas un commit de merge : aucun test laissé de côté', () => {
		ecrire('src/app.ts', 'export const c = 3;\n');
		git('commit', '-q', '-m', 'direct');
		expect(exclus()).toEqual([]);
	});
});
