import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Défaut 4 du chantier `verifs-auto` : le chemin du dépôt était collé tel quel dans
// les plists (XML) et dans la commande de bash. Un chemin à « & » ou à guillemet
// cassait le plist, ou la commande.
const INSTALLER = resolve(__dirname, '../surveillance-machine-installer.sh');
const ODD = 'dépôt & <essai> "guillemets" l\'apostrophe';

let root = '';
let home = '';
let depot = '';

function plist(name: string): { ProgramArguments: string[]; StandardOutPath: string } {
	const file = join(home, 'Library/LaunchAgents', `${name}.plist`);
	execFileSync('plutil', ['-lint', file]);
	const json = execFileSync('plutil', ['-convert', 'json', '-o', '-', file], { encoding: 'utf8' });
	return JSON.parse(json) as { ProgramArguments: string[]; StandardOutPath: string };
}

describe.runIf(process.platform === 'darwin')('installation des tâches launchd', () => {
	beforeAll(() => {
		// Chemin réel : git rend /private/var, pas /var.
		root = realpathSync(mkdtempSync(join(tmpdir(), 'installer-')));
		home = join(root, 'home');
		depot = join(root, ODD);
		mkdirSync(join(depot, 'scripts/nuit'), { recursive: true });
		mkdirSync(home);
		execFileSync('git', ['init', '--quiet', depot]);
		copyFileSync(INSTALLER, join(depot, 'scripts/surveillance-machine-installer.sh'));
		writeFileSync(join(depot, 'scripts/surveillance-machine.sh'), '');
		writeFileSync(join(depot, 'scripts/nuit/index.ts'), '');
		const result = spawnSync('bash', [join(depot, 'scripts/surveillance-machine-installer.sh')], {
			encoding: 'utf8',
			env: { ...process.env, HOME: home, SURVEILLANCE_SANS_LAUNCHCTL: '1' }
		});
		expect(result.stderr).toBe('');
		expect(result.status).toBe(0);
	});

	afterAll(() => {
		if (root !== '') rmSync(root, { recursive: true, force: true });
	});

	it('surveillance : plist valide, script au bon chemin', () => {
		expect(plist('local.surveillance-machine').ProgramArguments).toEqual([
			'/bin/bash',
			join(depot, 'scripts/surveillance-machine.sh')
		]);
	});

	it('tâche de nuit : le dépôt passe en argument, la commande ne le contient pas', () => {
		const args = plist('local.tache-de-nuit').ProgramArguments;
		expect(args).toEqual([
			'/bin/bash',
			'-c',
			'cd "$1" && date && pnpm nuit --lancer',
			'nuit',
			depot
		]);
		// La commande telle que launchd la lancera arrive bien dans le dépôt.
		const cd = spawnSync(args[0], [args[1], 'cd "$1" && pwd -P', args[3], args[4]], {
			encoding: 'utf8'
		});
		expect(cd.stdout.trim().endsWith(ODD)).toBe(true);
	});

	it('relevé des durées : même forme', () => {
		expect(plist('local.durees-releve').ProgramArguments).toEqual([
			'/bin/bash',
			'-c',
			'cd "$1" && pnpm durees --releve',
			'durees',
			depot
		]);
	});
});
