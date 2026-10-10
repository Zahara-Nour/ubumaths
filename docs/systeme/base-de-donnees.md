# Base de données — ce que la liste des tables ne dit pas

La base Supabase (Postgres, région **EU**, `eu-west-3`) porte tout l'état de Chiphre : comptes,
classes, contenus du professeur (questions, exercices, fiches, chapitres), traces de travail des
élèves (tentatives, révisions, évaluations), échanges sociaux (messagerie, marché, jeux). Elle
contient des **données d'élèves mineurs** : la Row Level Security (RLS) est la frontière qui compte.

- **Liste complète des tables, colonnes et liens** : [base-de-donnees-tables.md](base-de-donnees-tables.md)
  (générée depuis `src/lib/types/database.ts` par `scripts/generate-db-doc.ts`, `pnpm db:doc`).
- **Vocabulaire** (professeur, classe, école, fiche, « publier »…) : [CONTEXT.md](../../CONTEXT.md).
- **Écrire une migration, la pousser, régénérer les types** : [pratiques/base-de-donnees.md](../pratiques/base-de-donnees.md).

Ce document explique **qui lit quoi**, les tables pivots et les pièges ; ni colonnes ni SQL (les migrations font foi).

---

## 1. Le modèle d'accès

Rôles : `profiles.role` vaut `teacher`, `admin` ou `student` ; le visiteur sans session est le rôle
Postgres `anon` ; le serveur utilise le client `service_role` (`src/lib/server/serviceRoleClient.ts`),
qui **contourne la RLS**. Décision figée : [ADR 0002](../adr/0002-mono-professeur-ecole-frontiere-sociale.md).

- **Un seul professeur.** Le trigger `trg_enforce_single_teacher` (fonction
  `enforce_single_teacher`, BEFORE INSERT OR UPDATE OF `role` sur `profiles`) refuse un second
  compte `teacher`. Un test qui crée deux professeurs casse.
- **Le professeur voit tous les élèves**, hors-classe compris. La **classe est un dossier**, pas une
  frontière d'accès pour lui. Le professeur rejoint le compte admin par élévation côté serveur
  (`src/lib/server/adminElevation.ts`, garde `requireAdmin` dans `src/lib/server/middleware/auth.ts`),
  et la plupart des aides RLS incluent l'admin.
- **L'école est la frontière sociale** : tout ce qui met des élèves en relation (amitiés, chat, marché,
  classements) est borné par l'école (`profiles.school_id`).
- **Un élève hors-classe** doit pouvoir tout faire avec le professeur : une aide RLS bornée à la
  classe, côté professeur, est un bug.

### Les fonctions d'aide RLS réellement utilisées

Toutes `SECURITY DEFINER` (elles lisent `profiles` / `class_members` sans repasser par leur RLS).

| Fonction                                                                                                      | Vrai quand…                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `is_teacher_or_admin()`                                                                                       | l'appelant a le rôle `teacher` ou `admin`. **Pivot** : la plus utilisée des policies.                                                                                |
| `is_admin()`                                                                                                  | l'appelant a le rôle `admin` (et lui seul : le professeur n'y passe pas).                                                                                            |
| `is_my_student(p_student_id)`                                                                                 | = `is_teacher_or_admin()`. Le paramètre est **ignoré** (réservé à un retour éventuel du cloisonnement).                                                              |
| `is_teacher_of_student(p_student_id)`                                                                         | `is_teacher_or_admin()` **et** l'élève a au moins une ligne dans `class_members` (tout statut).                                                                      |
| `is_class_teacher(p_class_id)` · `is_teacher_of_class(p_class_id)`                                            | = `is_teacher_or_admin()` ; la classe est ignorée (les policies « du professeur de la classe », par exemple sur `student_warnings`, valent donc aussi pour l'admin). |
| `is_class_member(p_class_id)`                                                                                 | l'appelant a une ligne `class_members` dans cette classe (tout statut).                                                                                              |
| `is_class_student(p_class_id)`                                                                                | idem, mais adhésion **active** seulement (depuis `20260915220000`).                                                                                                  |
| `is_classmate(p_class_id)`                                                                                    | adhésion active de l'appelant **et** classe active (`classes.is_active`).                                                                                            |
| `my_school()`                                                                                                 | `school_id` de l'appelant (NULL s'il n'est rattaché à aucune école).                                                                                                 |
| `same_school(p_other)`                                                                                        | l'autre compte est dans la même école, non NULL, que l'appelant.                                                                                                     |
| `is_friend(id)` · `are_classmates(id)` · `has_pending_request_from(id)` · `shares_tournament(id)`             | ouvrent la lecture d'un **profil** d'élève à un autre élève (ami, camarade, demande en attente, tournoi commun).                                                     |
| `student_has_worksheet_access(id)` · `student_has_exercise_access(id)` · `had_class_access_to_assignment(id)` | accès élève **recalculé** depuis les affectations et `class_members` (§ Fiches).                                                                                     |

### Le visiteur non connecté (`anon`)

- Depuis `20261001120000_droits_par_defaut_sans_anon`, une **nouvelle** table ne donne **aucun**
  droit à `anon` : une page publique exige un `GRANT` explicite **et** une policy `TO anon`. Les tables
  plus anciennes ont gardé leurs droits : seule la RLS les protège.
- Une policy **sans clause `TO`** s'applique à `PUBLIC`, donc aussi à `anon`.
- `anon` n'a **aucun** droit sur `profiles` (incident C2 de l'audit d'août 2026, migration
  `20260902094000_security_profiles_anon_read`). Une policy évaluée pour `anon` qui lit `profiles` fait
  donc échouer **toute** la requête (`permission denied for table profiles`), au lieu de rendre zéro
  ligne : c'est ainsi que `/automaths` a répondu 500 pendant des mois. Les policies qui interrogent
  `profiles` doivent être `TO authenticated`. Garde : `tests/integration/automaths-anon-templates-rls.test.ts`.

Ce qu'`anon` peut lire, d'après les policies des migrations (relevé statique, non mesuré en prod) :
les `question_templates` publiés (réponses comprises : `/automaths` génère dans le navigateur) ; tout
`curriculum_points`, `curriculum_point_automatismes`, `grade_predecessors`, `classification_nodes`,
`source_types` (contenu public des programmes, ADR 0020) et le rangement des exercices lisibles
(`exercise_classifications`) ; les lignes `is_public` de `exercises`, `python_exercises`,
`constructions` ; `parody_evaluations` et leurs `resource_tags`, `tags`, `schools`,
`riddle_of_the_day` ; les parties terminées de `minesweeper_games`.

---

## 2. Les domaines

Mêmes titres que la liste générée. Les accès décrits ont été lus dans les policies.

### Établissement et personnes

Comptes, écoles, années scolaires, classes et inscriptions.

- `profiles` (1 ligne par compte, même `id` que `auth.users`, créée par `handle_new_user` via le
  trigger `on_auth_user_created`) → `schools` par `school_id`.
- `classes` → `schools`, `school_years` ; `class_members` (`class_id`, `student_id`, `status`,
  `left_at`, unique sur le couple) est la **source de vérité des inscriptions** — pas les tableaux
  `class_ids` de `profiles` / `pending_students`.
- `pending_students` : élèves importés avant leur première connexion (géré par l'admin seul).
- `friendships`, `parental_consents`, `student_warnings`.

Accès :

- **Élève** : lit son profil, ses adhésions, ses classes, et les adhésions des classes **actives** où
  il est actif (`is_classmate`). Il lit le profil d'un autre élève seulement s'il est ami, camarade,
  demandeur d'amitié en attente ou co-participant d'un tournoi. Il modifie son profil sans pouvoir
  changer son `role` ni son `status`, ni augmenter ses `gidouilles`. Il demande une amitié **dans son
  école seulement** (`same_school`).
- **Professeur / admin** : lit et gère classes et adhésions, lit tous les profils d'élèves, les
  amitiés (et peut les supprimer), les consentements parentaux.
- **Création de profil** : par le serveur seulement (policy passée `TO service_role`, `20261001200000`).

**Sortie d'une classe** : retirer un élève l'**archive** (`status = 'archived'`), il n'y a plus de
DELETE (`src/routes/api/admin/remove-from-class`). Le trigger `trg_class_members_left_at` pose
`left_at` au passage en `archived` (une fois, sans pouvoir être repoussé) et le remet à NULL en cas de
réintégration. `left_at` NULL = départ inconnu (les adhésions archivées avant 2026-09-13) : ne jamais
le remplacer par un `coalesce`. L'élève archivé relit ce qu'il a reçu, ne reçoit plus rien. Test :
`tests/integration/archived-member-stops-receiving.test.ts`.

**Import d'élèves** : deux ordres possibles, à toujours considérer. Import puis connexion : la ligne
`pending_students` est activée à la première connexion. Connexion avant import : il faut insérer
directement dans `class_members`.

Code : `src/lib/server/students.ts`, `src/lib/server/auth.ts`, `src/lib/server/middleware/auth.ts`,
`src/routes/(protected)/dashboard/admin/import-students`, `src/routes/api/consent`. Auth et
consentement : [auth/](auth/README.md), [conformite/](conformite/README.md).

### Programme et suivi par compétences

Deux référentiels, deux usages (la famille A, ex-`skills`, n'existe plus :
[ADR 0008](../adr/0008-referentiel-famille-a-abandonne.md)).

|            | Arbre des contenus du programme                                     | Compétences mathématiques                                                 |
| ---------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Hiérarchie | `curriculum_themes` → `curriculum_objectives` → `curriculum_points` | `math_competences` → `math_competence_subdimensions` → `observables`      |
| Saisie     | `skill_attempts.template_id` (réussite automatique)                 | `skill_attempts.observable_id` + `code` `plus`/`minus` (jugement du prof) |
| Cache      | `student_point_state`                                               | `student_observable_state` → `student_competence_level`                   |

- **`curriculum_points` est le grain unique** : couverture du programme, tagging des ressources et
  acquisition de l'élève s'y accrochent. `code` (`1SPE-047`, `6-012`), attribué par trigger, est le seul
  identifiant lisible et stable d'un environnement à l'autre. Un point se retire par `archived_at`, pas
  par DELETE : la route `DELETE /api/teacher/curriculum/points/[pointId]` répond **409** dès qu'une
  référence existe (comptage par `curriculum_point_reference_counts`, en DEFINER, pour voir aussi
  l'historique des élèves).
- **Cible en cours (ADR 0019, 0020)** : `classification_nodes` (branche > notion > sous-notion),
  `source_types`, `exercise_classifications`, `grade_predecessors` (parcours, `grade_ancestors()`), et
  sur `curriculum_points` les colonnes `node_id`, `grade`, `rubrique`. `objective_id` est devenu
  facultatif ; `rang` est ignoré par la cible.
- **Régime d'acquisition** (`regime_acquisition`) : `fluence` = ≥ 5 réussites et ≥ 3 sur les 5
  dernières ; `diversite` = ≥ 2 modèles distincts réussis et aucun échec sur les 3 dernières. Les cartes
  de cours ne comptent pas (`20260928160000`).
- **`curriculum_point_automatismes`** : un point « automatisme » l'est **pour un niveau** (liste
  publiée par un programme), pas dans l'absolu.
- **`skill_attempts` est la source unique des faits**, immuable (aucune policy UPDATE/DELETE hors
  admin). Un CHECK impose le XOR entre les deux régimes. Le trigger `trg_skill_attempts_after_insert`
  recalcule les caches (`update_student_point_state`, `update_student_observable_state` →
  `update_student_competence_level`) ; les caches ne s'écrivent que par lui.
- **Position d'affichage** : `display_order` est local à la fratrie ; un nœud créé sans position va en
  dernier (triggers `*_place_last`) ; réordonner passe par `reorder_curriculum_points` / `_themes` /
  `_objectives`, qui renumérotent 1..N et refusent une liste incomplète. Ces trois-là sont en
  **INVOKER** pour que la RLS s'applique à l'écriture.

Accès : arbre et compétences lisibles par tout compte connecté (et une partie par `anon`, § 1) ;
arbre écrit par le professeur / admin ; compétences et `classification_nodes` écrits par l'admin.
L'élève lit **ses** tentatives et **ses** caches ; le professeur ceux de tous les élèves
(`is_my_student`). L'élève insère ses tentatives `auto`/`srs`/`student_self` ; le professeur insère les
`teacher`.

Code : `src/lib/server/curriculum.ts` (insertion d'un point : `pointInsert()`, seul endroit où l'on
contourne le `code` exigé par le type généré), `src/lib/server/curriculum-coverage.ts`,
`src/lib/server/competences/`, `src/lib/server/stats/`, `src/routes/api/teacher/curriculum`,
`src/routes/(protected)/dashboard/teacher/programme`. Types : `SkillAttempt` (discriminé, à préférer à
`Tables<'skill_attempts'>`) dans `src/lib/types/database-helpers.ts`, `MissingForNext` dans
`src/lib/types/skills.ts`.

### Questions et exercices

- `question_templates` : le modèle de question (énoncé paramétré, `variations`, cases, correction).
  `question_template_points` le tague aux points du programme (**RESTRICT** côté point : pivot de
  l'acquisition).
- `series` : composition de questions (catégories, nombre, durée), verrouillée dès qu'un élève a
  commencé.
- `exercises` (+ `exercise_curriculum_points`, `exercise_classifications`) ; `exercise_assignments`
  (à un élève ou une classe), `exercise_completions`, `student_exercise_mastery` (auto-évaluation
  maîtrisé / à revoir).
- `migration_*` : outillage de la migration des questions TinyMath.

Accès : les modèles **publiés** sont lisibles par tous les élèves (et `anon`), les autres par le
professeur ; l'écriture des modèles est admin. Un exercice est lu par son auteur, par un élève qui y a
accès (`student_has_exercise_access`) ou par tous s'il est `is_public`. L'élève lit et écrit **ses**
complétions et sa maîtrise ; depuis `20261012120000`, le professeur lit la maîtrise des élèves inscrits
dans une classe (`is_teacher_of_student`). Les séries : auteur, admin, et élève à qui elle est
affectée (`student_can_read_series`).

Code : `src/lib/questions/`, `src/lib/exercises/`, `src/lib/server/` (`exercises.ts`, `series.ts`,
`exercise-assignments.ts`), `src/routes/api/questions`, `src/routes/api/exercises`.

### Chapitres et cahier de texte

« Mon cours » : les chapitres de chaque classe, et le cahier de texte des séances.

- `class_chapters` (par classe, `is_visible`) → `chapter_sections` et les contenus
  `chapter_documents`, `chapter_exercises`, `chapter_worksheets`, `chapter_checklist_items`,
  `chapter_series`, `chapter_decks`.
- `chapter_templates` (+ `_versions`, `chapter_template_instantiations`) : modèles réutilisables.
- `class_journal_entries` → `journal_entry_activities` (exercice, question, évaluation, cours,
  manuel), `journal_entry_points` (couverture du programme : `source` `manual` ou `auto`),
  `journal_entry_homework`, `class_journal_share_tokens`.

**Publier au fur et à mesure** ([ADR 0005](../adr/0005-publication-par-element-acces-herite-de-la-classe.md)) :
chaque contenu de chapitre a sa colonne `published_at`. Les policies élève testent
`published_at <= now()`, **jamais** `is not null` : une date programmée ne publie pas en avance (et
`null <= now()` est faux). « Publier » a trois sens dans la base — voir [CONTEXT.md](../../CONTEXT.md).

Accès : le professeur gère tout. L'élève lit un contenu si le chapitre est visible, s'il est **actif**
dans la classe (`is_class_student`) et si le contenu est publié. `chapter_worksheets` exige en plus
`student_has_worksheet_access` : retirer l'une des deux gardes rouvrirait un canal de distribution
parallèle. L'élève lit les séances publiées et passées des classes dont il est membre ; les activités
et la couverture d'une séance sont réservées au professeur.

`reconcileAutoCoverage()` (`src/lib/server/curriculum-coverage.ts`) recalcule les lignes `auto` de
`journal_entry_points` depuis les activités, sans toucher aux lignes `manual` : la couverture
s'allume quand le contenu est tagué après coup. Une évaluation se résout en points par ses
catégories de série (quadruplet unique d'un modèle publié), en TypeScript.

Documents : plafond de **25 Mo** tenu à deux endroits qui doivent bouger ensemble (bucket
`file_size_limit` et CHECK `valid_file_size` de `chapter_documents`) ; le fichier va directement du
navigateur au storage, le serveur choisit le chemin. Test : `tests/integration/chapter-documents-size-limit.test.ts`.

Code : `src/lib/server/` (`chapters.ts`, `chapters-publication.ts`, `chapter-templates.ts`, `journal.ts`,
`journal-activities.ts`), `src/routes/api/teacher`. Tests : `chapter-publication-rls`, `chapter-worksheet-publish-distributes`.

### Fiches

- `worksheets` (`status` = rédaction terminée ou non) → `worksheet_sections`, `worksheet_exercises`.
- `worksheet_assignments` (distribution) → `worksheet_assignment_classes`,
  `worksheet_assignment_students`, `worksheet_assignment_exercise_settings`.
- `worksheet_instances` : exercices générés par élève (graine déterministe).

**L'accès est hérité, jamais distribué** : `student_has_worksheet_access` part de
`worksheet_assignments`, passe par `worksheet_assignment_classes` / `worksheet_assignment_students`
et rejoint `class_members` **à chaque lecture**. Un élève inscrit après la publication reçoit donc la
fiche sans qu'aucune ligne soit écrite pour lui. Le jour où quelqu'un matérialiserait la distribution
(une ligne par élève au moment de publier), les élèves arrivés après perdraient leurs fiches sans que
le professeur le voie. Test : `tests/integration/eleve-inscrit-apres-publication.test.ts`.

Accès : l'auteur et l'admin gèrent ; l'élève lit une affectation `active`, disponible
(`available_from`), s'il est dans une classe ciblée, ciblé individuellement, ou s'il **avait** accès
avant son départ (`had_class_access_to_assignment`, borné par `left_at`). Il lit ses propres
instances.

Code : `src/lib/server/worksheets/`, `src/lib/worksheets/`, `src/routes/api/worksheets`. Rédaction
des fiches : [pratiques/fiches-exercices.md](../pratiques/fiches-exercices.md).

### Évaluations

- `evaluations` (une série, une `form`, `status`) → `evaluation_assignments` (à une classe ou un
  élève) ; `evaluation_attempt_questions` : questions tirées et corrigées **côté serveur**
  ([ADR 0015](../adr/0015-evaluation-notee-correction-serveur.md)) — aucun droit pour `anon` ni
  `authenticated`, `service_role` seul.
- `test_sessions` / `test_answers` : passages de séries. Une policy RESTRICTIVE interdit à un
  compte connecté d'écrire une session d'évaluation (`evaluation_id`, note, points) : c'est le serveur
  qui les écrit.
- `evaluation_tasks` / `evaluation_task_perimeter` : tâches évaluées par compétences (observables).
- `parody_evaluations` : les « presques-évaluations », publiques.

Accès : le professeur auteur gère ses évaluations ; l'élève lit une évaluation publiée qui lui est
affectée (`student_can_read_evaluation`) ; il lit ses sessions, le professeur celles de tous les
élèves.

Code : `src/lib/server/` (`evaluations.ts`, `evaluation-attempts.ts`, `test-mode.ts`), `src/routes/api/evaluations`, `src/routes/api/tests`.

### Dictionnaire (mots mathématiques)

Les mots mathématiques et leurs définitions par niveau (ADR 0022) : `dictionary_entries`, et
`dictionary_entry_versions` pour l'historique des modifications de l'admin. Code : `src/lib/dictionary/`,
chargement serveur `src/lib/server/dictionary/load.ts` ; affichage : glossaire public et mots
cliquables (`src/lib/lexicon/`).

### Révisions (SRS)

Répétition espacée FSRS greffée sur les modèles de questions. Détail : [srs/architecture.md](srs/architecture.md).

- `srs_decks` (paquet ; `is_auto_managed` = le paquet « Programme », un par élève ; `is_assigned` +
  `source_deck_id` = copie assignée par le professeur) → `srs_deck_sections`, `srs_cards`.
- `srs_card_stats` : état FSRS par élève et carte, calculé en TypeScript (`src/lib/srs/fsrs.ts`).
- `srs_deck_assignments`, `srs_review_sessions`, `srs_anti_fraud_flags` ([srs/anti-fraud.md](srs/anti-fraud.md)).

Accès : l'élève gère ses paquets **non assignés et non automatiques** ; il ne crée ni ne transforme un
paquet assigné, automatique ou copié (policies RESTRICTIVE `srs_decks_paquets_serveur_*`) — ces
paquets passent par le client service (`ensureProgrammeDeck`, `src/lib/server/srs/programme-deck.ts`,
et `src/routes/api/srs/decks/[id]/assign`). `srs_card_stats` : l'élève **lit** sa mémoire, le
professeur celle des élèves à qui il a assigné un paquet ; **seul le serveur écrit**
(`upsertCardStats`, `src/lib/server/srs/fsrs-actions.ts`).

Une révision écrit FSRS d'abord, puis `skill_attempts` : si FSRS échoue, rien n'est enregistré. Code :
`src/lib/server/srs/`, `src/routes/api/srs`, `src/routes/api/skill-attempts`.

### Python

Exercices, fichiers et carnets Python, exécutés dans le navigateur (Pyodide). Détail : [python/](python/README.md).

- `python_exercises` → `python_exercise_assignments`, `python_exercise_submissions`,
  `python_exercise_mastery` ; `python_files` (+ affectations) ; `python_notebooks` →
  `python_notebook_assignments`, `python_notebook_checkpoint_runs`.
- `python_submission_server_verdicts` : existe en prod mais **inerte** — la re-vérification serveur a
  été abandonnée ([ADR 0010](../adr/0010-pas-de-reverification-serveur-python.md)).

Accès : l'élève lit et soumet ses propres soumissions, le professeur lit celles de tous les élèves.
Un carnet est lu par son auteur, par l'élève à qui il est assigné (`is_notebook_assigned_to_student`,
adhésion active), par le professeur ; seul le professeur rend un carnet public ou modèle (policies
RESTRICTIVE `python_notebooks_public_par_le_prof_*`, `20261004213000`).

Code : `src/routes/api/python-exercises`, `src/routes/api/python-notebooks`, `src/routes/(protected)/python-notebook`.

### Messagerie, notifications, modération

Deux systèmes distincts, à ne pas confondre :

- **Chat** : `conversations` → `conversation_participants`, `messages` (+ `message_reactions`,
  `message_attachments`, `message_reports`). Un chat à deux naît par `create_1on1_chat`, qui exige une
  amitié acceptée (une amitié ne se demande plus que dans son école). Canal temps réel **privé** `chat-<conversation_id>`, réservé
  aux participants (policies sur `realtime.messages`, [realtime.md](realtime.md)).
- **Messagerie** (style courriel) : `private_messages` → `message_inbox` (un destinataire, un dossier
  `user_folders`), `message_drafts`, `message_attachments_v2`, `message_templates`.
- `notifications` (+ `notification_reads`), `moderation_logs`, `user_restrictions`.

Accès : on lit les messages des conversations dont on est participant, et ceux qu'on a envoyés ou
reçus ; le professeur lit la messagerie pour la modérer et supprime (logiquement) les messages des
chats de classe ; l'admin lit tout.

Code : `src/lib/stores/chat.svelte.ts`, `src/lib/server/student-inbox.ts`, `src/lib/server/notifications.ts`,
`src/routes/api/chat`, `src/routes/api/messages`, `src/routes/api/moderation`.

### Marché (échanges entre élèves)

Annonces et échanges de cartes VIP et de gidouilles. `marketplace_listings` → `marketplace_proposals`
→ `marketplace_trades` (+ `marketplace_locked_cards`, `marketplace_trade_offers`,
`marketplace_chat_messages`, `marketplace_config`).

- **Borné à l'école** : un élève voit les annonces actives de `my_school()` ; une proposition ne vise
  qu'une annonce active de son école ; un échange direct se fait entre amis de la même école (policy
  RESTRICTIVE `marketplace_trades_insert_friend_rules`).
- **La base garde l'échange** : `execute_trade` refuse tant que les quatre drapeaux (validations et
  confirmations des deux parties) ne sont pas vrais ; le trigger `guard_marketplace_trade_update_trg`
  fige ce qu'un élève ne doit pas toucher (sa seule moitié d'offre, délai de confirmation de 5 minutes
  posé par la base) ; aucun élève ne supprime un échange (`marketplace_trades_delete_never`). Le
  vendeur ne peut que refuser une proposition ; l'acceptation passe par `accept_proposal_atomic`, qui
  refuse un `p_user_id` différent de l'appelant.
- Le professeur lit les annonces, propositions et échanges de tous les élèves ; il n'entre pas sur le
  canal temps réel d'un échange (`trade:<id>`, participants seuls).

Tests : `marketplace-trades-garde`, `echanges-delai-confirmation`, `realtime-trade-prive` (dans
`tests/integration/`). Code : `src/lib/server/marketplace/`, `src/routes/api/marketplace`,
`src/lib/stores/tradeRealtime.svelte.ts`.

### Jeux, défis et récompenses

Jeux (démineur, 2048, Mathémo, combats), énigmes, succès, compagnons et économie (gidouilles, cartes
VIP, récompenses hebdomadaires). Détail : [jeux-et-economie.md](jeux-et-economie.md),
[buddy-palotins.md](buddy-palotins.md). Pivots : `minesweeper_games`, `riddles` → `riddle_attempts`,
`achievements` → `student_achievements`, `student_buddies`, `reward_events`, `gidouilles_activity`.
Le solde vit dans `profiles.gidouilles` / `vip_cards`. L'élève lit ses propres traces, le professeur
celles de tous les élèves ; les classements passent par `game_leaderboard`, borné à l'école.
Code : `src/lib/server/games/`, `src/lib/server/achievements/`, `src/routes/api/games`,
`src/routes/api/riddles`, `src/routes/api/rewards`.

### Google Classroom

Synchronisation avec Google Classroom : `google_integrations` (jeton du professeur, lu par lui seul et
l'admin) → `google_classroom_courses`, `_coursework`, `_materials`, `_topics` ; `shared_coursework` /
`shared_materials` exposent aux élèves ce qui est partagé. Code : `src/lib/server/google/`, `src/routes/api/google`.

### Outils du professeur (kanban, tableau blanc, tableur, constructions)

- **Kanban** : `kanban_boards` → `kanban_columns` → `kanban_cards`. Tableau personnel
  (`class_id` NULL, privé à son propriétaire) ou de classe (lisible par les membres, qui gèrent les
  cartes ; colonnes et tableau restent au propriétaire). Aides `can_access_kanban_board` /
  `_column`. Code : `src/lib/server/kanban.ts`, `src/routes/api/organisation/kanban`. Test :
  `tests/integration/kanban-rls.test.ts`.
- `spreadsheets`, `constructions` : à leur auteur (les constructions `is_public` sont lisibles par
  tous). `whiteboard_templates` : modèles publics, de l'auteur ou système.

### Tuteur et recherche documentaire (RAG)

`tutor_conversations` → `tutor_messages` : l'élève lit et écrit ses conversations, le professeur lit
celles de tous les élèves. `rag_documents` → `rag_chunks` : documents du professeur ou du système
(`teacher_id` NULL). Code : `src/lib/server/tutor/`, `src/lib/server/rag/`, `src/routes/api/tutor`.

### Exploitation (journaux, configuration, cache)

`app_config` (drapeaux, lisible par tout compte, écrit par l'admin), `error_logs` /
`error_occurrences` (`src/lib/server/errorMonitoring.ts`), `bug_reports`, `background_job_runs`
(tâches planifiées, lues par l'admin), `rate_limits` (`service_role` seul, via la RPC
`check_and_increment_rate_limit` de `src/lib/server/rateLimiter.ts`), `server_cache`.

---

## 3. Fonctions `SECURITY DEFINER`

Une fonction `SECURITY DEFINER` s'exécute avec les droits de `postgres` : **la RLS ne la protège
pas.** Si un élève peut l'appeler en RPC, seule une garde dans son corps l'empêche de lire ou
d'écrire le compte d'un autre.

- **Garde d'appelant obligatoire** : comparer le paramètre utilisateur à `auth.uid()`, ou réserver la
  fonction au professeur (`assert_teacher_or_admin()`), ou à soi / au professeur
  (`assert_can_read_student(p_student_id)`, migration `20261003130000_rpc_lot1_donnees_mineurs`).
  Ces deux gardes lèvent `42501` et ne sont exécutables que par `service_role` : seules les fonctions
  DEFINER les appellent. Sinon : `REVOKE EXECUTE … FROM PUBLIC, anon, authenticated` (révoquer à
  `anon` seul ne suffit pas, `anon` hérite de `PUBLIC`).
- **`search_path` terminé par `pg_temp`**.
- **Garde-fou** : toute fonction DEFINER non-trigger exécutable par `authenticated` ou `anon` doit
  figurer, avec la garde **lue** dans son corps, dans
  `tests/integration/fixtures/fonctions-definer-verifiees.ts`. Le test
  `tests/integration/garde-fonctions-security-definer.test.ts` (`pnpm test:definer-guard`) échoue
  sinon. Ne jamais y ajouter une fonction sans avoir lu son corps. Mode d'emploi :
  [rls-echecs-silencieux.md](../pratiques/rls-echecs-silencieux.md#nouvelle-fonction-security-definer--le-garde-fou-q145).
- **Tester avec un vrai compte** : la plupart des RPC sortent tôt quand `auth.uid()` est NULL. Un
  test sans session passe pour une mauvaise raison.

---

## 4. Pièges

- **La RLS échoue en silence** (zéro ligne, pas d'erreur ; écriture refusée sans erreur ; jointure
  `!inner` qui efface la ligne parente ; policies permissives combinées en OU). Tout est dans
  [rls-echecs-silencieux.md](../pratiques/rls-echecs-silencieux.md) : à lire avant d'écrire **ou de
  retirer** une policy.
- **`pnpm db:types` génère depuis la PRODUCTION.** Une fonction pas encore en prod n'existe pas dans
  `database.ts` : migration d'abord (PR, `db:migrate`, `db:types`), code qui l'appelle ensuite. Ne
  jamais éditer `database.ts` ; les alias vont dans `src/lib/types/database-helpers.ts`.
- **Le baseline local ≠ la prod pour le schéma `auth`.** `20260616220000_baseline_schema.sql` crée
  le trigger `on_auth_user_created` sur `auth.users`, mais le baseline n'est jamais appliqué à la prod :
  ce trigger y manquait (aucun profil créé pour un nouveau compte) jusqu'à
  `20260826100000_recreate_on_auth_user_created_trigger`. Après un travail sur l'auth, vérifier en
  lecture seule les triggers de `auth.users` en prod.
- **`jsonb` réordonne les clés.** Relire une colonne `jsonb` et la comparer par `JSON.stringify` à ce
  qu'on a envoyé échoue dès qu'une clé est ajoutée, alors que l'écriture a réussi : comparer une
  sérialisation à clés triées.
- **Une colonne masquée ne se fait pas par `REVOKE` de colonne** : un rôle sans SELECT au niveau
  table reçoit `42501` sur un `select('*')`, ce qui casse PostgREST. Pour cacher des données à l'élève,
  une table annexe sans policy élève (c'est ce que fait `python_submission_server_verdicts`).
- **`curriculum_points` : cinq des six clés étrangères qui le visent sont en CASCADE** ; supprimer un
  point effacerait sans un mot la couverture du cahier de texte et l'acquisition des élèves. On
  archive.
- **`journal_entry_activities.exercise_id` est en `SET NULL`** alors qu'un CHECK de forme exige la
  colonne pour `kind = 'exercise'` : supprimer un exercice cité dans une séance échoue sur la
  contrainte.
- **Deux générations de seeds du programme.** Les anciens (`20260621160000_seed_curriculum_6e`,
  `20260830090000_seed_curriculum_1re_spe`) amorcent un niveau vide, une fois (garde
  `IF EXISTS … THEN RETURN`) ; ensuite la page `/dashboard/teacher/programme` fait foi. Les nouveaux
  (`202610*_seed_curriculum_points_*`, points rattachés à l'arbre, ADR 0020) insèrent des points neufs
  aux codes distincts (`6-101`… à côté des anciens `6-001`…) et lèvent une exception si le compte
  n'y est pas. Leur rollback (un `delete`) devient **destructif** dès qu'un élève ou un modèle s'accroche
  à ces points.

---

## 5. Migrations

Workflow, additif / destructif, `db:migrate`, tests d'intégration : [pratiques/base-de-donnees.md](../pratiques/base-de-donnees.md).
Le schéma part du baseline `20260616220000_baseline_schema.sql` (anciennes migrations : `supabase/migrations_archive/`).

---

Vérifié contre le code le 2026-10-10.
