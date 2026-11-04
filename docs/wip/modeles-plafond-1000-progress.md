# Chantier `modeles-plafond-1000` — modèles publiés tronqués à 1 000

## Reprendre ici

_Mis à jour le 2026-11-04, après #2369._

- **État** : correctif mergé (#2369, `651a1e3bf`) : `readAllRows` sur les 7 lieux. **Pas encore en prod.**
- **Prochaine action** : `deploy:prod` (sur demande de David), puis la ligne #2369 de `verifications-manuelles.md` ; ensuite versement et archivage du journal.
- **En attente de David** : `deploy:prod`.
- **Suite possible (PR de ménage, non décidée)** : migrer les 9 boucles de pagination recopiées vers `readAllRows` (liste dans « Décisions »).
- **Worktree / branche** : supprimés après le merge.

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

## Comportements (phase 0, validée par David le 2026-11-04)

- Nominal : avec N > 1 000 modèles publiés, les pages rendent les N.
- Limite : exactement 1 000, 0 modèle.
- Erreur : une page en échec → même comportement d'erreur qu'aujourd'hui (pas de liste partielle présentée comme complète).

## Décisions (2026-11-04)

- Les 9 boucles de pagination recopiées à la main (`template-review`, `curriculum-coverage`, `programme-tree`, `questions-bulk-status`, `dictionary/*`, `mathoux/*`, `exercise-import-export`, ids de l'admin) restent hors de cette PR : justes, à migrer vers `readAllRows` dans une PR de ménage.
- `api/questions/templates/all` garde son `[]` en cas d'erreur (discutable : le store l'affiche comme un catalogue vide), hors bug.
- Brouillons de l'admin (177) paginés dès maintenant.
- Vérifiés sans risque : contrôles (`evaluation-attempts`, ≤ 100 par thème + domaine en prod), `category-validation`, `chapter-deck` (filtré, lève une erreur au plafond).

## Historique

- 2026-11-04 : diagnostic, worktree ouvert.
- 2026-11-04 : phase 0 validée ; `readAllRows` + 7 lieux + test d’intégration ; PR ouverte.
- 2026-11-04 : PR #2369 (mergée). Revue Sonnet : arrêt sur page VIDE (robuste à un `max_rows` < 1000), test d'intégration robuste au parallèle (inclusion, pas total exact). Non retenus : dédoublonnage par `id` (2 requêtes, risque infime), couverture des 5 autres routes. CI : 2 faux Supabase de routes sans `.range()` adaptés, filtre `paths` de nightly-integration, `docs/systeme/questions.md`.
