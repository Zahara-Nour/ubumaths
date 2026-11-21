---
status: clos
---

# Chantier `base-locale` : une base Supabase locale toujours à jour, sans y penser

## Reprendre ici

_Mis à jour le 2026-11-21, après #2970. **Chantier clos.**_

- **État** : les 4 PR sont mergées. #2966 : `pnpm db:a-jour` (base de dev à jour sans rien
  effacer, toute seule avant `pnpm dev`) ; #2967 : pile de test à part ; #2968 : versions de la CI
  pour la pile de dev ; #2970 : `pnpm db:neuf` (remise à neuf en une commande, § 14).
- **Versé** : `docs/pratiques/environnement-de-dev.md`, `base-de-donnees.md`, `tests.md` § 4,
  `commandes.md`, `worktrees.md`, `CLAUDE.md`. Ce journal et `base-locale-inventaire.md` sont archivés ici.
- **Prochaine action** : aucune.
- **En attente de David** : lancer une fois `pnpm db:neuf` sur la vraie base de dev, au moment de
  son choix (ligne dans `docs/wip/verifications-manuelles.md`) ; jusque-là seule une copie isolée l'a vue.
- **Pièges durables** : `db:neuf` et `db:reset` effacent les données de dev de tous ; `db:migrate` =
  **prod**. Jamais `pnpm exec supabase start|stop|db reset` à la main : `pnpm db:*`.

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
  `scripts/__tests__/db-seed-riche.test.ts`, inventaire `docs/archive/wip/base-locale-inventaire.md`).
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
- **Revue de code (`code-reviewer`, 2026-11-21)** : rien de bloquant. Corrigé dans la PR :
  délai d'attente d'un verrou en mode automatique (`lock_timeout` 5 s : un `alter table` ne
  bloque plus `pnpm dev` derrière la transaction d'un autre serveur) ; cible refusée si le compte
  n'est pas `postgres` / `postgres` (un tunnel vers une base distante écoute aussi sur
  `localhost`) ; migration qui porte son propre `begin` / `commit` (6 anciennes) jouée telle
  quelle et jamais notée après un échec ; seule `P0001` compte comme garde (plus toute la classe
  `P0`) ; tests de la ligne de commande, du délai de verrou et du signal à PostgREST.
- **Choix assumés, à revoir si ça gêne** : (1) le mode automatique joue TOUTES les migrations
  d'`origin/main`, destructives comprises : une branche pas encore remise à jour sur `main` peut
  voir disparaître en local une colonne qu'elle lit encore (comme en CI, qui teste la branche
  fusionnée à `main`). (2) La marque « contenu de la prod » reste posée si une suite d'intégration
  interrompue vide une partie du contenu ; la PR 2 (pile de test séparée) supprime ce cas.
- 2026-11-21 : PR 1 mergée (#2966). CI rouge une fois : filtre `paths` de la suite d'intégration (deux fichiers de `scripts/db-a-jour/` non couverts), corrigé dans la PR.

## 12. PR 2 : pile de test séparée, phase 0 (2026-11-21)

Relevé avant de proposer :

- Pile de dev mesurée (`docker stats`) : 1,24 Go pour 9 conteneurs ; sans studio, postgres-meta
  ni mailpit (comme la CI, option `-x`), environ 0,9 Go. Docker dispose de 11,7 Go.
- `.env.local` ne définit aucun `SUPABASE_TEST_*` ni `SUPABASE_DB_*` : en local les tests tombent
  sur les valeurs de repli (`54321`, `54322`). Il suffit donc de poser ces variables au lancement.
- Utilisent la base locale par ce chemin : `test:integration`, `test:integration:watch`,
  `test:definer-guard`. `test:verifs` (Playwright) passe par un serveur de dev : reste sur la base
  de dev.
- Les clés d'API locales sont les mêmes pour toutes les piles (secret JWT par défaut de la CLI).

Comportements proposés à David :

- **Nominal** : `pnpm test:integration [fichier]` démarre la pile de test si elle est arrêtée,
  lui applique les migrations de la branche, lance les tests. La base de dev n'est jamais touchée
  (prof de dev, classes du seed-riche, serveur de dev). Pile de test = celle de la CI : migrations
  - seed simple, versions de la CLI, jamais de contenu de la prod. `test:definer-guard` aussi.
    Verrou à part (`supabase-test`) : les tests ne bloquent plus `db:*` ni `pnpm dev`, et inversement.
- **Limite** : la pile porte une migration que la branche n'a pas (autre worktree) → reconstruite
  de zéro avant les tests (environ 1 min), avec un message. Commandes `pnpm db:test:stop` et
  `pnpm db:test:reset`.
- **Erreur** : migration de la branche en échec → la suite ne démarre pas (fichier + erreur),
  jamais « notée comme faite ». Docker arrêté ou port pris → message clair. En local, le
  global-setup refuse de supprimer quoi que ce soit si la base visée n'est pas la pile de test.

Questions posées : (1) la pile reste allumée après les tests, ou s'arrête ? (2) migration d'une
autre branche dans la pile : reconstruire, ou tolérer ?

Réponse de David (2026-11-21) : « Je suis tes recos » → la pile **reste allumée** après les tests,
et elle est **reconstruite** quand elle porte la migration d'une autre branche.

Ce qui a été livré (#2967) :

- `scripts/pile-de-test.sh` (verrou, passe-plat en CI), `scripts/pile-de-test/` (règles pures
  - commande). Dossier de travail de la CLI : `node_modules/.cache/pile-de-test` (config réécrite,
    copie des migrations et des seeds de la branche). La pile note l'empreinte de chaque migration
    jouée et celle du décor (seeds, configuration, version de la CLI, services exclus) dans
    `supabase_migrations.pile_de_test`.
- Reconstruction (`stop --no-backup` + `start`) quand : migration absente de la branche, migration
  modifiée depuis son passage, empreinte manquante, décor changé. Sinon `mettreAJour` de
  `scripts/db-a-jour` ; une migration en échec arrête tout avant les tests.
- global-setup : refuse en local si la base visée n'est pas la pile de test (port + table
  d'empreintes) ; plus de restauration du prof de dev ni de seed-riche en sortie.
- La CI est reconnue à `GITHUB_ACTIONS`, pas à `CI` (un outil qui exporterait `CI` sur le poste
  enverrait la suite sur la base de dev).
- **Mesures** : construction de zéro 33 à 37 s ; relance après `db:test:stop` 26 s ; pile à jour,
  surcoût négligeable ; mémoire ≈ 675 Mo (6 conteneurs) ; suite complète 586/586 fichiers,
  7 316 tests, 12 min 36.
- **Panne trouvée en route** : une première suite complète a eu 3 tests rouges
  (`admin-elevation`, `modeles-publies-plafond-1000`), verts seuls. Cause : `$app/env/public` est
  un FICHIER (`.svelte-kit/generated/dev/env/`), réécrit par tout démarrage de vite dans le
  worktree ; un `pnpm test:server` lancé pendant la suite y a remis l'adresse de la base de dev,
  et le code serveur des tests suivants lui a parlé. Correctif : le lanceur ne pose plus
  `PUBLIC_SUPABASE_URL` (le disque garde toujours l'adresse de dev, un serveur de dev du worktree
  n'est pas détourné), et `vitest.integration.config.ts` impose l'adresse de la pile de test au
  chargement des modules générés et dans `process.env` des tests. Gardé par
  `tests/integration/pile-de-test-adresse.test.ts` (rouge quand on coupe le correctif) ; seconde
  suite complète verte avec un `test:server` lancé au milieu.
- **Revue de code** : rien de bloquant ; corrigé dans la PR (en-tête de `dev_accounts.sql`,
  `GITHUB_ACTIONS`, messages d'erreur, empreinte des migrations notées).
- **Choix assumés** : une migration de la branche plus ancienne que la dernière jouée est
  appliquée après les autres (la CI les joue dans l'ordre) ; `pnpm db:test:reset` remet l'ordre.
  `test:verifs` (Playwright) reste sur la base de dev. `scripts/run-all-migration-tests.sh` vise
  toujours `54322` en dur (script ancien, hors `package.json`).
- **Doc mise à jour le 2026-11-21, après le merge** (demande de David) : `environnement-de-dev.md`
  (décisions d'outillage), `tests.md` § 4, `base-de-donnees.md`, `worktrees.md` (trois verrous),
  `git-workflow.md` § 4, `rls-echecs-silencieux.md`. Reste pour la PR 4 : la remise à neuf en une
  commande, sa doc, et le versement du chantier.

## 13. PR 3 : versions de la CI pour la pile de dev (2026-11-21)

Comportement validé au § 10 (point 3) : la pile de dev ignore `supabase/.temp/*-version`.

- **Mécanisme** : `scripts/pile-de-dev.sh` lance la CLI avec `--workdir node_modules/.cache/pile-de-dev`,
  un dossier miroir refait à chaque lancement : des liens vers tout `supabase/`, sauf `.temp` et
  `.branches`. Sans `.temp`, la CLI prend ses versions par défaut, celles de la CI. `pnpm db:start`,
  `db:stop` et `db:reset` passent par lui (sous le verrou `supabase`, inchangé).
- **Pourquoi pas écarter les fichiers `*-version`** : un `pnpm db:link` (ou un `supabase link` à la
  main) les réécrit, et le problème reviendrait. Le miroir ne dépend pas de ce que contient
  `supabase/.temp/`, et n'y touche jamais : `db:migrate`, `db:link`, `db:types` (la prod) y lisent
  toujours `project-ref` et ne passent pas par le script.
- **Mesuré dans le dépôt principal** (`supabase services`, lecture seule) : CLI directe → PostgREST
  `v14.5`, Storage `v1.77.5` (prod) ; par le script → PostgREST `v16.4`, Storage `v1.79.36`,
  Postgres `17.11.0.004`, GoTrue `v2.197.0`, les versions de la pile de test et de la CI. Même pile :
  `status` par le script rend les ports `5432x` et le projet `ubumaths`.
- **Prouvé sur une copie isolée** (§ 9.1 : projet `ubumaths-essai`, ports `5442x`, CLI lancée par
  le script, un `postgres-version` = `17.6.1.127` planté dans le `.temp` de la copie) : `db start`
  prend Postgres `17.11.0.004`, joue les 628 migrations et les 4 seeds à travers les liens ;
  `db reset` idem (628 migrations, 3 comptes) ; `stop --no-backup` retire conteneur et volume ; le
  fichier planté est intact. La pile de dev n'a pas été touchée.
- **Garde** : le hook `garde-commandes.py` refuse `start`, `stop` et `db reset` de la CLI lancés à
  la main (`pnpm exec supabase …`, `pnpm supabase …`, `node_modules/.bin/supabase …`, drapeaux
  avant la commande compris), sauf avec un `--workdir` vers un autre dossier (copie isolée du
  § 9.1). `db reset --linked` (la prod) a son propre refus. Garde-fou d'habitude, pas une
  sécurité : une commande enrobée dans un script ou une variable passe.
- **Relecture** (`code-reviewer`) : rien de bloquant ; corrigé dans la PR : preuve réelle
  ci-dessus, contournements du hook, miroir construit à côté puis mis en place d'un coup, refus
  sans CLI installée, tests du fichier retiré, du fichier caché et du chemin avec espace.
- **Tests** : `scripts/__tests__/pile-de-dev.test.ts` (fausse CLI : elle voit config, migrations et
  seeds, pas `.temp` ; `supabase/.temp` du dépôt intact ; arguments et code de sortie transmis),
  `garde-commandes.test.ts`.
- **Après le merge** : la pile de dev qui tourne garde ses images (PostgREST `v14.5`, Storage
  `v1.77.5`) jusqu'à un `pnpm db:stop` puis `pnpm db:start` depuis le dépôt principal. Coupe la base
  de dev de toutes les sessions une minute : **prévenir David avant**. Les données restent.
- `supabase/.temp/postgres-version.bak` (renommé à la main au § 3.2) n'a plus d'effet dans un sens
  ni dans l'autre : laissé tel quel.
- **Mergée (#2968) et pile redémarrée le 2026-11-21** (`pnpm db:stop` puis `pnpm db:start` depuis le
  dépôt principal, accord de David) : images PostgREST `v16.4`, Storage `v1.79.36`, Postgres
  `17.11.0.004`, GoTrue `v2.197.0` ; avant et après : 3 comptes, 3 profils, 628 migrations,
  7 objets Storage ; connexion du prof de dev et lecture par l'API vérifiées.

## 14. PR 4 : `pnpm db:neuf`, remise à neuf en une commande (2026-11-21)

Phase 0 validée par David le 2026-11-21 (« je te suis », sur les comportements et les trois
recommandations) :

- **Nom** : `pnpm db:neuf` (à côté de `db:a-jour` : à jour = sans rien effacer, neuf = de zéro).
- **Confirmation** : taper « oui » avant d'effacer ; `--oui` pour s'en passer ; sans terminal ni
  `--oui`, refus (pas d'attente sans fin).
- **Pas de `pnpm db:restart`** : `pnpm db:stop` puis `pnpm db:start` suffisent.
- **Nominal** : efface la base de dev, la reconstruit, la remplit comme `db:seed-riche` ; un seul
  verrou `supabase` du début à la fin ; bilan court (migrations, modèles, comptes, durée).
- **Limites** : pile arrêtée → démarrée par la commande ; verrou tenu par une autre session →
  exit 2 sans rien effacer ; pile de test jamais touchée.
- **Erreurs** : prod injoignable → vérifié AVANT d'effacer, arrêt sans rien toucher ; remplissage
  en échec après l'effacement → le dire (base reconstruite, sans le contenu de la prod).
- `db:reset` et `db:seed-riche` restent utilisables seuls.

Réalisation :

- `scripts/db-neuf.sh` : vérifie le verrou (sans le garder pendant la question), demande « oui »,
  puis se relance sous `with-db-lock.sh` (variable `DB_NEUF_SOUS_VERROU`, refusée sans le verrou) : `db-seed-riche --verifier-prod`, `pile-de-dev.sh start`,
  `pile-de-dev.sh db reset`, `db-seed-riche`. `start` sur une pile déjà démarrée ne fait rien.
- `scripts/db-seed-riche/index.ts` : option `--verifier-prod` (une lecture en prod, rien d'ouvert
  ni d'écrit en local) ; ligne de bilan à la fin (migrations, modèles, comptes).
- **Tests** : `scripts/__tests__/db-neuf.test.ts` (fausse CLI et faux `tsx`, dépôt git temporaire
  pour avoir un verrou à soi) : ordre des 4 étapes, refus sans `--oui`, prod injoignable et pile
  qui ne démarre pas → rien d'effacé, échecs du reset et du remplissage, verrou tenu → exit 2,
  verrou tenu aux quatre étapes, saisie au clavier (pseudo-terminal).
- **Prouvé sur une copie isolée** (§ 9.1 : projet `ubumaths-essai`, ports `5442x`, verrou à part) :
  pile éteinte et sans volume → **79 s** ; pile déjà démarrée → **45 s** ; chaque fois 628
  migrations, 2 770 modèles, 34 comptes. Sans terminal ni `--oui` : refus, exit 1. Pile de dev
  intacte pendant l'essai (628 migrations, 3 comptes), copie supprimée ensuite.
- **Doc** : `environnement-de-dev.md`, `base-de-donnees.md`, `commandes.md`, `worktrees.md`,
  `CLAUDE.md`, `README.md`.
- **Relecture** (`code-reviewer`) : rien de bloquant ; corrigé dans la PR : le mode interne passe
  par une variable d'environnement qui exige le verrou tenu (un drapeau `--sous-verrou` tapé à la
  main sautait confirmation et verrou) ; la vérification de la prod lit `question_templates` avec
  un délai maximum de 20 s (elle tourne sous le verrou) ; tests ajoutés : saisie de « oui » et de
  « non » dans un pseudo-terminal, verrou tenu aux quatre étapes, variable interne sans verrou.
- **Mergée (#2970) le 2026-11-21.**
- **Non fait** : `pnpm db:neuf` n'a pas été lancée sur la vraie base de dev (elle efface les données
  de toutes les sessions) : à David de choisir le moment.
