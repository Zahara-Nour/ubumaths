# Constructions de la prod — journal

## Reprendre ici

_Mis à jour le 2026-10-24, après #1659, #1662 et l'écriture en prod._

- **État** : contenu ÉCRIT EN PROD le 2026-10-24 (`constructions:reecrire --cible prod --publier`, 9 lignes, relu par MCP : 8 publiques, repérage dépublié, aucun nom d'auteur, aucun `NaN` dans les publiques). Sauvegarde d'avant : `scripts/constructions-prod/avant-2026-10-23.json` (#1662). Le code de #1659 (compas qui s'ouvre, ligne « Auteur » et nom retirés des pages et de l'API) attend le prochain `deploy:prod`.
- **Prochaine action** : aucune ; chantier à verser (`docs/systeme/` déjà à jour) et journal à archiver après les vérifications de David.
- **En attente de David** : vérifications (ligne #1659 de `verifications-manuelles.md`) ; partage et symétrie publiés sans sa relecture (choix de David : « publie dès le merge ») ; suite possible : ne renvoyer `author_id` qu'à l'auteur.
- **Pièges en cours** : `M'` refusé comme identifiant (point `Ms`, nom masqué, texte « M′ ») ; une droite affectée affiche son nom (« d1 », « d2 » du partage). Retour arrière : réécrire les colonnes depuis la sauvegarde.
- **Worktree / branche** : aucun.

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
