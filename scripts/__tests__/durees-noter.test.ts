/**
 * Le journal des durées du Mac mini — `scripts/durees/noter.sh` et `chrono.mjs`
 * ===========================================================================
 *
 * `check:incremental`, les tests, le pre-push et `pnpm pr:merger` notent leur
 * durée pour `pnpm durees`. Gardé ici :
 * - une ligne `date;phase;secondes` par commande verte ;
 * - une commande rouge n'est pas une mesure, et son code de sortie est rendu tel quel ;
 * - une commande lancée avec des arguments (un fichier de test, une option) n'a
 *   pas tout joué : elle tourne, sans être notée ;
 * - rien n'est noté en CI ni sur Vercel, ni depuis un test (vitest) : le journal
 *   est celui du Mac mini, pas d'un runner ni d'un décor ;
 * - un journal impossible à écrire ne fait jamais échouer la commande ;
 * - l'enveloppe tuée seule (SIGTERM) emporte sa commande : pas de vitest orphelin.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import {
	existsSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const NOTER = resolve(__dirname, '../durees/noter.sh');
const CHRONO = resolve(__dirname, '../durees/chrono.mjs');

let racine: string;

/** L'environnement d'un poste : ni CI, ni Vercel, ni vitest, et un HOME jetable. */
function env(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
	const e: NodeJS.ProcessEnv = { ...process.env, HOME: racine };
	for (const nom of ['CI', 'GITHUB_ACTIONS', 'VERCEL', 'VITEST', 'DUREES_ETAT']) delete e[nom];
	return { ...e, ...extra };
}

function lancer(script: string, args: string[], extra?: Record<string, string>) {
	const r = spawnSync(script.endsWith('.mjs') ? process.execPath : 'bash', [script, ...args], {
		cwd: racine,
		env: env(extra),
		encoding: 'utf8'
	});
	return { status: r.status, sortie: `${r.stdout}${r.stderr}` };
}

function journal(dossier = join(racine, '.local/state/durees')): string[] {
	const fichier = join(dossier, 'local.csv');
	return existsSync(fichier) ? readFileSync(fichier, 'utf8').split('\n').filter(Boolean) : [];
}

const debut = (ilYA: number) => String(Math.floor(Date.now() / 1000) - ilYA);

beforeEach(() => {
	racine = realpathSync(mkdtempSync(join(tmpdir(), 'durees-noter-')));
});

afterEach(() => {
	rmSync(racine, { recursive: true, force: true });
});

describe('noter.sh', () => {
	it('ajoute une ligne date;phase;secondes au journal du poste', () => {
		expect(lancer(NOTER, ['pre-push', debut(42)]).status).toBe(0);
		expect(lancer(NOTER, ['check-incremental', debut(18)]).status).toBe(0);
		const lignes = journal();
		expect(lignes).toHaveLength(2);
		expect(lignes[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z;pre-push;4[2-4]$/);
		expect(lignes[1]).toMatch(/;check-incremental;(1[89]|20)$/);
	});

	it('écrit dans le dossier donné par DUREES_ETAT', () => {
		const ailleurs = join(racine, 'ailleurs');
		lancer(NOTER, ['pre-push', debut(30)], { DUREES_ETAT: ailleurs });
		expect(journal(ailleurs)).toHaveLength(1);
		expect(journal()).toHaveLength(0);
	});

	it.each(['CI', 'GITHUB_ACTIONS', 'VERCEL', 'VITEST'])('ne note rien quand %s est posé', (nom) => {
		expect(lancer(NOTER, ['pre-push', debut(30)], { [nom]: 'true' }).status).toBe(0);
		expect(journal()).toHaveLength(0);
	});

	it('refuse en silence une phase ou un début mal écrits, sans rien noter', () => {
		expect(lancer(NOTER, ['Pas Une Phase', debut(30)]).status).toBe(0);
		expect(lancer(NOTER, ['pre-push', 'hier']).status).toBe(0);
		expect(lancer(NOTER, ['pre-push;9999', debut(30)]).status).toBe(0);
		expect(lancer(NOTER, []).status).toBe(0);
		expect(journal()).toHaveLength(0);
	});

	it('un journal impossible à écrire ne fait pas échouer', () => {
		// Un FICHIER à la place du dossier : `mkdir -p` échoue.
		writeFileSync(join(racine, 'pas-un-dossier'), '');
		const r = lancer(NOTER, ['pre-push', debut(30)], {
			DUREES_ETAT: join(racine, 'pas-un-dossier/durees')
		});
		expect(r.status).toBe(0);
		expect(r.sortie).toBe('');
	});
});

describe('chrono.mjs', () => {
	it('note la commande verte lancée sans argument', () => {
		const r = lancer(CHRONO, ['test-server', 'echo', 'tout', '--']);
		expect(r.status).toBe(0);
		expect(r.sortie).toBe('tout\n');
		expect(journal()).toHaveLength(1);
		expect(journal()[0]).toMatch(/;test-server;[0-2]$/);
	});

	it('lance la commande avec ses arguments, sans la noter : elle n’a pas tout joué', () => {
		const r = lancer(CHRONO, [
			'test-server',
			'echo',
			'tout',
			'--',
			'un/fichier.test.ts',
			'-t',
			'x'
		]);
		expect(r.status).toBe(0);
		expect(r.sortie).toBe('tout un/fichier.test.ts -t x\n');
		expect(journal()).toHaveLength(0);
	});

	it('rend le code de sortie d’une commande rouge, sans la noter', () => {
		expect(lancer(CHRONO, ['test-server', 'bash', '-c', 'exit 3', '--']).status).toBe(3);
		expect(lancer(CHRONO, ['test-server', 'bash', '-c', 'exit 2', '--']).status).toBe(2);
		expect(journal()).toHaveLength(0);
	});

	it('en CI, lance la commande telle quelle', () => {
		const r = lancer(CHRONO, ['test-server', 'echo', 'tout', '--'], { GITHUB_ACTIONS: 'true' });
		expect(r.status).toBe(0);
		expect(r.sortie).toBe('tout\n');
		expect(journal()).toHaveLength(0);
	});

	it('sans séparateur, toute la ligne est la commande', () => {
		const r = lancer(CHRONO, ['test-server', 'echo', 'tout']);
		expect(r.sortie).toBe('tout\n');
		expect(journal()).toHaveLength(1);
	});

	it('tuée seule par SIGTERM, elle emporte sa commande et ne note rien', async () => {
		const pidFile = join(racine, 'pid');
		const enveloppe = spawn(
			process.execPath,
			[CHRONO, 'test-server', 'bash', '-c', `echo $$ > ${pidFile}; exec sleep 30`, '--'],
			{ cwd: racine, env: env(), stdio: 'ignore' }
		);
		const fin = new Promise<number | null>((r) => enveloppe.on('exit', (code) => r(code)));
		while (!existsSync(pidFile) || readFileSync(pidFile, 'utf8').trim() === '')
			await new Promise((r) => setTimeout(r, 20));
		const pid = Number(readFileSync(pidFile, 'utf8').trim());
		enveloppe.kill('SIGTERM');
		expect(await fin).toBe(128 + 15);
		const vivante = () => {
			try {
				process.kill(pid, 0);
				return true;
			} catch {
				return false;
			}
		};
		for (let i = 0; i < 50 && vivante(); i++) await new Promise((r) => setTimeout(r, 20));
		expect(vivante()).toBe(false);
		expect(journal()).toHaveLength(0);
	});

	it('commande introuvable : 127', () => {
		expect(lancer(CHRONO, ['test-server', 'commande-qui-n-existe-pas', '--']).status).toBe(127);
		expect(journal()).toHaveLength(0);
	});
});
