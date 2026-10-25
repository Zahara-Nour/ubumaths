/**
 * Catalogue des blocs ubumark — types communs
 * ===========================================
 *
 * Un fichier par bloc (`horloge.ts`, `operation.ts`…) décrit ses réglages et
 * ses exemples. Ils sont écrits une fois et repris par l'aide à l'écriture
 * (`/aide-ecriture/blocs/…`, prof) et par la vitrine (`/demo/blocs`, public).
 * Chaque exemple passe par `parseMarkdown` dans un test : un exemple refusé
 * fait échouer la CI (`__tests__/catalogue.test.ts`).
 *
 * Chantier : `docs/wip/catalogue-blocs-progress.md`.
 *
 * @module block-catalog/types
 */

/** Type du nœud attendu après `parseMarkdown` (champ `type` du premier bloc) */
export type CatalogNodeType =
	| 'variation-table'
	| 'probability-tree'
	| 'trig-circle'
	| 'number-line'
	| 'courbe'
	| 'figure'
	| 'stat-chart'
	| 'qr'
	| 'horloge'
	| 'operation';

/** Une ligne du tableau des réglages */
export interface BlockSetting {
	/** Clé telle qu'on l'écrit, sans les deux-points (`heure`, `taille`) */
	key: string;
	/** Valeurs possibles, en clair (`tous | quarts | aucun`, `2 à 8 cm`) */
	values: string;
	/** Valeur par défaut ; `null` = réglage obligatoire */
	defaultValue: string | null;
	/** Une phrase : ce que fait le réglage */
	description: string;
}

/** Un groupe de réglages (un genre statistique, une opération…) */
export interface BlockSettingGroup {
	/** Titre du groupe ; absent quand le bloc n'a qu'un groupe */
	title?: string;
	settings: BlockSetting[];
}

/** Un exemple correct : rendu, texte à copier, une ligne d'explication */
export interface BlockExample {
	title: string;
	/** Bloc complet, clôtures ``` comprises */
	source: string;
	explanation: string;
}

/** Une erreur typique et ce que voit le prof */
export interface BlockMistake {
	title: string;
	/** Bloc complet, mal écrit, clôtures comprises */
	source: string;
	/**
	 * Morceau du message situé que rend le parseur (vérifié par le test).
	 * Absent pour les blocs qui n'ont pas de message : le bloc s'affiche alors
	 * en texte brut, ou faux, et `explanation` le dit.
	 */
	message?: string;
	/** Ce qui ne va pas et comment le corriger */
	explanation: string;
}

/** La fiche d'un bloc */
export interface BlockCatalogEntry {
	/** Segment d'adresse : `/aide-ecriture/blocs/<slug>` */
	slug: string;
	/** Adresse de la page d'aide quand elle n'est pas `/aide-ecriture/blocs/<slug>` */
	href?: string;
	title: string;
	/** Mots qui ouvrent le bloc (```horloge) ; plusieurs pour les statistiques */
	fences: string[];
	nodeType: CatalogNodeType;
	/** Une phrase pour l'accueil de l'aide */
	summary: string;
	/** Paragraphe d'introduction de la page */
	intro: string;
	settingGroups: BlockSettingGroup[];
	examples: BlockExample[];
	mistakes: BlockMistake[];
	/** Texte prérempli de la zone « Essayer » */
	tryIt: string;
	/** Lien vers une aide plus complète (langage des figures) */
	seeAlso?: { href: string; label: string };
}
