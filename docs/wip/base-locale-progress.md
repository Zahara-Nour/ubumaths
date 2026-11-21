# Chantier `base-locale` : une base Supabase locale toujours à jour, sans y penser

## Reprendre ici

_Mis à jour le 2026-11-21 : découpage validé par David, PR 1 en cours._

- **État** : étape 1 faite (§ 9). David a validé le 2026-11-21 les comportements et le découpage
  en 4 PR du § 10, pile de test séparée comprise. PR 1 (`pnpm db:a-jour`) codée et testée (§ 11).
- **Prochaine action** : PR 1 → CI verte → merge ; puis PR 2 (pile de test séparée), une
  session neuve.
- **En attente de David** : rien.
- **Pièges en cours** : base locale partagée (verrou `supabase`, ne jamais le contourner) ;
  `db:reset` efface les données locales de tout le monde ; `db:migrate` = **prod**. Pour
  expérimenter : copie isolée du § 9.1, jamais la base partagée. `supabase migration up --local`
  est inutilisable sur la base partagée (§ 11).
- **Worktree / branche** : `../ubumaths-wt-base-locale`, `feat/base-locale-a-jour`.

---

## 1. Ce que veut David (ses mots, 2026-11-21)

> « Je veux quelque chose de propre, qui fonctionne, et qui ne bouffe pas tout mon temps pour
> pouvoir faire des PR et des CI local. Je n'en peux plus de perdre tout ce temps ! »

Traduction :

- une base locale **à jour toute seule** : chaque migration du dépôt y arrive sans geste manuel,
  sans tout effacer ;
- les **tests d'intégration locaux** (exigés par CLAUDE.md pour RLS, triggers, `SECURITY
DEFINER`) passent toujours, quelles que soient les données de dev présentes ;
- une remise à neuf complète (reset + remplissage), **rare**, en une commande, en quelques
  minutes ;
- **explications en mots simples avec un exemple**, jamais de tables ni de traces (mémoire
  `feedback_questions-de-conception-mots-simples`). David a dit le 2026-11-21 « je ne comprends
  rien à tout ce bazar » : le rapport doit tenir en quelques phrases.

Questions de David restées sans réponse définitive :

- « Faut-il faire un reset local à chaque migration ? » → réponse provisoire donnée : **non**,
  la base doit recevoir les nouvelles migrations sans être effacée. À confirmer par la solution.
- « Et pour le seed de la base ? » → `db:seed-riche` (§ 4.3) n'est utile qu'après un reset ;
  mais c'est très probablement lui qui casse la mise à jour (§ 3.1). À trancher en phase 0.

## 2. Ce qui s'est passé (chronologie, faits relevés le 2026-11-21)

Sources : journaux `docs/wip/*-progress.md` modifiés depuis le 2026-11-15, journal archivé
`docs/archive/wip/ci-integration-progress.md` (§ 3.4 et bloc de clôture), commandes rejouées.

- **2026-09-28** : `supabase link` écrit `supabase/.temp/*` dans le dépôt principal, dont
  `postgres-version` = `17.6.1.127` (version de la prod). Effet découvert le 2026-11-21 (§ 3.2).
- **2026-10-10** : `db:seed-riche` créé (base locale = contenu de la prod + 30 élèves fictifs).
- **2026-11-06** : session `questions-ce2` (journal archivé `docs/archive/wip/questions-ce2-progress.md`,
  vers la ligne 957) : le global-setup des tests d'intégration ne peut plus supprimer les profs de
  démo, à cause d'un lien `class_journal_share_tokens` créé par le prof de dev `11111111…` par
  une autre session. Ligne supprimée à la main avec l'accord de David. **Premier signe** du § 3.3.
- **2026-11-15** : dernière migration appliquée en local avant le reset :
  `20261115062310_questions_5_lot10_rangement_tags.sql`. La suivante,
  `20261115072353_questions_6_blockly_rangement_tags.sql` (une migration de rangement avec
  gardes `raise exception`), n'a jamais été appliquée en local.
- **2026-11-18** : journal `navadra` (le jeu, sans rapport avec le problème ; simple témoin), dans
  ses « Pièges en cours » : « `supabase migration up --local` bute sur une migration de rangement
  déjà jouée (contenu copié de la prod) ; appliquer un fichier par `psql -1` sous
  `scripts/with-db-lock.sh`, puis `notify pgrst, 'reload schema'` ». Chaque session applique dès
  lors **sa seule migration** à la main ; les autres s'accumulent.
- **2026-11-19** : `categorie-fiche` : migration appliquée « en LOCAL seulement », 34 tests
  d'intégration verts (rouges sans). Les tests ciblés tournent encore à cette date.
- **2026-11-20** : le prof de dev crée 2 liens de partage du cahier de texte → le global-setup
  casse à **chaque** lancement local (`23503`, `class_journal_share_tokens_created_by_fkey`),
  même pour un seul fichier.
- **2026-11-21** : `idees-format` note deux fois « test d'intégration local bloqué par des données
  d'une autre session (`class_journal_share_tokens`) ; la CI fait foi ». Les sessions ne testent
  plus en local et attendent la CI.
- **2026-11-21, session `ci-integration`** :
  1. #2965 : le global-setup efface les liens de partage (`class_journal_share_tokens`,
     `class_course_share_tokens`, `exercise_share_tokens`) créés par les profs avant de les
     supprimer. Rouge puis vert en local.
  2. Suite locale complète : 218 fichiers en échec sur 584 (base en retard de **96 migrations**,
     du 2026-11-15 au 2026-11-20 ; erreur la plus fréquente : « modèles déjà rangés depuis le
     relevé », 126 fois ; puis `chk_attempt_regime` sur `skill_attempts`, 69 fois).
  3. `pnpm db:reset` échoue au milieu : `20261004090000_realtime_chat_prive.sql`,
     `ERROR: must be owner of relation messages (SQLSTATE 42501)` sur
     `COMMENT ON POLICY "chat_realtime_participants_receive" ON realtime.messages`. Base à
     moitié reconstruite.
  4. `pnpm db:stop --no-backup` + `pnpm db:start` (volume neuf) : même erreur.
  5. Cause : image Postgres imposée par `supabase/.temp/postgres-version` (§ 3.2). Fichier
     renommé `postgres-version.bak` (accord de David). `db:start` → image `17.11.0.004`,
     **628/628 migrations**, comptes de seed (1 admin, 1 prof, 1 élève). **Pas** de
     `db:seed-riche` relancé (il n'y en avait pas avant).
  6. Suite locale complète : **584/584 fichiers verts, 7 297 tests, 12 min 49**.

## 3. Les causes (ce qui est établi, ce qui est supposé)

### 3.1 La base locale n'avance plus : migrations de rangement + contenu copié de la prod (SUPPOSÉ, très probable)

- 203 migrations (`grep -rln "déjà rangé" supabase/migrations | wc -l`) sont des **migrations de
  contenu** (rangement de modèles de questions dans l'arbre, tags, publication). Elles commencent
  par des **gardes** : si l'état n'est pas celui du relevé (ex. « modèles déjà rangés depuis le
  relevé »), elles lèvent `raise exception` et la transaction échoue.
  Exemple : `supabase/migrations/20261102181059_questions_tspe_lot7_rangement_tags.sql:167`.
- `db:seed-riche` copie le **contenu de la prod** dans la base locale : modèles, nœuds, tags,
  **déjà rangés** par ces migrations en prod.
- Donc, après un `db:seed-riche`, la prochaine migration de rangement trouve ses modèles déjà
  rangés → garde → échec → `supabase migration up --local` s'arrête **et bloque toutes les
  migrations suivantes**, y compris les migrations de schéma (tables, fonctions, policies).
- C'est exactement ce que décrit le journal `navadra` (« migration de rangement déjà jouée
  (contenu copié de la prod) »).
- **À vérifier à l'étape 1** : rejouer le scénario sur une base neuve (reset → seed-riche →
  ajouter une migration de rangement → `migration up --local`) et voir l'échec.
- Autre question : une base **sans** seed-riche (seed simple) reçoit-elle les migrations de
  rangement sans erreur ? (Le reset du 2026-11-21 l'a fait : 628/628, donc probablement oui :
  sans les modèles, les gardes ne voient rien.) À confirmer : que fait une migration de
  rangement quand les modèles n'existent pas (absents → ne fait rien, ou erreur) ?

### 3.2 L'image Postgres du dépôt principal différait de la CI (ÉTABLI, contourné)

- `supabase/.temp/postgres-version` (écrit par `supabase link`, ignoré par git) impose à la CLI
  l'image de la prod (`17.6.1.127`). Les **worktrees** n'ont pas de `supabase/.temp/` (ignoré) et
  la **CI** non plus : ils prennent l'image par défaut de la CLI 2.120.0, `17.11.0.004` (vérifié
  dans les logs du cron d'intégration).
- Avec `17.6.1.127`, la base **ne se reconstruit plus** depuis zéro (migration du chat, 42501).
- Contourné : renommé `supabase/.temp/postgres-version.bak`. **Un nouveau `pnpm db:link` le
  réécrira** et le problème reviendra.
- ⚠️ Les autres fichiers de `supabase/.temp/` imposent encore les versions de la prod pour les
  autres services : `gotrue-version` = `v2.197.0`, `rest-version` = `v14.5`,
  `storage-version` = `v1.77.5` (images en cours : `gotrue:v2.197.0`, `postgrest:v14.5`,
  `storage-api:v1.77.5`). Les worktrees et la CI prennent peut-être d'autres versions : **à
  comparer** à l'étape 1. Le dépôt principal en a besoin pour `db:migrate` (`project-ref`,
  `linked-project.json`) : on ne peut pas tout supprimer.
- Note : un journal a noté qu'un worktree doit copier `supabase/.temp/` du dépôt principal pour
  que `db:migrate` marche (« Cannot find project ref »). Copier ce dossier importe aussi les
  versions imposées.

### 3.3 Des données de dev cassent la mise en place des tests (ÉTABLI, en partie corrigé)

- Le global-setup (`tests/integration/global-setup.ts`) supprime tous les comptes `teacher`
  (contrainte mono-prof). Toute table qui référence `profiles` **sans `ON DELETE`** et contient
  une ligne d'un prof bloque cette suppression (`23503`).
- #2965 traite les 3 tables de liens de partage. Restent sans `ON DELETE` (relevé de la revue
  de #2965) : `game_challenges.created_by`, `exercise_assignments.assigned_by` et `student_id`,
  `exercise_completions.student_id`, `game_monsters.spawned_by` et `defeated_by`,
  `message_template_versions.modified_by`, `message_templates.reviewed_by`,
  `moderation_logs.moderator_id`, `student_achievements.unlocked_by`,
  `template_audit_log.performed_by`, `user_restrictions.restricted_by`,
  `worksheet_error_reports.reviewed_by`. Aucune n'est remplie par le seed de dev **aujourd'hui** ;
  le prof de dev peut en remplir en utilisant l'app (comme les liens de partage).
- Piste : une purge générique (toutes les clés vers `profiles` sans `ON DELETE`, lues dans
  `pg_constraint`) plutôt qu'une liste à tenir à la main. À proposer en phase 0.
- Question de fond : la suite d'intégration **détruit les comptes de dev** de la base partagée et
  les restaure à la fin (`teardown`). Si une session utilise l'app en même temps, elle perd son
  prof. Faut-il une base de test séparée de la base de dev (autre base dans le même Postgres, ou
  schéma) ? Décision d'architecture : **à David**.

### 3.4 Pas de commande officielle pour mettre la base locale à jour (ÉTABLI)

- `package.json` : `db:start`, `db:stop`, `db:reset`, `db:seed-riche`, `db:dev-accounts`, et
  `db:migrate` = `supabase db push` **vers la prod**. Aucune commande `pnpm` pour « appliquer les
  migrations en attente en local ». Chaque session improvise (`supabase migration up --local`,
  `psql -1` d'un fichier, `db:reset`).
- `db:start` sur une base existante n'applique **pas** les migrations nouvelles (à vérifier).
- Personne ne voit que la base locale prend du retard : aucun avertissement.

## 4. Ce qu'il faut savoir avant de toucher à quoi que ce soit

### 4.1 La base locale est partagée

- Une seule pile Supabase pour tout le dépôt et tous les worktrees (`project_id` `ubumaths`,
  ports 54321-54329 figés dans `supabase/config.toml`). Conteneur Postgres : `supabase_db_ubumaths`.
- Verrou `supabase` (`scripts/with-db-lock.sh` → `scripts/lib/lock.py`) sur `db:*` et
  `test:integration`. **Exit 2 = attendre, ne jamais contourner.**
- Le serveur de dev de David (port 5173) et ceux des worktrees (5176+) utilisent cette base
  (`.env.local` = base locale ; `.env` = **prod** : un worktree sans `.env.local` parle à la prod).
- Arrêter la pile (`db:stop`) coupe tout le monde pendant ce temps : le dire à David avant.

### 4.2 Commandes et fichiers

- `supabase/config.toml` : `[db] major_version = 17`, `[db.seed] sql_paths` = `./seed.sql`,
  `./seed/worksheet_system_templates.sql`, `./seed/dev_accounts.sql`,
  `./seed/dev_question_demo.sql` (joués par `db:reset` et le premier `db:start`).
- CLI Supabase = devDependency (`pnpm exec supabase`, version 2.120.0 ; 3.2.0 disponible).
- `psql` n'est pas installé sur la machine : passer par
  `docker exec supabase_db_ubumaths psql -U postgres …`.
- Lister les migrations appliquées en local :
  `docker exec supabase_db_ubumaths psql -U postgres -At -c "select version from supabase_migrations.schema_migrations order by 1"`,
  à comparer à `ls supabase/migrations`.

### 4.3 `db:seed-riche`

- `scripts/db-seed-riche/index.ts` (règles testées dans `regles.ts`, test
  `scripts/__tests__/db-seed-riche.test.ts`, inventaire `docs/wip/base-locale-inventaire.md`).
- Lit la prod en **lecture seule** (`.env`), écrit en local, déclencheurs suspendus ; aucune ligne
  d'un utilisateur autre que le prof et l'admin ; 30 élèves fictifs `eleveNN@local.test` /
  `local-eleve` + un hors classe ; activité générée.
- « À lancer après `pnpm db:reset` ». CLAUDE.md : `pnpm db:reset && pnpm db:seed-riche`.
- RGPD : **jamais de donnée d'élève en local**. Toute évolution garde cette règle et sa garde.

### 4.4 Les tests d'intégration

- `pnpm test:integration [fichier]` (sous verrou) ; global-setup `tests/integration/global-setup.ts`
  (supprime les profs, purge leurs modèles et liens de partage ; à la fin, restaure le prof de dev
  et refait le seed-riche s'il était présent).
- Beaucoup de tests de migration **rejouent eux-mêmes** leur fichier SQL : ils ne dépendent pas
  de l'état des migrations en local. Les autres supposent le schéma à jour.
- Suite complète en local : 12 min 49 (2026-11-21). En CI : voir `docs/pratiques/tests.md` § 3
  (tests touchés, passage déjà vert, morceaux).

## 5. Ce qui marche aujourd'hui (2026-11-21, après la remise à neuf)

- Base sur `17.11.0.004`, 628/628 migrations, seed simple (pas de seed-riche).
- Suite d'intégration locale : 584/584.
- **Tient tant que** : personne ne relance `db:seed-riche` puis n'attend qu'une migration de
  rangement passe en local ; personne ne refait `db:link` ; le prof de dev ne remplit pas une
  table non purgée (§ 3.3).

## 6. Plan proposé (validé dans son principe par David le 2026-11-21, détail à trancher)

1. **Comprendre (sans rien changer)** : rejouer § 3.1 sur une copie ; comparer les versions des
   services (dépôt principal / worktree / CI) ; vérifier ce que fait `db:start` des migrations
   nouvelles ; mesurer les durées (reset, seed-riche, migration up).
2. **Mise à jour sans effacer** : une commande unique (ex. `pnpm db:a-jour`) qui applique les
   migrations en attente, y compris quand le contenu vient de la prod ; éventuellement lancée
   d'elle-même avant `test:integration` ou au démarrage du serveur de dev.
3. **Tests protégés des données de dev** (§ 3.3) : purge générique, ou base de test séparée.
4. **Remise à neuf en une commande** : reset + seed-riche, quelques minutes, rare.
5. **Doc** : `docs/pratiques/environnement-de-dev.md`, `docs/pratiques/base-de-donnees.md`,
   ligne de `CLAUDE.md` (§ Commandes), mémoire `reference_supabase-temp-postgres-version`.

## 7. Questions de phase 0 (à poser APRÈS l'étape 1, en mots simples, avec un exemple)

- Les migrations de rangement en local : les **sauter** quand le contenu vient de la prod (elles
  ne concernent que le contenu), les rendre **tolérantes** (« déjà rangé → rien à faire »), ou
  marquer la base locale « contenu de la prod » pour qu'elles s'effacent d'elles-mêmes ?
  Attention : ces gardes protègent la **prod** (une migration de contenu qui tombe sur un état
  inattendu doit échouer en prod) ; ne pas les affaiblir là-bas.
- Faut-il garder `db:seed-riche` tel quel, ou le relancer automatiquement après chaque reset ?
- Base de test séparée de la base de dev, ou une seule base comme aujourd'hui ?
- Que faire de `supabase/.temp/*-version` : les ignorer pour la pile locale (même images que la
  CI), tout en gardant `project-ref` pour `db:migrate` ?

## 8. Historique

- 2026-11-21 : chantier ouvert par la session `ci-integration` à la demande de David, qui le
  lancera dans une session neuve. Rien n'est codé.
- 2026-11-21 : étape 1 faite (§ 9), questions de phase 0 posées à David.

## 9. Étape 1 : ce qui a été mesuré (2026-11-21)

### 9.1 La copie isolée (pour expérimenter sans toucher à la base partagée)

- Copie de `supabase/` (sans `.temp`) dans un dossier temporaire, `config.toml` modifié :
  `project_id = "ubumaths-essai"`, ports `5442x` au lieu de `5432x`.
- `pnpm exec supabase --workdir <copie> db start` : Postgres **seul** (un conteneur,
  `supabase_db_ubumaths-essai`), aucun conflit avec la pile partagée.
- `SEED_RICHE_PG_URL=postgresql://postgres:postgres@127.0.0.1:54422/postgres npx tsx
scripts/db-seed-riche/index.ts` remplit la copie (le script écrit par `pg` direct).
- Fin : `supabase --workdir <copie> stop --no-backup` (conteneur et volume supprimés).

### 9.2 La panne du § 3.1 est ÉTABLIE

Scénario rejoué : base construite avec 625 migrations (les 3 du 2026-11-20 retirées), seed-riche,
puis les 3 migrations remises et `supabase migration up --local`.

- Échec à la première : `20261120120749_questions_2de_ensembles_calculs_rangement_tags.sql`,
  « modèles déjà rangés depuis le relevé : 3 ». La base reste à 625.
- Jouées une à une (transaction annulée), les **trois** échouent : « déjà rangés : 3 »,
  « déjà rangés : 36 », et `…_publies_contenu.sql` : « contenu différent de celui attendu ».
- Condition exacte de la panne : le contenu local vient de la prod **et** la base locale a des
  migrations de contenu en retard. `db:seed-riche` **remplace** le contenu à chaque passage
  (`delete` puis insertion, table par table) et la fin de `test:integration` le **relance toute
  seule** quand il était présent (`tests/integration/global-setup.ts`, `seedRicheARefaire`) :
  chaque suite d'intégration remet donc le contenu « en avance » sur les migrations.
- Sans seed-riche : les modèles n'existent pas, les gardes voient 0 modèle et laissent passer
  (628/628 sur la base partagée).

### 9.3 Combien de migrations sont concernées

- 330 migrations sur 628 portent une garde de contenu (`déjà rangé`, `contenu différent`,
  `depuis le relevé`, `partiellement présents`) ; 308 s'appellent `…_questions_…`.
- Depuis le 2026-11-01 : 228 sur 260. Presque toutes les migrations récentes sont du contenu.
- Elles ne touchent pas au schéma, à part suspendre un déclencheur le temps de l'écriture
  (303 fois `alter table public.question_templates disable/enable trigger`).

### 9.4 Autres mesures

- `db start` sur une base existante avec 3 migrations en attente : **n'applique rien**
  (« Starting database from backup », 11 s, toujours 625). § 3.4 établi.
- Durées (Postgres seul) : reconstruction de zéro, 625 migrations + seeds : **53 s** ;
  seed-riche : **12 s** (13 103 lignes, 2 770 modèles) ; `migration up --local` sans rien en
  attente : **0,35 s** (peut donc tourner avant chaque `test:integration` sans coût).
- Versions des services : dépôt principal (imposées par `supabase/.temp/`) PostgREST `v14.5`,
  Storage `v1.77.5`, GoTrue `v2.197.0` ; CI et worktrees (défaut de la CLI 2.120.0,
  `supabase services`) PostgREST **`v16.4`**, Storage **`v1.79.36`**, GoTrue `v2.197.0`,
  Postgres `17.11.0.004`. Les tests locaux du dépôt principal tournent donc sur un PostgREST
  et un Storage plus anciens que ceux de la CI.

### 9.5 Questions de phase 0 posées à David (2026-11-21), en attente

1. Migrations de contenu en local quand le contenu vient de la prod : les **noter comme faites
   sans les jouer** (recommandé), ou autre chose ?
2. Mise à jour **automatique** avant `test:integration` et au démarrage du serveur de dev, ou
   commande à lancer à la main ?
3. Tests sur une **base séparée** de la base de dev (recommandé), ou une seule base ?
4. Mêmes versions des services que la CI pour la pile locale (recommandé) ?

## 10. Phase 0 : réponse de David et proposition (2026-11-21)

Réponse de David aux 4 questions du § 9.5, mot pour mot : « je veux le travail le plus propre et
fiable possible ». Lecture faite, **à confirmer par lui avec le découpage** : contenu noté comme
fait sans être joué (Q1), mise à jour automatique (Q2), tests séparés du dev (Q3), versions de la
CI (Q4).

Correction sur la Q3 : « une deuxième base dans le même Postgres » ne marche pas. Les tests
passent par l'API (`SUPABASE_TEST_URL`, 175 fichiers), et l'API d'une pile Supabase ne sert qu'une
base. Séparer = une **deuxième pile** (`project_id` et ports à elle), construite comme celle de la
CI : migrations + seed simple, jamais de contenu de la prod, mêmes versions. Faisable : les tests
lisent leurs adresses dans l'environnement (`SUPABASE_TEST_*`, `SUPABASE_DB_*`), `54321` n'est
qu'une valeur de repli (181 fichiers), `54322` n'est en dur que dans le global-setup. Coût : de la
mémoire (pile actuelle ≈ 1,4 Go ; sans studio ni mailpit, moins).

Découpage proposé (une PR = une session) :

1. **PR 1, `pnpm db:a-jour`** : applique les migrations en attente sur la base de dev sans rien
   effacer ; une migration de contenu est notée comme faite sans être jouée quand la base porte
   le contenu de la prod ; lancée avant le serveur de dev ; `db:seed-riche` refuse une base en
   retard.
2. **PR 2, pile de test séparée** : `test:integration` démarre et met à jour sa propre pile, ne
   touche plus à la base de dev ; le global-setup ne détruit plus rien chez le dev et ne relance
   plus seed-riche.
3. **PR 3, versions de la CI** : la pile de dev ignore `supabase/.temp/*-version`.
4. **PR 4, remise à neuf en une commande + doc** (`environnement-de-dev.md`,
   `base-de-donnees.md`, `CLAUDE.md`, `docs/pratiques/worktrees.md`), versement.

David, le 2026-11-21 : « Je valide » (comportements et découpage en 4 PR, deuxième pile comprise).

## 11. PR 1 : `pnpm db:a-jour` (2026-11-21)

- **Constat qui a changé le plan** : `supabase migration up --local` refuse de tourner dès que la
  base porte une version sans fichier (`MigrationMissingLocalError`, essayé sur la copie), avec ou
  sans `--include-all`. C'est l'état normal d'une base partagée par des worktrees sur des branches
  différentes. La mise à jour est donc écrite ici (`scripts/db-a-jour/`), par `pg` direct, une
  transaction par migration, même historique que la CLI.
- **Règles** (`regles.ts`) : fichiers présents dont la version manque, dans l'ordre (fichier
  ancien compris, version sans fichier ignorée). Après un échec, la migration est notée comme
  faite seulement si : base marquée « contenu de la prod » **et** migration sans instruction de
  schéma (`instructionDeSchema`, déjà utilisée par la garde `@migration-de-donnees` ; sur les
  628 migrations, 368 sont de contenu, 6 migrations de contenu anciennes sont classées « schéma »,
  dans le sens sûr) **et** erreur de classe `P0` (garde) ou `23` (contrainte). Sinon : arrêt, avec
  le fichier, l'erreur et la raison. Secours : `--noter <version>`.
- **Marque « contenu de la prod »** : table `base_locale.etat`, créée par `db:seed-riche` après la
  copie (jamais par une migration : elle n'existe pas en prod) ; un `db:reset` l'efface avec le
  contenu. Une marque lue dans les données (classes `LOCAL…`) aurait disparu pendant une suite
  d'intégration interrompue.
- **Automatique** : `pnpm dev` lance `scripts/db-a-jour-auto.sh` (0,26 s quand il n'y a rien à
  faire) : seulement les migrations présentes sur `origin/main` (celle d'une branche en cours,
  peut-être destructive, demande un `pnpm db:a-jour` explicite), jamais bloquant (verrou tenu,
  base arrêtée, échec : un avertissement). `db:seed-riche` met la base à jour avant de copier.
- **Preuves** : 17 tests de règles ; 14 tests d'intégration sur une base jetable
  (`create database`), rouges quand on casse la règle (2 mutations) ; panne du § 9.2 rejouée de
  bout en bout sur la copie : 3 migrations de contenu notées, 1 migration de schéma jouée, 0,18 s.
- **Reste pour les PR suivantes** : `test:integration` ne lance pas encore `db:a-jour` (PR 2 : la
  pile de test aura sa propre mise à jour).
