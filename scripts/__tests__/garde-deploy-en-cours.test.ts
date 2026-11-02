/**
 * Hooks git : rien sur main pendant `pnpm deploy:prod`
 * =====================================================
 *
 * `scripts/garde-deploy-en-cours.sh`, appelé par les hooks pre-commit et
 * pre-push, refuse un commit sur main et un push vers main tant que le verrou
 * « deploy » est tenu. Le hook Claude (`.claude/hooks/garde-commandes.py`) ne
 * juge une commande qu'à son lancement et ne voit que ses formes écrites
 * (`git push`) : une commande lancée juste avant le verrou, `bash -c "git
 * push"` ou un script qui pousse passaient (diagnostic du 2026-11-01). Les
 * hooks git, eux, tournent au moment du commit ou du push, quelle qu'en soit
 * la forme. Gardé ici :
 * - verrou tenu : commit sur main refusé, push vers main refusé, même depuis un
 *   worktree ; les branches de chantier passent ;
 * - le script de mise en prod lui-même (DEPLOY_PROD_SOUS_VERROU) passe : il
 *   commite et pousse la version sous le verrou ;
 * - verrou libre, ou jamais posé : tout passe ;
 * - de bout en bout, par de vrais `git commit` / `git push` ;
 * - les hooks husky appellent bien la garde.
 *
 * Dépôts jetables (un dépôt nu tient lieu de GitHub) : git ne tourne jamais
 * hors du dossier temporaire.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import {
	chmodSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';

const SCRIPT = resolve(__dirname, '../garde-deploy-en-cours.sh');
const LOCK = resolve(__dirname, '../lib/lock.py');
const HUSKY = resolve(__dirname, '../../.husky');

let racine: string;
let github: string;
let principal: string;
let chantier: string;
let numero = 0;

function env(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
	const base: NodeJS.ProcessEnv = {
		...process.env,
		HOME: racine,
		XDG_CONFIG_HOME: racine,
		GIT_CONFIG_NOSYSTEM: '1',
		GIT_CEILING_DIRECTORIES: dirname(racine),
		GIT_AUTHOR_NAME: 'test',
		GIT_AUTHOR_EMAIL: 'test@example.com',
		GIT_COMMITTER_NAME: 'test',
		GIT_COMMITTER_EMAIL: 'test@example.com'
	};
	// La CI pose CI=true, et une mise en prod en cours pourrait poser la variable
	delete base.CI;
	delete base.DEPLOY_PROD_SOUS_VERROU;
	return { ...base, ...extra };
}

function dansLeBac(cwd: string): string {
	const reel = realpathSync(cwd);
	if (!reel.startsWith(racine + sep)) throw new Error(`hors du dossier jetable : « ${cwd} »`);
	return reel;
}

function git(cwd: string, args: string[], extra: NodeJS.ProcessEnv = {}) {
	const r = spawnSync('git', args, { cwd: dansLeBac(cwd), env: env(extra), encoding: 'utf8' });
	return { status: r.status, sortie: `${r.stdout}${r.stderr}` };
}

function gitOk(cwd: string, ...args: string[]): void {
	const r = git(cwd, args);
	if (r.status !== 0) throw new Error(`git ${args.join(' ')} → ${r.status}\n${r.sortie}`);
}

function garde(cwd: string, mode: string, entree = '', extra: NodeJS.ProcessEnv = {}) {
	const r = spawnSync('bash', [SCRIPT, mode], {
		cwd: dansLeBac(cwd),
		env: env(extra),
		input: entree,
		encoding: 'utf8'
	});
	return { status: r.status, sortie: `${r.stdout}${r.stderr}` };
}

/** Une ligne de l'entrée standard de pre-push, pour une ref distante. */
const pousse = (ref: string) => `refs/heads/x ${'a'.repeat(40)} ${ref} ${'0'.repeat(40)}\n`;

/** Un fichier modifié et indexé, prêt à être commité. */
function preparer(cwd: string): void {
	writeFileSync(join(cwd, 'f.md'), `${++numero}\n`);
	gitOk(cwd, 'add', 'f.md');
}

let detenteur: ChildProcess | undefined;

async function tenirLeVerrou(): Promise<void> {
	detenteur = spawn('python3', [LOCK, 'deploy', 'pnpm deploy:prod', '--', 'sleep', '60'], {
		cwd: principal,
		env: env(),
		stdio: 'ignore'
	});
	// Le détenteur écrit son PID une fois le verrou acquis
	const fichier = join(principal, '.git', '.locks', 'deploy');
	for (let i = 0; i < 100; i++) {
		if (existsSync(fichier) && readFileSync(fichier, 'utf8').trim()) return;
		await new Promise((r) => setTimeout(r, 50));
	}
	throw new Error('verrou jamais acquis');
}

async function relacher(): Promise<void> {
	if (detenteur && detenteur.exitCode === null) {
		const fini = new Promise((r) => detenteur?.once('exit', r));
		detenteur.kill('SIGKILL');
		await fini;
	}
	detenteur = undefined;
}

beforeAll(() => {
	racine = realpathSync(mkdtempSync(join(tmpdir(), 'garde-deploy-')));
	if (!racine || racine === sep) throw new Error('dossier jetable invalide');
	github = join(racine, 'github.git');
	principal = join(racine, 'principal');
	chantier = join(racine, 'chantier');
	mkdirSync(github);
	mkdirSync(principal);
	gitOk(github, 'init', '-q', '--bare', '-b', 'main');
	gitOk(principal, 'init', '-q', '-b', 'main');
	gitOk(principal, 'remote', 'add', 'origin', `file://${github}`);
	writeFileSync(join(principal, 'a.md'), 'a\n');
	gitOk(principal, 'add', 'a.md');
	gitOk(principal, 'commit', '-q', '-m', 'init');
	gitOk(principal, 'push', '-q', 'origin', 'main');
	gitOk(principal, 'worktree', 'add', '-q', '-b', 'feat/x', chantier);
	// Hooks git réduits à la garde, appelée comme dans .husky/
	const hooks = join(racine, 'hooks');
	mkdirSync(hooks);
	writeFileSync(join(hooks, 'pre-commit'), `#!/bin/bash\nbash ${SCRIPT} commit\n`);
	writeFileSync(join(hooks, 'pre-push'), `#!/bin/bash\nbash ${SCRIPT} push\n`);
	chmodSync(join(hooks, 'pre-commit'), 0o755);
	chmodSync(join(hooks, 'pre-push'), 0o755);
	gitOk(principal, 'config', 'core.hooksPath', hooks);
});

afterAll(async () => {
	await relacher();
	if (racine && racine.startsWith(realpathSync(tmpdir())))
		rmSync(racine, { recursive: true, force: true });
});

describe('garde-deploy-en-cours — verrou « deploy » tenu', () => {
	beforeAll(tenirLeVerrou);
	afterAll(relacher);

	it('commit sur main refusé, avec la raison', () => {
		const r = garde(principal, 'commit');
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('pnpm deploy:prod est en cours');
	});

	it('push vers main refusé, même depuis un worktree', () => {
		expect(garde(principal, 'push', pousse('refs/heads/main')).status).toBe(1);
		expect(garde(chantier, 'push', pousse('refs/heads/main')).status).toBe(1);
	});

	it('le travail sur les branches passe', () => {
		expect(garde(chantier, 'commit').status).toBe(0);
		expect(garde(chantier, 'push', pousse('refs/heads/feat/x')).status).toBe(0);
		expect(garde(principal, 'push', pousse('refs/heads/feat/x')).status).toBe(0);
	});

	it('le script de mise en prod lui-même passe (commit et push de la version)', () => {
		const sous = { DEPLOY_PROD_SOUS_VERROU: '1' };
		expect(garde(principal, 'commit', '', sous).status).toBe(0);
		expect(garde(principal, 'push', pousse('refs/heads/main'), sous).status).toBe(0);
	});

	it('de bout en bout : vrais git commit et git push', () => {
		preparer(principal);
		const commit = git(principal, ['commit', '-q', '-m', 'docs: x']);
		expect(commit.status, commit.sortie).not.toBe(0);
		expect(commit.sortie).toContain('pnpm deploy:prod est en cours');
		// Ce que fait deploy-prod.sh : commit et push sous la variable héritée
		const sous = { DEPLOY_PROD_SOUS_VERROU: '1' };
		expect(git(principal, ['commit', '-q', '-m', 'chore(release): 0.1.0'], sous).status).toBe(0);
		const refuse = git(principal, ['push', '-q', 'origin', 'main']);
		expect(refuse.status, refuse.sortie).not.toBe(0);
		expect(git(principal, ['push', '-q', 'origin', 'main'], sous).status).toBe(0);
		// Depuis un worktree, `bash -c` comme forme cachée : le hook git la voit quand même
		const cache = spawnSync('bash', ['-c', 'git push -q origin HEAD:main'], {
			cwd: dansLeBac(chantier),
			env: env(),
			encoding: 'utf8'
		});
		expect(cache.status, cache.stderr).not.toBe(0);
		expect(git(chantier, ['push', '-q', 'origin', 'feat/x']).status).toBe(0);
	});
});

describe('garde-deploy-en-cours — verrou libre', () => {
	it('tout passe', () => {
		expect(garde(principal, 'commit').status).toBe(0);
		expect(garde(principal, 'push', pousse('refs/heads/main')).status).toBe(0);
		preparer(principal);
		expect(git(principal, ['commit', '-q', '-m', 'docs: y']).status).toBe(0);
		expect(git(principal, ['push', '-q', 'origin', 'main']).status).toBe(0);
	});

	it('mode inconnu : refusé', () => {
		expect(garde(principal, 'autre').status).toBe(1);
	});
});

describe('garde-deploy-en-cours — branchée dans les hooks husky', () => {
	it('pre-commit et pre-push l’appellent en premier', () => {
		const premiere = (f: string) =>
			readFileSync(join(HUSKY, f), 'utf8')
				.split('\n')
				.find((l) => l.trim() && !l.startsWith('#'));
		expect(premiere('pre-commit')).toBe('bash scripts/garde-deploy-en-cours.sh commit');
		expect(premiere('pre-push')).toBe('bash scripts/garde-deploy-en-cours.sh push');
	});
});
