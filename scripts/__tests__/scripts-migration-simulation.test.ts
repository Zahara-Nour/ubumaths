/**
 * Scripts de migration des questions : SIMULATION PAR DÉFAUT
 * ==========================================================
 *
 * Décision du 2026-09-26 : `import-questions-to-db`, `rollback-migration` et
 * `validate-phase1-questions` n'écrivent (ou ne suppriment) en base qu'avec
 * `--publier`. Avant, lancer `pnpm migration:import` sans option importait
 * tout l'export sans relecture, et `rollback-migration --all` supprimait.
 *
 * Les scripts sont lancés SANS aucune variable d'environnement Supabase : ils
 * ne peuvent pas atteindre une base, ils affichent leur configuration puis
 * s'arrêtent. On lit le mode qu'ils annoncent.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');

function runWithoutDatabase(script: string, args: string[]): string {
	const result = spawnSync('npx', ['tsx', `scripts/${script}`, ...args], {
		cwd: ROOT,
		encoding: 'utf-8',
		timeout: 60_000,
		// Aucune variable Supabase : impossible d'atteindre une base
		env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '' }
	});
	return `${result.stdout}\n${result.stderr}`;
}

describe('scripts de migration — simulation par défaut', () => {
	it('import-questions-to-db : simulation sans option', () => {
		expect(runWithoutDatabase('import-questions-to-db.ts', ['--approved-only'])).toContain(
			'Dry run: YES'
		);
	});

	it('import-questions-to-db : --dry-run seul reste une simulation', () => {
		expect(runWithoutDatabase('import-questions-to-db.ts', ['--dry-run'])).toContain(
			'Dry run: YES'
		);
	});

	it('import-questions-to-db : --publier désarme la simulation', () => {
		expect(runWithoutDatabase('import-questions-to-db.ts', ['--publier'])).toContain('Dry run: NO');
	});

	it('rollback-migration : simulation sans option', () => {
		expect(runWithoutDatabase('rollback-migration.ts', ['--all'])).toContain('Dry run: YES');
	});

	it('rollback-migration : --publier désarme la simulation', () => {
		expect(runWithoutDatabase('rollback-migration.ts', ['--publier'])).toContain('Dry run: NO');
	});

	it('validate-phase1-questions : l’écriture du statut exige --publier', () => {
		const source = readFileSync(resolve(ROOT, 'scripts/validate-phase1-questions.ts'), 'utf-8');
		expect(source).toContain("PUBLISH: process.argv.includes('--publier')");
		// La seule écriture est dans la branche qui suit le garde `!CONFIG.PUBLISH`
		const guard = source.indexOf('!CONFIG.PUBLISH');
		const write = source.indexOf(".from('migration_tracking')\n\t\t\t\t\t.update(");
		expect(guard).toBeGreaterThan(-1);
		expect(write).toBeGreaterThan(guard);
		expect(source.match(/\.update\(/g)).toHaveLength(1);
	});
});
