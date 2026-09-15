/**
 * Atelier — le modèle, sans interface ni réactivité
 *
 * L'atelier POSSÈDE l'état ; les vues (Calcul, Graphe, Données) n'en sont que
 * des projections (décision figée n° 1 du cadrage). Cette classe est le modèle
 * pur : un store Svelte l'enveloppera, ce qui garde cette logique — noms,
 * dépendances, cycle de vie — testable sans runes.
 *
 * Spécification : `docs/wip/atelier-recherche-eleve-phase0.md` §2.
 *
 * @module atelier/atelier
 */

import type { AtelierObject, ObjectKind } from './types';

// =============================================================================
// Types de retour
// =============================================================================

/** Un refus, avec son message déjà en français — l'UI l'affiche tel quel. */
export interface Refused {
	readonly ok: false;
	readonly message: string;
}

export interface Created {
	readonly ok: true;
	readonly object: AtelierObject;
}

export interface Renamed {
	readonly ok: true;
	/** Les autres objets dont la définition a été réécrite (§2.2 N1). */
	readonly updated: readonly string[];
}

export interface Removed {
	readonly ok: true;
	/** Les objets qui dépendaient du supprimé et passent en erreur (§2.4 L1). */
	readonly broken: readonly string[];
}

export interface Updated {
	readonly ok: true;
	readonly object: AtelierObject;
	/** Les objets recalculés en cascade (§2.3 N1). */
	readonly recomputed: readonly string[];
}

/** Ce qu'il faut pour créer un objet. Sans `name`, l'atelier en propose un. */
export interface CreateInput {
	readonly kind: ObjectKind;
	readonly definition?: string;
	readonly name?: string;
}

// =============================================================================
// Atelier
// =============================================================================

export class Atelier {
	/** Les objets, dans leur ordre de création. */
	get objects(): readonly AtelierObject[] {
		throw new Error('Atelier.objects : non implémenté');
	}

	/** Les noms pris, tous types confondus (décision D1). */
	get names(): readonly string[] {
		throw new Error('Atelier.names : non implémenté');
	}

	get(name: string): AtelierObject | undefined {
		void name;
		throw new Error('Atelier.get : non implémenté');
	}

	/**
	 * Créer un objet. Sans `name`, l'atelier propose le premier nom libre.
	 *
	 * Une définition vide donne un objet « incomplet », pas une erreur (§2.1 L2).
	 * Une définition inexploitable donne un objet qui PORTE son erreur (§2.1 E2).
	 */
	create(input: CreateInput): Created | Refused {
		void input;
		throw new Error('Atelier.create : non implémenté');
	}

	/** Renommer. Les définitions qui citent l'ancien nom suivent (§2.2 N1). */
	rename(from: string, to: string): Renamed | Refused {
		void from;
		void to;
		throw new Error('Atelier.rename : non implémenté');
	}

	/** Redéfinir un objet. Ce qui en dépend se recalcule (§2.3). */
	update(name: string, definition: string): Updated | Refused {
		void name;
		void definition;
		throw new Error('Atelier.update : non implémenté');
	}

	/**
	 * Supprimer. Ce qui en dépendait passe en erreur mais ne disparaît pas.
	 *
	 * L'appelant est censé avoir prévenu via `dependents()` (§2.4 L1) ; la
	 * suppression, elle, ne se refuse pas.
	 */
	remove(name: string): Removed | Refused {
		void name;
		throw new Error('Atelier.remove : non implémenté');
	}

	/** Les objets dont la définition cite `name`, directement. */
	dependents(name: string): readonly string[] {
		void name;
		throw new Error('Atelier.dependents : non implémenté');
	}
}
