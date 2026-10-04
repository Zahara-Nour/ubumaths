/**
 * Carnet Python d'un ÉLÈVE ouvert par quelqu'un d'autre
 * =====================================================
 *
 * Décision de David (2026-10-04), après l'audit du même jour : quand l'auteur
 * d'un carnet est un élève ET que le lecteur n'est pas cet élève,
 * - le rendu est RESTREINT (markdown des cellules, sorties) : le contenu d'un
 *   élève ne doit ni recouvrir l'écran du prof ni lui faire charger une URL ;
 * - le carnet ne s'EXÉCUTE pas : le worker Pyodide est de même origine que
 *   l'application, le code de l'élève tournerait avec la session du prof.
 *
 * Inventaire de l'accès (routes `python-notebook/[id]` et `/present`) : un
 * lecteur non auteur est soit un PROF (carnet public), soit un ÉLÈVE à qui le
 * carnet est ASSIGNÉ. L'assignation n'est pas une copie : l'élève ouvre le
 * carnet du prof. Et seul l'auteur d'un carnet peut l'assigner, à une classe
 * dont il est le prof (policy INSERT de `python_notebook_assignments`) : un
 * élève non auteur lit donc toujours le carnet d'un prof.
 *
 * Le rôle de l'auteur vient d'une jointure sur `profiles`, soumise à la RLS :
 * illisible → repli FERMÉ (traité comme un élève).
 *
 * @module utils/notebook-foreign-content
 */

/** Rôles dont le contenu est rendu et exécuté sans restriction */
const TRUSTED_AUTHOR_ROLES: ReadonlySet<string> = new Set(['teacher', 'admin']);

export interface ForeignNotebookInput {
	/** Le lecteur est-il l'auteur du carnet ? */
	isOwner: boolean;
	/** Rôle du lecteur (`profiles.role`) */
	viewerRole: string;
	/** Rôle de l'auteur, `null` si la RLS le masque */
	authorRole: string | null | undefined;
}

/** Carnet d'élève lu par un autre que lui : rendu restreint, exécution interdite. */
export function isForeignStudentNotebook({
	isOwner,
	viewerRole,
	authorRole
}: ForeignNotebookInput): boolean {
	if (isOwner) return false;
	// Élève non auteur = carnet assigné, donc écrit par un prof (cf. en-tête).
	// Défense en profondeur : un auteur VU comme élève reste restreint si
	// l'invariant de la policy venait à céder. Rôle illisible (`null`) : OUVERT
	// pour l'élève — depuis le retrait des profils lisibles par tous, un élève
	// peut ne pas voir le profil de son prof ; fermer ici verrouillerait tout
	// carnet assigné (présentation comprise).
	if (viewerRole === 'student') return authorRole === 'student';
	return !TRUSTED_AUTHOR_ROLES.has(authorRole ?? '');
}
