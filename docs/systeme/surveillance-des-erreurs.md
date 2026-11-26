---
couvre:
  - 'src/routes/api/{errors,bug-reports,search,openapi.json,web-vitals}/**'
  - 'src/routes/(protected)/dashboard/admin/{errors,bug-reports,docs,debug,integrite-donnees}/**'
  - 'src/routes/(protected)/dev/{session,rls,avatar,roue,champ-math,apercu-question,correction-generee,pdf-typst,pdf-latex,latex-vers-ubumark}/**'
  - 'src/routes/(protected)/dev/erreurs/surveillance/**'
  - 'src/routes/(protected)/dashboard/bug-reports/**'
  - 'src/lib/components/bug-reports/**'
  - 'src/lib/utils/{errorMonitoring,freezeDetection,errors,version,web-vitals-visibilite,web-vitals-mesures,inp-tracker,analytics-redact}.ts'
  - 'src/lib/server/web-vitals/**'
  - src/lib/stores/bugReportsConfig.svelte.ts
  - src/lib/types/bug-reports.ts
  - 'src/lib/server/{errorMonitoring,healthStats,bug-report-errors,bug-report-export,bug-report-screenshots,docs-scanner,markdown-parser,search}.ts'
  - 'src/lib/server/validation/{errors,bug-reports,health,search}.ts'
  - 'src/lib/server/openapi/**'
  - 'src/routes/(protected)/dev/api/**'
  - 'src/routes/api/latex/**'
  - src/lib/server/validation/latex.ts
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
  `load`). SvelteKit 3 lui passe toutes les erreurs avec un `kind` : une 404 de
  navigation (`framework`) part en `warning`, une exception (`unknown`) en `error`, une
  erreur voulue (`app`, levée par `error(...)`) n'est pas journalisée.
- `src/lib/utils/errorMonitoring.ts` :
  - écoute `error` et `unhandledrejection` sur `window` ;
  - API manuelle : `captureError`, `captureValidationError`, `capturePerformance`,
    `flushErrors` ;
  - `initWebVitals` : observe LCP, CLS, INP, etc. ; une valeur au-dessus du seuil part
    en `performance` (rien n'est envoyé si la sévérité vaut `info`) ; l'URL passe par
    `sanitizeUrl` (paramètres `token`, `key`, `secret`, `password`, `auth`, `session`,
    `code` remplacés par `[REDACTED]`) ; un FCP ou un LCP mesuré après le premier passage
    de la page en arrière-plan est écarté (`web-vitals-visibilite.ts`, même règle que
    `web-vitals` : un onglet ouvert en arrière-plan donnait des « LCP » de plusieurs heures) ;
    INP et CLS partent au passage en arrière-plan, mais seulement s'ils ont grandi depuis
    le dernier envoi (avant, un onglet ouvert des jours renvoyait le même INP dès la fin
    de la fenêtre anti-doublon de 5 minutes : jusqu'à 28 fois la même valeur) ;
  - **mesures gardées chez nous** (depuis novembre 2026, cf. ci-dessous) : `initWebVitals`
    remet aussi **toutes** les mesures, bonnes comprises, à `createSampleCollector`
    (`web-vitals-mesures.ts`), qui les envoie à `/api/web-vitals` au passage en arrière-plan ;
  - INP (`inp-tracker.ts`) : seuls les événements d'une interaction comptent
    (`interactionId` non nul ; survol, défilement exclus) ; une interaction vaut son
    événement le plus lent ; la plus lente par tranche de 50 interactions est écartée
    (`performance.interactionCount`, à défaut les interactions observées). L'URL envoyée est
    celle de la page où l'interaction a commencé (relevée au `pointerdown` / `keydown`), pas
    celle du passage en arrière-plan. `context` reçoit `event_name` (`pointerup`, `keydown`…)
    et `target` : balise, `id`, `role` — **jamais d'`aria-label`** (certains portent le nom
    d'un élève) ni de texte saisi ;
  - garde-fous (objet `CONFIG`) : 10 erreurs par minute au plus, file envoyée toutes
    les 10 s ou dès 5 erreurs. « Lot » ne veut dire que regroupement dans le temps :
    chaque erreur part dans son propre `POST` ;
  - dédoublonnage : clé `type:message:fichier:ligne`, oubliée 5 min après un envoi réussi
    (test : `src/lib/utils/__tests__/errorMonitoring-dedup.svelte.test.ts`).
- Autres émetteurs directs de `/api/errors/log` : `src/lib/stores/minesweeper.svelte.ts`.
- `src/lib/utils/errors.ts` sert à **afficher** une erreur, pas à la remonter :
  - `readApiErrorMessage(response)` lit le message d'une réponse d'API en échec :
    `{ message }` (erreur SvelteKit) ou `{ error }` (`Response.json({ error })`), sinon
    « Erreur <statut> ». Jamais le corps brut. Sans appelant depuis le
    retrait de `VariantPreview.svelte` (testée seule) ;
  - `formatUserError(error)` : message lisible d'une exception (champ `details` de
    Supabase s'il existe) ;
  - `logNonCriticalError(contexte, error)` : un `console.warn`, rien d'envoyé.

### Erreurs côté serveur

- **Mesures de performance gardées chez nous** (`web_vital_samples`, chantier `amelioration`,
  novembre 2026 : Vercel a rendu payant le détail de Speed Insights). Le journal des erreurs ne
  reçoit que les mauvaises mesures, donc pas de quoi calculer un p75 ; cette table reçoit tout.
  - **Navigateur** (`web-vitals-mesures.ts`, branché dans `initWebVitals`) : TTFB, FCP et LCP
    sont rattachés à la page d'arrivée (le dernier LCP observé), le CLS (pire rafale de
    décalages, définition de Google) à la page courante, l'INP à la page où l'interaction a
    commencé. **Tout part une seule fois, au premier passage de la page
    en arrière-plan** : une ligne par visite et par indicateur (la table est anonyme, rien ne
    relierait deux envois d'une même visite) ; ce qui se passe après le retour sur l'onglet
    n'est pas mesuré ici. Le TTFB envoyé ici
    est compté depuis le début de la navigation (définition de Google), pas depuis l'envoi de
    la requête comme celui du journal des erreurs. Sans prise en charge de `layout-shift`
    (Safari), aucun CLS ne part. Rien n'est envoyé en développement. Limites à connaître pour
    lire le relevé : un FCP ou un LCP arrivé après l'envoi est perdu ; le CLS est celui
    de toute la visite, rattaché à la page affichée au moment de l'envoi, pas à celle où le
    décalage a eu lieu ; une arrivée sur une page sans route (404) n'envoie pas son chargement.
  - **Page = identifiant de route SvelteKit** (`/(public)/cours/[token]`), noté par le layout
    racine (`afterNavigate` → `noteWebVitalsRoute`). Jamais `url.pathname` : l'adresse réelle
    peut porter un jeton.
  - **Pages comptées** (`isMeasuredRoute`) : toutes, sauf l'admin et `/dev`.
  - **Serveur** (`POST /api/web-vitals`, `src/lib/server/web-vitals/reception.ts`) : route
    ouverte, sans compte, qui **ne se sert pas de la session** (les hooks la lisent comme pour
    toute requête). Elle n'écrit qu'en prod (`VERCEL_ENV=production`), limite à 30 envois par
    minute et par adresse (préfixe /64 en IPv6 ; la clé du compteur est une empreinte de
    l'adresse, un pseudonyme gardé dans `rate_limits` jusqu'à la purge quotidienne) et à 2 000
    envois par heure pour tout le site (clé `web-vitals:global`), valide l'enveloppe (400 sinon),
    puis écarte une à une les mesures hors bornes (durée > 10 min, CLS > 100) ou dont la route
    n'est pas une **page du site** (`KNOWN_ROUTES`, tirée des fichiers `+page.svelte`). C'est
    cette liste, pas la contrainte de la table, qui garantit qu'aucun jeton n'est écrit. Le
    serveur n'insère que `route`, `metric`, `value`, `device_type` : la base fixe la date
    (arrondie à l'heure) et l'identifiant.
  - **Risque résiduel** : l'heure est arrondie, mais qui lit la base (admin, serveur) peut
    retrouver l'ordre d'écriture des lignes (ordre physique, numéro de transaction) et les
    situer entre deux lignes horodatées d'une autre table. Les deux limites de débit échouent
    ouvertes (panne du compteur = pas de limite).
  - Lecture des lignes : admin seul ; purge à 90 jours.
  - **Relevé** (`GET /api/web-vitals/releve?days=28`, `src/lib/server/web-vitals/releve.ts`) :
    pour le relevé mensuel de GitHub. Jeton dédié `WEB_VITALS_RELEVE_TOKEN` en
    `Authorization: Bearer` (comparé en temps constant ; variable absente ou de moins de 32 caractères = 503), 10 appels par
    minute et par adresse comptés avant le jeton, `days` de 1 à 90 (400 sinon). La route ne se
    sert pas de la session et ne rend que des résultats calculés : nombre de mesures par
    indicateur, pour tout le site et par page, et p75 à partir de 5 mesures ; ni ligne, ni date,
    ni type d'appareil. Période en jours entiers (UTC), journée en cours exclue : interroger la
    route en boucle ne défait pas l'arrondi à l'heure de `created_at`. Elle lit la table avec le
    client service, par pages de 1 000 dans l'ordre des identifiants (tirés au hasard, jamais
    l'ordre d'arrivée), 100 000 lignes au plus (`truncated` au-delà). Usage :
    [core-web-vitals.md](../pratiques/core-web-vitals.md).
- `src/lib/server/errorMonitoring.ts` est le seul écrivain de `error_logs` :
  - `logError` nettoie (`sanitizeErrorData`), tronque (message 1 000, pile 5 000, URL
    500 caractères), puis insère avec le **client service** (la RLS n'autorise
    l'insertion qu'à l'admin). Une erreur `critical` déclenche `notifyCriticalError` :
    notification urgente à tous les admins (`createSystemNotification`), message et URL
    échappés (`escapeHtml`) : ils s'affichent comme du texte ;
  - `getUserContext` ajoute `user_id` et `user_role` ;
  - lecture : `getErrorStats` (RPC `get_error_stats`),
    `getErrorOccurrences`, `getErrorLog` ;
  - résolution et purge : `resolveError` (RPC `resolve_error`),
    `resolveErrorBySignature`,
    `deleteAllResolvedErrors` (RPC `delete_all_resolved_errors`).
- Appelants dans le serveur : `src/hooks.server.ts` (`errorMonitoringHandle` : exceptions
  non rattrapées, et requêtes de plus de 3 s en `performance` ; aussi profil absent ou
  illisible), `src/routes/(protected)/+layout.server.ts` (profil absent).
- En base (baseline `supabase/migrations/20260616220000_baseline_schema.sql`) :
  déclencheurs `trigger_set_error_signature` (empreinte SHA-256 via
  `generate_error_signature`) et `trigger_update_error_occurrence` (compteur dans
  `error_occurrences` via `upsert_error_occurrence`).

### Routes `api/errors`

| Route                              | Qui                             | Rôle                                                                                                                          |
| ---------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/errors/log`             | tout le monde, même sans compte | écrit une erreur ; 20 par minute et par IP ; sans compte approuvé, `critical` devient `error` ; `context` ≤ 10 000 caractères |
| `POST /api/errors/bulk-resolve`    | admin (ou prof élevé)           | résout par empreinte tout ce qui correspond aux filtres                                                                       |
| `POST /api/errors/delete-resolved` | admin (ou prof élevé)           | supprime toutes les erreurs résolues (client service)                                                                         |

Les deux routes admin se gardent par `requireAdmin` (vrai compte admin, ou prof en mode
administration : [auth.md](auth.md) § Élévation admin) ; `bulk-resolve` écrit avec le client rendu.

Pages admin : `/dashboard/admin/errors` (statistiques 24 h et occurrences, filtres
`type`, `severity`, `resolved`, `search` dans l'adresse), `/dashboard/admin/errors/[id]`
(détail, action `resolve`), `/dev/erreurs/surveillance` (ex-`/dashboard/admin/errors/test`,
admin seul, textes en français : boutons qui provoquent des erreurs de test).

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
  saisie. État gardé dans `sessionStorage` (clé `chiphre_freeze_data`), gels gardés 15 min.
  Les adresses (navigations, gels) sont retenues **sans paramètres ni fragment** (`pageAddress`) :
  un lien de réinitialisation ne finit pas dans un rapport. `clearFreezeDetectionData()` vide
  tout, appelée par `clearWorkData` (déconnexion, suppression du compte, autre compte sur
  l'appareil) et par un onglet qui voit le compte changer ailleurs, avant de se recharger
  (voir [RGPD](conformite/rgpd.md)) ;
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
  et par compte, notifie les admins par `notifyAdminsOfNewBugReport`). Le contexte envoyé
  par le client ne peut pas porter d'erreurs (`recentErrors`, `slowRequests` absents du
  schéma).
- **Erreurs jointes à la lecture** : `attachReportErrors` (`src/lib/server/bug-report-errors.ts`)
  lit dans `error_logs`, avec le client de l'admin, les erreurs de l'auteur des 5 minutes qui
  précèdent le signalement, et les range dans `session_context.recentErrors` et `slowRequests`
  (requêtes lentes, `error_type = 'performance'`). Appelée par la page
  `/dashboard/admin/bug-reports` (une seule lecture pour la liste) et par l'export. Rien n'est
  enregistré : un signalement de plus de 30 jours n'a plus d'erreurs (purge du journal).
- **`/api/bug-reports/[reportId]`** : `GET` ; `PATCH` (l'auteur modifie titre et
  description tant que le statut vaut `pending` ; l'admin change statut et notes) ;
  `DELETE` (admin).
- **`/api/bug-reports/batch`** : `PATCH` et `DELETE` en lot, admin, 100 rapports au plus.
  Chaque écriture vérifie ses lignes : un rapport intact (inconnu, refus de la RLS) va dans
  `failed`, et `success` ne vaut `true` que si tout le lot a été traité.
- **`/api/bug-reports/[reportId]/screenshot`** : `POST`, l'auteur seul. Taille plafonnée
  par `MAX_IMAGE_SIZE_BYTES`, signature binaire vérifiée (`validateFileSignature`).
  Chemin `<id utilisateur>/<id du rapport>/<horodatage>.<ext>` dans le bucket
  `bug-report-screenshots` ; l'extension vient du type vérifié (`jpg`, `png`, `gif`, `webp`),
  jamais du nom du fichier. L'ancienne capture n'est retirée qu'une fois la nouvelle rattachée
  au rapport. Si la mise à jour du rapport ne touche aucune ligne (rapport plus `pending`, refus
  de la RLS), le fichier envoyé est retiré, l'ancienne capture reste, et la route rend 403.
- **Suppression d'un rapport** (`DELETE` seul ou en lot, admin) : `deleteBugReportWithScreenshot`
  retire d'abord la capture du bucket, puis la ligne. Capture impossible à effacer → la ligne
  est gardée (500 « Suppression impossible : la capture n'a pas pu être effacée », ou une
  ligne `failed` dans le lot).
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
`/api/bug-reports/config` : `GET` pour tout compte connecté, `PATCH` admin (`requireAdmin` : le prof en
mode administration passe aussi, [auth.md](auth.md)). Côté client,
`bugReportsConfigStore` (`src/lib/stores/bugReportsConfig.svelte.ts`), valeurs par
défaut `DEFAULT_BUG_REPORTS_CONFIG` (tout à `true`). Réglage : `BugReportsConfigCard`, sur
`/dashboard/admin/bug-reports` et `/dashboard/admin/settings`.

### Santé

- Pas de route publique « le site est-il en vie ? » : `GET /api/health`, sans appelant, a été
  supprimée le 2026-10-13 (décision de David ; Vercel surveille le site).
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
- `/dev/*` (admin seul, hors du tableau de bord) : pages d'essai (session, RLS, avatar, roue,
  PDF Typst et LaTeX, MathField, carte question, éditeur riche…), listées par `/dev`. Plus rien
  sous `/dashboard/admin/debug/`. Les anciennes adresses sont redirigées en 308 ([auth.md](auth.md)).
- `/dashboard/admin/integrite-donnees` (ex-`/dashboard/admin/debug/database`, « Intégrité des
  données ») : comptes par rôle, élèves non activés, profils sans nom, sans école ou sans classe,
  dernières inscriptions (`requireAdmin`, e-mails masqués).
- `POST /api/latex/compile` (vérifié le 2026-10-13) : relais vers `texlive.net`
  (`latexcgi`) pour la page `/dev/pdf-latex`, son seul appelant. Compte exigé
  (`requireAuth`, l'ancien relais ouvert du finding H13) ; Zod `compileLatexSchema`
  (`src/lib/server/validation/latex.ts` : 50 000 caractères au plus, `svg` / `png` / `pdf`,
  corps 8 à 72). La réponse de texlive.net est renvoyée telle quelle, avec son `Content-Type`.
- `src/lib/utils/version.ts` : `getVersion()` / `getRawVersion()`, lisent
  `__APP_VERSION__` injecté par `vite.config.ts`. Affichés par `InfoPanel.svelte` et la
  page admin des réglages.

### OpenAPI et la page Swagger

- `src/lib/server/openapi/generator.ts` : `generateOpenAPISpec()` écrit **à la main** une
  spécification OpenAPI 3.1 de 11 chemins.
- `GET /api/openapi.json` : admin seul, `Cache-Control: private, no-store`.
- `/dev/api` (ex-`/dashboard/admin/debug/api-docs` ; admin seul : garde de `/dev` et `requireAdmin`
  dans `+page.server.ts` ; `ssr = false`, entrée « API (Swagger) » de `/dev`) :
  Swagger UI chargé depuis `unpkg.com` (version épinglée 5.11.0, autorisée par la CSP de
  `src/hooks.server.ts`), qui lit
  `/api/openapi.json`. Jusqu'au 2026-10-13, la page était publique (`/api-docs`) et
  montrait un Swagger vide aux non-admins.

## Invariants

### Qui lit quoi

- `error_logs` et `error_occurrences` : **lecture admin seul** (policies
  `admin_view_error_logs`, `admin_view_error_occurrences`). Écriture par le client service
  dans `logError`. Toutes les pages et routes de lecture passent par `requireAdmin` ou
  `requireRole(locals, 'admin')`.
- `bug_reports` : l'auteur voit les siens et modifie les siens **tant qu'ils sont
  `pending`** ; l'admin voit, modifie et supprime tout. Les routes recopient ces règles
  (403 si ce n'est ni l'auteur ni l'admin). L'auteur n'écrit que le titre, la description et
  la capture, et un rapport naît toujours `pending`, sans capture ni résolution : deux gardes
  en base (`20261126060048`) refusent le reste, même par l'API de la base →
  [base-de-donnees.md](base-de-donnees.md#exploitation-journaux-configuration-cache).
- `bug_reports_config` : lisible par tout compte connecté, modifiable par l'admin.
- Captures : bucket privé ; l'auteur lit son propre dossier (premier segment = son id),
  l'admin tout. Les policies du storage sont dans
  `supabase/migrations/20261126060050_captures_rapports_de_bug_regles_de_stockage.sql`
  (recopie de celles de la prod) ; le bucket lui-même est créé par `supabase/seed.sql`.

### Données d'élèves mineurs

- `logError` masque les clés sensibles (`password`, `token`, `secret`, `api_key`, `auth`,
  `credential`, `session`, `cookie`, `bearer`) dans en-têtes, corps et contexte, et les
  adresses mail dans le message, la pile, l'URL **et toutes les valeurs texte** des en-têtes, du
  corps et du contexte, quel que soit le nom de la clé (depuis le 2026-10-13). Aucun appelant
  ne range plus `user_email` dans le contexte : `user_id` suffit.
- Le jeton d'un lien du carnet de liaison (ADR 0040) est dans le CHEMIN (`/carnet/<jeton>`,
  `/carnet/confirmer/<jeton>`), que `sanitizeUrl` ne voit pas : `logError` le remplace par
  `[token]` dans l'URL et le message (`redactSecretUrl`, `src/lib/utils/analytics-redact.ts`,
  depuis le 2026-11-16) ; de même le jeton d'une invitation de cours particulier
  (`/auth/register/invitation/<jeton>`, depuis le 2026-11-25). Toutes les sources y passent : navigateur (`/api/errors/log`), requête
  lente et exception de `hooks.server.ts`.
- Les valeurs texte du `context` passent aussi par `redactSecretUrl` (`redactValue` dans
  `sanitizeObject`, depuis le 2026-11-25) : `freezeDetection` y range l'URL de la page
  (`context.url` d'une tâche longue ou d'un gel), que le masquage de `url` ne voyait pas.
- Une erreur porte `user_id` et `user_role` si l'utilisateur est connecté.
- Un signalement porte l'URL, le user-agent, les sélecteurs des dernières actions. Les
  erreurs récentes de l'auteur n'y sont **pas** enregistrées : son auteur peut le relire, et
  ces erreurs sont réservées à l'admin, qui les voit jointes à la lecture. La capture peut montrer n'importe quoi de l'écran (nom, copie d'un
  camarade) : d'où le bucket privé et les URL signées.
- L'export pour Claude Code contient le nom (ou le mail) de l'auteur et une URL de capture
  valable **7 jours**.
- Suppression de compte : les captures de l'utilisateur sont retirées du storage, en ne
  gardant que les chemins de la forme `<son id>/<id d'un de ses rapports>/…`
  (migration `supabase/migrations/20261016101200_suppression_chemins_conformes.sql`).

### Limites de débit

En base, partagées par toutes les instances (`rateLimit()`, voir [serveur.md](serveur.md) §1.5) : `error-log:<ip>` 20/min,
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
- `src/lib/server/__tests__/bug-report-errors.test.ts` : erreurs de l'auteur dans la fenêtre de
  5 minutes, et seulement elles ; requêtes lentes à part ; copie ancienne remplacée ; une lecture
  pour toute la liste ; panne sans casse.
- `src/routes/api/bug-reports/__tests__/sans-erreurs-a-la-creation.test.ts` : la création ne lit
  pas `error_logs` et n'enregistre pas d'erreurs envoyées par le client.
- `src/routes/api/bug-reports/[reportId]/export/__tests__/erreurs-jointes.test.ts` : l'export
  contient l'erreur de l'auteur.
- `src/routes/api/bug-reports/__tests__/write-verdict.test.ts` : zéro ligne touchée n'est pas
  un succès — `DELETE` d'un rapport → 404 ; dans un lot, chaque rapport intact passe dans
  `failed` et `success` vaut `false` ; capture non rattachée au rapport → 403 et fichier retiré
  du bucket ; rapport supprimé → sa capture retirée du bucket avant la ligne, et ligne gardée
  si le bucket refuse.
- `src/lib/server/__tests__/errorMonitoring-journal.test.ts` : adresses masquées dans le
  contexte et l'URL, jeton du carnet masqué dans l'URL et le message, message de l'alerte
  critique échappé.
- `src/routes/api/errors/log/__tests__/log.test.ts` : `critical` ramené à `error` sans compte approuvé,
  taille du contexte bornée.
- `tests/integration/database/error-monitoring-triggers.test.ts` : empreinte SHA-256 et
  regroupement en base.
- `tests/integration/resources-view-search.test.ts` : vue `resources` et `search_resources`
  (un élève ne voit rien de plus ; anon n'a aucun droit).
- `tests/integration/suppression-compte-art17.test.ts` : captures retirées à la suppression
  du compte.
- `src/lib/__tests__/cdn-versions-epinglees.test.ts` : l'URL Swagger d'`unpkg` porte une version.

- `src/lib/utils/__tests__/traces-onglet-effacees.svelte.test.ts` : les adresses visitées
  partent à la déconnexion, quand un autre compte prend l'onglet ou un autre onglet, restent pour
  le même compte ; une navigation est retenue sans ses paramètres.

Rien d'autre ne teste `freezeDetection.ts` (ni les gels, ni le battement), les pages admin, ni
`docs-scanner.ts`.

## Décisions

- [ADR 0002](../adr/0002-mono-professeur-ecole-frontiere-sociale.md) : modèle un prof + un
  admin ; ici, seul l'admin lit journaux et signalements des autres.
- [ADR 0003](../adr/0003-donnees-hebergees-en-ue.md) : journaux et captures restent dans le
  projet Supabase européen.
- Conservation de 30 jours des journaux : décisions C11 de David (2026-10-11), en-tête de
  `supabase/migrations/20261015090500_conservation_c11.sql`.
- Erreurs jointes aux signalements : lisibles par l'admin seul (David, 2026-10-13). Lues à la
  lecture du signalement, jamais copiées dedans. Suppression de `GET /api/health` : David,
  même jour.

## Écarts connus

Constatés le 2026-10-13, non corrigés.

- **Notification critique** : `system_event_type: 'assessment_graded'` faute de valeur
  adaptée (commentaire dans le code).
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
  dans les signalements.
- **Doc admin** : la recherche (`?q=`) s'affiche mais ne cherche rien (aucune fonction
  de recherche depuis le 2026-10-13) ; `CATEGORY_CONFIG` nomme des dossiers
  (`features`, `architecture`, `guides`…) qui n'existent plus dans `docs/`. Lecture
  de `docs/` sur le disque au moment de la requête : non vérifié que ces fichiers sont
  présents dans le déploiement Vercel.
- **OpenAPI** : 11 chemins sur environ 380 routes, dont 4 qui n'existent plus en tant que
  route (`/api/messages`, `/api/questions`, `/api/notifications`, `/api/rewards/award`).
- **Commentaire périmé** : l'en-tête de `healthStats.ts` dit que `server_cache`,
  `background_job_runs` et les vues `admin_*` manquent dans `database.ts` ; elles y sont.
- **`/api/latex/compile` répond 500 à une entrée invalide** : le `throw error(400, …)` de la
  validation (et l'erreur d'un texlive.net en panne) est rattrapé par le `catch` global, qui
  relance un 500 « Compilation failed: Unknown error » (`HttpError` n'étend pas `Error`).
