/**
 * Bilan du Mac mini
 * =================
 *
 * `scripts/bilan-machine.sh` (`pnpm machine:bilan`) : l'état de la machine en une
 * page, à la demande. Gardé ici :
 * - n'importe quel processus au plafond de CPU depuis des heures est signalé, avec un
 *   nom lisible (le processus graphique de Chrome à 100 % pendant 12 jours, le
 *   2026-11-22, que la surveillance des seules extensions ne voyait pas) ;
 * - un parent qui ne ramasse plus ses processus morts est signalé (Chrome bloqué) ;
 * - sessions Claude comptées par âge ;
 * - Time Machine non configuré → signalé ;
 * - tendance des dernières 24 h lue dans l'historique de la surveillance ;
 * - il n'arrête rien et ne s'arrête pas sur une machine où un outil manque.
 *
 * `ps`, `sysctl`, `df`, `vm_stat`, `tmutil`, `lsof`, `kill` sont des faux posés en
 * tête du PATH.
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

const SCRIPT = resolve(__dirname, '../bilan-machine.sh');

let racine: string;
let faux: string;

type Machine = {
	/** lignes « pid ppid pcpu time etime stat rss commande » */
	tous?: string[];
	/** lignes « pcpu rss exécutable » */
	programmes?: string[];
	/** sortie de `tmutil destinationinfo` */
	timeMachine?: string;
	/** contenu de historique.csv */
	historique?: string;
};

function ecrireFaux(nom: string, corps: string): void {
	const chemin = join(faux, nom);
	writeFileSync(chemin, `#!/bin/bash\n${corps}\n`);
	chmodSync(chemin, 0o755);
}

function machine(m: Machine): void {
	writeFileSync(join(racine, 'tous.txt'), (m.tous ?? []).join('\n') + '\n');
	writeFileSync(join(racine, 'programmes.txt'), (m.programmes ?? []).join('\n') + '\n');
	writeFileSync(join(racine, 'tm.txt'), (m.timeMachine ?? 'Name : Disque\n') + '\n');
	if (m.historique !== undefined) {
		mkdirSync(join(racine, 'etat'), { recursive: true });
		writeFileSync(join(racine, 'etat', 'historique.csv'), m.historique);
	}
	// ps -Ao <champs> : colonnes demandées tirées de tous.txt
	// (« pid ppid pcpu time etime stat rss commande ») ; comm= → programmes.txt.
	ecrireFaux(
		'ps',
		`champs="$2"
case "$champs" in *comm=*) cat "${racine}/programmes.txt"; exit 0 ;; esac
awk -v champs="$champs" 'BEGIN { n = split(champs, c, ","); split("pid ppid pcpu time etime stat rss", noms, " "); for (i in noms) idx[noms[i] "="] = i }
NF { ligne = ""; for (i = 1; i <= n; i++) { if (c[i] == "command=") { v = $0; for (k = 1; k <= 7; k++) sub(/^ *[^ ]+ +/, "", v) } else v = $(idx[c[i]]); ligne = ligne (i > 1 ? " " : "") v } print ligne }' "${racine}/tous.txt"`
	);
	ecrireFaux(
		'sysctl',
		`case "$*" in *vm.swapusage*) echo 'total = 10240.00M  used = 2048.00M  free = 8192.00M  (encrypted)' ;;
*vm.loadavg*) echo '{ 3.00 2.00 1.00 }' ;; *hw.ncpu*) echo 12 ;; *hw.memsize*) echo 25769803776 ;;
*pressure*) echo 1 ;; *boottime*) echo '{ sec = 1794248514, usec = 0 } Mon Nov  9 19:21:54 2026' ;; esac`
	);
	ecrireFaux(
		'df',
		`echo 'Filesystem 1024-blocks Used Available Capacity Mounted on'\necho "/dev/disk3s5 ${228 * 1048576} ${5 * 1048576} ${40 * 1048576} 50% $1"`
	);
	ecrireFaux('vm_stat', `echo 'Mach Virtual Memory Statistics: (page size of 16384 bytes)'`);
	ecrireFaux('tmutil', `[ "$1" = destinationinfo ] && cat "${racine}/tm.txt"; exit 0`);
	ecrireFaux('lsof', 'exit 0');
	ecrireFaux('kill', `printf '%s\\n' "$@" >>"${racine}/kill.log"`);
}

function lancer(depot = racine) {
	return spawnSync('bash', [SCRIPT], {
		cwd: depot,
		env: {
			...process.env,
			PATH: `${faux}:${process.env.PATH ?? ''}`,
			HOME: racine,
			GIT_CEILING_DIRECTORIES: dirname(racine),
			SURVEILLANCE_ETAT: join(racine, 'etat'),
			SURVEILLANCE_DEPOT: depot,
			SURVEILLANCE_DISQUE: racine,
			BILAN_PREBOOT: racine
		},
		encoding: 'utf8'
	});
}

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CHROME_HELPER =
	'/Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Helper.app/Contents/MacOS/Google Chrome Helper';

beforeEach(() => {
	racine = realpathSync(mkdtempSync(join(tmpdir(), 'bilan-')));
	faux = join(racine, 'faux');
	mkdirSync(faux);
});

afterEach(() => {
	rmSync(racine, { recursive: true, force: true });
});

describe('bilan-machine', () => {
	it('processus graphique de Chrome au plafond depuis des jours : signalé, nom lisible', () => {
		machine({
			tous: [
				`677 1 0.0 10:00.00 12-21:00:00 S 2000 ${CHROME}`,
				`883 677 99.3 4268:55.71 12-21:00:00 S 9568 ${CHROME_HELPER} --type=gpu-process`,
				`960 677 100.0 3203:22.05 12-21:00:00 S 7184 ${CHROME_HELPER} --type=renderer --extension-process`,
				// au plafond mais depuis peu : pas emballé
				`970 677 100.0 5:00.00 00:05:00 R 7184 ${CHROME_HELPER} --type=renderer`
			]
		});
		const r = lancer();
		expect(r.status).toBe(0);
		expect(r.stdout).toContain(
			'Chrome (processus graphique) — pid 883, 99 % de CPU, 2 j de CPU cumulées'
		);
		expect(r.stdout).toContain('Chrome (extension) — pid 960');
		expect(r.stdout).not.toContain('pid 970');
		expect(r.stdout).toMatch(/Navigateurs\S*\n {2}ℹ️ {2}Chrome ouvert depuis 12 j/);
		expect(existsSync(join(racine, 'kill.log'))).toBe(false);
	});

	it('parent qui ne ramasse plus ses processus morts : signalé à partir de 3', () => {
		machine({
			tous: [
				`677 1 0.0 10:00.00 3-00:00:00 S 2000 ${CHROME}`,
				`801 677 0.0 0:00.00 2-00:00:00 Z 0 (Google Chrome He)`,
				`802 677 0.0 0:00.00 2-00:00:00 Z 0 (Google Chrome He)`,
				`803 677 0.0 0:00.00 1-00:00:00 Z 0 (Google Chrome He)`,
				`900 1 0.0 0:01.00 1-00:00:00 S 2000 /usr/bin/autre`,
				`901 900 0.0 0:00.00 1-00:00:00 Z 0 (autre)`
			]
		});
		const r = lancer();
		expect(r.stdout).toContain('Chrome (pid 677) : 3 processus morts non ramassés');
		expect(r.stdout).not.toContain('pid 900');
	});

	it('machine saine : aucun processus emballé', () => {
		machine({ tous: [`677 1 2.0 1:00.00 01:00:00 S 2000 ${CHROME}`] });
		const r = lancer();
		expect(r.stdout).toMatch(/Processus emballés\S*\n {2}aucun/);
	});

	it('sessions Claude comptées par âge', () => {
		machine({
			tous: [
				'10 1 1.0 1:00.00 02:00:00 S 1048576 claude',
				'11 1 0.0 1:00.00 2-00:00:00 S 1048576 claude',
				'12 1 0.0 1:00.00 5-00:00:00 S 1048576 /Users/x/.local/share/claude/versions/2.1.330',
				'13 1 0.0 1:00.00 12-00:00:00 S 1048576 claude --resume',
				'14 1 0.0 1:00.00 12-00:00:00 S 1048576 /usr/bin/claudette'
			]
		});
		const r = lancer();
		expect(r.stdout).toContain('4 ouvertes, 4,0 Go de mémoire vive');
		expect(r.stdout).toContain(
			"moins d'1 jour : 1 · 1 à 3 jours : 1 · 3 à 7 jours : 1 · plus de 7 jours : 1"
		);
	});

	it('serveur de dev dont le dossier est inconnu (lsof muet) : « ? », jamais « dépôt principal »', () => {
		const principal = join(racine, 'principal');
		mkdirSync(principal);
		const git = spawnSync('git', ['init', '-q', '-b', 'main'], {
			cwd: principal,
			encoding: 'utf8'
		});
		expect(git.status).toBe(0);
		machine({
			tous: [
				'500 1 1.0 1:00.00 01:00:00 S 307200 node /x/node_modules/vite/bin/vite.js dev --port 5176 --strictPort'
			]
		});
		const r = lancer(principal);
		expect(r.stdout).toContain(':5176  ?  1 h, 300 Mo');
		expect(r.stdout).not.toContain('⛔ dépôt principal');
	});

	it('historique d’un ancien format : rien d’absurde affiché', () => {
		machine({ historique: 'date;swap\n2099-01-01 00:00;50\n' });
		const r = lancer();
		expect(r.stdout).toContain('ancien format');
		expect(r.stdout).not.toMatch(/Swap : \d+ % →/);
	});

	it('Time Machine non configuré : signalé', () => {
		machine({ timeMachine: 'tmutil: No destinations configured.' });
		expect(lancer().stdout).toContain("Time Machine n'est pas configuré");
	});

	it('tendance des dernières 24 h tirée de l’historique', () => {
		const maintenant = new Date();
		const ilYa = (h: number) => {
			const d = new Date(maintenant.getTime() - h * 3600_000);
			const p = (n: number) => String(n).padStart(2, '0');
			return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
		};
		machine({
			historique:
				'date;charge;pression;swap_pct;chrome_cpu;brave_cpu;serveurs_dev;processus_claude;disque_libre_go\n' +
				`${ilYa(30)};90;1;10;0;0;0;1;50\n` + // plus de 24 h : ignorée
				`${ilYa(20)};4;1;40;0;0;0;1;21\n` +
				`${ilYa(10)};48;1;96;0;0;0;1;18\n` +
				`${ilYa(1)};2;1;87;0;0;0;1;16\n`
		});
		const r = lancer();
		expect(r.stdout).toContain('Charge max : 48');
		expect(r.stdout).toContain('Swap : 40 % → 87 % (max 96 %)');
		expect(r.stdout).toContain('Disque libre : 21 Go → 16 Go');
	});

	it('outils absents ou muets : le bilan va au bout', () => {
		machine({});
		ecrireFaux('sysctl', 'exit 1');
		ecrireFaux('df', 'exit 1');
		ecrireFaux('vm_stat', 'exit 1');
		const r = lancer();
		expect(r.status).toBe(0);
		expect(r.stdout).toContain('Dernières 24 h');
		expect(r.stdout).toContain("pas d'historique");
	});

	it('refuse un argument', () => {
		machine({});
		const r = spawnSync('bash', [SCRIPT, '--essai'], { encoding: 'utf8' });
		expect(r.status).toBe(2);
		expect(readFileSync(SCRIPT, 'utf8')).not.toMatch(/\bkill\b|TUER|curl/);
	});
});
