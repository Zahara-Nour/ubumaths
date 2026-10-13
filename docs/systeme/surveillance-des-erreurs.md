---
couvre:
  - 'src/routes/api/{errors,bug-reports,health,search,openapi.json}/**'
  - 'src/routes/(protected)/dashboard/admin/{errors,bug-reports,docs,debug}/**'
  - 'src/routes/(protected)/dashboard/bug-reports/**'
  - 'src/lib/components/bug-reports/**'
  - 'src/lib/utils/{errorMonitoring,freezeDetection,errors,version}.ts'
  - src/lib/stores/bugReportsConfig.svelte.ts
  - src/lib/types/bug-reports.ts
  - 'src/lib/server/{errorMonitoring,healthStats,bug-report-export,bug-report-screenshots,docs-scanner,markdown-parser,search}.ts'
  - 'src/lib/server/validation/{errors,bug-reports,health,search}.ts'
  - 'src/lib/server/openapi/**'
  - 'src/routes/(public)/api-docs/**'
---

# Surveillance des erreurs, signalements, santé et outils admin

> Ce que fait le code qui **remonte les erreurs** (navigateur et serveur) vers la table
> `error_logs`, qui **détecte les gels** de l'interface, qui recueille les **signalements**
> (« bug reports ») des utilisateurs, et les pages admin qui les lisent. Aussi : le ping de
> santé, la recherche globale, la doc lue depuis l'admin, la spécification OpenAPI.
> Docs voisines, citées sans recopie : [observabilite-erreurs-prod.md](../pratiques/observabilite-erreurs-prod.md)
> (lire les logs Vercel), [page-erreur.md](page-erreur.md) (ce que voit l'utilisateur),
> [serveur.md](serveur.md) (conventions d'endpoint, limites de débit, tâches planifiées),
> [conformite/rgpd.md](conformite/rgpd.md) (durées de conservation).
>
> Vérifié contre le code le 2026-10-13 (commit `4f3eb2b3e`).

## À quoi ça sert

Trois boucles distinctes :

1. **Erreurs automatiques.** Le navigateur et le serveur écrivent dans `error_logs`
   sans rien demander à l'utilisateur. Un déclencheur regroupe les erreurs identiques
   dans `error_occurrences`. L'admin les lit sur `/dashboard/admin/errors`.
2. **Signalements.** Un utilisateur connecté décrit un problème (bouton flottant du
   tableau de bord). Le signalement va dans `bug_reports`, avec le contexte technique
   et une capture d'écran facultative. L'admin les traite sur `/dashboard/admin/bug-reports`
   et peut les exporter en Markdown pour Claude Code.
3. **Gels.** Une détection côté navigateur repère une interface bloquée. Elle envoie
   une erreur, et selon la configuration propose (ou envoie seule) un signalement.

## Carte du code

### Erreurs côté navigateur et leur remontée

- `src/hooks.client.ts` appelle `initErrorMonitoring()`, `initWebVitals()` et
  `initFreezeDetection()` au chargement. Son `handleError` envoie lui-même un `fetch`
  vers `/api/errors/log` pour les erreurs que SvelteKit intercepte (rendu, `$effect`,
  `load`). Une 404 de navigation part en `warning`, le reste en `error`.
- `src/lib/utils/errorMonitoring.ts` :
  - écoute `error` et `unhandledrejection` sur `window` ;
  - API manuelle : `captureError`, `captureValidationError`, `capturePerformance`,
    `flushErrors` ;
  - `initWebVitals` : observe LCP, CLS, INP, etc. ; une valeur au-dessus du seuil part
    en `performance` (rien n'est envoyé si la sévérité vaut `info`) ; l'URL passe par
    `sanitizeUrl` (paramètres `token`, `key`, `secret`, `password`, `auth`, `session`,
    `code` remplacés par `[REDACTED]`) ;
  - garde-fous (objet `CONFIG`) : 10 erreurs par minute au plus, file envoyée toutes
    les 10 s ou dès 5 erreurs. « Lot » ne veut dire que regroupement dans le temps :
    chaque erreur part dans son propre `POST` ;
  - dédoublonnage : clé `type:message:fichier:ligne`, oubliée 5 min après un envoi réussi
    (test : `src/lib/utils/__tests__/errorMonitoring-dedup.svelte.test.ts`).
- Autres émetteurs directs de `/api/errors/log` : `src/lib/stores/minesweeper.svelte.ts`.
- `src/lib/utils/errors.ts` sert à **afficher** une erreur, pas à la remonter :
  - `readApiErrorMessage(response)` lit le message d'une réponse d'API en échec :
    `{ message }` (erreur SvelteKit) ou `{ error }` (`json({ error })`), sinon
    « Erreur <statut> ». Jamais le corps brut. Appelée par
    `src/lib/components/worksheets/VariantPreview.svelte` ;
  - `formatUserError(error)` : message lisible d'une exception (champ `details` de
    Supabase s'il existe) ;
  - `logNonCriticalError(contexte, error)` : un `console.warn`, rien d'envoyé.

### Erreurs côté serveur

- `src/lib/server/errorMonitoring.ts` est le seul écrivain de `error_logs` :
  - `logError` nettoie (`sanitizeErrorData`), tronque (message 1 000, pile 5 000, URL
    500 caractères), puis insère avec le **client service** (la RLS n'autorise
    l'insertion qu'à l'admin). Une erreur `critical` déclenche `notifyCriticalError` :
    notification urgente à tous les admins (`createSystemNotification`), message et URL
    échappés (`escapeHtml`) : ils s'affichent comme du texte ;
  - `getUserContext` ajoute `user_id` et `user_role` ;
  - lecture : `getErrorStats` (RPC `get_error_stats`), `getErrorLogs`,
    `getErrorOccurrences`, `getErrorLog` ;
  - résolution et purge : `resolveError` (RPC `resolve_error`),
    `resolveErrorBySignature`, `cleanupOldErrors` (RPC `cleanup_old_errors`),
    `deleteAllResolvedErrors` (RPC `delete_all_resolved_errors`).
- Appelants dans le serveur : `src/hooks.server.ts` (`errorMonitoringHandle` : exceptions
  non rattrapées, et requêtes de plus de 3 s en `performance` ; aussi profil absent ou
  illisible), `src/routes/(protected)/+layout.server.ts` (profil absent).
- En base (baseline `supabase/migrations/20260616220000_baseline_schema.sql`) :
  déclencheurs `trigger_set_error_signature` (empreinte SHA-256 via
  `generate_error_signature`) et `trigger_update_error_occurrence` (compteur dans
  `error_occurrences` via `upsert_error_occurrence`).

### Routes `api/errors`

| Route                              | Qui                             | Rôle                                                                                                                 |
| ---------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `POST /api/errors/log`             | tout le monde, même sans compte | écrit une erreur ; 20 par minute et par IP ; sans compte, `critical` devient `error` ; `context` ≤ 10 000 caractères |
| `GET /api/errors`                  | admin                           | liste filtrée (`listErrorsQuerySchema`, 100 au plus)                                                                 |
| `GET`/`PUT /api/errors/[id]`       | admin                           | une erreur ; la marquer résolue                                                                                      |
| `POST /api/errors/bulk-resolve`    | admin                           | résout par empreinte tout ce qui correspond aux filtres                                                              |
| `POST /api/errors/delete-resolved` | admin                           | supprime toutes les erreurs résolues (client service)                                                                |
| `POST /api/errors/cleanup`         | admin                           | supprime les erreurs de plus de N jours (90 par défaut, 365 au plus), trace dans `background_job_runs`               |

Pages admin : `/dashboard/admin/errors` (statistiques 24 h et occurrences, filtres
`type`, `severity`, `resolved`, `search` dans l'adresse), `/dashboard/admin/errors/[id]`
(détail, action `resolve`), `/dashboard/admin/errors/test` (boutons qui provoquent des
erreurs de test).

### Détection de gel

`src/lib/utils/freezeDetection.ts`, lancé par `initFreezeDetection()` :

- **Long Task Observer** : tâche de plus de 100 ms notée, de plus de 500 ms envoyée par
  `capturePerformance` ;
- **battement** toutes les 2 s : un retard est un gel seulement s'il est corroboré par des
  longues tâches, onglet visible et utilisateur pas inactif (le commentaire d'en-tête liste
  les faux positifs écartés : onglet en arrière-plan, veille, mode économie…) ;
- un gel part dans `captureError` (`critical` au-delà de 30 s, sinon `error`), puis appelle
  le rappel de proposition (15 s et plus) ou d'envoi automatique (plus de 30 s) ;
- **activité** : les 20 dernières actions (`click`, `input`, `navigation`, `scroll`),
  réduites au sélecteur de l'élément (id, première classe ou balise). Jamais la valeur
  saisie. État gardé dans `sessionStorage` (clé `chiphre_freeze_data`), gels gardés 15 min ;
- `getFreezeDetectionContext()` rend gels, actions et Web Vitals pour un signalement.

Les rappels sont branchés dans `src/routes/(protected)/dashboard/+layout.svelte`
(`setFreezePromptCallback`, `setAutoReportCallback`). Ils consultent la configuration
(ci-dessous) avant d'ouvrir `FreezeReportPrompt` ou d'envoyer seuls un signalement.

### Signalements et captures d'écran

- **Saisie** : `BugReportFAB` (bouton flottant) et `BugReportDialog`, posés dans le layout
  du tableau de bord pour tous les rôles ; `FreezeReportPrompt` après un gel. Le dialogue
  envoie catégorie, gravité, titre, description, URL, user-agent, taille d'écran et
  `getFreezeDetectionContext()`. La capture est un **fichier choisi** par l'utilisateur
  (JPEG, PNG, GIF, WebP) : aucune capture automatique de l'écran.
- **`/api/bug-reports`** : `GET` (les siens ; tout pour l'admin), `POST` (crée, 10 par heure
  et par compte, ajoute les erreurs des 5 dernières minutes lues dans `error_logs`, notifie
  les admins par `notifyAdminsOfNewBugReport`).
- **`/api/bug-reports/[reportId]`** : `GET` ; `PATCH` (l'auteur modifie titre et
  description tant que le statut vaut `pending` ; l'admin change statut et notes) ;
  `DELETE` (admin).
- **`/api/bug-reports/batch`** : `PATCH` et `DELETE` en lot, admin, 100 rapports au plus.
- **`/api/bug-reports/[reportId]/screenshot`** : `POST`, l'auteur seul. Taille plafonnée
  par `MAX_IMAGE_SIZE_BYTES`, signature binaire vérifiée (`validateFileSignature`).
  Chemin `<id utilisateur>/<id du rapport>/<horodatage>.<ext>` dans le bucket
  `bug-report-screenshots` ; l'ancienne capture est retirée.
- **`src/lib/server/bug-report-screenshots.ts`** : le bucket est privé ; `bug_reports.screenshot_url`
  est recalculé à chaque lecture depuis `screenshot_path` en URL signée
  (`DISPLAY_SIGNED_URL_TTL` = 1 h ; `EXPORT_SIGNED_URL_TTL` = 7 jours). Échec de signature
  → `null`, jamais une URL cassée.
- **Export** : `/api/bug-reports/[reportId]/export` (admin) → `generateClaudeCodeExport`
  (`src/lib/server/bug-report-export.ts`) : Markdown avec auteur, contexte, erreurs,
  fichiers déduits des piles et de l'URL, capture. Bouton : `ExportClaudeCodeButton`.
- **Pages** : `/dashboard/bug-reports` (« Mes Signalements », dans le menu élève) et
  `/dashboard/admin/bug-reports` (`BugReportList`, `BugReportCard`, `BugReportStatusBadge`).
- **Types et libellés** : `src/lib/types/bug-reports.ts` ; schémas Zod :
  `src/lib/server/validation/bug-reports.ts`.

### Configuration des signalements

Table singleton `bug_reports_config` (`singleton_key = 'global'`), quatre drapeaux :
`fab_enabled`, `freeze_detection_enabled`, `freeze_prompt_enabled`, `auto_report_enabled`.
`/api/bug-reports/config` : `GET` pour tout compte connecté, `PATCH` admin. Côté client,
`bugReportsConfigStore` (`src/lib/stores/bugReportsConfig.svelte.ts`), valeurs par
défaut `DEFAULT_BUG_REPORTS_CONFIG` (tout à `true`). Réglage : `BugReportsConfigCard`, sur
`/dashboard/admin/bug-reports` et `/dashboard/admin/settings`.

### Santé

- `GET /api/health` : public, sans authentification. Compte `profiles` (`head: true`) et
  rend `ok` (moins de 500 ms), `degraded` ou `down` avec la latence. Aucun appelant
  dans le dépôt.
- `src/lib/server/healthStats.ts` : statistiques du tableau de bord admin (erreurs,
  utilisateurs, performances, contenu, tâches), en cache 5 min dans `server_cache`. Lu
  par `/api/admin/health-stats` (hors de cette zone ; voir
  [tableaux-de-bord-et-navigation.md](tableaux-de-bord-et-navigation.md)). Schémas :
  `src/lib/server/validation/health.ts`.

### Recherche, doc admin, pages de débogage

- `GET /api/search` (prof et admin, 30 par minute) → `searchResources`
  (`src/lib/server/search.ts`, RPC `search_resources` sur la vue `resources`). Zod :
  `searchQuerySchema` (2 caractères ou un tag, 50 résultats au plus). Appelants :
  `src/lib/extensions/resource-link-extension.ts` et la page `/dashboard/teacher/recherche`.
- `/dashboard/admin/docs` et `/dashboard/admin/docs/[...path]` : lisent `docs/` sur le
  disque au moment de la requête (`src/lib/server/docs-scanner.ts`) et rendent le
  Markdown en HTML (`src/lib/server/markdown-parser.ts`, `marked`). `getDocumentContent`
  refuse un chemin qui sort de `docs/` (`..`).
- `/dashboard/admin/debug/*` : pages d'essai (base, session, RLS, avatar, roue, éditeurs,
  PDF Typst et LaTeX, MathField…). Le menu est dans `debug/+layout.svelte`.
- `src/lib/utils/version.ts` : `getVersion()` / `getRawVersion()`, lisent
  `__APP_VERSION__` injecté par `vite.config.ts`. Affichés par `InfoPanel.svelte` et la
  page admin des réglages.

### OpenAPI et `/api-docs`

- `src/lib/server/openapi/generator.ts` : `generateOpenAPISpec()` écrit **à la main** une
  spécification OpenAPI 3.1 de 11 chemins.
- `GET /api/openapi.json` : admin seul, `Cache-Control: private, no-store`.
- `/api-docs` (groupe public, `ssr = false`) : Swagger UI chargé depuis `unpkg.com`
  (version épinglée 5.11.0, autorisée par la CSP de `src/hooks.server.ts`), qui lit
  `/api/openapi.json`. Exclu du plan du site (`src/lib/seo/sitemap-pages.ts`).

## Invariants

### Qui lit quoi

- `error_logs` et `error_occurrences` : **lecture admin seul** (policies
  `admin_view_error_logs`, `admin_view_error_occurrences`). Écriture par le client service
  dans `logError`. Toutes les pages et routes de lecture passent par `requireAdmin` ou
  `requireRole(locals, 'admin')`.
- `bug_reports` : l'auteur voit les siens et modifie les siens **tant qu'ils sont
  `pending`** ; l'admin voit, modifie et supprime tout. Les routes recopient ces règles
  (403 si ce n'est ni l'auteur ni l'admin).
- `bug_reports_config` : lisible par tout compte connecté, modifiable par l'admin.
- Captures : bucket privé ; l'auteur lit son propre dossier (premier segment = son id),
  l'admin tout. Les policies du storage ne sont pas dans `supabase/migrations/` : elles
  datent d'avant le baseline (`supabase/migrations_archive/20260614101541_bug_report_screenshots_private.sql`).

### Données d'élèves mineurs

- `logError` masque les clés sensibles (`password`, `token`, `secret`, `api_key`, `auth`,
  `credential`, `session`, `cookie`, `bearer`) dans en-têtes, corps et contexte, et les
  adresses mail dans le message, la pile **et toutes les valeurs texte** des en-têtes, du
  corps et du contexte, quel que soit le nom de la clé (depuis le 2026-10-13). Aucun appelant
  ne range plus `user_email` dans le contexte : `user_id` suffit.
- Une erreur porte `user_id` et `user_role` si l'utilisateur est connecté.
- Un signalement porte l'URL, le user-agent, les sélecteurs des dernières actions, les
  erreurs récentes. La capture peut montrer n'importe quoi de l'écran (nom, copie d'un
  camarade) : d'où le bucket privé et les URL signées.
- L'export pour Claude Code contient le nom (ou le mail) de l'auteur et une URL de capture
  valable **7 jours**.
- Suppression de compte : les captures de l'utilisateur sont retirées du storage, en ne
  gardant que les chemins de la forme `<son id>/<id d'un de ses rapports>/…`
  (migration `supabase/migrations/20261016101200_suppression_chemins_conformes.sql`).

### Limites de débit

En mémoire, par instance (voir [serveur.md](serveur.md) §1.5) : `error-log:<ip>` 20/min,
`bug-report:<userId>` 10/h (test : `src/routes/api/bug-reports/__tests__/rate-limit.test.ts`),
`search:<userId>` 30/min. Côté navigateur, 10 erreurs par minute.

### Validation

Toutes les routes `api/errors`, `api/bug-reports` et `api/search` valident leurs entrées
avec Zod (`src/lib/server/validation/{errors,bug-reports,search}.ts`) ; identifiants de
rapport en UUID. Exceptions : voir Écarts.

### Conservation

`run_cleanup_expired_data()` (pg_cron `rgpd-retention-cleanup`, hebdomadaire) purge
`error_logs` et `error_occurrences` au-delà de **30 jours**
(`supabase/migrations/20261015090500_conservation_c11.sql`). Aucune purge automatique de
`bug_reports` : ils restent jusqu'à suppression par l'admin ou du compte.

## Comment étendre

- **Remonter une erreur de plus côté navigateur** : `captureError(err, { severity, context, tags })`.
  Ne rien mettre dans `context` qu'on ne voudrait pas lire dans `error_logs`.
- **Côté serveur** : `logError(locals.supabase, { error_type, message, url, … })`. Le
  premier argument ne sert qu'aux notifications ; l'insertion passe par le client service.
  `critical` réveille tous les admins : à garder pour le vrai critique.
- **Nouveau champ de signalement** : colonne (migration), `createBugReportSchema`, type dans
  `src/lib/types/bug-reports.ts`, `BugReportDialog`, puis l'export si utile.
- **Nouveau drapeau de configuration** : colonne de `bug_reports_config`,
  `updateBugReportsConfigSchema`, `BugReportsConfig` + `DEFAULT_BUG_REPORTS_CONFIG`,
  libellés `BUG_REPORTS_CONFIG_LABELS`, store, `BugReportsConfigCard`.
- **Afficher l'erreur d'une API** : `throw new Error(await readApiErrorMessage(response))`.
- **Documenter une route dans OpenAPI** : l'ajouter à la main dans `generator.ts`.

## Tests

- `src/lib/utils/__tests__/errorMonitoring-dedup.svelte.test.ts` : dédoublonnage côté navigateur.
- `src/lib/utils/__tests__/read-api-error-message.test.ts` : `readApiErrorMessage`.
- `src/lib/server/__tests__/bug-report-screenshots.test.ts` : URL signées.
- `src/routes/api/bug-reports/__tests__/rate-limit.test.ts` : le 11ᵉ signalement reçoit 429.
- `src/lib/server/__tests__/errorMonitoring-journal.test.ts` : adresses masquées dans le
  contexte, message de l'alerte critique échappé.
- `src/routes/api/errors/log/__tests__/log.test.ts` : `critical` ramené à `error` sans compte,
  taille du contexte bornée.
- `tests/integration/database/error-monitoring-triggers.test.ts` : empreinte SHA-256 et
  regroupement en base.
- `tests/integration/resources-view-search.test.ts` : vue `resources` et `search_resources`
  (un élève ne voit rien de plus ; anon n'a aucun droit).
- `tests/integration/suppression-compte-art17.test.ts` : captures retirées à la suppression
  du compte.
- `src/lib/__tests__/cdn-versions-epinglees.test.ts` : l'URL Swagger d'`unpkg` porte une version.

Rien ne teste `freezeDetection.ts`, les routes de lecture `api/errors`, les pages admin, ni
`docs-scanner.ts`.

## Décisions

- [ADR 0002](../adr/0002-mono-professeur-ecole-frontiere-sociale.md) : modèle un prof + un
  admin ; ici, seul l'admin lit journaux et signalements des autres.
- [ADR 0003](../adr/0003-donnees-hebergees-en-ue.md) : journaux et captures restent dans le
  projet Supabase européen.
- Conservation de 30 jours des journaux : décisions C11 de David (2026-10-11), en-tête de
  `supabase/migrations/20261015090500_conservation_c11.sql`.

## Écarts connus

Constatés le 2026-10-13, non corrigés.

- **Erreurs récentes jamais jointes aux signalements.** `POST /api/bug-reports` lit
  `error_logs` avec le client de l'utilisateur. La RLS réserve cette table à l'admin : pour
  un élève ou le prof, la requête rend zéro ligne sans erreur. `recentErrors` et
  `slowRequests` sont donc vides, sauf pour l'admin.
- **Notification critique** : `system_event_type: 'assessment_graded'` faute de valeur
  adaptée (commentaire dans le code).
- **Écritures sans `.select()`** (la RLS échoue en silence) : `DELETE` d'un rapport, lots
  `PATCH`/`DELETE`, et la mise à jour de `screenshot_path` après l'envoi d'une capture. Sur
  un rapport qui n'est plus `pending`, l'auteur envoie le fichier, la mise à jour touche
  zéro ligne, et le fichier reste orphelin dans le bucket.
- **Supprimer un rapport ne supprime pas sa capture** : ni `DELETE` ni le lot ne touchent
  au storage.
- **Routes sans appelant** : `GET /api/errors`, `GET`/`PUT /api/errors/[id]` (la page
  passe par ses propres `load` et action) et `POST /api/errors/cleanup` (90 jours par
  défaut, alors que la purge hebdomadaire garde 30 jours). `GET /api/health` n'a aucun
  appelant ; lu dans le code, un appel anonyme devrait rendre 503 (`profiles` est fermé à
  `anon` depuis `supabase/migrations/20260902094000_security_profiles_anon_read.sql`) et
  exposer le message d'erreur de la base. Non mesuré.
- **Zod manquant** : la page `/dashboard/admin/errors` passe les filtres de l'adresse sans
  validation ; l'action `resolve` de `/dashboard/admin/errors/[id]` lit `notes` sans borne ;
  `/dashboard/admin/bug-reports` passe `status`, `category`, `severity` tels quels.
- **Configuration** : le commentaire de `bugReportsConfigStore.load` dit « seuls les admins
  peuvent charger la config » ; faux, `GET /api/bug-reports/config` ne demande qu'un compte
  et la table est lisible par tous. La détection de gel tourne et envoie ses erreurs
  même si `freeze_detection_enabled` vaut `false` : le drapeau ne coupe que la proposition et
  l'envoi automatique d'un signalement.
- **Web Vitals jamais dans le contexte de gel** : `reportWebVital` de `freezeDetection.ts`
  dit être appelée par `errorMonitoring.ts`, qui ne l'importe pas. `webVitals` reste vide
  dans les signalements. `src/lib/stores/activityStore.svelte.ts`, seul lecteur de
  `getWebVitals` et `isUnresponsive`, n'est importé nulle part.
- **Doc admin** : la recherche (`?q=`) s'affiche mais ne cherche rien
  (`searchDocumentation` n'a aucun appelant) ; `CATEGORY_CONFIG` nomme des dossiers
  (`features`, `architecture`, `guides`…) qui n'existent plus dans `docs/`. Lecture
  de `docs/` sur le disque au moment de la requête : non vérifié que ces fichiers sont
  présents dans le déploiement Vercel.
- **OpenAPI** : 11 chemins sur environ 380 routes, dont 4 qui n'existent plus en tant que
  route (`/api/messages`, `/api/questions`, `/api/notifications`, `/api/rewards/award`).
  `/api-docs` est public mais la spécification est réservée à l'admin : un non-admin voit
  un Swagger vide.
- **Commentaire périmé** : l'en-tête de `healthStats.ts` dit que `server_cache`,
  `background_job_runs` et les vues `admin_*` manquent dans `database.ts` ; elles y sont.
