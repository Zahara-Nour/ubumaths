# Chantier `base-locale` : une base Supabase locale toujours à jour, sans y penser

## Reprendre ici

_Mis à jour le 2026-11-21 : chantier ouvert, rien n'est codé._

- **État** : chantier ouvert par la session `ci-integration` après une journée perdue sur la base
  locale (§ 2). Base locale remise à neuf le 2026-11-21, suite d'intégration locale 584/584 verte ;
  la cause principale (§ 3.1) n'est **pas** corrigée.
- **Prochaine action** : étape 1 du § 6 (comprendre, mesurer, sans rien changer), puis une
  **phase 0** à David en mots simples (§ 7).
- **En attente de David** : rien avant le rapport de l'étape 1.
- **Pièges en cours** : base locale partagée par toutes les sessions (verrou `supabase`, ne
  jamais le contourner) ; `db:reset` efface les données locales de tout le monde ; `db:migrate`
  = **prod** (`supabase db push`), jamais pour la base locale.
- **Worktree / branche** : aucun ; à créer au premier code (`../ubumaths-wt-base-locale`).

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
