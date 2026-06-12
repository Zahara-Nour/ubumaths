# Authentification : glossaire

> Documentation de reference UbuMaths. Date : 2026-06-12.
> A lire avec [decisions.md](decisions.md) (decisions d'architecture).

UbuMaths distingue **deux processus** qui partagent le vocabulaire OAuth mais
n'ont pas le meme but :

- **Process 1 — « supabase auth »** : le **login** (email+password OU « Sign in
  with Google » Voltaire via `signInWithOAuth`). Produit une **session
  Supabase**. C'est l'identite de l'utilisateur dans l'app.
- **Process 2 — « google auth »** : l'**autorisation OAuth 2.0** vers les API
  Google (Classroom, Drive, Gmail) pour un prof deja connecte. Produit des
  **tokens Google** chiffres en base. Ce n'est **PAS** un login.

Chaque terme ci-dessous precise s'il releve de **P1**, **P2**, ou des **deux**.

---

## Termes (ordre alphabetique)

**`access token`** (P1 et P2) — Jeton de courte duree qui autorise un appel.
En P1 c'est le JWT Supabase porte par le cookie de session. En P2 c'est le jeton
Google (~1h) stocke chiffre dans `google_integrations.access_token`, rafraichi
via `refreshAccessToken()` quand il expire (`shouldRefreshToken`).

**`approval_status`** (P1) — Concept de workflow d'approbation. **Le nom reel de
la colonne en base est `status`** (type enum `user_status` : `pending` |
`approved` | `rejected`). Un compte cree reste `pending` tant qu'un admin ne l'a
pas approuve ; voir le trigger `handle_new_user` et la decision 7.

**Authorization Code Flow** (P1 et P2) — Variante d'OAuth 2.0 ou le serveur
recoit d'abord un **code** d'autorisation (via redirection), puis l'echange
contre des jetons dans un appel serveur-a-serveur. Les deux processus l'utilisent
mais l'echange differe : `exchangeCodeForSession` (P1) vs
`exchangeCodeForTokens` (P2).

**`exchangeCodeForSession`** (P1) — Methode `supabase.auth` appelee dans
`auth/callback/+server.ts`. Echange le code Google contre une **session
Supabase** (cookies). C'est l'etape qui « connecte » l'utilisateur.

**`exchangeCodeForTokens`** (P2) — Fonction maison (`server/google/oauth.ts`)
appelee dans `api/google/auth/callback`. Echange le code contre des **tokens
Google** (access + refresh) avec verification PKCE (`code_verifier`). Ne touche
PAS a la session Supabase. A ne pas confondre avec `exchangeCodeForSession`.

**fail-open / fail-closed** (P1) — Comportement face a une panne du backend de
rate limiting. **fail-open** = autoriser la requete malgre l'erreur (choix
d'UbuMaths, voir decision 8). **fail-closed** = bloquer par defaut. UbuMaths est
fail-open pour ne pas transformer une panne DB en deni de service.

**`getUser()`** (P1) — `supabase.auth.getUser()` interroge le serveur d'auth
Supabase pour **verifier** le JWT. C'est la seule source d'autorite pour
l'autorisation cote serveur (decision 1). Utilise dans `safeGetSession`.

**`getSession()`** (P1) — Lit la session **directement depuis les cookies**, sans
verification serveur. **Jamais utilise pour l'autorisation** (le cookie peut etre
falsifie). Voir decision 1.

**`google_integrations`** (P2) — Table SQL stockant l'integration Google d'un
prof : `teacher_id` (unique), `access_token` et `refresh_token` (chiffres
AES-256-GCM), `token_expiry`, `scopes[]`, `google_email`. Une ligne par prof.

**`GOOGLE_CLASSROOM_SCOPES`** (P2) — Constante (`server/google/oauth.ts`) listant
les scopes demandes : `openid`, `email`, `profile`, plusieurs
`classroom.*.readonly`, `courseworkmaterials`, `drive.file`, `gmail.send`.

**`handle` / chaine de hooks** (P1) — Fonction `handle` de SvelteKit
(`hooks.server.ts`). UbuMaths chaine plusieurs hooks : un qui cree le client
Supabase + `safeGetSession` (`server/supabase.ts`), puis un qui charge le profil
et applique les regles d'acces. Chaque requete passe par cette chaine.

**`handle_new_user`** (P1) — Trigger Postgres `SECURITY DEFINER` sur
`auth.users INSERT`. Cree automatiquement la ligne `profiles` correspondante :
role `student`, et `status` = `pending` pour les emails `@voltairedoha.com`,
`approved` sinon (et `approved` pour les eleves pre-importes). Voir decision 7.

**IdP (fournisseur d'identite)** (P1 et P2) — Service qui authentifie un
utilisateur. En P1, l'IdP effectif est **Supabase Auth** (qui delegue a Google
pour le bouton Voltaire). En P2, **Google** est le fournisseur d'autorisation
OAuth des API Classroom/Drive/Gmail.

**JWT** (P1) — JSON Web Token signe representant la session Supabase, transporte
par cookie. **Le contenu n'est pas fait confiance tel quel** : on le verifie via
`getUser()`, et le role n'en est jamais lu (decision 2).

**`locals`** (P1) — Objet `event.locals` de SvelteKit, peuple par les hooks.
Contient `locals.supabase` (client) et `locals.safeGetSession`. C'est le canal
par lequel les `+page.server.ts` et middlewares accedent a l'auth.

**OAuth 2.0** (P1 et P2) — Protocole d'autorisation deleguee. P1 l'utilise pour
le login Google ; P2 pour acceder aux API Google au nom du prof.

**PKCE** (P2) — _Proof Key for Code Exchange_. Le client genere un
**`code_verifier`** aleatoire et son **`code_challenge`** (SHA-256, methode
`S256`). Le challenge part avec la demande, le verifier est garde en cookie
httpOnly et fourni a l'echange. Empeche l'interception du code. Implemente
manuellement en P2 (`generateCodeVerifier` / `generateCodeChallenge`). En P1, le
PKCE est gere en interne par `@supabase/ssr`.

**RBAC** (P1) — _Role-Based Access Control_. Autorisation basee sur le role.
Deux implementations homonymes coexistent : `server/auth.ts` (helpers de load
functions) et `server/middleware/auth.ts` (`requireAuth`/`requireRole` pour les
API). Voir decision 9 (dette).

**`refresh token`** (P1 et P2) — Jeton de longue duree servant a obtenir un
nouvel `access token`. En P1, gere par Supabase via cookies. En P2, stocke
chiffre dans `google_integrations.refresh_token` ; `access_type=offline` +
`prompt=consent` sont demandes pour le garantir.

**restriction de domaine (`hd` / `@voltairedoha.com`)** (P1) — Limitation des
comptes Google autorises au login au domaine `@voltairedoha.com`. **Appliquee
cote serveur** dans `auth/callback/+server.ts` (constante `ALLOWED_DOMAIN`), pas
via le parametre Google `hd` cote client. Voir decision 3.

**RLS (Row Level Security)** (P1 et P2) — Politiques Postgres restreignant
l'acces aux lignes selon l'utilisateur. Active sur `profiles`,
`google_integrations`, `rate_limits`, etc. Complement de la verification cote
app, pas un substitut.

**role (student / teacher / admin)** (P1) — Valeur de `profiles.role`. **Toujours
lue depuis la table `profiles`**, jamais depuis le JWT ou le client (decision 2).
Determine l'acces aux routes et fonctionnalites.

**`safeGetSession`** (P1) — Helper expose sur `locals` (`server/supabase.ts`).
Appelle `getUser()` (avec timeout 15s) et retourne `{ user }` verifie, ou
`{ user: null }`. Point d'entree unique de l'auth cote serveur.

**scope** (P2) — Permission Google demandee (ex. `classroom.courses.readonly`,
`drive.file`, `gmail.send`). L'ensemble demande est `GOOGLE_CLASSROOM_SCOPES` ;
les scopes accordes sont stockes dans `google_integrations.scopes`.

**Session (Supabase)** (P1) — Etat d'authentification d'un utilisateur dans
l'app, materialise par des cookies (JWT access + refresh). Cree au login, verifie
a chaque requete via `getUser()`. C'est le seul « login » d'UbuMaths.

**`signInWithOAuth`** (P1) — Methode `supabase.auth` declenchee par l'action
serveur `googleSignIn` (login). Construit l'URL de consentement Google avec
`redirectTo` vers `/auth/callback`. Initie le login Google Voltaire.

**`state` (anti-CSRF)** (P2) — Valeur aleatoire (`crypto.randomUUID()`) envoyee
dans la demande d'autorisation et stockee en cookie httpOnly, puis comparee au
retour pour bloquer le CSRF. **Gere explicitement en P2.** En P1, la protection
CSRF est deleguee a `@supabase/ssr`.

**`@supabase/ssr`** (P1) — Librairie liant Supabase Auth aux cookies serveur de
SvelteKit (`createServerClient` / `createBrowserClient`). **Importee
dynamiquement** dans `+layout.ts` pour respecter l'invariant TDZ Safari/WebKit
(decision 4).

**invariant TDZ Safari/WebKit** (P1) — Contrainte interdisant tout import statique
de librairie lourde (dont `@supabase/ssr`) dans `+layout.ts`, sous peine d'une
erreur « Cannot access 'universal' before initialization » sur iOS. Le chunk du
node racine doit rester < 100KB. Voir [safari-webkit-tdz.md](../safari-webkit-tdz.md)
et decision 4.
