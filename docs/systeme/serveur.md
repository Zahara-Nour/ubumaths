---
couvre:
  - src/hooks.server.ts
  - 'src/lib/server/*.ts'
  - 'src/lib/server/middleware/**'
  - 'src/lib/server/utils/**'
  - 'src/lib/server/validation/{index,common,params,response-utils,cron}.ts'
  - 'src/lib/utils/{form-action,logger}.ts'
  - 'src/routes/(protected)/dashboard/admin/cron/**'
  - 'src/routes/api/admin/cron/**'
---

# Le serveur : conventions et index de `src/lib/server/`

> Ce que fait le code serveur (endpoints `+server.ts`, actions de formulaire, `src/lib/server/`) et où le trouver.
> Les sujets déjà documentés ne sont **pas** recopiés ici, seulement cités : [auth.md](auth.md) (identité, rôles, élévation, service role), [base-de-donnees.md](base-de-donnees.md) (modèle d'accès RLS), [rls-echecs-silencieux.md](../pratiques/rls-echecs-silencieux.md), [qualite.md](../pratiques/qualite.md) (Zod), [observabilite-erreurs-prod.md](../pratiques/observabilite-erreurs-prod.md).
>
> Vérifié contre le code le 2026-10-10 (commit `f39529abd`).

## À quoi ça sert

`src/routes/api/` compte **380 endpoints** (`+server.ts`) et `src/routes/` **45 fichiers `+page.server.ts` avec des actions**. La logique qu'ils partagent vit dans `src/lib/server/` : **89 entrées** à plat (23 dossiers, 66 fichiers), sans index jusqu'ici. Ce fichier donne (1) les conventions qu'un endpoint suit, avec le fichier qui les implémente, (2) l'index des modules, (3) les tâches planifiées, (4) les écarts connus.

Vocabulaire du domaine : [CONTEXT.md](../../CONTEXT.md). Vue d'ensemble des routes : [architecture-generale.md](architecture-generale.md).

---

## 1. Conventions d'un endpoint et d'une action

Avant tout handler, `src/hooks.server.ts` a déjà tourné : `handle = sequence(requestIdHandle, maintenanceHandle, supabaseHandle, redirectHandle, userProfileHandle, adminElevationHandle, csrfHandle, securityHeadersHandle, errorMonitoringHandle)`. Le détail de la chaîne est dans [auth.md § La chaîne de handles](auth.md#la-chaîne-de-handles) ; un endpoint reçoit `locals.user`, `locals.profile`, `locals.supabase` (et `locals.adminSupabase` si élévation).

Ordre d'un handler, tel que le code le pratique (exemple réel : `src/routes/api/admin/cron/trigger/+server.ts`) :

1. **garde d'identité** → 2. **validation Zod** (paramètres, query, corps) → 3. **contrôle métier** (le prof possède-t-il la classe ? consentement ?) → 4. **requête** avec le client de l'appelant → 5. **erreur assainie** ou `json(...)`.

### 1.1 Authentification et rôle

| Besoin                                                  | Fonction                                                             | Fichier                                       |
| ------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------- |
| API : connecté / un rôle / plusieurs rôles / admin      | `requireAuth(locals)`, `requireRole`, `requireRoles`, `requireAdmin` | `src/lib/server/middleware/auth.ts`           |
| Page (`load`, action) : redirige au lieu de 401         | `requireAuth(user)`, `requireRole(profile, …)`, `hasRole`            | `src/lib/server/auth.ts`                      |
| Le prof est-il celui de cet élève ?                     | `verifyTeacherStudent`, `verifyTeacherStudentWithRole`               | `src/lib/server/middleware/student-access.ts` |
| Le prof est-il celui de cette classe ? (analytique)     | `requireTeacherOfClass`                                              | `src/lib/server/stats/teacher-class-auth.ts`  |
| Action d'élève soumise au consentement parental         | `requireConsent(profile, action)`                                    | `src/lib/server/middleware/consent.ts`        |
| Action admin destructrice : mot tapé (`LANCER`, un nom) | `assertTypedConfirmation`                                            | `src/lib/server/confirmAction.ts`             |

Mesure (2026-10-10, `git grep` sur les 380 `+server.ts`) : **289** appellent une fonction de `middleware/auth.ts` ; les **91** autres sont des routes publiques (`api/health`, `api/dictionnaire`…), passent par `requireTeacherOfClass`, ou refont la garde à la main (`const { user } = locals; if (!user) throw error(401…)`, ex. `api/teacher/rewards/*`, `api/messages/templates/*`, `api/python-exercises/*`, `api/marketplace/*`). **Pour un nouvel endpoint : `middleware/auth.ts`, pas la garde à la main.** Les invariants (identité par `getUser()`, rôle lu dans `profiles`) : [auth.md § Invariants de sécurité](auth.md#invariants-de-sécurité). `requireConsent` est appelé par 19 routes élèves (chat, jeux, marché, messages, énigmes, Python, SRS, cartes VIP, exercices).

### 1.2 Validation Zod

Règle et exemple : [qualite.md § Input Validation with Zod](../pratiques/qualite.md#input-validation-with-zod). Les schémas vivent dans `src/lib/server/validation/` (74 fichiers par domaine, réexportés par `src/lib/server/validation/index.ts`). Outils communs :

- `src/lib/server/validation/common.ts` — `uuidSchema`, `paginationSchema`, `roleSchema`, `validateRequest`, `validateFormData`, `formDataTransforms` (actions).
- `src/lib/server/validation/params.ts` — paramètres d'URL : `validateUuidParam`, `validateUuidParams`, `validateSlugParam`, `validateIntParam`, `validateEnumParam` (34 endpoints).
- `src/lib/server/validation/response-utils.ts` — valider aussi ce qu'on **renvoie** : `validateResponse`, `createPaginatedResponseSchema`. ⚠️ un schéma de réponse nomme les colonnes : il casse si une colonne est supprimée (cf. CLAUDE.md § Migrations).

`safeParse` apparaît dans 295 endpoints sur 380. Le marché garde ses propres schémas dans `src/lib/server/marketplace/validation.ts`.

### 1.3 Quel client Supabase

- **Par défaut : `locals.supabase`**, client de l'appelant ; la RLS fait le travail ([base-de-donnees.md § 1](base-de-donnees.md#1-le-modèle-daccès)). Une écriture refusée rend **zéro ligne, pas d'erreur** : `.select()` après `update`/`delete` et vérifier ([rls-echecs-silencieux.md](../pratiques/rls-echecs-silencieux.md)).
- **Admin élevé : `locals.adminSupabase`** ([auth.md § Élévation admin](auth.md#élévation-admin)).
- **Service role : `createServiceRoleClient()`** (`src/lib/server/serviceRoleClient.ts`), qui contourne la RLS. Seulement quand la base refuse légitimement l'écriture à l'utilisateur, **après** la garde d'identité, et en ajoutant le chemin à `ALLOWED_SERVICE_ROLE_PATHS` dans ce même fichier. Le contrôle de la liste est un `console.warn` **en dev seulement**. Appelants (2026-10-10) : 17 endpoints, 4 pages, 11 fichiers de `src/lib/server/`.
- `src/lib/server/rateLimiter.ts` crée **son propre** client service role (`createClient`) au lieu de passer par `serviceRoleClient.ts` (table `rate_limits` réservée à `service_role`).

### 1.4 Erreurs

- **Lever** : `throw error(status, message)` de `@sveltejs/kit` — 400 (Zod), 401, 403, 404. Message en français pour l'utilisateur, jamais le message Postgres brut.
- **Assainir une erreur Postgres / RPC** : `sanitizePostgresError(err, context)` et `sanitizeRPCError(err, fn)` dans `src/lib/server/utils/error-handler.ts` — loguent le détail côté serveur, traduisent le code (`23505`, `PGRST116`…) en message neutre, lèvent l'`HttpError` (25 endpoints). `src/lib/server/curriculum.ts` fait la même chose pour le programme.
- **Actions de formulaire** : `return fail(400, { … })` (45 fichiers d'actions). ⚠️ `fail()` répond HTTP **200** au `fetch` : côté client, passer par `submitAction` (`src/lib/utils/form-action.ts`).
- **Erreurs non rattrapées** : `errorMonitoringHandle` (dans `src/hooks.server.ts`) les enregistre via `logError` de `src/lib/server/errorMonitoring.ts` (table d'erreurs, page `/dashboard/admin/errors`). Lecture des erreurs de prod : [observabilite-erreurs-prod.md](../pratiques/observabilite-erreurs-prod.md).

### 1.5 Limites de débit

Trois mécanismes coexistent :

| Mécanisme                                                             | Fichier                                                                    | Portée                                                                                                                                                                           |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **En base** (RPC `check_and_increment_rate_limit`), échoue **ouvert** | `src/lib/server/rateLimiter.ts`                                            | Login, inscription, reset, OAuth, élévation (IP + email), chatbot (`checkChatbotRateLimit`), notifications, kanban. Tient entre instances Vercel.                                |
| **En mémoire**, par instance                                          | `src/lib/server/middleware/rateLimit.ts` (`rateLimit(key, max, windowMs)`) | `api/account/delete`, `api/account/export`, `api/bug-reports`, `api/errors/log`, `api/evaluations/…/start` et `…/submit`, `api/search`. Remis à zéro à chaque démarrage à froid. |
| Quota du tuteur IA                                                    | `src/lib/server/tutor/tutor-rate-limiter.ts`                               | `api/chat`, `api/tutor/remaining` (limites : `src/lib/config/tutor-limits.ts`).                                                                                                  |

Une route sensible accessible sans compte → `rateLimiter.ts` (le seul qui tient sur plusieurs instances).

### 1.6 Journalisation

- `createServerLogger(fichier)` / `createLogger` de `src/lib/utils/logger.ts` ; `redactPII` masque les données personnelles. Peu adopté : 4 endpoints l'importent, **319** utilisent `console.error` directement (les deux finissent dans les logs Vercel).
- Erreur à garder et à trier : `logError` (`src/lib/server/errorMonitoring.ts`).
- Jobs : RPC `start_job_run` / `complete_job_run` (table `background_job_runs`, page `/dashboard/admin/cron`).

### 1.7 Ce que les hooks font pour tous

| Garde                                      | Fichier                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| Variables d'environnement validées (Zod)   | `src/lib/server/env.ts` (`initEnv`, `getEnv`)                          |
| Mode maintenance (503 avant Supabase)      | `src/lib/server/maintenance.ts` (`maintenanceHandle`)                  |
| Session Supabase SSR                       | `src/lib/server/supabase.ts` (`handle`)                                |
| CSRF : `Origin` ≠ `Host` → 403 (mutations) | `csrfHandle` dans `src/hooks.server.ts` + `csrf` de `svelte.config.js` |
| CSP dépendant de la config                 | `src/lib/server/csp.ts`                                                |
| Pas de cache partagé pour un connecté      | `src/lib/server/private-response.ts` (`mustStayPrivate`)               |
| Élévation admin                            | `src/lib/server/adminElevation.ts`                                     |

---

## 2. Index de `src/lib/server/`

Mesure : `git grep` des imports `$lib/server/<module>` (et relatifs dans `src/lib/server/`), tests exclus, le 2026-10-10. « Routes `api/` » = premiers segments sous `src/routes/api/`. « Ailleurs » = pages (`src/routes` hors `api`), hooks, autres modules. Les sous-dossiers `__tests__/` ne sont pas listés.

### Transverse (auth, sécurité, plomberie)

| Module                   | Rôle                                                                                    | Routes `api/`                                                                                               | Ailleurs                                                               | Doc                                                         |
| ------------------------ | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------- |
| `middleware/`            | Gardes d'API : auth/rôles, accès prof→élève, consentement, débit mémoire                | **317 endpoints**, presque toutes les familles                                                              | 94 pages                                                               | [auth.md](auth.md)                                          |
| `validation/`            | Schémas Zod par domaine + utilitaires (§ 1.2)                                           | **281 endpoints**                                                                                           | 62 pages, des modules de `src/lib`                                     | [qualite.md](../pratiques/qualite.md)                       |
| `auth.ts`                | Gardes de **pages** (`getUserProfile`, `requireAuth(user)`, `requireRole`)              | —                                                                                                           | `(protected)` layout, `/auth/update-password`, hooks                   | [auth.md](auth.md)                                          |
| `auth/`                  | `auth-error-fr.ts` (messages Supabase Auth en français), `cron.ts` (`verifyCronAuth`)   | —                                                                                                           | `/auth/update-password`                                                | [auth.md](auth.md)                                          |
| `adminElevation.ts`      | Élévation prof → admin (cookie, `locals.adminSupabase`)                                 | `admin/elevate`                                                                                             | hooks                                                                  | [auth.md](auth.md)                                          |
| `supabase.ts`            | Handle de session Supabase SSR                                                          | —                                                                                                           | hooks, `/auth/login`, `/auth/logout`                                   | [auth.md](auth.md)                                          |
| `serviceRoleClient.ts`   | Client qui contourne la RLS + liste blanche (§ 1.3)                                     | 17 endpoints (`account/delete`, `evaluations`, `games`, `marketplace`, `skill-attempts`, `api/tests/save`…) | `/auth/callback`, `/auth/register`, `/consent/[token]`                 | [auth.md](auth.md)                                          |
| `rateLimiter.ts`         | Limites de débit en base (§ 1.5)                                                        | `admin/elevate`, `chat`, `notifications`, `organisation/kanban`                                             | `/auth/login`, `/auth/register`, `/auth/reset-password`, notifications | [auth.md](auth.md)                                          |
| `passwordPolicy.ts`      | Politique de mot de passe (NIST 800-63B)                                                | —                                                                                                           | `validation/auth.ts`                                                   | [auth.md](auth.md)                                          |
| `validateRedirectUrl.ts` | Anti open-redirect (`next`, `redirect`)                                                 | —                                                                                                           | `/auth/callback`, `/auth/confirm`                                      | [auth.md](auth.md)                                          |
| `private-response.ts`    | `Cache-Control: private, no-store` pour les connectés                                   | —                                                                                                           | hooks                                                                  | [auth.md](auth.md)                                          |
| `csp.ts`                 | Sources CSP dépendant de la config (origine Supabase exacte)                            | —                                                                                                           | hooks                                                                  | —                                                           |
| `csrfProtection.ts`      | Validation `Origin` manuelle                                                            | —                                                                                                           | **aucun appelant** (test seul)                                         | —                                                           |
| `env.ts`                 | Schéma Zod des variables d'environnement                                                | `admin/cron`, `chat`                                                                                        | hooks, `google/`, `rag/`, `auth/cron.ts`                               | —                                                           |
| `maintenance.ts`         | Page 503 de maintenance, contournement par cookie                                       | —                                                                                                           | hooks                                                                  | —                                                           |
| `confirmAction.ts`       | Confirmation tapée des actions admin destructrices                                      | `admin/cron`, `admin/exercises`, `admin/vip-cards`                                                          | `/dashboard/admin/schools`                                             | —                                                           |
| `errorMonitoring.ts`     | Enregistrer, lister, résoudre, purger les erreurs applicatives                          | `errors/*`                                                                                                  | hooks, `/dashboard/admin/errors`                                       | [observabilite](../pratiques/observabilite-erreurs-prod.md) |
| `healthStats.ts`         | Statistiques coûteuses du tableau de bord admin, mises en cache                         | `admin/health-stats`                                                                                        | —                                                                      | —                                                           |
| `utils/`                 | `error-handler.ts` (§ 1.4), `chunked-in.ts` (`fetchInChunks` : `.in()` par lots de 100) | 25 endpoints (`error-handler.ts`)                                                                           | `srs/`, `stats/` (`chunked-in.ts`)                                     | —                                                           |
| `sanitization.ts`        | DOMPurify du HTML des notifications (XSS stocké)                                        | —                                                                                                           | `notifications.ts`, scripts                                            | —                                                           |
| `openapi/`               | Génère la spec OpenAPI                                                                  | `openapi.json`                                                                                              | —                                                                      | —                                                           |
| `docs-scanner.ts`        | Liste les docs de `docs/` pour l'admin                                                  | —                                                                                                           | `/dashboard/admin/docs`                                                | —                                                           |
| `markdown-parser.ts`     | Rendu marked des docs admin                                                             | —                                                                                                           | `/dashboard/admin/docs`, `docs-scanner.ts`                             | —                                                           |
| `admin/`                 | Sauvegarde / restauration de la banque d'exercices (JSON, SQL)                          | `admin/exercises`                                                                                           | `/dashboard/admin/backup`                                              | —                                                           |
| `test-mode.ts`           | Mode test du prof (élèves fictifs inclus ou non)                                        | `classes/[classId]`, `test-mode`                                                                            | 5 pages prof, `students.ts`                                            | —                                                           |

### Personnes, classes, communication

| Module                      | Rôle                                                                   | Routes `api/`                                                                                  | Ailleurs                                         | Doc                                      |
| --------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------- |
| `students.ts`               | Lecture des élèves d'une classe, filtre du mode test                   | `classes`, `teacher/classes`                                                                   | 10 pages prof                                    | [base-de-donnees.md](base-de-donnees.md) |
| `staff-directory.ts`        | Annuaire du personnel (nom, avatar) lisible par un élève               | —                                                                                              | 3 pages élève, `kanban.ts`, `notifications.ts`   | —                                        |
| `notifications.ts`          | Créer, lire, marquer les notifications                                 | `notifications/*`, `admin/users`, `bug-reports`                                                | pages notifications, `/auth/callback`, 5 modules | [base-de-donnees.md](base-de-donnees.md) |
| `auto-notifications.ts`     | Notifications système déclenchées par un événement (fiche assignée…)   | `worksheets/[id]`                                                                              | `/dashboard/teacher/assessments/[id]/assign`     | —                                        |
| `warnings.ts`               | Avertissements de comportement par période                             | `warnings/*`, `classes/[classId]`, `student/warnings`, `teacher/periods`                       | 2 pages prof, stores, composants                 | —                                        |
| `email/`                    | Envoi d'emails (Brevo) : consentement, bienvenue                       | `consent/send-email`, `teacher/send-welcome-email`                                             | `/dashboard/teacher/consent`, `…/welcome-email`  | [conformite/rgpd.md](conformite/rgpd.md) |
| `google/`                   | Google Classroom / Drive / Gmail : OAuth, chiffrement des jetons, sync | `google/*`, `whiteboard/drive`, `whiteboard/export-to-classroom`, `teacher/send-welcome-email` | —                                                | [auth.md](auth.md)                       |
| `kanban.ts`                 | Tableaux kanban (organisation), autorisation par RLS                   | `organisation/kanban`                                                                          | `/organisation/kanban`                           | —                                        |
| `bug-report-export.ts`      | Export Markdown d'un signalement de bug                                | `bug-reports/[reportId]`                                                                       | —                                                | —                                        |
| `bug-report-screenshots.ts` | URLs signées des captures (bucket privé)                               | `bug-reports/[reportId]`                                                                       | pages bug-reports                                | —                                        |
| `profanity-filter.ts`       | Filtre de grossièretés pour le chat                                    | —                                                                                              | **aucun appelant**                               | —                                        |

### Cours, cahier de texte, programme

| Module                         | Rôle                                                                  | Routes `api/`                                               | Ailleurs                                           | Doc                                            |
| ------------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------- |
| `chapters.ts`                  | Chapitres de classe : documents, checklist, exercices                 | `teacher/chapters`, `student/chapters`, `student/checklist` | pages `cours`                                      | [base-de-donnees.md](base-de-donnees.md)       |
| `chapter-sections.ts`          | Sections d'un chapitre (rangement par moment du cours)                | `teacher/chapters`                                          | `/dashboard/teacher/cours/[classId]/[chapterId]`   | —                                              |
| `chapter-series.ts`            | Lien chapitre → série de questions de cours                           | —                                                           | pages `cours` (prof, élève)                        | —                                              |
| `chapter-templates.ts`         | Modèles de chapitre : versions, instanciation                         | `teacher/chapter-templates`, `teacher/chapters`             | `/dashboard/teacher/contenu/templates`, `cours`    | —                                              |
| `chapters-publication.ts`      | Publier / dépublier les contenus d'un chapitre                        | —                                                           | `/dashboard/teacher/cours/[classId]/[chapterId]`   | —                                              |
| `chapter-plan.ts`              | Plan d'un chapitre vu par l'élève                                     | —                                                           | `/dashboard/student/cours/[chapterId]`             | —                                              |
| `journal.ts`                   | Cahier de texte : entrées de séance                                   | —                                                           | pages `cahier-texte`                               | [base-de-donnees.md](base-de-donnees.md)       |
| `journal-activities.ts`        | Activités choisies avant l'enregistrement d'une séance                | —                                                           | `/dashboard/teacher/cahier-texte/[classId]/[date]` | —                                              |
| `journal-homework.ts`          | Plusieurs travaux par séance, chacun son échéance                     | —                                                           | idem                                               | —                                              |
| `journal-share-tokens.ts`      | Lien public de lecture du cahier de texte                             | —                                                           | `/cahier/[token]`, cahier prof                     | —                                              |
| `class-sessions.ts`            | Dates de cours réelles d'une classe (emploi du temps)                 | —                                                           | cahier de texte, `journal-homework.ts`             | —                                              |
| `curriculum.ts`                | Suivi du programme : erreurs Postgres → HTTP pour le CRUD             | `teacher/curriculum`                                        | `/dashboard/teacher/programme`, `avancement`…      | [programmes/](programmes/)                     |
| `curriculum-coverage.ts`       | Couverture AUTO du programme par une entrée de cahier                 | `teacher/curriculum`                                        | cahier de texte                                    | [base-de-donnees.md](base-de-donnees.md)       |
| `curriculum-grade.ts`          | Cartes rattachées à des points de plusieurs niveaux                   | —                                                           | `/dashboard/revisions/decks/programme`, `stats/`   | [srs.md](srs.md)                               |
| `competences/`                 | Export CSV des compétences (mapping socle)                            | `teacher/competences`                                       | `/dashboard/teacher/competences/export`            | [export-competences.md](export-competences.md) |
| `progression/`                 | Progression élève par objectifs et compétences                        | —                                                           | `/dashboard`, `/dashboard/student/progression`     | —                                              |
| `stats/`                       | Analytique de classe (connaissances, compétences) + garde prof-classe | `teacher/classes`, `teacher/competences`                    | `/dashboard/teacher/classes/[classId]/analytics`   | [analytique-prof.md](analytique-prof.md)       |
| `resource-tags.ts`             | Table unique d'étiquettes `resource_tags`                             | `tags`, `worksheets`, `constructions`, `python-exercises`   | presques-évaluations, `exercises.ts`               | —                                              |
| `search.ts`                    | Recherche globale (RPC `search_resources`)                            | `search`                                                    | `/dashboard/teacher/recherche`, `rag/`             | —                                              |
| `dictionary/`                  | Dictionnaire mathématique (chargement mémoïsé)                        | `dictionnaire`                                              | `/glossaire`, `/games/mathemo`                     | [base-de-donnees.md](base-de-donnees.md)       |
| `shtam/`                       | Gazette du Shtam : articles Markdown et présentation                  | —                                                           | `/shtam`, accueil public, `sitemap.xml`            | —                                              |
| `notebook-template-gallery.ts` | Qui figure dans la galerie de modèles de carnets Python               | —                                                           | `/dashboard/teacher/contenu/notebooks/templates`   | [python/](python/README.md)                    |

### Exercices, séries, évaluations, révisions

| Module                      | Rôle                                                               | Routes `api/`                                                   | Ailleurs                                                   | Doc                                      |
| --------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------- |
| `exercises.ts`              | Banque d'exercices : liste, filtres, CRUD                          | `exercises/*`, `teacher/exercises`                              | `/dashboard/teacher/contenu/exercices`, `/exercice/[slug]` | [questions.md](questions.md)             |
| `exercise-assignments.ts`   | Assignation d'exercices (mode entraînement, non noté)              | `exercises/[id]`, `exercises/assigned`, `exercises/assignments` | `…/exercices/[id]/assign`                                  | —                                        |
| `exercise-import-export.ts` | Import / export JSON et Markdown d'exercices                       | `exercises/[id]`, `exercises/export`, `exercises/import`        | —                                                          | —                                        |
| `exercise-share-tokens.ts`  | Liens publics vers un exercice privé                               | `exercises/[id]`                                                | `/exercice/[slug]`                                         | —                                        |
| `questions-bulk-status.ts`  | Publication par lot des modèles de questions (`checkTemplate`)     | `questions/templates`                                           | —                                                          | [questions.md](questions.md)             |
| `migration/`                | Migration TinyMath : relecture, hachage, publication               | `migration/questions`                                           | scripts (`publication.ts`, `review-db.ts`)                 | —                                        |
| `series.ts`                 | Séries : CRUD, verrou tenu par la base                             | `series`                                                        | `/dashboard/teacher/series`, `assessments/new`             | —                                        |
| `evaluations.ts`            | Évaluations : forme, réglages, destinataires, résultats            | `evaluations/assignments`, `evaluations/attempts`               | 7 pages `assessments`                                      | —                                        |
| `evaluation-attempts.ts`    | Tentatives d'évaluation corrigées par le serveur (ADR 0015)        | `evaluations/assignments`, `evaluations/attempts`               | —                                                          | [questions.md](questions.md)             |
| `corrected-detail.ts`       | Statut case par case d'une copie corrigée                          | —                                                               | `evaluation-attempts.ts`                                   | —                                        |
| `grading-budget.ts`         | Budget de temps total de la correction d'un envoi                  | —                                                               | `evaluation-attempts.ts`, `corrected-detail.ts`            | —                                        |
| `course-card-attempts.ts`   | Tentative de carte de cours : réponse validée ou auto-évaluation   | `skill-attempts`, `api/tests/save`                              | `srs/best-of-day.ts`                                       | [srs.md](srs.md)                         |
| `srs/`                      | Révisions : FSRS, paquets (chapitre, programme), copie, badge      | `srs/*`, `skill-attempts`, `api/tests/save`                     | `/dashboard/revisions`, pages cours                        | [srs.md](srs.md)                         |
| `anti-fraud/`               | Détecteurs anti-triche et leur exécution                           | `admin/anti-fraud`                                              | —                                                          | [srs.md](srs.md)                         |
| `worksheets/`               | Fiches : accès aux assignations, instances, publication du corrigé | `worksheets/*`, `student/worksheets`                            | pages `contenu/worksheets`                                 | [fiches-et-pdf.md](fiches-et-pdf.md)     |
| `student-inbox.ts`          | Boîte « travail à faire » de l'élève (4 systèmes d'assignation)    | —                                                               | `/dashboard`, `/dashboard/student/work`                    | [base-de-donnees.md](base-de-donnees.md) |
| `tutor/`                    | Tuteur IA : quota, détection de triche, escalade d'aide            | `chat`, `tutor/remaining`                                       | `src/lib/config/tutor-limits.ts`                           | [base-de-donnees.md](base-de-donnees.md) |
| `rag/`                      | Documents du tuteur : découpe, embeddings, recherche hybride       | `chat`, `documents`, `documents/upload`                         | —                                                          | [base-de-donnees.md](base-de-donnees.md) |
| `documents/`                | Extraction de texte (PDF, Markdown, texte) à l'upload              | `documents/upload`                                              | —                                                          | —                                        |

### Jeux, récompenses, économie

| Module                      | Rôle                                                                     | Routes `api/`                                             | Ailleurs                               | Doc                                        |
| --------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------- | -------------------------------------- | ------------------------------------------ |
| `achievements/`             | Succès : attribution, crédit de gidouilles                               | `achievements/*`, `games/2048`, `games/mathemo`           | store realtime des succès              | [jeux-et-economie.md](jeux-et-economie.md) |
| `games/`                    | Récompenses des jeux 2048 et Mathémo                                     | `games/2048`, `games/mathemo`                             | —                                      | [jeux-et-economie.md](jeux-et-economie.md) |
| `marketplace/`              | Marché : acceptation, auto-acceptation, verrous de cartes, notifications | `marketplace/*`                                           | `/dashboard/student/marketplace`       | [jeux-et-economie.md](jeux-et-economie.md) |
| `vip-card-queries.ts`       | Lecture des modèles de cartes VIP                                        | `vip-cards/activate-add-gidouilles`, `choose`, `exchange` | `/dashboard`, `…/gamification/rewards` | [jeux-et-economie.md](jeux-et-economie.md) |
| `vip-card-grants.ts`        | Écritures de cartes VIP réservées au serveur                             | `vip-cards/choose`, `vip-cards/exchange`                  | —                                      | [jeux-et-economie.md](jeux-et-economie.md) |
| `vip-card-context.ts`       | Une carte est-elle auto-activable dans ce contexte ?                     | `vip-cards/activate-add-gidouilles`, `choose`, `exchange` | —                                      | [jeux-et-economie.md](jeux-et-economie.md) |
| `reward-journal-balance.ts` | Solde de gidouilles après chaque événement du journal                    | `rewards/journal`                                         | —                                      | [jeux-et-economie.md](jeux-et-economie.md) |
| `riddle-auto-select.ts`     | Choix automatique de l'énigme du jour                                    | `riddles/auto-select-daily`                               | —                                      | [jeux-et-economie.md](jeux-et-economie.md) |
| `riddle-messages.ts`        | Message au prof pour valider une réponse d'énigme                        | `riddles/[id]`                                            | `…/enigmes/validations/[id]`           | —                                          |
| `buddy-queries.ts`          | Requêtes du compagnon (Palotin)                                          | `student/buddy`                                           | `buddy-xp-service.ts`                  | [buddy-palotins.md](buddy-palotins.md)     |
| `buddy-xp-service.ts`       | Orchestration des gains d'XP du compagnon                                | `riddles/[id]`, `student/buddy`, `api/tests/save`         | `evaluation-attempts.ts`               | [buddy-palotins.md](buddy-palotins.md)     |
| `buddy-xp.ts`               | Réexport de `src/lib/utils/buddy-xp.ts` côté serveur                     | —                                                         | `buddy-xp-service.ts`                  | [buddy-palotins.md](buddy-palotins.md)     |

**Total : 89 modules indexés.** Sans appelant hors tests : **`csrfProtection.ts`**, **`profanity-filter.ts`**, et, à l'intérieur des dossiers, **`auth/cron.ts`** (`verifyCronAuth`, testé, appelé par aucune route). `migration/publication.ts` et `migration/review-db.ts` ne sont appelés que par des scripts (`scripts/migrate-questions-phase1.ts`, `scripts/record-review.ts`, `scripts/import-reviewed-questions.ts`).

---

## 3. Tâches planifiées

Aucune tâche planifiée côté Vercel : `vercel.json` déclare `"crons": []`. Le travail périodique vit dans **pg_cron**, programmé **hors migrations** (le baseline crée l'extension et la vue `admin_pg_cron_jobs`, pas les jobs). État en production, lu le 2026-10-10 (`cron.job`, MCP Supabase en lecture seule) :

| Job pg_cron                         | Planning (UTC) | Fonction                                      |
| ----------------------------------- | -------------- | --------------------------------------------- |
| `cleanup-all`                       | `0 2 * * *`    | `run_cleanup_all()`                           |
| `rgpd-retention-cleanup`            | `0 3 * * 0`    | `run_cleanup_expired_data()` (rétention RGPD) |
| `cleanup-stale-trades`              | `*/10 * * * *` | `cleanup_stale_trades()` (marché)             |
| `cleanup-stuck-job-runs`            | `30 * * * *`   | `cleanup_stuck_job_runs()`                    |
| `daily-summaries`                   | `0 * * * *`    | `run_daily_summaries()`                       |
| `weekly-rewards`                    | `0 0,12 * * *` | `run_weekly_rewards()`                        |
| `weekly-best-bonuses`               | `0 0,12 * * *` | `run_weekly_best_bonuses()`                   |
| `recalculate-minesweeper-ref-times` | `30 1 * * 0`   | `run_recalculate_minesweeper_ref_times()`     |

Déclenchement manuel : page `/dashboard/admin/cron` → `api/admin/cron/trigger` (`requireAdmin`, mot `LANCER`, liste blanche `ALLOWED_JOB_PATHS` dans `src/lib/server/validation/cron.ts`) ; historique : `api/admin/cron/jobs`.

Côté GitHub Actions (planifiés, hors application) : `.github/workflows/production-health.yml` (06:00 UTC, pages publiques de prod), `.github/workflows/nightly-integration.yml`, `.github/workflows/nightly-pyodide.yml`, `.github/workflows/codeql.yml`.

---

## 4. Écarts connus

1. **Énigme du jour : aucun déclencheur automatique, et une garde fragile.** `api/riddles/auto-select-daily` n'est planifié nulle part (pas de cron Vercel, pas de job pg_cron) ; seul le bouton admin l'appelle. La route n'exige une clé que si `VITE_RIDDLE_AUTO_SELECT_API_KEY` est définie (sinon **POST ouvert**, qui écrit via le client service role), alors que le déclencheur admin envoie `Bearer CRON_SECRET` : avec la clé définie, le bouton reçoit 401. Valeur de la variable en prod non vérifiée (secret). `verifyCronAuth` (`src/lib/server/auth/cron.ts`), fait pour ce cas, n'est branché nulle part.
2. **`run_flag_stale_python_rechecks` n'est pas programmé** : sa migration (`supabase/migrations/20260827120000_python_submission_server_verification.sql`) dit de le planifier hors bande ; il n'est pas dans `cron.job` en prod, ni dans `ALLOWED_JOB_PATHS`.
3. **Liste blanche service role partiellement périmée** : `'/api/cron/'` et `'/api/cleanup/'` ne correspondent à aucune route ; le commentaire de `validation/cron.ts` cite `/api/cron/daily-summaries-and-rewards`, inexistant. Le contrôle n'est qu'un avertissement de dev.
4. **Deux `requireAuth` homonymes** aux signatures différentes : `src/lib/server/auth.ts` (`user`, redirige) et `src/lib/server/middleware/auth.ts` (`locals`, 401). Et 91 endpoints refont une garde à la main au lieu du middleware (§ 1.1).
5. **CSRF en double** : SvelteKit (`svelte.config.js`) + `csrfHandle` maison ; `csrfProtection.ts` n'est appelé par personne. Dans `csrfHandle`, le 403 « Origin mismatch » est rattrapé par le `catch` et ressort en « Invalid origin header » (même statut, message trompeur).
6. **Trois limiteurs de débit** (§ 1.5) ; `middleware/rateLimit.ts` et la `Map` locale de `api/admin/cron/trigger` ne tiennent pas entre instances Vercel.
7. **Journalisation hétérogène** : `console.error` direct dans 319 endpoints, logger structuré dans 4.
8. **Code mort** : `profanity-filter.ts` (le filtrage des messages passe par la fonction SQL `check_profanity_simple`, appelée par le trigger `process_message_content`).

---

_Vérifié contre le code le 2026-10-10 (comptages par `git grep`, jobs pg_cron lus en prod)._
