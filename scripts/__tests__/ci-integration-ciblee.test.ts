/**
 * La PR n'ajoute-t-elle qu'une migration de données et son test ? (nightly-integration.yml)
 * =========================================================================================
 *
 * `scripts/ci-integration-ciblee.sh` rend `fichiers=<tests de la PR>` seulement pour une PR
 * (commit de merge) qui ajoute des migrations, ajoute ou modifie des tests d'intégration à la
 * racine de tests/integration/, et ne touche sinon que du contenu ou de la doc. Dans tous les
 * autres cas : `fichiers=` (suite complète).
 *
 * Dépôt jetable : git ne tourne jamais hors du dossier temporaire.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';

const SCRIPT = resolve(__dirname, '../ci-integration-ciblee.sh');
const MIGRATION = 'supabase/migrations/20261120120749_questions_x_rangement_tags.sql';
const TEST = 'tests/integration/questions-x-rangement-tags.test.ts';
const MIGRATION_CONTENU = 'supabase/migrations/20261120130500_questions_x_contenu.sql';
const FIXTURE_CONTENU =
	'tests/integration/fixtures/contenu-publie/20261120130500_questions_x_contenu.json';
const TEST_CONTENU = 'tests/integration/migrations-contenu-publie.test.ts';
const FIXTURE_RANGEMENT =
	'tests/integration/fixtures/rangement-tags/20261120120749_questions_x_rangement_tags.json';
const TEST_RANGEMENT = 'tests/integration/migrations-rangement-tags.test.ts';

let racine: string;

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

function ecrire(fichier: string, contenu = `${fichier}\n`): void {
	mkdirSync(join(racine, dirname(fichier)), { recursive: true });
	writeFileSync(join(racine, fichier), contenu);
	git('add', fichier);
}

/** Dépôt neuf : main porte déjà `existants`. */
function depot(...existants: string[]): void {
	if (racine && racine.startsWith(realpathSync(tmpdir())))
		rmSync(racine, { recursive: true, force: true });
	racine = realpathSync(mkdtempSync(join(tmpdir(), 'ci-integ-')));
	if (!racine || racine === sep) throw new Error('dossier jetable invalide');
	git('init', '-q', '-b', 'main');
	ecrire('src/app.ts');
	for (const f of existants) ecrire(f);
	git('commit', '-q', '-m', 'init');
}

/** Une PR qui écrit `fichiers` (ajout ou modification), mergée dans main par un commit de merge. */
function pr(...fichiers: string[]): void {
	git('switch', '-q', '-c', 'feat/x');
	for (const f of fichiers) ecrire(f, `${f} modifié\n`);
	git('commit', '-q', '-m', 'pr');
	git('switch', '-q', 'main');
	ecrire('autre-chose-sur-main.txt');
	git('commit', '-q', '-m', 'main avance');
	git('merge', '-q', '--no-ff', '-m', 'merge', 'feat/x');
}

function verdict(extra: NodeJS.ProcessEnv = {}): string {
	const r = spawnSync('bash', [SCRIPT], { cwd: racine, env: env(extra), encoding: 'utf8' });
	expect(r.status).toBe(0);
	return r.stdout.trim();
}

beforeEach(() => depot());

afterEach(() => {
	if (racine && racine.startsWith(realpathSync(tmpdir())))
		rmSync(racine, { recursive: true, force: true });
});

describe('ci-integration-ciblee', () => {
	it('migration ajoutée, son test, les JSON du lot et le journal : seulement ce test', () => {
		pr(
			MIGRATION,
			TEST,
			'scripts/questions/2de-lot/01-a.json',
			'docs/wip/lot-progress.md',
			'docs/wip/questions-2de/lot.py'
		);
		expect(verdict()).toBe(`fichiers=${TEST}`);
	});

	it('un test d’intégration existant modifié compte aussi', () => {
		depot(TEST);
		pr(MIGRATION, TEST);
		expect(verdict()).toBe(`fichiers=${TEST}`);
	});

	it('une migration existante modifiée : suite complète', () => {
		depot(MIGRATION);
		pr(MIGRATION, TEST);
		expect(verdict()).toBe('fichiers=');
	});

	it('du code, de l’outillage de la suite ou une dépendance : suite complète', () => {
		for (const f of [
			'src/lib/server/a.ts',
			'tests/integration/helpers/a.ts',
			'tests/integration/database/a.test.ts',
			'tests/helpers/database/prod-copies.ts',
			'supabase/config.toml',
			'supabase/seed/a.sql',
			'scripts/questions/page-a-cocher.ts',
			'package.json',
			'.github/workflows/nightly-integration.yml'
		]) {
			depot();
			pr(MIGRATION, TEST, f);
			expect(verdict(), f).toBe('fichiers=');
		}
	});

	it('migration de contenu de publiés et sa fixture : le test qui rejoue les fixtures', () => {
		pr(MIGRATION_CONTENU, FIXTURE_CONTENU, 'scripts/questions/2de-lot/01-a.json');
		expect(verdict()).toBe(`fichiers=${TEST_CONTENU}`);
	});

	it('rangement et contenu dans la même PR : les deux tests, chacun une fois', () => {
		pr(MIGRATION, TEST, MIGRATION_CONTENU, FIXTURE_CONTENU, TEST_CONTENU);
		expect(verdict()).toBe(`fichiers=${TEST_CONTENU} ${TEST}`);
	});

	it('fixture de contenu ou migration de contenu existantes modifiées : suite complète', () => {
		depot(FIXTURE_CONTENU);
		pr(MIGRATION_CONTENU, FIXTURE_CONTENU);
		expect(verdict()).toBe('fichiers=');
		depot(MIGRATION_CONTENU);
		pr(MIGRATION_CONTENU, FIXTURE_CONTENU);
		expect(verdict()).toBe('fichiers=');
	});

	it('migration de contenu sans fixture ni test : suite complète', () => {
		pr(MIGRATION_CONTENU);
		expect(verdict()).toBe('fichiers=');
	});

	it('deux migrations de contenu, une seule fixture : suite complète', () => {
		pr(
			MIGRATION_CONTENU,
			FIXTURE_CONTENU,
			'supabase/migrations/20261120130600_questions_y_contenu.sql'
		);
		expect(verdict()).toBe('fichiers=');
	});

	it('migration de rangement générée et sa fixture, sans test propre : le test qui rejoue les fixtures', () => {
		pr(MIGRATION, FIXTURE_RANGEMENT, 'scripts/questions/6e-lot/01-a.json');
		expect(verdict()).toBe(`fichiers=${TEST_RANGEMENT}`);
	});

	it('rangement généré et contenu dans la même PR : les deux tests qui rejouent les fixtures', () => {
		pr(MIGRATION, FIXTURE_RANGEMENT, MIGRATION_CONTENU, FIXTURE_CONTENU);
		expect(verdict()).toBe(`fichiers=${TEST_CONTENU} ${TEST_RANGEMENT}`);
	});

	it('fixture de rangement sans sa migration, ou au nom d’une autre : suite complète', () => {
		pr(FIXTURE_RANGEMENT, TEST);
		expect(verdict()).toBe('fichiers=');
		depot();
		pr('supabase/migrations/20261120120800_questions_y_rangement_tags.sql', FIXTURE_RANGEMENT);
		expect(verdict()).toBe('fichiers=');
	});

	it('rangement généré avec sa fixture, plus un rangement écrit à la main sans test : suite complète', () => {
		const aLaMain = 'supabase/migrations/20261120120800_questions_y_rangement_tags.sql';
		pr(MIGRATION, FIXTURE_RANGEMENT, aLaMain);
		expect(verdict()).toBe('fichiers=');
		depot();
		pr(MIGRATION, FIXTURE_RANGEMENT, aLaMain, TEST);
		expect(verdict()).toBe(`fichiers=${TEST} ${TEST_RANGEMENT}`);
	});

	it('fixture de rangement existante modifiée : suite complète', () => {
		depot(FIXTURE_RANGEMENT);
		pr(MIGRATION, FIXTURE_RANGEMENT);
		expect(verdict()).toBe('fichiers=');
	});

	it('migration finissant par _contenu.sql mais pas au nom du générateur : suite complète', () => {
		pr('supabase/migrations/20261120130600_rls_chat_contenu.sql', FIXTURE_CONTENU, TEST);
		expect(verdict()).toBe('fichiers=');
	});

	it('une migration qui n’est pas un rangement (règles d’accès, schéma) : suite complète', () => {
		pr('supabase/migrations/20261120130000_rls_chat_messages.sql', TEST);
		expect(verdict()).toBe('fichiers=');
	});

	it('une migration sans test d’intégration : suite complète', () => {
		pr(MIGRATION, 'docs/a.md');
		expect(verdict()).toBe('fichiers=');
	});

	it('hors PR (cron, push) ou sans commit de merge : suite complète', () => {
		pr(MIGRATION, TEST);
		expect(verdict({ GITHUB_EVENT_NAME: 'schedule' })).toBe('fichiers=');
		ecrire('docs/b.md');
		git('commit', '-q', '-m', 'commit simple');
		expect(verdict()).toBe('fichiers=');
	});
});
