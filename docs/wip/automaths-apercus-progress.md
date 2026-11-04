# Chantier `automaths-apercus` — Automaths sans 1 912 aperçus au chargement

## Reprendre ici

_Mis à jour le 2026-11-04, après #2376._

- **État** : #2376 mergée (`4d93161c6`) : aperçus calculés à l'ouverture d'une rubrique (galerie montée seulement si ouverte : bits-ui garde le contenu fermé dans le DOM), modèles lus une fois par onglet, API gardée 5 min par Vercel. **Pas encore en prod.**
- **Prochaine action** : après `deploy:prod`, mesurer `/automaths` en prod (`curl -w %{time_starttransfer}` sur `https://www.chiph.re/automaths`, cible ~2 s, avant 7 à 11 s) ; puis versement (doc système déjà à jour dans `docs/systeme/questions.md`) et archivage du journal.
- **En attente de David** : `deploy:prod` ; vérification manuelle #2376.
- **Pièges en cours** : base locale sans modèle publié (726 brouillons) → catalogue vide en local ; pour voir le rendu, publier en local puis remettre en brouillon.
- **Suite décidée** : chantier à part « Automaths selon l'arbre des notions » (voir Décisions).
- **Worktree / branche** : supprimés après le merge.

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
- 2026-11-04 — Cache à deux niveaux : onglet + Vercel. Délai Vercel **5 min** (phase 0 validée : « je te suis »).
- 2026-11-04 — **Le catalogue ne suit pas l'arbre des notions** (ADR 0019) : il range par `theme`/`domain`/`subdomain`. Mesuré en prod : 39 modèles publiés sur 1 921 rangés comme dans l'arbre, 471 à la notion près. Le panier, les séries, leurs liens et les contrôles désignent une catégorie par ces colonnes. David : **chantier à part** (« Automaths selon l'arbre »), cette PR reste sur la lenteur ; `buildCatalogue` isole le rangement.

## Phase 0 — comportements

Validée le 2026-11-04.

- **Catalogue** : aucun aperçu calculé par le serveur, modèles non envoyés en double ; menus, onglets et rubriques inchangés, même ordre. Aperçus calculés à l'ouverture d'une rubrique (« Chargement… » le temps du calcul), une seule fois ; mêmes aperçus qu'avant (graine du panier). Aperçu en échec : carte omise, journal console. Liste illisible : message d'erreur, pas « Aucune question disponible ».
- **Navigation** : liste lue une fois par onglet ; catalogue ↔ panier ↔ test ne la relisent pas. Lien `/automaths/test?…` ouvert directement : fonctionne. Mode `?assignment=` inchangé. Après écriture d'un modèle (admin), l'onglet relit la liste.
- **Cache Vercel** : 5 min, puis servie périmée pendant la relecture ; un modèle publié apparaît aux élèves après 5 min environ. Réponse lue par un client anonyme (ne dépend de personne).
- **Réussite** : `/automaths` ~2 s en prod (7 à 11 s avant).

## Fait (2026-11-04)

- `src/lib/questions/catalogue.ts` : `buildCatalogue` (rangement) + `templatePreview` (aperçu mémorisé par objet modèle, `WeakMap`).
- `src/lib/components/questions/CatalogueGallery.svelte` : cartes d'une rubrique, montée à l'ouverture.
- `questionTemplatesCache.fetchTemplates()` : promesse partagée, `isLoaded`, `invalidate()` → relecture `?frais=…` ; `initializeFromServer` retiré.
- Catalogue : `+page.server.ts` supprimé. Panier : `load` = rôle seulement. Test : `load` = redirection seulement.
- API `templates/all` : client anonyme, `s-maxage=300, stale-while-revalidate=3600`, échec → 500 (avant : 200 + liste vide).
- Vérifié dans Chrome (local, 712 modèles publiés le temps du test) : rubrique dépliée = aperçus ; catalogue → panier → catalogue → panier sans aucune lecture de l'API ; lien de série direct joué (1 sur 3) ; panier par lien avec aperçu.
