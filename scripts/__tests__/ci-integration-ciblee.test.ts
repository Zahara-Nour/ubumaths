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
