/**
 * Images du contenu — ce que `pnpm db:seed-riche` copie du stockage de la prod
 * =============================================================================
 *
 * Décision de David du 2026-11-21 (journal seed-complet § 4, question 3) : les
 * images du contenu sont copiées, jamais les pièces jointes des élèves ni les
 * captures des signalements. Les 4 compartiments copiés sont PUBLICS en prod :
 * les copier ne donne à personne un accès qu'il n'avait pas.
 *
 * Les chemins suivent la règle du contenu : le dossier du prof de la prod (son
 * identifiant) devient celui du prof local ; un chemin qui garderait un
 * identifiant de la prod n'est jamais copié.
 *
 * Module pur (testé sans réseau ni base : scripts/__tests__/db-seed-images.test.ts).
 */

import { detecterFuite, remplacerIds } from './regles';

/** Compartiments publics du contenu : copiés fichier par fichier, même chemin. */
export const COMPARTIMENTS_COPIES: readonly string[] = [
	'question-images',
	'exercise-images',
	'vip-card-images',
	'parody-evaluations'
];

/** Fichiers d'élèves, captures, documents du Drive : jamais lus, laissés vides. */
export const COMPARTIMENTS_JAMAIS: readonly string[] = [
	'message-attachments',
	'chat-attachments',
	'bug-report-screenshots',
	'chapter-documents'
];

/** Un fichier du stockage, tel que le rend la liste d'un compartiment. */
export interface Fichier {
	chemin: string;
	taille: number;
}

/**
 * Fichiers à télécharger : ceux de la prod absents en local, ou présents avec
 * une autre taille. Une relance ne retélécharge rien de ce qui est déjà là.
 */
export function fichiersATelecharger<T extends Fichier>(
	prod: readonly T[],
	local: readonly Fichier[]
): T[] {
	const tailles = new Map(local.map((f) => [f.chemin, f.taille]));
	return prod.filter((f) => tailles.get(f.chemin) !== f.taille);
}

/**
 * Chemin local d'un fichier de la prod : identifiants du prof et de l'admin remplacés
 * par ceux des comptes locaux. `null` si le chemin garde un identifiant de la prod
 * (un autre utilisateur) ou une adresse : le fichier n'est pas copié.
 */
export function cheminLocal(
	chemin: string,
	correspondance: ReadonlyMap<string, string>,
	interdits: { ids: readonly string[]; noms: readonly string[] }
): string | null {
	const local = remplacerIds(chemin, correspondance);
	return detecterFuite({ chemin: local }, interdits) ? null : local;
}

function prefixe(base: string, compartiment: string): string {
	return `${base.replace(/\/+$/, '')}/storage/v1/object/public/${compartiment}/`;
}

/**
 * Remplace, partout dans `valeur` (texte, tableaux, objets jsonb), l'adresse
 * publique de la prod d'un compartiment copié par celle du stockage local. Les
 * adresses d'un autre compartiment, ou d'un autre hôte, restent telles quelles.
 * Rend une copie ; `valeur` n'est pas modifiée.
 */
export function reecrireAdresses<T>(valeur: T, source: string, cible: string): T {
	const paires = COMPARTIMENTS_COPIES.map((c) => [prefixe(source, c), prefixe(cible, c)] as const);
	const parcourir = (v: unknown): unknown => {
		if (typeof v === 'string') {
			return paires.reduce((texte, [de, vers]) => texte.split(de).join(vers), v);
		}
		if (Array.isArray(v)) return v.map(parcourir);
		if (v !== null && typeof v === 'object' && !(v instanceof Date)) {
			return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, parcourir(x)]));
		}
		return v;
	};
	return parcourir(valeur) as T;
}
