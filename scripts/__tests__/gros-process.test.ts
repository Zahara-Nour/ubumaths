/**
 * Un seul gros process à la fois — `scripts/gros-process.sh`
 * ==========================================================
 *
 * `pnpm check`, `pnpm build` et `pnpm lint` passent sous le même verrou noyau
 * que `check:incremental` (scripts/lib/lock.py). Gardé ici :
 * - un second gros process sort en exit 2 tant que le premier tourne ;
 * - en CI et sur Vercel, aucun verrou : la commande passe directement.
 *
 * Joué dans un dépôt git JETABLE : le verrou vit dans son répertoire git
 * commun, il ne touche donc jamais celui des sessions en cours.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const SCRIPTS = resolve(__dirname, '..');
let depot: string;

function env(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
	const e: NodeJS.ProcessEnv = {
		...process.env,
		HOME: depot,
		GIT_CONFIG_NOSYSTEM: '1',
		GIT_CEILING_DIRECTORIES: dirname(depot),
		...extra
	};
	delete e.CI;
	delete e.VERCEL;
	return { ...e, ...extra };
}

beforeEach(() => {
	depot = realpathSync(mkdtempSync(join(tmpdir(), 'gros-process-')));
	mkdirSync(join(depot, 'scripts/lib'), { recursive: true });
	copyFileSync(join(SCRIPTS, 'gros-process.sh'), join(depot, 'scripts/gros-process.sh'));
	copyFileSync(join(SCRIPTS, 'lib/lock.py'), join(depot, 'scripts/lib/lock.py'));
	spawnSync('git', ['init', '-q'], { cwd: depot, env: env() });
});

afterEach(() => {
	rmSync(depot, { recursive: true, force: true });
});

const lancer = (extra?: Record<string, string>) =>
	spawnSync('bash', ['scripts/gros-process.sh', 'Un essai', 'true'], {
		cwd: depot,
		env: env(extra),
		encoding: 'utf8'
	});

describe('gros-process.sh', () => {
	it('seul, il lance la commande', () => {
		expect(lancer().status).toBe(0);
	});

	it('un second gros process est refusé (exit 2) tant que le premier tourne', async () => {
		const premier = spawn('bash', ['scripts/gros-process.sh', 'Un premier', 'sleep', '3'], {
			cwd: depot,
			env: env()
		});
		await new Promise((r) => setTimeout(r, 700));
		const second = lancer();
		premier.kill();
		expect(second.status, second.stderr).toBe(2);
	});

	it('en CI ou sur Vercel, pas de verrou', async () => {
		const premier = spawn('bash', ['scripts/gros-process.sh', 'Un premier', 'sleep', '3'], {
			cwd: depot,
			env: env()
		});
		await new Promise((r) => setTimeout(r, 700));
		const enCi = lancer({ CI: 'true' });
		const surVercel = lancer({ VERCEL: '1' });
		premier.kill();
		expect(enCi.status).toBe(0);
		expect(surVercel.status).toBe(0);
	});
});
