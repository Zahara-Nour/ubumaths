/**
 * Le hook garde-commandes.py et le main PARTAGÉ du dépôt principal
 * ================================================================
 *
 * Toutes les sessions commitent la doc dans le même dépôt principal : son
 * `main`, et son index, sont partagés. Le 2026-10-13, des commits republiés par
 * un autre chemin puis un `git pull --no-rebase` ont fait diverger main et
 * bloqué `pnpm deploy:prod`. Gardé ici :
 * - sur main : pull qui fusionne, merge non fast-forward, `git add -A` / `.`,
 *   `git commit -a` refusés ; leurs variantes sûres passent ;
 * - sur une branche de chantier, rien de tout ça n'est refusé ;
 * - le dossier est suivi à travers `cd` et `git -C` ;
 * - pendant un deploy:prod (verrou « deploy » tenu), `gh pr merge` et les
 *   commits / pushes vers main sont refusés, même depuis un worktree ; le verrou
 *   relâché, ils passent.
 *
 * Dépôts jetables : git ne tourne jamais hors du dossier temporaire.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';

const HOOK = resolve(__dirname, '../../.claude/hooks/garde-commandes.py');
const LOCK = resolve(__dirname, '../lib/lock.py');

let racine: string;
let principal: string;
let chantier: string;

function env(): NodeJS.ProcessEnv {
	return {
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
}

function git(cwd: string, ...args: string[]): void {
	const reel = realpathSync(cwd);
	if (!reel.startsWith(racine + sep)) throw new Error(`hors du dossier jetable : « ${cwd} »`);
	const r = spawnSync('git', args, { cwd: reel, env: env(), encoding: 'utf8' });
	if (r.status !== 0) throw new Error(`git ${args.join(' ')} → ${r.status}\n${r.stderr}`);
}

function hook(command: string, cwd: string) {
	const r = spawnSync('python3', [HOOK], {
		input: JSON.stringify({ tool_name: 'Bash', tool_input: { command }, cwd }),
		env: env(),
		encoding: 'utf8'
	});
	return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

const refuse = (command: string, cwd: string, motif: RegExp) => {
	const r = hook(command, cwd);
	expect(r.status, `${command}\n${r.stderr}`).toBe(2);
	expect(r.stderr).toMatch(motif);
};

const passe = (command: string, cwd: string) => {
	const r = hook(command, cwd);
	expect(r.status, `${command}\n${r.stderr}`).toBe(0);
	expect(r.stdout).toBe('');
};

beforeAll(() => {
	racine = realpathSync(mkdtempSync(join(tmpdir(), 'garde-main-')));
	if (!racine || racine === sep) throw new Error('dossier jetable invalide');
	principal = join(racine, 'principal');
	chantier = join(racine, 'chantier');
	spawnSync('mkdir', [principal]);
	git(principal, 'init', '-q', '-b', 'main');
	writeFileSync(join(principal, 'a.md'), 'a\n');
	git(principal, 'add', 'a.md');
	git(principal, 'commit', '-q', '-m', 'init');
	git(principal, 'worktree', 'add', '-q', '-b', 'feat/x', chantier);
});

afterAll(() => {
	if (racine && racine.startsWith(realpathSync(tmpdir())))
		rmSync(racine, { recursive: true, force: true });
});

describe('main partagé — refusé sur main', () => {
	it('un pull qui fusionne', () => {
		refuse('git pull', principal, /pull --rebase/);
		refuse('git pull origin main', principal, /pull --rebase/);
		refuse('git pull -q --no-rebase origin main', principal, /pull --rebase/);
	});

	it('un merge qui crée un commit', () => {
		refuse('git merge origin/main', principal, /--ff-only/);
		refuse('git merge --no-edit origin/main', principal, /--ff-only/);
	});

	it("tout l'index ou tout l'arbre", () => {
		refuse('git add -A', principal, /index est partagé/);
		refuse('git add --all', principal, /index est partagé/);
		refuse('git add .', principal, /index est partagé/);
		refuse('git commit -a -m "doc"', principal, /commit -a/);
		refuse('git commit -am "doc"', principal, /commit -a/);
		refuse('git commit --all -m "doc"', principal, /commit -a/);
	});

	it('à travers cd et git -C, chemins entre guillemets et ~ compris', () => {
		refuse('cd principal && git add -A', racine, /index est partagé/);
		refuse('git -C principal pull', racine, /pull --rebase/);
		refuse(`cd "${principal}" && git add -A`, chantier, /index est partagé/);
		refuse(`git -C "${principal}" add -A`, chantier, /index est partagé/);
		refuse('git -C ~/principal add -A', chantier, /index est partagé/);
		refuse('(cd principal && git add -A)', racine, /index est partagé/);
	});

	it('avec des options globales avant le verbe', () => {
		refuse('git -c core.editor=true commit -a -m "doc"', principal, /commit -a/);
		refuse('git --no-pager commit -am "doc"', principal, /commit -a/);
	});

	it('git add -u, sans chemin', () => {
		refuse('git add -u', principal, /index est partagé/);
	});
});

describe('main partagé — passe', () => {
	it('les variantes sûres sur main', () => {
		passe('git pull --rebase', principal);
		passe('git pull -q --rebase origin main', principal);
		passe('git pull --ff-only', principal);
		passe('git merge --ff-only origin/main', principal);
		passe('git merge --abort', principal);
		passe('git add docs/x.md docs/y.md', principal);
		passe('git commit -m "doc" -- docs/x.md', principal);
		passe('git commit --amend --no-edit', principal);
		passe('git push origin main', principal);
		passe('git add -A docs/mon-sujet/', principal);
		passe('git merge --continue', principal);
	});

	it("un chemin entre guillemets vers un worktree n'est pas main", () => {
		passe(`cd "${chantier}" && git add -A`, principal);
	});

	it("le corps d'un heredoc n'est pas une commande", () => {
		passe("git commit -F - <<'EOF'\ndocs: avant, git pull pour synchroniser\nEOF", principal);
	});

	it('tout, sur une branche de chantier', () => {
		passe('git pull', chantier);
		passe('git merge origin/main', chantier);
		passe('git add -A', chantier);
		passe('git commit -am "wip"', chantier);
		passe('gh pr merge 12 --merge', chantier);
	});
});

describe('main partagé — pendant un deploy:prod (verrou « deploy »)', () => {
	let detenteur: ChildProcess | undefined;

	beforeAll(async () => {
		detenteur = spawn('python3', [LOCK, 'deploy', 'pnpm deploy:prod', '--', 'sleep', '60'], {
			cwd: principal,
			env: env(),
			stdio: 'ignore'
		});
		// Le détenteur écrit son PID dans le fichier une fois le verrou acquis
		const fichier = join(principal, '.git', '.locks', 'deploy');
		for (let i = 0; i < 100; i++) {
			if (existsSync(fichier) && spawnSync('cat', [fichier], { encoding: 'utf8' }).stdout.trim())
				break;
			await new Promise((r) => setTimeout(r, 50));
		}
	});

	afterAll(() => {
		detenteur?.kill('SIGKILL');
	});

	it('refuse merge de PR, commit et push vers main, même depuis un worktree', () => {
		refuse('gh pr merge 12 --merge', chantier, /deploy:prod/);
		refuse('gh pr merge 12 --merge', principal, /deploy:prod/);
		refuse('git commit -m "doc" -- docs/x.md', principal, /deploy:prod/);
		refuse('git push origin main', principal, /deploy:prod/);
		refuse('git push origin HEAD:main', chantier, /deploy:prod/);
	});

	it('laisse passer le travail sur les branches', () => {
		passe('git commit -m "wip"', chantier);
		passe('git push -u origin feat/x', chantier);
		passe('git push origin feat/x', principal);
		passe('pnpm deploy:prod --essai', principal);
	});

	it('le verrou relâché, tout repasse', async () => {
		if (detenteur && detenteur.exitCode === null) {
			const fini = new Promise((r) => detenteur?.once('exit', r));
			detenteur.kill('SIGKILL');
			await fini;
		}
		passe('gh pr merge 12 --merge', chantier);
		passe('git push origin main', principal);
	});
});
