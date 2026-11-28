/**
 * Clé du cache Prettier en CI (scripts/ci-cle-prettier.sh)
 * ========================================================
 *
 * La clé nomme les versions installées de Prettier, de ses deux plugins et de
 * Tailwind : une montée de l'un d'eux doit changer la clé (le cache de Prettier
 * ne voit pas la version d'un plugin), une autre dépendance ne doit pas la changer.
 * Les plugins de `.prettierrc` doivent tous y être : en ajouter un sans l'ajouter
 * à la clé laisserait un cache périmé dire « formaté ».
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RACINE = resolve(__dirname, '../..');

function cle(): string {
	const r = spawnSync('bash', [resolve(RACINE, 'scripts/ci-cle-prettier.sh')], {
		encoding: 'utf8'
	});
	expect(r.status).toBe(0);
	return r.stdout.trim();
}

function versionInstallee(paquet: string): string {
	const lu: unknown = JSON.parse(
		readFileSync(resolve(RACINE, 'node_modules', paquet, 'package.json'), 'utf8')
	);
	if (typeof lu !== 'object' || lu === null || !('version' in lu)) throw new Error(paquet);
	return String(lu.version);
}

describe('ci-cle-prettier', () => {
	it('nomme la version installée de Prettier, de ses plugins et de Tailwind', () => {
		const attendue = [
			'prettier',
			'prettier-plugin-svelte',
			'prettier-plugin-tailwindcss',
			'tailwindcss'
		]
			.map((p) => `${p}@${versionInstallee(p)}`)
			.join('_');
		expect(cle()).toBe(attendue);
	});

	it('une seule ligne, sans caractère qui casserait une clé de cache', () => {
		expect(cle()).toMatch(/^[a-z0-9@._-]+$/);
	});

	it('tout plugin de .prettierrc est dans la clé', () => {
		const config: unknown = JSON.parse(readFileSync(resolve(RACINE, '.prettierrc'), 'utf8'));
		const plugins =
			typeof config === 'object' &&
			config !== null &&
			'plugins' in config &&
			Array.isArray(config.plugins)
				? config.plugins.map(String)
				: [];
		expect(plugins.length).toBeGreaterThan(0);
		for (const p of plugins) expect(cle()).toContain(`${p}@`);
	});
});
