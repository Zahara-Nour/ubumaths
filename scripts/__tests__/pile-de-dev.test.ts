/**
 * La pile Supabase de DEV démarre avec les versions de la CI
 * ==========================================================
 *
 * `supabase link` écrit dans `supabase/.temp/` les versions des services de la prod
 * (`postgres-version`, `rest-version`, `storage-version`…), et la CLI les impose ensuite à la
 * pile locale. La CI et les worktrees n'ont pas ce dossier : le dépôt principal tournait donc sur
 * d'autres images qu'eux (docs/archive/wip/base-locale-progress.md § 3.2).
 *
 * `scripts/pile-de-dev.sh` lance la CLI sur un dossier de travail qui montre tout `supabase/`
 * sauf `.temp` : la CLI prend ses versions par défaut, celles de la CI. `supabase/.temp/` n'est
 * pas touché (`pnpm db:migrate` y lit `project-ref`).
 *
 * Gardé ici, avec une fausse CLI qui raconte ce qu'elle voit.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
	chmodSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	realpathSync,
	renameSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SCRIPT = resolve(__dirname, '../pile-de-dev.sh');

// La fausse CLI : écrit ses arguments, puis ce qu'elle lit dans son dossier de travail.
const FAUSSE_CLI = `#!/bin/bash
echo "ARGS:$*"
[ "$1" = "--workdir" ] || exit 9
d="$2/supabase"
echo "CONFIG:$(cat "$d/config.toml")"
echo "MIGRATIONS:$(ls "$d/migrations" | tr '\\n' ' ')"
echo "SEED:$(cat "$d/seed/dev.sql")"
[ -e "$d/.temp/rest-version" ] && echo "VERSION-IMPOSEE:$(cat "$d/.temp/rest-version")"
[ -e "$d/.temp/project-ref" ] && echo "PROJET-LIE"
[ -e "$d/.branches" ] && echo "BRANCHES"
echo "ENTREES:$(ls -A "$d" | tr '\\n' ' ')"
[ -L "$d/.temp" ] && echo "TEMP-EST-UN-LIEN"
# La vraie CLI écrit dans son .temp (cli-latest…) : ça ne doit pas atterrir dans le dépôt.
mkdir -p "$d/.temp" && echo trace > "$d/.temp/cli-latest"
exit "\${CODE:-0}"
`;

let base: string;
let racine: string;

function lancer(args: string[], env: Record<string, string> = {}) {
	const r = spawnSync('bash', [SCRIPT, ...args], {
		cwd: racine,
		env: { ...process.env, ...env },
		encoding: 'utf8'
	});
	return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

beforeEach(() => {
	base = realpathSync(mkdtempSync(join(tmpdir(), 'pile-de-dev-')));
	racine = base;
	mkdirSync(join(racine, 'supabase/.temp'), { recursive: true });
	mkdirSync(join(racine, 'supabase/.branches'));
	mkdirSync(join(racine, 'supabase/migrations'));
	mkdirSync(join(racine, 'supabase/seed'));
	mkdirSync(join(racine, 'node_modules/.bin'), { recursive: true });
	writeFileSync(join(racine, 'supabase/config.toml'), 'project_id = "factice"');
	writeFileSync(join(racine, 'supabase/migrations/20260101000000_a.sql'), 'select 1;');
	writeFileSync(join(racine, 'supabase/seed/dev.sql'), 'select 2;');
	writeFileSync(join(racine, 'supabase/.temp/rest-version'), 'v14.5');
	writeFileSync(join(racine, 'supabase/.temp/project-ref'), 'abcdefghijklmnopqrst');
	writeFileSync(join(racine, 'node_modules/.bin/supabase'), FAUSSE_CLI);
	chmodSync(join(racine, 'node_modules/.bin/supabase'), 0o755);
});

afterEach(() => {
	rmSync(base, { recursive: true, force: true });
});

describe('pile-de-dev.sh', () => {
	it('la CLI voit la configuration, les migrations et les seeds de la branche', () => {
		const r = lancer(['start']);
		expect(r.status, r.stderr).toBe(0);
		expect(r.stdout).toContain('CONFIG:project_id = "factice"');
		expect(r.stdout).toContain('MIGRATIONS:20260101000000_a.sql');
		expect(r.stdout).toContain('SEED:select 2;');
	});

	it('la CLI ne voit ni les versions de la prod ni le projet lié', () => {
		const r = lancer(['start']);
		expect(r.stdout).not.toContain('VERSION-IMPOSEE');
		expect(r.stdout).not.toContain('PROJET-LIE');
		expect(r.stdout).not.toContain('BRANCHES');
	});

	it('supabase/.temp du dépôt reste tel quel', () => {
		lancer(['start']);
		expect(readFileSync(join(racine, 'supabase/.temp/rest-version'), 'utf8')).toBe('v14.5');
		expect(readFileSync(join(racine, 'supabase/.temp/project-ref'), 'utf8')).toBe(
			'abcdefghijklmnopqrst'
		);
		expect(existsSync(join(racine, 'supabase/.temp/cli-latest'))).toBe(false);
	});

	it('une migration ajoutée après un premier lancement est vue au suivant', () => {
		lancer(['start']);
		writeFileSync(join(racine, 'supabase/migrations/20260102000000_b.sql'), 'select 3;');
		const r = lancer(['db', 'reset']);
		expect(r.stdout).toContain('20260101000000_a.sql 20260102000000_b.sql');
	});

	it('un fichier retiré de supabase/ disparaît du miroir au lancement suivant', () => {
		writeFileSync(join(racine, 'supabase/ancien.sql'), 'select 4;');
		expect(lancer(['start']).stdout).toMatch(/ENTREES:.*ancien\.sql/);
		rmSync(join(racine, 'supabase/ancien.sql'));
		const r = lancer(['start']);
		expect(r.status, r.stderr).toBe(0);
		expect(r.stdout).not.toMatch(/ENTREES:.*ancien\.sql/);
		// Rien d'autre que le miroir dans le dossier de travail : pas de construction abandonnée.
		expect(readdirSync(join(racine, 'node_modules/.cache/pile-de-dev'))).toEqual(['supabase']);
	});

	it('les fichiers cachés de supabase/ sont montrés, sauf .temp et .branches', () => {
		writeFileSync(join(racine, 'supabase/.gitignore'), '.temp');
		const r = lancer(['start']);
		expect(r.stdout).toMatch(/ENTREES:.*\.gitignore/);
		expect(r.stdout).not.toContain('TEMP-EST-UN-LIEN');
	});

	it('marche dans un dossier dont le chemin contient une espace', () => {
		const avecEspace = join(racine, 'mon depot');
		mkdirSync(avecEspace);
		renameSync(join(racine, 'supabase'), join(avecEspace, 'supabase'));
		renameSync(join(racine, 'node_modules'), join(avecEspace, 'node_modules'));
		racine = avecEspace;
		const r = lancer(['start']);
		expect(r.status, r.stderr).toBe(0);
		expect(r.stdout).toContain('MIGRATIONS:20260101000000_a.sql');
		expect(r.stdout).not.toContain('VERSION-IMPOSEE');
	});

	it('refuse sans CLI installée, avant de construire quoi que ce soit', () => {
		rmSync(join(racine, 'node_modules/.bin/supabase'));
		const r = lancer(['start']);
		expect(r.status).toBe(1);
		expect(r.stderr).toMatch(/pnpm install/);
		expect(existsSync(join(racine, 'node_modules/.cache'))).toBe(false);
	});

	it('passe les arguments tels quels et rend le code de sortie de la CLI', () => {
		const r = lancer(['db', 'reset', '--debug'], { CODE: '3' });
		expect(r.stdout).toMatch(/^ARGS:--workdir \S+ db reset --debug$/m);
		expect(r.status).toBe(3);
	});

	it('refuse hors de la racine du dépôt', () => {
		rmSync(join(racine, 'supabase/config.toml'));
		const r = lancer(['start']);
		expect(r.status).toBe(1);
		expect(r.stderr).toMatch(/racine du dépôt/);
	});

	it('refuse sans commande', () => {
		const r = lancer([]);
		expect(r.status).toBe(1);
		expect(r.stderr).toMatch(/usage/);
	});
});
