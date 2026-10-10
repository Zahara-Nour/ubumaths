/**
 * `pnpm maintenance:on|off` : quel déploiement est redéployé
 * ==========================================================
 *
 * La bascule pose ou retire des variables, puis REDÉPLOIE le dernier
 * déploiement de prod pour rejouer le build avec elles. Or `vercel ls --prod`
 * liste aussi les déploiements ANNULÉS, et chaque push de doc en crée un, qui
 * arrive en tête. Redéployer celui-là, c'est rejouer un commit de doc que
 * l'ignore step (scripts/vercel-ignore-build.sh) saute aussitôt : la bascule
 * restait sans effet, après un « Maintenance DÉSACTIVÉE » trompeur. Vu le
 * 2026-10-10 : le premier déploiement listé était un push de doc annulé.
 *
 * Ce qui est gardé : le redéploiement vise le dernier déploiement READY.
 * Le CLI Vercel est remplacé par un bouchon qui journalise ses appels.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
	chmodSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SCRIPT = resolve(__dirname, '../vercel-maintenance.sh');
const PRET = 'https://chiphre-pret-equipe.vercel.app';
const ANNULE = 'https://chiphre-annule-equipe.vercel.app';

let dir: string;

beforeEach(() => {
	dir = realpathSync(mkdtempSync(join(tmpdir(), 'maintenance-')));
	mkdirSync(join(dir, 'bin'));
	mkdirSync(join(dir, '.vercel'));
	writeFileSync(
		join(dir, '.vercel/project.json'),
		JSON.stringify({ orgId: 'team_test', projectId: 'prj_test' })
	);
	// Comme le vrai CLI : le déploiement annulé (le plus récent) passe avant le
	// READY, sauf avec le filtre `--status READY`.
	writeFileSync(
		join(dir, 'bin/vercel'),
		`#!/bin/bash
echo "$*" >> "${join(dir, 'appels.log')}"
if [ "$1" = "ls" ]; then
	case " $* " in
	*" READY "*) echo "${PRET}" ;;
	*) echo "${ANNULE}"; echo "${PRET}" ;;
	esac
fi
exit 0
`
	);
	chmodSync(join(dir, 'bin/vercel'), 0o755);
});

afterEach(() => {
	rmSync(dir, { recursive: true, force: true });
});

function lancer(commande: 'on' | 'off') {
	const r = spawnSync('bash', [SCRIPT, commande], {
		cwd: dir,
		env: {
			...process.env,
			PATH: `${join(dir, 'bin')}:${process.env.PATH}`,
			MAINTENANCE_BYPASS_SECRET: 'secret-de-test'
		},
		encoding: 'utf8'
	});
	const appels = readFileSync(join(dir, 'appels.log'), 'utf8').trim().split('\n');
	return { status: r.status, sortie: `${r.stdout}${r.stderr}`, appels };
}

describe('vercel-maintenance.sh — le redéploiement vise le dernier déploiement READY', () => {
	it.each(['on', 'off'] as const)('maintenance:%s', (commande) => {
		const r = lancer(commande);
		expect(r.status, r.sortie).toBe(0);
		const redeploys = r.appels.filter((a) => a.startsWith('redeploy '));
		expect(redeploys, r.appels.join('\n')).toEqual([
			`redeploy ${PRET} --target production --scope team_test`
		]);
		expect(r.sortie).toContain('Redeploy terminé');
	});
});
