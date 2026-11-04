# Chantier `automaths-arbre` — le catalogue Automaths rangé selon l'arbre des notions

## Reprendre ici

_Mis à jour le 2026-11-04, après le `deploy:prod` v0.72.0 (4a en prod)._

- **État** : lots 1-3, 2b et 4a mergés ; **4a en prod (v0.72.0)**. Plus rien en prod ne lit `theme`/`domain`/`subdomain` ni `category_key`.
- **Prochaine action** : 4b (nouveau worktree `ubumaths-wt-automaths-arbre`, branche `feat/automaths-arbre-drop`) : migration destructive (DROP `theme`/`domain`/`subdomain`, `category_key`, index, contrainte ; vue `resources` au chemin dans l'arbre, Q17 A) + renommage `categories` → `items` avec le code (Q18 B), livrés sous `maintenance:on` → `db:migrate` → `deploy:prod` → `maintenance:off`. Liste « Pour 4b » dans § 4a.
- **En attente de David** : confirmation explicite de la question d'accès de 4b avant `db:migrate` ; arrêt obligatoire avant la migration destructive (ce qui sera perdu, grep des usages collé).
- **Pièges en cours** : Worktrees questions-4 / -ce1 / -cm1 : fichiers portant `theme` → `fichiers-sans-quadruplet.ts --ecrire` (supprimé en 4b). Pre-commit sur `data/` : « paths are ignored » sans effet, `git add -u data/…`. `db:migrate` depuis le dépôt principal. Avant tout push : grep des messages (git-workflow R4).
- **Worktree / branche** : aucun pour l'instant. 4b → nouveau worktree.

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

## Lot 3b — phase 0 (2026-11-04)

`create-questions.ts` et les scripts qui partagent sa clé (`lib/lot-questions.ts` → page à cocher,
`publier-lot.ts`) retrouvent un fichier de lot en base par le quadruplet + titre + niveau.
Mesure prod : (titre, niveau) ambigu pour 56 couples (123 lignes), (titre, nœud, niveau) pour 14 ;
(quadruplet, titre, niveau) pour 0. 1 806 fichiers dans `scripts/questions/`, tous avec `theme`,
428 avec `id` ; 19 « Graphes et matrices » sans `capitalPairs` (sens de AB lu dans le thème).

- **Q14 — clé** : l'**id écrit dans le fichier** ; `create-questions --publier` l'écrit après la
  création, tout apparie ensuite par id ; les fichiers existants le reçoivent une fois, par le
  quadruplet, tant que les colonnes existent.
- **Q15 — anciens champs** : retirés des fichiers par script, et refusés à la lecture (comme
  `points`) ; les 19 « Graphes et matrices » déclarent `shared.capitalPairs = 'product'` (comme Q13).
- **Q16 — rangement** : inchangé (migration nœud + tag, démarche `couvrir-niveau`).

Les trois : « recommandé » choisi par David.

### 3b — code (2026-11-04)

- `fichiers-sans-quadruplet.ts` (ponctuel, lecture seule de la prod) joué : 1 806 fichiers sans
  `theme`/`domain`/`subdomain` ; 428 portaient déjà leur id, 1 311 l'ont reçu par le quadruplet
  (50 au niveau renuméroté en base, 2 re-rangés trouvés par le titre seul), **67 sans modèle en
  base** (lot pas encore créé, ex. 2de-vecteurs-c2/06-10, ou modèle renommé/scindé depuis) →
  sans id, « à créer » ; 19 « Graphes et matrices » déclarent `capitalPairs: product`.
  Réécriture textuelle pour 42 fichiers (la re-sérialisation dépliait les objets d'une ligne).
- `create-questions` : sans id → créé puis id écrit en tête du fichier (`withTemplateId`) ;
  avec id → retrouvé par id, titre exigé, niveau renuméroté signalé. Choix d'exécution :
  homonyme (titre, niveau) en base **bloquant** avant toute écriture (`--malgre-homonyme`), car un
  script de lot rejoué (§ 7 de couvrir-un-niveau) efface les id → doublons sinon.
- `lot-questions` (page à cocher, publier-lot) : par id seul ; plus d'homonyme « écarté ».
- Essai local : création sans thème, id écrit, relance = « déjà en base », lignes d'essai supprimées.
- **Autres worktrees** avec des lots en cours (questions-4, -ce1, -cm1) : après rebase, leurs
  fichiers portent encore `theme` → refusés ; rejouer `fichiers-sans-quadruplet.ts --ecrire`.
- **Lot 4, à reprendre** : supprimer `fichiers-sans-quadruplet.ts` ; `update-published-questions`
  (contrôle de niveau par l'ancien index, niveau temporaire) ; vieux scripts ponctuels qui lisent
  le quadruplet (`create-automatismes-*-1spe.ts`, `rename-question-subdomains.ts`,
  `audit-question-syntax.ts`) ; `OLD_CATEGORY_TAKEN` de `questions-bulk-status`.

## Lot 2b — phase 0 (2026-11-04)

### Relevé (prod, lecture seule, après le `deploy:prod` 0.71.0 qui livre 2a)

- **Ancienne forme restante** : `series.categories` 5 séries / 29 lignes ; `test_sessions.categories`
  4 séances / 27 lignes. Aucune composition en nouvelle forme, aucune mixte (dernière séance
  11:56 UTC, avant la mise en prod 0.71.0 de 17:55 UTC). Chaque ligne = `{category:{theme, domain,
subdomain, level}, quantity, delay}`.
- **Résolution** : 56/56 lignes → exactement 1 modèle publié (0 sans modèle, 0 à plusieurs) ; 0 doublon
  de catégorie dans une même composition.
- **Lecteurs** : `series.categories` → `server/series-lines.ts` (lit les deux formes) ;
  `test_sessions.categories` → seulement l'export RGPD (`api/account/export`), recopié tel quel.
  `evaluation_attempt_questions` : 0 ligne.
- **Triggers sur `series`** : `series_lock_guard` refuse toute modification de `categories` d'une
  série dont une évaluation a été commencée (0 série concernée aujourd'hui), sans regarder le rôle :
  il bloquerait aussi la migration. `update_series_updated_at` changerait la date de modification
  des 5 séries. Sur `test_sessions` : `test_sessions_evaluation_immutable` ne joue pas (auth.uid()
  nul en migration).
- **Test** : précédent de test d'intégration qui rejoue un fichier de `supabase/migrations/` sur un
  décor (`tests/integration/tags-lot-2bis.test.ts`) → décor en ancienne forme, rouge avant le
  fichier, vert après.

### Comportements proposés

- **Nominal** : une migration de données, en une transaction : dans `series.categories` et
  `test_sessions.categories`, chaque ancienne ligne devient `{templateId, quantity, delay}` (modèle
  publié du quadruplet), ordre, nombres et durées gardés. Colonnes gardées (renommage/retrait : lot 4).
  Rejouée, elle ne change rien (les nouvelles lignes sont laissées telles quelles).
- **Limite — série verrouillée** (évaluation commencée) : convertie quand même (Q9).
- **Limite — date de modification** : inchangée (Q10).
- **Erreur — ancienne ligne sans modèle publié au moment du `db:migrate`** : la migration échoue
  entièrement et ne change rien (Q11) ; on remesure et on décide.
- **Rollback** (en commentaire) : nouvelle ligne → quadruplet relu dans `question_templates`
  (colonnes encore là jusqu'au lot 4).

### Questions à David

- **Q9 — série verrouillée.** A (recommandé) : la migration lève le verrou le temps de la conversion
  (la série joue les mêmes modèles, seule l'écriture change). B : sauter ces séries (elles resteraient
  en ancienne forme et le lot 4 les casserait).
- **Q10 — date de modification des séries.** A (recommandé) : inchangée (le prof n'a rien modifié).
  B : mise à la date de la conversion.
- **Q11 — ligne sans modèle au `db:migrate`** (0 aujourd'hui). A (recommandé) : tout annuler. B :
  laisser la ligne en ancienne forme (lue par 2a, cassée au lot 4).
- **Question d'accès** : personne ne lit rien de nouveau ; la migration réécrit en place des lignes
  que leurs lecteurs actuels (auteur de la série, élève de la séance, export RGPD) lisent déjà ;
  aucune policy touchée.

### Q9-Q11 tranchées (2026-11-04)

David : « je te suis » → Q9 A (verrou levé le temps de la conversion) · Q10 A (date de modification
inchangée) · Q11 A (une ligne sans modèle → tout annulé). Question d'accès : confirmation explicite
encore à recueillir avant `db:migrate`.

### 2b — code (2026-11-04)

- Migration `20261104204345_series_lignes_par_modele` : table temporaire des anciennes lignes
  (modèle publié du quadruplet, sous-domaine nul/vide confondus comme `series-legacy.ts`), garde
  TOUT ou RIEN (`raise` si 0 ou plusieurs modèles), puis conversion des deux tables, ordre gardé
  (`with ordinality`), `series_lock_guard` et `update_series_updated_at` suspendus puis rétablis.
  Rollback en commentaire (catégorie relue dans le modèle), extrait et exécuté par le test.
- Test `tests/integration/series-lignes-par-modele.test.ts` : 10 cas (sous-domaine renseigné /
  absent / vide, brouillon homonyme, série mêlée et verrouillée, date gardée, verrou rétabli,
  séance, rejouée sans effet, rollback, échec Q11). **Rouge sans la conversion** (5/10), vert avec.
- Piège : la base locale garde 8 séances laissées par d'autres suites (`category: "entiers/1"`,
  une chaîne) ; le test les retire dans sa transaction. La prod n'en a aucune (relevé).

### 2b mergé (#2384) et appliqué en prod (2026-11-04)

Question d'accès confirmée par David (« je confirme »). Revues : security-auditor et code-reviewer
(Opus) sans bloquant ; mineurs corrigés (`lock_timeout` 5 s ; niveau en chaîne, modèle à
sous-domaine vide, rollback d'une série déjà en nouvelle forme). CI verte, `check:migrations` OK,
`db:migrate` depuis le dépôt principal (le worktree n'est pas lié). Vérifié en prod : 29 + 27
lignes → modèle publié, 0 ancienne ligne, `series_lock_guard` et `update_series_updated_at` actifs,
aucune série au `updated_at` changé.

## Lot 4 — phase 0 (2026-11-04)

### Relevé (code + prod, lecture seule)

- **Prod** : 2 090 modèles portent encore `theme`/`domain`/`subdomain` ; 0 modèle publié sans nœud ;
  0 ancienne ligne (séries, séances), 0 `category_key` rempli, 0 lien court.
- **Base** : vue `resources` (sous-titre `concat_ws(' · ', theme, domain, subdomain)`, lue par
  `search_resources` → recherche `[[…]]`) ; index `idx_question_templates_categories` (theme, domain,
  level) et `idx_question_templates_unique_category` ; contrainte
  `evaluation_attempt_questions_category_key_check`. Nom `categories` dans `series_lock_guard`,
  `get_class_course_by_share_token`, contrainte `series_categories_non_empty`.
- **Code** : `questions/series-legacy.ts`, branche ancienne forme de `server/series-lines.ts`, ancien
  panier, `test-launch`, `?categories=` (panier, test), repli `categories` de `validation/tests.ts`,
  `template-review.ts` (select nommé → l'ancien code planterait au DROP), Zod et types des modèles,
  `capitalPairsContextOf(theme, branche)`, `OLD_CATEGORY_TAKEN`, scripts du § 3b ; ~20 tests
  d'intégration insèrent `theme`.

### Comportements validés (« je te suis », 2026-11-04)

- Nominal : plus de thème / domaine / sous-domaine / catégorie ; lignes de modèle seules.
- Ancien lien `?categories=` : message « lien d'une ancienne version » (Q8 A). Ancien panier du
  navigateur : lignes anciennes retirées, message « panier d'une ancienne version vidé ».
- Migration 4b : refuse s'il reste une ancienne ligne ou un modèle publié sans nœud.
- **Q17 A** : sous-titre d'un modèle dans `resources` = chemin dans l'arbre (branche · notion ·
  sous-notion).
- **Q18 B** : `series.categories` et `test_sessions.categories` → `items`, dans 4b (fonctions SQL
  réécrites), livrés sous `maintenance:on` → `db:migrate` → `deploy:prod` → `maintenance:off`.
- Découpage : **4a** code seul (+ `deploy:prod` sur demande) ; **4b** migration destructive + renommage.
- Question d'accès (4b) : personne ne gagne ni ne perd de lecture — **confirmation explicite à
  recueillir avant `db:migrate`**.

### 4a — code et revues (2026-11-04)

- Agent Sonnet : `series-legacy.ts` supprimé, `series-lines.ts` synchrone (nouvelle forme seule,
  composition illisible → absente et tracée) ; ancien lien → message ; ancien panier → lignes
  retirées + toast ; `items` requis à l'enregistrement d'une séance ; theme/domain/subdomain retirés
  des types, Zod, API, OpenAPI, `template-review` ; sens de AB : déclaration → branche → longueur
  (exercices : `exerciseCapitalPairs(topic)` garde « Graphes et matrices » et la physique) ;
  `OLD_CATEGORY_TAKEN` retiré ; 3 scripts ponctuels supprimés ; tests nettoyés.
- Revues : security-auditor sans bloquant (mineur : 23505 de l'ancien index → 500 jusqu'à 4b ;
  mesuré en prod : 0 brouillon en conflit, les nouveaux brouillons n'ont plus de thème → laissé).
  code-reviewer (Opus) : 632 fichiers `data/relecture` portant theme → refusés par le schéma strict
  (clés retirées par script, JSON relu valide) ; test `put-ancien-index-unique` retiré.
- Garde le pre-commit sur `data/` : lint-staged affiche « paths are ignored » (data dans
  `.gitignore`, fichiers suivis) mais le commit passe ; indexer par `git add -u data/…`.
- **Pour 4b** : supprimer `fichiers-sans-quadruplet.ts` ; tests qui nomment encore les colonnes
  (`modele-sans-theme-domaine`, `series-lignes-par-modele`, `lot-2bis-migration.ts`, 21
  `questions-*` qui rejouent des migrations) ; vue `resources` (chemin dans l'arbre, remettre un
  test de recherche par sous-titre, retiré de `resources-view-search`) ;
  `base-de-donnees-tables.md:491` (`category_key`) ; niveau temporaire de
  `update-published-questions` devenu inutile sans l'index.
- Vérification manuelle au merge : toast « Panier d'une ancienne version vidé » au premier
  chargement (émis avant le montage du Toaster ; non couvert par un test, toaster mocké).

### 4a en prod (2026-11-04)

- `deploy:prod` lancé par David (session « libre 5 ») : v0.72.0 (`53afb6638`), `production` avancée.
  2b, 3b et 4a livrés. 4b peut commencer.
