/**
 * Catalogue des blocs ubumark — sélection de la vitrine `/demo/blocs`
 *
 * Neuf exemples rangés par niveau (phase 0 du 2026-10-25). Le texte du bloc
 * n'est pas recopié : chaque exemple renvoie à un exemple d'une fiche, par le
 * `slug` de la fiche et le titre de l'exemple. Un renvoi cassé fait échouer
 * `__tests__/showcase.test.ts`.
 *
 * @module block-catalog/showcase
 */
import { findBlockEntry } from './index';

// Types

export type ShowcaseLevel = 'primaire' | 'college' | 'lycee';

export interface ShowcaseSection {
	level: ShowcaseLevel;
	title: string;
}

export interface ShowcaseItem {
	level: ShowcaseLevel;
	/** Fiche du catalogue (`horloge`, `operation`…) */
	slug: string;
	/** Titre de l'exemple repris dans la fiche */
	example: string;
	/** Titre et texte pour un visiteur, pas pour le prof */
	title: string;
	text: string;
}

// Constantes

export const SHOWCASE_SECTIONS: ShowcaseSection[] = [
	{ level: 'primaire', title: 'À l’école primaire' },
	{ level: 'college', title: 'Au collège' },
	{ level: 'lycee', title: 'Au lycée' }
];

export const SHOWCASE_ITEMS: ShowcaseItem[] = [
	{
		level: 'primaire',
		slug: 'horloge',
		example: 'Durée entre deux horloges',
		title: 'Lire l’heure',
		text: 'Deux horloges à aiguilles, un départ et une arrivée : combien de temps a duré le trajet ?'
	},
	{
		level: 'primaire',
		slug: 'operation',
		example: 'Division euclidienne',
		title: 'Une division posée',
		text: 'La potence, le quotient et le reste, alignés comme dans le cahier.'
	},
	{
		level: 'primaire',
		slug: 'droite-graduee',
		example: 'Placer des quarts',
		title: 'Une droite graduée',
		text: 'Une unité partagée en quatre, des points à lire ou à placer.'
	},
	{
		level: 'college',
		slug: 'statistiques',
		example: 'Diagramme en barres',
		title: 'Un diagramme en barres',
		text: 'Une ligne par catégorie, et l’effectif écrit au-dessus de chaque barre.'
	},
	{
		level: 'college',
		slug: 'statistiques',
		example: 'Diagramme circulaire',
		title: 'Un diagramme circulaire',
		text: 'Les angles des secteurs se calculent tout seuls à partir des effectifs.'
	},
	{
		level: 'college',
		slug: 'statistiques',
		example: 'Nuage de points avec ajustement affine',
		title: 'Un nuage de points',
		text: 'Les ventes année après année, la droite d’ajustement, son équation et une prévision.'
	},
	{
		level: 'lycee',
		slug: 'variations',
		example: 'Signe de la dérivée et variations',
		title: 'Un tableau de variations',
		text: 'Le signe de la dérivée et les variations de la fonction, dans le même tableau.'
	},
	{
		level: 'lycee',
		slug: 'arbre',
		example: 'Probabilités conditionnelles',
		title: 'Un arbre de probabilités',
		text: 'Deux épreuves à la suite, une probabilité sur chaque branche, les événements contraires barrés.'
	},
	{
		level: 'lycee',
		slug: 'courbe',
		example: 'Points remarquables et tangente',
		title: 'Une courbe et sa tangente',
		text: 'Une parabole, son sommet, un point et une tangente, sur une grille.'
	}
];

// Functions

/** Le bloc complet de l'exemple repris (lève si le renvoi est cassé) */
export function showcaseSource(item: ShowcaseItem): string {
	const example = findBlockEntry(item.slug)?.examples.find((e) => e.title === item.example);
	if (!example) throw new Error(`Exemple introuvable : ${item.slug} / ${item.example}`);
	return example.source;
}
