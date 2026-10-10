---
couvre:
  - src/hooks.server.ts
  - src/app.d.ts
  - src/lib/server/supabase.ts
  - src/lib/server/auth.ts
  - 'src/lib/server/auth/**'
  - 'src/lib/server/middleware/**'
  - src/lib/server/adminElevation.ts
  - src/lib/server/serviceRoleClient.ts
  - src/lib/server/rateLimiter.ts
  - src/lib/server/csrfProtection.ts
  - src/lib/server/passwordPolicy.ts
  - src/lib/server/validateRedirectUrl.ts
  - src/lib/server/private-response.ts
  - src/lib/server/validation/auth.ts
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
  - 'src/routes/api/admin/pending-users/**'
  - 'src/routes/api/admin/users/*/status/**'
  - 'src/routes/api/google/auth/**'
---

# Authentification, profils et élévation admin

> Remplace les 11 fichiers de [`auth/`](../archive/systeme-2026-06/auth/README.md) (juin 2026, archivés, antérieurs au modèle
> mono-professeur). En cas de désaccord, **cette page et le code font foi**.
>
> Vérifié contre le code le 2026-10-10.

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

| Processus                         | Ce que c'est                                                                      | Donne une session ? |
| --------------------------------- | --------------------------------------------------------------------------------- | ------------------- |
| **Connexion** (Supabase Auth)     | Un utilisateur se connecte : e-mail + mot de passe (Google : désactivé).          | **Oui**             |
| **Autorisation Google Classroom** | Le prof autorise Chiphre à appeler les API Google (OAuth 2.0 + PKCE). Désactivée. | **Non**             |

Deux callbacks différents : `/auth/callback` (connexion Google) ≠ `/api/google/auth/callback` (Classroom).

## Carte du code

| Fichier                                           | Rôle                                                                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/hooks.server.ts`                             | Chaîne des handles (ordre ci-dessous) ; `userProfileHandle`, `csrfHandle`, `securityHeadersHandle`.                             |
| `src/lib/server/supabase.ts`                      | Handle Supabase : `locals.supabase` (cookies SSR) et `locals.safeGetSession()`.                                                 |
| `src/lib/server/auth.ts`                          | Pour les **pages** : `getUserProfile`, `requireAuth(user)` (redirige), `requireRole(profile, …)`, `hasRole`, `hasAnyRole`.      |
| `src/lib/server/middleware/auth.ts`               | Pour les **API** : `requireAuth(locals)`, `requireRole`, `requireRoles`, `requireAdmin` ; types `UserRole`, `Profile`.          |
| `src/lib/server/adminElevation.ts`                | Élévation : cookie `ubu-admin-elevation`, `createAdminClient`, `createEphemeralAuthClient`, `adminElevationHandle`.             |
| `src/lib/server/serviceRoleClient.ts`             | `createServiceRoleClient()` — contourne la RLS ; liste `ALLOWED_SERVICE_ROLE_PATHS` (avertissement **en dev seulement**).       |
| `src/lib/server/rateLimiter.ts`                   | Limites persistantes (RPC `check_and_increment_rate_limit`, table `rate_limits`) : login, inscription, reset, élévation, OAuth. |
| `src/lib/server/middleware/rateLimit.ts`          | Limiteur **en mémoire** (par instance), utilisé par quelques API (`account/delete`, `search`…).                                 |
| `src/lib/server/validation/auth.ts`               | Zod : `loginFormSchema`, `registerFormSchema`, `requestPasswordResetSchema`, `updatePasswordSchema`…                            |
| `src/lib/server/passwordPolicy.ts`                | `validatePasswordPolicy`, appliquée par les schémas d'inscription et de changement de mot de passe.                             |
| `src/lib/server/validateRedirectUrl.ts`           | Anti open-redirect pour les paramètres `next`.                                                                                  |
| `src/lib/server/private-response.ts`              | `mustStayPrivate` / `PRIVATE_NO_STORE` : pas de cache partagé pour une réponse connectée ou qui pose un cookie.                 |
| `src/lib/server/auth/cron.ts`                     | `verifyCronAuth(request)` : `Authorization: Bearer <CRON_SECRET>` pour `/api/cron/*`.                                           |
| `src/lib/server/auth/auth-error-fr.ts`            | `authErrorToFrench` : messages GoTrue traduits.                                                                                 |
| `src/lib/server/middleware/consent.ts`            | `requireConsent(profile, action)` — voir [conformite/](conformite/).                                                            |
| `src/lib/server/middleware/student-access.ts`     | `verifyTeacherStudent`, `verifyTeacherStudentWithRole`.                                                                         |
| `src/lib/config/google-login.ts`                  | `GOOGLE_LOGIN_ENABLED = false`.                                                                                                 |
| `src/lib/config/google-classroom.ts`              | `GOOGLE_CLASSROOM_ENABLED = false`.                                                                                             |
| `src/lib/server/google/oauth.ts`, `encryption.ts` | Classroom : `getAuthUrl`, `exchangeCodeForTokens`, `refreshAccessToken`, `revokeAccess` ; `encryptToken`/`decryptToken`.        |
| `src/app.d.ts`                                    | Type de `App.Locals` (`user`, `profile`, `supabase`, `safeGetSession`, `adminSupabase?`, `adminElevation?`).                    |

Routes :

| Route                                                    | Rôle                                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `(public)/auth/login`                                    | Actions `login` (e-mail + mot de passe) et `googleSignIn` (refusée : drapeau à `false`).      |
| `(public)/auth/register`                                 | Inscription autonome d'un élève par **code de classe**.                                       |
| `(public)/auth/confirm`                                  | Lien e-mail (`verifyOtp`) : confirmation d'inscription, `recovery` → `/auth/update-password`. |
| `(public)/auth/callback`                                 | Retour de la connexion Google (refusé tant que `GOOGLE_LOGIN_ENABLED` est `false`).           |
| `(public)/auth/reset-password`, `update-password`        | Mot de passe oublié / nouveau mot de passe.                                                   |
| `(public)/auth/pending-approval`                         | Écran d'attente d'un compte `pending`.                                                        |
| `(public)/auth/logout`                                   | `POST` → `signOut()`, révoque et efface l'élévation admin → `/`.                              |
| `(protected)/+layout.server.ts`                          | Garde de groupe des **pages** protégées (session, profil, statut, consentement).              |
| `(protected)/dashboard/admin/+layout.server.ts`          | Garde de la section admin (élévation ou vrai admin ; deux préfixes ouverts au prof).          |
| `(protected)/dashboard/elevate`                          | Écran de saisie du mot de passe admin.                                                        |
| `api/admin/elevate`, `api/admin/elevate/revoke`          | Pose / retire l'élévation.                                                                    |
| `api/admin/pending-users`, `api/admin/users/[id]/status` | Approbation des comptes (prof **et** admin, via `requireRoles`).                              |
| `api/google/auth/{connect,callback,disconnect,status}`   | Autorisation Google Classroom (prof seulement).                                               |

`/login` n'existe pas : `redirectHandle` le renvoie en 308 vers `/auth/login`
(test : `src/routes/__tests__/login-redirect.test.ts`).

## Processus 1 — la connexion (Supabase Auth)

### La chaîne de handles

`hooks.server.ts` enchaîne, **dans cet ordre** (chacun lit ce que le précédent a posé) :

1. `requestIdHandle` — `locals.requestId`, en-tête `X-Request-ID`.
2. `maintenanceHandle` — avant Supabase, pour marcher base gelée.
3. `supabaseHandle` — `locals.supabase` et `locals.safeGetSession`.
4. `redirectHandle` — anciennes routes, dont `/login`.
5. `userProfileHandle` — `locals.user` puis `locals.profile`.
6. `adminElevationHandle` — `locals.adminSupabase`, `locals.adminElevation`.
7. `csrfHandle` — `Origin` doit correspondre à `Host` pour POST/PUT/PATCH/DELETE.
8. `securityHeadersHandle` — CSP, HSTS (prod), `X-Frame-Options`, `Cache-Control: private, no-store` si connecté ou cookie posé.
9. `errorMonitoringHandle` — erreurs et requêtes lentes (> 3 s) vers `error_logs`.

### Session et cookies SSR

- `locals.supabase` est un client `@supabase/ssr` qui lit et écrit les cookies `sb-*`.
  Leur `maxAge` est **plafonné à 30 jours** (le défaut de la bibliothèque est 400 jours).
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
- **Google** : `googleSignIn` et `/auth/callback` sont **coupés côté serveur** tant que
  `GOOGLE_LOGIN_ENABLED` vaut `false` (la plateforme a quitté le domaine Google Workspace de
  l'ancienne école). La plomberie reste : domaine `@voltairedoha.com` imposé, profil manquant
  créé par le client service (`student`, `pending`, sans école), `next` passé par
  `validateRedirectUrl`.
- **Mot de passe oublié** : `/auth/reset-password` (Zod, limites IP + e-mail, réponse neutre)
  → e-mail → `/auth/confirm?type=recovery` → `/auth/update-password`.

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
- ⚠️ **La base, elle, ignore le statut** : avec son jeton, un compte en attente garde via PostgREST
  ce qu'a un élève sans école ni classe (écrire ses propres données, écrire au prof, lire des
  statistiques de jeu pseudonymes en `using (true)`). Aucun accès à un mineur. Constat ouvert.
- Le prof et l'admin approuvent ou refusent via `api/admin/pending-users` et
  `api/admin/users/[id]/status` (motif dans `rejection_reason`).

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

Côté prof : la page des classes affiche le code (`regenerateJoinCode`) et ouvre/ferme les
inscriptions (`toggleRegistration`).

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
   e-mail de l'admin retrouvé côté serveur → `signInWithPassword` sur un client **éphémère**
   (`createEphemeralAuthClient` : ne persiste rien, n'écrit aucun cookie) → rôle `admin`
   relu en base → cookie posé.
2. **Cookie `ubu-admin-elevation`** : base64url de
   `{ adminUserId, accessToken, expiresAt, elevatedBy }` — `elevatedBy` = le compte dont la session
   s'est élevée ; l'élévation ne vaut que pour **cette** session (2026-10-10),
   `httpOnly`, `secure` hors dev, **`SameSite=Strict`**, durée ≤ 1 h (celle du jeton d'accès,
   **sans** jeton de rafraîchissement). Pas de chiffrement : l'intégrité vient de la signature
   du JWT, revérifiée à chaque requête. Le nom ne commence pas par `sb-` : `@supabase/ssr`
   l'ignore et la racine ne le transmet pas au client.
3. `adminElevationHandle` ne travaille que sous `/dashboard/admin*` et `/api/admin*`.
   **Sans session, ou avec la session d'un autre compte que `elevatedBy`, jamais d'élévation** :
   le cookie est effacé, le jeton n'est pas vérifié (poste partagé : logout, session expirée,
   élève connecté ensuite sur le même navigateur ; constat B4, 2026-10-10). Sinon : décode,
   `getUser(token)`, compare l'identifiant, relit `role = 'admin'`, puis pose
   `locals.adminSupabase` (client dont la RLS s'exécute en tant qu'admin) et
   `locals.adminElevation = { active, adminUserId, expiresAt }`.
4. `requireAdmin(locals)` rend `{ supabase, adminUserId }` : le client d'élévation s'il est
   actif, sinon `locals.supabase` pour un vrai login admin ; 401 sans session (même élevé),
   sinon 403
   « Admin elevation required ». **Les écritures privilégiées utilisent le `supabase` rendu.**
5. `POST /api/admin/elevate/revoke` **et `POST /auth/logout`** : `signOut()` best-effort du
   jeton admin, puis effacement du cookie. Sinon, expiration naturelle (≤ 1 h) puis nouvelle
   saisie.

La section `/dashboard/admin` redirige un prof non élevé vers `/dashboard/elevate?redirect=…`
(redirection bornée à `/dashboard/admin/*`), sauf `friendships` et `users`, ouverts au prof.
Un élève reçoit 403.

## Processus 2 — l'autorisation Google Classroom

Désactivée (`GOOGLE_CLASSROOM_ENABLED = false` : points d'entrée de l'interface masqués),
plomberie conservée. `api/google/auth/connect` (prof) crée un `state` et un vérificateur PKCE,
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
   l'ajoutant à `ALLOWED_SERVICE_ROLE_PATHS`.
6. **Pas d'énumération** : login, inscription et reset rendent le même message que le compte
   existe ou non.
7. **Les limites de débit échouent ouvertes** (`rateLimiter.ts` : erreur RPC → autorisé) —
   choix assumé : une panne de la table ne bloque pas les connexions d'une classe.
8. **Les redirections venues de l'URL** (`next`, `redirect`) passent par `validateRedirectUrl`
   ou une liste blanche équivalente.

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

| Où                                                                                                                                                                                      | Quoi                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/lib/server/__tests__/adminElevation.test.ts`, `adminElevationHandle.test.ts`                                                                                                       | Cookie (encode/décode/expiration) ; handle : pas d'élévation sans session. |
| `src/routes/(public)/auth/logout/__tests__/logout.test.ts`                                                                                                                              | Le logout efface et révoque l'élévation.                                   |
| `src/routes/api/admin/elevate/__tests__/elevate.test.ts`, `revoke/__tests__/revoke.test.ts`                                                                                             | Endpoints d'élévation.                                                     |
| `src/lib/server/middleware/__tests__/requireAdmin.test.ts`, `student-access.test.ts`                                                                                                    | Gardes API.                                                                |
| `src/lib/server/__tests__/csrfProtection.test.ts`, `private-response.test.ts`, `validateRedirectUrl.test.ts`, `rateLimiter.test.ts`                                                     | Défenses transverses.                                                      |
| `src/lib/server/auth/__tests__/cron.test.ts`, `auth-error-fr.test.ts`                                                                                                                   | Secret cron, messages traduits.                                            |
| `src/routes/(public)/auth/{login,reset-password,update-password}/__tests__/`                                                                                                            | Formulaires publics.                                                       |
| `src/routes/__tests__/login-redirect.test.ts`                                                                                                                                           | `/login` → `/auth/login`.                                                  |
| `tests/integration/admin-elevation.test.ts`                                                                                                                                             | Le client admin agit bien en tant qu'admin sous RLS.                       |
| `tests/integration/student-self-registration.test.ts`, `security-signup-anchor.test.ts`                                                                                                 | `handle_new_user`, code de classe.                                         |
| `tests/integration/profile-insert-role-guard.test.ts`, `role-guard-functions.test.ts`, `security-authz-guards.test.ts`, `profiles-columns.test.ts`, `database/profile-triggers.test.ts` | RLS et triggers de `profiles`.                                             |
| `tests/integration/consentement-*.test.ts`                                                                                                                                              | Consentement (voir conformite/).                                           |
| `e2e/auth/` (`login`, `logout`, `protected-routes`)                                                                                                                                     | Parcours navigateur.                                                       |

Commandes : `pnpm test:server <fichier>`, `pnpm test:integration` (Supabase local). Aucun
test unitaire ne couvre `(protected)/+layout.server.ts` ni `userProfileHandle`.

## Décisions

- [ADR 0002](../adr/0002-mono-professeur-ecole-frontiere-sociale.md) — mono-professeur, admin
  distinct joint par élévation, école = frontière sociale.
- [ADR 0003](../adr/0003-donnees-hebergees-en-ue.md) — données (dont Auth) hébergées en UE.
- Décisions sans ADR, toujours en vigueur : `getUser()` seul ; rôle lu en base ; import
  dynamique de `@supabase/ssr` ; limites de débit fail-open ; élévation sans jeton de
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
