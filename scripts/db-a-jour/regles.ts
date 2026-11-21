/**
 * `pnpm db:a-jour` : les règles (pures, testées dans scripts/__tests__/db-a-jour.test.ts)
 * ======================================================================================
 *
 * La base LOCALE de dev est partagée par tous les worktrees, et son contenu peut venir de la
 * prod (`pnpm db:seed-riche`). Deux conséquences, mesurées le 2026-11-21
 * (docs/wip/base-locale-progress.md § 9) :
 *
 * - une migration de contenu (rangement, tags, publication) trouve en local des modèles DÉJÀ
 *   dans l'état qu'elle doit produire : sa garde lève une exception, et tout ce qui suit reste
 *   bloqué derrière elle ;
 * - la base porte des migrations d'autres branches, dont le fichier n'existe pas ici.
 *
 * D'où ces règles : on ne regarde que les fichiers présents, dans l'ordre ; une migration de
 * contenu qui échoue sur une base au contenu de la prod est NOTÉE comme faite sans être jouée ;
 * tout autre échec arrête la mise à jour.
 */

import { instructionDeSchema } from '../lib/migrations-de-donnees';

// ============================================================================
// Types
// ============================================================================

export interface Migration {
	/** Les 14 chiffres de l'horodatage. */
	version: string;
	/** Le reste du nom, sans `.sql`. */
	nom: string;
	/** Nom du fichier, tel quel. */
	fichier: string;
}

export interface Echec {
	/** Code SQLSTATE rendu par Postgres, absent pour une panne de connexion. */
	code?: string;
	message: string;
}

export type Decision = { action: 'noter'; raison: string } | { action: 'arreter'; raison: string };

// ============================================================================
// Constantes
// ============================================================================

const FICHIER = /^(\d{14})_([a-z0-9_]+)\.sql$/;

/**
 * Classes SQLSTATE qui disent « le contenu n'est pas dans l'état du relevé » : `P0` (exception
 * levée par une garde, `raise exception`) et `23` (contrainte : la ligne existe déjà, ou son
 * parent manque). Une faute de syntaxe ou un objet inconnu (`42`) n'en fait pas partie.
 */
const CLASSES_ETAT_DU_CONTENU = ['P0', '23'];

// ============================================================================
// Fonctions
// ============================================================================

/** Lit un nom de fichier de migration ; `null` si ce n'en est pas un. */
export function lireFichier(fichier: string): Migration | null {
	const m = FICHIER.exec(fichier);
	return m ? { version: m[1], nom: m[2], fichier } : null;
}

/**
 * Migrations à jouer : les fichiers présents dont la version n'est pas en base, dans l'ordre des
 * versions. Un fichier plus ancien que la dernière version en base compte (branche mergée tard) ;
 * une version en base sans fichier est ignorée (migration d'une autre branche).
 */
export function enAttente(fichiers: readonly string[], appliquees: readonly string[]): Migration[] {
	const faites = new Set(appliquees);
	return fichiers
		.map(lireFichier)
		.filter((m): m is Migration => m !== null && !faites.has(m.version))
		.sort((a, b) => a.version.localeCompare(b.version));
}

/**
 * Sépare les migrations en attente : celles qui sont sur `origin/main` (déjà mergées, donc sûres
 * à jouer sans rien demander) et celles qui n'existent que sur la branche du worktree.
 */
export function separerParOrigine(
	attente: readonly Migration[],
	surMain: ReadonlySet<string>
): { mergees: Migration[]; deLaBranche: Migration[] } {
	return {
		mergees: attente.filter((m) => surMain.has(m.fichier)),
		deLaBranche: attente.filter((m) => !surMain.has(m.fichier))
	};
}

/**
 * Que faire d'une migration qui vient d'échouer (sa transaction est déjà annulée) ?
 *
 * On la note comme faite seulement si les TROIS conditions sont réunies : la base porte le
 * contenu de la prod, la migration ne touche ni le schéma ni les règles d'accès, et l'erreur dit
 * que le contenu n'est pas dans l'état attendu. Dans le doute, on arrête : une migration de
 * schéma sautée en silence coûterait bien plus qu'un arrêt.
 */
export function deciderApresEchec(sql: string, echec: Echec, contenuDeProd: boolean): Decision {
	const schema = instructionDeSchema(sql);
	if (schema) {
		return {
			action: 'arreter',
			raison: `elle touche le schéma ou les règles d'accès (« ${schema.slice(0, 80)} »)`
		};
	}
	if (!contenuDeProd) {
		return {
			action: 'arreter',
			raison: 'la base ne porte pas le contenu de la prod : une migration de contenu doit y passer'
		};
	}
	if (!echec.code || !CLASSES_ETAT_DU_CONTENU.includes(echec.code.slice(0, 2))) {
		return {
			action: 'arreter',
			raison: `l'erreur (${echec.code ?? 'sans code'}) ne vient pas de l'état du contenu`
		};
	}
	return { action: 'noter', raison: 'contenu déjà venu de la prod' };
}

/**
 * Refuse toute cible qui n'est pas la machine locale : cette commande écrit, elle ne doit jamais
 * pouvoir atteindre la prod.
 */
export function verifierCibleLocale(url: string): void {
	let hote: string;
	try {
		hote = new URL(url).hostname;
	} catch {
		throw new Error('URL Postgres illisible : refus d’écrire.');
	}
	if (url.includes('?')) {
		throw new Error('URL Postgres refusée : un paramètre de requête peut remplacer l’hôte.');
	}
	if (!['127.0.0.1', 'localhost'].includes(hote)) {
		throw new Error('La base visée n’est pas locale : refus d’écrire.');
	}
}
