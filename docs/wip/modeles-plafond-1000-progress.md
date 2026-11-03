# Chantier `modeles-plafond-1000` — modèles publiés tronqués à 1 000

## Reprendre ici

_Mis à jour le 2026-11-04, ouverture du chantier (aucune PR encore)._

- **État** : bug diagnostiqué en prod, rien de codé. David a dit « il faut corriger le bug ».
- **Prochaine action** : phase 0 courte (comportements ci-dessous) → test rouge (> 1 000 modèles) → helper de lecture paginée → brancher les lieux touchés → PR.
- **En attente de David** : rien ; `deploy:prod` après merge (sur sa demande seulement).
- **Pièges en cours** : un refus/une troncature PostgREST est SILENCIEUX (pas d'erreur) ; tri stable obligatoire pour paginer (`created_at` nullable → départager par `id`).
- **Worktree / branche** : `../ubumaths-wt-modeles-plafond-1000` · `fix/modeles-plafond-1000` · port 5176.

## Constat (2026-11-04)

- Prod : **1 912 modèles publiés** ; PostgREST rend **1 000 lignes au plus** par requête, sans erreur.
- Effet : Automaths (catalogue), panier, page de test (`/automaths/test`) ne voient que les 1 000 modèles les plus récents (~900 invisibles).
- Découvert sur les séries « Limites de fonctions » (T spé) : « Opérations sur les limites » L1 et « Limite en un point » L2 (rangs 1 080 et 1 081) → catégories sautées en silence (`Série : aucun modèle pour …`), série 1 jouée à 5 questions au lieu de 10, « Aperçu indisponible » dans le panier.
- **Contrôles NON touchés** : `src/lib/server/evaluation-attempts.ts:220` filtre par thème + domaine.

## Lieux à corriger (lecture de tous les modèles publiés, sans pagination)

- `src/routes/(public)/automaths/+page.server.ts:38`
- `src/routes/(public)/automaths/panier/+page.server.ts:13`
- `src/routes/(public)/automaths/test/+page.server.ts:33`
- `src/routes/api/questions/templates/all/+server.ts:31`
- `src/routes/api/questions/categories/all/+server.ts:33` et `categories/+server.ts:34` (colonnes réduites, mais même plafond)
- `src/routes/(protected)/dashboard/admin/questions/+page.server.ts:219` (thème/domaine/sous-domaine de tous les modèles)
- À vérifier (requêtes multi-lignes non relevées par le grep) : `srs/chapter-deck.ts`, `curriculum-coverage.ts`, `revisions/decks/programme`, `api/srs/*`, `template-review.ts`, `cahier-texte`.

## Comportements (phase 0, à valider)

- Nominal : avec N > 1 000 modèles publiés, les pages rendent les N.
- Limite : exactement 1 000, 0 modèle.
- Erreur : une page en échec → même comportement d'erreur qu'aujourd'hui (pas de liste partielle présentée comme complète).

## Historique

- 2026-11-04 : diagnostic, worktree ouvert.
