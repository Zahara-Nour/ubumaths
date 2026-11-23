/**
 * Reprise des fiches en prod : ce qu'on écrit pour une fiche (ADR 0041)
 * =====================================================================
 *
 * Partie pure du script `reprise-categories.ts` : à partir de la réponse validée
 * par David (page à cocher) et de l'état actuel de la fiche en base, décide quoi
 * écrire, ou pourquoi ne rien écrire. Aucune requête ici : tout se teste.
 *
 * Une fiche n'est écrite que si elle est encore telle qu'au relevé : même titre,
 * ni catégorie ni notion posées. Sinon le prof l'a reprise entre-temps dans
 * l'éditeur, et son choix l'emporte.
 */
import {
	composedTitle,
	isWorksheetCategory,
	type WorksheetCategory
} from '#lib/worksheets/worksheet-title.ts';

// ============================================================================
// Types
// ============================================================================

/** Réponse validée pour une fiche (une ligne du fichier de réponses) */
export interface RepriseReponse {
	id: string;
	/** Titre de la fiche au moment du relevé : garde contre une fiche modifiée depuis */
	titreActuel: string;
	type: 'worksheet' | 'assessment';
	categorie: string | null;
	/** Identifiants des nœuds, dans l'ordre d'impression */
	notions: string[];
	titreLibre: boolean;
}

/** État actuel de la fiche en base */
export interface FicheEnBase {
	id: string;
	title: string;
	type: string;
	category: string | null;
	custom_title: boolean;
	/** Nombre de notions déjà posées */
	nombreNotions: number;
}

/** Nœud de l'arbre connu en base */
export interface NoeudConnu {
	name: string;
	kind: string;
	archived: boolean;
	/** Nom de sa branche dans l'arbre : deux notions d'une même branche → la branche en titre */
	branch: string | null;
}

export interface ChangementFiche {
	type: 'worksheet' | 'assessment';
	category: WorksheetCategory | null;
	custom_title: boolean;
	title: string;
	/** Identifiants des notions, dans l'ordre (position 0, 1, …) */
	notions: string[];
}

export type PlanFiche =
	| { action: 'ecrire'; id: string; avant: FicheEnBase; apres: ChangementFiche }
	| { action: 'sauter'; id: string; raison: string };

// ============================================================================
// Constantes
// ============================================================================

/** Une fiche se classe sous une notion ou une sous-notion, jamais une branche */
const KINDS_ACCEPTES = new Set(['notion', 'subnotion']);

// ============================================================================
// Fonctions
// ============================================================================

export function planFiche(
	reponse: RepriseReponse,
	fiche: FicheEnBase | undefined,
	noeuds: ReadonlyMap<string, NoeudConnu>
): PlanFiche {
	const sauter = (raison: string): PlanFiche => ({ action: 'sauter', id: reponse.id, raison });

	if (!fiche) return sauter('fiche introuvable en base');
	if (fiche.title !== reponse.titreActuel) {
		return sauter(`titre changé depuis le relevé (« ${fiche.title} »)`);
	}
	if (fiche.category !== null || fiche.nombreNotions > 0) {
		return sauter('catégorie ou notions déjà posées (reprise dans l’éditeur)');
	}
	if (fiche.type !== 'worksheet' && fiche.type !== 'assessment') {
		return sauter(`type « ${fiche.type} » hors reprise`);
	}

	if (new Set(reponse.notions).size !== reponse.notions.length) {
		return sauter('notion en double dans la réponse');
	}
	for (const id of reponse.notions) {
		const noeud = noeuds.get(id);
		if (!noeud) return sauter(`notion inconnue (${id})`);
		if (noeud.archived) return sauter(`notion archivée (« ${noeud.name} »)`);
		if (!KINDS_ACCEPTES.has(noeud.kind)) return sauter(`« ${noeud.name} » n’est pas une notion`);
	}

	// Seule la fiche d'exercices a une catégorie et un titre composé
	const exercices = reponse.type === 'worksheet';
	let category: WorksheetCategory | null = null;
	if (exercices && reponse.categorie !== null) {
		if (!isWorksheetCategory(reponse.categorie)) {
			return sauter(`catégorie inconnue (« ${reponse.categorie} »)`);
		}
		category = reponse.categorie;
	}
	const customTitle = exercices ? reponse.titreLibre : true;
	const notions = reponse.notions.map((id) => ({
		name: noeuds.get(id)?.name ?? '',
		branch: noeuds.get(id)?.branch ?? null
	}));
	const title = customTitle ? fiche.title : composedTitle(category, notions);
	if (title === '') return sauter('titre composé vide (ni catégorie ni notion)');

	return {
		action: 'ecrire',
		id: reponse.id,
		avant: fiche,
		apres: {
			type: reponse.type,
			category,
			custom_title: customTitle,
			title,
			notions: reponse.notions
		}
	};
}
