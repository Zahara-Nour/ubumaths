# Chantier `automaths-arbre` — le catalogue Automaths rangé selon l'arbre des notions

## Reprendre ici

_Mis à jour le 2026-11-04, après #2382 (3a-2 mergé, Q13 migrée en prod)._

- **État** : 3a-1 (#2381) et 3a-2 (#2382) mergés ; `db:migrate` de Q13 fait (21/21 modèles « Graphes et matrices » déclarent `product`, aucun publié). Code de l'éditeur sans quadruplet sur `main`, pas encore en prod.
- **Prochaine action** : après le `deploy:prod`, ouvrir 3b (`create-questions.ts` sans quadruplet) puis 2b, sur un nouveau worktree.
- **En attente de David** : essai de l'éditeur et de la liste admin (serveur 5176, base locale, `admin@local.test` / `local-admin`) ; `deploy:prod` (avant 3b et 2b).
- **Pièges en cours** : un modèle enregistré sous Matrices/Graphes garde `capitalPairs = 'product'` s'il change de branche (le sélecteur l'affiche comme déclaré à la réouverture ; limite acceptée, relecture du 2026-11-04). PUT : le 23505 est attrapé sans tester le nom de l'index (seul unique de la table) → à retirer au lot 4 avec l'index. `create-questions.ts` garde le quadruplet jusqu'au deploy (3b). Lot 4 : le générateur lit encore le contexte AB dans `theme` (anciens modèles) → à remplacer avant de retirer la colonne. CI : « Browser connection was closed » → relancer.
- **Worktree / branche** : `../ubumaths-wt-automaths-arbre` gardé pour l'essai de David (serveur 5176) ; branche `feat/automaths-arbre-editeur-sans-quadruplet` mergée → `worktree remove` + `branch -d` après l'essai.

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

Mergée le 2026-11-04 (CI verte, intégration comprise). Vérification manuelle notée (#2378).

## Lot 2 — phase 0 (2026-11-04)

### Relevé (code + prod, lecture seule)

- **Forme actuelle d'une ligne** : `CartItem = { category: {theme, domain, subdomain, level}, quantity, delay }`
  (`stores/questionCart.svelte.ts`, Zod `cartItemSchema` dans `validation/series.ts`). Résolution
  quadruplet → modèles : `templatesOfCategory` (`questions/series-items.ts`) ; clé `categoryKeyOf`.
- **Où elle vit** : panier (localStorage `chiphre_question_cart`) ; liens `/automaths/panier|test?categories=…`
  (`buildSeriesLink`, `parseCategoriesParam`, `utils/test-launch.ts`) et leurs QR ; `series.categories`
  (jsonb) lu par `server/series.ts`, `chapter-series.ts`, `course-share-tokens.ts` (+ RPC
  `20261016100300` qui recopie `s.categories` tel quel), `evaluations.ts`, `evaluation-attempts.ts`
  (tirage côté serveur, filtre `theme in / domain in`), `curriculum-coverage.ts` ; paquet de révision
  (`srs/chapter-deck.ts`, filtre PostgREST `categoriesFilter`) ; Entraînement Mathoux
  (`mathoux/collection-logic.ts`, `TrainingCategory`) ; `test_sessions.categories` (écrit par
  `/api/tests/save`, lu par l'export RGPD) ; `evaluation_attempt_questions.category_key` (NOT NULL, à
  côté de `template_id`) ; `ClassroomItem.categoryKey` (regroupe les durées réglées en classe).
- **Prod** : 5 séries / 29 lignes → **29 désignent exactement 1 modèle publié** ; 4 séances / 27 lignes
  → 27 sur 1 modèle publié ; 0 question de tentative ; 0 lien court. L'index unique
  `idx_question_templates_unique_category` (publiés) garantit ≤ 1 modèle par quadruplet.
- **Contrainte de livraison** : entre `db:migrate` et `deploy:prod`, la prod tourne l'ANCIEN code, qui
  lit et écrit le quadruplet dans `series.categories`.

### Comportements proposés

- **Nominal** : une ligne de série / panier = `{ templateId, quantity, delay }`. « Ajouter au panier »
  ajoute CE modèle ; jouer une série joue ce modèle autant de fois que demandé (identique à
  aujourd'hui, la catégorie ne tirait déjà qu'un modèle). Liens nouveaux : `?modeles=…` (JSON des
  lignes). Paquet de révision, couverture du programme, Entraînement Mathoux, tirage d'une évaluation :
  lus par id.
- **Limite — ancienne forme** : un ancien lien `?categories=…`, un ancien panier du navigateur, une
  série pas encore convertie → chaque quadruplet est résolu vers son modèle publié (≤ 1) ; panier du
  navigateur réécrit dans la nouvelle forme au chargement.
- **Limite — modèle retiré** (dépublié, archivé) : ligne sautée au jeu, comme aujourd'hui (Q7).
- **Erreur** : quadruplet ou id sans modèle publié → ligne sautée, message « N questions de ce lien
  n'existent plus » ; lien entièrement illisible → message actuel ; jamais de plantage.

### Questions à David

- **Q5 — ce que garde une ligne.** A (recommandé) : l'id seul ; titre, niveau, place dans l'arbre
  relus dans le modèle. B : id + copie du titre (affichable même si le modèle disparaît).
- **Q6 — livraison en deux temps** (imposée par la prod). Recommandé : **2a** = code qui lit les deux
  formes et n'écrit que la nouvelle, + migration additive au merge : `category_key` perd son NOT NULL
  (le nouveau code ne l'écrit plus ; colonne retirée au lot 4) ; **2b** = migration de données APRÈS
  le `deploy:prod` de 2a : les 5 séries et 4 séances converties en place (colonnes gardées, renommées
  au lot 4). Écarté : nouvelle colonne `series.items` dès 2a (l'ancien code en prod écrirait encore
  l'autre colonne pendant l'intervalle).
- **Q7 — modèle retiré d'une série** : sauté en silence (comme aujourd'hui), ou en plus signalé au
  prof dans l'éditeur de série et dans le panier (« modèle retiré », recommandé).
- **Q8 — anciens liens APRÈS le lot 4** (colonnes thème / domaine / sous-domaine retirées : plus rien
  pour résoudre un quadruplet). A (recommandé) : illisibles, avec un message clair (0 lien court en
  prod, les QR imprimés portent l'URL longue). B : table de correspondance figée quadruplet → id
  gardée (les anciens noms restent dans la base).
- **Question d'accès** (Q6) : personne ne gagne de lecture ; la conversion réécrit des lignes que
  leur auteur lit déjà ; relâcher NOT NULL n'ouvre rien.

### Q5-Q8 tranchées (2026-11-04)

David : « Je suis tes recos » → Q5 A (id seul) · Q6 deux temps (2a code lisant les deux formes +
`category_key` facultative ; 2b conversion après `deploy:prod`) · Q7 modèle retiré signalé au prof
(éditeur de série, panier) · Q8 A (anciens liens illisibles après le lot 4, message clair).
Question d'accès : réponse explicite encore à recueillir avant `db:migrate`.

Découpage : `db:types` vient de la prod, et le code qui n'écrit plus `category_key` exige le type
facultatif → **2a-1** = migration seule (`20261104140651`, rouge sans elle : « null value in column
category_key », vert avec, 82/82 sur les 3 fichiers de tentatives) ; **2a-2** = le code.

### 2a-1 mergé (#2379, 2026-11-04)

Question d'accès confirmée par David (« je confirme »). CI verte, `check:migrations` OK, migration
appliquée en prod (`category_key` : `is_nullable = YES`), `db:types` régénéré.

### Lot 2a-2 — code (2026-11-04)

- Ligne `SeriesItem = { templateId, quantity, delay }` (`validation/series.ts`), lien `?modeles=`.
- Ancienne forme isolée : `questions/series-legacy.ts` (navigateur) + `server/series-lines.ts`
  (serveur, une requête pour toutes les anciennes lignes). Le lot 4 supprime les deux.
- Panier : clé `templateId` ; ancien panier du navigateur converti au chargement des modèles
  (`questionTemplatesCache` → `questionCart.resolveLegacy`).
- Q7 : « Modèle retiré » dans le panier (`CartQuestionCard`, « Retirer du panier ») et l'éditeur
  de série (titres des modèles publiés chargés par la page).
- Tirage d'évaluation par `.in('id')`, `category_key` plus écrit ; paquet de révision,
  couverture, cours partagé, Mathoux (`trainingItems`) lus par id.
- `/api/tests/save` accepte encore `categories` (onglet ouvert avant la mise en prod).
- Choix d'exécution (pas de décision d'archi) : pas de contrôle « modèle publié » à
  l'enregistrement d'une série (une série dupliquée avec un modèle retiré resterait possible ;
  le modèle est sauté au jeu et signalé).

### 2a-2 — revues et tests (2026-11-04)

- security-auditor : aucun accès gagné ; F1 (plafond 1000 tronqué en silence) → lève désormais.
- code-reviewer (Opus) : 7 mineurs corrigés — doublons d'un lien fusionnés (`replaceWith`),
  anciennes lignes perdues annoncées dans l'éditeur (`unresolved_lines`), ancien lien hors ligne →
  message réseau, `legacyLines` réactif + avertissement, actions du panier après chargement des
  modèles, panne de lecture → `EvaluationError`, doc de l'API de démarrage.
- Tests : 27 fichiers adaptés + 14 qui échouaient à l'exécution (agent Sonnet) ; neufs :
  `series-legacy`, `series-lines`, `questionCart-ancien-panier`, éditeur « Modèle retiré ».
  Serveur 13 002 verts, client ciblé 567 verts, 14 fichiers d'intégration verts.

### 2a-2 mergé (#2380, 2026-11-04)

CI : intégration rouge au premier passage (`series-de-chapitre-code` : série en ancienne forme dont
la catégorie n'avait pas de modèle publié dans le décor → 0 question) ; décor corrigé (modèle publié
correspondant, lien `?modeles=` vérifié). Tests client : deux plantages « Browser connection was
closed » sans rapport (aussi vus sur `fix/fenetre-choix-test`), relancés. Vérification manuelle notée.

## Lot 3a — phase 0 (2026-11-04)

David : « je veux continuer sans déployer ». 2b impossible avant le deploy (l'ancien code en prod lit
le quadruplet dans `series.categories`). Lot 3 possible, sauf `create-questions.ts` qui écrit en prod
dès le merge (un modèle publié sans thème/domaine serait invisible dans l'ancien catalogue de prod).

- **Q9 — découpage** : « Scinder » → 3a (migration, éditeur, restes) maintenant ; 3b
  (`create-questions.ts`) après le deploy.
- **Relevé** : aucune interface n'écrit `classification_node_id` (seules les migrations de
  `couvrir-niveau`) ; `theme`/`domain` NOT NULL, `subdomain` facultatif ; index unique du quadruplet
  sur les publiés (`COALESCE(subdomain,'')`).
- **Q10 — rangement dans l'éditeur** : sélecteur dans l'arbre (« Rangé dans », facultatif ; sans lui
  « Non classés »).
- **Q11 — filtres de la liste admin** : par l'arbre (branche, notion) + « Non rangés ».
- **Q12 (ex-avis 2a-2) — série avec un modèle retiré** : gardée telle quelle (acceptée, sautée,
  signalée).
- **Comportements validés** : niveau gardé ; plus de contrôle « catégorie déjà occupée » ; un modèle
  modifié garde ses anciens champs (invisibles) ; étiquettes = chemin dans l'arbre ; paquets de
  révision = titre ; anciens `theme`/`domain` envoyés par un vieil onglet ignorés.
- **Question d'accès** (migration) : personne ne gagne de lecture — confirmée par David.

### 3a-1 — migration (2026-11-04)

`20261104160229_modele_theme_domaine_facultatifs.sql` ; test
`tests/integration/modele-sans-theme-domaine.test.ts` **rouge sans elle** (23502 « null value in
column theme »), vert avec (2/2 ; l'index unique du quadruplet tient toujours, 23505).

### 3a-1 mergé (#2381, 2026-11-04)

CI retardée par une panne partielle de GitHub Actions (~1 h). Audit sécurité : aucun bloquant
(note sur l'ordre du rollback ajoutée). Mergé, `check:migrations` OK, `db:migrate` : seule
`20261104160229` manquait ; prod vérifiée (`theme`/`domain` `is_nullable = YES`) ; `db:types` de prod
identique aux types retouchés à la main sur la branche 3a-2.

### 3a-2 — code et revues (2026-11-04)

Agent Sonnet : `classification-tree.ts` (chemin, cascade, filtre), `ClassificationNodePicker`,
liste admin filtrée par l'arbre (`branche`, `notion`, `nonRanges=1`), étiquettes = chemin, decks =
titre, unicité du quadruplet retirée (éditeur, API, lot), store/routes/modules « catégorie » supprimés,
`theme`/`domain`/`subdomain` retirés de l'instance. Choix d'exécution : validateur sans
`theme`/`domain` requis ; anciens `<select>` du filtre → `MySelect`.

- security-auditor : aucun bloquant ; mineur corrigé (seul un 23514 de rangement connu → 400, un
  test qui assertait un message inventé réécrit avec le vrai texte du trigger).
- code-reviewer (Opus) : sens de AB perdu pour les neufs / copies ; cahier de texte « null / null » ;
  23505 de l'ancien index → 500 au PUT ; picker figé après le mode JSON ; mineur : modèle dans un
  nœud archivé ni sous sa notion ni « Non rangés » (0 en prod, laissé).
- **Q13 — sens de AB** : « Déclarer + l'arbre » → migration de données qui déclare `product` dans les
  21 brouillons « Graphes et matrices » (tous rangés sous Matrices / Graphes, aucun publié) ;
  l'éditeur prend la branche (Matrices, Graphes → produit) comme contexte et écrit la déclaration à
  l'enregistrement. Question d'accès confirmée (personne ne gagne de lecture).
