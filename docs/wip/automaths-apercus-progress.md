# Chantier `automaths-apercus` — Automaths sans 1 912 aperçus au chargement

## Reprendre ici

_Mis à jour le 2026-11-04, ouverture._

- **État** : phase 0 écrite (ci-dessous), **en attente de validation**.
- **Prochaine action** : après validation, tests rouges puis implémentation.
- **En attente de David** : validation de la phase 0 (délai du cache Vercel : 5 min, pris sur son « ok »).
- **Pièges en cours** : `/api/questions/templates/all` passe par le client de session : vérifier qu'une réponse mise en cache par Vercel ne dépend pas de l'appelant.
- **Worktree / branche** : `../ubumaths-wt-automaths-apercus` · `perf/automaths-apercus`.

---

## Constat (2026-11-04, prod 0.69.0)

Après #2369 (lecture de tous les modèles publiés, 1 912), mesuré en prod (temps avant le premier octet) :

| Page                | Temps     | Données (gzip)       |
| ------------------- | --------- | -------------------- |
| `/automaths`        | 7 à 11 s  | 2,3 Mo (12 Mo bruts) |
| `/automaths/test`   | 1,5–3,5 s | 1,9 Mo               |
| `/automaths/panier` | 1,8 s     | 1,9 Mo               |

Causes :

- `src/routes/(public)/automaths/+page.server.ts` calcule l'aperçu des 1 912 modèles **à chaque requête** (`generateInstance`, graine fixe) et les envoie tous ;
- les modèles partent **deux fois** (`hierarchy` avec aperçus + `templates` pour le cache) ;
- le cache de l'onglet (`src/lib/stores/questionTemplates.svelte.ts`) existe mais les trois pages renvoient tout de toute façon ;
- `/api/questions/templates/all` : `cache-control: public, max-age=0, must-revalidate`, ~10 Mo bruts.

RLS de `question_templates` (lue en prod) : tout modèle `published` est lisible par anon, élève, prof, admin → la liste filtrée sur `published` est la même pour tous.

## Décisions

- 2026-11-04 — David : **option C** (aperçus calculés dans le navigateur, pour la rubrique dépliée seulement) + A (plus d'envoi en double).
- 2026-11-04 — Cache à deux niveaux : onglet + Vercel. Délai Vercel **5 min** (recommandation, « ok » de David — confirmé en phase 0).

## Phase 0 — comportements

Voir le message de phase 0 de la session ; recopié ici après validation.
