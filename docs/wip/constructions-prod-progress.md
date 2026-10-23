# Constructions de la prod — journal

## Reprendre ici

_Mis à jour le 2026-10-24, PR #1659 ouverte._

- **État** : 3 constructions réécrites (`scripts/constructions-prod/contenu.ts`), titres et descriptions accentués pour les 9, « Repérage de points » dépublié ; script `pnpm constructions:reecrire` (simulation par défaut). Aperçu inséré dans la base LOCALE, serveur 5188 (worktree `-constructions-prod`). Rien d'écrit en prod.
- **Prochaine action** : David regarde l'aperçu sur 5188 ; PR, CI, merge ; puis David lance lui-même `pnpm constructions:reecrire --cible prod` (simulation + sauvegarde), commit de `scripts/constructions-prod/avant-2026-10-23.json` (hors de `data/`, ignoré par git), puis `--publier`.
- **En attente de David** : sa relecture du rendu ; le lancement en prod (la lecture de la prod par un script avec la clé de service est refusée à Claude par le garde-fou).
- **Retours de David** : parallélogramme validé après deux corrections : le compas prend d'abord l'écartement OB (arc de 1° sous B) puis le reporte ; à sa première apparition, le compas part presque fermé et s'ouvre (`compassOpening`, `COMPASS_CLOSED_OPENING` = 0,5, vaut pour toutes les constructions). Partage et symétrie : à relire.
- **Pièges en cours** : un identifiant ne peut pas contenir `'` (`M'` refusé dès la lecture : le script de prod de la symétrie ne se chargeait pas) → point `Ms`, nom masqué, texte « M′ » ; une droite affectée affiche le nom de sa variable, sans moyen de le masquer (« d1 », « d2 » du partage).
- **Worktree / branche** : `../ubumaths-wt-constructions-prod` · `fix/constructions-prod` · serveur 5188.

---

## Constat (prod, lecture seule, 2026-10-23)

9 constructions publiques, toutes issues de l'ancien convertisseur InstrumenPoche, aucune chorégraphie.

| Construction              | Défaut                                                                                                   | Traitement                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Parallélogramme           | [DA] vers un point `NaN`, consignes en double, « le compas de la règle », cadre et `mark_*` d'import     | réécrite ; O par `milieu(A, C) @mesure` (AC = 10 cm)            |
| Partage en 3 parts égales | I = J = K confondus, parallèles vers `NaN`, `£i(A,1)` affiché                                            | réécrite ; parallèles en `parallele(…) @euclide @epure`, codage |
| « Symétrie centrale »     | symétrie AXIALE ; `M' = point(…)` refusé à la lecture (le script ne se chargeait pas) ; [MM′] vers `NaN` | réécrite, titre « Symétrie axiale au compas », codage MH = HM′  |
| Repérage de points        | ni axes ni noms, segments vers `NaN`                                                                     | dépubliée (`is_public = false`), rien supprimé                  |
| Toutes                    | titres et descriptions sans accents                                                                      | accents ; « (Auteur : …) »                                      |

Décisions de David (« je te suis », 2026-10-23) : réécrire les 3, dépublier le repérage, accents pour les 9, relecture du rendu en local avant toute écriture en prod.

Vérification : `scripts/__tests__/constructions-prod.test.ts` (O milieu de [AC] et [BD] ; AM = MN = NB ; NM′ = NM et PM′ = PM), rouge si l'intersection prise est M lui-même ; rendu final regardé sur captures (navigateur de test).
