import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { acquireLock, locksDir, releaseLock } from '../../e2e/verifs/helpers/verrou';

// Défaut 3 du chantier `verifs-auto` : le verrou des élèves partagés vivait dans le
// worktree (`.captures/verifs/verrous`, chemin relatif) ; deux worktrees, tâche de
// nuit comprise, jouaient sur la même base locale sans se voir.
describe('verrou des vérifications entre fichiers', () => {
	const saved = process.env.VERIFS_VERROUS;
	let dir = '';

	afterEach(() => {
		if (saved === undefined) delete process.env.VERIFS_VERROUS;
		else process.env.VERIFS_VERROUS = saved;
		if (dir !== '') rmSync(dir, { recursive: true, force: true });
		dir = '';
	});

	it('un seul dossier pour la machine, hors de tout worktree', () => {
		delete process.env.VERIFS_VERROUS;
		expect(isAbsolute(locksDir())).toBe(true);
		expect(locksDir()).toBe(join(homedir(), '.local/state/verifs/verrous'));
	});

	it('pris et rendu dans ce dossier', async () => {
		dir = mkdtempSync(join(tmpdir(), 'verrous-'));
		process.env.VERIFS_VERROUS = dir;
		await acquireLock('eleves-essai');
		expect(existsSync(join(dir, 'eleves-essai'))).toBe(true);
		releaseLock('eleves-essai');
		expect(existsSync(join(dir, 'eleves-essai'))).toBe(false);
	});
});
