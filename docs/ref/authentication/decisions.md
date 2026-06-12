# Authentification : decisions d'architecture

> Documentation de reference UbuMaths. Date : 2026-06-12.
> Format ADR : chaque decision = **Contexte / Decision / Raison / Consequences**.
> Vocabulaire et processus : voir [glossaire.md](glossaire.md).

UbuMaths a **deux processus** d'authentification distincts :

- **Process 1 — « supabase auth »** : le login (email+password ET « Sign in with
  Google » Voltaire via `signInWithOAuth`) qui produit une **session Supabase**.
- **Process 2 — « google auth »** : l'autorisation OAuth 2.0 (Classroom / Drive /
  Gmail, PKCE, tokens chiffres en `google_integrations`). **Pas un login.**

Chaque decision precise le processus concerne.

---

## Table des matieres

1. [`getUser()` uniquement pour l'autorisation](#1-getuser-uniquement-pour-lautorisation-p1)
2. [Role lu depuis `profiles`, jamais du JWT](#2-role-lu-depuis-profiles-jamais-du-jwt-p1)
3. [Restriction de domaine Voltaire cote serveur](#3-restriction-de-domaine-voltaire-cote-serveur-p1)
4. [Import dynamique de `@supabase/ssr`](#4-import-dynamique-de-supabasessr-p1)
5. [PKCE + `state` explicites pour Google Classroom](#5-pkce--state-explicites-pour-google-classroom-p2)
6. [Tokens Google chiffres AES-256-GCM en base](#6-tokens-google-chiffres-aes-256-gcm-en-base-p2)
7. [Workflow d'approbation des comptes](#7-workflow-dapprobation-des-comptes-p1)
8. [Rate limiting fail-open](#8-rate-limiting-fail-open-p1)
9. [Deux modules RBAC homonymes (decision ouverte)](#9-deux-modules-rbac-homonymes-decision-ouverte)

---

## 1. `getUser()` uniquement pour l'autorisation (P1)

**Contexte.** La session Supabase est portee par des cookies. Un cookie peut etre
falsifie ; le JWT qu'il contient peut etre forge ou perime. `getSession()` lit ce
cookie sans verification serveur, alors que `getUser()` interroge le serveur
d'auth Supabase et valide reellement le jeton.

**Decision.** Toute autorisation passe par `getUser()`, jamais par `getSession()`.
Le helper unique `safeGetSession` (`server/supabase.ts`) appelle `getUser()` (avec
timeout 15s) et expose `{ user }` verifie sur `locals`. Cote client
(`+layout.ts`), on ne fait pas non plus confiance a la session de
`onAuthStateChange` ; la verification fait autorite cote serveur.

**Raison.** Seul `getUser()` garantit que l'utilisateur est authentique. Le
commentaire de `safeGetSession` est explicite : « Cookies can be tampered with, so
we never trust them blindly. Always verify with `getUser()`. »

**Consequences.**

- Un appel reseau par requete authentifiee (mitige par le timeout 15s qui fail
  vers `user: null` plutot que de bloquer).
- `getSession()` est interdit pour les checks d'acces dans tout le code.
- Source : `src/lib/server/supabase.ts`.

---

## 2. Role lu depuis `profiles`, jamais du JWT (P1)

**Contexte.** Le role (`student` / `teacher` / `admin`) decide de l'acces aux
routes et aux API. On pourrait l'embarquer dans le JWT (claims) pour eviter une
requete, mais un claim est fige a l'emission du jeton et provient de donnees que
le client a pu influencer.

**Decision.** Le role est **toujours** lu depuis la table `profiles` en base, via
une requete serveur (`getUserProfile` dans `server/auth.ts`, ou la requete
`profiles` dans `server/middleware/auth.ts`). Jamais depuis le JWT ni le client.

**Raison.** La table `profiles` est la **source unique de verite**. Lire le role
en base garantit qu'un changement de role (ou une approbation) prend effet
immediatement, et qu'aucune donnee cliente ne peut elever les privileges. Le
commentaire d'en-tete de `server/auth.ts` le pose en principe : « User role comes
from database `profiles` table (not from client or JWT). »

**Consequences.**

- Une requete `profiles` par check d'autorisation (mitigee dans les API par la
  reutilisation du profil deja charge dans la session).
- Un user authentifie sans ligne `profiles` (orphelin) recoit un 403
  (`Profil utilisateur introuvable`).
- Source : `src/lib/server/auth.ts`, `src/lib/server/middleware/auth.ts`.

---

## 3. Restriction de domaine Voltaire cote serveur (P1)

**Contexte.** Le login Google Voltaire ne doit accepter que les comptes
`@voltairedoha.com`. Google offre un parametre `hd` (hosted domain) qu'on peut
passer cote client pour pre-filtrer le selecteur de compte, mais ce parametre est
un confort d'UX, pas une garantie de securite (il peut etre retire de la requete).

**Decision.** La restriction est appliquee **cote serveur** dans
`auth/callback/+server.ts`, apres `exchangeCodeForSession` : on verifie
`email.endsWith('@voltairedoha.com')` (constante `ALLOWED_DOMAIN`). Si le domaine
ne correspond pas, on appelle `supabase.auth.signOut()` et on redirige vers
`/login?error=...`. L'action `googleSignIn` ne passe pas de `hd` dans
`signInWithOAuth` — la verification ne repose donc pas sur le client.

**Raison.** Un controle uniquement cote bouton serait contournable. Le callback
serveur est le seul point ou l'email reel (verifie par Google) est disponible
avant l'etablissement durable de la session. C'est la qu'il faut trancher.

**Consequences.**

- Un compte hors domaine est deconnecte immediatement, meme s'il a passe le
  consentement Google.
- La valeur `@voltairedoha.com` est codee en dur a deux endroits (le callback et
  le trigger SQL `handle_new_user`) ; un changement de domaine impose de mettre a
  jour les deux.
- Source : `src/routes/(public)/auth/callback/+server.ts`.

---

## 4. Import dynamique de `@supabase/ssr` (P1)

**Contexte.** En production, Vite regroupe `+layout.ts` (node racine) et ses
imports statiques dans un seul chunk. Si `@supabase/ssr` y est importe
statiquement, le chunk gonfle (~231KB) et JavaScriptCore (Safari/iOS) peut
initialiser les bindings du module dans un ordre qui declenche une erreur TDZ
« Cannot access 'universal' before initialization ». V8 (Chrome) ne reproduit pas
le bug ; il est intermittent et invisible dans les logs serveur (erreur cote
hydratation).

**Decision.** Importer `@supabase/ssr` (et `$app/navigation`) **dynamiquement**
dans `+layout.ts` : `const { createBrowserClient, createServerClient, isBrowser }
= await import('@supabase/ssr')`. Le node racine doit rester **< 100KB**.

**Raison.** L'import dynamique sort la dependance lourde de la chaine statique du
module d'entree : l'objet `universal` est cree immediatement, les libs ne sont
chargees qu'a l'appel de `load`. Le chunk passe de 231KB a 49KB. Detail complet
dans [safari-webkit-tdz.md](../safari-webkit-tdz.md) (bug WebKit #242740) ; rappel
dans MEMORY.md (« Safari/WebKit TDZ Bug — CRITICAL »).

**Consequences.**

- **Contrainte permanente** : ne jamais ajouter d'import statique de librairie
  lourde dans `+layout.ts`. Seuls `$env/static/public` et les `import type` sont
  surs.
- Verification post-build :
  `wc -c .svelte-kit/output/client/_app/immutable/nodes/0.*.js` doit etre < 100KB.
- Source : `src/routes/+layout.ts`, `src/hooks.client.ts`.

---

## 5. PKCE + `state` explicites pour Google Classroom (P2)

**Contexte.** Le flux Google Classroom (P2) est implemente a la main (pas via
`@supabase/ssr`) car il vise les API Google, pas la session Supabase. Un
Authorization Code Flow public doit se proteger contre (a) l'interception du code
(PKCE) et (b) le CSRF sur la redirection (`state`).

**Decision.** Implementer PKCE et `state` explicitement :

- **PKCE** : `getAuthUrl` genere un `code_verifier` aleatoire et son
  `code_challenge` SHA-256 (`code_challenge_method=S256`) ; le verifier est
  stocke en cookie httpOnly et refourni a `exchangeCodeForTokens`.
- **`state`** : `crypto.randomUUID()` stocke en cookie httpOnly, compare au retour
  dans `api/google/auth/callback` (rejet 400 si mismatch).
- Les cookies (`google_oauth_state`, `google_code_verifier`) sont `httpOnly`,
  `secure`, `sameSite=lax`, expirent en 10 min, et sont supprimes apres usage.

Pour le **login Google** (P1), au contraire, on **delegue** PKCE et CSRF a
`@supabase/ssr` ; `signInWithOAuth` n'a besoin que de `redirectTo`.

**Raison.** P2 sort du perimetre de `@supabase/ssr` : la protection doit etre
codee. P1 reste dans ce perimetre : reimplementer PKCE/CSRF y serait redondant et
risque. Deux flux, deux responsabilites de securite differentes.

**Consequences.**

- P2 demande `access_type=offline` + `prompt=consent` pour garantir un refresh
  token ; son absence est traitee comme une erreur 500.
- La duplication de logique OAuth entre P1 (delegue) et P2 (manuel) est assumee :
  ce sont deux finalites distinctes.
- Sources : `src/lib/server/google/oauth.ts`,
  `src/routes/api/google/auth/connect/+server.ts`,
  `src/routes/api/google/auth/callback/+server.ts`.

---

## 6. Tokens Google chiffres AES-256-GCM en base (P2)

**Contexte.** L'access token et surtout le refresh token Google donnent acces aux
donnees Classroom/Drive/Gmail du prof. Les stocker en clair en base exposerait ces
acces a quiconque lit la table (fuite, sauvegarde, acces DB).

**Decision.** Chiffrer les tokens avec **AES-256-GCM** avant insertion dans
`google_integrations`. La cle 256 bits est derivee par SHA-256 de la variable
`GOOGLE_TOKEN_ENCRYPTION_KEY` (>= 32 caracteres). Le format stocke (base64) est
`[IV 16o][AuthTag 16o][donnees chiffrees]`. Le chiffrement/dechiffrement se fait
**cote Node** (`server/google/encryption.ts`, `encryptToken`/`decryptToken`) ; la
base ne stocke que du TEXT pre-chiffre.

**Raison.** GCM fournit confidentialite **et** integrite (auth tag) : un token
altere en base echoue au dechiffrement. La cle vit hors base (variable d'env), si
bien qu'un acces a la seule table ne suffit pas a recuperer les tokens. Les
erreurs ne divulguent jamais le token.

**Consequences.**

- `GOOGLE_TOKEN_ENCRYPTION_KEY` doit etre presente et stable ; sa rotation invalide
  tous les tokens existants (les profs devront se reconnecter).
- RLS active sur `google_integrations` en complement (defense en profondeur).
- Sources : `src/lib/server/google/encryption.ts`,
  `supabase/migrations/20251114150000_google_classroom_integration.sql`.

---

## 7. Workflow d'approbation des comptes (P1)

**Contexte.** Un compte Google Voltaire fraichement cree ne doit pas acceder
immediatement a l'application : un admin doit valider. Historiquement, le trigger
creait le profil **sans** champ statut, et la colonne ayant un DEFAULT
`approved`, les nouveaux comptes contournaient l'approbation — l'INSERT cote
callback arrivait trop tard (profil deja cree).

**Decision.** Le trigger Postgres `handle_new_user` (SECURITY DEFINER, sur
`auth.users INSERT`) cree le profil avec un statut explicite :

- eleve pre-importe (`pending_students`) -> `role=student`, `status=approved` ;
- email `@voltairedoha.com` -> `role=student`, **`status=pending`** ;
- autres -> `role=student`, `status=approved`.

L'approbation se fait ensuite via `PATCH /api/admin/users/[id]/status` (teacher
ou admin) qui passe `status` a `approved` ou `rejected` (avec
`rejection_reason`, `status_changed_at`, `status_changed_by`). Les hooks et le
callback redirigent les comptes `pending` vers `/auth/pending-approval` et
deconnectent les comptes `rejected`.

**Raison.** Fixer le statut **a la creation, dans le trigger** ferme la faille du
DEFAULT : c'est la seule etape garantie de s'executer pour tout nouvel
utilisateur. La logique est centralisee cote base, pas dependante d'un INSERT
applicatif qui peut perdre la course.

**Consequences.**

- Le nom conceptuel « approval_status » correspond a la colonne reelle **`status`**
  (enum `user_status` : `pending` | `approved` | `rejected`).
- La valeur `@voltairedoha.com` est dupliquee (trigger + callback) — cf.
  decision 3.
- Un echec d'INSERT du profil cote callback doit deconnecter l'utilisateur (sinon
  session valide sans profil = deconnexion silencieuse au prochain load).
- Sources :
  `supabase/migrations/20251208120000_fix_voltairedoha_approval_bypass.sql`,
  `src/routes/(public)/auth/callback/+server.ts`,
  `src/routes/api/admin/users/[id]/status/+server.ts`.

---

## 8. Rate limiting fail-open (P1)

**Contexte.** Le rate limiting (login par IP et par email, OAuth, signup, etc.)
est adosse a une table Postgres (`rate_limits`) interrogee via RPC. Si ce backend
echoue (panne DB, timeout), il faut choisir : **bloquer** toutes les requetes
(fail-closed) ou les **laisser passer** (fail-open).

**Decision.** **Fail-open** : en cas d'erreur du backend de rate limiting, la
fonction retourne `{ limited: false }` / `{ allowed: true }` et la requete est
autorisee. Le code est explicite (`// Fail open`) et le commentaire d'en-tete le
justifie : « Fail-open on database errors (prevents DoS from DB issues). »

**Raison.** Si le rate limiter etait fail-closed, un attaquant pourrait
**transformer une panne (ou une saturation) de la DB en deni de service total** :
casser la base bloquerait tous les logins legitimes. On prefere accepter un risque
temporaire de brute force pendant une panne plutot qu'une indisponibilite
complete.

**Consequences — trade-off assume.**

- Pendant une panne du backend de rate limiting, les protections anti-brute-force
  sont **inactives**. C'est un risque accepte, contrebalance par d'autres couches
  (validation Zod, verification serveur du mot de passe par Supabase).
- Les limites OAuth sont volontairement hautes (100 / 15 min / IP) pour les
  reseaux scolaires partages, ce qui reduit deja les faux positifs.
- Source : `src/lib/server/rateLimiter.ts`.

---

## 9. Deux modules RBAC homonymes (decision ouverte)

**Contexte.** Deux modules portent le meme role d'autorisation et exposent des
fonctions homonymes :

- `src/lib/server/auth.ts` — helpers pour les **load functions** :
  `getUserProfile`, `requireAuth(user)`, `requireRole(profile, roles)`,
  `hasRole`, `hasAnyRole`. Signatures basees sur `user`/`profile` deja charges.
- `src/lib/server/middleware/auth.ts` — middleware pour les **API endpoints** :
  `requireAuth(locals)`, `requireRole(locals, role)`, `requireRoles(locals,
roles)`. Recoit `locals`, refait la requete `profiles`, leve 401/403.

Les deux definissent leur propre `UserRole` / `Profile` et `server/auth.ts`
importe ces types depuis `server/middleware/auth.ts`.

**Decision (ouverte — non tranchee).** Les deux modules coexistent. Le middleware
a ete introduit pour deduplication massive cote API (« eliminates 740 lines of
duplicated auth code across 74 API endpoints »), mais `server/auth.ts` reste utile
pour les load functions ou `user`/`profile` viennent du layout parent. La
convergence (un seul module, ou une frontiere de nommage claire) **n'est pas
decidee**.

**Raison.** Les deux ont des signatures legitimement differentes (l'un travaille
sur `locals`, l'autre sur des objets deja resolus). Mais l'**homonymie**
(`requireAuth`/`requireRole` des deux cotes) est une source de confusion reelle a
l'import.

**Consequences / a trancher.**

- A l'import, verifier d'ou vient `requireRole` : les deux n'ont pas la meme
  signature et le mauvais choix produit une erreur de type ou un double appel DB.
- **Decision a prendre** : (a) renommer l'un des deux jeux de fonctions pour lever
  l'ambiguite, (b) fusionner en un module unique, ou (c) documenter formellement
  la frontiere « load functions vs API ». **Dette assumee** en attendant.
- Sources : `src/lib/server/auth.ts`, `src/lib/server/middleware/auth.ts`.

---

## References internes

- [glossaire.md](glossaire.md) — termes et processus.
- [safari-webkit-tdz.md](../safari-webkit-tdz.md) — bug TDZ (decision 4).
- Notes d'implementation (non normatives, dans `.claude/`) :
  `google-integration-complete-summary.md`,
  `google-classroom-phase2-summary.md`,
  `google-integration-fixes-summary.md`. Citees pour memoire, non deplacees.
