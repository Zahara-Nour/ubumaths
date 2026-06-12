---
title: Architecture de l'authentification et de l'autorisation
date: 2026-06-12
version: 1.0
status: vivant
audience: Developpeurs nouveaux dans la codebase et mainteneurs experimentes
scope: Login/session Supabase (process 1) + autorisation des API Google (process 2). Hors scope : consommateurs Classroom/Drive/Gmail (cf. futur docs/ref/google-classroom/).
---

# Reference d'architecture : authentification & autorisation

## Resume executif

L'authentification d'UbuMaths repose sur **deux process totalement distincts**, qui partagent le mot « Google » mais ne font pas du tout la meme chose :

1. **Process « SUPABASE AUTH »** (20 fichiers, 2 982 lignes) — le systeme de **login / session**. Il etablit _qui est l'utilisateur connecte_. Deux flux y aboutissent :

   - **Flux 1** : email / mot de passe.
   - **Flux 2** : « Se connecter avec Google » (bouton Lycee Voltaire), restreint a `@voltairedoha.com`. Google n'est ici qu'un **fournisseur d'identite (IdP)** : le resultat est une **session Supabase**, exactement comme le flux 1.

2. **Process « GOOGLE AUTH »** (15 fichiers, 5 982 lignes) — l'**autorisation des API Google** (Classroom, Drive, Gmail). Ce n'est **PAS un login**. Un professeur deja connecte « connecte son compte Google » pour que l'application puisse appeler les API Google en son nom.
   - **Flux 3** : OAuth 2.0 Authorization Code + PKCE. Les tokens (access + refresh) sont chiffres (AES-256-GCM) et stockes en base dans `google_integrations`.

> **Frontiere du document.** Cette page couvre le mecanisme d'authentification/autorisation jusqu'a l'obtention et le stockage des tokens. Les **consommateurs** des API Google (`classroom-api`, `drive-api`, `gmail`, `sync`, `drive-sync`) sont **hors perimetre** ici et seront documentes dans `docs/ref/google-classroom/`.

---

## Les deux process a ne JAMAIS confondre

> ⚠️ **POINT CLE.** « Se connecter **AVEC** Google » et « Connecter **SON** compte Google pour Classroom » sont deux mecanismes Google **completement differents**. Ne pas les melanger est la regle d'or de tout ce systeme.

| Aspect                         | Flux 2 — « Se connecter avec Google »                  | Flux 3 — « Connecter son compte Google »            |
| ------------------------------ | ------------------------------------------------------ | --------------------------------------------------- |
| Process                        | SUPABASE AUTH (login)                                  | GOOGLE AUTH (autorisation API)                      |
| But                            | Etablir l'identite → ouvrir une session                | Obtenir des tokens pour appeler les API Google      |
| Produit une session Supabase ? | **OUI**                                                | **NON** (l'utilisateur est deja connecte)           |
| Qui declenche                  | Visiteur non connecte sur `/auth/login`                | Professeur deja connecte dans ses reglages          |
| Bouton UI                      | « Connexion Lycee Voltaire »                           | « Connecter Google Classroom »                      |
| Mecanisme technique            | `supabase.auth.signInWithOAuth({ provider:'google' })` | OAuth 2.0 Authorization Code + PKCE maison          |
| Callback                       | `/auth/callback`                                       | `/api/google/auth/callback`                         |
| Scopes                         | `openid email profile` (identite seule)                | `classroom.*`, `drive.file`, `gmail.send`, …        |
| Stockage du resultat           | Cookies de session Supabase (`sb-*`)                   | Tokens chiffres dans la table `google_integrations` |
| Restriction                    | Domaine `@voltairedoha.com`                            | Role `teacher`                                      |

**Resume en une phrase** : le flux 2 dit _qui tu es_ ; le flux 3 te donne _la permission d'agir sur Google Classroom_. Le flux 2 t'authentifie sur UbuMaths ; le flux 3 autorise UbuMaths a parler aux serveurs Google.

---

## Les 3 flux (diagrammes de sequence)

### Flux 1 — Login email / mot de passe (SUPABASE AUTH)

Action serveur : `login` dans `(public)/auth/login/+page.server.ts`.

```
Navigateur                 Server action (login)            Supabase Auth
   │                              │                              │
   │  POST /auth/login?/login     │                              │
   │  (email, password)           │                              │
   ├─────────────────────────────►│                              │
   │                              │ validateFormData (Zod)        │
   │                              │ rate limit (IP + email)       │
   │                              │ signInWithPassword(email,pwd) │
   │                              ├─────────────────────────────►│
   │                              │      session + cookies sb-*   │
   │                              │◄─────────────────────────────┤
   │       redirect 303 /dashboard│  (cookies poses par le client │
   │◄─────────────────────────────┤   serveur Supabase)           │
   │                              │                              │
   │  onAuthStateChange(SIGNED_IN) déclenché côté client          │
   │  → invalidate('supabase:auth') → +layout.server re-verifie   │
   │                                                              ▼
   │                                          ✅ SESSION SUPABASE
```

Le login se fait **cote serveur** (et non cote client) pour que les cookies `sb-*` soient ecrits dans la reponse : sinon le serveur continuerait a voir l'utilisateur deconnecte (cf. en-tete de `+page.server.ts`).

### Flux 2 — « Se connecter avec Google » Voltaire (SUPABASE AUTH)

Action serveur : `googleSignIn` dans `(public)/auth/login/+page.server.ts` ; callback : `(public)/auth/callback/+server.ts`.

```
Navigateur          googleSignIn        Supabase / Google IdP        /auth/callback
   │                    │                        │                        │
   │ POST …?/googleSignIn│                        │                        │
   ├───────────────────►│ rate limit OAuth        │                        │
   │                    │ signInWithOAuth(google) │                        │
   │                    ├────────────────────────►│                        │
   │   redirect 303 →    │  data.url (consentement)│                        │
   │◄───────────────────┤                        │                        │
   │  ─── écran de consentement Google ───►       │                        │
   │                                       redirect ?code=…&next=…          │
   ├───────────────────────────────────────────────────────────────────►  │
   │                                       exchangeCodeForSession(code)     │
   │                                       ◄───── session + user ──────►    │
   │                                       email.endsWith('@voltairedoha.com') ?
   │                                         ├─ non → signOut + /login?error │
   │                                         └─ oui → profil existe ?         │
   │                                              pending → /pending-approval │
   │                                              approuvé → sync avatar      │
   │                  redirect 303 → next (ou /dashboard)                     │
   │◄────────────────────────────────────────────────────────────────────  │
   │                                                              ▼
   │                                          ✅ SESSION SUPABASE
```

Google joue ici le **role d'IdP**. La sortie est une **session Supabase** identique a celle du flux 1. La restriction `@voltairedoha.com` est verifiee **cote serveur** dans le callback (jamais cote client).

### Flux 3 — Connexion du compte Google pour Classroom (GOOGLE AUTH)

Entree : `POST /api/google/auth/connect` (prof connecte) ; callback : `GET /api/google/auth/callback`. Utilitaires OAuth : `src/lib/server/google/oauth.ts`.

```
Prof (déjà connecté)   /api/google/auth/connect     Google OAuth      /api/google/auth/callback
   │                          │                          │                      │
   │ POST connect             │ requireRole('teacher')   │                      │
   ├─────────────────────────►│ state = randomUUID()     │                      │
   │                          │ getAuthUrl(state) → PKCE  │                      │
   │                          │  (code_verifier S256)     │                      │
   │   { url } + cookies       │  cookies httpOnly:        │                      │
   │   (state, code_verifier) │  state + code_verifier    │                      │
   │◄─────────────────────────┤  (maxAge 10 min)          │                      │
   │  ─── consentement Google (scopes Classroom/Drive/Gmail) ───►              │
   │                                       redirect ?code=…&state=…             │
   ├──────────────────────────────────────────────────────────────────────►   │
   │                                       requireRole('teacher')               │
   │                                       state === cookie ? (CSRF)            │
   │                                       exchangeCodeForTokens(code, verifier) │
   │                                       ◄── access_token + refresh_token ──►  │
   │                                       encryptToken(...) (AES-256-GCM)       │
   │                                       INSERT google_integrations            │
   │              redirect 303 → /dashboard/teacher/settings/google?connected    │
   │◄──────────────────────────────────────────────────────────────────────   │
   │                                                              ▼
   │                                ❌ AUCUNE session créée — tokens API stockés
```

Aucune session Supabase n'est creee ni modifiee : l'utilisateur etait deja connecte. Le resultat est une ligne chiffree dans `google_integrations` que les consommateurs (hors scope) reutiliseront.

> **Deux callbacks homonymes.** Ne pas confondre `/auth/callback` (flux 2, supabase auth) et `/api/google/auth/callback` (flux 3, google auth). Memes mots, process opposes.

---

## La chaine de hooks (`src/hooks.server.ts`)

Toutes les requetes serveur traversent une `sequence()` de handles. **L'ordre est significatif** : chaque handle depend de ce que le precedent a pose dans `event.locals`.

| #   | Handle                  | Role                                                                                     |
| --- | ----------------------- | ---------------------------------------------------------------------------------------- |
| 1   | `requestIdHandle`       | Genere un `requestId` (8 car.) dans `locals` + en-tete `X-Request-ID` pour le tracing.   |
| 2   | `supabaseHandle`        | Cree `locals.supabase` (client serveur avec gestion cookies) et `locals.safeGetSession`. |
| 3   | `redirectHandle`        | Redirections 308 des anciennes routes (restructuration navigation).                      |
| 4   | `userProfileHandle`     | Appelle `safeGetSession()` → `locals.user` ; charge le profil DB → `locals.profile`.     |
| 5   | `csrfHandle`            | Valide l'en-tete `origin` vs `host` pour toute methode mutante (POST/PUT/DELETE/PATCH).  |
| 6   | `securityHeadersHandle` | Pose la CSP et les en-tetes de securite (`X-Frame-Options`, HSTS en prod, …).            |
| 7   | `errorMonitoringHandle` | Capture les erreurs serveur et les requetes lentes (> 3 s) vers `error_logs`.            |

> En-tete de `hooks.server.ts` :
> `requestId → supabase → redirects → user/profile → csrf → security headers → error monitoring`.

**`userProfileHandle` (handle 4) — point central.** C'est lui qui matérialise l'identite serveur :

1. `const { user } = await event.locals.safeGetSession();` → `locals.user`.
2. Si `user` existe, `locals.profile = await getUserProfile(supabase, user.id)`.
3. **Cas `profile_not_found`** : session valide mais aucun profil en base → on **`signOut()`** et on redirige vers `/auth/login?error=...`. Cela evite le bug « Unexpected token '<' » (une page HTML renvoyee en reponse a une navigation client attendant du JSON) et le scenario « login marche puis echoue immediatement ».
4. Toute erreur de fetch est loggee dans `error_logs` (avec `requestId`, email) puis suit le meme chemin signOut + redirect.

---

## Le modele `locals` (charge une fois, lu partout)

Apres la chaine de hooks, chaque requete serveur dispose de `event.locals` deja peuple. **Les load functions et endpoints ne refont PAS le travail d'authentification** — ils lisent `locals`.

| Champ                   | Pose par            | Contenu                                                  |
| ----------------------- | ------------------- | -------------------------------------------------------- |
| `locals.requestId`      | `requestIdHandle`   | Identifiant de trace court.                              |
| `locals.supabase`       | `supabaseHandle`    | Client Supabase serveur (lecture/ecriture cookies).      |
| `locals.safeGetSession` | `supabaseHandle`    | Fonction de verification — **toujours via `getUser()`**. |
| `locals.user`           | `userProfileHandle` | Utilisateur **verifie** (ou `null`).                     |
| `locals.profile`        | `userProfileHandle` | Ligne `profiles` (role, status, école, …) ou `null`.     |

> ⚠️ **`safeGetSession()` n'appelle JAMAIS `getSession()`.** Voir `src/lib/server/supabase.ts` : seul `auth.getUser()` (qui valide aupres du serveur d'auth Supabase, avec timeout 15 s, _fail-closed_ → `null`) est utilise. `getSession()` lit les cookies sans verification et n'est jamais une source d'autorite pour l'autorisation. Les cookies peuvent etre falsifies : on ne leur fait jamais confiance pour decider d'un acces.

`+layout.server.ts` (racine) ne fait que **propager** `locals.user` / `locals.profile` vers le client (avec les cookies `sb-*` filtres pour l'init du client navigateur). Il ne re-verifie rien.

---

## Autorisation (RBAC) : le role vient de la DB, jamais du JWT

Le role (`'student' | 'teacher' | 'admin'`, enum `user_role`) est lu dans la table `profiles`, **jamais decode depuis le JWT**. Les gardes s'executent **cote serveur** dans les load functions / endpoints.

### Module principal : `src/lib/server/auth.ts`

Travaille a partir d'un **profil deja charge** (pas de re-fetch) :

| Fonction                           | Comportement                                                           |
| ---------------------------------- | ---------------------------------------------------------------------- |
| `getUserProfile(supabase, userId)` | Fetch `profiles` (timeout 10 s, fail-closed `null`). Source de verite. |
| `requireAuth(user)`                | Lève `redirect(303, '/auth/login')` si `user` est `null`.              |
| `requireRole(profile, roles)`      | Lève `error(403)` si le role n'est pas autorise.                       |
| `hasRole(profile, role)`           | Booleen non-bloquant (rendu conditionnel UI).                          |
| `hasAnyRole(profile, roles)`       | Booleen non-bloquant pour plusieurs roles.                             |

### Garde de groupe : `(protected)/+layout.server.ts`

Tout ce qui vit sous `(protected)/` est protege en un seul point :

1. `requireAuth(user)` — redirige les non-connectes vers `/auth/login`.
2. Profil manquant → `error(500)` + log `profile_missing` (compte mal initialise / trigger absent).
3. **Verification du cycle de vie** sur `profile.status` (voir section dediee).
4. Calcul du `consentStatus` (RGPD art. 8) pour les eleves, propage aux routes enfants.

> ⚠️ **Dette technique : deux modules RBAC homonymes.** Il existe **deux** modules nommes `auth` exposant `requireAuth` / `requireRole` :
>
> - `src/lib/server/auth.ts` — opere sur un profil **deja charge** (pas de requete DB).
> - `src/lib/server/middleware/auth.ts` — **re-fetch** le profil depuis `profiles` a chaque appel (`requireAuth`, `requireRole`, `requireRoles` prennent `locals`, pas un profil).
>
> Le second est utilise par les endpoints API (`+server.ts`, ex. les routes `/api/google/auth/*`) qui n'ont pas forcement le profil sous la main. Cette **duplication homonyme** est un piege : verifier toujours **quel** `auth` est importe. Les types `UserRole` / `Profile` exportes par `auth.ts` proviennent d'ailleurs de `middleware/auth.ts`.

---

## Propagation de la session cote client (`src/routes/+layout.ts`)

`+layout.ts` s'execute en SSR **puis** dans le navigateur (hydratation). Il cree le client Supabase adapte a l'environnement et installe l'ecouteur d'evenements d'auth.

**Boucle reactive :** changement d'auth → `invalidate('supabase:auth')` → re-execution des load functions → `+layout.server.ts` **re-verifie cote serveur** (`getUser()`) → données verifiees rediffusees a tous les composants.

> ⚠️ **On n'utilise JAMAIS la session de `onAuthStateChange`.** Elle provient de `localStorage`/cookies (non verifiee). On se contente de **detecter** le changement, puis on declenche une re-verification serveur via `invalidate`. Toute donnee d'auth dans l'app reste donc verifiee par le serveur.

**Throttling de `onAuthStateChange`** (evite les rechargements parasites en changeant d'onglet / d'ecran virtuel macOS) :

| Evenement         | Decision                                                                      |
| ----------------- | ----------------------------------------------------------------------------- |
| `SIGNED_OUT`      | Toujours `invalidate` (deconnexion explicite).                                |
| `SIGNED_IN`       | `invalidate` **uniquement si l'ID utilisateur change** (sinon HMR / refocus). |
| `TOKEN_REFRESHED` | `invalidate` **seulement si > 30 min** depuis le dernier refresh.             |
| `INITIAL_SESSION` | Aucune action.                                                                |

L'etat de throttling (ID utilisateur, dernier refresh) est stocke en **`sessionStorage`** car il survit aux rechargements de module Vite HMR (les variables de module sont reinitialisees).

> ⚠️ **Invariant TDZ Safari/WebKit.** `@supabase/ssr` est **importe dynamiquement** (`await import('@supabase/ssr')`) a l'interieur de la `load`, jamais en import statique en tete de `+layout.ts`. Un import statique cree une chaine de dependances complexe dans le module d'entree de route compile, ce qui declenche sur iPad/Safari le bug WebKit [#242740](https://bugs.webkit.org/show_bug.cgi?id=242740) (« Cannot access 'universal' before initialization »). Le chunk du nœud de layout racine doit rester **< 100 KB**. Idem pour `invalidate` (importe dynamiquement via `invalidateAuth()`). Voir `docs/ref/safari-webkit-tdz.md`.

---

## Cycle de vie du compte (`profiles.status`)

Le champ d'approbation est la colonne **`profiles.status`** (enum `user_status` : `pending | approved | rejected`). Il porte le workflow de moderation des nouveaux comptes.

```
                      INSERT auth.users
                            │
                            ▼
              trigger handle_new_user (SECURITY DEFINER)
                            │
        ┌───────────────────┼─────────────────────────────┐
        ▼                   ▼                              ▼
  pending_students     email @voltairedoha.com        autre email
  (pré-importé)         → status = 'pending'          → status = 'approved'
  → status='approved'   (approbation admin requise)    (compte ouvert)
        │                   │                              │
        └───────────────────┴──────────────┬──────────────┘
                                            ▼
                                     profil créé
                                            │
                  ┌─────────────────────────┼─────────────────────────┐
                  ▼                         ▼                          ▼
            status='pending'        status='approved'          status='rejected'
            → /auth/pending-         → accès (protected)         → signOut + /login?error
              approval                                            (motif: rejection_reason)
```

**Le createur reel du profil est le trigger `handle_new_user`** (`SECURITY DEFINER`, derniere version : migration `20251208120000_fix_voltairedoha_approval_bypass.sql`) :

- s'il existe un `pending_students` non active pour cet email → profil **pre-rempli + `approved`** (l'eleve a ete explicitement ajoute par un prof) et inscription dans ses classes ;
- sinon, `status = 'pending'` pour `@voltairedoha.com`, `'approved'` pour les autres.

> ⚠️ **Le trigger fait foi.** Le bloc « create profile if it doesn't exist » du callback `/auth/callback/+server.ts` (flux 2) est largement un **fallback** : le trigger ayant deja insere la ligne, `existingProfile` est en general non-null. La gestion `pending` / `rejected` du callback reste utile pour orienter la redirection. Le statut est ensuite re-verifie a **chaque** acces protege par `(protected)/+layout.server.ts` (un compte passe a `rejected` est deconnecte au prochain chargement).

---

## Carte des fichiers

### Process 1 — SUPABASE AUTH (login / session) — 20 fichiers, 2 982 lignes

| Fichier                                          | Role                                                             |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| `src/hooks.server.ts`                            | Chaine de handles ; `userProfileHandle` charge `locals`.         |
| `src/lib/server/supabase.ts`                     | Client serveur + `safeGetSession()` (`getUser()` uniquement).    |
| `src/lib/server/auth.ts`                         | RBAC a partir d'un profil chargé (`requireAuth`/`requireRole`…). |
| `src/lib/server/middleware/auth.ts`              | 2e module RBAC (re-fetch) pour endpoints API — **doublon**.      |
| `src/lib/server/env.ts`                          | Validation des variables d'environnement au démarrage.           |
| `src/lib/server/rateLimiter.ts`                  | Rate limiting login (IP + email) et OAuth.                       |
| `src/lib/server/validation/*`                    | Schemas Zod (`loginFormSchema`, `validateFormData`).             |
| `src/routes/+layout.ts`                          | Client Supabase + `onAuthStateChange` + throttling + TDZ fix.    |
| `src/routes/+layout.server.ts`                   | Propage `user`/`profile`/cookies `sb-*` au client.               |
| `src/routes/(protected)/+layout.server.ts`       | Garde de groupe + verification `status`.                         |
| `src/routes/(public)/auth/login/+page.server.ts` | Actions `login` (email/pwd) et `googleSignIn` (flux 2).          |
| `src/routes/(public)/auth/callback/+server.ts`   | `exchangeCodeForSession` + restriction domaine + avatar.         |
| `src/routes/(public)/auth/pending-approval/*`    | Page d'attente d'approbation.                                    |
| `src/lib/server/notifications.ts`                | `notifyAdminsOfPendingUser` (nouveau compte en attente).         |
| `supabase/migrations/…handle_new_user…`          | Trigger de creation de profil + statut.                          |

### Process 2 — GOOGLE AUTH (autorisation des API Google) — 15 fichiers, 5 982 lignes

| Fichier                                            | Role                                                                                                                                      |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/server/google/oauth.ts`                   | `getAuthUrl` / `exchangeCodeForTokens` / `refreshAccessToken` / `revokeAccess` / `validateToken` ; `GOOGLE_CLASSROOM_SCOPES` ; PKCE S256. |
| `src/lib/server/google/encryption.ts`              | `encryptToken` / `decryptToken` (AES-256-GCM).                                                                                            |
| `src/lib/server/google/index.ts`                   | Hub d'export du sous-systeme Google.                                                                                                      |
| `src/lib/server/google/README.md`                  | Documentation interne du module.                                                                                                          |
| `src/routes/api/google/auth/connect/+server.ts`    | Entree flux 3 : `requireRole('teacher')` + state + PKCE.                                                                                  |
| `src/routes/api/google/auth/callback/+server.ts`   | Echange code → tokens, chiffre, INSERT `google_integrations`.                                                                             |
| `src/routes/api/google/auth/status/+server.ts`     | Etat de connexion Google du prof.                                                                                                         |
| `src/routes/api/google/auth/disconnect/+server.ts` | Revocation + suppression de l'integration.                                                                                                |
| `src/lib/types/google.ts`                          | Types des reponses OAuth/token Google.                                                                                                    |
| `supabase/migrations/…google_integrations…`        | Table de stockage des tokens chiffres.                                                                                                    |

> Les consommateurs `classroom-api`, `drive-api`, `gmail`, `sync`, `drive-sync` qui **utilisent** ces tokens sont hors scope (futur `docs/ref/google-classroom/`).

---

## Guide : ajouter une route protegee

1. **Cas simple** : placer la route sous `src/routes/(protected)/`. La garde `(protected)/+layout.server.ts` impose deja authentification + `status`. Le profil est accessible via `parent()` ou `locals`, sans re-verifier :

   ```typescript
   // (protected)/ma-page/+page.server.ts
   export const load: PageServerLoad = async ({ parent }) => {
   	const { user, profile } = await parent(); // garanti non-null
   	return { user, profile };
   };
   ```

2. **Restreindre a un role** (page rendue par SvelteKit) : utiliser `auth.ts` sur le profil deja charge.

   ```typescript
   import { requireRole } from '$lib/server/auth';

   export const load: PageServerLoad = async ({ parent }) => {
   	const { profile } = await parent();
   	requireRole(profile, 'teacher'); // 403 si non-teacher
   	return {
   		/* … */
   	};
   };
   ```

3. **Endpoint API** (`+server.ts`) hors du groupe protege : utiliser le **middleware** (qui re-fetch le profil depuis `locals`).

   ```typescript
   import { requireRole } from '$lib/server/middleware/auth';

   export const POST: RequestHandler = async ({ locals }) => {
   	const { user, profile } = await requireRole(locals, 'teacher');
   	// … logique
   };
   ```

> ⚠️ Choisir le bon module : `$lib/server/auth` (profil deja charge) pour les load functions sous `(protected)`, `$lib/server/middleware/auth` (re-fetch) pour les endpoints isoles. Voir la dette technique « deux modules homonymes ».

## Guide : ajouter un role

Le role est l'enum PostgreSQL `user_role` (`'student' | 'teacher' | 'admin'`) et le type TS `UserRole` (`middleware/auth.ts`).

1. **DB** : creer une migration qui etend l'enum :
   `ALTER TYPE user_role ADD VALUE 'mon_role';`
2. **Types** : regenerer les types Supabase (`pnpm db:types`) puis verifier `UserRole` dans `src/lib/server/middleware/auth.ts`.
3. **Libelles** : ajouter le libelle FR dans les maps `roleNames` de `middleware/auth.ts` (`requireRole` / `requireRoles`).
4. **Gardes** : exposer le role la ou il est autorise (`requireRole(profile, 'mon_role')` ou `requireRoles(locals, [...])`).
5. **Trigger** : si le nouveau role doit etre attribue automatiquement, adapter `handle_new_user`.
6. **Tests** : ajouter les cas d'acces autorise/refuse.

---

## Conventions & invariants a retenir

| Invariant                                                         | Pourquoi                                                 |
| ----------------------------------------------------------------- | -------------------------------------------------------- |
| Autorisation **toujours** via `getUser()`, jamais `getSession()`. | Les cookies sont falsifiables (fail-closed).             |
| Role lu en **DB** (`profiles`), jamais decode du JWT.             | Le JWT peut etre perime / la source de verite est la DB. |
| `@supabase/ssr` importe **dynamiquement** dans `+layout.ts`.      | Bug TDZ Safari/WebKit #242740 ; chunk node 0 < 100 KB.   |
| Restriction de domaine (flux 2) verifiee **cote serveur**.        | Le client ne peut pas etre une frontiere de securite.    |
| Tokens Google **chiffres** (AES-256-GCM) avant stockage.          | Defense en profondeur si la DB fuite.                    |
| Flux 3 reserve au role `teacher`, protege par state + PKCE.       | CSRF + interception de code d'autorisation.              |
| Echec de creation de profil → `signOut()` explicite.              | Eviter « login marche puis echoue » (profil orphelin).   |

---

## Pour aller plus loin

- **Securite** : voir [`./security.md`](./security.md) (CSP, CSRF, rate limiting, chiffrement des tokens, validation Zod).
- **Modele de donnees** : voir [`./data-model.md`](./data-model.md) (`profiles`, `google_integrations`, enums `user_role`/`user_status`).
- **Consommateurs Google** : futur `docs/ref/google-classroom/` (Classroom, Drive, Gmail, sync).
- **Bug TDZ Safari** : `docs/ref/safari-webkit-tdz.md`.
- **Module geometrie** (modele de cette doc) : [`../geometry/`](../geometry/).

---

**Derniere mise a jour** : 2026-06-12 | **Version** : 1.0 | **Statut** : vivant
