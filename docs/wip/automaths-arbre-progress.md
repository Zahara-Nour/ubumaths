# Chantier `automaths-arbre` — le catalogue Automaths rangé selon l'arbre des notions

## Reprendre ici

_Mis à jour le 2026-11-04, PR #2378 (lot 1) ouverte._

- **État** : Q1-Q4 tranchées (B, « Général » en tête, ordre de l'arbre, 4 lots, une PR chacun). Lot 1 (catalogue selon l'arbre) codé, revu (Sonnet : 0 bloquant, points 1-4 et 7 corrigés), PR #2378 en CI.
- **Prochaine action** : merger #2378 quand la CI est verte ; puis phase 0 du lot 2 (panier, séries, liens, contrôles, paquet de révision sur le modèle ; conversion 5 séries + 1 contrôle ; anciens liens relus).
- **En attente de David** : rien.
- **Pièges en cours** : base locale sans modèle publié → serveur de test 5176 lancé avec `PUBLIC_SUPABASE_URL`/`ANON_KEY` de `.env` (prod, lecture anonyme). Hors chantier, vu en prod : choix de QCM affichés en `$$<$$` bruts sur les tuiles du catalogue (Entiers › Apprivoiser › Comparer).
- **Worktree / branche** : `../ubumaths-wt-automaths-arbre` · `feat/automaths-arbre`.

---

## Origine (2026-11-04)

Décidé pendant le chantier `automaths-apercus` (#2376, journal dans `docs/archive/wip/`) : le
catalogue `/automaths` range les modèles par les colonnes `theme` / `domain` / `subdomain`
(+ `category-order.ts`), pas selon l'arbre des notions (`classification_node_id`, ADR 0019).
Mesuré en prod : 39 modèles publiés sur 1 921 rangés comme dans l'arbre, 471 à la notion près.
David : chantier à part. Le rangement est isolé dans `buildCatalogue`
(`src/lib/questions/catalogue.ts`).

Vocabulaire : branche → notion → sous-notion (CONTEXT.md), jamais les noms de colonnes.

## Phase 0 (2026-11-04)

### Relevé (code + prod, lecture seule)

- **Catalogue** : `buildCatalogue` range thème → domaine → sous-domaine (ordre de
  `category-order.ts`, utilisé seulement par lui), puis niveau. Page : sélecteur (thème) →
  onglets (domaine) → rubriques dépliables (sous-domaine, « Général » si vide).
- **Unité du panier et des séries = catégorie** = quadruplet `theme|domain|subdomain|level`
  (`QuestionCategory`, `categoryKeyOf`, `templatesOfCategory`), tirée au hasard parmi ses modèles.
  Elle vit dans : `series.categories` (jsonb), liens `/automaths/panier|test?categories=…` (JSON
  dans l'URL), liens courts des QR (`short_links`), `test_sessions.categories`,
  `evaluation_attempt_questions.category_key`, panier en localStorage, filtre PostgREST du paquet
  de révision (`chapter-deck.ts`).
- **Prod** : 1 921 modèles publiés, **tous rattachés à un nœud**, aucun sur un nœud archivé.
  **1 921 catégories pour 1 921 modèles : une catégorie = un modèle**, le tirage au hasard ne
  choisit jamais. Couple (nœud, niveau) : 1 426, dont 335 à plusieurs modèles (7 au plus).
- **Ce qui circule** : 5 séries (4-11 catégories), 1 contrôle, 4 séances, 0 lien court, 0
  `chapter_series`.
- **Arbre** : 19 branches, 134 notions, 480 sous-notions ; 16 branches et 108 notions portent des
  modèles ; 16 notions au plus par branche, 11 sous-notions au plus par notion ; 49 notions ont
  des modèles posés directement sur elles (140 modèles). Lecture publique (anon) déjà permise ;
  `/api/questions/templates/all` renvoie déjà `classification_node_id` (`select('*')`).

### Comportements proposés

- **Nominal** : `/automaths` = sélecteur **branche** → onglets **notion** → rubriques
  **sous-notion** ; dans une rubrique, modèles par niveau croissant. Une branche, notion ou
  sous-notion sans modèle publié n'apparaît pas.
- **Limite** : modèles posés sur la notion elle-même → rubrique « Général » (Q2). Ordre (Q3).
- **Erreur** : modèle dont le nœud manque dans l'arbre lu (ne devrait pas arriver) → rubrique
  « Non classés » en fin de catalogue, et `console.warn` ; jamais de modèle perdu.
- Panier, séries, liens, QR, contrôles : **inchangés** si Q1 = A.

### Questions à David

- **Q1 — unité du panier et des séries.** A (recommandé) : le catalogue seul change, la catégorie
  reste le quadruplet ; aucune donnée ni lien touché. B : la catégorie devient le **modèle** (id) —
  même comportement aujourd'hui (1 catégorie = 1 modèle), résiste aux renommages, prépare le
  retrait des colonnes (ADR 0019) ; il faut convertir 5 séries + 1 contrôle et relire l'ancienne
  forme des liens ; chantier à part. C : (nœud, niveau) — **change le comportement** : 335
  catégories tireraient parmi 2 à 7 modèles.
- **Q2 — modèles posés sur une notion** (49 notions) : rubrique « Général » en tête des
  sous-notions (recommandé, comme aujourd'hui), ou en fin.
- **Q3 — ordre** : l'ordre de l'arbre (`position`, que tu règles dans l'admin) remplace
  `category-order.ts` (recommandé ; le fichier et ses tests partent), ou alphabétique.

### Q1 tranchée (2026-11-04) : B

David : « les anciennes dénominations polluent tout ». Une série / le panier enregistre des modèles
(répétitions + durée) ; catégorie, thème, domaine, sous-domaine disparaissent → ADR 0035.
Lots : 1 catalogue selon l'arbre · 2 panier / séries / liens / contrôles / paquet de révision sur le
modèle (conversion des 5 séries + 1 contrôle, anciens liens relus) · 3 éditeur et
`create-questions.ts` sans thème / domaine / sous-domaine · 4 retrait des colonnes (destructif,
après `deploy:prod` des lots 2-3). Q4 posée : les 4 lots ici, une PR par lot.

### Q2-Q4 tranchées (2026-11-04)

« oui » de David aux trois recommandations : rubrique « Général » en tête ; ordre de l'arbre
(`category-order.ts` retiré) ; 4 lots sur ce chantier, une PR chacun, dans l'ordre.

### Lot 1 — PR #2378 (2026-11-04)

Catalogue rangé selon l'arbre (`buildCatalogue(templates, nodes)`), arbre servi par
`/api/questions/templates/all` (`nodes`), tuile sans l'ancien sous-domaine. Revue Sonnet : réponse
du cache sans arbre → relue avec `?frais` ; « Non classés » replié ; un seul `console.warn`.
Laissés : `openRubrics` non vidé si la notion affichée change par repli (cosmétique) ; modèle sur
une sous-notion archivée → « Non classés » sans dire pourquoi (à remonter dans l'admin).
