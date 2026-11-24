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
 * - le message envoyé ne contient aucun chemin ;
 * - processus de test orphelins (parent mort, plus de 30 min) → fermés et signalés ;
 * - « RAS » une fois par jour, au premier passage après SURVEILLANCE_HEURE_RAS ;
 * - disque sous SEUIL_DISQUE_GO Go libres → signalé ;
 * - worktrees au travail jamais commité ou non poussé, intouchés depuis
 *   SEUIL_WORKTREE_JOURS jours → comptés dans le « RAS » (noms : --worktrees) ;
 * - redémarrage du Mac (et plantage du système) → signalé ;
 * - processus emballé quel qu'il soit, programme qui ne ramasse plus ses processus
 *   morts, trop de vieilles sessions Claude, disque qui fond en 24 h → signalés.
 *
 * `ps`, `lsof`, `sysctl`, `df`, `curl` sont des faux posés en tête du PATH ; l'arrêt
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
	utimesSync,
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
	/** lignes « pid pcpu time etime commande » (tous les processus, pour les emballés) */
	extensions?: string[];
	/** lignes « pid ppid stat etime commande » (processus morts et leurs parents) */
	zombies?: string[];
	/** lignes « pid etime rss commande » (sessions Claude) */
	sessions?: string[];
	/** lignes « pcpu rss(Ko) exécutable » (tous les programmes) */
	programmes?: string[];
	/** sortie de `sysctl -n vm.loadavg` */
	charge?: string;
	/** sortie de `sysctl -n kern.memorystatus_vm_pressure_level` ('' = indisponible) */
	pression?: string;
	/** lignes « pid ppid etime rss(Ko) commande » (candidats orphelins) */
	orphelins?: string[];
	/** Go libres du volume des données (100 par défaut ; null = df en échec) */
	disqueLibreGo?: number | null;
	/** secondes de `sysctl -n kern.boottime` */
	demarrage?: number;
};

const SWAP_CALME = 'total = 12288.00M  used = 2048.00M  free = 10240.00M  (encrypted)';

const DEMARRAGE = 1_794_248_514; // 2026-11-09 19:21:54

function gitJetable(cwd: string, ...args: string[]): void {
	gitDate(cwd, undefined, ...args);
}

/** git dans le décor jetable, avec une date de commit imposée (secondes) si donnée. */
function gitDate(cwd: string, date: number | undefined, ...args: string[]): void {
	const quand =
		date === undefined ? {} : { GIT_COMMITTER_DATE: `@${date}`, GIT_AUTHOR_DATE: `@${date}` };
	const r = spawnSync('git', args, {
		cwd,
		env: {
			...process.env,
			...quand,
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
	writeFileSync(join(racine, 'ps-zombies.txt'), (m.zombies ?? []).join('\n') + '\n');
	writeFileSync(join(racine, 'ps-sessions.txt'), (m.sessions ?? []).join('\n') + '\n');
	writeFileSync(join(racine, 'swap.txt'), m.swap + '\n');
	writeFileSync(join(racine, 'ps-programmes.txt'), (m.programmes ?? []).join('\n') + '\n');
	writeFileSync(join(racine, 'charge.txt'), (m.charge ?? '{ 2.00 2.00 2.00 }') + '\n');
	writeFileSync(join(racine, 'pression.txt'), m.pression ?? '1');
	writeFileSync(
		join(racine, 'boot.txt'),
		`{ sec = ${m.demarrage ?? DEMARRAGE}, usec = 0 } Mon Nov  9 19:21:54 2026\n`
	);
	writeFileSync(join(racine, 'ps-orphelins.txt'), (m.orphelins ?? []).join('\n') + '\n');
	const libre = m.disqueLibreGo === undefined ? 100 : m.disqueLibreGo;
	ecrireFaux(
		'df',
		libre === null
			? 'exit 1'
			: `echo 'Filesystem 1024-blocks Used Available Capacity Mounted on'\necho '/dev/disk3s5 ${228 * 1048576} 0 ${libre * 1048576} 50% /System/Volumes/Data'`
	);
	const lsof = Object.entries(m.dossiers)
		.map(([pid, d]) => `[ "$pid" = "${pid}" ] && printf 'p${pid}\\nfcwd\\nn%s\\n' "${d}"`)
		.join('\n');
	// ps -Ao pid=,rss=,etime=,command= → serveurs ; ps -Ao pcpu=,command= → Chrome ;
	// ps -Ao pid=,pcpu=,time=,command= → extensions ; ps -Ao pid=,ppid=,… → orphelins
	ecrireFaux(
		'ps',
		`case "$*" in *stat=*) cat "${racine}/ps-zombies.txt" ;; *"-Ao pid=,etime=,rss="*) cat "${racine}/ps-sessions.txt" ;; *ppid=*) cat "${racine}/ps-orphelins.txt" ;; *pid=,pcpu=,time=*) cat "${racine}/ps-extensions.txt" ;; *pid=,pcpu=*) cat "${racine}/ps-chrome-pid.txt" ;; *pcpu=,rss=*) cat "${racine}/ps-programmes.txt" ;; *pcpu*) cat "${racine}/ps-chrome.txt" ;; *) cat "${racine}/ps-vite.txt" ;; esac`
	);
	ecrireFaux(
		'lsof',
		`while [ $# -gt 0 ]; do [ "$1" = -p ] && pid="$2"; shift; done\n${lsof}\nexit 0`
	);
	ecrireFaux(
		'sysctl',
		`case "$*" in *vm.swapusage*) cat "${racine}/swap.txt" ;; *vm.loadavg*) cat "${racine}/charge.txt" ;;
*hw.ncpu*) echo 12 ;; *boottime*) cat "${racine}/boot.txt" ;; *pressure*) [ -s "${racine}/pression.txt" ] || exit 1; cat "${racine}/pression.txt"; echo ;; esac`
	);
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
			SURVEILLANCE_HEURE_RAS: '24', // pas de « RAS » sauf dans ses tests
			SURVEILLANCE_RAPPORTS: join(racine, 'rapports'),
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
const GPU_CHROME = '/Applications/Google Chrome.app/Helper (GPU) --type=gpu-process';
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

	it('processus emballé, quel qu’il soit : signalé, jamais arrêté', () => {
		machine({
			processus: [],
			dossiers: {},
			swap: SWAP_CALME,
			chrome: [],
			extensions: [
				`958 100.0 14402:13.45 10-00:00:00 ${EXTENSION}`, // 240 h de CPU → signalée
				`821 99.0 125:00.00 3-00:00:00 ${EXTENSION_BRAVE}`, // 2 h de CPU → signalée
				`883 99.3 4268:55.71 12-00:00:00 ${GPU_CHROME}`, // processus graphique → signalé
				`700 95.0 300:00.00 1-00:00:00 /Users/x/MonProjet/target/debug/monprojet --serve`, // nom tu
				`960 100.0 2:34.88 00:05:00 ${EXTENSION}`, // pic bref → rien
				`961 0.5 600:00.00 10-00:00:00 ${EXTENSION}` // calme aujourd'hui → rien
			]
		});
		lancer();
		expect(envois()).toBe(''); // vu une fois : peut-être un pic
		lancer();
		expect(envois()).toContain('Chrome (extension) emballé : 100 % CPU, 240 h de CPU cumulées.');
		expect(envois()).toContain('Brave (extension) emballé : 99 % CPU, 2 h de CPU cumulées.');
		expect(envois()).toContain(
			'Chrome (processus graphique) emballé : 99 % CPU, 71 h de CPU cumulées.'
		);
		expect(envois()).toContain('un processus emballé : 95 % CPU, 5 h de CPU cumulées.');
		expect(envois()).not.toMatch(/monprojet|MonProjet/);
		expect(envois().match(/emballé/g)).toHaveLength(4);
		expect(tues()).toBe('');
	});

	it('programme qui ne ramasse plus ses processus morts : signalé à partir de 3 morts anciens', () => {
		machine({
			processus: [],
			dossiers: {},
			swap: SWAP_CALME,
			chrome: [],
			zombies: [
				`671 1 S 14-00:00:00 /Applications/Brave Browser.app/Contents/MacOS/Brave Browser`,
				'801 671 Z 14-00:00:00 (Brave Browser He)',
				'802 671 Z 5-00:00:00 (Brave Browser He)',
				'803 671 Z 00:20:00 (Brave Browser He)',
				// Chrome : 3 morts, dont un tout récent (ramassé dans la seconde) → rien
				`677 1 S 2-00:00:00 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
				'901 677 Z 01:00:00 (Google Chrome He)',
				'902 677 Z 01:00:00 (Google Chrome He)',
				'903 677 Z 00:02 (Google Chrome He)'
			]
		});
		lancer();
		expect(envois()).toBe(''); // vu une fois : peut-être ramassé dans la seconde
		lancer();
		expect(envois()).toContain(
			'Brave ne répond plus (3 processus morts non ramassés) : le relancer.'
		);
		expect(envois()).not.toContain('Chrome');
		expect(tues()).toBe('');
	});

	it('vieilles sessions Claude : signalées à partir du seuil, une fois par jour', () => {
		const session = (pid: number, etime: string) => `${pid} ${etime} 524288 claude`;
		machine({
			processus: [],
			dossiers: {},
			swap: SWAP_CALME,
			chrome: [],
			sessions: [
				session(1, '8-00:00:00'),
				session(2, '12-00:00:00'),
				session(3, '2-00:00:00'),
				`4 9-00:00:00 524288 /Users/x/.local/share/claude/versions/2.1.330`,
				'5 30-00:00:00 524288 /usr/bin/claudette' // pas une session
			]
		});
		lancer({ SEUIL_SESSIONS_VIEILLES: '4' });
		expect(envois()).toBe('');
		lancer({ SEUIL_SESSIONS_VIEILLES: '3' });
		expect(envois()).toContain(
			'Sessions Claude : 3 ouvertes depuis plus de 7 jours (4 en tout, 2 Go). Fermer celles des chantiers finis.'
		);
		// Rappel d'une heure dépassé mais pas d'un jour : rien de plus.
		lancer({ SEUIL_SESSIONS_VIEILLES: '3', SURVEILLANCE_RAPPEL_MIN: '0' });
		expect(envois().match(/Sessions Claude/g)).toHaveLength(1);
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

const APP_CHROME =
	'/Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Framework.framework/Helpers/Google Chrome Helper (Renderer).app/Contents/MacOS/Google Chrome Helper (Renderer)';
const APP_BRAVE =
	'/Applications/Brave Browser.app/Contents/Frameworks/Brave Browser Framework.framework/Helpers/Brave Browser Helper (Renderer).app/Contents/MacOS/Brave Browser Helper (Renderer)';
/** Chrome 640 % / 4,1 Go (deux onglets), node 180 % / 1,5 Go, Brave 95 % / 0,5 Go, claude × 2 */
const PROGRAMMES = [
	`400.0 2150000 ${APP_CHROME}`,
	`240.0 2150000 ${APP_CHROME}`,
	`180.0 1572864 /opt/homebrew/bin/node`,
	`95.0 524288 ${APP_BRAVE}`,
	`3.0 600000 /Users/x/.local/bin/claude`,
	`2.0 500000 /Users/x/.local/share/claude/versions/2.1.327`,
	`1.0 100000 /Users/x/Projets/MonProjet/target/debug/monprojet`
];
const CHARGE_HAUTE = '{ 52.10 40.00 30.00 }';

function historique(): string[] {
	const f = join(racine, 'etat', 'historique.csv');
	return existsSync(f) ? readFileSync(f, 'utf8').trim().split('\n') : [];
}

describe('surveillance-machine : historique', () => {
	it('une ligne par passage, en-tête une seule fois', () => {
		machine({
			processus: [],
			dossiers: {},
			swap: SWAP_CALME,
			chrome: [],
			programmes: PROGRAMMES,
			charge: '{ 16.48 17.87 20.59 }'
		});
		lancer();
		lancer();
		const h = historique();
		expect(h).toHaveLength(3);
		expect(h[0]).toBe(
			'date;charge;pression;swap_pct;chrome_cpu;brave_cpu;serveurs_dev;processus_claude;disque_libre_go'
		);
		expect(h[1]).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2};16;1;16;640;95;0;2;100$/);
	});

	it('ne garde que les SURVEILLANCE_HISTORIQUE_LIGNES dernières lignes', () => {
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [] });
		for (let i = 0; i < 5; i++) lancer({ SURVEILLANCE_HISTORIQUE_LIGNES: '3' });
		expect(historique()).toHaveLength(4); // en-tête + 3
	});

	it('--essai n’écrit rien ; --historique affiche les dernières lignes', () => {
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [] });
		lancer({}, ['--essai']);
		expect(historique()).toEqual([]);
		lancer();
		const r = lancer({}, ['--historique']);
		expect(r.status).toBe(0);
		expect(r.stdout).toContain('charge');
		expect(r.stdout.trim().split('\n')).toHaveLength(2);
	});

	it('historique impossible à écrire : les alertes partent quand même', () => {
		mkdirSync(join(racine, 'etat', 'historique.csv'), { recursive: true });
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [], pression: '4' });
		lancer();
		expect(envois()).toContain('Mémoire critique');
	});
});

describe('surveillance-machine : alertes précoces', () => {
	it('charge haute deux passages de suite : signalée avec les coupables', () => {
		machine({
			processus: [],
			dossiers: {},
			swap: SWAP_CALME,
			chrome: [],
			programmes: PROGRAMMES,
			charge: CHARGE_HAUTE
		});
		lancer();
		expect(envois()).toBe('');
		lancer();
		expect(envois()).toContain(
			'Charge 52 (12 cœurs). En tête : Chrome 640 % · node 180 % · Brave 95 %.'
		);
	});

	it('pic de charge isolé : rien', () => {
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [], charge: CHARGE_HAUTE });
		lancer();
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [] });
		lancer();
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [], charge: CHARGE_HAUTE });
		lancer();
		expect(envois()).toBe('');
	});

	it('pression mémoire tendue ou critique : signalée avec les Go par programme', () => {
		machine({
			processus: [],
			dossiers: {},
			swap: SWAP_CALME,
			chrome: [],
			programmes: PROGRAMMES,
			pression: '2'
		});
		lancer();
		expect(envois()).toContain(
			'Mémoire tendue. En tête : Chrome 4,1 Go · node 1,5 Go · claude 1,0 Go.'
		);
	});

	it('les noms inconnus deviennent « autres », jamais classés : aucun nom de projet', () => {
		machine({
			processus: [],
			dossiers: {},
			swap: SWAP_CALME,
			chrome: [],
			programmes: [
				`900.0 9000000 /Users/x/Projets/MonProjet/target/debug/monprojet`,
				`2.0 500000 claude bg-spare`
			],
			pression: '4'
		});
		lancer();
		expect(envois()).toContain('Mémoire critique. En tête : claude 0,5 Go.');
		expect(envois()).not.toContain('MonProjet');
		expect(envois()).not.toContain('monprojet');
	});

	it('mémoire critique juste après « tendue » : signalée quand même', () => {
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [], pression: '2' });
		lancer();
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [], pression: '4' });
		lancer();
		expect(envois()).toContain('Mémoire tendue');
		expect(envois()).toContain('Mémoire critique');
	});

	it('charge haute après une longue pause : pas « deux passages de suite »', () => {
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [], charge: CHARGE_HAUTE });
		lancer();
		const marque = join(racine, 'etat', 'charge-haute');
		const ancienne = new Date(Date.now() - 60 * 60 * 1000);
		utimesSync(marque, ancienne, ancienne);
		lancer();
		expect(envois()).toBe('');
	});

	it('pression normale ou indisponible : rien, sans erreur', () => {
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [], pression: '1' });
		expect(lancer().status).toBe(0);
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [], pression: '' });
		const r = lancer();
		expect(r.status).toBe(0);
		expect(envois()).toBe('');
		expect(historique()[2]).toContain(';?;');
	});

	it('swap plein : les coupables en mémoire suivent l’alerte', () => {
		machine({
			processus: [],
			dossiers: {},
			swap: 'total = 12288.00M  used = 11000.00M  free = 1288.00M  (encrypted)',
			chrome: [],
			programmes: PROGRAMMES
		});
		lancer();
		expect(envois()).toContain('Swap : 89 % (10 Go sur 12 Go). En tête : Chrome 4,1 Go');
	});
});

const PLAYWRIGHT =
	'/Users/x/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const CRASHPAD =
	'/Users/x/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/Frameworks/x/Helpers/chrome_crashpad_handler --monitor-self';
const VITEST = 'node /x/node_modules/.pnpm/vitest@4/node_modules/vitest/vitest.mjs run';
const SVELTE_CHECK = 'node /x/node_modules/svelte-check/bin/svelte-check --tsgo';
const TSGO = '/x/node_modules/@typescript/native-preview-darwin-arm64/lib/tsgo --noEmit';

describe('surveillance-machine : orphelins de test', () => {
	it('orphelins de plus de 30 min : fermés et signalés, regroupés par programme', () => {
		machine({
			processus: [],
			dossiers: {},
			swap: SWAP_CALME,
			chrome: [],
			orphelins: [
				`699 1 10-03:56:57 71472 ${PLAYWRIGHT}`,
				`996 1 10-03:56:53 1184 ${CRASHPAD}`,
				`700 1 02:10:00 300000 ${VITEST}`,
				`701 1 45:00 200000 ${SVELTE_CHECK}`,
				`702 1 1:00:00 100000 ${TSGO}`
			]
		});
		lancer();
		expect(tues().trim().split('\n')).toEqual(['699', '700', '701', '702']);
		expect(envois()).toContain(
			'Orphelins de test fermés : Playwright × 1, vitest × 1, svelte-check × 1, tsgo × 1 (le plus vieux : 10 j).'
		);
		expect(envois()).not.toContain('/Users/x');
	});

	it('parent vivant, trop jeune ou pas un outil de test : jamais touché', () => {
		machine({
			processus: [],
			dossiers: {},
			swap: SWAP_CALME,
			chrome: [],
			orphelins: [
				`800 4321 5:00:00 300000 ${VITEST}`, // session vivante
				`801 1 29:00 300000 ${VITEST}`, // moins de 30 min
				'802 1 3-00:00:00 50000 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // appli
				'803 1 3-00:00:00 50000 node /x/node_modules/vite/bin/vite.js dev --port 5176', // serveur de dev
				`804 1 3-00:00:00 1184 ${CRASHPAD}`, // toujours détaché, même navigateur vivant
				'805 1 3-00:00:00 1000 /usr/bin/tail -f /x/node_modules/vitest/log.txt', // chemin cité en argument
				'806 1 3-00:00:00 1000 /bin/sh -c cat /x/ms-playwright/notes' // idem
			]
		});
		lancer();
		expect(tues()).toBe('');
		expect(envois()).toBe('');
	});

	it('--essai : ne ferme rien, dit ce qu’il fermerait', () => {
		machine({
			processus: [],
			dossiers: {},
			swap: SWAP_CALME,
			chrome: [],
			orphelins: [`700 1 02:10:00 300000 ${VITEST}`]
		});
		const r = lancer({}, ['--essai']);
		expect(tues()).toBe('');
		expect(r.stdout).toContain('ARRÊT : orphelin de test vitest (pid 700, 2 h)');
	});

	it('orphelin qui résiste : fermeture retentée, alerte pas renvoyée avant le rappel', () => {
		machine({
			processus: [],
			dossiers: {},
			swap: SWAP_CALME,
			chrome: [],
			orphelins: [`700 1 02:10:00 300000 ${VITEST}`]
		});
		lancer();
		lancer();
		expect(tues().trim().split('\n')).toEqual(['700', '700']);
		expect(envois().match(/Orphelins/g)).toHaveLength(1);
	});

	it('pnpm menage ferme aussi les orphelins', () => {
		machine({
			processus: [],
			dossiers: {},
			swap: SWAP_CALME,
			chrome: [],
			orphelins: [`700 1 02:10:00 300000 ${VITEST}`]
		});
		const r = lancer({}, [], MENAGE);
		expect(tues().trim()).toBe('700');
		expect(r.stdout.trim().split('\n').at(-1)).toBe(
			'Ménage : 0 onglet(s) Chrome/Brave fermé(s), 0 serveur(s) de dev arrêté(s), 1 orphelin(s) de test fermé(s).'
		);
	});
});

describe('surveillance-machine : RAS quotidien', () => {
	it('premier passage après l’heure : un « RAS » avec les chiffres du jour', () => {
		machine({
			processus: [],
			dossiers: {},
			swap: SWAP_CALME,
			chrome: [],
			charge: '{ 8.20 7.00 6.00 }',
			disqueLibreGo: 24
		});
		lancer({ SURVEILLANCE_HEURE_RAS: '0' });
		expect(envois()).toContain(
			'RAS : surveillance active · charge 8 · swap 16 % · disque 24 Go libres.'
		);
	});

	it('une seule fois par jour, même si des alertes partent aussi', () => {
		machine({
			processus: [],
			dossiers: {},
			swap: 'total = 12288.00M  used = 11000.00M  free = 1288.00M  (encrypted)',
			chrome: []
		});
		lancer({ SURVEILLANCE_HEURE_RAS: '0' });
		lancer({ SURVEILLANCE_HEURE_RAS: '0', SURVEILLANCE_RAPPEL_MIN: '0' });
		expect(envois().match(/RAS/g)).toHaveLength(1);
		expect(envois().match(/Swap/g)).toHaveLength(2);
	});

	it('avant l’heure : rien', () => {
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [] });
		lancer({ SURVEILLANCE_HEURE_RAS: '24' });
		expect(envois()).toBe('');
	});

	it('envoi en échec : « RAS » retenté au passage suivant', () => {
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [] });
		ecrireFaux('curl', `printf '%s\\n' "$@" >>"${racine}/curl.log"; exit 7`);
		lancer({ SURVEILLANCE_HEURE_RAS: '0' });
		lancer({ SURVEILLANCE_HEURE_RAS: '0' });
		expect(envois().match(/RAS/g)).toHaveLength(2);
	});

	it('--essai : dit ce qu’il enverrait, ne marque rien', () => {
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [] });
		const r = lancer({ SURVEILLANCE_HEURE_RAS: '0' }, ['--essai']);
		expect(r.stdout).toContain('ENVOI : RAS');
		lancer({ SURVEILLANCE_HEURE_RAS: '0' });
		expect(envois().match(/RAS/g)).toHaveLength(1);
	});

	it('sans canal : pas marqué, le canal créé dans la journée reçoit son « RAS »', () => {
		rmSync(join(racine, 'config', 'ntfy-topic'));
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [] });
		lancer({ SURVEILLANCE_HEURE_RAS: '0' });
		writeFileSync(join(racine, 'config', 'ntfy-topic'), 'canal-de-test\n');
		lancer({ SURVEILLANCE_HEURE_RAS: '0' });
		expect(envois().match(/RAS/g)).toHaveLength(1);
	});
});

describe('surveillance-machine : disque', () => {
	it('sous 15 Go libres : signalé', () => {
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [], disqueLibreGo: 12 });
		lancer();
		expect(envois()).toContain(
			'Disque : 12 Go libres sur 228 Go. Pour en libérer : pnpm disque:liberer --essai'
		);
		expect(historique()[1]).toMatch(/;12$/);
	});

	it('au-dessus du seuil : rien', () => {
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [], disqueLibreGo: 24 });
		lancer();
		expect(envois()).toBe('');
	});

	it('df en échec : contrôle sauté, les autres tournent', () => {
		machine({
			processus: [],
			dossiers: {},
			swap: SWAP_CALME,
			chrome: [],
			disqueLibreGo: null,
			pression: '4'
		});
		expect(lancer().status).toBe(0);
		expect(envois()).toContain('Mémoire critique');
		expect(envois()).not.toContain('Disque');
		expect(historique()[1]).toMatch(/;\?$/);
	});

	it('disque qui fond : plus de 5 Go perdus en 24 h → signalé, une fois par jour', () => {
		const p = (n: number) => String(n).padStart(2, '0');
		const ilYa = (h: number) => {
			const d = new Date(Date.now() - h * 3600_000);
			return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
		};
		mkdirSync(join(racine, 'etat'), { recursive: true });
		writeFileSync(
			join(racine, 'etat', 'historique.csv'),
			'date;charge;pression;swap_pct;chrome_cpu;brave_cpu;serveurs_dev;processus_claude;disque_libre_go\n' +
				`${ilYa(30)};1;1;1;0;0;0;1;80\n` + // plus de 24 h : ignorée
				`${ilYa(23)};1;1;1;0;0;0;1;27\n` +
				`${ilYa(2)};1;1;1;0;0;0;1;22\n`
		);
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [], disqueLibreGo: 21 });
		lancer({ SEUIL_DISQUE_BAISSE_GO: '6' }); // 6 Go perdus : pas « plus de 6 »
		expect(envois()).toBe('');
		lancer();
		expect(envois()).toContain('Disque : 6 Go perdus en 24 h (27 → 21 Go libres).');
		lancer({ SURVEILLANCE_RAPPEL_MIN: '0' });
		expect(envois().match(/Go perdus/g)).toHaveLength(1);
	});

	it('disque stable ou historique trop court : rien', () => {
		const p = (n: number) => String(n).padStart(2, '0');
		const ilYa = (h: number) => {
			const d = new Date(Date.now() - h * 3600_000);
			return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
		};
		mkdirSync(join(racine, 'etat'), { recursive: true });
		writeFileSync(
			join(racine, 'etat', 'historique.csv'),
			'date;charge;pression;swap_pct;chrome_cpu;brave_cpu;serveurs_dev;processus_claude;disque_libre_go\n' +
				`${ilYa(3)};1;1;1;0;0;0;1;90\n` // 3 h seulement : pas une journée
		);
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [], disqueLibreGo: 21 });
		lancer();
		expect(envois()).toBe('');
	});

	it('ancien historique sans la colonne disque : mis de côté, nouvel en-tête', () => {
		mkdirSync(join(racine, 'etat'), { recursive: true });
		writeFileSync(
			join(racine, 'etat', 'historique.csv'),
			'date;charge;pression;swap_pct;chrome_cpu;brave_cpu;serveurs_dev;processus_claude\n2026-11-19 10:00;1;1;1;1;1;0;1\n'
		);
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [] });
		lancer();
		expect(historique()[0]).toMatch(/;disque_libre_go$/);
		expect(historique()).toHaveLength(2);
		expect(existsSync(join(racine, 'etat', 'historique-ancien.csv'))).toBe(true);
	});
});

const JOUR = 86_400;
const IL_Y_A_10_JOURS = Math.floor(Date.now() / 1000) - 10 * JOUR;
const IL_Y_A_2_JOURS = Math.floor(Date.now() / 1000) - 2 * JOUR;

/** Un dépôt distant où `main` est poussée : les commits de main ne sont pas « non poussés ». */
function avecDistant(): void {
	const distant = join(racine, 'distant.git');
	gitJetable(racine, 'init', '-q', '--bare', distant);
	gitJetable(principal, 'remote', 'add', 'origin', distant);
	gitJetable(principal, 'push', '-q', 'origin', 'main', 'chantier');
}

/** Un worktree de plus, branche <nom>, partie de main. */
function worktreeDe(nom: string): string {
	const w = join(racine, nom);
	gitJetable(principal, 'worktree', 'add', '-q', '-b', nom, w);
	return w;
}

function fichierDate(chemin: string, date: number): void {
	writeFileSync(chemin, 'brouillon\n');
	utimesSync(chemin, date, date);
}

describe('surveillance-machine : worktrees en danger', () => {
	it('fichier jamais commité ou commit non poussé, intouchés depuis 7 jours : comptés dans le RAS', () => {
		avecDistant();
		fichierDate(join(worktree, 'article.md'), IL_Y_A_10_JOURS); // non suivi, vieux
		const w2 = worktreeDe('commits');
		writeFileSync(join(w2, 'b.txt'), 'b\n');
		gitJetable(w2, 'add', 'b.txt');
		gitDate(w2, IL_Y_A_10_JOURS, 'commit', '-q', '-m', 'jamais pousse');
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [] });
		lancer({ SURVEILLANCE_HEURE_RAS: '0' });
		expect(envois()).toMatch(/RAS : .* · 2 worktrees en danger\./);
		expect(envois()).not.toContain('article');
		expect(envois()).not.toContain('commits');
	});

	it('travail récent, worktree propre ou poussé, dépôt principal : pas comptés', () => {
		avecDistant();
		fichierDate(join(worktree, 'recent.md'), IL_Y_A_2_JOURS); // touché il y a 2 jours
		const w2 = worktreeDe('pousse');
		writeFileSync(join(w2, 'b.txt'), 'b\n');
		gitJetable(w2, 'add', 'b.txt');
		gitDate(w2, IL_Y_A_10_JOURS, 'commit', '-q', '-m', 'pousse');
		gitJetable(w2, 'push', '-q', 'origin', 'pousse');
		worktreeDe('propre');
		fichierDate(join(principal, 'notes.md'), IL_Y_A_10_JOURS); // dépôt principal : hors sujet
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [] });
		lancer({ SURVEILLANCE_HEURE_RAS: '0' });
		expect(envois()).toContain('RAS : ');
		expect(envois()).not.toContain('worktree');
	});

	it('un seul : au singulier (fichier suivi modifié il y a 10 jours)', () => {
		avecDistant();
		fichierDate(join(worktree, 'a.txt'), IL_Y_A_10_JOURS); // fichier suivi modifié
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [] });
		lancer({ SURVEILLANCE_HEURE_RAS: '0' });
		expect(envois()).toContain(' · 1 worktree en danger.');
	});

	it('nom accentué modifié aujourd’hui, dossier suivi supprimé à l’instant : pas comptés', () => {
		avecDistant();
		mkdirSync(join(worktree, 'éléments'));
		fichierDate(join(worktree, 'éléments', 'é.txt'), IL_Y_A_10_JOURS);
		gitJetable(worktree, 'add', '.');
		gitJetable(worktree, 'commit', '-q', '-m', 'accents');
		gitJetable(worktree, 'push', '-q', 'origin', 'chantier');
		for (const d of [join(worktree, 'éléments'), worktree])
			utimesSync(d, IL_Y_A_10_JOURS, IL_Y_A_10_JOURS); // seul le fichier est récent
		writeFileSync(join(worktree, 'éléments', 'é.txt'), 'modifié aujourd’hui\n'); // dossier inchangé
		const w2 = worktreeDe('suppression');
		mkdirSync(join(w2, 'sous'));
		writeFileSync(join(w2, 'sous', 'x.txt'), 'x\n');
		gitJetable(w2, 'add', '.');
		gitJetable(w2, 'commit', '-q', '-m', 'sous');
		gitJetable(w2, 'push', '-q', 'origin', 'suppression');
		rmSync(join(w2, 'sous'), { recursive: true, force: true }); // supprimé à l'instant
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [] });
		lancer({ SURVEILLANCE_HEURE_RAS: '0' });
		expect(envois()).toContain('RAS : ');
		expect(envois()).not.toContain('worktree');
	});

	it('worktree supprimé à la main (dossier absent) : sauté sans erreur', () => {
		avecDistant();
		const w2 = worktreeDe('disparu');
		rmSync(w2, { recursive: true, force: true });
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [] });
		expect(lancer({ SURVEILLANCE_HEURE_RAS: '0' }).status).toBe(0);
		expect(envois()).toContain('RAS : ');
		expect(envois()).not.toContain('worktree');
	});

	it('--worktrees : les noms et le détail, sur la machine seulement', () => {
		avecDistant();
		fichierDate(join(worktree, 'article.md'), IL_Y_A_10_JOURS);
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [] });
		const r = lancer({}, ['--worktrees']);
		expect(r.status).toBe(0);
		expect(r.stdout).toContain(worktree);
		expect(r.stdout).toContain('1 fichier(s) non commité(s)');
		expect(r.stdout).toMatch(/1[01] j/);
		expect(envois()).toBe('');
	});
});

describe('surveillance-machine : redémarrage', () => {
	it('horloge recalée (démarrage décalé de quelques secondes) : pas un redémarrage', () => {
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [] });
		lancer();
		machine({
			processus: [],
			dossiers: {},
			swap: SWAP_CALME,
			chrome: [],
			demarrage: DEMARRAGE + 2
		});
		lancer();
		expect(envois()).toBe('');
	});

	it('sans canal : redémarrage gardé pour le canal créé ensuite', () => {
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [] });
		lancer();
		rmSync(join(racine, 'config', 'ntfy-topic'));
		machine({
			processus: [],
			dossiers: {},
			swap: SWAP_CALME,
			chrome: [],
			demarrage: DEMARRAGE + JOUR
		});
		lancer();
		writeFileSync(join(racine, 'config', 'ntfy-topic'), 'canal-de-test\n');
		lancer();
		expect(envois().match(/redémarré/g)).toHaveLength(1);
	});

	it('premier passage : heure de démarrage notée, rien d’envoyé', () => {
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [] });
		lancer();
		lancer();
		expect(envois()).toBe('');
	});

	it('démarrage changé : signalé avec la date', () => {
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [] });
		lancer();
		const nouveau = new Date(2026, 10, 20, 3, 12).getTime() / 1000;
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [], demarrage: nouveau });
		lancer();
		lancer();
		expect(envois().match(/redémarré/g)).toHaveLength(1);
		expect(envois()).toContain('Le Mac a redémarré le 20/11 à 3 h 12.');
	});

	it('rapport de plantage depuis le démarrage précédent : « (plantage du système) »', () => {
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [] });
		lancer();
		mkdirSync(join(racine, 'rapports'));
		const nouveau = DEMARRAGE + 3 * JOUR;
		fichierDate(join(racine, 'rapports', 'panic-full-2026-11-12-031000.panic'), nouveau - 60);
		fichierDate(join(racine, 'rapports', 'panic-full-2026-11-01-000000.panic'), DEMARRAGE - JOUR); // ancien
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [], demarrage: nouveau });
		lancer();
		expect(envois()).toContain('redémarré');
		expect(envois()).toContain('(plantage du système)');
	});

	it('vieux rapport seulement : pas de « plantage »', () => {
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [] });
		lancer();
		mkdirSync(join(racine, 'rapports'));
		fichierDate(join(racine, 'rapports', 'panic-full-2026-11-01-000000.panic'), DEMARRAGE - JOUR);
		machine({
			processus: [],
			dossiers: {},
			swap: SWAP_CALME,
			chrome: [],
			demarrage: DEMARRAGE + JOUR
		});
		lancer();
		expect(envois()).toContain('redémarré');
		expect(envois()).not.toContain('plantage');
	});

	it('envoi en échec : redémarrage signalé au passage suivant', () => {
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [] });
		lancer();
		machine({
			processus: [],
			dossiers: {},
			swap: SWAP_CALME,
			chrome: [],
			demarrage: DEMARRAGE + JOUR
		});
		ecrireFaux('curl', `printf '%s\\n' "$@" >>"${racine}/curl.log"; exit 7`);
		lancer();
		lancer();
		expect(envois().match(/redémarré/g)).toHaveLength(2);
	});

	it('--essai : dit ce qu’il enverrait, ne note rien', () => {
		machine({ processus: [], dossiers: {}, swap: SWAP_CALME, chrome: [] });
		lancer();
		machine({
			processus: [],
			dossiers: {},
			swap: SWAP_CALME,
			chrome: [],
			demarrage: DEMARRAGE + JOUR
		});
		expect(lancer({}, ['--essai']).stdout).toContain('redémarré');
		lancer();
		expect(envois().match(/redémarré/g)).toHaveLength(1);
	});
});
