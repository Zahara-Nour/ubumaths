---
couvre:
  - 'src/routes/api/admin/{add-to-class,annuaire,anti-fraud,class-composition-source,class-students,compose-class,dictionnaire,elevate,exercises,health-stats,remove-from-class,schools,search-users,users,vip-cards}/**'
  - 'src/routes/api/{classes,students}/**'
  - 'src/routes/api/teacher/{classes,send-welcome-email}/**'
  - 'src/routes/api/student/{profile,age-declaration}/**'
  - 'src/routes/(protected)/dashboard/admin/{classes,schools,users,import-students,settings,backup,cours-particuliers}/**'
  - 'src/lib/server/private-lessons/**'
  - src/lib/server/validation/private-lessons.ts
  - src/lib/email-templates/private-lesson-invitation.ts
  - src/lib/email-templates/private-lesson-welcome.ts
  - src/routes/api/cron/invitations-cours-particulier/**
  - 'src/routes/(protected)/dashboard/teacher/{classes,students,welcome-email,settings}/**'
  - 'src/routes/(protected)/dashboard/profile/**'
  - 'src/lib/server/{students,staff-directory,school-year-errors}.ts'
  - 'src/lib/server/validation/{classes,schools,school-config,admin,backup}.ts'
  - 'src/lib/components/admin/**'
  - 'src/lib/server/admin/**'
  - src/lib/email-templates/welcome.ts
  - src/lib/utils/welcome-email-state.ts
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
> la page `classes/[classId]/carnet` et le bouton « Carnet de liaison » de la liste des classes →
> [carnet-de-liaison.md](carnet-de-liaison.md) ;
> `api/admin/elevate`, `api/admin/users/[id]/status`, `api/admin/users/[id]/password` → [auth.md](auth.md) ;
> `dashboard/teacher/settings/google` → [outils-prof.md](outils-prof.md) ; `api/admin/health-stats`
> et les widgets admin → [tableaux-de-bord-et-navigation.md](tableaux-de-bord-et-navigation.md).
>
> Vérifié contre le code le 2026-10-13 (commit `4f3eb2b3e`) ; mot de passe d'un élève (panneau
> admin, profil) le 2026-10-21.

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
  [cours-et-chapitres.md](cours-et-chapitres.md). Un doublon refusé par la base (nom déjà pris,
  `unique_school_year` ; autre année déjà active, `idx_one_active_year_per_school`) rend un 409 au
  message clair, via `schoolYearConflictMessage` (`src/lib/server/school-year-errors.ts`), dans
  les actions qui créent, modifient ou dupliquent une année.

### Admin : classes

- Page `src/routes/(protected)/dashboard/admin/classes/+page.server.ts` : actions `create`,
  `update`, `deactivate`, `activate`. Le code d'inscription est saisi ou tiré par la fonction SQL
  `generate_join_code`. À la création, la classe prend l'**année active de son école**
  (`school_year_id`) ; une école sans année active donne une classe sans année et un avertissement
  à l'admin, une classe sans école reste sans année. `update` ne touche pas à l'année.
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
  (approuver, refuser), et les routes d'adhésion ci-dessus. Pour un élève approuvé, le panneau
  porte « Réinitialiser le mot de passe » (`src/lib/components/admin/StudentPasswordReset.svelte`
  → `src/routes/api/admin/users/[id]/password/+server.ts`) : mot de passe provisoire affiché une
  fois, à changer à la connexion suivante ([auth.md § Mots de passe des élèves](auth.md#mots-de-passe-des-élèves)).
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

### Admin : cours particuliers

Chantier `invitation-cours-particulier` ([journal](../wip/invitation-cours-particulier-progress.md)) :
l'admin invite un élève de moins de 15 ans sans code de classe ; le parent reçoit un lien qui crée
le compte et la classe (page du lien : § « Page du parent » ci-dessous). Table et accès :
[base-de-donnees.md § Cours particuliers](base-de-donnees.md).

- Page `src/routes/(protected)/dashboard/admin/cours-particuliers/+page.svelte` (+ `+page.server.ts`),
  entrée « Cours particuliers » du menu admin. `requireAdmin` à chaque chargement et chaque action.
  L'école est **toujours** celle du réglage `schools.is_private_lessons` (Akadada), relue par le
  serveur ; le formulaire n'en envoie aucune. Sans année scolaire commencée (`current_school_year`),
  l'écran le dit et l'envoi est refusé (409).
- Actions `invite` (prénom, adresse du parent, niveau), `resend`, `cancel`. Schémas :
  `src/lib/server/validation/private-lessons.ts` — mêmes règles de prénom et d'adresse que
  l'inscription par le parent (`childFirstnameSchema`, `parentContactEmailSchema` de
  `validation/auth.ts`), adresse au format de la contrainte de la base, niveau en code
  (`'5'`, pas `'5e'`).
- Écritures : `src/lib/server/private-lessons/invitations.ts`, en `service_role` après la garde
  (la base n'ouvre aucune écriture aux comptes connectés). Jeton de 32 octets (base64url), seul son
  sha256 est en base. `email_sent_at` et `sent_count` ne bougent que si Brevo accepte le courriel :
  un refus laisse l'invitation dans la liste, « Courriel non parti », à renvoyer. La liste montre
  les invitations ni utilisées ni annulées ; une expirée y reste jusqu'à sa purge et peut être
  renvoyée.
- **Inviter** : refusé si une invitation ouverte existe déjà pour le même prénom (sans tenir compte
  de la casse) et la même adresse — on passe par « Renvoyer ».
- **Renvoyer** : nouvelle empreinte et 7 jours neufs, l'ancien lien ne s'ouvre plus. Refusé après
  usage ou annulation, pendant une réservation de moins de 5 minutes (parent en train de créer le
  compte), ou après 5 courriels. L'écriture est gardée par l'empreinte lue : de deux clics
  simultanés, un seul passe et un seul courriel part ; l'autre lit « L'invitation vient de
  changer : réessayez ». ⚠️ Assumé (décision 9) : si Brevo refuse le courriel d'un renvoi, l'ancien
  lien est déjà mort ; la liste affiche « Courriel non parti » et l'admin renvoie.
- **Annuler** : refusé pendant une réservation de moins de 5 minutes (la création du compte
  échouerait à sa dernière étape).
- **Limite de débit** : 20 « Inviter » ou « Renvoyer » par heure et par admin
  (`checkPrivateLessonInvitationRateLimit`, `src/lib/server/rateLimiter.ts`, fermée en cas de panne) :
  le quota de Brevo (300 courriels par jour) sert aussi aux consentements et au carnet.
- Courriel : `src/lib/email-templates/private-lesson-invitation.ts` (« Créez l'espace de <prénom>
  sur Chiphre »), envoyé par `sendPrivateLessonInvitationEmail` (`src/lib/server/email/brevo.ts`).
  Lien `https://www.chiph.re/auth/register/invitation/<jeton>`.
- **Purge à 30 jours** (décision 8 de David, 2026-11-25) : `purgeEndedInvitations` efface les
  invitations utilisées, annulées ou expirées depuis plus de 30 jours (date d'utilisation,
  d'annulation, sinon d'expiration). Cron Vercel quotidien `src/routes/api/cron/invitations-cours-particulier/+server.ts`
  (`vercel.json`, 3 h 30 UTC), lançable depuis `/dashboard/admin/cron` ; journal
  `background_job_runs` (job `private_lesson_invitations_purge`), nombres seulement.
- **Page du parent** `src/routes/(public)/auth/register/invitation/[token]/` (publique, sans
  session ; décrite aussi dans [auth.md](auth.md#invitation-de-cours-particulier-authregisterinvitationtoken)).
  `load` lit l'invitation par `get_private_lesson_invitation` (service role) : prénom, niveau,
  école, échéance ; jamais l'adresse du parent. Lien mal formé, inconnu, expiré, annulé ou utilisé :
  la même page « Ce lien n'est plus valable », rien de révélé. Formulaire
  (`privateLessonRedeemFormSchema`) : mot de passe deux fois, case CGU, case consentement ; le
  prénom n'est pas un champ. Limite par IP des inscriptions (`checkSignupRateLimitByIP`) sur
  l'action `create`.
- **Création** : `redeemInvitation` (`src/lib/server/private-lessons/redeem.ts`), en service role.
  1. **Réservation** : `claimed_at` posé par un `update` gardé (empreinte du lien, ni utilisée ni
     annulée, pas expirée, réservation absente ou de plus de 5 minutes). De deux validations
     simultanées, une seule réserve ; l'autre lit « déjà en cours de création » (409).
  2. **Compte** par `createChildAuthUser` (`src/lib/server/child-registration.ts`, identifiant
     `prenom` + 3 chiffres, domaine fictif), **sans** code de classe : `handle_new_user` le crée en
     attente, puis le serveur le passe `approved` avec l'école et le niveau de l'invitation.
  3. **Classe** nommée d'après l'identifiant en majuscules (`JADE123`), école et niveau de
     l'invitation, année en cours (`current_school_year`), `registration_open = false`, code tiré
     par `generate_join_code` ; l'enfant y est inscrit (`class_members`).
  4. **CGU** (`terms_acceptances`), puis **consentement** : demande `parental_consents` à l'adresse
     de l'invitation, accordée aussitôt par `grant_parental_consent` avec l'IP et le navigateur de
     la requête ([conformite/consentement-parental.md](conformite/consentement-parental.md)).
  5. **Invitation utilisée** : `used_at`, `student_id` et `class_id` ensemble, gardés sur NOTRE
     `claimed_at` et `cancelled_at is null`. Une annulation passée entre-temps (l'admin est refusé
     pendant une réservation, mais une réservation périmée ne le retient plus) fait échouer la
     création.
  6. **Courriel final** au parent (`sendPrivateLessonWelcomeEmail`,
     `src/lib/email-templates/private-lesson-welcome.ts`) : identifiant et adresse de connexion. Son
     échec n'annule rien ; l'écran affiche l'identifiant dans tous les cas.

  Échec à une étape 2 à 5 : la classe puis le compte sont supprimés (le profil, l'adhésion, les CGU
  et le consentement partent avec le compte), la réservation est retirée, le lien reste valable
  (« Réessayez dans un instant »). École sans année en cours : même chose. Défait **en partie**
  (suppression de la classe ou du compte en échec) : la réservation n'est pas retirée (le lien
  reste bloqué 5 minutes) et le journal nomme compte et classe « à retirer » à la main.

- **Limites connues** (revues de la PR 3, 2026-11-25) :
  - une fonction tuée en route (délai de Vercel, crash) entre le compte et `used_at` laisse un
    compte approuvé et une classe ; la réservation se périme au bout de 5 minutes et un nouvel
    essai crée un second compte. L'orphelin est supprimé la nuit suivante (§ « Comptes
    orphelins », PR 4) ;
  - les journaux de requêtes de Vercel gardent le chemin, donc le jeton (comme `/carnet/[token]`) ;
  - pas de repli sans JavaScript : avec `no-referrer`, un POST de formulaire natif part avec
    `Origin: null` et la garde CSRF le refuse ; `use:enhance` envoie la vraie origine.

- **Comptes orphelins** (PR 4, décision de David du 2026-11-25 : suppression automatique) :
  `src/lib/server/private-lessons/orphans.ts`. À la création, `redeemInvitation` pose sur le
  compte la marque serveur `app_metadata.private_lesson_invitation_id` (`INVITATION_MARK`, par
  `createChildAuthUser`) ; elle tombe au succès (`clearInvitationMark`). Le cron de nuit des
  invitations appelle ensuite `cleanupOrphanAccounts` : chaque compte encore marqué depuis plus
  d'une heure (`auth.admin.listUsers`, toutes les pages) est regardé.
  - invitation utilisée par CE compte → succès dont la marque n'est pas tombée : marque retirée ;
  - invitation présente, pas utilisée par lui, compte jamais connecté → **orphelin** : sa classe
    puis son compte sont supprimés. La classe visée : même nom que l'identifiant, même école,
    inscriptions fermées, née après le compte, et dont il est le seul élève (ou sans élève, née
    dans l'heure qui suit le compte). Une classe plus ancienne de même nom (identifiant libéré
    puis redonné) n'est jamais touchée. Classe non supprimée → le compte reste marqué, la nuit
    suivante recommence ;
  - compte déjà connecté, ou invitation disparue (purgée) → gardé, journalisé « à vérifier ».

  Seuls les comptes marqués sont regardés : aucun autre élève ne peut être supprimé par ce
  nettoyage. Un compte en échec n'arrête pas les suivants. Le cron lance le nettoyage puis la
  purge, indépendants : l'échec de l'un n'empêche pas l'autre, le passage est alors noté
  `failed` avec le rapport partiel. Le rapport (`checked`, `cleared`, `deleted`, `kept`,
  `failed`) va dans `background_job_runs` (clé `orphans`), sans prénom ni adresse.

- **Réponse perdue à l'étape 5** de `redeemInvitation` (erreur réseau après l'écriture) :
  l'invitation est relue avant de rien défaire ; si elle désigne déjà le compte, c'est un succès
  (défaire effacerait l'invitation avec le compte, cascade).
- Tests : `tests/integration/invitations-cours-particuliers-orphelins.test.ts` (succès : marque
  retirée ; orphelin de plus d'une heure supprimé avec sa classe ; de moins d'une heure, connecté,
  invitation disparue, non marqué : gardés ; classe partagée gardée),
  `tests/integration/invitations-cours-particuliers-parent.test.ts` (création complète,
  double validation, liens plus valables, réservation récente ou périmée, annulation pendant la
  création, école sans année, courriel final refusé, sur la vraie base),
  `src/routes/(public)/auth/register/invitation/[token]/__tests__/page.server.test.ts`,
  `tests/integration/invitations-cours-particuliers-envoi.test.ts` (écritures, doublon,
  renvoi et renvois simultanés, annulation, purge, sur la vraie base),
  `src/routes/(protected)/dashboard/admin/cours-particuliers/__tests__/garde.test.ts` (prof non
  élevé et élève refusés avant tout envoi, limite de débit), `src/lib/server/validation/__tests__/private-lessons.test.ts`,
  `src/lib/email-templates/__tests__/private-lesson-invitation.test.ts`,
  `src/routes/api/cron/invitations-cours-particulier/__tests__/route.test.ts`.

### Admin : sauvegarde des exercices, réglages

- Page `src/routes/(protected)/dashboard/admin/backup/+page.svelte`. Routes
  `src/routes/api/admin/exercises/backup/+server.ts` (GET : export JSON ou SQL ; POST : restauration)
  et `src/routes/api/admin/exercises/backup-stats/+server.ts`. Logique :
  `src/lib/server/admin/exercise-backup.ts` (`getBackupStats`, `exportBackupJSON`,
  `exportBackupSQL`, `restoreFromBackup`). Format et bornes : `src/lib/server/validation/backup.ts`
  (`BACKUP_FORMAT = 'chiphre-backup'`, 50 Mo au plus, plafond par table dans `MAX_RECORDS`).
  Quatre tables : `exercises`, `exercise_templates`, `exercise_favorites`, `exercise_share_tokens`.
  Le titre anglais (`exercises.translations`) est sauvegardé et restauré ; une sauvegarde antérieure
  à la colonne ne l'efface pas à la restauration. Les versions d'un exercice (ADR 0044) suivent
  dans `versions` (export JSON et SQL) ; le contenu de premier niveau est celui de la dernière (il
  ne s'écrit jamais sur la ligne d'`exercises`, qui n'a plus de colonnes de contenu). À la
  restauration, chaque version est écrite par numéro (une version plus récente que la sauvegarde
  reste ; deux versions au même numéro → fichier refusé). Une sauvegarde sans `versions` devient la
  version 1 d'un exercice qui n'en a pas ; sur un exercice qui en a déjà, elle devient une
  **nouvelle** version (note « Restaurée depuis une sauvegarde antérieure aux versions »), jamais la
  v1 qu'une fiche peut pointer, et rien si son contenu est déjà celui de la dernière. Un exercice
  sans version (incohérence) est exporté sans contenu, avec `versions: []`, au lieu d'interrompre
  l'export.
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
- Routes JSON des classes : `src/routes/api/teacher/classes/+server.ts` (les classes du prof,
  avec leurs effectifs),
  `src/routes/api/classes/[classId]/students/+server.ts`,
  `src/routes/api/classes/[classId]/warnings/+server.ts`.
- **Courriel de bienvenue** : page `src/routes/(protected)/dashboard/teacher/welcome-email/+page.server.ts`
  (aperçu), envoi par `src/routes/api/teacher/send-welcome-email/+server.ts` via Brevo
  (`sendWelcomeEmail` dans `src/lib/server/email/brevo.ts`). Texte unique :
  `src/lib/email-templates/welcome.ts`. Chaque envoi est noté dans `welcome_emails_sent`.
  **Enfant inscrit par son parent** (adresse fictive du domaine `CHILD_ACCOUNT_DOMAIN`) : jamais de
  courriel de bienvenue. Dans la liste des classes, `welcomeEmailState`
  (`src/lib/utils/welcome-email-state.ts`) affiche son identifiant et un bouton « Lien au parent »
  vers `dashboard/teacher/consent` ; la page d'aperçu redirige (303) vers cette même page.
  L'en-tête de « Mes classes » porte aussi un lien « Consentements parentaux », seul accès à cette
  page depuis l'interface.
- **Suivi d'un élève** : `src/routes/(protected)/dashboard/teacher/students/[studentId]/` — dans la liste
  des classes, le nom de l'élève (en classe et « Non assignés ») y mène, comme le nom dans la grille A de
  l'analytique ; voir
  [analytique-prof.md](analytique-prof.md#suivi-dun-élève-page-à-part).
- Journal d'un élève (récompenses) : `src/routes/(protected)/dashboard/teacher/students/[studentId]/journal/+page.server.ts`,
  ouvert par l'icône à côté du nom ou depuis le suivi (`?depuis=suivi`, retour vers le suivi).
- Chatterie d'un élève (lecture seule) : `src/routes/(protected)/dashboard/teacher/students/[studentId]/chatterie/`,
  même garde que le journal (`verifyTeacherStudentWithRole`) ; voir [mathoux.md](mathoux.md#vue-du-professeur).

### Élève et tous les comptes

- **Question d'âge en 2nde** : `src/lib/components/AgeQuestionDialog.svelte` (monté dans
  `src/routes/(protected)/dashboard/student/+layout.svelte`), règles dans
  `src/lib/utils/age-declaration.ts`, écriture par `src/routes/api/student/age-declaration/+server.ts`.
- **Annuaire du personnel** : `src/lib/server/staff-directory.ts` (`fetchStaffDirectory`,
  `soleTeacher`, `indexStaffById`), sur la fonction SQL `get_staff_directory`. C'est ainsi qu'un
  élève lit le nom et l'avatar du prof.
- Page « Mon profil » : `src/routes/(protected)/dashboard/profile/+page.svelte` (pour un élève, la
  boutique d'avatars, voir [jeux-et-economie.md](jeux-et-economie.md) ; préférences,
  « Changer mon mot de passe » → `/auth/update-password?depuis=profil`, export des données,
  suppression du compte, déconnexion). Pour un enfant inscrit par son parent, elle affiche
  « Identifiant : noelie042 » au lieu de l'adresse fictive (`childLoginIdOf`).
- Champ mot de passe : `src/lib/components/MyPasswordInput.svelte` (afficher/masquer), utilisé par
  les pages de connexion, d'inscription, de nouveau mot de passe (dont celle du lien du parent) et d'élévation. Jauge de force :
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
  bienvenue, codes d'inscription, `api/teacher/classes`, suivi d'un élève.
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
  `validation/classes.ts`. Exceptions : voir Écarts connus, qui renvoie au registre.

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

Les écarts de cette zone sont au [registre des écarts](../ecarts/registre.md) : `pnpm ecarts`. Un écart s'écrit là-bas, jamais ici.

### À savoir (voulu)

- `restoreOptionsSchema` n'est utilisé que via `validateRestoreOptions` (schéma encapsulé par sa fonction).
- **`bulk_create` des écoles** force `uai: ''` : un import en masse n'enregistre jamais d'UAI. Le
  collage tableur n'a pas de colonne UAI, l'UAI se règle à l'unité (formulaire simple, Annuaire).
