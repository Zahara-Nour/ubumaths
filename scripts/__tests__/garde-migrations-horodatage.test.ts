/**
 * Garde des horodatages de migration, contre origin/main relu au moment même
 * ==========================================================================
 *
 * `scripts/garde-migrations-horodatage.sh` (hook pre-push, et `--pr <n>` juste avant
 * `gh pr merge`) refuse une migration neuve dont l'horodatage est déjà pris sur
 * origin/main, ou plus ancien que la dernière migration de main (incident du
 * 2026-11-01 : `20261101215000` pris par deux lots, PR verte sur un main périmé,
 * main cassée pour toutes les PR). Gardé ici :
 * - aucune migration neuve, ou une plus récente que main → passe ;
 * - horodatage déjà pris sur origin/main (poussé par une autre session) → refusé ;
 * - plus ancienne que la dernière de main → refusé ;
 * - deux migrations neuves au même horodatage → refusé ;
 * - doublon déjà sur main, sans rapport avec la branche → passe ;
 * - `--pr <n>` : lit la tête de la PR sur origin (refs/pull/<n>/head) ;
 * - sans origin → passe, avec un avertissement ;
 * - `--prochain` : heure réelle UTC, ou dernière migration + 1 à 59 s tirées au hasard si main est
 *   en avance (deux sessions lancées ensemble ne reçoivent plus le même nombre), en vraie heure :
 *   jamais de seconde 60, passage à la minute, au jour, à l'année.
 *
 * Dépôts jetables (un dépôt nu tient lieu de GitHub) : git ne tourne jamais
 * hors du dossier temporaire.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';

const SCRIPT = resolve(__dirname, '../garde-migrations-horodatage.sh');

let racine: string;
let github: string;
let moi: string;
let autre: string;

function env(): NodeJS.ProcessEnv {
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
	delete base.CI;
	return base;
}

function dansLeBac(cwd: string): string {
	const reel = realpathSync(cwd);
	if (reel !== racine && !reel.startsWith(racine + sep))
		throw new Error(`hors du dossier jetable : « ${cwd} »`);
	return reel;
}

function git(cwd: string, ...args: string[]): void {
	const r = spawnSync('git', args, { cwd: dansLeBac(cwd), env: env(), encoding: 'utf8' });
	if (r.status !== 0) throw new Error(`git ${args.join(' ')} → ${r.status}\n${r.stderr}`);
}

function migration(cwd: string, nom: string): void {
	mkdirSync(join(cwd, 'supabase/migrations'), { recursive: true });
	writeFileSync(join(cwd, 'supabase/migrations', nom), 'select 1;\n');
	git(cwd, 'add', `supabase/migrations/${nom}`);
	git(cwd, 'commit', '-q', '-m', nom);
}

/** `--prochain` : l'horodatage à donner, vérifié au format AAAAMMJJHHMMSS. */
function prochain(cwd: string): string {
	const r = spawnSync('bash', [SCRIPT, '--prochain'], {
		cwd: dansLeBac(cwd),
		env: env(),
		encoding: 'utf8'
	});
	if (r.status !== 0) throw new Error(`--prochain → ${r.status}\n${r.stderr}`);
	const v = r.stdout.trim();
	if (!/^\d{14}$/.test(v)) throw new Error(`--prochain : « ${v} » n'est pas AAAAMMJJHHMMSS`);
	return v;
}

function garde(cwd: string, ...args: string[]) {
	const r = spawnSync('bash', [SCRIPT, ...args], {
		cwd: dansLeBac(cwd),
		env: env(),
		encoding: 'utf8'
	});
	return { status: r.status, stderr: r.stderr };
}

beforeEach(() => {
	racine = realpathSync(mkdtempSync(join(tmpdir(), 'garde-migrations-')));
	if (!racine || racine === sep) throw new Error('dossier jetable invalide');
	github = join(racine, 'github.git');
	moi = join(racine, 'moi');
	autre = join(racine, 'autre');
	mkdirSync(github);
	git(github, 'init', '-q', '--bare', '-b', 'main');
	mkdirSync(moi);
	git(moi, 'init', '-q', '-b', 'main');
	git(moi, 'remote', 'add', 'origin', github);
	migration(moi, '20261101100000_socle.sql');
	git(moi, 'push', '-q', 'origin', 'main');
	git(racine, 'clone', '-q', github, autre);
	git(moi, 'switch', '-q', '-c', 'feat/moi');
});

afterEach(() => {
	if (racine && racine.startsWith(realpathSync(tmpdir())))
		rmSync(racine, { recursive: true, force: true });
});

describe('garde-migrations-horodatage', () => {
	it('aucune migration neuve, ou une plus récente que main : passe', () => {
		expect(garde(moi).status).toBe(0);
		migration(moi, '20261101120000_lot_a.sql');
		expect(garde(moi).status).toBe(0);
	});

	it('horodatage pris sur origin/main par une autre session : refusé', () => {
		migration(moi, '20261101215000_lot_a.sql');
		migration(autre, '20261101215000_lot_b.sql');
		git(autre, 'push', '-q', 'origin', 'main');
		const r = garde(moi);
		expect(r.status).toBe(1);
		expect(r.stderr).toMatch(
			/20261101215000 est déjà pris sur origin\/main par 20261101215000_lot_b\.sql/
		);
		expect(r.stderr).toMatch(/pnpm migration:horodatage/);
	});

	it('plus ancienne que la dernière migration de main : refusé', () => {
		migration(moi, '20261101120000_lot_a.sql');
		migration(autre, '20261101130000_lot_b.sql');
		git(autre, 'push', '-q', 'origin', 'main');
		const r = garde(moi);
		expect(r.status).toBe(1);
		expect(r.stderr).toMatch(/plus ancien que la dernière migration de main \(20261101130000\)/);
	});

	it('deux migrations neuves au même horodatage : refusé', () => {
		migration(moi, '20261101120000_lot_a.sql');
		migration(moi, '20261101120000_lot_a_bis.sql');
		const r = garde(moi);
		expect(r.status).toBe(1);
		expect(r.stderr).toMatch(/plusieurs migrations de la branche/);
	});

	it('doublon déjà sur main, sans rapport avec la branche : passe', () => {
		migration(autre, '20261101130000_lot_b.sql');
		migration(autre, '20261101130000_lot_c.sql');
		git(autre, 'push', '-q', 'origin', 'main');
		git(moi, 'fetch', '-q', 'origin');
		git(moi, 'merge', '-q', 'origin/main');
		expect(garde(moi).status).toBe(0);
	});

	it('--pr <n> : lit la tête de la PR sur origin', () => {
		migration(moi, '20261101215000_lot_a.sql');
		git(moi, 'push', '-q', 'origin', 'HEAD:refs/pull/7/head');
		git(moi, 'switch', '-q', 'main');
		expect(garde(moi, '--pr', '7').status).toBe(0);
		migration(autre, '20261101215000_lot_b.sql');
		git(autre, 'push', '-q', 'origin', 'main');
		expect(garde(moi, '--pr', '7').status).toBe(1);
		expect(garde(moi, '--pr', '8').status).toBe(2);
		expect(garde(moi, '--pr', 'abc').status).toBe(2);
	});

	it('sans origin : passe, avec un avertissement', () => {
		migration(moi, '20261101215000_lot_a.sql');
		git(moi, 'remote', 'remove', 'origin');
		const r = garde(moi);
		expect(r.status).toBe(0);
		expect(r.stderr).toMatch(/injoignable/);
	});

	it('sans origin, en CI : refusé (la garde est la porte de la CI)', () => {
		migration(moi, '20261101215000_lot_a.sql');
		git(moi, 'remote', 'remove', 'origin');
		const r = spawnSync('bash', [SCRIPT], {
			cwd: moi,
			env: { ...env(), CI: 'true' },
			encoding: 'utf8'
		});
		expect(r.status).toBe(1);
		expect(r.stderr).toMatch(/porte fermée/);
	});

	it('--prochain : heure réelle UTC quand main est dans le passé', () => {
		const r = spawnSync('bash', [SCRIPT, '--prochain'], { cwd: moi, env: env(), encoding: 'utf8' });
		expect(r.status).toBe(0);
		const v = r.stdout.trim();
		expect(v).toMatch(/^\d{14}$/);
		expect(v > '20261101100000').toBe(true);
	});

	it('--prochain : dernière migration + 1 à 59 s quand main est en avance sur l’horloge', () => {
		migration(autre, '29991231230000_futur.sql');
		git(autre, 'push', '-q', 'origin', 'main');
		const v = prochain(moi);
		expect(v > '29991231230000' && v <= '29991231230059').toBe(true);
		migration(moi, `${v}_lot_a.sql`);
		expect(garde(moi).status).toBe(0);
	});

	it('--prochain en avance : tiré au hasard, deux sessions ne reçoivent pas toujours le même nombre', () => {
		migration(autre, '29991231230000_futur.sql');
		git(autre, 'push', '-q', 'origin', 'main');
		const tirages = new Set(Array.from({ length: 12 }, () => prochain(moi)));
		expect(tirages.size).toBeGreaterThan(1);
	});

	it('--prochain en avance : vraie heure, jamais de seconde 60 (passage à l’année)', () => {
		migration(autre, '29991231235959_futur.sql');
		git(autre, 'push', '-q', 'origin', 'main');
		for (let i = 0; i < 8; i++) {
			const v = prochain(moi);
			expect(v).toMatch(/^300001010000[0-5]\d$/);
			expect(v <= '30000101000058').toBe(true);
		}
	});
});
