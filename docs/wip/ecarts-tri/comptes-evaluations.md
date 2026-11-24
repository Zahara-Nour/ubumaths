# Lot comptes-evaluations : 30 points

| verdict                                                       | nombre |
| ------------------------------------------------------------- | -----: |
| VRAI (dont 3 D : cours:615, evaluations:548, evaluations:550) |     22 |
| PAS UN ÉCART                                                  |      5 |
| DOUBLON (T15)                                                 |      1 |
| NON VÉRIFIÉ                                                   |      2 |
| FAUX · CORRIGÉ                                                |      0 |

## Points

### comptes-classes-ecoles.md:392 [V] — PAS UN ÉCART

- **Point** : `bulk_create` des écoles force `uai: ''`, un import en masse n'enregistre jamais d'UAI.
- **Vu** : `src/routes/(protected)/dashboard/admin/schools/+page.server.ts:161-195`. Le commentaire dit que le collage tableur n'a pas de colonne UAI et que l'admin règle l'UAI à l'unité (formulaire simple / Annuaire). Voulu, documenté dans le code.

### comptes-classes-ecoles.md:390 [L] — VRAI

- **Point** : `/api/classes/[classId]/students` valide `classId` avec `getClassGidouillesSchema`.
- **Vu** : `src/routes/api/classes/[classId]/students/+server.ts:4,38` importe `getClassGidouillesSchema` (`src/lib/server/validation/classes.ts:104`, `z.string().uuid`), schéma nommé pour la route gidouilles. Même forme aujourd'hui, donc sans effet, mais un changement du schéma des gidouilles casserait la route élèves.
- **Registre** : L · classes · la route des élèves d'une classe emprunte le schéma de validation d'une autre route · preuve : commande `! grep -q getClassGidouillesSchema "src/routes/api/classes/[classId]/students/+server.ts"` (sortie 1 aujourd'hui, 0 une fois un schéma propre utilisé).

### comptes-classes-ecoles.md:375 [M] — PAS UN ÉCART

- **Point** : `restoreOptionsSchema` utilisé seulement via `validateRestoreOptions`.
- **Vu** : `src/lib/server/validation/backup.ts:239,324` ; `validateRestoreOptions` est appelé par `src/lib/server/admin/exercise-backup.ts:575`. Le schéma est exporté mais c'est un usage normal (schéma encapsulé par sa fonction). Pas de code mort.

### comptes-classes-ecoles.md:378 [M] — VRAI

- **Point** : `api/classes` et `api/teacher/classes` rendent les mêmes classes.
- **Vu** : `src/routes/api/classes/+server.ts` et `src/routes/api/teacher/classes/+server.ts` appellent tous deux `getTeacherClassesWithCounts`. Appelants distincts : `/api/classes` par `src/lib/components/notebook/ShareNotebookDialog.svelte:80` seul ; `/api/teacher/classes` par une dizaine de composants (dialogues Google, TeacherDashboard, ListingsMonitor).
- **Registre** : M · classes · deux routes rendent la même liste de classes (une seule a un appelant, ShareNotebookDialog) · preuve : commande `test ! -f src/routes/api/classes/+server.ts` (sortie 1 aujourd'hui ; migrer ShareNotebookDialog vers `/api/teacher/classes` puis supprimer).

### comptes-classes-ecoles.md:380 [C] — VRAI

- **Point** : `teacher/classes/+page.server.ts` dit `day_of_week` borné 0-4.
- **Vu** : `src/routes/(protected)/dashboard/teacher/classes/+page.server.ts:295,363` « Validates day_of_week is 0-4 (Sunday-Thursday) » ; `src/lib/server/validation/classes.ts:35-38` `.min(0).max(6)`.
- **Registre** : C · classes · commentaire périmé sur les jours acceptés (0-4 dit, 0-6 accepté) · preuve : commande `f="src/routes/(protected)/dashboard/teacher/classes/+page.server.ts"; test -f "$f" && ! grep -q "0-4" "$f"` (sortie 1).

### comptes-classes-ecoles.md:382 [C] — VRAI

- **Point** : en-tête de `PATCH api/admin/users/[id]` liste `email`.
- **Vu** : `src/routes/api/admin/users/[id]/+server.ts:41` `email?: string` ; `updateUserFieldsSchema` (`src/lib/server/validation/admin.ts:178-190`) n'a pas d'`email`.
- **Registre** : C · comptes · en-tête de la route admin de modification de profil annonce un champ courriel que le schéma refuse · preuve : commande `f="src/routes/api/admin/users/[id]/+server.ts"; test -f "$f" && ! grep -q "email?: string" "$f"` (sortie 1).

### comptes-classes-ecoles.md:384 [C] — VRAI

- **Point** : `class-composition-source` : commentaire contradictoire sur la portée entre écoles.
- **Vu** : `src/routes/api/admin/class-composition-source/+server.ts:5-8` : « AUTRES années scolaires de la même école » puis « La portée franchit les écoles » ; le code (l. 82-94) filtre seulement `school_year_id neq` et prend toutes écoles confondues.
- **Registre** : C · comptes · l'en-tête de la route dit « de la même école » puis dit le contraire · preuve : commande `f=src/routes/api/admin/class-composition-source/+server.ts; test -f $f && ! grep -q "de la même école" $f` (sortie 1).

### comptes-classes-ecoles.md:386 [C] — VRAI

- **Point** : `send-welcome-email` dit vérifier que le prof « enseigne » à l'élève ; `verifyTeacherStudent` ne vérifie que les rôles.
- **Vu** : `src/routes/api/teacher/send-welcome-email/+server.ts:22` « Verifies teacher teaches the student » ; `src/lib/server/middleware/student-access.ts:144-174` ne teste que rôle prof/admin et cible élève (mono-prof, la classe n'est plus une frontière). Même formule dans `welcome-email/+page.server.ts:10`.
- **Registre** : C · comptes · deux en-têtes disent vérifier que le prof enseigne à l'élève alors que seuls les rôles sont vérifiés · preuve : commande `f=src/routes/api/teacher/send-welcome-email/+server.ts; test -f $f && ! grep -q "teaches the student" $f` (sortie 1).

### comptes-classes-ecoles.md:388 [C] — VRAI

- **Point** : `admin/users/+page.server.ts` dit que le prof ne voit que les comptes en attente « à cause de la RLS » (à revérifier).
- **Vu** : `src/routes/(protected)/dashboard/admin/users/+page.server.ts:7-8,38` (commentaire). Revérifié : policy « Teachers can view student profiles in their classes » = `role='student' AND is_my_student(id)` (`supabase/migrations/20260616220000_baseline_schema.sql:39889`) et `is_my_student` = `is_teacher_or_admin()` (l. 12282-12289) : le prof voit tous les élèves. Le commentaire est faux.
- **Registre** : C · comptes · commentaire faux : le prof voit tous les élèves, pas seulement les comptes en attente · preuve : commande `f="src/routes/(protected)/dashboard/admin/users/+page.server.ts"; test -f "$f" && ! grep -q "teachers will only see pending" "$f"` (sortie 1).

### cours-et-chapitres.md:645 [L] — VRAI

- **Point** : trois définitions de l'année scolaire.
- **Vu** : `src/routes/(protected)/dashboard/teacher/avancement/+page.server.ts:39-41` (1er sept → 1er sept, mois >= 8) ; `src/lib/server/journal-share-tokens.ts:114-118` `endOfSchoolYear` (31 août, mois >= 8) ; tables `school_years`. Les bornes diffèrent d'un jour et d'une source (code vs table). Aucun effet visible aujourd'hui (école française).
- **Registre** : L · cours · l'année scolaire est calculée de trois façons (Avancement, expiration des liens, tables des années) · preuve : test à écrire (une fonction commune de l'année scolaire, appelée par Avancement et `endOfSchoolYear`). Faible priorité.

### evaluations.md:552 [L] — VRAI

- **Point** : saisie des observations : DELETE puis INSERT sans `.select()` ni transaction ; cache qui ne se recalcule qu'à l'INSERT.
- **Vu** : `src/routes/(protected)/dashboard/teacher/evaluation-tasks/[id]/saisie/+page.server.ts:296-301` : `.delete().eq('task_id', …)` sans `.select()`, puis `.insert(rowsToInsert)`, deux appels séparés. Un refus RLS du DELETE rendrait 0 ligne sans erreur et l'INSERT doublerait la grille ; un échec de l'INSERT après le DELETE efface la saisie. Non vérifié : la part « cache » (déclencheur en base).
- **Registre** : L · évaluations · la saisie d'observations supprime puis réécrit sans vérifier la suppression ni transaction (grille doublée ou perdue en cas de refus) · preuve : commande `f="src/routes/(protected)/dashboard/teacher/evaluation-tasks/[id]/saisie/+page.server.ts"; test -f "$f" && grep -A3 "\.delete()" "$f" | grep -q "select"` (sortie 1) ; mieux : une fonction SQL qui fait les deux en une transaction.

### evaluations.md:556 [L] — VRAI

- **Point** : mode test à deux sources (`localStorage` vs `user_preferences`) ; store en `writable`.
- **Vu** : `src/lib/stores/test-mode.svelte.ts:31-47` part de `localStorage`, `writable` de `svelte/store` ; aucun `testMode.set(` dans `src` (grep vide) : le store n'est jamais amorcé depuis le serveur. `TestModeToggle.svelte:37-63` bascule puis appelle `/api/test-mode` (annule en cas d'erreur). Sur un autre appareil, l'interrupteur peut donc afficher l'inverse de l'état enregistré.
- **Registre** : L · mode test · l'interrupteur du mode test lit le navigateur, pas le compte (autre appareil : affichage inverse de l'état réel) · preuve : commande `grep -rq "testMode.set(" src --include=*.svelte --include=*.ts` (sortie 1 aujourd'hui ; 0 quand le store est amorcé par le serveur).

### evaluations.md:543 [V] — VRAI

- **Point** : `shuffle_questions` sans effet.
- **Vu** : `src/lib/server/evaluations.ts:69,167,252` ne fait que lire/écrire la colonne ; `src/routes/api/evaluations/assignments/[id]/start/+server.ts` n'en parle pas (grep « shuffle » : rien). Le formulaire (`EvaluationConfigForm.svelte:64,118`) propose « Mélanger l'ordre des questions », coché par défaut.
- **Registre** : V · évaluations · la case « Mélanger l'ordre des questions » d'un contrôle est cochée par défaut mais l'ordre des questions ne change jamais · preuve : commande `grep -q shuffle "src/routes/api/evaluations/assignments/[id]/start/+server.ts"` (fichier présent, sortie 1 aujourd'hui) ; ou `test à écrire` : deux départs du même contrôle avec la case cochée donnent deux ordres possibles. Alternative produit : retirer la case.

### evaluations.md:546 [M] — VRAI

- **Point** : `validateAttempt` n'est appelé que par les tests.
- **Vu** : `src/lib/server/evaluations.ts:479` définition ; occurrences ailleurs : `src/lib/server/__tests__/evaluations.test.ts` et `tests/integration/series-evaluations-code.test.ts:46` seulement. Aucun appelant de production.
- **Registre** : M · évaluations · la fonction de contrôle des tentatives n'est appelée que par les tests, le départ de tentative refait les contrôles à sa façon · preuve : commande `grep -rn "validateAttempt" src --include=*.ts --include=*.svelte | grep -v "__tests__" | grep -v "evaluations.ts:"` doit rendre un appelant : `! test -z "$(grep -rln 'validateAttempt' src | grep -v __tests__ | grep -v lib/server/evaluations.ts)"` (sortie 1 aujourd'hui).

### evaluations.md:548 [D] — VRAI

- **Point** : archivage d'un contrôle sans écran.
- **Vu** : `src/routes/(protected)/dashboard/teacher/assessments/+page.server.ts:26-37` n'a que l'action `publish` ; `setEvaluationStatus` (`src/lib/server/evaluations.ts:269`) accepte `archived` mais n'est appelé qu'avec `'published'`. L'onglet « Archivés » (`+page.svelte:17,87,144`) existe donc sans moyen d'y mettre un contrôle.
- **Registre** : D · évaluations · l'onglet « Archivés » existe mais aucun écran ne permet d'archiver un contrôle · preuve : à la main (décision de produit) ; ou commande `grep -q archive "src/routes/(protected)/dashboard/teacher/assessments/+page.server.ts"` (sortie 1 aujourd'hui).
- **Question à David** : « Quand tu n'as plus besoin d'un contrôle de l'an dernier, tu veux pouvoir le ranger, comme on archive une fiche ? Aujourd'hui l'onglet Archivés est toujours vide. » Réponses : (a) ajouter un bouton « Archiver » sur la carte du contrôle ; (b) retirer l'onglet Archivés tant qu'on n'en a pas besoin ; (c) laisser tel quel.

### evaluations.md:550 [D] — VRAI

- **Point** : assignation à un élève sans écran.
- **Vu** : `src/lib/server/evaluations.ts:300-322` accepte `student_ids` ; `src/routes/(protected)/dashboard/teacher/assessments/[id]/assign/+page.server.ts:61-70` ne lit que `class_ids` (grep `student_ids` dans le dossier assessments : vide).
- **Registre** : D · évaluations · on ne peut donner un contrôle qu'à des classes, pas à un seul élève · preuve : à la main (décision de produit).
- **Question à David** : « Un élève absent le jour du contrôle, ou un élève hors-classe : tu veux pouvoir lui donner le contrôle à lui seul, sans l'envoyer à toute sa classe ? » Réponses : (a) oui, ajouter la liste d'élèves à l'écran ; (b) non, on passe toujours par une classe (retirer `student_ids` du code) ; (c) plus tard.

### cours-et-chapitres.md:615 [D] — VRAI

- **Point** : le cahier de texte publie par `is_published` + `entry_date <= current_date`, pas par `published_at` (ADR 0005).
- **Vu** : policy « Students can view published journal entries » (`supabase/migrations/20260616220000_baseline_schema.sql:38677`) : `is_published = true AND entry_date <= CURRENT_DATE` ; `src/lib/server/journal.ts:114,154` écrit `is_published`. L'état décrit est vrai.
- **Registre** : D · cours · le cahier de texte se publie par une case, pas par une date de publication comme les autres éléments du cours · preuve : à la main (décision de produit).
- **Question à David** : « Pour un cours, tu peux programmer la publication à une date. Pour le cahier de texte, tu coches "publié" et l'entrée s'affiche à la date de la séance. Tu veux que le cahier fonctionne comme le reste (date de publication), ou ça te va comme ça ? » Réponses : (a) laisser tel quel et noter l'exception dans l'ADR 0005 ; (b) aligner sur `published_at` (migration, donc question d'accès à poser avant) ; (c) plus tard.

### cours-et-chapitres.md:624 [M] — VRAI

- **Point** : API REST sans appelant : `api/teacher/chapters/**`, `api/student/chapters/**`, `api/student/checklist/**`.
- **Vu** : `src/routes/api/teacher/chapters/` : 17 routes ; seuls `sections` (+ `reorder`, `assign`), `documents` et `document-upload-url` ont un appelant (`ChapterSectionsEditor.svelte:186,755`, `DocumentUpload.svelte:61`). Sans appelant dans `src` (grep) : racine, `[id]`, `checklist`, `exercises`, `worksheets`, `progress`, `reorder`, et `api/student/chapters/**` (3 routes), `api/student/checklist/[itemId]`. La doc du 2026-10-14 reste juste pour ce qu'elle liste. Non vérifié : appels éventuels depuis l'extérieur (OpenAPI).
- **Registre** : M · cours · routes d'API de chapitres, d'exercices, de checklist et de progression sans aucun appelant (les actions de formulaire font le travail) · preuve : test à écrire (liste des `+server.ts` sans chaîne d'URL correspondante dans `src`, rouge tant qu'il en reste).

### cours-et-chapitres.md:635 [M] — VRAI

- **Point** : fonctions sans appelant : `reorderDocuments`, `reorderExercises`, `getTeacherJournalEntries`, `getTimeSlots`..., action `reorder` sans formulaire.
- **Vu** : `reorderDocuments` (`src/lib/server/chapters.ts:611`), `reorderExercises` (`:970`), `getTeacherJournalEntries` (`src/lib/server/journal.ts:356`), `getJournalStatistics` (`:404`), `getTimeSlots` (`src/lib/utils/schedule.ts:71`) : seules occurrences hors tests = la définition. Action `reorder` de `cours/[classId]/+page.server.ts:343` : aucun `?/reorder` ni `reorder` dans les `.svelte` du dossier `cours` ni dans `components/cours` (hors `sections/reorder`, autre chose).
- **Registre** : M · cours · fonctions de réordonnancement et de lecture du cahier sans appelant, action `reorder` sans formulaire · preuve : commande `test -f src/lib/server/chapters.ts && ! grep -q "export async function reorderDocuments" src/lib/server/chapters.ts` (sortie 1 aujourd'hui).

### cours-et-chapitres.md:642 [M] — VRAI

- **Point** : `types/academic_periods_types.ts` mort, déclare sa propre `Database`.
- **Vu** : `src/lib/types/academic_periods_types.ts:8` `export interface Database` ; grep `academic_periods_types` dans `src` : aucun import.
- **Registre** : M · types · fichier de types sans aucun import qui déclare sa propre `Database` · preuve : commande `test ! -f src/lib/types/academic_periods_types.ts` (sortie 1 aujourd'hui).

### cours-et-chapitres.md:649 [C] — VRAI

- **Point** : chevauchement de couverture avec `fiches-et-pdf.md`.
- **Vu** : `docs/systeme/fiches-et-pdf.md:16,19` liste `src/routes/(public)/cahier/*/fiche/**` et `api/teacher/chapters/*/worksheets/**` ; `cours-et-chapitres.md` en-tête (l. 12) couvre `cahier/**` entier. Chevauchement réel côté `couvre:` (la garde `docs:check-a-jour` demandera deux docs). Doc, pas code.
- **Registre** : C · documentation · deux docs déclarent couvrir les fiches publiques du cahier et les routes de fiches d'un chapitre · preuve : à la main (retirer l'un des deux `couvre:`).

### cours-et-chapitres.md:651 [C] — VRAI

- **Point** : en-tête de l'éditeur de chapitre annonce un réordonnancement sans action.
- **Vu** : `src/routes/(protected)/dashboard/teacher/cours/[classId]/[chapterId]/+page.server.ts:6-8` « (add/remove/reorder) », « (CRUD/reorder) », « (link/unlink/reorder) » ; actions réelles (l. 511+) : `addChecklistItem`, `updateChecklistItem`, `deleteChecklistItem`, `setPublication`, `setHidden`, `setSectionHidden`, `linkExercise`, `unlinkExercise`, `linkWorksheet`… ; aucune `reorder`.
- **Registre** : C · cours · en-tête de la page d'un chapitre annonce un réordonnancement qui n'existe pas · preuve : commande `f="src/routes/(protected)/dashboard/teacher/cours/[classId]/[chapterId]/+page.server.ts"; test -f "$f" && ! grep -q "reorder" "$f"` (sortie 1).

### evaluations.md:559 [V] — PAS UN ÉCART

- **Point** : temps de course par défaut 5 min (séance libre) contre 7 min (contrôle).
- **Vu** : `src/lib/components/test/TestModeDialog.svelte:41` `timeLimit = $state(5)` ; `src/lib/types/evaluation.ts:27` « 7 min par défaut (Q30) ». Deux contextes différents (séance libre du panier, contrôle donné par le prof), deux valeurs : cohérent avec la décision Q30. Écart d'usage, pas un défaut. À signaler à David seulement s'il veut un seul défaut.

### evaluations.md:561 [V] — NON VÉRIFIÉ

- **Point** : fenêtre de choix du panier : dépasse un écran bas avec quatre cartes.
- **Vu** : `TestModeDialog.svelte:132` `max-h-[90vh] max-w-3xl overflow-y-auto`, `:141` grille `sm:grid-cols-2`. Le code défile (ne déborde pas), donc le « dépasse » est un défilement voulu. Reste à voir à l'écran sur iPhone paysage (`pnpm voir /automaths/panier`) si le défilement gêne ; pas de serveur de dev autorisé dans ce lot.

### evaluations.md:564 [C] — VRAI

- **Point** : en-têtes de code anglais et anciens (« quiz », « Revision », « assessment »).
- **Vu** : `src/lib/types/test.ts:3,16-17` « test/assessment », « revision/memorization », « Quiz mode » ; `test-mode.svelte.ts` (anglais, « Teacher test mode »). `TestResults.svelte` ne garde que l'URL `/dashboard/student/assessments` (nom d'URL conservé, voir plus bas).
- **Registre** : C · évaluations · en-têtes de fichiers du mode test écrits en anglais avec d'anciens mots (quiz, révision) · preuve : commande `test -f src/lib/types/test.ts && ! grep -qiE "quiz|revision|assessment" src/lib/types/test.ts` (sortie 1). Priorité très faible.

### evaluations.md:566 [C] — PAS UN ÉCART

- **Point** : écrans disent « contrôle » / « observation » mais URL, tables et identifiants gardent « évaluation ».
- **Vu** : `src/routes/(protected)/dashboard/teacher/assessments`, `evaluation-tasks`, tables `evaluations`, `skill_attempts`. Dette de nommage décidée (renommer URL et tables = migration et redirections), consignée dans `docs/systeme/evaluations.md`. Pas un défaut.

### evaluations.md:570 [C] — VRAI

- **Point** : couverture mal rangée (`grades.ts`, `student/reports`).
- **Vu** : `docs/systeme/evaluations.md` en-tête (`couvre:`) liste `src/routes/api/student/reports/**`, `student/reports` et `{…,grades}.ts` ; `docs/systeme/fiches-et-pdf.md:293` parle de `api/student/reports` (signalements de fiches). Le rangement est discutable, doc seulement.
- **Registre** : C · documentation · `grades.ts` et les signalements de fiches sont couverts par la doc des évaluations alors qu'ils relèvent d'autres docs · preuve : à la main.

### conformite/rgpd.md:404 [T] — PAS UN ÉCART

- **Point** : aucun bandeau de consentement cookies (à implémenter si cookies non essentiels).
- **Vu** : preuve à la main. Cookies posés par le code : session Supabase (`src/lib/server/supabase.ts:48`, `src/lib/utils/session-cookies.ts`), maintenance (`src/lib/server/maintenance.ts:251`), élévation admin (`src/routes/api/admin/elevate/+server.ts:165`), OAuth Google (`src/routes/api/google/auth/connect/+server.ts:66-67`) : tous strictement nécessaires. `studentPresenceHandle.ts:15` précise « SANS cookie ». Mesures d'audience : `@vercel/analytics` et `@vercel/speed-insights` injectés dans `src/routes/+layout.svelte:20-34` avec `redactAnalyticsEvent` ; ces outils n'écrivent pas de cookie (à confirmer dans la doc de l'éditeur, non lu ici). Aucun traceur tiers (pas de gtag, plausible, posthog, hotjar, facebook) dans `app.html`, `+layout.svelte`, `package.json`. La phrase de la tournée (`kingdom-tour/views.ts:201`) dit « seulement les cookies strictement nécessaires ». Donc le bandeau n'est pas exigé aujourd'hui. Point de vigilance : le lecteur vidéo (`video-extension.ts`, `VideoDisplay.svelte`) : si un service tiers est intégré (iframe), il peut poser des cookies. Non ouvert ici.

### conformite/violation-de-donnees.md:74 [T] — DOUBLON T15

- **Point** : emplacement du registre des violations à décider (dossier privé des DPA).
- **Vu** : `docs/systeme/conformite/violation-de-donnees.md:70-75`, « Points ouverts (pour David) ». C'est une décision de papier, non lisible dans le code. Couvert par T15 du registre (« procédure de violation de données à valider », DPA rangés dans le Drive de David).

### conformite/violation-de-donnees.md:75 [T] — NON VÉRIFIÉ

- **Point** : la restauration de la prod n'a jamais été jouée.
- **Vu** : `docs/pratiques/procedure-restauration.md:154-165` « Reste à établir avant tout usage sur la prod » : `--linked` jamais exécuté, durée et taille inconnues, Storage et config hors dumps, objets hors `public` non couverts. La doc dit encore la même chose ; ce que fait la prod ne se lit pas dans le dépôt. Demande David et la prod (exécution en local d'une restauration d'une copie de la prod).
- **Registre** (à ajouter si David confirme) : T · RGPD · une perte de données de la prod n'a jamais été réparée en essai (restauration jamais jouée) · preuve : à la main · en attente de David. Proche de T15 mais distinct (T15 parle de la procédure de violation, pas de la restauration).

## Vu en passant

- `src/lib/server/validation/admin.ts:84` : un schéma de courriel existe à côté de `updateUserFieldsSchema` mais n'est pas dans la mise à jour de profil (cohérent avec le point 382, rien à faire).
- `src/routes/(protected)/dashboard/teacher/classes/+page.server.ts:295` : le commentaire « Sunday-Thursday » pour 0-4 est lui-même bizarre (la semaine commence le dimanche à 0, donc 0-4 = dimanche-jeudi) ; à effacer avec le point 380.
- Cahier de texte : la policy élève lit encore `is_published` après l'ADR 0005 ; et `entry_date <= CURRENT_DATE` rend la publication « à date » invisible dans l'interface prof (pas vérifié).
