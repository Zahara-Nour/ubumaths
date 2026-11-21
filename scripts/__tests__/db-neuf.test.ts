/**
 * `pnpm db:neuf` : la base de dev remise à neuf en une commande
 * ==============================================================
 *
 * Efface la base de dev, la reconstruit (migrations + seeds), puis la remplit avec le contenu de
 * la prod et les élèves fictifs (`db:seed-riche`), sous le verrou `supabase` d'un bout à l'autre
 * (docs/wip/base-locale-progress.md § 14).
 *
 * Ce qui est gardé ici, avec une fausse CLI et un faux `tsx` qui notent leurs appels :
 * - rien n'est effacé sans confirmation, ni quand la prod est injoignable, ni quand une autre
 *   commande tient le verrou ;
 * - l'ordre : vérifier la prod, démarrer la pile, reconstruire, remplir ;
 * - un échec dit dans quel état il laisse la base.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
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
import { join, resolve } from 'node:path';

const SCRIPT = resolve(__dirname, '../db-neuf.sh');
const VERROU = resolve(__dirname, '../lib/lock.py');

// Fausse CLI Supabase : note la commande (sans `--workdir <dossier>`), échoue sur demande.
const FAUSSE_CLI = `#!/bin/bash
shift 2
echo "supabase $*" >> "$JOURNAL"
[ "$*" = "start" ] && exit "\${CODE_START:-0}"
[ "$*" = "db reset" ] && exit "\${CODE_RESET:-0}"
exit 0
`;

// Faux tsx : note le script lancé (nom court) et ses arguments, échoue sur demande.
const FAUX_TSX = `#!/bin/bash
script="$(basename "$(dirname "$1")")/$(basename "$1")"
shift
echo "tsx $script $*" >> "$JOURNAL"
[ "$*" = "--verifier-prod" ] && exit "\${CODE_VERIF:-0}"
exit "\${CODE_SEED:-0}"
`;

let racine: string;
let journal: string;

function lancer(args: string[], env: Record<string, string> = {}) {
	const r = spawnSync('bash', [SCRIPT, ...args], {
		cwd: racine,
		env: { ...process.env, JOURNAL: journal, ...env },
		encoding: 'utf8',
		input: ''
	});
	return { status: r.status, sortie: r.stdout + r.stderr };
}

function appels(): string[] {
	return existsSync(journal) ? readFileSync(journal, 'utf8').trim().split('\n') : [];
}

beforeEach(() => {
	racine = realpathSync(mkdtempSync(join(tmpdir(), 'db-neuf-')));
	journal = join(racine, 'journal.txt');
	// Un dépôt git à lui : son verrou `supabase` n'est pas celui du vrai dépôt.
	spawnSync('git', ['init', '-q'], { cwd: racine });
	mkdirSync(join(racine, 'supabase'));
	mkdirSync(join(racine, 'node_modules/.bin'), { recursive: true });
	writeFileSync(join(racine, 'supabase/config.toml'), 'project_id = "factice"');
	writeFileSync(join(racine, 'node_modules/.bin/supabase'), FAUSSE_CLI);
	writeFileSync(join(racine, 'node_modules/.bin/tsx'), FAUX_TSX);
	chmodSync(join(racine, 'node_modules/.bin/supabase'), 0o755);
	chmodSync(join(racine, 'node_modules/.bin/tsx'), 0o755);
});

afterEach(() => {
	rmSync(racine, { recursive: true, force: true });
});

describe('db-neuf.sh', () => {
	it('vérifie la prod, démarre la pile, reconstruit, puis remplit, dans cet ordre', () => {
		const r = lancer(['--oui']);
		expect(r.status, r.sortie).toBe(0);
		expect(appels()).toEqual([
			'tsx db-seed-riche/index.ts --verifier-prod',
			'supabase start',
			'supabase db reset',
			'tsx db-seed-riche/index.ts'
		]);
		expect(r.sortie).toMatch(/remise à neuf en \d+ s/);
	});

	it('sans --oui et sans terminal : refuse, rien n’est lancé', () => {
		const r = lancer([]);
		expect(r.status).toBe(1);
		expect(r.sortie).toMatch(/--oui/);
		expect(appels()).toEqual([]);
	});

	it('prod injoignable : s’arrête avant d’effacer', () => {
		const r = lancer(['--oui'], { CODE_VERIF: '1' });
		expect(r.status).toBe(1);
		expect(r.sortie).toMatch(/rien n’est effacé/i);
		expect(appels()).toEqual(['tsx db-seed-riche/index.ts --verifier-prod']);
	});

	it('pile qui ne démarre pas : s’arrête avant d’effacer', () => {
		const r = lancer(['--oui'], { CODE_START: '1' });
		expect(r.status).toBe(1);
		expect(r.sortie).toMatch(/rien n’est effacé/i);
		expect(appels()).not.toContain('supabase db reset');
	});

	it('reconstruction en échec : le dit, ne remplit pas', () => {
		const r = lancer(['--oui'], { CODE_RESET: '1' });
		expect(r.status).toBe(1);
		expect(r.sortie).toMatch(/reconstruction/i);
		expect(r.sortie).toMatch(/pnpm db:neuf/);
		expect(appels().at(-1)).toBe('supabase db reset');
	});

	it('remplissage en échec : dit que la base est reconstruite sans le contenu de la prod', () => {
		const r = lancer(['--oui'], { CODE_SEED: '1' });
		expect(r.status).toBe(1);
		expect(r.sortie).toMatch(/pnpm db:seed-riche/);
		expect(r.sortie).not.toMatch(/remise à neuf en/);
	});

	it('verrou tenu par une autre commande : exit 2, rien n’est lancé', async () => {
		const pret = join(racine, 'pret');
		const autre = spawn(
			'python3',
			[VERROU, 'supabase', 'Une autre commande', '--', 'bash', '-c', `touch "${pret}"; sleep 30`],
			{ cwd: racine, stdio: 'ignore' }
		);
		try {
			for (let i = 0; i < 100 && !existsSync(pret); i++) {
				await new Promise((ok) => setTimeout(ok, 50));
			}
			expect(existsSync(pret)).toBe(true);
			const r = lancer(['--oui']);
			expect(r.status).toBe(2);
			expect(r.sortie).toMatch(/tourne déjà/);
			expect(appels()).toEqual([]);
		} finally {
			autre.kill('SIGKILL');
		}
	});

	it('le verrou est tenu pendant tout le travail', () => {
		// Le faux tsx du remplissage regarde si le verrou est tenu (par son propre lanceur).
		writeFileSync(
			join(racine, 'node_modules/.bin/tsx'),
			`#!/bin/bash\npython3 "${VERROU}" --tenu supabase < /dev/null && echo "tenu $2" >> "$JOURNAL"\nexit 0\n`
		);
		lancer(['--oui']);
		expect(appels()).toContain('tenu --verifier-prod');
	});

	it('refuse un argument inconnu', () => {
		const r = lancer(['--force']);
		expect(r.status).toBe(1);
		expect(r.sortie).toMatch(/usage/);
		expect(appels()).toEqual([]);
	});

	it('refuse hors de la racine du dépôt', () => {
		rmSync(join(racine, 'supabase/config.toml'));
		const r = lancer(['--oui']);
		expect(r.status).toBe(1);
		expect(r.sortie).toMatch(/racine du dépôt/);
		expect(appels()).toEqual([]);
	});
});
