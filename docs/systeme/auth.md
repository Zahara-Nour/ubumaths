---
couvre:
  - src/hooks.server.ts
  - src/app.d.ts
  - src/lib/server/supabase.ts
  - src/lib/server/auth.ts
  - src/lib/server/accountStatusHandle.ts
  - src/lib/server/redirectHandle.ts
  - 'src/lib/server/auth/**'
  - 'src/lib/server/middleware/**'
  - src/lib/server/adminElevation.ts
  - src/lib/server/reservedAreasHandle.ts
  - src/lib/server/elevation-redirect.ts
  - src/lib/server/serviceRoleClient.ts
  - src/lib/server/rateLimiter.ts
  - src/lib/server/response-floor.ts
  - src/lib/server/after-response.ts
  - src/lib/server/csrfHandle.ts
  - src/lib/server/passwordPolicy.ts
  - src/lib/server/validateRedirectUrl.ts
  - src/lib/server/private-response.ts
  - src/lib/utils/session-cookies.ts
  - src/lib/server/validation/auth.ts
  - src/lib/utils/child-account.ts
  - src/lib/server/child-registration.ts
  - src/lib/server/child-password.ts
  - src/lib/server/passwordChangeHandle.ts
  - src/lib/email-templates/child-password-reset.ts
  - src/lib/server/validation/admin-elevation.ts
  - src/lib/server/google/oauth.ts
  - src/lib/server/google/encryption.ts
  - src/lib/config/google-login.ts
  - src/lib/config/google-classroom.ts
  - src/lib/components/UserAvatar.svelte
  - 'src/routes/(public)/auth/**'
  - 'src/routes/(protected)/+layout.server.ts'
  - 'src/routes/(protected)/dashboard/admin/+layout.server.ts'
  - 'src/routes/(protected)/dashboard/elevate/**'
  - 'src/routes/api/admin/elevate/**'
  - 'src/routes/api/admin/users/*/status/**'
  - 'src/routes/api/admin/users/*/password/**'
  - 'src/routes/api/google/auth/**'
---

# Authentification, profils et élévation admin

> Remplace les 11 fichiers de [`auth/`](../archive/systeme-2026-06/auth/README.md) (juin 2026, archivés, antérieurs au modèle
> mono-professeur). En cas de désaccord, **cette page et le code font foi**.
>
> Vérifié contre le code le 2026-10-22.

## À quoi ça sert

Savoir **qui** fait une requête (connexion, session) et **ce qu'il a le droit de faire**
(rôle, statut du compte, élévation admin). Vocabulaire du domaine — Professeur, Admin, Élève,
École, Classe, Élève hors-classe — : [CONTEXT.md](../../CONTEXT.md#les-personnes-et-les-frontières).

Trois rôles (`profiles.role`, enum `user_role`) :

| Rôle      | Qui                                                                              |
| --------- | -------------------------------------------------------------------------------- |
| `teacher` | Le professeur **unique** (verrou base : trigger `enforce_single_teacher`).       |
| `admin`   | Un compte **distinct**, rejoint par le prof via l'**élévation** (voir plus bas). |
| `student` | Les élèves, mineurs, sous RGPD.                                                  |

Le mot « auth » recouvre **deux processus sans rapport** — ne jamais les confondre :

| Processus                         | Ce que c'est                                                                              | Donne une session ? |
| --------------------------------- | ----------------------------------------------------------------------------------------- | ------------------- |
| **Connexion** (Supabase Auth)     | Un utilisateur se connecte : e-mail (ou identifiant) + mot de passe (Google : désactivé). | **Oui**             |
| **Autorisation Google Classroom** | Le prof autorise Chiphre à appeler les API Google (OAuth 2.0 + PKCE). Désactivée.         | **Non**             |

Deux callbacks différents : `/auth/callback` (connexion Google) ≠ `/api/google/auth/callback` (Classroom).

## Vue d'ensemble : les parcours d'un élève

Trois questions **indépendantes**, à ne pas mélanger :

1. **Le compte** : avec quoi l'élève se connecte (vraie adresse ou identifiant).
2. **Le statut** : le prof doit-il approuver le compte avant qu'il serve (§ « Le statut du compte ») ?
3. **Le consentement parental** : faut-il l'accord d'un parent pour l'accès complet (§ « Consentement parental ») ?

### Comment naît un compte élève

| Situation                                     | Écran                                               | Connexion                                                                                  | Statut                                        |
| --------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------- |
| **A. Élève seul, code de classe valide**      | « Je m'inscris » `/auth/register`                   | son adresse + mot de passe (après le clic de confirmation reçu à cette adresse)            | **approuvé** d'office, inscrit dans la classe |
| **A′. Même chose avec l'adresse d'un parent** | « Je m'inscris »                                    | l'adresse **du parent** sert d'adresse de connexion ; c'est lui qui reçoit la confirmation | approuvé d'office                             |
| **B. Parent pour un enfant sans adresse**     | « J'inscris mon enfant » `/auth/register/parent`    | **identifiant** (`noelie042`) + mot de passe choisi par le parent ; aucune confirmation    | approuvé d'office, inscrit dans la classe     |
| **C. Sans code, ou code faux**                | « Je m'inscris »                                    | son adresse                                                                                | **en attente** : bloqué jusqu'à l'approbation |
| **D. Élève importé par l'admin**              | import admin, puis inscription avec la même adresse | son adresse                                                                                | approuvé, déjà dans ses classes               |

Google est coupé (`GOOGLE_LOGIN_ENABLED`). Derrière l'identifiant du cas B, une adresse fictive
`…@eleves.chiph.re` qui ne reçoit rien : aucun courriel n'y part jamais (§ « Le domaine fictif »).

### Le consentement parental

**Concernés** : tout niveau **sauf 1re et terminale** (primaire, collège, 2nde et niveau inconnu
compris ; question d'âge en 2nde). Le prof peut dispenser un élève. **Sans consentement**, l'élève
est en **lecture seule** : il consulte, mais **rien de ce qu'il fait n'est enregistré**. Le
consentement couvre la collecte de ses données d'activité (RGPD art. 8), pas seulement le social :
`requireConsent` (403) ferme exercices terminés, révisions, énigmes, exercices Python, scores et
pouvoirs des jeux, messages, chat, marché, cartes VIP ; la base garde en plus messages, marché et
démineur (`guard_read_only_author`, voir [conformite/](conformite/consentement-parental.md)).

| Situation       | Avant la lecture seule                        | Comment le lien part au parent                                                              |
| --------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **A, A′, C, D** | **30 jours** d'accès complet (délai de grâce) | **le prof** saisit l'adresse du parent dans sa page des consentements et envoie le lien     |
| **B**           | **aucun** : lecture seule dès la création     | **automatiquement** : un seul courriel au parent, avec l'identifiant de l'enfant et le lien |

Le lien `/consent/[token]` recueille le consentement (case explicite). En 1re/Tle par l'écran du
parent (cas B), le même lien sert seulement à **confirmer l'adresse du parent**. Le parent n'a
**jamais de compte** et ne voit rien du compte de l'enfant.

### Mot de passe oublié

| Compte                           | Qui peut le remettre                                                                                                                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Adresse réelle** (A, A′, C, D) | l'élève : « Mot de passe oublié » envoie le lien **à l'adresse du compte** (donc au parent en A′)                                                                                        |
| **Identifiant** (B)              | **le parent** : « Mot de passe oublié » avec l'identifiant → lien à son adresse, **seulement s'il a déjà cliqué son lien de consentement** ; sinon rien ne part, le prof prend le relais |
| **Tous**                         | **le prof** : « Réinitialiser » dans le panneau de l'élève → mot de passe provisoire affiché une fois, à changer à la connexion suivante                                                 |
| **Tous**                         | **l'élève** connecté : « Changer mon mot de passe » sur son profil (ancien mot de passe exigé)                                                                                           |

**Reporté** (2026-10-22) : dans les cas A et C, l'élève donnerait lui-même l'adresse de son
parent à l'inscription, le lien partant après approbation du prof (§ « Inscription par le
parent », fin). Aujourd'hui, c'est le prof qui saisit cette adresse.

Détail de chaque chemin dans les sections qui suivent ; règle du consentement :
[conformite/](conformite/README.md).

## Carte du code

| Fichier                                           | Rôle                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/hooks.server.ts`                             | Chaîne des handles (ordre ci-dessous) ; `userProfileHandle`, `securityHeadersHandle` ; `csrfHandle` vit dans `src/lib/server/csrfHandle.ts`, `redirectHandle` dans `src/lib/server/redirectHandle.ts`.                                                                                                                                                  |
| `src/lib/server/supabase.ts`                      | Handle Supabase : `locals.supabase` (cookies SSR) et `locals.safeGetSession()`.                                                                                                                                                                                                                                                                         |
| `src/lib/server/auth.ts`                          | Pour les **pages** : `getUserProfile`, `requireAuth(user)` (redirige), `requireRole(profile, …)`, `hasRole`, `hasAnyRole`.                                                                                                                                                                                                                              |
| `src/lib/server/middleware/auth.ts`               | Pour les **API** : `requireAuth(locals)`, `requireRole`, `requireRoles`, `requireAdmin` ; types `UserRole`, `Profile`.                                                                                                                                                                                                                                  |
| `src/lib/server/adminElevation.ts`                | Élévation : cookie `ubu-admin-elevation`, `createAdminClient`, `createEphemeralAuthClient`, `adminElevationHandle`.                                                                                                                                                                                                                                     |
| `src/lib/server/serviceRoleClient.ts`             | `createServiceRoleClient()` — contourne la RLS ; liste `ALLOWED_SERVICE_ROLE_PATHS` (avertissement **en dev seulement**) ; ex. pièces jointes de la messagerie, signées après contrôle RLS ; style d'une fiche pour l'élève destinataire (`worksheet-styles.ts`, lot 4b).                                                                               |
| `src/lib/server/rateLimiter.ts`                   | Limites persistantes (RPC `check_and_increment_rate_limit`, table `rate_limits`) : login, inscription, reset, changement de mot de passe (seau par compte), élévation, OAuth. `response-floor.ts` : durée plancher d'une réponse neutre ; `after-response.ts` : envoi après la réponse (`waitUntil`).                                                   |
| `src/lib/server/middleware/rateLimit.ts`          | Limiteur **en mémoire** (par instance), utilisé par quelques API (`account/delete`, `search`…).                                                                                                                                                                                                                                                         |
| `src/lib/server/validation/auth.ts`               | Zod : `loginFormSchema`, `registerFormSchema`, `requestPasswordResetSchema` (adresse ou identifiant), `updatePasswordSchema`, `parentSetChildPasswordSchema`…                                                                                                                                                                                           |
| `src/lib/server/passwordPolicy.ts`                | `validatePasswordPolicy`, appliquée par les schémas d'inscription et de changement de mot de passe.                                                                                                                                                                                                                                                     |
| `src/lib/utils/child-account.ts`                  | Compte d'un enfant inscrit par son parent : `CHILD_ACCOUNT_DOMAIN` (`eleves.chiph.re`), `normalizeLoginIdentifier` (identifiant → adresse fictive), `isChildAccountEmail` (garde des envois), `childLoginBase` / `pickChildLoginId` / `childAccountEmail` (choix de l'identifiant), `childLoginIdOf` (adresse fictive → identifiant, pour l'affichage). |
| `src/lib/server/child-registration.ts`            | Inscription par le parent : `createChildAccount` (clé service, marque `child_account`), `createParentRequest` / `markParentEmailSent` (demande `parental_consents`), `deleteChildAccount`.                                                                                                                                                              |
| `src/lib/server/child-password.ts`                | Mots de passe des élèves : `findChildResetTarget` / `createChildRecoveryToken` / `setChildPasswordFromToken` (lien du parent), `setProvisionalPassword` / `generateProvisionalPassword` (prof), `verifyCurrentPassword`, `mustChangePassword`, `isFreshEmailLinkSession`.                                                                               |
| `src/lib/server/passwordChangeHandle.ts`          | Handle : mot de passe provisoire à changer avant tout (`app_metadata.must_change_password`).                                                                                                                                                                                                                                                            |
| `src/lib/email-templates/child-password-reset.ts` | Courriel au parent : lien vers `/auth/reset-password/parent?u=<compte>&t=<jeton maison>`, envoyé par `sendChildPasswordResetEmail` (Brevo).                                                                                                                                                                                                             |
| `src/lib/server/validateRedirectUrl.ts`           | Anti open-redirect pour les paramètres `next`.                                                                                                                                                                                                                                                                                                          |
| `src/lib/server/private-response.ts`              | `mustStayPrivate` / `PRIVATE_NO_STORE` : pas de cache partagé pour une réponse connectée ou qui pose un cookie.                                                                                                                                                                                                                                         |
| `src/lib/server/auth/cron.ts`                     | `verifyCronAuth(request)` : `Bearer <CRON_SECRET>` seul pour `/api/cron/*` (`x-vercel-cron`, falsifiable, n'ouvre plus rien).                                                                                                                                                                                                                           |
| `src/lib/server/auth/auth-error-fr.ts`            | `authErrorToFrench` : messages GoTrue traduits.                                                                                                                                                                                                                                                                                                         |
| `src/lib/server/middleware/consent.ts`            | `requireConsent(profile, action)` — voir [conformite/](conformite/).                                                                                                                                                                                                                                                                                    |
| `src/lib/server/middleware/student-access.ts`     | `verifyTeacherStudent`, `verifyTeacherStudentWithRole`.                                                                                                                                                                                                                                                                                                 |
| `src/lib/config/google-login.ts`                  | `GOOGLE_LOGIN_ENABLED = false`.                                                                                                                                                                                                                                                                                                                         |
| `src/lib/config/google-classroom.ts`              | `GOOGLE_CLASSROOM_ENABLED = false`.                                                                                                                                                                                                                                                                                                                     |
| `src/lib/server/google/oauth.ts`, `encryption.ts` | Classroom : `getAuthUrl`, `exchangeCodeForTokens`, `refreshAccessToken`, `revokeAccess` ; `encryptToken`/`decryptToken`.                                                                                                                                                                                                                                |
| `src/app.d.ts`                                    | Type de `App.Locals` (`user`, `profile`, `supabase`, `safeGetSession`, `adminSupabase?`, `adminElevation?`).                                                                                                                                                                                                                                            |

Routes :

| Route                                                           | Rôle                                                                                                                                                                                                                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `(public)/auth/login`                                           | Actions `login` (e-mail + mot de passe) et `googleSignIn` (refusée : drapeau à `false`).                                                                                                                                                    |
| `(public)/auth/register`                                        | Inscription autonome d'un élève par **code de classe**.                                                                                                                                                                                     |
| `(public)/auth/register/parent`                                 | « J'inscris mon enfant » : le parent crée le compte d'un enfant sans adresse (identifiant).                                                                                                                                                 |
| `(public)/auth/confirm`                                         | Lien e-mail (`verifyOtp`) : confirmation d'inscription, `recovery` → `/auth/update-password`.                                                                                                                                               |
| `(public)/auth/callback`                                        | Retour de la connexion Google (refusé tant que `GOOGLE_LOGIN_ENABLED` est `false`).                                                                                                                                                         |
| `(public)/auth/reset-password`, `update-password`               | Mot de passe oublié (adresse ou identifiant) / nouveau mot de passe (aussi « Changer mon mot de passe » du profil, `?depuis=profil`, et changement obligatoire).                                                                            |
| `(public)/auth/reset-password/parent`                           | Lien du parent : il choisit le mot de passe de l'enfant **sans session** ; l'ouverture ne consomme pas le jeton, l'envoi du formulaire si.                                                                                                  |
| `(public)/auth/pending-approval`                                | Écran d'attente d'un compte `pending`.                                                                                                                                                                                                      |
| `(public)/auth/logout`                                          | `POST` → `signOut()`, révoque et efface l'élévation admin → `/`. Côté navigateur, `submitLogoutForm` et la page d'attente d'approbation effacent d'abord les données de travail de l'élève (T17, [conformite/rgpd.md](conformite/rgpd.md)). |
| `(protected)/+layout.server.ts`                                 | Garde de groupe des **pages** protégées (session, profil, statut, consentement).                                                                                                                                                            |
| `(protected)/dashboard/admin/+layout.server.ts`                 | Garde de la section admin (élévation ou vrai admin ; deux préfixes ouverts au prof).                                                                                                                                                        |
| `(protected)/dashboard/elevate`                                 | Écran de saisie du mot de passe admin.                                                                                                                                                                                                      |
| `api/admin/elevate`, `api/admin/elevate/revoke`                 | Pose / retire l'élévation.                                                                                                                                                                                                                  |
| `api/admin/search-users/pending`, `api/admin/users/[id]/status` | Approbation des comptes (prof **et** admin, via `requireRoles`).                                                                                                                                                                            |
| `api/admin/users/[id]/password`                                 | `POST` : mot de passe provisoire d'un **élève** (prof ou admin ; `verifyTeacherStudent`), rendu une fois, `Cache-Control: no-store`.                                                                                                        |
| `api/google/auth/{connect,callback,disconnect,status}`          | Autorisation Google Classroom (prof seulement).                                                                                                                                                                                             |

`/login` n'existe pas : `redirectHandle` (`src/lib/server/redirectHandle.ts`) le renvoie en 308
vers `/auth/login` (tests : `src/routes/__tests__/login-redirect.test.ts`,
`src/lib/server/__tests__/redirectHandle.test.ts`). Même filet pour `/cas`, retirée le 2026-10-13 :
`/cas` et `/cas/` mènent à `/atelier` en 308, query string comprise.

## Processus 1 — la connexion (Supabase Auth)

### La chaîne de handles

`hooks.server.ts` enchaîne, **dans cet ordre** (chacun lit ce que le précédent a posé) :

1. `requestIdHandle` — `locals.requestId`, en-tête `X-Request-ID`.
2. `maintenanceHandle` — avant Supabase, pour marcher base gelée.
3. `supabaseHandle` — `locals.supabase` et `locals.safeGetSession`.
4. `redirectHandle` — anciennes routes, dont `/login` et `/cas`.
5. `userProfileHandle` — `locals.user` puis `locals.profile`.
6. `accountStatusHandle` — compte non approuvé : 403 sur toute API et toute écriture (voir « Le statut du compte »).
7. `passwordChangeHandle` — mot de passe provisoire à changer : pages → `/auth/update-password`, API et écritures → 403 (voir « Mots de passe des élèves »).
8. `studentPresenceHandle` — élève connecté au compte approuvé, toute page hors `/api/*` : présence du jour notée au client service, au plus une fois par jour et par instance (mémoire locale, sans cookie) ; sert au « tu m'as manqué » du Palotin ([buddy-palotins.md](buddy-palotins.md#retour-apres-une-longue-absence-2026-10-21)).
9. `adminElevationHandle` — `locals.adminSupabase`, `locals.adminElevation`.
10. `reservedAreasHandle` (`src/lib/server/reservedAreasHandle.ts`) — espaces réservés, par identifiant de route : `/dev` admin seul (vrai compte admin ou prof élevé ; prof non élevé → `/dashboard/elevate?redirect=…`), `/aide-ecriture` prof seul (un vrai compte admin reçoit 403) ; visiteur → `/auth/login` (401 en écriture), sinon 403. Dans le hook et non dans un layout : ni les loads de page parallèles ni les actions n'y échappent (chantier demo-debug, 2026-10-24). ⚠️ En navigation côté client, le hook ne tourne que si le navigateur demande `__data.json` : chaque espace a donc son `+layout.server.ts`, qui force cette requête et refait le contrôle (`checkReservedArea`). Un load universel (`+page.ts`) ou une requête Supabase faite dans le navigateur n'y passent pas : **aucune donnée sensible par là sous `/dev`**.
11. `csrfHandle` — `Origin` doit correspondre à `Host` pour POST/PUT/PATCH/DELETE.
12. `securityHeadersHandle` — CSP, HSTS (prod), `X-Frame-Options`, `Cache-Control: private, no-store` si connecté ou cookie posé.
13. `errorMonitoringHandle` — erreurs et requêtes lentes (> 3 s) vers `error_logs`.

### Session et cookies SSR

- `locals.supabase` est un client `@supabase/ssr` qui lit et écrit les cookies `sb-*`.
  Leur `maxAge` est **plafonné à 30 jours** (le défaut de la bibliothèque est 400 jours),
  **côté serveur comme côté navigateur** : `capSessionCookieOptions`
  (`src/lib/utils/session-cookies.ts`) dans le `setAll` du serveur, et `browserCookieMethods`
  pour le client navigateur de `+layout.ts`. La bibliothèque ignore un `cookieOptions.maxAge`
  (elle le remet à 400 jours) : le plafond ne peut vivre que dans nos `setAll`. Sans celui du
  navigateur, un rafraîchissement de session fait par le navigateur réécrivait le cookie pour
  400 jours (finding A1, corrigé le 2026-10-12).
- `safeGetSession()` appelle **`auth.getUser()`** (vérification auprès du serveur d'auth,
  délai max 15 s, échec → `{ user: null }`). **Jamais `getSession()`** : elle lit le cookie
  sans le vérifier.
- `userProfileHandle` charge le profil par `getUserProfile` (`select('*')` sur `profiles`,
  délai max 10 s). **Session valide sans profil** → journalisé (`profile_not_found`),
  `signOut()`, redirection `/auth/login?error=…`. Même chemin si la lecture échoue.
- `+layout.server.ts` (racine) transmet `user`, `profile` et les cookies `sb-*` au client ;
  `+layout.ts` crée le client navigateur avec un **`import()` dynamique** de `@supabase/ssr`
  (bug TDZ de Safari : [safari-webkit-tdz](../pratiques/safari-webkit-tdz.md)) et réagit à
  `onAuthStateChange` par `invalidate('supabase:auth')` — on ne fait jamais confiance à la
  session reçue côté client, on redemande au serveur.

### Les chemins d'entrée

- **E-mail + mot de passe** (`/auth/login`, action `login`) : Zod → limite par IP **et** par
  e-mail → `signInWithPassword` côté serveur (les cookies sont posés par le handle). Toute
  erreur rend le **même** message « Identifiants invalides. » (pas d'énumération des comptes).
  Le champ « Adresse email ou identifiant » accepte aussi l'**identifiant** d'un enfant inscrit
  par son parent (`noelie042`) : une saisie sans `@` est ramenée à `[a-z0-9]` (sans accent ni
  majuscule) puis changée en `noelie042@eleves.chiph.re` par `loginFormSchema`
  (`normalizeLoginIdentifier`). Le formulaire réaffiche la saisie brute, jamais l'adresse fictive.
- **Google** : `googleSignIn` et `/auth/callback` sont **coupés côté serveur** tant que
  `GOOGLE_LOGIN_ENABLED` vaut `false` (la plateforme a quitté le domaine Google Workspace de
  l'ancienne école). La plomberie reste : domaine `@voltairedoha.com` imposé, profil manquant
  créé par le client service (`student`, `pending`, sans école), `next` passé par
  `validateRedirectUrl`.
- **Mot de passe oublié** : `/auth/reset-password` (Zod, limites IP + e-mail, réponse neutre
  rendue après une **durée plancher de 2 s** sur tous les chemins — `waitForResponseFloor` —
  pour que le temps ne trahisse pas un enfant à parent confirmé ; pour un identifiant d'enfant,
  la recherche du parent et l'envoi Brevo partent **après la réponse**, par `runAfterResponse`
  (`src/lib/server/after-response.ts`, `waitUntil` de `@vercel/functions` : un Brevo lent ne
  dépasse plus le plancher) → e-mail → `/auth/confirm?type=recovery` → `/auth/update-password`. Le champ accepte aussi
  l'identifiant d'un enfant : le lien part alors au **parent** (voir « Mots de passe des
  élèves »), jamais à l'adresse fictive.

### Le domaine fictif `eleves.chiph.re`

Un enfant sans adresse a un compte Supabase à l'adresse `<identifiant>@eleves.chiph.re`. Ce
domaine ne reçoit rien : il est **absent du DNS** (NXDOMAIN, vérifié le 2026-10-21). Un
enregistrement « null MX » (`MX 0 .`) chez OVH est une précaution **facultative** (David,
2026-10-21) : il ne servirait que si un futur joker `*.chiph.re` faisait exister le domaine. **Aucun courriel ne part vers ce domaine** : `sendEmail` (Brevo, donc
bienvenue et consentement) le refuse, `/auth/reset-password` ne le transmet pas à GoTrue (le
lien part au parent par Brevo), `/auth/register` refuse une telle adresse.

**La base réserve le domaine au serveur** (`20261021220000_domaine_fictif_reserve_au_serveur`) :
le trigger de contrainte `guard_child_account_domain_trg` sur `auth.users` refuse toute adresse
`@eleves.chiph.re` sans `app_metadata.child_account = true`, marque que seule la clé service
pose. Un `signUp` GoTrue direct ne peut donc pas squatter un identifiant. Il est **différé**
(vérifié au commit) : GoTrue insère le compte puis écrit ses `app_metadata` par un UPDATE dans
la même transaction, qu'un trigger BEFORE INSERT ne verrait pas. Un `/auth/v1/recover` direct sur
une adresse fictive ne part nulle part (domaine absent du DNS). Chantier :
[inscription-parent](../archive/wip/inscription-parent-progress.md).

### Mots de passe des élèves

Trois recours (chantier [inscription-parent](../archive/wip/inscription-parent-progress.md), PR 3,
décisions R1-R4 du 2026-10-21), dans `src/lib/server/child-password.ts` :

- **Le parent** d'un enfant à identifiant : « Mot de passe oublié » avec l'identifiant →
  `findChildResetTarget` prend la demande `parental_consents` **la plus récente** ; le lien ne
  part que si elle est `granted` (adresse confirmée, R1), sinon rien (réponse neutre, le prof
  reste le recours). Le jeton est **à nous**, jamais un jeton de GoTrue : celui de
  `auth.admin.generateLink`, présenté à `/auth/confirm` ou `/auth/v1/verify`, ouvrirait une
  session sur le compte de l'enfant (audit de la PR 3, B1). `createChildResetToken` tire 32
  octets aléatoires et ne garde que leur empreinte SHA-256 et l'échéance (1 h) dans
  `app_metadata.password_reset` de l'enfant (écrit par la clé service seulement ; une nouvelle
  demande remplace la précédente). Brevo envoie au parent le lien `?u=<compte>&t=<jeton>`
  (`sendChildPasswordResetEmail`). La page `/auth/reset-password/parent` valide le lien par Zod
  (`childResetLinkSchema` : uuid, jeton base64url de 20 à 128 caractères) ; son ouverture ne
  consomme rien (les antivirus ouvrent les liens). À l'envoi du formulaire,
  `setChildPasswordFromToken` relit le compte dans GoTrue, refuse un compte qui n'est pas un
  enfant (`app_metadata.child_account`), compare l'empreinte en temps constant, puis change le
  mot de passe par la clé service et efface le jeton — **aucune session n'est ouverte : le
  parent n'est jamais connecté au compte de l'enfant** (R2, décision 8). Un mot de passe refusé
  par GoTrue (`weak_password`) laisse le jeton intact : le parent réessaie. L'adresse d'une
  demande `granted` ne peut plus être réécrite par le prof (`updateParentEmail` → 409, audit
  M1) : le lien ne part qu'à l'adresse que le parent a confirmée.
- **Le prof** (ou l'admin) : bouton « Réinitialiser le mot de passe » du panneau d'un élève
  approuvé (`/dashboard/admin/users`, `StudentPasswordReset.svelte`) → `POST
/api/admin/users/[id]/password` → `setProvisionalPassword` : mot de passe lisible
  (`Tigre-Lune-47`, ~20 bits, conforme à toute politique) rendu **une fois**, jamais stocké ni
  journalisé, avec la marque `app_metadata.must_change_password = true`. Cible : un élève
  seulement, jamais un prof, un admin ni soi-même (R4, `verifyTeacherStudent`).
- **L'élève** : « Changer mon mot de passe » sur `/dashboard/profile` → `/auth/update-password`,
  qui exige l'**ancien** mot de passe (`verifyCurrentPassword`, client jetable ; borné par Zod ;
  seau dédié `checkPasswordChangeRateLimitByUser`, 5 essais / 15 min par compte, distinct de
  la connexion) sauf au retour d'un lien de courriel de moins d'une heure (`amr` = `otp`,
  `isFreshEmailLinkSession`) ou avec un mot de passe provisoire. Le bouton n'est montré
  qu'aux comptes à mot de passe (`hasPasswordLogin` : fournisseur `email`) ; un compte Google
  seul n'a pas d'ancien mot de passe à donner. Le profil d'un enfant affiche
  « Identifiant : noelie042 » au lieu de l'adresse fictive.
  **Garde d'interface seulement** (audit M2, risque accepté par David le 2026-10-21) : qui
  tient une session ouverte peut appeler `supabase.auth.updateUser` depuis la console sans
  l'ancien mot de passe. L'option « Secure password change » de GoTrue fermerait ce chemin,
  mais enverrait un code à l'adresse fictive des enfants. Qui tient la session a déjà le
  compte ; le prof et le parent peuvent réinitialiser.

**Changement obligatoire (R3)** : tant que la marque vaut `true`, `passwordChangeHandle` renvoie
chaque page vers `/auth/update-password` et répond 403 aux API et écritures (restent ouverts :
`update-password`, `logout`, `/api/errors/log`). `locals.user` vient de `getUser()` : la marque se
lit à jour. Le changement par l'élève la lève par la clé service (`app_metadata` ne lui est pas
modifiable), en deux essais ; si les deux échouent, la page dit que le mot de passe est bien
changé et d'en choisir un autre si elle revient (le même serait refusé, `same_password`). Le
parent qui choisit le mot de passe la lève aussi. La fenêtre du prof ne se ferme pas pendant la
requête : fermée, le provisoire serait appliqué sans être vu.

**Sessions** (mesuré en local, 2026-10-21) : un changement par la clé service
(`auth.admin.updateUserById` avec `password` : prof, parent) **ferme toutes les sessions** de
l'élève ; un changement par l'élève (`auth.updateUser`) garde la sienne et ferme les autres ; une
mise à jour de `app_metadata` seule n'en ferme aucune.

## Profils, statuts et création de compte

### Le statut du compte

`profiles.status` (enum `user_status` : `pending | approved | rejected`) :

- `(protected)/+layout.server.ts` est **deny-by-default** : `pending` → `/auth/pending-approval` ;
  tout autre statut que `approved` → `signOut()` + `/auth/login?error=Accès refusé.` — mais il ne
  garde que les **pages**.
- **`accountStatusHandle`** (`src/lib/server/accountStatusHandle.ts`, dans le hook juste après le
  chargement du profil ; B6, 2026-10-10) : un compte non approuvé reçoit **403 sur toute API et
  toute écriture** (actions de formulaire comprises). Le test porte sur `event.route.id`, jamais sur
  le chemin brut (SvelteKit route sur le chemin décodé : `/%61pi/…` atteint `/api/…`). Restent
  ouverts : déconnexion, connexion, inscription, `update-password`, `/consent/[token]`,
  `/api/errors/log`, `/api/account/export` et `/api/account/delete` (droits RGPD).
- **La base ignore le statut, par décision** (David, 2026-10-11) : avec son jeton, un compte en
  attente garde via PostgREST ce qu'a un élève sans école ni classe — écrire ses propres données,
  écrire au prof. Aucun accès à un mineur (amitiés et conversations bornées à l'école ; données de
  jeu privées depuis le 2026-10-11). Garder le statut dans chaque policy coûterait cher pour un gain
  faible ; le garde du hook ferme l'application.
- Le prof et l'admin listent les comptes en attente via `api/admin/search-users/pending` et
  approuvent ou refusent via `api/admin/users/[id]/status` (motif dans `rejection_reason`).
  À l'approbation, l'élève reçoit une notification (`user_approved`) ; s'il est déjà inscrit dans
  des classes, le professeur en reçoit une aussi (`student_approved`, ciblée par rôle `teacher`,
  avec un lien vers le courriel de bienvenue).

### Qui crée le profil

**Le trigger `on_auth_user_created`** (sur `auth.users`) exécute `handle_new_user()`
(`SECURITY DEFINER`, dernière définition : `supabase/migrations/20260902103000_security_signup_code_reanchor.sql`).
Trois branches, dans cet ordre :

1. **Code de classe** dans les métadonnées (`class_code`) — l'inscription autonome :
   résolu **dans le trigger** par `resolve_open_class_by_code()` (classe active **et**
   `registration_open`). Trouvé → profil `student` **`approved`**, école et niveau hérités de la
   classe, ligne `class_members`, acceptation des CGU dans `terms_acceptances`. Non trouvé →
   profil `student` **`pending`**, sans classe.
2. **Élève pré-importé** (`pending_students` non activé, même e-mail) — import par l'admin
   (`dashboard/admin/import-students`) : profil pré-rempli **`approved`**, inscrit dans ses
   `class_ids`, ligne `pending_students` marquée activée.
3. **Défaut** : `student`, **toujours `pending`** (B7, décision de David du 2026-10-10 ; avant :
   `approved` d'office hors `@voltairedoha.com`) — un `signUp` GoTrue direct ou une première
   connexion Google sans code ni pré-inscription attend l'approbation du prof. Migration
   `20261015090400`, test `tests/integration/inscription-sans-code-en-attente.test.ts`.

Le trigger **ne lit jamais** `role`, `status`, `school_id` ni `grade` dans les métadonnées
(contrôlées par l'attaquant). Il **avale ses erreurs** (`RAISE WARNING`) : un compte peut donc
rester sans profil — d'où la déconnexion de `userProfileHandle`.

### Inscription autonome (`/auth/register`)

Zod (`registerFormSchema`, politique de mot de passe, CGU obligatoires) → limites par IP
(une classe entière partage l'IP de l'école) **et** par e-mail → vérification du code par
`resolve_open_class_by_code` via le **client service** (la fonction n'est accordée qu'à
`service_role` : pas d'énumération des codes par PostgREST) → `signUp` avec `class_code`,
`firstname`, `lastname`, `terms_version` → réponse neutre « vérifie ta boîte mail ».
**Prérequis de configuration Supabase** : « Confirm email » activé ; sinon `signUp` rend une
session et l'action redirige vers `/dashboard`.

### Inscription par le parent (`/auth/register/parent`)

Pour un enfant sans adresse. Le parent donne code de classe, prénom de l'enfant (seul :
minimisation), mot de passe de l'enfant, son adresse et les CGU (`parentRegisterFormSchema`).
Limite par IP → code vérifié par `resolve_open_class_by_code` avant toute création → plafond par
adresse du parent (`checkChildSignupRateLimitByParentEmail`, 5 / 24 h, **fermé** en cas de panne,
clé `mailboxKey` : sans `+tag` ni points Gmail ; compté après le code, qu'un code mal tapé ne
consomme pas) → plafond de la classe (`checkChildSignupRateLimitByClass`, 5 / 24 h, seau
atomique pris juste avant la création, **fermé** en cas de panne ; 6e → 429 « Trop d'inscriptions
dans cette classe aujourd'hui… ». Pas un comptage des comptes en base : un enfant qui quitte sa
classe efface sa ligne de `class_members`, et des inscriptions simultanées liraient le même
compte — audit de #1597) → `createChildAccount` :
identifiant `prenom` + 3 chiffres au hasard (4 si les 1 000 sont pris ; les comptes plus anciens
à 2 chiffres gardent le leur), compte créé par
`auth.admin.createUser` (adresse fictive confirmée d'office, `app_metadata.child_account`), profil
créé par `handle_new_user` comme pour l'élève seul (une classe fermée entre-temps → compte
supprimé). Le serveur retire ensuite le délai de grâce que la règle commune donne à tout nouveau
compte (30 jours d'accès complet) : **lecture seule jusqu'au clic du parent** (Q2). Le prénom
n'admet que lettres, espaces, tirets et apostrophes (il part dans le sujet du courriel). Puis une demande `parental_consents` en attente pour l'adresse du parent (sans elle,
l'inscription est annulée) et **un seul courriel** (`sendChildRegistrationEmail`) : identifiant +
lien `/consent/[token]`. Le lien recueille le consentement (case explicite) ou, en 1re/Tle,
confirme seulement l'adresse. Courriel en échec : le compte reste, l'écran le dit, le prof renvoie
le lien. L'écran final affiche l'identifiant. Le parent n'a **aucun compte**.

Côté prof : la page des classes affiche le code (`regenerateJoinCode`) et ouvre/ferme les
inscriptions (`toggleRegistration`).

**Reporté (2026-10-22, David)** : sur `/auth/register` (élève seul), un champ « adresse d'un
parent » distinct de celui de l'élève, dont le lien de consentement ne partirait qu'après un clic
du prof sur **Approuver** (décision 10, PR 4 du chantier, jamais faite). Aujourd'hui le prof
saisit l'adresse du parent dans sa page des consentements, et un élève peut s'inscrire avec
l'adresse de son parent comme adresse de connexion. Comportements et question d'accès déjà
tranchée (Q6 : adresse lue par le prof et l'admin seulement) :
[journal archivé](../archive/wip/inscription-parent-progress.md).

### Consentement parental

`(protected)/+layout.server.ts` calcule `consentStatus` (`getConsentStatus`, `src/lib/utils/consent.ts`)
et les API sensibles appellent `requireConsent` ; **la base garde aussi** messages, marché et
démineur par un trigger sur l'auteur (`has_full_access`, 2026-10-10). Tout le reste (niveaux concernés, période de
grâce, jeton `/consent/[token]`, déclaration d'âge) : **[conformite/](conformite/)**.

### Ce que la base garantit sur `profiles`

- **Pas d'auto-promotion** : la policy « Users can update own profile » fige `role`, `status`,
  `school_id` et interdit d'augmenter `gidouilles` ; le trigger `guard_profile_role_change`
  refuse tout changement de `role` par un non-admin, quelle que soit la policy.
- **Pas d'auto-création** : l'INSERT sur `profiles` est réservé à `service_role`
  (`20261001200000_profil_cree_par_le_serveur.sql`) ; les seuls créateurs sont le trigger et le
  callback Google.
- **Pas de lecture anonyme** (`20260902094000_security_profiles_anon_read.sql`) ni de lecture
  « tout le monde » (`20260915580000_retrait_profils_lisibles_par_tous.sql`). Restent : soi,
  camarades actifs, amis, co-participants de tournoi, tous les élèves pour le prof
  (`is_my_student` ≡ `is_teacher_or_admin()`), tout pour l'admin (`is_admin`), les comptes
  `pending` pour le prof et l'admin.

## Élévation admin

Le prof garde **sa** session (`role = 'teacher'`). Pour agir en admin, il saisit le **mot de
passe du compte admin** ; le jeton du prof n'acquiert jamais de pouvoir admin.

1. `POST /api/admin/elevate` (prof ou admin connecté) : Zod (`adminElevateSchema`, mot de passe
   seul) → limites dédiées (`checkElevationRateLimitByIP` / `ByEmail`, distinctes du login) →
   e-mail de l'admin retrouvé côté serveur **par le client service** (aucune policy ne montre le
   profil admin au prof : sans lui, l'élévation échouait en 500 — B5, 2026-10-10) → `signInWithPassword` sur un client **éphémère**
   (`createEphemeralAuthClient` : ne persiste rien, n'écrit aucun cookie) → rôle `admin`
   relu en base → cookie posé.
2. **Cookie `ubu-admin-elevation`** : base64url de
   `{ adminUserId, accessToken, expiresAt, elevatedBy }` — `elevatedBy` = le compte dont la session
   s'est élevée ; l'élévation ne vaut que pour **cette** session (2026-10-10),
   `httpOnly`, `secure` hors dev, **`SameSite=Strict`**, durée ≤ 1 h (celle du jeton d'accès,
   **sans** jeton de rafraîchissement). Pas de chiffrement : l'intégrité vient de la signature
   du JWT, revérifiée à chaque requête. Le nom ne commence pas par `sb-` : `@supabase/ssr`
   l'ignore et la racine ne le transmet pas au client.
3. `adminElevationHandle` ne travaille que sous `/dashboard/admin*`, `/api/admin*` et `/dev`
   (pages de dev, gardées par l'élévation : `reservedAreasHandle`).
   **Sans session, ou avec la session d'un autre compte que `elevatedBy`, jamais d'élévation** :
   le cookie est effacé, le jeton n'est pas vérifié (poste partagé : logout, session expirée,
   élève connecté ensuite sur le même navigateur ; constat B4, 2026-10-10). Sinon : décode,
   `getUser(token)`, compare l'identifiant, relit `role = 'admin'`, puis pose
   `locals.adminSupabase` (client dont la RLS s'exécute en tant qu'admin) et
   `locals.adminElevation = { active, adminUserId, expiresAt }`.
4. `requireAdmin(locals)` rend `{ supabase, adminUserId }` : le client d'élévation s'il est
   actif, sinon `locals.supabase` pour un vrai login admin ; 401 sans session (même élevé),
   sinon 403
   « Élévation admin requise ». **Les écritures privilégiées utilisent le `supabase` rendu.**
5. `POST /api/admin/elevate/revoke` **et `POST /auth/logout`** : `signOut()` best-effort du
   jeton admin, puis effacement du cookie. Sinon, expiration naturelle (≤ 1 h) puis nouvelle
   saisie.

La section `/dashboard/admin` redirige un prof non élevé vers `/dashboard/elevate?redirect=…`
(retour borné à `/dashboard/admin/*` et `/dev/*`, sans segment `.`/`..` ni `\` : `safeElevationRedirect`,
`src/lib/server/elevation-redirect.ts`), sauf `friendships` et `users`, ouverts au prof.
Un élève reçoit 403.

## Processus 2 — l'autorisation Google Classroom

Désactivée (`GOOGLE_CLASSROOM_ENABLED = false` : points d'entrée de l'interface masqués, et
toute route `/api/google/**` répond 403 par `assertGoogleClassroomEnabled()` — sauf
`auth/disconnect`, pour révoquer, et `auth/status`, en lecture ; B8, test
`src/routes/api/google/__tests__/interrupteur-google.test.ts`), plomberie conservée. `api/google/auth/connect` (prof) crée un `state` et un vérificateur PKCE,
stockés en cookies `httpOnly` (`google_oauth_state`, `google_code_verifier`) ; `callback`
vérifie le `state`, échange le code, chiffre les jetons (`encryptToken`, AES-256-GCM, clé
`GOOGLE_TOKEN_ENCRYPTION_KEY`) et les range dans `google_integrations`. Ce n'est **pas** une
connexion : aucune session n'est créée.

## Invariants de sécurité

1. **L'identité vient de `getUser()`**, jamais de `getSession()` ni du cookie brut.
2. **Le rôle vient de `profiles`**, jamais du JWT ni des métadonnées d'inscription.
3. **Seul `approved` entre** dans `(protected)` ; tout statut inconnu est refusé.
4. **Le pouvoir admin vit dans un état parallèle** (`locals.adminSupabase`) ; on ne modifie
   jamais `profile.role` pour élever.
5. **Le client service contourne la RLS** : seulement quand la base refuse légitimement
   l'écriture à l'utilisateur, **après** le contrôle d'identité de la route, et en
   l'ajoutant à `ALLOWED_SERVICE_ROLE_PATHS`. Seule lecture anonyme : le document du lien du
   cours (`(public)/cours/[token]/document/[id]`, ADR 0025), où la garde est le jeton, vérifiée
   par une fonction SQL que seul le service role exécute. Le fichier d'un document de chapitre
   (`api/documents/[id]`, ADR 0029) se lit aussi par le service, après la lecture de sa ligne
   avec le client de l'utilisateur (RLS : chapitre visible, document publié).
6. **Pas d'énumération** : login, inscription et reset rendent le même message que le compte
   existe ou non.
7. **Les limites de débit échouent ouvertes** (`rateLimiter.ts` : erreur RPC → autorisé) —
   choix assumé : une panne de la table ne bloque pas les connexions d'une classe.
8. **Les redirections venues de l'URL** (`next`, `redirect`) passent par `validateRedirectUrl`
   ou une liste blanche équivalente.
9. **Rien n'est envoyé au domaine fictif** `eleves.chiph.re` (`isChildAccountEmail`).
10. **Le parent n'a jamais de session sur le compte de l'enfant** : son lien porte un jeton
    maison (empreinte dans `app_metadata`), jamais un jeton de GoTrue ; le mot de passe est
    changé par la clé service, sans session (`setChildPasswordFromToken`).

## Comment étendre

**Une page protégée** : la placer sous `src/routes/(protected)/` — la garde de groupe gère
session, profil et statut. Pour un rôle :

```typescript
import { requireRole } from '$lib/server/auth';

export const load = async ({ locals }) => {
	requireRole(locals.profile, 'teacher'); // 403 sinon
	// …
};
```

⚠️ Une garde de `+layout.server.ts` **ne protège pas les actions de formulaire** d'un
`+page.server.ts` (SvelteKit ne rejoue pas les `load` du layout avant une action) :
chaque action refait sa garde (`requireRole(locals, …)` du middleware).

**Une API** (`+server.ts`) : rien ne la garde par défaut, elle se garde elle-même :

```typescript
import { requireRole, requireAdmin } from '$lib/server/middleware/auth';

export const POST: RequestHandler = async ({ locals, request }) => {
	const { user, profile } = await requireRole(locals, 'teacher'); // 401 / 403
	// ou : const { supabase, adminUserId } = await requireAdmin(locals);
	// puis Zod sur request.json(), puis requireConsent si action élève restreinte
};
```

Attention aux deux modules homonymes : `$lib/server/auth` (pages, prend `user`/`profile`,
**redirige**) et `$lib/server/middleware/auth` (API, prend `locals`, **relit le profil**, rend
401/403). Toujours vérifier lequel est importé.

**Une route admin** : sous `/dashboard/admin/` ou `/api/admin/` (sinon le handle d'élévation
ne s'y exécute pas), garde `requireAdmin`, écritures avec le client rendu.

**Une policy sur `profiles`** : poser d'abord la question d'accès à David (CLAUDE.md), tests
d'intégration obligatoires, et relire [rls-echecs-silencieux](../pratiques/rls-echecs-silencieux.md).

## Tests

| Où                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Quoi                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/server/__tests__/adminElevation.test.ts`, `adminElevationHandle.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Cookie (encode/décode/expiration) ; handle : pas d'élévation sans session.                                                                                  |
| `src/lib/server/__tests__/reservedAreasHandle.test.ts`, `elevation-redirect.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `/dev` et `/aide-ecriture` par compte (visiteur, élève, prof, prof élevé, admin) ; retour d'élévation borné.                                                |
| `src/routes/(public)/auth/logout/__tests__/logout.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Le logout efface et révoque l'élévation.                                                                                                                    |
| `src/lib/utils/__tests__/session-cookies.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Plafond de 30 jours (400 → 30 j, effacement `Max-Age=0` intact) ; écriture navigateur sur `document.cookie`.                                                |
| `src/routes/api/admin/elevate/__tests__/elevate.test.ts`, `revoke/__tests__/revoke.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                              | Endpoints d'élévation.                                                                                                                                      |
| `src/lib/server/middleware/__tests__/requireAdmin.test.ts`, `student-access.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Gardes API.                                                                                                                                                 |
| `src/lib/server/__tests__/csrfHandle.test.ts`, `private-response.test.ts`, `validateRedirectUrl.test.ts`, `rateLimiter.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                          | Défenses transverses.                                                                                                                                       |
| `src/lib/server/auth/__tests__/cron.test.ts`, `auth-error-fr.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Secret cron, messages traduits.                                                                                                                             |
| `src/routes/(public)/auth/{login,reset-password,update-password}/__tests__/`                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Formulaires publics ; connexion par identifiant (`login-identifiant.test.ts`).                                                                              |
| `src/lib/utils/__tests__/child-account.test.ts`, `src/lib/server/email/__tests__/brevo-domaine-fictif.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                           | Identifiant → adresse fictive, choix de l'identifiant ; aucun envoi vers le domaine fictif.                                                                 |
| `src/routes/(public)/auth/register/parent/__tests__/`, `tests/integration/inscription-par-le-parent.test.ts`, `tests/integration/domaine-fictif-reserve-au-serveur.test.ts`                                                                                                                                                                                                                                                                                                                                                              | Inscription par le parent ; domaine fictif réservé au serveur.                                                                                              |
| `src/lib/server/__tests__/child-password.test.ts`, `passwordChangeHandle.test.ts`, `tests/integration/mots-de-passe-eleves.test.ts`, `src/routes/(public)/auth/reset-password/{__tests__/identifiant-enfant.test.ts,parent/__tests__/}`, `src/routes/(public)/auth/update-password/__tests__/changer-mon-mot-de-passe.test.ts`, `src/routes/api/admin/users/[id]/password/__tests__/`, `src/lib/components/admin/__tests__/StudentPasswordReset.svelte.test.ts`, `src/routes/(protected)/dashboard/{profile,teacher/consent}/__tests__/` | Mots de passe des élèves : cible du parent (R1), jeton sans session (R2), provisoire et marque (R3), ancien mot de passe exigé, cible élève seulement (R4). |
| `src/routes/__tests__/login-redirect.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `/login` → `/auth/login`.                                                                                                                                   |
| `tests/integration/admin-elevation.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Le client admin agit bien en tant qu'admin sous RLS.                                                                                                        |
| `tests/integration/student-self-registration.test.ts`, `security-signup-anchor.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `handle_new_user`, code de classe.                                                                                                                          |
| `tests/integration/profile-insert-role-guard.test.ts`, `role-guard-functions.test.ts`, `security-authz-guards.test.ts`, `profiles-columns.test.ts`, `database/profile-triggers.test.ts`                                                                                                                                                                                                                                                                                                                                                  | RLS et triggers de `profiles`.                                                                                                                              |
| `tests/integration/consentement-*.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Consentement (voir conformite/).                                                                                                                            |
| `e2e/auth/` (`login`, `logout`, `protected-routes`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Parcours navigateur.                                                                                                                                        |

Commandes : `pnpm test:server <fichier>`, `pnpm test:integration` (Supabase local). Aucun
test unitaire ne couvre `(protected)/+layout.server.ts` ni `userProfileHandle`.

## Décisions

- [ADR 0002](../adr/0002-mono-professeur-ecole-frontiere-sociale.md) — mono-professeur, admin
  distinct joint par élévation, école = frontière sociale.
- [ADR 0003](../adr/0003-donnees-hebergees-en-ue.md) — données (dont Auth) hébergées en UE.
- Décisions sans ADR, toujours en vigueur : `getUser()` seul ; rôle lu en base ; import
  dynamique de `@supabase/ssr` ; limites de débit fail-open, sauf l'élévation admin, fermée en cas de panne de la base
  ou d'IP / e-mail absent (B8 : une panne n'ouvre pas le forçage du mot de passe admin) ; élévation sans jeton de
  rafraîchissement, fuite ≤ 1 h acceptée ; connexion Google et Classroom coupées par drapeau,
  plomberie gardée. Historique : [élévation](../archive/wip/admin-elevation-progress.md),
  [mono-prof](../archive/wip/single-teacher-refactor.md),
  [inscription autonome](../archive/wip/student-self-registration-progress.md).

## Avatars Google (CDN)

Les avatars `lh3.googleusercontent.com` exigent, sur le `<img>` de
`src/lib/components/UserAvatar.svelte`, **`referrerpolicy="no-referrer"`** (sinon 429/403 du
CDN) et **`loading="lazy"`** par défaut (sinon une liste de 25 avatars dépasse le débit). Un
échec est mémorisé dans `failedUrls` (`SvelteSet` de module) jusqu'au rechargement complet.
Symptôme : une ou deux vraies photos, toutes les autres par défaut → vérifier ces deux
attributs, puis l'onglet réseau filtré sur `googleusercontent.com`, puis recharger (Cmd+Maj+R).

## Glossaire technique

| Terme              | Sens                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `getUser()`        | Vérifie le jeton auprès du serveur d'auth Supabase (requête réseau). Source d'identité.        |
| `getSession()`     | Lit la session dans le cookie **sans** vérification. Jamais pour autoriser.                    |
| Cookies `sb-*`     | Jetons d'accès et de rafraîchissement de la session, gérés par `@supabase/ssr`.                |
| GoTrue             | Le serveur d'auth de Supabase (`/auth/v1/*`).                                                  |
| RLS                | Row Level Security : filtre Postgres par ligne ; un refus rend **zéro ligne**, pas une erreur. |
| `SECURITY DEFINER` | Fonction SQL exécutée avec les droits de son propriétaire (contourne la RLS).                  |
| Client service     | Client Supabase à clé `service_role` : contourne toute la RLS.                                 |
| OTP / `token_hash` | Jeton à usage unique des liens e-mail (confirmation, récupération).                            |
| PKCE, `state`      | Protections OAuth : vérificateur lié à la demande, anti-CSRF du retour.                        |
| Élévation          | État admin temporaire posé par cookie, parallèle à la session du prof.                         |
