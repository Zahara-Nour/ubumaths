# Chantier `cours-suites` — questions de cours sur les suites (1re spé)

## Reprendre ici

_Mis à jour le 2026-11-11 : retours de David sur A1 (`57129cb5`)._

- **Retours A1 (2026-11-11)** : (1) bouton « Voir la réponse » de l'onglet Entraînement ≠ flèche des flash-cards → **renvoyé au chantier [`formes-de-serie`](../archive/wip/formes-de-serie-progress.md)** (une carte de cours n'est jamais en Entraînement, la question est la forme elle-même) ; (2) correction concise / détaillée : un seul champ + marqueurs (ADR 0017), aucune des 30 cartes n'a de marqueur → piste (a) « marquer les détails des 30 cartes » proposée, **réponse de David attendue** ; (3) au verso, le bouton de retournement recouvre le texte (place réservée seulement si `height`, `FlashCard.svelte:607`) → correctif de code à faire (PR, worktree)
- **État** : 30 brouillons « Cours : … » rangés et tagués en prod (migration `20261109224738` appliquée le 2026-11-10, vérifiée : 30 nœuds, 30 tags) ; marqueur « question de cours » posé sur « Démontrer la somme 1 + 2 + ⋯ + n » et « … 1 + q + ⋯ + qⁿ » (`updated_at` intact) · **Prochaine action** : lire les verdicts de `/dev/modeles` sur la série temporaire (30 attendus), corriger les « À revoir », puis `publier-lot.ts --dir scripts/questions/1spe-cours-suites` en simulation · **En attente de David** : relecture dans `/dev/modeles?serie=501be155-59d9-4cc2-b6bd-d39e6fd366e8`, série prod « ⏳ TEMPORAIRE — relecture cours suites 1re spé », À SUPPRIMER après validation (la page à cocher LBN4FL6QfnvYKBpg4du6AZ est abandonnée) (B7, C15 : étapes à ranger non dessinées, à jouer dans l'aperçu) · **Pièges en cours** : réponses des étapes à ranger = places dans l'ordre affiché (`scripts/questions/ranger-attendus.ts`) ; le hook du commit reformate les JSON · **Worktree / branche** : aucun (retiré après #2531) ; prochaine PR → nouveau worktree `ubumaths-wt-cours-suites`

## Décisions (David, 2026-11-09)

- Liste de 31 questions de cours validée (« la liste me convient, écris les modèles en brouillon »).
- Règle des cartes (PR #2528) : une carte de cours, non évaluable, n'est retirée que des formes qui
  corrigent ; une question de cours évaluable passe partout.
- Geste « associer deux colonnes » : à créer, chantier à part (`docs/wip/outils-manquants.md` n° 27) ;
  la n° 11 est un QCM en attendant.

## Écarts à la liste (à valider)

- **n° 24, 25 non écrites** : les modèles « Démontrer la somme 1 + 2 + ⋯ + n » et « … 1 + q + ⋯ + qⁿ »
  ont déjà une variation « Remets les étapes ». Proposition : leur poser le marqueur « question de cours ».
- **n° 22 dédoublée** (D22a, D22b) : un point par modèle (1SPE-226 arithmétique, 1SPE-227 géométrique).
- **n° 11 (B11)** rangée sous 1SPE-214 (accroissements constants) alors qu'elle mêle situations
  arithmétiques et géométriques (1SPE-217).

## Rangement proposé (un point par modèle, ADR 0020)

| Fichier | Titre                                                                 | Point    |
| ------- | --------------------------------------------------------------------- | -------- |
| A1      | Cours : deux façons de définir une suite                              | 1SPE-211 |
| A2      | Cours : suite définie explicitement ou par récurrence ?               | 1SPE-368 |
| A3      | Cours : vrai ou faux sur les modes de génération d'une suite          | 1SPE-368 |
| A4      | Cours : notations uₙ₊₁, uₙ + 1, (uₙ)                                  | 1SPE-212 |
| B5      | Cours : définition d'une suite arithmétique                           | 1SPE-213 |
| B6      | Cours : formule du terme général d'une suite arithmétique             | 1SPE-371 |
| B7      | Cours : démontrer qu'une suite est arithmétique (étapes)              | 1SPE-213 |
| B8      | Cours : quelle méthode pour une suite arithmétique ?                  | 1SPE-213 |
| B9      | Cours : vrai ou faux sur les suites arithmétiques                     | 1SPE-213 |
| B10     | Cours : sens de variation d'une suite arithmétique selon sa raison    | 1SPE-228 |
| B11     | Cours : arithmétique ou géométrique ? (situation)                     | 1SPE-214 |
| B12     | Cours : représentation graphique d'une suite arithmétique             | 1SPE-372 |
| C13     | Cours : définition d'une suite géométrique                            | 1SPE-216 |
| C14     | Cours : formule du terme général d'une suite géométrique              | 1SPE-373 |
| C15     | Cours : démontrer qu'une suite est géométrique (étapes)               | 1SPE-216 |
| C16     | Cours : coefficient multiplicateur d'une évolution                    | 1SPE-217 |
| C17     | Cours : vrai ou faux sur le sens de variation d'une suite géométrique | 1SPE-229 |
| C18     | Cours : quand une suite géométrique est-elle croissante ?             | 1SPE-229 |
| C19     | Cours : trouver l'erreur (suite géométrique)                          | 1SPE-216 |
| D20     | Cours : formule de 1 + 2 + ⋯ + n                                      | 1SPE-215 |
| D21     | Cours : formule de 1 + q + ⋯ + qⁿ                                     | 1SPE-218 |
| D22a    | Cours : somme de termes consécutifs d'une suite arithmétique          | 1SPE-226 |
| D22b    | Cours : somme de termes consécutifs d'une suite géométrique           | 1SPE-227 |
| D23     | Cours : nombre de termes d'une somme                                  | 1SPE-226 |
| E26     | Cours : méthodes pour le sens de variation d'une suite                | 1SPE-219 |
| E27     | Cours : choisir la méthode pour le sens de variation                  | 1SPE-219 |
| E28     | Cours : vrai ou faux sur le sens de variation d'une suite             | 1SPE-219 |
| E29     | Cours : trouver l'erreur (sens de variation)                          | 1SPE-219 |
| F30     | Cours : conjecturer une limite à partir d'une description             | 1SPE-231 |
| F31     | Cours : vrai ou faux sur la limite d'une suite                        | 1SPE-220 |

## Journal

- 2026-11-09 : script `docs/wip/questions/lot-1spe-cours-suites.py` ; `create-questions` en simulation :
  30 fichiers verts ; sonde des formules (40 tirages par modèle) : 0 problème ; créés en base locale
  (copie des fichiers), rendu vérifié dans l'aperçu admin (carte, étapes à ranger, choix multiples).
- 2026-11-09 : migration nœud + tag + marqueur (branche `feat/rangement-cours-suites-1spe`) ; aucune
  carte de révision d'élève sur les deux « Démontrer la somme… » (relevé MCP) ; `.tmp-sonde/` trié :
  `scripts/questions/ranger-attendus.ts` gardé, le reste jeté.
- 2026-11-10 : #2531 mergée, `db:migrate` depuis le dépôt principal (le worktree n'est pas lié à
  Supabase), vérification en prod par MCP. `security-auditor` : aucun finding bloquant (deux points
  faibles notés : `lock_timeout` sans effet hors bloc de transaction, statut brouillon des 30 non gardé).
- 2026-11-10 : page à cocher générée (`page-a-cocher.ts`, base prod, 30 fiches, 2 alertes « bloc ranger non dessiné ») et publiée : https://claude.ai/artifact/LBN4FL6QfnvYKBpg4du6AZ (capacité `db`, collection `verdicts` vide au départ).
- 2026-11-10 : `/dev/modeles` filtre désormais par titre, point et série (#2533) : « ?titre=Cours » montre le rendu des 30 brouillons.
