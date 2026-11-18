/**
 * Quels fichiers ESLint relit-il en CI ? (quality.yml, job `Lint`)
 * ===============================================================
 *
 * `scripts/ci-lint-fichiers.sh` rend, pour une PR (commit de merge), les fichiers de
 * code qu'elle ajoute ou modifie ; `.` (tout l'arbre) si elle touche la config ESLint,
 * les dépendances ou ce qui décide des fichiers ignorés, et hors PR.
 *
 * Dépôt jetable : git ne tourne jamais hors du dossier temporaire.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';

const SCRIPT = resolve(__dirname, '../ci-lint-fichiers.sh');

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
	git('add', '-f', fichier);
}

// Composants déjà sur main, qui importent des modules (règle svelte/no-unused-props :
// le type des props peut venir d'un .ts importé).
function initialiser(): void {
	git('init', '-q', '-b', 'main');
	ecrire('src/app.ts');
	ecrire('src/vieux.ts');
	ecrire('src/lib/types/carte.ts');
	ecrire('src/lib/ui/bouton/index.ts');
	ecrire(
		'src/lib/Carte.svelte',
		'<script lang="ts">import type { P } from \'#lib/types/carte.ts\';</script>\n'
	);
	ecrire(
		'src/lib/Voisin.svelte',
		'<script lang="ts">import type { P } from \'./types/carte\';</script>\n'
	);
	ecrire(
		'src/lib/Bouton.svelte',
		'<script lang="ts">import { B } from \'#lib/ui/bouton/index.ts\';</script>\n'
	);
	ecrire('src/lib/Vieux.svelte', '<script lang="ts">import { v } from \'../vieux.ts\';</script>\n');
	ecrire('src/lib/Seul.svelte', '<p>rien</p>\n');
	ecrire('src/lib/etat.svelte.ts');
	ecrire(
		'src/lib/Etat.svelte',
		'<script lang="ts">import { e } from \'#lib/etat.svelte.ts\';</script>\n'
	);
	git('commit', '-q', '-m', 'init');
}

/** Une PR qui change `fichiers`, mergée dans main par un commit de merge (comme la CI). */
function pr(fichiers: string[], supprimes: string[] = []): void {
	git('switch', '-q', '-c', 'feat/x');
	for (const f of fichiers) ecrire(f, `${f} (PR)\n`);
	for (const f of supprimes) git('rm', '-q', f);
	git('commit', '-q', '-m', 'pr');
	git('switch', '-q', 'main');
	ecrire('src/autre-chose-sur-main.ts');
	git('commit', '-q', '-m', 'main avance');
	git('merge', '-q', '--no-ff', '-m', 'merge', 'feat/x');
}

function liste(extra: NodeJS.ProcessEnv = {}): string[] {
	const r = spawnSync('bash', [SCRIPT], { cwd: racine, env: env(extra), encoding: 'utf8' });
	expect(r.status).toBe(0);
	return r.stdout.split('\n').filter(Boolean);
}

beforeEach(() => {
	racine = realpathSync(mkdtempSync(join(tmpdir(), 'ci-lint-')));
	if (!racine || racine === sep) throw new Error('dossier jetable invalide');
	initialiser();
});

afterEach(() => {
	if (racine && racine.startsWith(realpathSync(tmpdir())))
		rmSync(racine, { recursive: true, force: true });
});

describe('ci-lint-fichiers', () => {
	it('PR de code : ses fichiers de code, ni supprimés ni ceux de main', () => {
		pr(['src/a.ts', 'src/B.svelte', 'scripts/c.mjs', 'docs/d.md', 'src/e.json']);
		expect(liste().sort()).toEqual(['scripts/c.mjs', 'src/B.svelte', 'src/a.ts']);
	});

	it('module modifié ou supprimé : les .svelte qui l’importent, pas les autres', () => {
		pr(
			['src/lib/types/carte.ts', 'src/lib/ui/bouton/index.ts', 'src/lib/etat.svelte.ts'],
			['src/vieux.ts']
		);
		expect(liste().sort()).toEqual([
			'src/lib/Bouton.svelte',
			'src/lib/Carte.svelte',
			'src/lib/Etat.svelte',
			'src/lib/Vieux.svelte',
			'src/lib/Voisin.svelte',
			'src/lib/etat.svelte.ts',
			'src/lib/types/carte.ts',
			'src/lib/ui/bouton/index.ts'
		]);
	});

	it('chemin accentué : sorti tel quel', () => {
		pr(['src/lib/données.ts']);
		expect(liste()).toEqual(['src/lib/données.ts']);
	});

	it('PR sans code : rien à relire', () => {
		pr(['docs/a.md', 'scripts/questions/lot/01.json']);
		expect(liste()).toEqual([]);
	});

	it('config ESLint, règle maison, dépendances, ignores, tsconfig : tout l’arbre', () => {
		for (const f of [
			'eslint.config.js',
			'eslint.fast.config.js',
			'eslint-rules/require-zod-validation.js',
			'package.json',
			'pnpm-lock.yaml',
			'.gitignore',
			'svelte.config.js',
			'vite.config.ts',
			'tsconfig.json',
			'src/app.d.ts',
			'.nvmrc'
		]) {
			rmSync(racine, { recursive: true, force: true });
			mkdirSync(racine);
			initialiser();
			pr(['src/a.ts', f]);
			expect(liste(), f).toEqual(['.']);
		}
	});

	it('hors PR (push, nuit) ou sans commit de merge : tout l’arbre', () => {
		pr(['src/a.ts']);
		expect(liste({ GITHUB_EVENT_NAME: 'push' })).toEqual(['.']);
		ecrire('src/b.ts');
		git('commit', '-q', '-m', 'commit simple');
		expect(liste()).toEqual(['.']);
	});
});
