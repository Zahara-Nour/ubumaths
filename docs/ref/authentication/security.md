---
title: Audit de securite — theme authentication
date: 2026-06-12
author: security-auditor agent
posture: Solide
---

# Audit de securite — authentication

## Resume executif

Le theme `authentication` couvre **deux processus distincts** qu'il faut garder separes
dans toute analyse :

- **Process 1 — Supabase auth** (login / session) : authentification email+mot de passe
  ET « Sign in with Google » restreint au domaine `@voltairedoha.com`. Ce flux passe par
  `supabase.auth.signInWithOAuth` puis le callback `/auth/callback`, et debouche sur une
  **session Supabase** (cookies httpOnly geres par `@supabase/ssr`). C'est ce qui determine
  _qui est connecte_.
- **Process 2 — Google auth** (integration Classroom/Drive/Gmail) : OAuth applicatif
  cote enseignant, avec **PKCE + state CSRF maison**, pour obtenir des tokens API stockes
  chiffres (AES-256-GCM) dans `google_integrations`. **Ce n'est PAS un login** : il ne cree
  aucune session et ne donne aucun acces a l'application.

La posture globale est **Solide**. Aucun `CRITICAL`, aucun secret en dur, aucune faille
exploitable sans condition n'a ete trouvee. Les controles structurants sont en place :
verification systematique de l'utilisateur via `getUser()`, restriction de domaine
**cote serveur** non contournable, RBAC lu en base (pas dans le JWT), chiffrement
authentifie des tokens, rate-limiting atomique a deux dimensions, suite complete
d'en-tetes de securite et protection CSRF par origine.

Les findings `MEDIUM` listes plus bas sont des **incoherences et durcissements**
(open redirect residuel, parite de validation de mot de passe, deny-by-default, KDF)
plutot que des vulnerabilites directement exploitables.

---

## 1. Surface d'attaque

### Points d'entree Process 1 (session)

| Entree                           | Fichier                                                           | Notes                                                     |
| -------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------- |
| Login email/mot de passe         | `src/routes/(public)/auth/login/+page.server.ts` (action `login`) | Validation Zod + double rate-limit IP/email               |
| Initiation OAuth Google          | meme fichier (action `googleSignIn`)                              | `signInWithOAuth`, rate-limit OAuth par IP                |
| Callback OAuth                   | `src/routes/(public)/auth/callback/+server.ts`                    | Echange du code, **restriction de domaine cote serveur**  |
| Confirmation e-mail / reset      | `src/routes/(public)/auth/confirm/+server.ts`                     | `verifyOtp`, anti-open-redirect via `validateRedirectUrl` |
| Demande de reset                 | `src/routes/(public)/auth/reset-password/+page.server.ts`         | Anti-enumeration (reponse generique)                      |
| Mise a jour mot de passe         | `src/routes/(public)/auth/update-password/+page.server.ts`        | Session temporaire requise                                |
| Garde de session (toute requete) | `src/lib/server/supabase.ts` (`safeGetSession`)                   | `getUser()` uniquement                                    |
| Garde des routes protegees       | `src/routes/(protected)/+layout.server.ts`                        | Verifie profil + statut d'approbation                     |

### Points d'entree Process 2 (integration Google)

| Entree                     | Fichier                                          | Notes                                         |
| -------------------------- | ------------------------------------------------ | --------------------------------------------- |
| Connexion Google Classroom | `src/routes/api/google/auth/connect/+server.ts`  | `requireRole('teacher')`, PKCE + state        |
| Callback integration       | `src/routes/api/google/auth/callback/+server.ts` | Validation state CSRF, chiffrement des tokens |
| Stockage tokens            | `src/lib/server/google/encryption.ts`            | AES-256-GCM                                   |
| Authentification CRON      | `src/lib/server/auth/cron.ts`                    | Bearer token, `timingSafeEqual`, fail-closed  |

### Frontieres de confiance

- **Cookies de session** : jamais utilises comme source de verite. `safeGetSession`
  appelle exclusivement `getUser()`, qui valide le jeton aupres du serveur Supabase.
- **Role** : lu en base depuis `profiles.role` a chaque requete protegee — jamais depuis
  les claims du JWT (voir `src/lib/server/auth.ts`, `src/lib/server/middleware/auth.ts`).
- **Tokens Google API** : chiffres au repos ; jamais exposes au client ; geres uniquement
  cote serveur.

---

## 2. Controles de securite positifs

Les controles suivants sont confirmes correctement implementes :

- **Verification stricte de la session via `getUser()`.**
  `safeGetSession` (`src/lib/server/supabase.ts:71-105`) n'appelle jamais `getSession()`
  (qui lit les cookies sans verification) : il fait un appel reseau a `auth.getUser()`
  avec timeout de 15 s, et retourne `null` si la verification echoue. C'est le controle
  le plus important du theme : il empeche l'usage de sessions falsifiees depuis les cookies.

- **Restriction de domaine appliquee cote serveur.**
  Dans le callback OAuth (`src/routes/(public)/auth/callback/+server.ts:78-91`), l'email
  est compare a `@voltairedoha.com` _apres_ l'echange du code, et tout email hors domaine
  declenche `signOut()` immediat. Cette garde est **non contournable** : elle ne depend
  d'aucun parametre fourni par le client.

- **PKCE S256 + state CSRF pour l'integration Classroom (Process 2).**
  `connect/+server.ts:46-62` genere un `state` (UUID aleatoire) et un code verifier PKCE,
  tous deux stockes dans des cookies `httpOnly, secure, sameSite=lax` a duree de vie 10 min.
  Le callback (`callback/+server.ts:66-72`) refuse toute requete dont le `state` ne
  correspond pas au cookie, et exige la presence du code verifier.

- **Chiffrement authentifie des tokens (AES-256-GCM).**
  `encryption.ts` utilise un IV aleatoire de 16 octets par chiffrement (`encryptToken:83`)
  et un auth tag de 16 octets (GCM), garantissant confidentialite **et** integrite. Les
  messages d'erreur ne fuient ni le token ni le chiffre.

- **RBAC lu en base, pas dans le JWT.**
  `getUserProfile` / `requireRole` / `requireRoles` (`src/lib/server/auth.ts`,
  `src/lib/server/middleware/auth.ts`) chargent le role depuis `profiles` a chaque controle.
  Le commentaire d'en-tete documente explicitement « User role comes from database, not
  from client or JWT ». Pas d'escalade possible via un jeton forge.

- **Double rate-limit de login (IP + email), atomique.**
  `src/lib/server/rateLimiter.ts` s'appuie sur une RPC SQL `check_and_increment_rate_limit`
  (increment atomique cote base) et applique deux buckets independants : par IP et par email
  (`login/+page.server.ts:134-142`). L'OAuth a son propre bucket par IP.

- **Suite complete d'en-tetes de securite + CSP.**
  `src/hooks.server.ts:420-501` pose `Content-Security-Policy`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` et `Strict-Transport-Security`
  (en production).

- **Protection CSRF par origine.**
  `csrfHandle` (`src/hooks.server.ts:242-283`) rejette toute requete a effet de bord
  (POST/PUT/DELETE/PATCH) dont l'en-tete `origin` ne correspond pas au `host`.

- **Anti-open-redirect sur la confirmation e-mail.**
  `validateRedirectUrl` (`confirm/+server.ts:71-90`) n'autorise que les chemins relatifs
  (hors `//`) ou les URLs de meme origine ; tout le reste retombe sur `/`.

- **Anti-enumeration sur la demande de reset.**
  `reset-password/+page.server.ts` retourne toujours un message generique, que l'email
  existe ou non.

- **Authentification CRON robuste.**
  `cron.ts` compare le Bearer token en temps constant (`timingSafeEqual`, lignes 113-119)
  et **fail-closed** : si `CRON_SECRET` n'est pas configure, toutes les requetes sont
  rejetees en 503 (lignes 44-49).

- **RLS active sur toutes les tables du theme** (profiles, google_integrations,
  user_restrictions, user_presence, error_logs) — voir [data-model.md](data-model.md).

---

## 3. Findings

### 3a. Process 1 — Session / login

#### [MEDIUM] Open redirect via `next` non valide dans le callback OAuth

**Fichier :** `src/routes/(public)/auth/callback/+server.ts:48,177`

Le parametre `next` est lu directement depuis l'URL (`url.searchParams.get('next')`)
puis utilise tel quel comme cible de redirection finale (`throw redirect(303, next)`).
Or `next` provient de `redirectTo` cote login (`login/+page.server.ts:92`), qui est lui-meme
lu depuis l'URL de depart — donc influencable par un attaquant fabriquant le lien de login.
Contrairement au handler `/auth/confirm`, qui valide systematiquement via
`validateRedirectUrl`, le callback ne fait aucune verification.

**Impact :** redirection post-authentification vers une URL externe (phishing). L'attaquant
ne vole pas la session, mais peut rediriger un utilisateur authentifie vers un site tiers.

**Reco :** appliquer la meme garde que `confirm` :
`const next = validateRedirectUrl(url.searchParams.get('next') ?? '/dashboard', url.origin);`

#### [MEDIUM] Validation de mot de passe plus faible que le schema Zod

**Fichier :** `src/routes/(public)/auth/update-password/+page.server.ts:75-79`

L'action `updatePassword` valide la longueur en dur avec `password.length < 6`, alors que
`updatePasswordSchema` (`src/lib/server/validation/auth.ts:47-50`) exige `min(8)`. Le schema
Zod existe mais n'est pas utilise ici, ce qui cree une **incoherence** : le formulaire de
reset accepte des mots de passe de 6-7 caracteres que le reste de la base juge invalides.

**Reco :** remplacer le bloc de validation manuel par `updatePasswordSchema.safeParse(...)`.

#### [MEDIUM] Approbation en deny-by-exclusion plutot que deny-by-default

**Fichier :** `src/routes/(protected)/+layout.server.ts:105-115`

La garde bloque explicitement `status === 'pending'` (redirect vers `/auth/pending-approval`)
et `status === 'rejected'` (signOut), mais **laisse passer tout autre statut**. Un statut
inattendu (valeur future, donnee corrompue) accorderait l'acces par defaut.

**Reco :** inverser la logique en `if (profile.status !== 'approved') { ... bloquer ... }`,
de sorte que seul `approved` ouvre l'acces. Note : la valeur par defaut SQL de la colonne
`status` est `approved` (voir [data-model.md](data-model.md)) — d'ou l'importance que la
garde applicative ne fasse pas reposer la securite uniquement sur l'enumeration des statuts
refuses.

#### [MEDIUM] Process 1 sans `state` applicatif

**Fichier :** `src/routes/(public)/auth/login/+page.server.ts:89` et le callback

Le login Google (Process 1) utilise `supabase.auth.signInWithOAuth` sans `state`
applicatif, et le callback ne valide aucun `state` cote application. La protection CSRF du
flux est entierement **deleguee au PKCE interne de `@supabase/ssr`**. C'est un choix
defendable (la lib gere le code verifier en cookie), mais il contraste fortement avec le
Process 2 (integration Classroom) qui implemente un `state` explicite. A documenter pour
eviter qu'un futur contributeur croie le `state` absent par oubli.

#### [LOW] Demande de reset sans rate-limit applicatif ni Zod

**Fichier :** `src/routes/(public)/auth/reset-password/+page.server.ts`

L'action `resetPassword` ne valide l'email qu'avec une presence (`if (!email)`), sans schema
Zod, et ne passe par aucun rate-limiter applicatif (le commentaire mentionne « rate limiting
handled by Supabase »). L'anti-enumeration est correct, mais l'envoi d'e-mails reste
declenchable en boucle dans la limite du quota Supabase.

**Reco :** ajouter `requestPasswordResetSchema` + un bucket de rate-limit par IP/email.

#### [LOW] Restriction de domaine non repliquee a l'initiation (`hd`)

**Fichier :** `src/routes/(public)/auth/login/+page.server.ts:89-94`

L'initiation OAuth ne passe pas le parametre Google `hd=voltairedoha.com`, qui afficherait
directement le bon domaine sur l'ecran de consentement. C'est purement **UX** : le serveur
reste la vraie garde (3a / callback). A noter, `hd` est de toute facon **falsifiable** cote
client et ne doit jamais etre considere comme une mesure de securite.

#### [LOW] Journaux contenant des PII (emails) en production

**Fichiers :** `auth/callback/+server.ts` (logs `user.email`),
`(protected)/+layout.server.ts`, `src/hooks.server.ts:178` (ecrit `user_email` dans le
contexte de `error_logs`).

Plusieurs chemins journalisent l'email de l'utilisateur en clair (logs serveur et table
`error_logs`). C'est de la donnee personnelle ; selon la politique RGPD du projet, il faudrait
la masquer ou la supprimer des logs de production.

### 3b. Process 2 — Integration Google + CRON

#### [MEDIUM] Derivation de cle de tokens sans KDF ni sel

**Fichier :** `src/lib/server/google/encryption.ts:29-31`

`deriveKey` applique un `SHA-256` **brut** sur `GOOGLE_TOKEN_ENCRYPTION_KEY` pour obtenir la
cle AES-256. Il n'y a ni KDF lente (PBKDF2/scrypt/argon2) ni sel. C'est acceptable
**uniquement** si la variable d'environnement est deja une cle aleatoire d'au moins 32 octets
(ce que le `README` de la migration suggere : `openssl rand -base64 32`). Si la cle etait une
passphrase a faible entropie, l'absence de KDF la rendrait vulnerable au brute-force.

**Reco :** documenter l'exigence « cle aleatoire >= 32 octets » comme contrainte dure, ou
passer a un KDF avec sel si une passphrase humaine est envisageable.

#### [MEDIUM] Rate limiter fail-open

**Fichier :** `src/lib/server/rateLimiter.ts:171,178,198`

En cas d'erreur de la RPC ou d'exception (DB indisponible, donnees absentes), `checkRateLimit`
retourne `{ limited: false }` (commentaires explicites « Fail open »). Sous pression sur la
base, le rate-limiting devient donc inoperant.

**Choix assume :** c'est une decision anti-DoS deliberee (ne pas bloquer les connexions
legitimes si la base de rate-limit tombe). **Risque residuel :** une attaque par brute-force
combinee a une saturation de la base contournerait le rate-limit. A garder a l'esprit.

#### [MEDIUM] `generateCronSecret` base sur `Math.random()`

**Fichier :** `src/lib/server/auth/cron.ts:156-166`

La fonction utilitaire de generation de secret combine `Math.random()`, `Date.now()` et
`process.hrtime`, puis hache en SHA-256. `Math.random()` **n'est pas un CSPRNG**, malgre le
commentaire `@security` affirmant « Uses crypto.randomBytes() ». Le secret produit a une
entropie effective inferieure a celle annoncee.

**Reco :** remplacer par `crypto.randomBytes(16).toString('hex')`. A confirmer : cette
fonction n'alimente pas le `CRON_SECRET` de production (cf. § Points a confirmer).

#### [LOW] CSP `script-src` avec `'unsafe-inline'` ET `'unsafe-eval'`

**Fichier :** `src/hooks.server.ts:432`

La directive `script-src` inclut `'unsafe-inline'` et `'unsafe-eval'`. C'est une **dette XSS
connue**, requise par Typst.js (`new Function()` interne) et Pyodide. Elle n'est pas propre au
theme authentication mais affecte toute la surface (un XSS injecte serait execute).

**Reco moyen terme :** migrer vers des **nonces** CSP pour les scripts inline et isoler les
contextes necessitant `unsafe-eval`.

#### [LOW] Comparaison de `state` non constant-time (Process 2)

**Fichier :** `src/routes/api/google/auth/callback/+server.ts:69`

Le `state` CSRF de l'integration Classroom est compare avec `state !== storedState` (egalite
de chaine non constant-time). Le `state` est un UUID aleatoire a usage unique et a courte
duree de vie : le risque de timing attack est tres faible, mais par coherence avec le pattern
`timingSafeEqual` deja utilise pour le CRON, on pourrait l'aligner.

#### [LOW] Rotation de cle de tokens impossible

**Fichier :** `src/lib/server/google/encryption.ts`

Le format de chiffre `[IV][authTag][data]` ne prefixe aucun `keyId`. Il est donc impossible
de faire cohabiter plusieurs versions de cle pendant une rotation : changer
`GOOGLE_TOKEN_ENCRYPTION_KEY` rend indechiffrables tous les tokens existants (les enseignants
devraient se reconnecter).

**Reco :** prefixer un identifiant de version de cle au chiffre pour permettre une rotation
progressive.

#### [LOW] Validation de longueur de cle en caracteres, pas en octets

**Fichier :** `src/lib/server/google/encryption.ts:50-55`

La garde `GOOGLE_TOKEN_ENCRYPTION_KEY.length < 32` compte des **caracteres** JS (UTF-16), pas
des octets. Une cle base64 de 32 caracteres represente ~24 octets de donnees ; le SHA-256
masque cette difference (il sort toujours 32 octets), mais le message d'erreur et l'intention
(« >= 32 octets ») sont trompeurs.

---

## 4. Synthese priorisee

| #   | Severite | Process | Fichier                               | Lignes        | Description                                                   |
| --- | -------- | ------- | ------------------------------------- | ------------- | ------------------------------------------------------------- |
| 1   | MEDIUM   | 1       | `auth/callback/+server.ts`            | 48, 177       | Open redirect : `next` non valide (vs `confirm`)              |
| 2   | MEDIUM   | 1       | `update-password/+page.server.ts`     | 75-79         | `length < 6` en dur alors que Zod exige `min(8)`              |
| 3   | MEDIUM   | 1       | `(protected)/+layout.server.ts`       | 105-115       | Approbation deny-by-exclusion au lieu de `=== 'approved'`     |
| 4   | MEDIUM   | 2       | `google/encryption.ts`                | 29-31         | KDF absente : SHA-256 brut sur la cle de tokens               |
| 5   | MEDIUM   | 2       | `rateLimiter.ts`                      | 171, 178, 198 | Fail-open sur erreur DB (choix anti-DoS assume)               |
| 6   | MEDIUM   | 2       | `auth/cron.ts`                        | 156-166       | `generateCronSecret` base sur `Math.random()`                 |
| 7   | MEDIUM   | global  | `hooks.server.ts`                     | 432           | CSP `unsafe-inline` + `unsafe-eval` (dette XSS Typst/Pyodide) |
| 8   | MEDIUM   | 1       | `login/+page.server.ts`               | 89            | Pas de `state` applicatif (CSRF delegue au PKCE de la lib)    |
| 9   | LOW      | 1       | `reset-password/+page.server.ts`      | —             | Pas de rate-limit applicatif ni Zod                           |
| 10  | LOW      | 1       | `login/+page.server.ts`               | 89-94         | `hd` non transmis (UX ; `hd` falsifiable)                     |
| 11  | LOW      | 1       | `auth/callback`, `hooks.server.ts`    | 178           | PII (emails) journalisees en prod (`error_logs`)              |
| 12  | LOW      | 2       | `api/google/auth/callback/+server.ts` | 69            | `state` compare en `!==` non constant-time                    |
| 13  | LOW      | 2       | `google/encryption.ts`                | —             | Rotation de cle impossible (pas de `keyId`)                   |
| 14  | LOW      | 2       | `google/encryption.ts`                | 50-55         | Longueur de cle validee en caracteres, pas en octets          |

---

## 5. Points a confirmer (hors perimetre lu)

Les elements suivants n'ont pas pu etre tranches par la seule lecture du code du theme et
demandent une verification d'infrastructure ou de configuration :

- **`getClientAddress()` derriere Vercel.** Le rate-limit par IP repose sur
  `getClientAddress()`. Verifier la configuration de confiance des proxys
  (`svelte.config.js`, `trust proxy`) pour s'assurer que l'IP n'est pas usurpable via
  `X-Forwarded-For` (sinon le bucket IP est trivialement contournable).
- **`generateCronSecret` en production.** Confirmer que cette fonction utilitaire
  (`Math.random()`) ne sert qu'a un usage manuel/dev et **n'alimente pas** le `CRON_SECRET`
  reellement deploye.
- **Entropie reelle de `GOOGLE_TOKEN_ENCRYPTION_KEY`.** L'absence de KDF (finding #4) n'est
  acceptable que si cette variable est une cle aleatoire >= 32 octets. A verifier dans la
  config de prod.
- **RLS de `error_logs` et `google_integrations`.** Verifie au niveau des migrations (voir
  [data-model.md](data-model.md)) : `error_logs` est admin-only en lecture + insert
  service-role, `google_integrations` est self-only enseignant + admin en lecture. Confirmer
  qu'aucune migration ulterieure n'a relache ces politiques.

---

## Conclusion

La posture du theme `authentication` est **solide**. Les fondations sont correctes :
verification de session par `getUser()`, garde de domaine cote serveur, RBAC en base,
chiffrement authentifie, rate-limiting atomique, CSRF par origine et anti-open-redirect sur
le flux de confirmation. Aucun `CRITICAL`, aucun secret en dur, aucune faille exploitable
sans condition prealable n'a ete identifiee.

Les corrections prioritaires sont des **mises en coherence** plus que des correctifs
d'urgence : valider `next` dans le callback OAuth (#1), aligner la validation de mot de passe
sur `min(8)` (#2), passer l'approbation en `=== 'approved'` (#3), et durcir la derivation de
cle / la generation de secret (#4, #6). Les findings `LOW` relevent de l'hygiene (PII dans les
logs, rotation de cle, parite de format) et peuvent etre traites au fil de l'eau.

---

**Voir aussi :** [data-model.md](data-model.md) (tables, colonnes, RLS, triggers du theme).
