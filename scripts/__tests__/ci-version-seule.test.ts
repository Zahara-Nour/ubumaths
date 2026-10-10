/**
 * Le raccourci de CI du commit de version (ADR 0021)
 * ==================================================
 *
 * `scripts/ci-version-seule.sh` dit à quality.yml s'il peut sauter ses jobs
 * lourds. Un faux « oui » laisserait passer en prod un commit non vérifié :
 * chaque condition est donc gardée par un cas qui doit répondre « non ».
 *
 * Dépôt jetable, `gh` remplacé par un bouchon qui lit l'état de « CI Summary »
 * de chaque commit dans un fichier. git ne tourne jamais hors du dossier jetable.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
	appendFileSync,
	chmodSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';

const SCRIPT = resolve(__dirname, '../ci-version-seule.sh');

let racine: string;
let depot: string;
let etats: string;
let numero = 0;

function env(): NodeJS.ProcessEnv {
	return {
		...process.env,
		PATH: `${join(racine, 'bin')}:${process.env.PATH}`,
		HOME: racine,
		XDG_CONFIG_HOME: racine,
		GIT_CONFIG_NOSYSTEM: '1',
		GIT_CEILING_DIRECTORIES: dirname(racine),
		GIT_AUTHOR_NAME: 'test',
		GIT_AUTHOR_EMAIL: 'test@example.com',
		GIT_COMMITTER_NAME: 'test',
		GIT_COMMITTER_EMAIL: 'test@example.com',
		GITHUB_REPOSITORY: 'test/test',
		ETATS_CI: etats
	};
}

function git(...args: string[]): string {
	const reel = realpathSync(depot);
	if (!reel.startsWith(racine + sep)) throw new Error(`hors du dossier jetable : ${depot}`);
	const r = spawnSync('git', args, { cwd: reel, env: env(), encoding: 'utf8' });
	if (r.status !== 0) throw new Error(`git ${args.join(' ')} → ${r.status}\n${r.stderr}`);
	return r.stdout.trim();
}

/** Un commit ; `ci` = état de « CI Summary » (absent par défaut). */
function commit(message: string, ci: string | null, ecrire: Record<string, string>): string {
	for (const [f, contenu] of Object.entries(ecrire)) {
		mkdirSync(dirname(join(depot, f)), { recursive: true });
		writeFileSync(join(depot, f), contenu);
	}
	git('add', '-A');
	git('commit', '-q', '--allow-empty', '-m', message);
	const sha = git('rev-parse', 'HEAD');
	if (ci) appendFileSync(etats, `${sha} ${ci}\n`);
	return sha;
}

function paquet(version: string, extra = ''): string {
	return `{\n\t"name": "chiphre",\n\t"version": "${version}",${extra}\n\t"type": "module"\n}\n`;
}

function travail(ci: string | null = 'success', fichier = 'src/a.ts'): string {
	return commit(`feat: travail ${++numero}`, ci, { [fichier]: `${numero}\n` });
}

function version(nouvelle = '0.16.0', autres: Record<string, string> = {}): string {
	const changelog = readFileSync(join(depot, 'CHANGELOG.md'), 'utf8');
	return commit(`chore(release): ${nouvelle}`, null, {
		'package.json': paquet(nouvelle),
		'CHANGELOG.md': `## ${nouvelle}\n\n${changelog}`,
		...autres
	});
}

function verdict(sha: string) {
	const r = spawnSync('bash', [SCRIPT, sha], {
		cwd: realpathSync(depot),
		env: env(),
		encoding: 'utf8'
	});
	return { status: r.status, sortie: r.stdout.trim(), raison: r.stderr };
}

beforeEach(() => {
	racine = realpathSync(mkdtempSync(join(tmpdir(), 'ci-version-')));
	depot = join(racine, 'depot');
	etats = join(racine, 'etats-ci');
	writeFileSync(etats, '');
	mkdirSync(depot);
	mkdirSync(join(racine, 'bin'));
	writeFileSync(
		join(racine, 'bin/gh'),
		`#!/bin/bash
sha=$(printf '%s\\n' "$@" | grep -oE 'commits/[0-9a-f]+' | head -1 | cut -d/ -f2)
etat=$(grep "^$sha " "$ETATS_CI" | tail -1 | cut -d' ' -f2)
echo "\${etat:-absent}"
`
	);
	chmodSync(join(racine, 'bin/gh'), 0o755);
	spawnSync('git', ['init', '-q'], { cwd: depot, env: env() });
	commit('chore: départ', 'success', {
		'package.json': paquet('0.15.0'),
		'CHANGELOG.md': '## 0.15.0\n'
	});
});

afterEach(() => {
	rmSync(racine, { recursive: true, force: true });
});

describe('ci-version-seule.sh — oui, jobs lourds sautés', () => {
	it('montée de version posée sur un commit vert', () => {
		travail('success');
		const r = verdict(version());
		expect(r.sortie, r.raison).toBe('seule=true');
	});

	it('posée sur des commits de doc sans CI, eux-mêmes posés sur un commit vert', () => {
		travail('success');
		travail(null, 'docs/wip/journal.md');
		travail(null, 'CLAUDE.md');
		const r = verdict(version());
		expect(r.sortie, r.raison).toBe('seule=true');
	});
});

describe('ci-version-seule.sh — non, CI complète', () => {
	it('un autre fichier change avec la version', () => {
		travail('success');
		const r = verdict(version('0.16.0', { 'src/b.ts': 'x\n' }));
		expect(r.sortie).toBe('seule=false');
		expect(r.raison).toContain('fichiers modifiés');
	});

	it('package.json change autre chose que la version', () => {
		travail('success');
		const sha = commit('chore(release): 0.16.0', null, {
			'package.json': paquet('0.16.0', '\n\t"private": true,'),
			'CHANGELOG.md': '## 0.16.0\n'
		});
		const r = verdict(sha);
		expect(r.sortie).toBe('seule=false');
		expect(r.raison).toContain('package.json');
	});

	it("le sujet n'est pas un commit de version", () => {
		travail('success');
		const sha = commit('chore: 0.16.0', null, {
			'package.json': paquet('0.16.0'),
			'CHANGELOG.md': '## 0.16.0\n'
		});
		expect(verdict(sha).sortie).toBe('seule=false');
	});

	it('le parent a une CI rouge', () => {
		travail('failure');
		const r = verdict(version());
		expect(r.sortie).toBe('seule=false');
		expect(r.raison).toContain('failure');
	});

	it('le parent a une CI en cours', () => {
		travail('pending');
		expect(verdict(version()).sortie).toBe('seule=false');
	});

	it('du code sans CI entre la version et le dernier commit vert', () => {
		travail('success');
		travail(null, 'src/b.ts');
		const r = verdict(version());
		expect(r.sortie).toBe('seule=false');
		expect(r.raison).toContain('code sans');
	});

	it('un article du Shtam sans CI (.md sous src/) compte comme du code', () => {
		travail('success');
		travail(null, 'src/lib/server/shtam/articles/32.md');
		expect(verdict(version()).sortie).toBe('seule=false');
	});
});
