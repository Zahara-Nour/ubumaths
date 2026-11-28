/**
 * `pnpm outils` : réserver les lots d'outils manquants et ouvrir leurs sessions
 * ============================================================================
 *
 *   pnpm outils                          état des lots
 *   pnpm outils lancer [<lot>…] [--essai]
 *   pnpm outils reserver <lot> [--essai]
 *
 * Les lots et leurs règles : docs/wip/outils-lots.md. La réservation est un
 * commit de ce seul fichier sur `main`, depuis le dépôt principal, poussé avant
 * tout travail (comme /prendre-lot pour les écarts). `lancer` crée ensuite,
 * pour chaque lot pris, le worktree `../ubumaths-wt-outil-<lot>` (branche
 * `feat/outil-<lot>`) et une fenêtre tmux dans la session `main` : Claude avec
 * Remote Control, nommé `outil-<lot>`, qui commence par `/prendre-outil <lot>`.
 *
 * Pull ou push en échec, fichier des lots modifié dans le dépôt principal :
 * arrêt, rien n'est lancé (règle de CLAUDE.md : prévenir David).
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
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

// Functions

function git(dossier: string, args: string[], montrer = false): string {
	return execFileSync('git', ['-C', dossier, ...args], {
		encoding: 'utf8',
		stdio: montrer ? ['ignore', 'inherit', 'inherit'] : ['ignore', 'pipe', 'pipe']
	});
}

/** `git … ` dont l'échec n'est pas une exception : code et sortie. */
function essayerGit(dossier: string, args: string[]): { ok: boolean; sortie: string } {
	const r = spawnSync('git', ['-C', dossier, ...args], { encoding: 'utf8' });
	return { ok: r.status === 0, sortie: `${r.stdout}${r.stderr}`.trim() };
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

/**
 * Réserve dans le dépôt principal : pull, écriture, prettier, commit de ce seul
 * fichier, push. Un push refusé = une autre session a écrit : un pull, puis on
 * vérifie que les lots sont toujours à nous avant de repousser.
 */
function reserverDansLePrincipal(principal: string, noms: string[], essai: boolean): Lot[] {
	const chemin = join(principal, FICHIER);
	if (git(principal, ['status', '--porcelain', '--', FICHIER]).trim() !== '') {
		throw new OutilsError(`${FICHIER} est modifié dans le dépôt principal : rien n'est réservé.`);
	}
	if (!essai) {
		const pull = essayerGit(principal, ['pull', '--rebase']);
		if (!pull.ok) throw new OutilsError(`Pull refusé, rien n'est réservé :\n${pull.sortie}`);
	}
	const texte = readFileSync(chemin, 'utf8');
	const lots = lireLots(texte);
	const { pris, refus } = choisir(lots, noms);
	for (const r of refus) console.log(`- ${r.nom} : ${r.raison}`);
	if (pris.length === 0) {
		console.log('Aucun lot à prendre.');
		return [];
	}
	console.log(`Lots pris : ${pris.map((l) => l.nom).join(', ')}`);
	if (essai) return pris;

	writeFileSync(chemin, reserver(texte, pris, aujourdhui()));
	execFileSync('pnpm', ['exec', 'prettier', '--write', FICHIER], {
		cwd: principal,
		stdio: 'ignore'
	});
	git(principal, ['commit', '-m', messageDeCommit(pris), '--', FICHIER], true);
	if (!essayerGit(principal, ['push']).ok) {
		const pull = essayerGit(principal, ['pull', '--rebase']);
		if (!pull.ok) {
			throw new OutilsError(`Push refusé puis pull refusé : prévenir David.\n${pull.sortie}`);
		}
		const relus = lireLots(readFileSync(chemin, 'utf8'));
		const perdus = pris.filter(
			(p) => !relus.find((l) => l.nom === p.nom)?.prisPar.startsWith(sujet(p.nom))
		);
		if (perdus.length > 0) {
			throw new OutilsError(
				`Une autre session a écrit en même temps (${perdus.map((l) => l.nom).join(', ')}) : relire ${FICHIER}.`
			);
		}
		const push = essayerGit(principal, ['push']);
		if (!push.ok) throw new OutilsError(`Push refusé deux fois : prévenir David.\n${push.sortie}`);
	}
	console.log('Réservation poussée.');
	return pris;
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
		console.log(`[${lot.nom}] worktree refusé : session non lancée.\n${ajout.sortie}`);
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
	tmux(['set-option', '-w', '-t', `${SESSION_TMUX}:${nom}`, 'remain-on-exit', 'on']);
	console.log(`[${lot.nom}] session ${nom} lancée (tmux ${SESSION_TMUX}:${nom}).`);
	return true;
}

function main(): void {
	const commande = parseArgs(process.argv.slice(2));
	const principal = process.env.OUTILS_DEPOT ?? depotPrincipal();
	if (commande.action === 'liste') {
		afficherLots(lireLots(readFileSync(join(principal, FICHIER), 'utf8')));
		return;
	}
	if (commande.action === 'reserver') {
		reserverDansLePrincipal(principal, [commande.lot], commande.essai);
		return;
	}
	const pris = reserverDansLePrincipal(principal, commande.lots, commande.essai);
	if (pris.length === 0) return;
	if (!commande.essai) essayerGit(principal, ['fetch', 'origin', 'main']);
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
