---
title: 'authentication — Audit couverture & robustesse des tests'
date: 2026-06-12
audience: 'core contributors, test-automator agent'
---

# Audit couverture & robustesse des tests — authentication

Le périmètre « authentication » d'UbuMaths couvre **deux processus distincts** :

- **Process 1 — Supabase Auth** : login email/password + OAuth Google « Voltaire »,
  vérification de session (`safeGetSession`), chargement de profil
  (`userProfileHandle`), RBAC (`requireAuth` / `requireRole` / `requireRoles`),
  flux d'approbation (`approval_status`). Surfaces : `src/lib/server/auth.ts`,
  `src/lib/server/supabase.ts`, `src/lib/server/middleware/auth.ts`,
  `src/hooks.server.ts`, `src/routes/(public)/auth/**`.
- **Process 2 — Google OAuth (Classroom / Drive)** : couche d'**autorisation**
  applicative au-dessus de la session Supabase (un enseignant connecte son compte
  Google pour Classroom + Drive). Surfaces : `src/lib/server/google/oauth.ts`,
  `src/lib/server/google/encryption.ts`, `src/lib/server/google/drive-api.ts`,
  `src/routes/api/google/**`.

Voir [`api.md`](./api.md) pour la référence des surfaces publiques.

---

## 1. Stratégie de test du périmètre

- **Runner** : Vitest, projet serveur. Lancer un fichier précis avec
  `pnpm test:server <path>`. Les tests client (`*.svelte.test.ts`) passent par
  `pnpm test:client`.
- **Pas de tests de triggers** : `pnpm test:triggers` (Docker) ne tourne pas en
  local et n'est **pas** utilisé pour ce périmètre. Toute logique de base de
  données (RLS, triggers d'`approval_status`, contraintes `profiles`) n'a donc
  **aucune couverture automatisée locale**.
- **Tout est mocké** : aucun test ne tape un vrai Supabase ni un vrai Google
  (`getEnv` mocké, `fetch` stubbé globalement, `createClient` Supabase mocké avec
  un store en mémoire). Sain pour la rapidité, mais le risque se déplace sur les
  chemins d'intégration réels (callbacks, hooks) jamais exercés bout-en-bout.

### Fichiers de test rattachés (4)

| Fichier                                         | Tests | Process | Cible                                   |
| ----------------------------------------------- | ----- | ------- | --------------------------------------- |
| `src/lib/server/auth/cron.test.ts`              | 11    | 1       | `verifyCronAuth`, `generateCronSecret`  |
| `src/lib/server/rateLimiter.test.ts`            | 67    | 1 + 2   | rate limiting login/signup/oauth/notifs |
| `src/lib/server/google/drive-api.test.ts`       | 29    | 2       | `GoogleDriveClient` (CRUD Drive)        |
| `src/lib/whiteboard/tests/google-drive.test.ts` | 47    | 2       | état de sync Drive côté whiteboard      |

Comptes vérifiés via `grep -cE '^\s*(it|test)\(' <fichier>` (2026-06-12).

> **Note importante sur le périmètre réel** : ces 4 fichiers testent des fonctions
> **adjacentes** à l'authentification (cron secret, rate limiting, API Drive, état
> de sync). **Aucun** ne teste le cœur du flux d'auth lui-même. Les lacunes de la
> §3 ne sont donc pas des trous mineurs : elles couvrent les chemins les plus
> sensibles du système.

Tests de validation Zod adjacents (hors comptage ci-dessus, voir §2.4) :
`src/lib/server/validation/cron.test.ts` (19 tests).

---

## 2. Couverture par feature

### 2.1 Cron auth (`verifyCronAuth`) — ÉLEVÉE (11 tests) — Process 1

`cron.test.ts` couvre la fonction qui protège les endpoints Vercel Cron :

- **Fail-secure** : rejet `503` quand `CRON_SECRET` est `undefined`.
- En-tête `Authorization` manquant ou format invalide (`Basic …`, `Bearer` seul,
  `Bearer ` vide, pas d'espace) → `401`.
- **Protection timing-attack** : rejet par différence de longueur, puis comparaison
  à temps constant sur la valeur → `401 Invalid token`.
- Token valide → ne throw pas. `Bearer` insensible à la casse.
- `generateCronSecret` : 32 caractères, unicité (100 itérations), hex, entropie.

Couverture **solide** : tous les chemins de garde sécurité sont exercés.

### 2.2 Rate limiting — ÉLEVÉE (67 tests) — Process 1 + 2

`rateLimiter.test.ts` (database-backed, mock Supabase en mémoire). Couvre les
limiteurs qui protègent les portes d'entrée auth :

- `checkLoginRateLimitByIP`, `checkLoginRateLimitByEmail` (Process 1)
- `checkSignupRateLimitByIP` (fenêtre 1 h), `checkOAuthRateLimitByIP` (Process 1 + 2)
- Limiteurs de notifications (create / mark / delete) par rôle, isolation
  utilisateur, isolation create/delete.
- **Edge cases** : entrées expirées (régression « 23505 log spam »), protection
  contre les races (atomicité), messages d'erreur français.

C'est le fichier le plus substantiel. Il teste le **garde-fou** de l'auth, mais
**pas** la logique d'auth elle-même (un rate limit franchi ne dit rien sur la
validité d'un mot de passe).

### 2.3 Google Drive API & sync — ÉLEVÉE (29 + 47 tests) — Process 2

- `drive-api.test.ts` (29) : `GoogleDriveClient` avec `fetch` mocké. CRUD complet
  (`findFolder`, `createFolder`, `getOrCreateAppFolder` idempotent, `createFile`
  multipart, `updateFile`, `listFiles`, `getFileContent`) + **mapping d'erreurs**
  HTTP → erreurs typées (`GoogleTokenExpiredError` 401,
  `GoogleInsufficientPermissionsError` 403, `GoogleNotFoundError` 404, retry sur
  429). C'est la partie « consommation de token » du Process 2, pas l'obtention du
  token.
- `google-drive.test.ts` (whiteboard, 47) : machine d'état de synchronisation
  (`synced`/`modified`/`syncing`/`error`/`disconnected`), parsing de métadonnées,
  filtrage `.ubw`, génération de nom de fichier, auto-sync. **N'exerce aucun appel
  réseau réel** : ce sont des tests de logique pure sur des structures de sync.

### 2.4 Validation Zod cron — MOYENNE (19 tests) — Process 1

`src/lib/server/validation/cron.test.ts` couvre `cronJobsQuerySchema`,
`cronTriggerBodySchema`, `ALLOWED_JOB_PATHS` (allowlist de chemins de jobs). Bon
filet sur les entrées des endpoints cron, mais sans rapport avec login/OAuth.

---

## 3. Angles morts identifiés (lacunes prioritaires)

Cette section est le cœur de l'audit. **Le flux d'authentification principal n'a
quasiment aucun test direct.** Les modules suivants sont en production et non
couverts.

### 3.1 RBAC / session (Process 1) — non testés

| Fonction / fichier                            | Couverture | Risque                                                                 |
| --------------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| `requireAuth` (`middleware/auth.ts`)          | **0 test** | Élevé — garde de 74 endpoints API ; throw 401/403, fetch profil        |
| `requireRole` (`middleware/auth.ts`)          | **0 test** | Élevé — autorisation par rôle, messages FR                             |
| `requireRoles` (`middleware/auth.ts`)         | **0 test** | Élevé — logique OR multi-rôles                                         |
| `requireAuth` (`auth.ts`, homonyme redirect)  | **0 test** | Élevé — redirect 303 `/auth/login` dans les load functions             |
| `requireRole` (`auth.ts`, homonyme error 403) | **0 test** | Élevé — `'No profile found'` vs `'requires {role} role'`               |
| `hasRole` / `hasAnyRole` (`auth.ts`)          | **0 test** | Faible — helpers purs, faciles à tester                                |
| `getUserProfile` (`auth.ts`)                  | **0 test** | Moyen — timeout 10 s, retour `null` sur erreur                         |
| `safeGetSession` (`supabase.ts`)              | **0 test** | Élevé — timeout 15 s, vérif `getUser()`, fallback `{ user: null }`     |
| `userProfileHandle` (`hooks.server.ts`)       | **0 test** | Élevé — chargement profil + journalisation d'erreur sur chaque requête |

**Doublon homonyme à documenter dans les tests** : `requireAuth`/`requireRole`
existent en **deux versions** (`auth.ts` = redirect/error pour load functions,
`middleware/auth.ts` = AuthResult pour endpoints API). Tout futur test doit cibler
explicitement le bon module (voir [`api.md` §1](./api.md)).

### 3.2 Flux login email/password (Process 1) — non testé

Aucun test ne couvre `src/routes/(public)/auth/login`. Pas de test :

- d'un login réussi → création de session → cookie posé,
- d'un mauvais mot de passe → message d'erreur,
- de l'intégration avec `checkLoginRateLimitByIP` / `ByEmail`.

### 3.3 Callback OAuth Supabase + restriction de domaine Voltaire (Process 1) — non testé

`src/routes/(public)/auth/callback/+server.ts` applique
`ALLOWED_DOMAIN = '@voltairedoha.com'` (rejet de tout email ne se terminant pas par
ce domaine, redirect `/login?error=…`). **Cette règle de sécurité n'a aucun test.**
Cas à couvrir en priorité :

- email `@voltairedoha.com` → session créée,
- email `@gmail.com` → rejet + redirect avec message,
- email absent / `null` → rejet,
- code d'échange invalide → comportement d'erreur,
- casse / sous-domaine (`@sub.voltairedoha.com`) → comportement attendu à figer.

### 3.4 Flux d'approbation (`approval_status`) (Process 1) — non testé

La page `auth/pending-approval` et la gate `approval_status` (référencée dans
`hooks.server.ts`, `+layout.server.ts`, `(protected)/+layout.server.ts`) n'ont
aucun test. Cas à couvrir : utilisateur `pending` bloqué hors des routes
protégées, `approved` autorisé, `rejected` redirigé.

### 3.5 Google OAuth core (Process 2) — non testé

`src/lib/server/google/oauth.ts` est entièrement non testé alors qu'il porte la
cryptographie PKCE et l'échange de tokens :

- `getAuthUrl(state?)` : verifier PKCE + challenge S256, propagation du `state`.
- `exchangeCodeForTokens(code, codeVerifier)` : succès, erreur Google, réponse
  malformée (échec Zod).
- `refreshAccessToken(refreshToken)` : succès, `invalid_grant`, réponse invalide.
- `revokeAccess`, `hasRequiredDriveScope`, `shouldRefreshToken`, `validateToken`,
  `parseGoogleAPIError` : 0 test (dont `hasRequiredDriveScope`, triviale à couvrir).
- Le **callback OAuth Google** (`src/routes/api/google/auth/callback/+server.ts`)
  qui vérifie le `state` CSRF, lit le verifier en cookie, échange le code et stocke
  les tokens chiffrés : **0 test**.

### 3.6 Encryption des tokens (Process 2) — non testé

`src/lib/server/google/encryption.ts` (AES-256-GCM) n'a aucun test direct, alors
qu'il existe déjà une fonction `testEncryption()` exportée prête à servir de base.
Cas à couvrir : roundtrip `encryptToken`/`decryptToken`, clé manquante → throw,
clé < 32 caractères → throw, token vide → throw, payload tronqué → « too short »,
auth tag falsifié → échec de déchiffrement, `hashToken` déterministe.

### 3.7 Schémas de validation Google (Process 2) — non testés

`src/lib/server/validation/google.ts` (23 schémas de partage Classroom/Drive) n'a
**aucun fichier de test** alors que les autres modules `validation/*` en ont un.

---

## 4. Qualité des assertions

- **`cron.test.ts`** : assertions substantielles — vérifie le `status` HTTP **et**
  le contenu du message (`toContain('Invalid token')`, etc.). Le test d'entropie de
  `generateCronSecret` est une heuristique (« ≥ 8 caractères distincts »), donc
  faible garantie cryptographique mais acceptable en non-régression.
- **`drive-api.test.ts`** : bonnes assertions — vérifie le mapping vers les erreurs
  typées et l'idempotence de `getOrCreateAppFolder`. Couplé à la forme exacte des
  réponses mockées ; un changement de format Drive ne serait pas détecté.
- **`google-drive.test.ts`** (whiteboard) : tests de logique pure sur la machine
  d'état ; ne valent que pour ce qui est en mémoire, **pas** pour l'I/O réelle.
- **`rateLimiter.test.ts`** : très complet, y compris messages français et cas de
  course. Un test de régression nommé explicitement (« 23505 log spam »).

---

## 5. Tests fragiles / couplés

- **Timeouts non testés** : `getUserProfile` (10 s), `safeGetSession` (15 s)
  utilisent `Promise.race` + `setTimeout`. Aucun test n'utilise de faux timers
  (`vi.useFakeTimers`) pour vérifier le fallback `{ user: null }` / `null`.
- **Mock Supabase maison** (`rateLimiter.test.ts`) : `Map` globale en mémoire
  rejouant `rate_limits`. Fidèle mais à maintenir manuellement si le schéma SQL
  évolue ; un drift ne casserait pas le test.
- **`drive-api.test.ts`** : `vi.stubGlobal('fetch', mockFetch)` global ; ordre des
  appels `fetch` implicite (findFolder puis createFolder). Sensible à un
  réordonnancement interne.

---

## 6. Top priorités à tester

Par ordre de retour sur investissement (sécurité × absence de couverture) :

1. **Restriction de domaine Voltaire** (§3.3) — règle de sécurité d'accès, 0 test.
   Tester le callback `auth/callback/+server.ts` (email autorisé / refusé /
   absent). **CRITIQUE.**
2. **`encryption.ts` roundtrip + gardes** (§3.6) — crypto de tokens, base
   `testEncryption()` déjà fournie. Faible coût, fort enjeu. **CRITIQUE.**
3. **RBAC middleware** (§3.1) — `requireAuth`/`requireRole`/`requireRoles`
   (`middleware/auth.ts`) avec mock `locals` ; 401/403 et messages FR. Garde 74
   endpoints. **ÉLEVÉE.**
4. **RBAC load-function** (§3.1) — `requireAuth`/`requireRole` (`auth.ts`) :
   redirect 303 vs error 403, et `getUserProfile` (timeout + `null`). **ÉLEVÉE.**
5. **`oauth.ts` PKCE + échange** (§3.5) — `getAuthUrl`, `exchangeCodeForTokens`,
   `refreshAccessToken` (dont `invalid_grant`), `hasRequiredDriveScope`. `fetch`
   mocké comme dans `drive-api.test.ts`. **ÉLEVÉE.**
6. **`safeGetSession` + `userProfileHandle`** (§3.1) — vérif `getUser()`, fallback
   timeout, profil manquant. **MOYENNE.**
7. **Flux `approval_status`** (§3.4) et **flux login** (§3.2) — intégration de
   routes, plus coûteux mais chemins critiques. **MOYENNE.**
8. **`validation/google.ts`** (§3.7) — aligner sur les autres `validation/*.test.ts`.
   **FAIBLE.**

---

## 7. Recommandations

- **Privilégier l'unitaire bas niveau** : `encryption.ts`, `hasRequiredDriveScope`,
  `hasRole`/`hasAnyRole`, `shouldRefreshToken` sont des fonctions pures testables en
  quelques lignes — meilleur ratio coût/bénéfice avant tout test d'intégration.
- **Mocker `locals`** pour le RBAC : un helper `makeLocals({ user, profile })`
  éviterait la duplication entre les tests des deux `requireAuth`.
- **Faux timers obligatoires** pour les branches timeout (`getUserProfile`,
  `safeGetSession`).
- **Marquer les régressions** : conserver la convention de `rateLimiter.test.ts`
  (`describe('… (regression: 23505 log spam)')`) sur tout test issu d'un bug.
- **Ne pas viser l'exhaustivité réseau** : garder Google/Supabase mockés ; la
  valeur est dans les branches de décision (domaine, rôle, état token).
