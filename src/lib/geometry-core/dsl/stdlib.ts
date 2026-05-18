/**
 * Geometry DSL — stdlib (deprecated content).
 *
 * Historiquement ce fichier contenait des macros stdlib en code DSL (string),
 * parsées et chargées dans le MacroRegistry au démarrage de l'interpréteur.
 *
 * Depuis 2026-05-19, **toutes les constructions stdlib sont implémentées comme
 * builtins TypeScript** dans `dsl/builtins.ts` :
 *
 *   - Lignes/droites : mediatrice, mediane, hauteur, perpendiculaire, parallele,
 *     bissectrice, droite_euler
 *   - Triangles : triangle, triangle_equilateral, triangle_isocele, triangle_rectangle
 *   - Quadrilatères : parallelogramme, rectangle, carre, losange
 *   - Polygones : polygone_regulier, etoile
 *   - Cercles dérivés : corde, cercle_circonscrit, cercle_inscrit, cercle_euler
 *   - Points remarquables : centre_gravite, orthocentre
 *
 * Le mécanisme `macro foo(...): ... retourne ...` du DSL **reste intact**. Il est
 * réservé aux constructions définies par l'utilisateur (paradigme Cabri / CarMetal /
 * GeoGebra Custom Tools), pas à des compositions de stdlib.
 *
 * `STDLIB_MACROS` est laissé en string vide pour préserver l'API d'import dans
 * `interpreter.ts:loadStdlib()` — qui peut donc continuer à parser sans rien charger.
 */

export const STDLIB_MACROS = ``;
