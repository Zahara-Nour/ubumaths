# Base locale remplie — inventaire des tables (à valider par David)

Décision du 2026-10-10 : **contenu copié depuis la prod, élèves générés**. Rien de ce qu'un élève a
écrit, fait ou reçu ne quitte la prod.

Inventaire mesuré en prod le 2026-10-10 (lecture seule, comptes de lignes et rôle de l'auteur
uniquement, aucune donnée lue). 218 tables.

## 1. Copiées depuis la prod

Le contenu pédagogique. L'auteur est le prof, l'admin ou personne (contenu système). Un contrôle a
vérifié qu'aucun élève n'est auteur dans ces tables.

| Domaine                     | Tables (lignes en prod)                                                                                                                                                                                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Programme et arbre          | `curriculum_themes` (29), `curriculum_objectives` (66), `curriculum_points` (2 958), `curriculum_point_automatismes` (814), `classification_nodes` (692), `math_competences` (6), `math_competence_subdimensions` (22), `observables` (56), `grade_predecessors` |
| Questions et exercices      | `question_templates` (1 005), `question_template_points` (924), `exercises` (329), `exercise_classifications` (450), `exercise_curriculum_points`, `tags` (140), `resource_tags` (422), `source_types`                                                           |
| Feuilles et séries          | `worksheets` (32), `worksheet_sections`, `worksheet_exercises` (381), `worksheet_templates` (12), `series`, `evaluations`, `evaluation_tasks`, `evaluation_task_perimeter`, `parody_evaluations`                                                                 |
| Chapitres                   | `chapter_templates`, `chapter_template_versions`, `chapter_sections`, `chapter_decks`, `chapter_series`, `chapter_worksheets`, `chapter_documents`, `chapter_exercises`, `chapter_checklist_items`                                                               |
| Python, géométrie, tableaux | `python_exercises` (36), `python_notebooks` (2), `python_files` (**celui du prof seulement**), `constructions` (9), `construction_demo_scripts` (5), `whiteboard_templates` (11), `riddles` (2)                                                                  |
| Jeux (le contenu)           | `game_challenges` (464), `achievements` (23), `minesweeper_achievements`, `minesweeper_reference_times`, `minesweeper_tournament_3bv_reference`, `vip_card_templates` (49), `vip_card_config`, `buddy_skins` (18)                                                |
| Calendrier et réglages      | `schools`, `school_years`, `academic_periods`, `school_holidays`, `classes` (10, noms seulement), `class_schedules`, `app_config`, `marketplace_config`, `bug_reports_config`, `achievement_stats_metadata`                                                      |

## 2. Jamais copiées

- **Élèves et comptes** : `profiles` des élèves, `class_members`, `pending_students`, `parental_consents`, `terms_acceptances`, `welcome_emails_sent`, `user_*`, `student_*`.
- **Activité** : tentatives, réponses, soumissions, révisions (`srs_card_stats`, `srs_review_sessions`), scores, parties, récompenses (`reward_events`, `gidouilles_activity`, `weekly_*`, `daily_*`), cartes VIP gagnées.
- **Créé par des élèves** :
  - `srs_decks` : 82 paquets personnels sur 83 ;
  - `game_spells`, `spreadsheets`, et les fichiers Python des élèves.
- **Échanges** : `messages`, `conversations`, `private_messages`, `tutor_conversations`, `tutor_messages`, `friendships`, `notifications`, tout le marché, signalements.
- **Cahier de texte** (décision de David) : `class_journal_entries`, `journal_entry_*`.
- **Traces et technique** : `audit_logs`, `error_logs`, `error_occurrences`, `bug_reports`, `background_job_runs`, `rate_limits`, `server_cache`, `migration_*`.
- **Intégrations du prof** : Google Classroom (jetons, cours, documents), `kanban_*`.
- **Assignations** : `worksheet_assignment*`, `*_assignments`. Le seed les régénère sur les classes fictives.

## 3. Générées par le script

- **Comptes du prof et de l'admin :**
  - mêmes identifiants qu'en prod, pour que le contenu copié leur appartienne ;
  - **nom et e-mail fictifs**.
- **Élèves :** une trentaine d'élèves fictifs répartis dans les classes copiées, plus un élève hors classe.
- **Activité de ces élèves :**
  - assignations de feuilles, réponses justes et fausses ;
  - révisions avec une série interrompue, une évaluation ;
  - quelques messages et une amitié ;
  - points du jeu.

## Méthode prévue

- **Lecture :** depuis la prod, en lecture seule, table par table selon la liste 1.
- **Écriture :** dans la base locale uniquement (`pnpm db:seed-riche`, après `pnpm db:reset`).
- **Garde-fou :** le script refuse de tourner si la base cible n'est pas la base locale.
- **Contrôle de l'auteur :** le filtre « auteur = prof, admin ou personne » est rejoué à chaque copie, en plus de la liste.
