/**
 * La garde de rejeu de `check:incremental`
 * ========================================
 *
 * Le script rejoue le dernier verdict quand « rien n'a changé », pour ne pas
 * payer ~10 min de typecheck pour rien. Ce qui est gardé ici : **un changement
 * qui peut modifier le verdict déclenche un vrai passage**.
 *
 * Le 2026-09-24, une correction de `vitest.base.config.ts` (importé par
 * `vite.config.ts`, donc vérifié) a été rejouée avec l'ANCIENNE erreur : la
 * garde ne surveillait pas les configs de la racine. Un rejeu ressemble
 * exactement à un résultat frais — l'échec est silencieux.
 *
 * On lance le vrai script dans un dépôt jetable (son propre `git init`, donc
 * son propre verrou) ; `npx` et `docker` sont des bouchons, et un compteur dit
 * si svelte-check a réellement tourné.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
	mkdtempSync,
	mkdirSync,
	writeFileSync,
	readFileSync,
	rmSync,
	utimesSync,
	chmodSync,
	existsSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SCRIPT = resolve(__dirname, '../check-incremental.sh');

let dir: string;

/** Nombre de vrais passages de svelte-check (le bouchon incrémente un compteur). */
function passages(): number {
	const f = join(dir, 'passages');
	return existsSync(f) ? Number(readFileSync(f, 'utf8').trim()) : 0;
}

function lancer() {
	const r = spawnSync('bash', [SCRIPT], {
		cwd: dir,
		env: { ...process.env, PATH: `${join(dir, 'bin')}:${process.env.PATH}`, FORCE: '', FRESH: '' },
		encoding: 'utf8'
	});
	return { status: r.status, sortie: `${r.stdout}${r.stderr}` };
}

/** Date un fichier ou dossier dans le futur : plus récent que le marqueur, sans dépendre de la seconde courante. */
function vieillirVersLeFutur(chemin: string) {
	const futur = new Date(Date.now() + 60_000);
	utimesSync(chemin, futur, futur);
}

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), 'check-incremental-'));
	spawnSync('git', ['init', '-q'], { cwd: dir });
	mkdirSync(join(dir, 'src/lib'), { recursive: true });
	writeFileSync(join(dir, 'src/lib/a.ts'), 'export const a = 1;\n');
	writeFileSync(join(dir, 'src/lib/b.ts'), 'export const b = 2;\n');
	writeFileSync(join(dir, 'vite.config.ts'), "import './vitest.base.config';\n");
	writeFileSync(join(dir, 'vitest.base.config.ts'), 'export {};\n');
	writeFileSync(join(dir, 'package.json'), '{}\n');
	writeFileSync(join(dir, 'pnpm-lock.yaml'), "lockfileVersion: '9.0'\n");
	writeFileSync(join(dir, '.env'), 'PUBLIC_X=1\n');
	mkdirSync(join(dir, '.svelte-kit'), { recursive: true });
	writeFileSync(join(dir, '.svelte-kit/tsconfig.json'), '{}\n');

	const bin = join(dir, 'bin');
	mkdirSync(bin);
	// Bouchon npx : `svelte-kit sync` ne fait rien ; svelte-check compte son passage.
	writeFileSync(
		join(bin, 'npx'),
		`#!/bin/bash
if [ "$1" = "svelte-check" ]; then
	n=$(cat "${dir}/passages" 2>/dev/null || echo 0)
	echo $((n + 1)) > "${dir}/passages"
	echo "1 COMPLETED 3 FILES 0 ERRORS 0 WARNINGS"
fi
exit 0
`
	);
	// Bouchon docker : aucune pile Supabase, et pas d'appel au vrai démon.
	writeFileSync(join(bin, 'docker'), '#!/bin/bash\nexit 0\n');
	chmodSync(join(bin, 'npx'), 0o755);
	chmodSync(join(bin, 'docker'), 0o755);

	// Premier passage : pose le marqueur et le verdict à rejouer.
	lancer();
	expect(passages()).toBe(1);
});

afterEach(() => {
	rmSync(dir, { recursive: true, force: true });
});

describe('check:incremental — garde de rejeu', () => {
	it('rejoue quand rien n’a changé (la garde sert encore)', () => {
		const r = lancer();
		expect(r.sortie).toContain('REJOUÉ');
		expect(passages()).toBe(1);
	});

	it('refait un passage quand une source de src/ change', () => {
		vieillirVersLeFutur(join(dir, 'src/lib/a.ts'));
		lancer();
		expect(passages()).toBe(2);
	});

	it('refait un passage quand une config de la racine importée par vite.config.ts change', () => {
		vieillirVersLeFutur(join(dir, 'vitest.base.config.ts'));
		const r = lancer();
		expect(r.sortie).not.toContain('REJOUÉ');
		expect(passages()).toBe(2);
	});

	it('refait un passage quand un fichier de src/ est SUPPRIMÉ', () => {
		rmSync(join(dir, 'src/lib/b.ts'));
		vieillirVersLeFutur(join(dir, 'src/lib'));
		const r = lancer();
		expect(r.sortie).not.toContain('REJOUÉ');
		expect(passages()).toBe(2);
	});

	it('refait un passage quand le lockfile change (dépendances mises à jour)', () => {
		vieillirVersLeFutur(join(dir, 'pnpm-lock.yaml'));
		lancer();
		expect(passages()).toBe(2);
	});

	it('refait un passage quand un .env change (types de $env)', () => {
		vieillirVersLeFutur(join(dir, '.env'));
		lancer();
		expect(passages()).toBe(2);
	});
});
