/**
 * Galerie des templates de carnets : qui peut y figurer
 *
 * Un template PARTAGÉ n'apparaît que si son auteur est professeur ou
 * administrateur. Sans ce filtre, un élève qui passait son propre carnet en
 * `is_template = true, is_public = true` (PostgREST direct) l'affichait dans la
 * galerie du professeur ; en le clonant, le professeur devenait auteur de la
 * copie, donc rendait et exécutait le code de l'élève.
 *
 * Défense côté code, AVANT la migration qui retire cette écriture aux élèves
 * (« seuls le prof et l'admin publient », décision de David du 2026-10-04).
 *
 * Un auteur illisible (profil masqué par la RLS, `profiles` nul) est écarté :
 * l'absence de preuve vaut refus.
 *
 * @module server/notebook-template-gallery
 */

/** Ce qu'il faut d'un template pour décider s'il figure dans la galerie. */
export type GalleryTemplateCandidate = {
	author_id: string;
	is_public: boolean | null;
	profiles: { role: string | null } | null;
};

const ROLES_EDITEURS = new Set(['teacher', 'admin']);

/** Les templates à montrer à `userId` : les siens, et les partagés d'un prof ou admin. */
export function filterGalleryTemplates<T extends GalleryTemplateCandidate>(
	templates: T[],
	userId: string
): T[] {
	return templates.filter(
		(t) =>
			t.author_id === userId || (t.is_public === true && ROLES_EDITEURS.has(t.profiles?.role ?? ''))
	);
}
