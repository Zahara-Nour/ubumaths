# Listes en colonnes (`:colonnes N`) — progression

Branche `feat/liste-colonnes`, worktree `../ubumaths-wt-colonnes`. Démarré le 2026-09-25.

## Décisions de David (2026-09-25)

- Marqueur explicite `:colonnes N` sur la ligne avant la liste (même style que `:table-h`).
- Nombre de colonnes configurable : 2, 3 ou 4.
- Pas de bouton dans l'éditeur riche pour l'instant : il doit seulement CONSERVER le marqueur.
- Spécification 1 à 13 validée telle quelle (ci-dessous).

## Spécification validée

1. `:colonnes 2` avant une liste (numérotée ou à puces) → liste sur 2 colonnes, énoncés et corrigés.
2. Ordre de lecture en LIGNES (a) b) / c) d)). Seul ordre fiable dans le PDF : `columns()` de Typst ne se
   répartit pas dans une page déjà en deux colonnes (mesuré, compilateur de prod) → grille. Écran : même ordre.
3. Numérotation inchangée : style par profondeur (a), 1), i)), numéro de départ.
4. N ∈ {2, 3, 4}.
5. Sous-liste : le marqueur, au retrait de la sous-liste, ne s'applique qu'à elle.
6. Ligne vide tolérée entre le marqueur et la liste (l'éditeur riche en insère une).
7. Nombre d'items non multiple de N : dernière ligne incomplète, alignée à gauche.
8. `:colonnes 1` → liste normale.
9. Item contenant un bloc long (cercle, tableau) : reste dans sa cellule ; pas de repli automatique.
10. N invalide (0, > 4, non numérique) ou marqueur non suivi d'une liste → ligne VISIBLE comme texte.
11. Éditeur riche : le marqueur survit import → édition → export.
12. `stripMarkdown` / résumés : pas de marqueur.
13. Export LaTeX : liste normale (marqueur ignoré).

## Couches touchées

- AST `ListNode.columns?` (`src/lib/ubumark/types/ast.ts`)
- Parseur : `findListBlocks` / `parseBlocks` (`list-parser.ts`, `markdown-parser.ts`), modèle `:table-h`
- Typst : `generateList` (`typst-generator.ts`) → `#grid` + `enum.item(n)`
- Écran : `ListNode.svelte` (grille CSS)
- Éditeur : `markdown-import.ts` / `markdown-export.ts` + extension de liste (attribut `columns`)

## État

- [x] Tests rouges puis verts : parseur (26), Typst + LaTeX (7), écran (4, client), éditeur (9, dont schéma)
- [x] Implémentation (commit be73bc38e)
- [x] PDF réel compilé avec le compilateur de prod (sous-liste 3 colonnes, liste 2 colonnes départ à 3)
- [x] Non-régression : empreinte AST + Typst des 973 textes de la prod identique à `main`
- [x] code-reviewer : aucune régression sans marqueur ; cas limites #1, #2, #3, #5, #6 corrigés (d06f2a488)
      par une lecture en avance (marqueur consommé seulement s'il ouvre une NOUVELLE sous-liste du dernier
      item, sinon texte ordinaire). #4 toléré (retrait du marqueur non vérifié : sans danger).
- [x] typecheck 0 erreur, PR #432, CI verte, fusionnée le 2026-09-25

## Hors lot (décision David)

- Bouton « colonnes » dans l'éditeur riche : plus tard.
