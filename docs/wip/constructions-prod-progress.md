# Constructions de la prod — journal

## Reprendre ici

_Mis à jour le 2026-10-24, après #1659._

- **État** : #1659 mergée : 3 constructions réécrites, titres et descriptions accentués et sans nom d'auteur pour les 9, « Repérage de points » dépublié (dans `scripts/constructions-prod/contenu.ts`, rien d'écrit en prod) ; le compas s'ouvre à sa première utilisation ; ligne « Auteur » retirée des pages, nom d'auteur retiré de l'API. Worktree supprimé.
- **Prochaine action** : David, depuis le dépôt principal à jour : `pnpm constructions:reecrire --cible prod` (simulation + sauvegarde `scripts/constructions-prod/avant-2026-10-23.json`), puis Claude commite la sauvegarde (petite PR, fichier hors `docs/`), puis David relance avec `--publier`.
- **En attente de David** : la relecture du partage et de la symétrie (aperçu local : `pnpm constructions:reecrire --cible local` puis `/constructions` sur 5175) ; le lancement en prod (lecture de la prod par script refusée à Claude) ; suite possible : ne renvoyer `author_id` qu'à l'auteur.
- **Pièges en cours** : `M'` refusé comme identifiant (point `Ms`, nom masqué, texte « M′ ») ; une droite affectée affiche son nom (« d1 », « d2 ») ; « avant la prod » = rien n'est livré aux élèves tant que `--publier` n'a pas tourné (pas besoin de `deploy:prod` pour le contenu, mais la ligne auteur et le compas, eux, attendent le `deploy:prod`).
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
