/**
 * Migration Verification: Unblock student_achievements / achievement_progress inserts
 * ===================================================================================
 *
 * Verifies that the migration replacing `WITH CHECK (false)` policies with
 * `TO service_role WITH CHECK (true)` policies exists and is well-formed.
 *
 * Context:
 *   The original universal achievements migration (20251121000000) declared
 *   "System can insert student achievements" with `WITH CHECK (false)`,
 *   intending SECURITY DEFINER functions to bypass via postgres BYPASSRLS.
 *   That works for the SECURITY DEFINER RPCs, but `/api/games/2048/scores`
 *   and `/api/games/mathemo/scores` insert directly with the authenticated
 *   user's client and are silently rejected. This migration unblocks them
 *   by allowing service_role inserts (the API endpoints will switch to the
 *   service-role client in the same PR).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

// Historical migrations were squashed into a baseline and moved to
// supabase/migrations_archive/, so search both locations.
const MIGRATIONS_DIRS = [
	join(process.cwd(), 'supabase', 'migrations'),
	join(process.cwd(), 'supabase', 'migrations_archive')
];

function resolveMigration(): { dir: string; file: string } | null {
	for (const dir of MIGRATIONS_DIRS) {
		let files: string[];
		try {
			files = readdirSync(dir);
		} catch {
			continue;
		}
		const match = files.find((f) => /unblock_student_achievements_inserts\.sql$/.test(f));
		if (match) return { dir, file: match };
	}
	return null;
}

function findMigrationFile(): string | null {
	return resolveMigration()?.file ?? null;
}

function getMigrationContent(): string {
	const m = resolveMigration();
	if (!m) {
		throw new Error(
			'Migration file unblock_student_achievements_inserts.sql not found in ' +
				MIGRATIONS_DIRS.join(' or ')
		);
	}
	return readFileSync(join(m.dir, m.file), 'utf-8');
}

describe('Migration: unblock_student_achievements_inserts', () => {
	describe('File existence', () => {
		it('should exist with the expected suffix', () => {
			expect(findMigrationFile()).not.toBeNull();
		});

		it('should follow the YYYYMMDDHHMMSS_description.sql convention', () => {
			const file = findMigrationFile();
			expect(file).toMatch(/^\d{14}_unblock_student_achievements_inserts\.sql$/);
		});
	});

	describe('Policy changes on student_achievements', () => {
		let content: string;

		beforeAll(() => {
			content = getMigrationContent();
		});

		it('drops the original blocking INSERT policy', () => {
			expect(content).toMatch(
				/DROP POLICY IF EXISTS\s+"System can insert student achievements"\s+ON\s+public\.student_achievements/i
			);
		});

		it('creates a service_role policy that allows writes', () => {
			// We use FOR ALL for symmetry with the yesterday migration that fixed
			// achievement_events the same way. Required pieces: the table, the
			// service_role audience, and a WITH CHECK (true) clause.
			const block = content.match(
				/CREATE POLICY[\s\S]*?ON\s+public\.student_achievements[\s\S]*?WITH\s+CHECK\s*\(\s*true\s*\)/i
			);
			expect(block).not.toBeNull();
			expect(block![0]).toMatch(/TO\s+service_role/i);
		});
	});

	describe('Policy changes on achievement_progress', () => {
		let content: string;

		beforeAll(() => {
			content = getMigrationContent();
		});

		it('drops the original blocking INSERT policy', () => {
			expect(content).toMatch(
				/DROP POLICY IF EXISTS\s+"System can manage achievement progress"\s+ON\s+public\.achievement_progress/i
			);
		});

		it('creates a service_role policy that allows writes', () => {
			const block = content.match(
				/CREATE POLICY[\s\S]*?ON\s+public\.achievement_progress[\s\S]*?WITH\s+CHECK\s*\(\s*true\s*\)/i
			);
			expect(block).not.toBeNull();
			expect(block![0]).toMatch(/TO\s+service_role/i);
		});
	});

	describe('Safety: does not touch minesweeper_student_achievements', () => {
		it('does not run any DDL against minesweeper_student_achievements', () => {
			const content = getMigrationContent();
			// Strip line comments so a "-- We do NOT touch minesweeper_student_achievements" note
			// (intentional documentation) does not trigger a false positive.
			const codeOnly = content
				.split('\n')
				.filter((line) => !line.trim().startsWith('--'))
				.join('\n');
			expect(codeOnly).not.toMatch(/minesweeper_student_achievements/i);
		});
	});
});
