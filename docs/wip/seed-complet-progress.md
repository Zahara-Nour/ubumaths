# Chantier `seed-complet` : une base locale sans page vide

## Reprendre ici

_Mis à jour le 2026-11-21, pendant la PR 1 (pas encore mergée)._

- **État** : PR 1 (inventaire et garde) codée et prouvée sur une copie isolée (§ 7) ; en relecture.
  Classement du § 3 et découpage du § 5 **validés** par David le 2026-11-21 (« go »).
- **Prochaine action** : merger la PR 1 (CI verte, relectures), puis PR 2, suivi et travail
  scolaire (§ 5) : règles testées sans base, preuve sur copie isolée, pages à ouvrir notées.
- **En attente de David** : (1) tableau de tâches du prof (`kanban_*`) et signalements de bug
  (`bug_reports`) : en inventer, ou laisser vide ? (vides en attendant) ; (2) modèles de messages :
  aucun en prod, non copiés (§ 7), à inventer en PR 4 ou à laisser tels quels ?
- **Pièges en cours** : RGPD, **jamais de donnée d'élève en local** : une table d'activité
  s'INVENTE, elle ne se copie pas. Essais sur une copie isolée de la pile
  (`docs/archive/wip/base-locale-progress.md` § 9.1), jamais sur la base de dev partagée.
  `avatar_catalog` est vide en prod : voir le chantier `boutique-avatars` avant d'inventer des achats.
  Une table de `COPIE` vide en prod **vide** la table locale : regarder la base de dev avant d'en ajouter.
- **Worktree / branche** : `../ubumaths-wt-seed-complet`, `feat/seed-complet-inventaire`.

---

## 1. Ce que veut David (2026-11-21)

> « qu'est ce qu'on doit mettre dans la base locale pour qu'elle soit synchro avec la base en prod
> sur certains contenus (exercices, modèles…), mais avec d'autres inventées comme les comptes
> utilisateurs (élèves… voir quoi d'autres) ? »

Puis, à la question « quelles pages vides te gênent ? » : **« je veux tout couvrir »**.

Traduction : après `pnpm db:neuf` (ou `pnpm db:seed-riche`), aucune page de l'appli n'est vide en
local faute de données. Le contenu vient de la prod ; tout ce qui touche un élève est inventé.

Ce qui existe déjà (chantier du 2026-10-10, inventaire `docs/archive/wip/base-locale-inventaire.md`,
code `scripts/db-seed-riche/`) : 57 tables copiées, 30 élèves fictifs + un hors classe, une activité
inventée partielle (fiches assignées, progressions, Gidouilles, bonus, avertissements, une
discussion de classe, des amitiés, une évaluation assignée).

## 2. Mesures (2026-11-21, prod en lecture seule : des comptes de lignes, aucune donnée lue)

- **233 tables** dans le schéma `public` (218 le 2026-10-10). Listes du code
  (`scripts/db-seed-riche/regles.ts`) : `COPIE` 57, `JAMAIS` 43. **133 tables ne sont dans aucune
  des deux** : rien n'oblige à classer une table nouvelle.
- La prod a aussi `web_vital_samples`, absente du schéma local mesuré : à regarder en PR 1.
- **8 compartiments de fichiers** (Storage) : `question-images`, `exercise-images`,
  `vip-card-images`, `parody-evaluations`, `chapter-documents`, `message-attachments`,
  `chat-attachments`, `bug-report-screenshots`. Aucun fichier n'est copié aujourd'hui.
- `avatar_catalog` : 0 ligne en prod comme en local (la boutique d'avatars n'a pas encore de
  catalogue en base) : à vérifier avec le chantier `boutique-avatars` avant d'inventer des achats.

Lignes en prod des tables non classées qui en ont (les autres sont à 0) :
`dictionary_entries` 675, `dictionary_entry_versions` 10, `question_template_reviews` 189,
`worksheet_styles` 13, `game_monsters` 4, `geometry_figures` 1, `school_year_closures` 1,
`chapter_template_instantiations` 2, `minesweeper_tournaments` 4,
`minesweeper_tournament_classes` 9, `minesweeper_tournament_games` 29, `coursework_materials` 19,
`shared_materials` 4, `shared_coursework` 1, `user_preferences` 1,
`user_whiteboard_template_favorites` 1, `whiteboard_export_counters` 42, `bonus_history` 352,
`daily_game_rewards` 2 171, `weekly_rewards` 1 517, `weekly_best_rewards` 315,
`vip_cards_activity` 2 895, `student_buddies` 58, `student_mathoux` 2, `student_point_state` 16,
`student_exercise_mastery` 117, `student_last_visits` 1, `skill_attempts` 101, `test_sessions` 16,
`test_answers` 101, `game_2048_scores` 43, `game_combats` 13, `mathemo_scores` 19,
`minesweeper_student_achievements` 74, `marketplace_listings` 59, `marketplace_proposals` 31,
`marketplace_locked_cards` 10, `message_reactions` 27, `message_reports` 4, `message_drafts` 2,
`message_inbox` 4, `message_search_index` 3, `moderation_logs` 2, `user_restrictions` 2,
`worksheet_assignment_classes` 11, `worksheet_error_reports` 14, `exercise_share_tokens` 9,
`class_course_share_tokens` 2, `class_journal_share_tokens` 2, `kanban_*` 15 en tout,
`google_classroom_*` 284 en tout, `background_job_runs` 2 731, `error_occurrences` 526,
`achievement_migrations` 1, `rate_limits` 1.

## 3. Classement proposé (à valider par David)

Trois familles, et une seule par table.

### 3.1 Copier depuis la prod (contenu : auteur prof, admin ou personne)

À ajouter aux 57 tables déjà copiées :

- **Dictionnaire** : `dictionary_entries`, `dictionary_entry_versions`.
- **Modèles de questions** : `question_template_reviews` (relectures).
- **Fiches** : `worksheet_styles`, `worksheet_classifications`.
- **Jeux (contenu)** : `game_monsters`, `game_achievements`, `game_timeslots`,
  `game_class_settings`, `minesweeper_tournaments`, `minesweeper_tournament_classes`.
- **Boutique** : `avatar_catalog`.
- **Géométrie, chapitres, calendrier** : `geometry_figures`, `chapter_template_instantiations`,
  `school_year_closures`, `riddle_of_the_day`, `class_carnet_settings`.
- **Réglages du prof** : `user_preferences`, `user_whiteboard_template_favorites`,
  `user_favorite_templates`, `user_folders`, `exercise_favorites`, `message_templates`,
  `message_template_versions` (lignes du prof ou de l'admin seulement, comme aujourd'hui).
- **Vides en prod aujourd'hui, mais du contenu** (copiées dès qu'elles se rempliront) :
  `exercise_templates`, `coursework_categories`, `srs_deck_sections`, `rag_documents`, `rag_chunks`.

Le filtre d'auteur et la garde de fuite existants s'appliquent à chacune.

### 3.2 Inventer pour les élèves fictifs (activité : jamais copiée)

Déjà inventé : `worksheet_assignments`, `worksheet_assignment_classes`,
`student_exercise_mastery`, `gidouilles_activity`, `bonus_history`, `student_warnings`,
`conversations`, `conversation_participants`, `messages`, `friendships`, `evaluation_assignments`.

À inventer, par domaine :

- **Boutique, Mathoux, Palotins** : `student_avatars`, `student_mathoux`,
  `student_mathou_decorations`, `student_beasts`, `student_buddies`.
- **Succès et récompenses** : `student_achievements`, `achievement_progress`,
  `achievement_events`, `reward_events`, `daily_game_rewards`, `weekly_rewards`,
  `weekly_best_rewards`, `vip_cards_activity`, `daily_summaries`.
- **Jeux** : `game_players`, `game_spells`, `game_spell_decks`, `game_combats`,
  `student_combat_moves`, `game_player_achievements`, `game_challenge_attempts`,
  `game_leaderboards`, `game_2048_scores`, `mathemo_scores`, `minesweeper_games`,
  `minesweeper_player_stats`, `minesweeper_student_achievements`, `minesweeper_tournament_games`.
- **Révisions** : `srs_decks`, `srs_cards`, `srs_card_stats`, `srs_review_sessions`,
  `srs_deck_assignments`.
- **Devinettes et Python** : `riddle_assignments`, `riddle_attempts`,
  `python_exercise_assignments`, `python_exercise_submissions`, `python_exercise_mastery`,
  `python_file_assignments`, `python_notebook_assignments`, `python_notebook_checkpoint_runs`.
- **Évaluations et suivi** : `evaluation_attempt_questions`, `test_sessions`, `test_answers`,
  `skill_attempts`, `student_point_state`, `student_observable_state`,
  `student_competence_level`, `student_checklist_progress`, `student_last_visits`.
- **Fiches et exercices assignés** : `worksheet_assignment_students`,
  `worksheet_assignment_exercise_settings`, `worksheet_instances`, `exercise_assignments`,
  `exercise_completions`, `worksheet_error_reports`, `student_print_settings`.
- **Échanges** : `private_messages`, `message_reactions`, `message_reports`, `message_drafts`,
  `notifications`, `notification_reads`, `tutor_conversations`, `tutor_messages`,
  `user_restrictions`, `moderation_logs`, `message_moderation_logs`.
- **Marché** : `marketplace_listings`, `marketplace_proposals`, `marketplace_trades`,
  `marketplace_trade_offers`, `marketplace_locked_cards`, `marketplace_chat_messages`,
  `marketplace_listing_views`.
- **Famille et inscription** : `parental_consents`, `parent_contacts`, `parent_carnet_links`,
  `parent_notifications`, `parent_exception_episodes`, `student_carnet_opt_outs`,
  `pending_students`, `terms_acceptances`.
- **Cahier de texte** (tranché au § 4) : `class_journal_entries`, `journal_entry_*`.
- **Liens de partage** (tranché au § 4) : `class_course_share_tokens`,
  `class_journal_share_tokens`, `exercise_share_tokens`.
- **Non tranché, à poser si besoin** : tableau de tâches du prof (`kanban_*`), signalements de
  bug (`bug_reports`).

### 3.3 Jamais copiées, laissées vides (technique, secrets, liens vers l'extérieur)

- **Traces** : `audit_logs`, `error_logs`, `error_occurrences`, `background_job_runs`,
  `rate_limits`, `server_cache`, `template_audit_log`, `account_deletion_audit`,
  `achievement_migrations`, `migration_images`, `orphaned_documents`, `web_vital_samples`,
  `whiteboard_export_counters`, `template_usage_stats`, `minesweeper_reference_times_history`,
  `welcome_emails_sent`.
- **Calculées ou éphémères** : `message_search_index`, `message_inbox`, `user_presence`,
  `minesweeper_multiplayer_*`, `srs_anti_fraud_flags`, `short_links`.
- **Secrets et liens vers l'extérieur** : `google_integrations`, `google_classroom_*`,
  `chapter_documents`, `chapter_decks`, `coursework_materials`, `shared_materials`,
  `shared_coursework`, `shared_coursework_students`, `message_attachments`,
  `message_attachments_v2`.

## 4. Questions pour David (phase 0)

1. **Cahier de texte** : le 2026-10-10, tu as décidé de ne jamais le copier. Faut-il en inventer un
   faux (quelques séances et devoirs par classe) pour que la page ne soit pas vide ?
2. **Documents de cours** (liens vers ton Drive et Google Classroom) : laissés vides en local,
   comme aujourd'hui les documents de chapitre ? Sinon il faudrait inventer de faux documents.
3. **Images** : copier les images du contenu (questions, exercices, cartes VIP), jamais les
   pièces jointes des élèves ni les captures des signalements ?
4. **Liens de partage** (cours, cahier de texte, exercices) : en inventer des faux pour tester les
   pages publiques, ou laisser vide ?

**Réponse de David le 2026-11-21 : « je suis tes recos ».** Donc :

1. Cahier de texte : **inventé** (quelques séances et devoirs par classe), jamais copié.
2. Documents de cours (Drive, Google Classroom) : **laissés vides**.
3. Images : **celles du contenu sont copiées** (questions, exercices, cartes VIP) ; jamais les
   pièces jointes des élèves ni les captures des signalements.
4. Liens de partage : **inventés** (faux liens pour tester les pages publiques).

## 5. Découpage proposé (une PR = une session)

1. **PR 1, inventaire et garde** : les trois listes dans `regles.ts` (copier / inventer / jamais),
   un test qui échoue dès qu'une table du schéma n'est dans aucune ; copie des tables de contenu
   du § 3.1.
2. **PR 2, suivi et travail scolaire** : évaluations passées, tests, fiches et exercices assignés,
   Python, devinettes, révisions.
3. **PR 3, jeux et récompenses** : jeux, succès, récompenses, boutique, Mathoux et Palotins.
4. **PR 4, échanges et famille** : messages privés, tuteur, notifications, marché, modération,
   parents, inscriptions ; cahier de texte et liens de partage selon le § 4.
5. **PR 5, images** (selon la question 3), puis doc et versement.

Chaque PR d'activité : règles testées sans base (comme `activite.ts`), puis preuve sur une copie
isolée de la pile, puis une liste de pages à ouvrir dans `docs/wip/verifications-manuelles.md`.

## 7. PR 1 : inventaire et garde (2026-11-21)

Classement (§ 3) et découpage (§ 5) validés par David le 2026-11-21 (« go »).

- **Trois listes** dans `scripts/db-seed-riche/regles.ts`, une seule par table : `COPIE` 78,
  `INVENTE` 107, `JAMAIS` 49, soit les **234 tables** de `src/lib/types/database.ts`
  (`web_vital_samples` comprise, dans `JAMAIS`).
- **Garde** (`scripts/__tests__/db-seed-riche.test.ts`, sans base : elle lit `database.ts`) : une
  table dans aucune liste, dans deux listes, ou citée sans exister fait échouer le test ; une table
  copiée qui pointe vers une table non copiée aussi (le contenu s'écrit sans vérification des
  liens). Vérifiée rouge en retirant `worksheet_styles`. Limite : `database.ts` vient de la prod,
  donc la garde voit une table nouvelle au `pnpm db:types` qui suit sa migration, pas avant.
- **Écarts au § 3.1**, chacun imposé par une mesure ou par l'audit :
  - `srs_deck_sections` pointe vers `srs_decks` (paquets des élèves, inventés) : **inventée**.
  - `message_templates`, `message_template_versions` : 0 ligne en prod, 13 et 19 dans la base de
    dev ; les copier les aurait effacées. **Non copiées**, rangées dans `INVENTE` ;
    `user_favorite_templates` les suit (elle pointe vers elles, la garde l'a signalé).
  - **Audit de sécurité** : `school_year_closures` garde dans `class_member_ids` les identifiants
    des inscriptions d'élèves, sans clé étrangère : ni le filtre d'auteur ni la garde de fuite ne
    les voient. Passée dans `JAMAIS` (aucun code de `src/` ne la lit), comme `user_folders` (nom
    libre, souvent un prénom ; aucun code ne la lit) et `rag_documents` / `rag_chunks` (documents
    importés par le prof). `minesweeper_tournaments.description` (texte libre) est vidée.
    Laissé tel quel, à savoir : `question_template_reviews.comment` (commentaires de relecture de
    l'admin) est copié ; la garde de fuite n'arrête qu'un nom COMPLET, pas un prénom seul.
  - `kanban_*` et `bug_reports` (non tranchés) : dans `JAMAIS` en attendant, rien ne change.
- **Preuve sur copie isolée** (§ 9.1 de `base-locale-progress.md`, projet `ubumaths-essai`, port
  `54422`, arrêtée ensuite) : 629 migrations, seed rejoué sans erreur après chaque correction,
  **14 012 lignes** copiées (13 103 avant), 34 comptes ; **431 liens vérifiés, 0 ligne orpheline** ;
  aucune préférence d'élève. Nouvelles tables remplies : `dictionary_entries` 675,
  `question_template_reviews` 189, `worksheet_styles` 13, `dictionary_entry_versions` 10,
  `minesweeper_tournament_classes` 9, `game_monsters` 4, `minesweeper_tournaments` 4,
  `chapter_template_instantiations` 2, `geometry_figures` 1,
  `user_preferences` 1, `user_whiteboard_template_favorites` 1 ; les autres sont vides en prod.
- **Relectures** : `code-reviewer`, rien de bloquant ; corrigé : les vues sont lues à part (une
  cible inconnue n'est plus prise pour une vue), liens composés lus en entier, un lien coupé doit
  encore exister. `security-auditor` : un bloquant (`school_year_closures`), corrigé ci-dessus.
  Limite connue de la garde : elle porte sur les tables, pas sur les lignes ; une ligne écartée par
  le filtre d'auteur peut laisser une ligne orpheline. Mesuré à la main : 0 sur 431 liens. À
  mettre dans le seed lui-même (vérification après la copie) dans une PR suivante.
- **Vu en passant, hors PR 1** : le seed annonce « 0 amitiés » (3 élèves par classe avec
  11 classes) : à reprendre en PR 4. Tous les admins de prod deviennent le même compte local : une
  table à une ligne par utilisateur casserait le seed le jour où la prod a deux admins.

## 6. Historique

- **2026-11-21** : ouverture, à la clôture du chantier `base-locale` (#2970 : `pnpm db:neuf`).
