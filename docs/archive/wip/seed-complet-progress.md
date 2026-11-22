# Chantier `seed-complet` : une base locale sans page vide

## Reprendre ici

_Mis à jour le 2026-11-22 : **chantier CLOS**, journal archivé._

- **État** : clos. Découpage du § 5 recompté contre les PR : PR 1 #2977, PR 2 #2980, PR 3 #2986,
  PR 4 #3011, PR 5 #3012, plus deux correctifs trouvés grâce au seed (#2981 révisions, #2989 Palotins).
- **Durable** : `docs/pratiques/environnement-de-dev.md` (classement des tables, images, ce que font
  les élèves fictifs) ; pages à ouvrir dans `docs/wip/verifications-manuelles.md` (#2977 à #3012).
- **Suites, hors chantier** : messagerie privée cassée (`docs/systeme/messagerie-et-moderation.md`
  § Écarts connus, PR à part décidée par David) ; 4 cartes Mathémo sans image
  (`docs/systeme/jeux-et-economie.md` § Doutes).
- **Non fait** : la base de dev partagée n'a pas encore reçu le tout (prochain `pnpm db:neuf` ou
  `pnpm db:seed-riche`, à la main).

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

## 7. PR 1 : inventaire et garde (2026-11-21, #2977, mergée)

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

## 8. PR 2 : suivi et travail scolaire (2026-11-22, #2980, mergée)

- **Un plan pur de plus**, `scripts/db-seed-riche/suivi.ts` (tests :
  `scripts/__tests__/db-seed-suivi.test.ts`, 43 cas, sans base ni moteur de questions), écrit dans
  26 tables ; `ECRITURE_SUIVI` dit quelle partie va dans quelle table, dans l'ordre des liens (un
  test vérifie que chaque table est bien dans `INVENTE`). Ce qui est inventé :
  - **évaluations passées** : une copie par élève des deux classes les plus remplies (l'étoile a
    20, un élève a deux tentatives, un autre une copie commencée non rendue), questions tirées
    (`evaluation_attempt_questions`), réponses (`test_answers`) et traces ;
  - **entraînement** : 5 à 7 jours actifs par élève sur les quatre dernières semaines, 6 à 12
    réponses par jour, sur les modèles du niveau de sa classe (saisie, chronométré, cartes
    retournées, révision) ;
  - **révisions** : une fiche de mémorisation par modèle travaillé (d'accord avec les traces), le
    paquet « Programme » de chaque élève, deux paquets du prof copiés chez les élèves assignés,
    une séance par jour de révision ;
  - **Python** : exercices assignés (classe et élève), soumissions justes et fausses, un fichier,
    un carnet partagé et ses points de contrôle ;
  - **devinettes** : assignée à deux classes, une réponse validée, une refusée, deux en attente ;
  - **fiches** : deux élèves nommés (dont l'élève hors classe), corrigé réglé par exercice, trois
    signalements (en attente, corrigé, refusé), réglages d'impression de deux élèves ;
  - **exercices hors fiche** : classe, élève, « pour tous », vus et terminés ;
  - **compétences** : niveau et observables de chaque élève des deux classes ; **dernières visites**.
- **Vraies questions** (`moteur.ts`) : les copies sont tirées par `drawSeriesQuestions` et corrigées
  par `gradeWithinBudget`, les réponses saisies d'entraînement viennent de `generateInstance`. Le
  détail d'une copie et les erreurs d'une classe rejouent donc ce que le seed a écrit.
- **Calculé par la base, pas écrit** : `student_point_state` (déclencheur des traces) et
  `python_exercise_mastery` (déclencheur des soumissions).
- **Liens vérifiés dans le seed** (reste de la PR 1) : après la copie, chaque clé étrangère des
  tables copiées est contrôlée (`requeteOrphelins`, 115 liens) ; une ligne orpheline annule toute la
  copie. Vérifié rouge sur un lien cassé exprès.
- **Écarts au plan, chacun imposé par une mesure** :
  - **élèves rangés dans les classes actives** (5 classes, 6 élèves chacune) au lieu des 11 classes
    copiées : la moitié des élèves étaient dans des classes archivées, invisibles dans les pages de
    suivi, et 3 élèves par classe ne passaient aucun seuil (« au moins 5 élèves »). Les élèves ont
    aussi un prénom et un nom (« Élève 08 » au lieu de « Élève sans nom ») et l'école de leur classe ;
  - le seed part des **classes les plus remplies** (amitiés : 3 au lieu de 0, vu en PR 1) ;
  - `worksheet_instances` passe dans `JAMAIS` : aucun code ne la lit ni ne l'écrit (ADR 0023) ;
  - `show_corrections` à vrai sur les fiches assignées : sans lui l'élève ne voyait aucun corrigé ;
  - **rien d'inventé**, faute de contenu en prod : `student_checklist_progress` (aucun objectif à
    cocher dans les chapitres) ; séances de test hors évaluation (plus aucune page ne les lit).
  - deux modèles par point du programme : un point ne s'acquiert « par diversité » qu'avec deux
    modèles différents réussis (sinon aucun point acquis, progression vide).
- **Méthode de preuve** : copie isolée (§ 9.1 de `base-locale-progress.md`), cette fois avec ses
  services (`supabase --workdir <copie> start -x studio,…` après un `stop` qui garde les données),
  serveur du worktree branché dessus (`PUBLIC_SUPABASE_URL=http://127.0.0.1:54421 SUPABASE_URL=…
pnpm dev --port 5176 --strictPort`), pages lues connecté (jeton pris à l'API d'auth locale, posé
  en cookie `sb-127-auth-token`).
- **Preuve** : seed rejoué trois fois de suite, mêmes nombres : 12 copies d'évaluation
  (44 réponses), 1 642 traces → 535 états de points (102 acquis, 128 à remédier, 305 en cours),
  43 paquets, 724 cartes, 726 fiches de mémorisation, 137 séances, 32 soumissions Python →
  19 maîtrises, 37 points de contrôle, 4 tentatives de devinette, 3 signalements, 66 niveaux de
  compétence. Pages ouvertes et remplies : élève (contrôles et résultats, révisions, paquet
  Programme, progression, compétence, mon travail, corvées, Python, carnets), prof (résultats du
  contrôle avec bilan par question, analytics de la classe : grille, points à remédier, taux de
  réussite, régularité, compétences ; suivi d'un élève ; paquets et attributions ; résultats Python
  et carnet ; validations de devinettes ; avancement d'une fiche).
- **Relectures** : `security-auditor`, aucun finding. `code-reviewer`, rien de bloquant ; corrigé :
  une copie n'est plus datée avant que sa classe ait reçu l'évaluation, une question sans réponse en
  texte (choix, geste) est écartée du tirage (sinon l'étoile n'avait pas 20), copie toujours rendue
  dans le passé et dans le délai de chaque question, visites datées du jour de Paris, liens « non
  validés » exclus du contrôle, message clair si le suivi échoue après l'activité ; 8 tests de plus
  (clé unique de chaque partie du plan, demi-point, tirage vide, classes d'un et de deux élèves).
  Laissé tel quel, et écrit dans la doc : relancer le seed remplace tout ce que le prof local a
  assigné (exercices, Python, devinettes), comme il le faisait déjà pour les fiches.
- **Trouvé grâce au seed, hors PR** : sur « Mes révisions » de l'élève, les compteurs « À réviser »
  et « Nouvelles » valent toujours 0 : la page lit `stats.due_cards` / `new_cards`, le serveur rend
  `due_count` / `new_count` (`dashboard/revisions/+page.svelte:46`). **Corrigé par #2981** (la page prend son type du serveur ; test de page).
- **Vu en passant** : quelques élèves ont 0 Gidouille (somme négative ramenée à 0 par `activite.ts`) ;
  la page prof des paquets affiche « Decks attribués 0 » (elle compte les paquets du prof marqués
  assignés, or seules les copies des élèves le sont).

## 9. PR 3 : jeux et récompenses — phase 0 (2026-11-22, **validée par David le 2026-11-22 : « oui »**)

**Mesures** (prod en lecture seule, des comptes de lignes ; lecteurs et écrivains relevés dans `src/`
et les migrations). Jeux visibles par l'élève : Démineur (13 909 parties en prod, stats, succès,
tournois), 2048 (43), Mathémo (19), classement commun ; Trio et Évoland n'écrivent rien en base.
Chatterie : Mathoux (calculés depuis les points du programme), décorations, Palotins (58).
Récompenses : cartes VIP (2 895 mouvements), récompenses de jeu du jour (2 171) et meilleur score
de la semaine (315), succès (23 définis, **0 débloqué en prod**). Le journal des récompenses
(`reward_events`) se remplit seul par déclencheurs : le seed écrit l'activité déclencheurs actifs.

**Inventé (plan pur testé sans base, comme `suivi.ts`)** :

1. **Démineur** : 10 à 40 parties par élève sur quatre semaines (gagnées, perdues, niveaux
   variés), sauf l'élève « rien fait » et l'élève hors classe ; la récompense du jour et le meilleur
   score de la semaine qui en découlent ; les succès du démineur atteints par ces parties.
   **Un tournoi en cours** inventé pour deux classes actives (les 4 tournois copiés datent de
   janvier 2026 et visent des classes archivées), avec les parties des élèves → classement.
2. **2048 et Mathémo** : un meilleur score pour 2 élèves sur 3 → classement commun rempli.
3. **Succès** : 2 à 6 succès débloqués par élève parmi les 23, cohérents avec son activité
   (l'élève étoile en a le plus) → page d'accueil et journal.
4. **Palotins** : un Palotin choisi par la plupart des élèves, niveau et expérience variés, une
   tenue pour certains ; 3 élèves n'en ont pas encore choisi.
5. **Mathoux** : écrits avec **la vraie règle de l'appli** (`collection-logic.ts`) à partir des
   points acquis de la PR 2, pour que la page du prof les voie sans que chaque élève ouvre sa
   chatterie ; quelques décorations achetées (Gidouilles dépensées en face).
6. **Cartes VIP** : 1 à 4 cartes gagnées par élève, quelques-unes utilisées, une demande
   d'activation en attente (pour la page du prof).
7. **Devinette** : une devinette **publiée** inventée, au nom du prof local ; la PR 2 l'assigne
   déjà d'elle-même (elle prend la devinette publiée d'abord).
8. **Gidouilles** : chaque gain ou dépense ci-dessus a sa ligne, pour que le solde et le journal
   disent la même chose.

**Pas inventé, et pourquoi** :

- **Navadra** (combats, sorts) : son entrée est masquée dans la page des jeux ; le profil de jeu
  se crée seul à la création du compte.
- **Descente de la Vistule** (bêtes, coups) : chantier en cours, aucune page n'en fait apparaître
  (l'apparition des bêtes n'est appelée nulle part).
- **Avatars de la boutique** : le catalogue est vide en prod, rien à acheter.
- **Démineur à plusieurs** : statistiques lues par le seul mode multijoueur, éphémère.
- **Tables sans lecteur ou calculées** → passent dans `JAMAIS` : `achievement_events`,
  `achievement_progress` (calculée), `daily_summaries`, `weekly_rewards`, `game_leaderboards`,
  `game_player_achievements`, `game_challenge_attempts`.

**Preuve** : même méthode qu'au § 8 (copie isolée avec ses services, seed rejoué trois fois,
pages ouvertes en élève et en prof : stats, succès et tournoi du démineur, classement, chatterie,
Palotins, journal des récompenses, gamification du prof, tournoi côté prof).

## 10. PR 3 : jeux et récompenses (2026-11-22, branche `feat/seed-complet-jeux`)

- **Un plan pur de plus**, `scripts/db-seed-riche/jeux.ts` (tests : `scripts/__tests__/db-seed-jeux.test.ts`,
  34 cas, sans base), écrit dans 13 tables (`ECRITURE_JEUX`), et `mathoux.ts` (mémoire des Mathoux).
  Règles recopiées des fonctions de l'appli et testées : points d'une partie (`calculate_minesweeper_points`),
  gain théorique et récompense du jour (`complete_minesweeper_game`, `record_game_reward`, temps de
  référence de repli), seuils des succès de 2048 et de Mathémo (routes `api/games/*/scores`), niveau
  d'un Palotin (`add_buddy_xp`).
- **Calculé par la base, pas écrit** : le journal des récompenses (déclencheurs), le score des parties
  de tournoi (`calculate_tournament_score`, appelée par le seed après l'insertion), les profils de jeu
  Navadra (déclencheur à la création du compte).
- **Mathoux** : la vraie règle (`buildMathouCollection`, `memoryUpdates`) sur les points acquis de la
  PR 2, données chargées comme `collection.ts`. Ni sieste ni étape payée : la première visite de
  l'élève endort et verse les Gidouilles des étapes. Décorations : la vraie fonction d'achat
  (`buy_mathou_decoration`, en rôle service), débit et historique compris.
- **Écarts au plan, chacun imposé par une mesure** :
  - **niveau sur le profil des élèves** (`creerEleves`) : sans lui, la chatterie et les Mathoux étaient
    vides (`grade` nul → collection vide) ;
  - la devinette est écrite **avant** le suivi (qui assigne d'abord une devinette publiée) ;
  - les tables du tournoi restent dans `COPIE` (contenu du prof) : le seed y ajoute le tournoi inventé ;
  - 7 tables passent dans `JAMAIS` (sans lecteur ou calculées).
- **Preuve** (copie isolée `ubumaths-essai`, ports 544xx, services compris ; serveur du worktree branché
  dessus) : seed rejoué trois fois après les corrections de relecture, mêmes nombres : 596 parties de
  démineur (150 succès), 41 parties de tournoi, 20 scores de 2048, 19 de Mathémo, 105 succès,
  26 Palotins, 79 mouvements de cartes VIP, 256 Mathoux, 8 décorations ; journal des récompenses stable
  à 717 lignes ; nombres de la PR 2 inchangés. Pages lues connecté : élève (stats et succès du démineur,
  tournoi et sa position, classements, chatterie avec 11 Mathoux, inventaire 3 cartes + 1 dans
  l'historique, devinette publiée assignée), prof (Mathoux par classe, chatterie et journal d'un élève,
  tournoi et son classement, demande d'activation VIP transmise à la page).
- **Relectures** : `security-auditor`, aucun finding. `code-reviewer`, rien de bloquant ; corrigé :
  - **délai de consentement échu** : un élève soumis au consentement, créé il y a plus de 30 jours,
    passait en lecture seule et la garde refusait ses parties (`Consentement parental requis`,
    reproduit sur la copie) ; le délai est renouvelé à chaque passage, preuve sur 13 délais échus exprès ;
  - **temps de référence du cycle** de l'élève (`get_minesweeper_reference_time`) au lieu de ceux de
    repli ; et un **arrondi** du gain qui divergeait de Postgres (0,455 → 0,45 en flottant, 0,46 en
    base), trouvé par le test ajouté ;
  - parties d'un même élève sans chevauchement ; test qui rejoue les parties dans l'ordre (points et
    gains) ; `rollback` de la devinette ; type et commentaire des décorations.
  - Écartés, et pourquoi : carte sans nombre d'utilisations = une utilisation pour l'appli
    (`coalesce(…, 1)` dans `use_vip_card`), pas illimitée ; fuseau et premier jour de la semaine de
    l'école copiée = Paris et lundi, ceux du plan ; pas de récompense du jour pour 2048 et Mathémo (une
    seule ligne de totaux par élève, sans partie à rattacher).
- **Trouvé grâce au seed, hors PR** (corrigé par #2989, 2026-11-22) :
  - **page « Palotins » du prof toujours vide** (« Aucun Bataillon actif ») : sa requête embarque
    `student_buddies:student_id` depuis `class_members`, que PostgREST résout vers `profiles`
    (`column profiles_1.palotin_type does not exist`) ; chaque classe est sautée
    (`gamification/buddies/+page.server.ts:62`). Même schéma en prod : panne probable là-bas aussi.
  - **bloc « succès » de l'accueil élève mort** : la requête vise `game_achievements` (Navadra) au lieu
    d'`achievements`, et la page ne l'affiche pas (`dashboard/+page.server.ts:230`).

## 11. PR 4 : échanges et famille — phase 0 (2026-11-22, branche `feat/seed-complet-echanges`, **validée par David le 2026-11-22 : « je valide », carnet activé sur une classe et réponses du tuteur écrites à l’avance compris**)

**Mesures** (prod en lecture seule, des comptes de lignes ; lecteurs relevés dans `src/`). Messagerie
du prof (`/messages`) : 3 messages privés en prod, la boîte lit `message_inbox`, que la fonction d'envoi
remplit (pas calculée : elle sort de `JAMAIS`). Discussion de classe : 284 messages, 27 réactions,
4 signalements, 2 restrictions, 2 actions de modération. Tuteur : 652 conversations, 304 messages, lus
par la page « statistiques du tuteur » du prof et l'historique de l'élève. Notifications : 7 (récompenses
de la semaine), 0 lecture. Marché : 59 annonces, 31 propositions, 158 échanges, 10 cartes bloquées ;
ouvert seulement pour deux classes (réglage par classe). Famille : 1 consentement, **aucune classe n'a le
carnet de liaison activé**, 0 parent, 0 élève en attente d'activation. Cahier de texte : 2 séances,
2 devoirs. Liens de partage : 2 + 2 + 9. Tâches du prof : 2 tableaux, 3 cartes. Signalements de bug : 245.
Modèles de messages : 0 en prod ; **les 13 de la base locale viennent de `supabase/seed/default_message_templates.sql`**,
rejoué à chaque `db:neuf` : rien à faire.

**Inventé (plan pur testé sans base, comme `jeux.ts`)** :

1. **Messagerie du prof** : une dizaine de messages entre le prof et des élèves (questions sur un devoir,
   une absence, un merci), quelques-uns lus, un archivé, un brouillon du prof. Écrits par la vraie
   fonction d'envoi, pour que la boîte de réception, les envoyés et le fil se remplissent ensemble.
2. **Discussion de classe** : des réactions sur les messages déjà inventés, un message signalé (en
   attente) et un traité, une restriction finie et une en cours sur un élève, et leur trace de modération
   → page « modération » du prof.
3. **Tuteur** : 1 à 3 conversations pour la moitié des élèves, avec des réponses écrites à l'avance
   (aucun appel à l'IA) → statistiques du prof et historique de l'élève.
4. **Notifications** : 3 ou 4 annonces du prof à ses classes, lues par une partie des élèves.
5. **Marché** : ouvert pour les classes actives (comme le tournoi : ajouté aux réglages copiés) ;
   des annonces de cartes VIP prises dans les cartes de la PR 3, des propositions, quelques échanges
   faits et un en cours avec ses messages, les cartes proposées bloquées en face.
6. **Consentements** : pour les élèves qui y sont soumis, des accords donnés, des demandes en attente,
   un refus. Preuve fictive (adresse IP de documentation `192.0.2.x`).
7. **Carnet de liaison** : activé sur une classe, de faux parents (adresses `@example.test`), quelques
   envois déjà partis dans l'historique, un élève qui s'est retiré. **Rien n'est envoyé** : le seed
   écrit les lignes, n'appelle jamais l'envoi des courriels.
8. **Élèves en attente d'activation** : 3 élèves importés pas encore activés → page d'import de l'admin.
9. **Cahier de texte** : 4 à 6 séances par classe active sur les dernières semaines, chacune avec ses
   points du programme et une activité, des devoirs (dont un à rendre la semaine prochaine) → cahier
   du prof, cahier de l'élève, page « avancement ».
10. **Liens de partage** : un lien de cours et un lien de cahier de texte par classe active, un lien
    d'exercice, dont un expiré.
11. **Tâches du prof** : un tableau de trois colonnes, une dizaine de cartes avec étiquettes.
12. **Signalements de bug** : une dizaine (élèves et prof), états variés (en attente, pris en compte,
    résolu, doublon), **sans capture d'écran** → page de l'élève et page de l'admin.

**Pas inventé, et pourquoi** (→ `JAMAIS`) : `terms_acceptances` (écrite à l'inscription, aucune page ne
la lit), `marketplace_listing_views` et `message_moderation_logs` (aucun lecteur),
`marketplace_trade_offers` (0 ligne pour 158 échanges : ancien circuit, à confirmer en codant), `parent_exception_episodes` (tenue par l'envoi des courriels).

**Preuve** : même méthode qu'aux § 8 et § 10 (copie isolée, seed rejoué trois fois, pages ouvertes en
élève, prof et admin : messagerie, modération, tuteur, notifications, marché et un échange, consentements,
carnet, import, cahier de texte et avancement, pages publiques des liens, tableau de tâches, signalements).

## 12. PR 4 : échanges et famille (2026-11-22, branche `feat/seed-complet-echanges`)

- **Un plan pur de plus**, `scripts/db-seed-riche/echanges.ts` (tests : `scripts/__tests__/db-seed-echanges.test.ts`,
  46 cas, sans base), écrit dans 35 tables (`ECRITURE_ECHANGES`), plus les réglages du marché et du carnet
  ajoutés aux réglages copiés. Liste de nettoyage exportée (`NETTOYAGE_ECHANGES`) : un test exige que
  chaque table écrite y soit, ou parte avec son parent par cascade.
- **Fait par la base, pas écrit** : accord des consentements (`grant_parental_consent`), échange entre
  amis conclu (`execute_trade`), ventes conclues (`accept_proposal_atomic`, rôle service, au nom du
  vendeur : l'échange naît conclu, carte et Gidouilles déplacées), nombre de messages du tuteur et de
  propositions d'une annonce, index de recherche des messages, révocation du lien de l'élève qui a
  arrêté le carnet.
- **Écarts au plan, chacun imposé par une mesure** :
  - messages privés écrits par la règle recopiée de `send_private_message`, pas par la fonction : elle
    date tout de `now()` ;
  - pas de « refus » de consentement (l'état n'existe pas) : demandes **échues** à la place ;
  - l'élève hors classe n'a pas de demande de consentement (le plan l'écarte) ;
  - `message_inbox` sort de `JAMAIS` (remplie à l'envoi) ; passent dans `JAMAIS`, sans lecteur :
    `terms_acceptances`, `marketplace_listing_views`, `message_moderation_logs`,
    `marketplace_trade_offers`, `parent_exception_episodes`, `kanban_card_assignees` ;
  - `creerEleves` reprend le nom complet (« Élève NN ») : sans lui, l'index de recherche refuse le
    message d'un élève ;
  - les jetons des liens de partage sont tirés au hasard cryptographique par `index.ts` (audit : tirés
    de la graine publique, ils se recalculaient depuis le dépôt).
- **Preuve** (copie isolée `ubumaths-essai`, ports 544xx, services compris ; serveur du worktree
  branché dessus) : seed rejoué trois fois après les corrections de relecture et la mise à jour depuis
  `main`, mêmes nombres : 22 messages privés (27 lignes de boîte), 9 réactions, 2 signalements, 2
  restrictions, 32 conversations du tuteur (192 messages), 11 annonces du prof (36 lectures), 29
  annonces du marché, 6 échanges conclus (1 entre amis, 5 ventes) et 1 en cours, 12 demandes de
  consentement (4 accordées), 5 parents au carnet, 3 élèves en attente, 22 séances, 12 liens, 10
  tâches, 10 signalements de bug ; nombres des PR 2 et 3 inchangés d'un passage à l'autre. Pages lues
  connecté : élève (annonces, échanges, cahier de texte, carnet, signalements, inventaire après
  échange), prof (modération et signalements, statistiques du tuteur, consentements, carnet de la
  classe, cahier de texte d'une séance, avancement, tableau de tâches), admin (import, signalements),
  pages publiques (cours, cahier de texte, exercice partagé ; le lien expiré est refusé).
- **Relectures** : `security-auditor`, aucun bloquant ; corrigé : jetons de partage (ci-dessus).
  Écartés : `detecterFuite` sur l'inventé (tout y est constant), réglage du marché qui resterait (la
  copie vide la table à chaque passage). `code-reviewer`, rien de bloquant ; corrigé : ventes conclues
  par la vraie fonction (le plan écrivait un état que l'appli ne produit jamais), réactions et
  signalements datés après leur message, auteur d'un contact parent saisi par l'élève, absent qui
  reçoit le message de sa classe (en-tête et test), tests circulaires retirés, message d'erreur qui
  nomme les lignes faites à la main qui bloquent une relance.
- **Limites connues** : l'historique du tuteur côté élève se lit par exercice, et les conversations
  inventées n'en ont pas (visibles dans les statistiques du prof seulement) ; la page publique du
  carnet ne s'ouvre pas (la base ne garde que l'empreinte des liens) ; dates de mise à jour et de fin
  écrites par les déclencheurs à l'heure du seed (aucune page ne les lit).
- **Trouvé grâce au seed, hors PR** — **messagerie privée cassée dans l'appli**, quelles que soient
  les données, sur `main` aussi :
  - boîte de réception : l'appli appelle `/api/messages/inbox?status=inbox` sans dossier, et le schéma
    refuse `folderId` nul → 400 (`src/routes/api/messages/inbox/+server.ts:22`) ;
  - envoyés : l'appli appelle `/api/messages/sent` sans `limit` → 400 (« doit être > 0 ») ; avec
    `limit`, la réponse de `get_user_sent_messages` n'a ni `id`, ni `sender_name`, ni `created_at`
    attendus par `messageResponseSchema` → 500 (`src/lib/server/validation/messages.ts:55`).
  - En prod : 3 messages privés, le dernier en octobre 2025.

## 13. PR 5 : images — phase 0 (2026-11-22, branche `feat/seed-complet-images`, **validée par David le 2026-11-22 : « je valide »**)

**Mesures** (prod en lecture seule, des comptes seulement) :

| Compartiment         | Fichiers | Taille | Déposés par                  | Cités comment                                                                                                |
| -------------------- | -------- | ------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `question-images`    | 254      | 8,3 Mo | scripts (aucun propriétaire) | chemin relatif, adresse faite avec `PUBLIC_SUPABASE_URL` → **cassées en local**                              |
| `exercise-images`    | 95       | 4,6 Mo | 83 scripts, 12 le prof       | adresse complète **de la prod** dans 50 exercices (151 liens) → s'affichent en local, mais lues sur la prod  |
| `vip-card-images`    | 44       | 2,2 Mo | scripts                      | adresse de la prod dans 45 modèles de cartes ; **cassées** dans le démineur et 2048 (adresse faite en local) |
| `parody-evaluations` | 1        | 0,2 Mo | scripts                      | chemin relatif → **cassée en local**                                                                         |

Les 4 compartiments sont **publics** en prod : copier ces fichiers ne donne à personne un accès
qu'il n'a pas déjà. Les 4 autres (pièces jointes, captures, documents de chapitre) restent vides (§ 4).

**Comportements proposés** :

- **Nominal** : `pnpm db:seed-riche` (et donc `db:neuf`) copie les fichiers des 4 compartiments
  publics dans le stockage local (même compartiment, même chemin), puis réécrit dans le contenu
  copié l'adresse de la prod en adresse locale. Après : toutes les images s'affichent en local, et
  aucune page locale ne va chercher une image sur la prod.
- **Relance** : un fichier déjà présent en local avec la même taille n'est pas retéléchargé
  (~15 Mo la première fois, presque rien ensuite).
- **Limite** : un fichier que la prod ne rend pas (supprimé entre-temps) est sauté et compté dans
  le compte rendu ; le seed ne s'arrête pas pour lui. Un lien du contenu vers un fichier absent
  reste tel quel (image cassée en local comme en prod).
- **Erreur** : prod injoignable → le seed s'arrête avant d'écrire, comme aujourd'hui.
- **Garde** : seuls ces 4 compartiments sont lus ; une liste dans `regles.ts`, et un test qui
  échoue si un compartiment de la prod n'est dans aucune liste (copié / jamais), comme pour les tables.
- **Preuve** : copie isolée de la pile ; pages lues : une question à image, un exercice illustré,
  la boutique VIP, le démineur (pouvoirs), la page des presques-évaluations ; une fiche compilée
  avec image (Typst lit l'adresse réécrite).

Puis, dans la même PR ou la suivante : doc (`docs/systeme/` de la base locale) et versement du journal.

## 14. PR 5 : images (2026-11-22, branche `feat/seed-complet-images`)

- **Messagerie privée cassée (§ 12)** : David, le 2026-11-22 : « oui on répare dans une PR à part ».
  Hors de cette PR ; chantier à ouvrir.
- **Code** : `scripts/db-seed-riche/images.ts` (pur, tests `scripts/__tests__/db-seed-images.test.ts`,
  13 cas) ; `index.ts` copie les fichiers après la validation du contenu, réécrit les adresses dans la
  copie du contenu. `SEED_RICHE_API_URL` pour viser une copie isolée.
- **Écart au plan, imposé par une mesure** : les 95 images d'exercices sont rangées sous le dossier du
  prof de la prod (son identifiant). Le contenu copié le remplace déjà par le prof local : les chemins
  des fichiers suivent la même règle (`cheminLocal`), et un chemin qui garderait un identifiant de la
  prod est écarté. Premier passage sans cette règle : 85 liens d'exercices en 404.
- **Preuve** (copie isolée `ubumaths-essai`, ports 544xx, avec le stockage) : 1er passage 394 fichiers
  copiés ; relance : 0 téléchargé, 394 déjà là, autres nombres identiques. En base : 0 adresse de la
  prod restante (exercices, cartes VIP), 50 exercices et 45 cartes vers le stockage local ; liens
  vérifiés un par un : exercices 85/85, cartes 44/45 (`2048-bomb-3`, carte inactive : fichier absent
  en prod aussi, limite prévue). Par le relais du serveur de dev (chemin du tailnet) : 200 pour une
  image de chaque compartiment. Pages (`pnpm voir`) : presques-évaluations, démineur, admin des
  cartes VIP, sans requête en échec liée aux images.
- **Relectures** : `code-reviewer` et `security-auditor`, aucun bloquant. Corrigé : copie des images
  déplacée en DERNIER (un échec ne laisse plus la base sans élèves) ; un fichier refusé par la prod ou
  par le stockage local est sauté avec sa raison, jamais d'arrêt, et le compte rendu en montre 5 au
  plus ; message de liste sans dossier (identifiant du prof de prod) ; taille inconnue = retéléchargé ;
  `cheminLocal` sans la garde d'e-mail (`logo@hd.webp` n'en est pas une) mais refusant tout
  identifiant qui n'est pas un compte local ; refus si `.env.local` porte la clé de la prod. Audit :
  les 4 compartiments ne reçoivent de dépôt que du prof, de l'admin ou de la clé de service, donc
  aucun fichier d'élève possible. Laissé : adresses `/render/image/` ou signées non réécrites (aucune
  mesurée, compartiments publics). Preuve refaite sur une copie neuve : mêmes nombres, 129/130 liens
  en 200 (le 130e : `2048-bomb-3`).
- **Trouvé, hors PR** : 4 cartes Mathémo citent `/images/vip-cards/mathemo-*.webp`, absents de
  `static/` → 404 (pas lié au stockage).

## 6. Historique

- **2026-11-22** : clôture, découpage recompté, journal archivé.
- **2026-11-22** : PR 5 (images), § 13-14.
- **2026-11-22** : PR 4 (échanges et famille), § 11-12.

- **2026-11-22** : #2981, compteurs de « Mes révisions » (trouvé grâce au seed).
- **2026-11-22** : PR 2 (suivi et travail scolaire), § 8.
- **2026-11-21** : ouverture, à la clôture du chantier `base-locale` (#2970 : `pnpm db:neuf`).
