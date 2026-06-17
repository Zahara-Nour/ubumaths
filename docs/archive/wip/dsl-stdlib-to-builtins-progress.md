# Migration stdlib → builtins : Progression

> Session : 2026-05-19
> Plan : `/Users/david/.claude/plans/reflective-munching-catmull.md`
> Statut : **LIVRÉ** (6/6 commits)

## Contexte

Conversion des 23 macros de `dsl/stdlib.ts` en builtins TypeScript dans `dsl/builtins.ts`. Chaque builtin produit 1 objet principal ; les sous-produits (points intermédiaires) sont créés directement invisibles (`{ visible: false }`).

Mécanisme `macro foo(...):` du DSL conservé, désormais réservé aux utilisateurs qui veulent enregistrer leurs propres constructions (paradigme Cabri/CarMetal/GeoGebra Custom Tools).

## Commits livrés (6)

| #   | Commit                                                                                                                | Hash        |
| --- | --------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | `feat(dsl): migrate 5 line/segment macros to builtins` (mediatrice, perpendiculaire, parallele, mediane, bissectrice) | `2f85f5677` |
| 2   | `feat(dsl): migrate 4 triangle macros to builtins`                                                                    | `d4deb76ae` |
| 3   | `feat(dsl): migrate 4 quadrilateral macros to builtins`                                                               | `137cfafc7` |
| 4   | `feat(dsl)!: migrate polygone_regulier and etoile to builtins (BREAKING)`                                             | `f6779041d` |
| 5   | `feat(dsl): migrate corde + 3 cercle macros to builtins`                                                              | `7c9248c6d` |
| 6   | `feat(dsl): migrate 4 remarkable points + cleanup stdlib + docs`                                                      | ce commit   |

## 23 builtins migrés

### Lignes/droites (5)

- `mediatrice(A, B)` → droite
- `perpendiculaire(P, A, B)` → droite
- `parallele(P, A, B)` → droite
- `mediane(A, B, C)` → segment
- `bissectrice(A, V, B)` → droite

### Triangles (4)

- `triangle(A, B, C)` → polygone
- `triangle_equilateral(A, B)` → polygone
- `triangle_isocele(A, B, angle=40)` → polygone
- `triangle_rectangle(A, B, angle=45)` → polygone + marque d'angle droit

### Quadrilatères (4)

- `parallelogramme(A, B, C)` → polygone
- `rectangle(A, B, largeur=2)` → polygone + marque
- `carre(A, B)` → polygone + marque
- `losange(A, B, angle=60)` → polygone

### Polygones itératifs (2) — **BREAKING**

- `polygone_regulier(O, r, n)` → polygone
- `etoile(O, r, n, saut=2)` → polygone

Breaking : avant retournaient un array de points (`P[i]` accessible) ; maintenant retournent un polygone unique. Sommets via `sommet(p, i)` / `sommets(p)`.

### Cercles dérivés (4)

- `corde(c, d)` → segment (auto-swap c/d, 2 intersectionLC cachées)
- `cercle_circonscrit(A, B, C)` → cercle (formule de Cramer pour le centre)
- `cercle_inscrit(A, B, C)` → cercle (incenter barycentrique + Héron)
- `cercle_euler(A, B, C)` → cercle (via circumcenter + orthocentre)

### Points remarquables (4)

- `centre_gravite(A, B, C)` → point ((A+B+C)/3)
- `orthocentre(A, B, C)` → point (Euler : H = A+B+C-2·O)
- `hauteur(A, B, C)` → droite
- `droite_euler(A, B, C)` → droite (détecte triangle équilatéral)

## Helpers introduits

Tous dans `dsl/builtins.ts` (section "Stdlib builtins") :

- `createHiddenPoint(figure, x, y): string` — wrapper `createFreePoint({x, y}, { visible: false })`.
- `pointXY(figure, val, name, line): { x, y }` — résout un arg positionnel en (x, y) math via `figure.getPosition` + `geoToNumber`.
- `requireNPoints(ctx, n, names, macroName, syntaxForm)` — validation d'arity + retourne ids + coords.
- `computeCircumcenter(A, B, C): { x, y } | null` — formule de Cramer pour le circumcenter. Retourne null si collinéaires.

## Tests

Suite finale : **1799/1799 verts**.

Aucune régression. Les tests existants dans `stdlib.test.ts` testent des propriétés sémantiques (type de retour, positions, distances) qui sont préservées. Quelques tests adaptés pour les BREAKING (polygone_regulier, etoile) : passage de `comptage de segments` à `vérification du polygon.dependsOn.length`.

## stdlib.ts après migration

Fichier devenu trivial : `export const STDLIB_MACROS = "";` avec un docstring qui explique pourquoi (et où sont les nouveaux builtins). Le mécanisme de chargement dans `interpreter.ts:loadStdlib()` continue de fonctionner — il parse une string vide, ne charge aucune macro, et l'utilisateur peut toujours définir ses propres macros dans son script.

## Bénéfices mesurables

- **Figure plus propre** : un script qui crée 10 cercles circonscrits passe de 90 éléments fantômes à 10 cercles + 10 centres cachés.
- **Performance** : `recompute()` parcourt moins de nœuds dans le graphe (sur un script avec 10 cercles_circonscrits, ~80% de réduction du nombre de nœuds).
- **Erreurs ciblées** : un mauvais usage de `cercle_circonscrit` ne déclenche plus une erreur dans `mediatrice` ou `milieu` (cascade d'appels macro), mais directement dans le builtin nommé.
- **Architecture cohérente** : tout est TypeScript typé, plus de DSL inline parsé à chaque init de l'interpréteur.

## Cap suivant

La directive `@construction(direct|compas|regle|...)` côté constructions-v2 est un plan séparé, désormais débloqué : on a maintenant un mapping uniforme `nom_builtin → chorégraphie` à implémenter, sans cas spécial macro vs builtin.
