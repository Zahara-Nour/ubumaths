/**
 * Surveillance du Mac mini
 * ========================
 *
 * `scripts/surveillance-machine.sh` (launchd, toutes les 5 min) après le gel du
 * 2026-11-19. Gardé ici :
 * - serveur de dev dans le dépôt principal → arrêté et signalé ;
 * - serveur de dev dans un worktree : signalé s'il est trop gros ou trop vieux,
 *   ignoré sinon ;
 * - Chrome trop gourmand, swap trop plein → signalés ;
 * - machine calme → rien d'envoyé ;
 * - une même alerte n'est pas renvoyée avant le délai de rappel ;
 * - le message envoyé ne contient aucun chemin.
 *
 * `ps`, `lsof`, `sysctl`, `curl` sont des faux posés en tête du PATH ; l'arrêt
 * passe par SURVEILLANCE_TUER, qui note le pid au lieu de tuer.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
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
import { dirname, join, resolve } from 'node:path';

const SCRIPT = resolve(__dirname, '../surveillance-machine.sh');
const MENAGE = resolve(__dirname, '../menage-machine.sh');

let racine: string;
let principal: string;
let worktree: string;
let faux: string;

type Machine = {
	/** lignes « pid rss(Ko) etime commande » */
	processus: string[];
	/** pid → dossier courant */
	dossiers: Record<string, string>;
	/** sortie de `sysctl -n vm.swapusage` */
	swap: string;
	/** lignes « pcpu commande » */
	chrome: string[];
	/** lignes « pid pcpu time commande » (processus d'extension) */
	extensions?: string[];
};

const SWAP_CALME = 'total = 12288.00M  used = 2048.00M  free = 10240.00M  (encrypted)';

function gitJetable(cwd: string, ...args: string[]): void {
	const r = spawnSync('git', args, {
		cwd,
		env: {
			...process.env,
			HOME: racine,
			GIT_CONFIG_NOSYSTEM: '1',
			GIT_CEILING_DIRECTORIES: dirname(racine),
			GIT_AUTHOR_NAME: 'test',
			GIT_AUTHOR_EMAIL: 'test@example.com',
			GIT_COMMITTER_NAME: 'test',
			GIT_COMMITTER_EMAIL: 'test@example.com'
		},
		encoding: 'utf8'
	});
	if (r.status !== 0) throw new Error(`git ${args.join(' ')} → ${r.status}\n${r.stderr}`);
}

function ecrireFaux(nom: string, corps: string): void {
	const chemin = join(faux, nom);
	writeFileSync(chemin, `#!/bin/bash\n${corps}\n`);
	chmodSync(chemin, 0o755);
}

/** Pose les faux outils qui décrivent la machine. */
function machine(m: Machine): void {
	writeFileSync(join(racine, 'ps-vite.txt'), m.processus.join('\n') + '\n');
	writeFileSync(join(racine, 'ps-chrome.txt'), m.chrome.join('\n') + '\n');
	// Même liste avec un pid (1000, 1001…) : `ps -Ao pid=,pcpu=,command=` du ménage
	writeFileSync(
		join(racine, 'ps-chrome-pid.txt'),
		m.chrome.map((l, i) => `${1000 + i} ${l}`).join('\n') + '\n'
	);
	writeFileSync(join(racine, 'ps-extensions.txt'), (m.extensions ?? []).join('\n') + '\n');
	writeFileSync(join(racine, 'swap.txt'), m.swap + '\n');
	const lsof = Object.entries(m.dossiers)
		.map(([pid, d]) => `[ "$pid" = "${pid}" ] && printf 'p${pid}\\nfcwd\\nn%s\\n' "${d}"`)
		.join('\n');
	// ps -Ao pid=,rss=,etime=,command= → serveurs ; ps -Ao pcpu=,command= → Chrome ;
	// ps -Ao pid=,pcpu=,time=,command= → extensions
	ecrireFaux(
		'ps',
		`case "$*" in *pid=,pcpu=,time=*) cat "${racine}/ps-extensions.txt" ;; *pid=,pcpu=*) cat "${racine}/ps-chrome-pid.txt" ;; *pcpu*) cat "${racine}/ps-chrome.txt" ;; *) cat "${racine}/ps-vite.txt" ;; esac`
	);
	ecrireFaux(
		'lsof',
		`while [ $# -gt 0 ]; do [ "$1" = -p ] && pid="$2"; shift; done\n${lsof}\nexit 0`
	);
	ecrireFaux('sysctl', `cat "${racine}/swap.txt"`);
	ecrireFaux('curl', `printf '%s\\n' "$@" >>"${racine}/curl.log"`);
	ecrireFaux('tuer', `printf '%s\\n' "$@" >>"${racine}/tues.log"`);
}

function lancer(extra: NodeJS.ProcessEnv = {}, args: string[] = [], script = SCRIPT) {
	return spawnSync('bash', [script, ...args], {
		cwd: racine,
		env: {
			...process.env,
			PATH: `${faux}:${process.env.PATH ?? ''}`,
			HOME: racine,
			GIT_CEILING_DIRECTORIES: dirname(racine),
			SURVEILLANCE_ETAT: join(racine, 'etat'),
			SURVEILLANCE_CONFIG: join(racine, 'config'),
			SURVEILLANCE_TUER: join(faux, 'tuer'),
			SURVEILLANCE_DEPOT: principal,
			NTFY_SERVEUR: 'https://ntfy.example.test',
			...extra
		},
		encoding: 'utf8'
	});
}

function envois(): string {
	const f = join(racine, 'curl.log');
	return existsSync(f) ? readFileSync(f, 'utf8') : '';
}

function tues(): string {
	const f = join(racine, 'tues.log');
	return existsSync(f) ? readFileSync(f, 'utf8') : '';
}

const vite = (pid: number, rssKo: number, etime: string, port: number) =>
	`${pid} ${rssKo} ${etime} node /x/node_modules/.pnpm/vite@8/node_modules/vite/bin/vite.js dev --port ${port} --strictPort`;

beforeEach(() => {
	racine = realpathSync(mkdtempSync(join(tmpdir(), 'surveillance-')));
	faux = join(racine, 'faux');
	mkdirSync(faux);
	principal = join(racine, 'principal');
	mkdirSync(principal);
	gitJetable(principal, 'init', '-q', '-b', 'main');
	writeFileSync(join(principal, 'a.txt'), 'a\n');
	gitJetable(principal, 'add', 'a.txt');
	gitJetable(principal, 'commit', '-q', '-m', 'init');
	worktree = join(racine, 'wt');
	gitJetable(principal, 'worktree', 'add', '-q', '-b', 'chantier', worktree);
	mkdirSync(join(racine, 'config'));
	writeFileSync(join(racine, 'config', 'ntfy-topic'), 'canal-de-test\n');
});

afterEach(() => {
	rmSync(racine, { recursive: true, force: true });
});

const ONGLET = '/Applications/Google Chrome.app/Helper (Renderer) --type=renderer';
const EXTENSION = `${ONGLET} --extension-process`;
const ONGLET_BRAVE = '/Applications/Brave Browser.app/Helper (Renderer) --type=renderer';
const EXTENSION_BRAVE = `${ONGLET_BRAVE} --extension-process`;
const ONGLET_PLAYWRIGHT =
	'/Users/x/Library/Caches/ms-playwright/chromium-1254/chrome-mac-arm64/Google Chrome for Testing.app/Helper (Renderer) --type=renderer';

describe('surveillance-machine', () => {
	it('machine calme : rien d’envoyé, rien d’arrêté', () => {
		machine({
			processus: [vite(100, 300_000, '01:00:00', 5176)],
			dossiers: { '100': worktree },
			swap: SWAP_CALME,
			chrome: ['30.0 /Applications/Google Chrome.app/Google Chrome']
		});
		expect(lancer().status).toBe(0);
		expect(envois()).toBe('');
		expect(tues()).toBe('');
	});

	it('serveur de dev dans le dépôt principal : arrêté et signalé', () => {
		machine({
			processus: [vite(200, 2_500_000, '04:20:00', 5175), vite(100, 300_000, '10:00', 5176)],
			dossiers: { '200': principal, '100': worktree },
			swap: SWAP_CALME,
			chrome: []
		});
		lancer();
		expect(tues().trim()).toBe('200');
		expect(envois()).toContain('Serveur de dev :5175 arrêté');
		expect(envois()).toContain('https://ntfy.example.test/canal-de-test');
	});

	it('n’arrête pas le serveur d’un autre projet, ni celui d’un worktree d’agent', () => {
		const autre = join(racine, 'autre-projet');
		mkdirSync(autre);
		gitJetable(autre, 'init', '-q', '-b', 'main');
		const agent = join(principal, '.claude', 'worktrees', 'agent-1');
		gitJetable(principal, 'worktree', 'add', '-q', '-b', 'agent', agent);
		machine({
			processus: [vite(400, 300_000, '10:00', 5180), vite(401, 300_000, '10:00', 5177)],
			dossiers: { '400': autre, '401': agent },
			swap: SWAP_CALME,
			chrome: []
		});
		lancer();
		expect(tues()).toBe('');
		expect(envois()).toBe('');
	});

	it('envoi en échec : l’alerte est retentée au passage suivant', () => {
		machine({
			processus: [],
			dossiers: {},
			swap: 'total = 12288.00M  used = 11540.94M  free = 747.06M  (encrypted)',
			chrome: []
		});
		ecrireFaux('curl', `printf '%s\\n' "$@" >>"${racine}/curl.log"; exit 7`);
		lancer();
		lancer();
		expect(envois().match(/Swap/g)).toHaveLength(2);
	});

	it('ignore l’enveloppe pnpm et le sh -c du script dev', () => {
		machine({
			processus: [
				'300 40000 05:00:00 node /x/bin/pnpm dev --port 5175 --strictPort',
				'301 2000 05:00:00 sh -c bash scripts/garde-dev-depot-principal.sh && vite dev --port 5175'
			],
			dossiers: { '300': principal, '301': principal },
			swap: SWAP_CALME,
			chrome: []
		});
		lancer();
		expect(tues()).toBe('');
		expect(envois()).toBe('');
	});

	it('serveur de dev de worktree trop gros ou trop vieux : signalé, pas arrêté', () => {
		machine({
			processus: [vite(100, 2_000_000, '30:00', 5181), vite(101, 200_000, '1-02:00:00', 5182)],
			dossiers: { '100': worktree, '101': worktree },
			swap: SWAP_CALME,
			chrome: []
		});
		lancer();
		expect(tues()).toBe('');
		expect(envois()).toContain('Serveur de dev :5181 : 1953 Mo, 0 h.');
		expect(envois()).toContain('Serveur de dev :5182 : 195 Mo, 26 h.');
	});

	it('Chrome à ~600 % avec quelques onglets actifs : pas d’alerte (usage courant)', () => {
		const onglet = '/Applications/Google Chrome.app/Helper (Renderer) --type=renderer';
		machine({
			processus: [],
			dossiers: {},
			swap: SWAP_CALME,
			chrome: [
				'100.0 /Applications/Google Chrome.app/Helper --type=gpu-process',
				...Array.from({ length: 5 }, () => `99.0 ${onglet}`)
			]
		});
		lancer();
		expect(envois()).toBe('');
	});

	it('Chrome emballé et swap plein : signalés', () => {
		const onglet = '/Applications/Google Chrome.app/Helper (Renderer) --type=renderer';
		machine({
			processus: [],
			dossiers: {},
			swap: 'total = 12288.00M  used = 11540.94M  free = 747.06M  (encrypted)',
			chrome: Array.from({ length: 20 }, () => `58.0 ${onglet}`)
		});
		lancer();
		expect(envois()).toContain('Chrome : 1160 % CPU, 20 onglets dont 20 actifs.');
		expect(envois()).toContain('Swap : 93 %');
	});

	it('Chrome for Testing (Playwright) n’est pas compté avec Chrome', () => {
		machine({
			processus: [],
			dossiers: {},
			swap: SWAP_CALME,
			chrome: Array.from({ length: 20 }, () => `58.0 ${ONGLET_PLAYWRIGHT}`)
		});
		lancer();
		expect(envois()).toBe('');
	});

	it('extension bloquée (Chrome ou Brave) : signalée, jamais arrêtée', () => {
		machine({
			processus: [],
			dossiers: {},
			swap: SWAP_CALME,
			chrome: [],
			extensions: [
				`958 100.0 14402:13.45 ${EXTENSION}`, // 240 h de CPU → signalée
				`821 99.0 125:00.00 ${EXTENSION_BRAVE}`, // 2 h de CPU → signalée
				`960 100.0 2:34.88 ${EXTENSION}`, // pic bref → rien
				`961 0.5 600:00.00 ${EXTENSION}` // calme aujourd'hui → rien
			]
		});
		lancer();
		expect(envois()).toContain('Extension Chrome bloquée : 100 % CPU, 240 h de CPU cumulées.');
		expect(envois()).toContain('Extension Brave bloquée : 99 % CPU, 2 h de CPU cumulées.');
		expect(envois().match(/Extension/g)).toHaveLength(2);
		expect(tues()).toBe('');
	});

	it('ne renvoie pas la même alerte avant le délai de rappel', () => {
		machine({
			processus: [],
			dossiers: {},
			swap: 'total = 12288.00M  used = 11540.94M  free = 747.06M  (encrypted)',
			chrome: []
		});
		lancer();
		lancer();
		expect(envois().match(/Swap/g)).toHaveLength(1);
		lancer({ SURVEILLANCE_RAPPEL_MIN: '0' });
		expect(envois().match(/Swap/g)).toHaveLength(2);
	});

	it('le message envoyé ne contient aucun chemin, le journal si', () => {
		machine({
			processus: [vite(200, 2_500_000, '04:20:00', 5175)],
			dossiers: { '200': principal },
			swap: SWAP_CALME,
			chrome: []
		});
		lancer();
		expect(envois()).not.toContain(racine);
		expect(readFileSync(join(racine, 'etat', 'journal.log'), 'utf8')).toContain(principal);
	});

	it('--essai : n’arrête rien, n’envoie rien, dit ce qu’il ferait', () => {
		machine({
			processus: [vite(200, 2_500_000, '04:20:00', 5175)],
			dossiers: { '200': principal },
			swap: SWAP_CALME,
			chrome: []
		});
		const r = lancer({}, ['--essai']);
		expect(r.stdout).toContain('ARRÊT : serveur de dev :5175');
		expect(tues()).toBe('');
		expect(envois()).toBe('');
	});

	it('sans canal configuré : journal seul, pas d’envoi', () => {
		rmSync(join(racine, 'config', 'ntfy-topic'));
		machine({
			processus: [],
			dossiers: {},
			swap: 'total = 12288.00M  used = 11540.94M  free = 747.06M  (encrypted)',
			chrome: []
		});
		expect(lancer().status).toBe(0);
		expect(envois()).toBe('');
		expect(readFileSync(join(racine, 'etat', 'journal.log'), 'utf8')).toContain(
			'pas de canal ntfy'
		);
	});
});

const SWAP_GEL = 'total = 12288.00M  used = 11800.00M  free = 488.00M  (encrypted)';

describe('menage-machine', () => {
	it('ferme les onglets gourmands, épargne les calmes et les extensions', () => {
		machine({
			processus: [],
			dossiers: {},
			swap: SWAP_CALME,
			chrome: [
				`58.0 ${ONGLET}`,
				`5.0 ${ONGLET}`,
				`90.0 ${EXTENSION}`,
				`40.0 ${ONGLET_BRAVE}`,
				`90.0 ${EXTENSION_BRAVE}`,
				`70.0 ${ONGLET_PLAYWRIGHT}`
			]
		});
		const r = lancer({}, [], MENAGE);
		expect(tues().trim().split('\n')).toEqual(['1000', '1003']);
		expect(r.stdout.trim().split('\n').at(-1)).toBe(
			'Ménage : 2 onglet(s) Chrome/Brave fermé(s), 0 serveur(s) de dev arrêté(s).'
		);
	});

	it('épargne le serveur de test de David (:5173), même vieux', () => {
		machine({
			processus: [vite(504, 300_000, '2-00:00:00', 5173), vite(505, 300_000, '07:00:00', 5181)],
			dossiers: { '504': worktree, '505': worktree },
			swap: SWAP_CALME,
			chrome: []
		});
		const r = lancer({}, [], MENAGE);
		expect(tues().trim()).toBe('505');
		expect(r.stdout).toContain('1 serveur(s) de dev arrêté(s) (:5181).');
	});

	it('arrête les serveurs vieux de notre dépôt et ceux du dépôt principal, pas les autres', () => {
		const autre = join(racine, 'autre-projet');
		mkdirSync(autre);
		gitJetable(autre, 'init', '-q', '-b', 'main');
		machine({
			processus: [
				vite(500, 300_000, '07:00:00', 5181), // worktree, 7 h → arrêté
				vite(501, 300_000, '30:00', 5182), // worktree, récent → gardé
				vite(502, 300_000, '05:00', 5175), // dépôt principal → arrêté
				vite(503, 300_000, '2-00:00:00', 3000) // autre projet → jamais
			],
			dossiers: { '500': worktree, '501': worktree, '502': principal, '503': autre },
			swap: SWAP_CALME,
			chrome: []
		});
		const r = lancer({}, [], MENAGE);
		expect(tues().trim().split('\n')).toEqual(['500', '502']);
		expect(r.stdout).toContain('2 serveur(s) de dev arrêté(s) (:5181 :5175).');
	});

	it('--essai : ne ferme rien, dit ce qu’il fermerait', () => {
		machine({
			processus: [vite(502, 300_000, '05:00', 5175)],
			dossiers: { '502': principal },
			swap: SWAP_CALME,
			chrome: [`58.0 ${ONGLET}`]
		});
		const r = lancer({}, ['--essai'], MENAGE);
		expect(tues()).toBe('');
		expect(r.stdout).toContain("Ménage (essai, rien n'est fermé) : 1 onglet(s)");
	});
});

describe('surveillance-machine : ménage automatique', () => {
	it('swap au-delà de 95 % : ménage lancé, résumé envoyé', () => {
		machine({
			processus: [],
			dossiers: {},
			swap: SWAP_GEL,
			chrome: [`58.0 ${ONGLET}`, `5.0 ${ONGLET}`]
		});
		lancer();
		expect(tues().trim()).toBe('1000');
		expect(envois()).toContain('Ménage : 1 onglet(s) Chrome/Brave fermé(s)');
		expect(envois()).toContain('Swap : 96 %');
	});

	it('pas de second ménage avant la pause', () => {
		machine({ processus: [], dossiers: {}, swap: SWAP_GEL, chrome: [`58.0 ${ONGLET}`] });
		lancer();
		lancer();
		expect(tues().trim().split('\n')).toHaveLength(1);
		lancer({ SURVEILLANCE_MENAGE_PAUSE_MIN: '0' });
		expect(tues().trim().split('\n')).toHaveLength(2);
	});

	it('swap sous le seuil du ménage : rien n’est fermé', () => {
		machine({
			processus: [],
			dossiers: {},
			swap: 'total = 12288.00M  used = 11000.00M  free = 1288.00M  (encrypted)',
			chrome: [`58.0 ${ONGLET}`]
		});
		lancer();
		expect(tues()).toBe('');
		expect(envois()).toContain('Swap : 89 %');
	});

	it('--essai : le ménage est simulé', () => {
		machine({ processus: [], dossiers: {}, swap: SWAP_GEL, chrome: [`58.0 ${ONGLET}`] });
		const r = lancer({}, ['--essai']);
		expect(tues()).toBe('');
		expect(r.stdout).toContain('Ménage (essai');
	});
});
