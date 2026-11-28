/**
 * `pnpm outils` : réserver les lots d'outils manquants et ouvrir leurs sessions
 * ============================================================================
 *
 *   pnpm outils                          état des lots
 *   pnpm outils lancer [<lot>…] [--essai]
 *   pnpm outils reserver <lot> [--essai]
 *
 * Les lots et leurs règles : docs/wip/outils-lots.md. La réservation est un
 * commit de ce seul fichier sur `main`, poussé avant tout travail (comme
 * /prendre-lot pour les écarts). `lancer` crée ensuite, pour chaque lot pris,
 * le worktree `../ubumaths-wt-outil-<lot>` (branche `feat/outil-<lot>`) et une
 * fenêtre tmux dans la session `main` : Claude avec Remote Control, nommé
 * `outil-<lot>`, qui commence par `/prendre-outil <lot>`.
 *
 * Le dépôt principal est partagé par toutes les sessions : son arbre et sa
 * branche `main` locale ne sont **jamais touchés** (une autre session peut y
 * avoir un fichier modifié, un pull ou un rebase serait refusé ou laissé à
 * moitié). Le commit de réservation est construit sur `origin/main` dans un
 * index temporaire (`read-tree`, `update-index`, `commit-tree`) puis poussé
 * vers `main` ; push refusé = une autre session a poussé entre-temps → on
 * relit `origin/main` et on recommence le choix (trois essais). Le `main`
 * local du dépôt principal le reçoit au prochain `git pull --rebase`.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import {
	OutilsError,
	choisir,
	commandeDeSession,
	lireLots,
	messageDeCommit,
	parseArgs,
	reserver,
	sujet,
	type Lot
} from './logique';

// Constantes

const FICHIER = 'docs/wip/outils-lots.md';
const SESSION_TMUX = process.env.OUTILS_TMUX ?? 'main';
const FICHIERS_ENV = ['.env', '.env.local'];
const ESSAIS_DE_PUSH = 3;
const RACINE_DU_SCRIPT = fileURLToPath(new URL('../..', import.meta.url));
const PRETTIER = join(RACINE_DU_SCRIPT, 'node_modules/.bin/prettier');

// Functions

/** `git …` dont l'échec n'est pas une exception : code et sortie. */
function essayerGit(
	dossier: string,
	args: string[],
	options: { entree?: string; env?: NodeJS.ProcessEnv } = {}
): { ok: boolean; sortie: string; erreur: string } {
	const r = spawnSync('git', ['-C', dossier, ...args], {
		encoding: 'utf8',
		input: options.entree,
		env: options.env ?? process.env
	});
	return { ok: r.status === 0, sortie: r.stdout.trim(), erreur: r.stderr.trim() };
}

function git(dossier: string, args: string[], options: Parameters<typeof essayerGit>[2] = {}) {
	const r = essayerGit(dossier, args, options);
	if (!r.ok) throw new OutilsError(`git ${args[0]} refusé :\n${r.erreur}`);
	return r.sortie;
}

function depotPrincipal(): string {
	const commun = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
		encoding: 'utf8'
	}).trim();
	return dirname(commun);
}

function aujourdhui(): string {
	return new Date().toLocaleDateString('sv-SE');
}

function afficherLots(lots: Lot[]): void {
	for (const lot of lots) {
		const etat = lot.etat === 'libre' ? (lot.attend ? 'attend' : 'libre') : lot.prisPar;
		console.log(`${lot.nom.padEnd(22)} ${lot.outils.padEnd(22)} ${etat}`);
	}
}

function recupererMain(principal: string): void {
	const r = essayerGit(principal, ['fetch', 'origin', 'main']);
	if (!r.ok) throw new OutilsError(`Fetch refusé, rien n'est réservé :\n${r.erreur}`);
}

function lireOrigine(principal: string): string {
	return git(principal, ['show', `origin/main:${FICHIER}`]);
}

/** Le commit de réservation, fait sur `origin/main` sans toucher l'arbre ni l'index du dépôt. */
function commitDeReservation(principal: string, contenu: string, message: string): string {
	// Config et plugins de prettier : ceux du dépôt du script (même dépôt que `principal`).
	const formate = execFileSync(PRETTIER, ['--stdin-filepath', FICHIER], {
		cwd: RACINE_DU_SCRIPT,
		input: contenu,
		encoding: 'utf8'
	});
	const blob = git(principal, ['hash-object', '-w', '--stdin'], { entree: formate });
	const dossier = mkdtempSync(join(tmpdir(), 'outils-index-'));
	try {
		const env = { ...process.env, GIT_INDEX_FILE: join(dossier, 'index') };
		git(principal, ['read-tree', 'origin/main'], { env });
		git(principal, ['update-index', '--cacheinfo', `100644,${blob},${FICHIER}`], { env });
		const arbre = git(principal, ['write-tree'], { env });
		return git(principal, ['commit-tree', arbre, '-p', 'origin/main', '-m', message]);
	} finally {
		rmSync(dossier, { recursive: true, force: true });
	}
}

/**
 * Choisit et réserve. Rien n'est écrit tant que le push n'a pas réussi : un
 * échec laisse au plus un objet git orphelin, jamais un fichier modifié ni un
 * commit local à pousser.
 */
function reserverSurMain(principal: string, noms: string[], essai: boolean): Lot[] {
	for (let essaiDePush = 1; essaiDePush <= ESSAIS_DE_PUSH; essaiDePush++) {
		recupererMain(principal);
		const texte = lireOrigine(principal);
		const { pris, refus } = choisir(lireLots(texte), noms);
		for (const r of refus) console.log(`- ${r.nom} : ${r.raison}`);
		if (pris.length === 0) {
			console.log('Aucun lot à prendre.');
			return [];
		}
		console.log(`Lots pris : ${pris.map((l) => l.nom).join(', ')}`);
		if (essai) return pris;

		const commit = commitDeReservation(
			principal,
			reserver(texte, pris, aujourdhui()),
			messageDeCommit(pris)
		);
		const push = essayerGit(principal, ['push', 'origin', `${commit}:refs/heads/main`]);
		if (push.ok) {
			console.log('Réservation poussée sur main.');
			return pris;
		}
		if (!/rejected|fetch first|non-fast-forward/i.test(push.erreur)) {
			throw new OutilsError(`Push refusé, rien n'est réservé : prévenir David.\n${push.erreur}`);
		}
		console.log('main a bougé pendant la réservation : relecture.');
	}
	throw new OutilsError(`Push refusé ${ESSAIS_DE_PUSH} fois, rien n'est réservé : prévenir David.`);
}

function tmux(args: string[]): boolean {
	return spawnSync('tmux', args, { stdio: 'ignore' }).status === 0;
}

/** Worktree, fichiers d'environnement, fenêtre tmux. Un lot qui échoue n'arrête pas les autres. */
function ouvrirSession(principal: string, lot: Lot, essai: boolean): boolean {
	const nom = sujet(lot.nom);
	const worktree = resolve(principal, '..', `ubumaths-wt-${nom}`);
	const branche = `feat/${nom}`;
	const commande = commandeDeSession(lot.nom, principal, worktree);
	if (essai) {
		console.log(`\n[${lot.nom}] worktree ${worktree} (branche ${branche})`);
		console.log(`  tmux ${SESSION_TMUX} : ${commande}`);
		return true;
	}
	if (existsSync(worktree)) {
		console.log(`[${lot.nom}] ${worktree} existe déjà : session non lancée.`);
		return false;
	}
	const ajout = essayerGit(principal, ['worktree', 'add', '-b', branche, worktree, 'origin/main']);
	if (!ajout.ok) {
		console.log(`[${lot.nom}] worktree refusé : session non lancée.\n${ajout.erreur}`);
		return false;
	}
	for (const f of FICHIERS_ENV) {
		if (existsSync(join(principal, f))) copyFileSync(join(principal, f), join(worktree, f));
	}
	// Rien de la session qui lance ne passe à la nouvelle (variables CLAUDE*).
	const variables = Object.keys(process.env)
		.filter((k) => k.startsWith('CLAUDE'))
		.flatMap((k) => ['-u', k]);
	const lancement = ['env', ...variables, 'zsh', '-lc', commande];
	const fenetre = tmux(['has-session', '-t', SESSION_TMUX])
		? tmux(['new-window', '-d', '-t', `${SESSION_TMUX}:`, '-n', nom, '-c', principal, ...lancement])
		: tmux(['new-session', '-d', '-s', SESSION_TMUX, '-n', nom, '-c', principal, ...lancement]);
	if (!fenetre) {
		console.log(`[${lot.nom}] fenêtre tmux refusée ; worktree prêt : ${worktree}`);
		return false;
	}
	console.log(`[${lot.nom}] session ${nom} lancée (tmux ${SESSION_TMUX}:${nom}).`);
	return true;
}

function main(): void {
	const commande = parseArgs(process.argv.slice(2));
	const principal = process.env.OUTILS_DEPOT ?? depotPrincipal();
	if (commande.action === 'liste') {
		recupererMain(principal);
		afficherLots(lireLots(lireOrigine(principal)));
		return;
	}
	if (commande.action === 'reserver') {
		reserverSurMain(principal, [commande.lot], commande.essai);
		return;
	}
	const pris = reserverSurMain(principal, commande.lots, commande.essai);
	if (pris.length === 0) return;
	if (!commande.essai) recupererMain(principal);
	const ratees = pris.filter((lot) => !ouvrirSession(principal, lot, commande.essai));
	if (ratees.length > 0) {
		console.log(
			`\nRéservés mais sans session : ${ratees.map((l) => l.nom).join(', ')} ` +
				`(les ouvrir à la main : /prendre-outil <lot>).`
		);
		process.exitCode = 1;
	}
}

try {
	main();
} catch (e) {
	if (e instanceof OutilsError) {
		console.error(e.message);
		process.exit(1);
	}
	throw e;
}
