/**
 * La PR ne touche-t-elle que du contenu ? (quality.yml, job `version`)
 * ===================================================================
 *
 * `scripts/ci-nature-changement.sh` dit `contenu=true` seulement pour une PR (commit de
 * merge) qui ne change que des modèles de questions JSON, de la doc ou des `.md` hors
 * `src/`, `static/`, `data/`. Dans tous les autres cas : `contenu=false` (CI complète).
 *
 * Dépôt jetable : git ne tourne jamais hors du dossier temporaire.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';

const SCRIPT = resolve(__dirname, '../ci-nature-changement.sh');

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

function ecrire(fichier: string): void {
	mkdirSync(join(racine, dirname(fichier)), { recursive: true });
	writeFileSync(join(racine, fichier), `${fichier}\n`);
	git('add', fichier);
}

/** Une PR qui change `fichiers`, mergée dans main par un commit de merge (comme la CI). */
function pr(...fichiers: string[]): void {
	git('switch', '-q', '-c', 'feat/x');
	for (const f of fichiers) ecrire(f);
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

beforeEach(() => {
	racine = realpathSync(mkdtempSync(join(tmpdir(), 'ci-nature-')));
	if (!racine || racine === sep) throw new Error('dossier jetable invalide');
	git('init', '-q', '-b', 'main');
	ecrire('src/app.ts');
	git('commit', '-q', '-m', 'init');
});

afterEach(() => {
	if (racine && racine.startsWith(realpathSync(tmpdir())))
		rmSync(racine, { recursive: true, force: true });
});

describe('ci-nature-changement', () => {
	it('modèles JSON, journal et script générateur : contenu', () => {
		pr(
			'scripts/questions/1spe-probas/01-partition.json',
			'docs/wip/questions-1spe-progress.md',
			'docs/wip/questions/lot-1spe-probas.py'
		);
		expect(verdict()).toBe('contenu=true');
	});

	it('une migration, un script .ts, du code ou du contenu servi : CI complète', () => {
		for (const f of [
			'supabase/migrations/20261101220001_x.sql',
			'scripts/questions/page-a-cocher.ts',
			'src/lib/server/shtam/articles/a.md',
			'static/programmes/a.md',
			'data/corrections/a.md',
			'package.json'
		]) {
			rmSync(racine, { recursive: true, force: true });
			mkdirSync(racine);
			git('init', '-q', '-b', 'main');
			ecrire('src/app.ts');
			git('commit', '-q', '-m', 'init');
			pr('scripts/questions/lot/01.json', f);
			expect(verdict(), f).toBe('contenu=false');
		}
	});

	it('hors PR (push sur main) ou sans commit de merge : CI complète', () => {
		pr('docs/a.md');
		expect(verdict({ GITHUB_EVENT_NAME: 'push' })).toBe('contenu=false');
		ecrire('docs/b.md');
		git('commit', '-q', '-m', 'commit simple');
		expect(verdict()).toBe('contenu=false');
	});
});
