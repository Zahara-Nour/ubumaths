/**
 * Boutique d'avatars — familles et forme des données partagées client / serveur
 * ============================================================================
 *
 * Décisions de David du 2026-11-06 (docs/wip/boutique-avatars-progress.md) :
 * avatars achetés en gidouilles, à prix fixe, une fois pour toutes ; l'avatar
 * porté remplace la photo Google partout. La base tient les règles
 * (migration 20261106164739 : `avatar_catalog`, `student_avatars`, `buy_avatar`,
 * `set_worn_avatar`) ; ici, seulement l'affichage.
 */

// Types
export type AvatarFamily =
	'emblem' | 'galopin' | 'polyhedron' | 'creature' | 'puppet' | 'animal' | 'automaton' | 'almanac';

/** Un avatar tel que la boutique l'affiche à l'élève. */
export interface ShopAvatar {
	key: string;
	family: AvatarFamily;
	name: string;
	price: number;
	/** Image servie par l'appli (/avatars/….webp) */
	imagePath: string;
	/** Fin de la fenêtre de vente (séries de l'Almanach), ISO ; null = pas de borne */
	availableUntil: string | null;
	/** En vente maintenant (actif et dans sa fenêtre) */
	onSale: boolean;
	/** Déjà acheté par l'élève */
	owned: boolean;
}

/** Réponse de GET /api/student/avatars. */
export interface AvatarShop {
	avatars: ShopAvatar[];
	/** Clé de l'avatar porté, null si aucun */
	worn: string | null;
}

// Constantes
/** Ordre d'affichage des familles et leur titre. */
export const AVATAR_FAMILIES: readonly { id: AvatarFamily; label: string }[] = [
	{ id: 'almanac', label: 'Séries de l’Almanach' },
	{ id: 'emblem', label: 'Emblèmes du Royaume' },
	{ id: 'galopin', label: 'Galopins et Galopines' },
	{ id: 'polyhedron', label: 'Polyèdres d’Achras' },
	{ id: 'creature', label: 'Créatures des Mathres' },
	{ id: 'puppet', label: 'Marionnettes du Théâtre' },
	{ id: 'animal', label: 'Animaux de la Cour' },
	{ id: 'automaton', label: 'Automates de Turingrad' }
];

export const AVATAR_FAMILY_IDS = AVATAR_FAMILIES.map((f) => f.id) as [
	AvatarFamily,
	...AvatarFamily[]
];

/** Clé du catalogue : même contrainte qu'en base (`avatar_catalog_key_check`). */
export const AVATAR_KEY_PATTERN = /^[a-z0-9_]{1,50}$/;
