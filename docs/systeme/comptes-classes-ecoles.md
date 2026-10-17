---
couvre:
  - 'src/routes/api/admin/{add-to-class,annuaire,anti-fraud,class-composition-source,class-students,compose-class,dictionnaire,elevate,exercises,health-stats,remove-from-class,schools,search-users,users,vip-cards}/**'
  - 'src/routes/api/{classes,students}/**'
  - 'src/routes/api/teacher/{classes,send-welcome-email}/**'
  - 'src/routes/api/student/{profile,age-declaration}/**'
  - 'src/routes/(protected)/dashboard/admin/{classes,schools,users,import-students,settings,backup}/**'
  - 'src/routes/(protected)/dashboard/teacher/{classes,students,welcome-email,settings}/**'
  - 'src/routes/(protected)/dashboard/profile/**'
  - 'src/lib/server/{students,staff-directory}.ts'
  - 'src/lib/server/validation/{classes,schools,school-config,admin,backup}.ts'
  - 'src/lib/components/admin/**'
  - 'src/lib/server/admin/**'
  - src/lib/email-templates/welcome.ts
  - 'src/lib/utils/{age-declaration,timezones}.ts'
  - src/lib/components/AgeQuestionDialog.svelte
  - src/lib/components/MyPasswordInput.svelte
  - src/lib/utils/passwordStrength.ts
---

# Comptes, classes et écoles (admin et prof)

> Ce que fait le code qui gère les comptes, les écoles, les classes et leurs élèves : écrans
> d'administration, écrans du professeur, et les quelques routes que l'élève appelle pour son propre
> profil. Les sujets voisins ne sont **pas** recopiés, seulement cités :
> [auth.md](auth.md) (identité, rôles, élévation admin, approbation des comptes, inscription par code
> et activation des élèves pré-importés), [base-de-donnees.md](base-de-donnees.md) (modèle d'accès
> RLS), [serveur.md](serveur.md) (conventions d'un endpoint, tâches planifiées `admin/cron`),
> [consentement-parental.md](conformite/consentement-parental.md) (consentement, délai de grâce,
> remise à zéro de la question d'âge), [rgpd.md](conformite/rgpd.md),
> [rls-echecs-silencieux.md](../pratiques/rls-echecs-silencieux.md). Vocabulaire :
> [CONTEXT.md](../../CONTEXT.md).
>
> Le `couvre:` déborde sur des sous-dossiers décrits ailleurs, cités ici sans détail :
> `api/admin/dictionnaire` → [dictionnaire.md](dictionnaire.md) ; `api/admin/vip-cards`,
> `api/classes/[classId]/gidouilles`, `api/students/[id]/vip-cards` →
> [jeux-et-economie.md](jeux-et-economie.md) ; `api/admin/anti-fraud`,
> `api/teacher/classes/[classId]/anti-fraud` → [srs.md](srs.md) ;
> `api/teacher/classes/[classId]/analytics` et la page `analytics` → [analytique-prof.md](analytique-prof.md) ;
> `api/admin/elevate`, `api/admin/users/[id]/status` → [auth.md](auth.md) ;
> `dashboard/teacher/settings/google` → [outils-prof.md](outils-prof.md) ; `api/admin/health-stats`
> et les widgets admin → [tableaux-de-bord-et-navigation.md](tableaux-de-bord-et-navigation.md).
>
> Vérifié contre le code le 2026-10-13 (commit `4f3eb2b3e`).

## À quoi ça sert

Chiphre suit le **modèle mono-professeur** ([ADR 0002](../adr/0002-mono-professeur-ecole-frontiere-sociale.md)) :

- **un seul professeur** (`role = 'teacher'`), verrouillé en base par le trigger
  `trg_enforce_single_teacher` ;
- **un admin** distinct, que le prof rejoint par **élévation** (`requireAdmin`) ;
- des **élèves** (`role = 'student'`), mineurs.

Deux regroupements, à ne pas confondre (voir [CONTEXT.md](../../CONTEXT.md)) :

- **L'école** (`schools`, `profiles.school_id`) est la **frontière sociale** : un élève n'interagit
  qu'avec les élèves de son école. Elle porte aussi le calendrier : fuseau horaire, semaine de
  classe, années scolaires, trimestres, vacances, grille horaire.
- **La classe** (`classes`, adhésions dans `class_members`) est un **sous-groupe d'organisation**, un
  dossier. Ce n'est **pas** une frontière d'accès pour le prof : il voit tous les élèves, y compris
  ceux qui n'ont aucune classe active (rubrique « Non assignés »).

Ce code permet à l'admin de créer écoles et classes, d'importer des élèves, de composer les classes
d'une nouvelle année, de gérer les comptes et de sauvegarder les exercices. Il permet au prof de
gérer son emploi du temps, les codes d'inscription et le courriel de bienvenue. Il permet à l'élève
de 2nde de répondre une fois à la question d'âge.

## Carte du code

### Admin : écoles

- Page `src/routes/(protected)/dashboard/admin/schools/+page.server.ts` : actions `create`,
  `update`, `delete`, `bulk_create`. Validation `schoolUpsertSchema` (nom, ville, pays requis ;
  adresse, logo, UAI facultatifs) dans `src/lib/server/validation/schools.ts`.
- Recherche dans l'Annuaire de l'éducation nationale : `src/routes/api/admin/annuaire/search/+server.ts`,
  un proxy vers `data.education.gouv.fr` (jeu `fr-en-annuaire-education`). La réponse externe est
  validée par Zod (`annuaireResponseSchema`) avant d'être renvoyée.
- Fuseau horaire et semaine de classe : `src/routes/api/admin/schools/[schoolId]/config/+server.ts`
  (GET, PUT), schéma `updateSchoolConfigSchema` (`src/lib/server/validation/school-config.ts`). La
  semaine est rangée dans `schools.timetable.week_config`. Écran : `src/lib/components/admin/SchoolConfigModal.svelte`,
  avec `TimezoneSelect.svelte` et `WeekConfigEditor.svelte`. Liste des fuseaux :
  `src/lib/utils/timezones.ts` (`ALL_TIMEZONES`, `DEFAULT_TIMEZONE = 'Europe/Paris'`).
- Organisation d'une école (années, trimestres, vacances, grille horaire, duplication d'une année) :
  `src/routes/(protected)/dashboard/admin/schools/[schoolId]/organisation/+page.server.ts`. Les
  schémas viennent de `src/lib/server/validation/academic.ts`, décrit dans
  [cours-et-chapitres.md](cours-et-chapitres.md).

### Admin : classes

- Page `src/routes/(protected)/dashboard/admin/classes/+page.server.ts` : actions `create`,
  `update`, `deactivate`, `activate`. Le code d'inscription est saisi ou tiré par la fonction SQL
  `generate_join_code`.
- **Composer une classe** pour une nouvelle année : page
  `src/routes/(protected)/dashboard/admin/classes/composer/+page.server.ts` (destinations = classes
  actives d'une année non terminée), candidats lus par
  `src/routes/api/admin/class-composition-source/+server.ts`, écriture par
  `src/routes/api/admin/compose-class/+server.ts`, qui appelle la fonction SQL `admin_compose_class`.
- Ajout ou retrait un par un : `src/routes/api/admin/add-to-class/+server.ts`,
  `src/routes/api/admin/remove-from-class/+server.ts`. Retirer **archive** l'adhésion
  (`status = 'archived'`), ne la supprime pas ; ajouter un élève archivé le réactive.

### Admin : comptes et élèves

- Page `src/routes/(protected)/dashboard/admin/users/+page.svelte` (+ `+page.server.ts`). Elle
  appelle : `src/routes/api/admin/search-users/+server.ts` (fonction SQL `search_users_unaccent`,
  3 caractères minimum ; une panne de la fonction rend 500, et l'écran affiche « La recherche a
  échoué » au lieu de « Aucun résultat trouvé » ; de même pour les comptes en attente), `src/routes/api/admin/search-users/pending/+server.ts`,
  `src/routes/api/admin/class-students/+server.ts`, `src/routes/api/admin/users/[id]/+server.ts`
  (PATCH : prénom, nom, rôle, école, `is_test`), `src/routes/api/admin/users/[id]/status/+server.ts`
  (approuver, refuser), et les routes d'adhésion ci-dessus.
- **Import d'élèves** : `src/routes/(protected)/dashboard/admin/import-students/+page.server.ts`,
  action `import`. Les élèves vont dans `pending_students` (avec `class_ids` résolus depuis les
  codes de classe). Chaque élève est validé avant toute écriture (`importedStudentsSchema` :
  courriel, prénom et nom de 100 caractères au plus, 20 codes de classe au plus, 1 000 élèves par
  import) et son niveau est ramené à son code (« 6ème » → `6`, `gradeFlexibleSchema`) ; une erreur
  rend 400 en nommant l'élève (« Élève n° 3 : Courriel invalide »). Une panne de la base pendant l'import rend 500
  (« Impossible de vérifier l'état actuel » si la lecture d'un profil existant échoue), jamais
  « Données invalides », réservé à un JSON illisible. Un élève dont le profil existe déjà est rattaché directement : `school_id`,
  `grade`, adhésions `class_members`. L'activation à la première connexion est décrite dans
  [auth.md](auth.md).
- Schémas Zod de ces écrans : `src/lib/server/validation/admin.ts`. Les actions des classes
  (`adminClassCreateSchema`, `adminClassUpdateSchema`, `adminClassIdSchema`) bornent le nom
  (100 caractères), la description (500), exigent un UUID pour la classe et l'école, un code de
  niveau connu, et un code d'inscription en `[A-Z0-9_-]` de 10 caractères au plus (mis en
  majuscules ; obligatoire en modification, généré par la base s'il est vide à la création).
  L'action `delete` des écoles valide `id` comme l'action `update`.

### Admin : sauvegarde des exercices, réglages

- Page `src/routes/(protected)/dashboard/admin/backup/+page.svelte`. Routes
  `src/routes/api/admin/exercises/backup/+server.ts` (GET : export JSON ou SQL ; POST : restauration)
  et `src/routes/api/admin/exercises/backup-stats/+server.ts`. Logique :
  `src/lib/server/admin/exercise-backup.ts` (`getBackupStats`, `exportBackupJSON`,
  `exportBackupSQL`, `restoreFromBackup`). Format et bornes : `src/lib/server/validation/backup.ts`
  (`BACKUP_FORMAT = 'chiphre-backup'`, 50 Mo au plus, plafond par table dans `MAX_RECORDS`).
  Quatre tables : `exercises`, `exercise_templates`, `exercise_favorites`, `exercise_share_tokens`.
  Ce n'est **pas** une sauvegarde de la base : voir
  [procedure-restauration.md](../pratiques/procedure-restauration.md).
- Page `src/routes/(protected)/dashboard/admin/settings/+page.svelte` : version de l'application et
  numérotation des listes (décrite dans [utilitaires-et-demos.md](utilitaires-et-demos.md)), plus la
  carte de configuration des signalements de bugs.
- `src/lib/components/admin/TypedConfirmDialog.svelte` : boîte de confirmation où l'on tape un mot
  (nom de l'école, `RESTAURER`…). Le serveur revérifie avec `assertTypedConfirmation`
  (`src/lib/server/confirmAction.ts`).

### Professeur

- Page `src/routes/(protected)/dashboard/teacher/classes/+page.server.ts` : liste des classes avec
  élèves (filtrés par le **mode test**), élèves « Non assignés », état du courriel de bienvenue,
  emploi du temps. Actions : `createScheduleEntry`, `updateScheduleEntry`, `deleteScheduleEntry`
  (schémas dans `src/lib/server/validation/classes.ts`), `associateCourse` (Google Classroom),
  `regenerateJoinCode`, `toggleRegistration` (`classes.registration_open`).
- Aides de lecture : `src/lib/server/students.ts`. `getTeacherClassesWithCounts` (fonction SQL
  `get_teacher_classes_with_data`), `getTeacherClassesWithStudents` (fonction SQL
  `get_teacher_classes_with_students`), `getUnassignedStudents`. Toutes lisent la préférence de mode
  test par `getTeacherTestMode` (`src/lib/server/test-mode.ts`).
- Routes JSON des classes : `src/routes/api/classes/+server.ts` et
  `src/routes/api/teacher/classes/+server.ts` (mêmes données, voir Écarts),
  `src/routes/api/classes/[classId]/students/+server.ts`,
  `src/routes/api/classes/[classId]/warnings/+server.ts`.
- **Courriel de bienvenue** : page `src/routes/(protected)/dashboard/teacher/welcome-email/+page.server.ts`
  (aperçu), envoi par `src/routes/api/teacher/send-welcome-email/+server.ts` via Brevo
  (`sendWelcomeEmail` dans `src/lib/server/email/brevo.ts`). Texte unique :
  `src/lib/email-templates/welcome.ts`. Chaque envoi est noté dans `welcome_emails_sent`.
- Journal d'un élève : `src/routes/(protected)/dashboard/teacher/students/[studentId]/journal/+page.server.ts`.

### Élève et tous les comptes

- `src/routes/api/student/profile/+server.ts` : profil de l'élève connecté et ses classes actives
  (lu par `src/lib/stores/studentDashboardCache.svelte.ts`).
- **Question d'âge en 2nde** : `src/lib/components/AgeQuestionDialog.svelte` (monté dans
  `src/routes/(protected)/dashboard/student/+layout.svelte`), règles dans
  `src/lib/utils/age-declaration.ts`, écriture par `src/routes/api/student/age-declaration/+server.ts`.
- **Annuaire du personnel** : `src/lib/server/staff-directory.ts` (`fetchStaffDirectory`,
  `soleTeacher`, `indexStaffById`), sur la fonction SQL `get_staff_directory`. C'est ainsi qu'un
  élève lit le nom et l'avatar du prof.
- Page « Mon profil » : `src/routes/(protected)/dashboard/profile/+page.svelte` (préférences,
  export des données, suppression du compte, déconnexion).
- Champ mot de passe : `src/lib/components/MyPasswordInput.svelte` (afficher/masquer), utilisé par
  les pages de connexion, d'inscription, de nouveau mot de passe et d'élévation. Jauge de force :
  `src/lib/utils/passwordStrength.ts`, **indicative** ; la règle qui fait foi est côté serveur dans
  `src/lib/server/passwordPolicy.ts` (voir [auth.md](auth.md)).

## Invariants

### Qui peut faire quoi

- **Pages admin** : `src/routes/(protected)/dashboard/admin/+layout.server.ts` laisse passer l'admin
  ou l'élévation active, renvoie le prof non élevé vers `/dashboard/elevate`, refuse les autres en 403. Exception : `/dashboard/admin/users` (et `friendships`) restent ouvertes au prof.
- **Chaque action et chaque route** refait sa propre garde : un formulaire ne passe pas par le
  layout. `requireAdmin` (`src/lib/server/middleware/auth.ts`) rend le client d'élévation
  (`locals.adminSupabase`) si l'élévation est active, sinon le client de l'admin connecté, sinon 403.
- **Prof ou admin** (`requireRoles`) : approbation des comptes, liste des comptes en attente,
  avertissements, journal d'un élève. **Prof seul** (`requireRole(locals, 'teacher')`) : courriel de
  bienvenue, codes d'inscription, `api/classes`.
- `verifyTeacherStudent` (`src/lib/server/middleware/student-access.ts`) vérifie seulement que
  l'appelant est prof ou admin et que la cible est un élève : la classe n'est pas une frontière.

### Le professeur unique

- Promouvoir un compte en prof : `api/admin/users/[id]` vérifie
  qu'aucun autre prof n'existe ; la base a le dernier mot (`trg_enforce_single_teacher`, et
  `guard_profile_role_change` sur le changement de rôle).
- `is_test` (élève de test) n'est modifiable que par l'admin : la base le refuse au prof, et
  `api/admin/users/[id]/status` renvoie un 403 clair au prof non élevé qui essaie.

### Écoles et classes

- **Changer d'école se consent.** Inscrire un élève dans une classe d'une autre école déplace son
  profil (`profiles.school_id`), donc ses trimestres, son calendrier et son marché. `compose-class`
  refuse en 409 sans `confirmSchoolChange: true` et dit combien d'élèves sont concernés.
  L'inscription et le déplacement se font **ensemble** dans `admin_compose_class`.
- On ne compose pas dans une classe archivée ni dans une année terminée (409). Au plus 200 élèves
  par appel (`composeClassSchema`).
- Les candidats à la composition viennent des classes des **autres** années, **toutes écoles
  confondues** ; un élève déjà membre de la destination est montré, marqué `already_member`.
- `profiles.class_ids` est une copie des adhésions **actives**, tenue par le trigger
  `sync_class_members_to_class_ids`. À l'insertion d'une adhésion, ce trigger recopie aussi le
  niveau de la classe dans `profiles.grade`. La source de vérité reste `class_members`.
- Une école qui a encore des comptes ne se supprime pas : l'action `delete` refuse, et exige de taper
  le nom de l'école.
- La semaine d'une école doit couvrir les 7 jours sans chevauchement (`isValidWeekConfig`) ; le
  fuseau doit appartenir à `ALL_TIMEZONES`.

### Données d'élèves mineurs

- **Âge** : la question n'est posée qu'à un élève de 2nde (`AGE_QUESTION_GRADE = '2'`), sans
  réponse, encore soumis au consentement (`shouldAskAgeQuestion`). On enregistre la **réponse** et sa
  date (`age_declaration`, `age_declared_at`), jamais l'âge. Une seule réponse : 409 ensuite.
- « Oui » → `15_plus` et `consent_required = false`. « Non » → `under_15`, `consent_required = true`,
  et un délai de grâce de 30 jours s'ouvre si aucun consentement ni délai n'est en cours.
- Ces champs sont écrits par le **client service** (`createServiceRoleClient`) : la base refuse à
  l'élève de les écrire lui-même (`guard_profile_consent_fields`). La route relit le profil côté
  serveur, filtre `.is('age_declaration', null)` contre les doubles réponses, et vérifie qu'une ligne
  a bien été écrite.
- **Annuaire du personnel** : `get_staff_directory` rend six colonnes (id, prénom, nom, nom complet,
  avatar, rôle), **jamais l'e-mail**. Une fonction plutôt qu'une policy, parce que la RLS filtre des
  lignes, pas des colonnes. En cas de panne, `fetchStaffDirectory` rend une liste vide.
- **Mode test** : les listes du prof montrent soit les élèves de test, soit les vrais, jamais les
  deux.
- **Courriel de bienvenue** : envoyé par Brevo depuis l'expéditeur de la plateforme ; le prof est en
  `Reply-To`. Aucun jeton Gmail du prof n'est nécessaire. 503 si Brevo n'est pas configuré.
- **Import d'élèves** : réservé à l'admin. Les e-mails sont mis en minuscules ; les codes de classe
  inconnus sont ignorés sans message.
- **Sauvegarde** : le fichier exporté contient des e-mails (auteurs des exercices, comptes qui ont
  mis un favori). La restauration exige de taper `RESTAURER`, refuse un fichier de plus de 50 Mo,
  valide tout le fichier par Zod, puis écrit table par table (`skip` ou `replace` en cas de conflit).
  Un enregistrement dont l'auteur n'existe plus est ignoré, ou rattaché à l'admin si
  `reassign_orphans_to_admin` est coché. Réponse 207 dès qu'un enregistrement a produit une erreur
  (un auteur introuvable compte).

### Validation

- Les routes JSON de la zone valident leurs entrées par Zod (`safeParse`, puis 400 avec le premier
  message). Les schémas des écrans admin sont dans `validation/admin.ts`, ceux des écoles dans
  `validation/schools.ts` et `validation/school-config.ts`, ceux des créneaux dans
  `validation/classes.ts`. Exceptions : voir Écarts connus.

## Comment étendre

- **Nouvelle route admin** : la placer sous `src/routes/api/admin/`, appeler `requireAdmin(locals)`
  en premier et utiliser le `supabase` qu'il rend (il porte l'élévation). Valider par Zod. Les
  conventions générales sont dans [serveur.md](serveur.md).
- **Nouvelle page admin ouverte au prof** : l'ajouter à `TEACHER_ALLOWED_PREFIXES` dans
  `src/routes/(protected)/dashboard/admin/+layout.server.ts`, **et** garder la page elle-même
  (`requireRoles`).
- **Écriture** (`.update()`, `.delete()`) : ajouter `.select()` et vérifier les lignes rendues, sinon
  un refus RLS passe pour un succès ([rls-echecs-silencieux.md](../pratiques/rls-echecs-silencieux.md)).
  Modèle : les actions de créneau de `dashboard/teacher/classes`, et la route `age-declaration`.
- **Lister des élèves pour le prof** : passer par `src/lib/server/students.ts` pour hériter du filtre
  de mode test.
- **Afficher le nom du prof à un élève** : `fetchStaffDirectory` + `soleTeacher`, jamais
  `.from('profiles').eq('role', 'teacher')`, qui rend vide pour un élève sans erreur.
- **Toucher à l'école d'un élève** : passer par `admin_compose_class` ou garder le consentement
  explicite ; un élève dont l'école diffère de celle de sa classe est à moitié cassé.
- **Nouvelle colonne d'exercice** : l'ajouter à `exerciseBackupRecordSchema`, en `.optional()` pour
  relire les anciennes sauvegardes (exemple : `search_indexed`).
- **Toute policy ou fonction SQL** : question d'accès d'abord, puis test d'intégration (voir
  CLAUDE.md, § Migrations).

## Tests

Unitaires (mocks Supabase) :

- `src/routes/api/admin/compose-class/__tests__/server.test.ts` : refus du changement d'école non
  consenti, classe archivée, année terminée, non-élèves refusés, appel de `admin_compose_class`.
- `src/routes/api/admin/class-composition-source/__tests__/server.test.ts` : candidats lus même
  quand leurs adhésions sont archivées (après clôture d'année) ; membres déjà inscrits marqués.
- `src/routes/api/admin/schools/[schoolId]/config/__tests__/config.test.ts` : garde, validation,
  écriture de la configuration.
- `src/routes/api/admin/users/[id]/status/__tests__/is-test.test.ts` : `is_test` refusé au prof non
  élevé, client admin en élévation.
- `src/routes/api/admin/users/[id]/status/__tests__/notification-prof.test.ts` : le professeur
  est prévenu d'un élève approuvé déjà inscrit en classe, sans lire `classes.teacher_id` (supprimée).
- `src/routes/api/student/age-declaration/__tests__/age-declaration.test.ts` : Oui, Non et délai de
  grâce, 409, 403 hors 2nde, écriture par le client service avec `.select()`.
- `src/routes/(protected)/dashboard/teacher/classes/__tests__/schedule-write-verdict.test.ts` : une
  écriture de créneau qui ne touche aucune ligne n'annonce pas un succès ; même règle pour
  `regenerateJoinCode` et `toggleRegistration` dans `class-write-verdict.test.ts` (même dossier).
- `src/routes/api/admin/remove-from-class/__tests__/write-verdict.test.ts` (404 sans inscription
  archivée), `src/routes/(protected)/dashboard/admin/classes/__tests__/write-verdict.test.ts`
  (`update`, `deactivate`, `activate`) et
  `src/routes/(protected)/dashboard/admin/schools/__tests__/write-verdict.test.ts` (`delete`) :
  zéro ligne touchée n'annonce pas un succès.
- `src/lib/server/admin/__tests__/exercise-backup.test.ts` : validation et restauration.
- `src/lib/components/admin/__tests__/SchoolConfigModal.svelte.test.ts` (la semaine enregistrée est
  bien chargée, malgré les proxys `$state`) et `WeekConfigEditor.svelte.test.ts` (les préréglages
  changent aussi premier et dernier jour).
- Validation : `src/lib/server/validation/__tests__/admin.test.ts`, `schools.test.ts`,
  `school-config.test.ts`, `misc-modules.test.ts` ; utilitaires :
  `src/lib/utils/__tests__/age-declaration.test.ts`, `src/lib/utils/__tests__/timezones.test.ts` ;
  garde : `src/lib/server/middleware/__tests__/requireAdmin.test.ts`.

Intégration (base locale, `pnpm test:integration`) :

- `tests/integration/admin-compose-class.test.ts` : inscription et changement d'école ensemble.
- `tests/integration/annuaire-personnel.test.ts` : l'annuaire ne rend pas l'e-mail.
- `tests/integration/profiles-class-ids-scope.test.ts` : `class_ids` ne concerne que les élèves.
- `tests/integration/single-teacher-rls.test.ts`, `tests/integration/mono-teacher-class-cluster-rls.test.ts` :
  le prof unique voit tous les élèves, la classe n'est plus une frontière.
- `tests/integration/security-join-code.test.ts` : entropie de `generate_join_code`.
- `tests/integration/class-membership-side-effects.test.ts` : quitter une classe fait aussi quitter
  son salon et ses cartes.
- `tests/integration/profil-is-test-bonus.test.ts`, `tests/integration/consentement-champs-profil.test.ts` :
  champs du profil verrouillés pour l'élève.

Validation des entrées (400 avant toute requête, puis écriture normalisée) :
`src/routes/(protected)/dashboard/admin/{classes,schools,import-students}/__tests__/validation-entrees.test.ts`.
Panne du serveur pendant l'import : `import-students/__tests__/panne-serveur.test.ts`.
Panne de la recherche d'utilisateurs : `src/routes/api/admin/search-users/__tests__/panne.test.ts`.
Aucun test trouvé pour : le reste de l'import d'élèves (profil existant, doublons), l'envoi du
courriel de bienvenue, `add-to-class` et `remove-from-class`.

## Décisions

- [ADR 0002](../adr/0002-mono-professeur-ecole-frontiere-sociale.md) : un seul prof, admin par
  élévation, classe = dossier, école = frontière sociale.
- [ADR 0003](../adr/0003-donnees-hebergees-en-ue.md) : données hébergées en UE.
- [ADR 0005](../adr/0005-publication-par-element-acces-herite-de-la-classe.md) : l'accès d'un élève
  aux contenus publiés suit ses adhésions de classe.

## Écarts connus

Constatés le 2026-10-13, **non corrigés**.

- **Code mort retiré le 2026-10-13** : fonctions, schémas, widget, action `update_profile` et
  routes `api/students/[id]/warnings` et `api/admin/pending-users`, sans appelant. Reste
  `restoreOptionsSchema`, utilisé seulement via `validateRestoreOptions`.
- **Doublons** : `api/classes` et `api/teacher/classes` rendent les mêmes classes.
- **Commentaires faux ou périmés** :
  - `dashboard/teacher/classes/+page.server.ts` dit que `day_of_week` est borné à 0-4 ; le schéma
    accepte 0-6.
  - L'en-tête de `PATCH api/admin/users/[id]` liste `email` parmi les champs modifiables ; le schéma
    ne l'accepte pas.
  - `class-composition-source` annonce « les élèves des AUTRES années scolaires de la même école »,
    puis dit que la portée franchit les écoles ; le code ne filtre pas sur l'école.
  - `send-welcome-email` et la page `welcome-email` disent vérifier que le prof « enseigne » à
    l'élève ; `verifyTeacherStudent` vérifie seulement les rôles.
  - `dashboard/admin/users/+page.server.ts` dit que le prof ne voit que les comptes en attente
    « à cause de la RLS » ; en mono-prof, il voit tous les élèves. À revérifier.
- **`/api/classes/[classId]/students`** valide `classId` avec `getClassGidouillesSchema` (le schéma
  d'une autre route).
- **`bulk_create` des écoles** force `uai: ''` : un import en masse n'enregistre jamais d'UAI.
