---
title: authentication — Audit qualité & dette technique
date: 2026-06-12
version: 1.0
status: vivant
audience: maintainers
scope: src/hooks.server.ts, src/lib/server/auth.ts, src/lib/server/middleware/auth.ts, src/lib/server/validation/auth.ts, src/routes/(public)/auth/*, src/routes/api/google/auth/*, src/lib/server/google/*, src/lib/server/auth/cron.ts
---

# authentication — Audit qualité & dette technique

> **Périmètre** : deux processus distincts cohabitent.
>
> 1. **Supabase auth** (process 1) : login / session / hooks / RBAC. Le pipeline
>    `hooks.server.ts` tourne sur **chaque requête** (hot path) — toute incohérence
>    y est amplifiée par le volume.
> 2. **Google auth** (process 2) : OAuth Classroom, couche d'**autorisation**
>    par-dessus le compte Supabase (tokens chiffrés, scopes, refresh).
>
> Le périmètre couvre uniquement l'authentification / autorisation, pas la logique
> métier des endpoints protégés.

---

## 1. Synthèse de la dette

La couche d'authentification est **fonctionnellement solide sur la sécurité**
(getUser server-side, PKCE S256, AES-256-GCM, timingSafeEqual, anti-open-redirect,
anti-énumération — cf. §8) mais porte une **dette de cohérence** accumulée par
strates : deux modules `auth` homonymes, deux conventions de validation, des
redirections cassées vers une route inexistante, et un logging brut non structuré
en plein hot path.

| Catégorie                        | Sévérité max | Items | Impact dominant                                |
| -------------------------------- | ------------ | ----- | ---------------------------------------------- |
| A. Bugs / incohérences           | **High**     | 3     | UX cassée (404 invisible), règle de validation |
| B. Zod défini mais non réutilisé | Medium       | 2     | Drift entre tests et prod, validation manuelle |
| C. Duplication                   | Medium       | 6     | God-module, maintenance ×3, viole CLAUDE.md    |
| D. Patterns à risque             | Medium       | 5     | Duck-typing fragile, CSPRNG, logs non gardés   |
| E. Typage                        | Minor        | 1     | Cast superflu (Process 2 OAuth propre)         |
| G. Fonctions longues             | Medium       | 4     | hooks 2 × ~100 lignes en hot path              |

**Le seul bloc critique pour l'utilisateur final** est la catégorie A.1
(redirections `/login` vers une route inexistante) : l'erreur n'est jamais affichée.

---

## 2. A — Bugs et incohérences

### A.1 Redirections vers `/login` inexistant

**Severity: High**

La seule route de login déclarée est `/auth/login`
(`src/routes/(public)/auth/login/`). Aucune route `/login` n'existe à la racine ni
ailleurs. Or **8 redirections** ciblent `/login?error=...` : le navigateur reçoit
un 303 vers une URL non routée → **404**. L'utilisateur ne voit donc **jamais** le
message d'erreur encodé dans le query param (échec d'auth, domaine refusé, compte
rejeté…). Le bug est silencieux car le flux « heureux » ne passe jamais par ces
branches.

| Fichier                                                 | Lignes               |
| ------------------------------------------------------- | -------------------- |
| `../../../src/routes/(public)/auth/callback/+server.ts` | 64, 74, 89, 156, 188 |
| `../../../src/routes/(public)/auth/confirm/+server.ts`  | 106, 119             |
| `../../../src/routes/(protected)/+layout.server.ts`     | 114                  |

> **Indice révélateur** : dans `callback/+server.ts`, la ligne 129 utilise
> correctement `/auth/login` (profile creation failure), alors que 5 autres
> redirections du même fichier utilisent `/login`. La coexistence des deux formes
> dans un seul fichier confirme qu'il s'agit d'un oubli, pas d'un choix.

**Reco** : introduire une constante unique et la réutiliser partout.

```typescript
// src/lib/server/auth-constants.ts
export const LOGIN_PATH = '/auth/login';
```

### A.2 Validation du mot de passe incohérente : 6 vs 8 caractères

**Severity: High**

Deux seuils de longueur minimale coexistent pour le **même** mot de passe :

- `../../../src/routes/(public)/auth/update-password/+page.server.ts:75` —
  `password.length < 6` (rejet sous **6** caractères, validation manuelle inline).
- `../../../src/lib/server/validation/auth.ts:48` — `updatePasswordSchema` impose
  `z.string().min(8, …)` (**8** caractères).

Un mot de passe de 6–7 caractères est **accepté** par l'action serveur mais aurait
été **refusé** par le schéma Zod censé être la source de vérité. Le schéma n'étant
pas branché (cf. B.1), c'est le seuil le plus faible qui gagne en production.

**Reco** : brancher `updatePasswordSchema` dans l'action et supprimer la validation
inline. Aligne le seuil sur 8 et résout A.2 + B.1 d'un coup.

### A.3 `type` OTP non validé dans `confirm`

**Severity: Medium**

`../../../src/routes/(public)/auth/confirm/+server.ts:112` passe le paramètre
d'URL `type` à `verifyOtp` via un **cast** brut, sans validation d'énumération :

```typescript
const type = url.searchParams.get('type'); // string | null
// …
await supabase.auth.verifyOtp({
	type: type as 'signup' | 'email' | 'recovery' | 'invite' | 'magiclink' | 'email_change',
	token_hash
});
```

Le cast `as` assume une valeur valide alors que `type` vient d'une URL contrôlable
par l'appelant. Une valeur inattendue est transmise telle quelle à Supabase.

**Reco** : valider avec un `z.enum([...])` (ou un `switch` exhaustif) avant l'appel,
et rediriger vers `LOGIN_PATH` sur valeur inconnue.

---

## 3. B — Zod défini mais non réutilisé

**Severity: Medium**

`../../../src/lib/server/validation/auth.ts` définit cinq schémas. Un seul,
`loginFormSchema`, est effectivement utilisé en production
(`auth/login/+page.server.ts`). Les autres ne sont importés **que par les tests**,
ce qui crée un drift dangereux : les tests valident un contrat que le code de prod
n'applique pas.

| Schéma                       | Ligne | Statut prod                                                                  |
| ---------------------------- | ----- | ---------------------------------------------------------------------------- |
| `loginFormSchema`            | 15    | ✅ utilisé (`auth/login/+page.server.ts`)                                    |
| `requestPasswordResetSchema` | 40    | ❌ défini, **jamais branché** — `reset-password` valide à la main (`!email`) |
| `updatePasswordSchema`       | 47    | ❌ défini, **jamais branché** — `update-password` valide à la main (cf. A.2) |
| `signupFormSchema`           | 27    | ❌ jamais utilisé — **aucun flux signup** (seul l'OAuth crée des comptes)    |
| `updateProfileSchema`        | 59    | ❌ jamais utilisé en prod                                                    |

Deux sous-problèmes distincts :

- **B.1 — Schémas existants non branchés** : `reset-password` et `update-password`
  réimplémentent une validation manuelle au lieu d'appeler
  `requestPasswordResetSchema` / `updatePasswordSchema`. C'est la cause racine de
  A.2.
- **B.2 — Schémas morts** : `signupFormSchema` et `updateProfileSchema` décrivent
  un flux d'inscription par email/mot de passe qui **n'existe pas** — la création de
  compte passe exclusivement par l'OAuth Google (`callback/+server.ts`). Ce sont des
  reliquats.

**Reco** : (B.1) brancher les deux schémas dans leurs actions respectives ;
(B.2) supprimer les deux schémas morts ou documenter explicitement le flux futur
qu'ils anticipent.

---

## 4. C — Duplication

**Severity: Medium**

### C.1 Deux modules `auth` homonymes

Il existe **deux modules d'authentification** au nom identique mais aux contrats
divergents :

| Aspect           | `../../../src/lib/server/auth.ts`            | `../../../src/lib/server/middleware/auth.ts`      |
| ---------------- | -------------------------------------------- | ------------------------------------------------- |
| `requireAuth`    | prend `user` déjà résolu, **synchrone**      | prend `locals`, **async**, **re-fetch** le profil |
| `requireRole`    | `(profile, roles)` synchrone                 | `(locals, role)` async, re-fetch                  |
| Source du profil | `locals.profile` (pré-chargé dans les hooks) | nouveau `SELECT *` à chaque appel                 |
| Cible d'usage    | `+layout.server.ts` / `+page.server.ts`      | endpoints API (`+server.ts`)                      |

Deux fonctions `requireAuth` / `requireRole` aux **signatures incompatibles**
portent le même nom. Un développeur qui importe « le mauvais `auth` » obtient un
comportement (et un coût réseau) différent sans warning.

### C.2 Types `UserRole` / `Profile` redéfinis localement

`../../../src/lib/server/middleware/auth.ts:40` et `:45` redéfinissent localement
`UserRole` (`'student' | 'teacher' | 'admin'`) et `Profile`
(`Database['public']['Tables']['profiles']['Row']`).

Cela **viole la règle 6 de CLAUDE.md** : `UserRole` et `Profile` doivent vivre dans
`$lib/types/database-helpers`. `server/auth.ts` les ré-importe d'ailleurs **depuis**
ce middleware (`import type { Profile, UserRole } from '$lib/server/middleware/auth'`)
au lieu de la source canonique, propageant la duplication.

**Reco** : déplacer `UserRole`/`Profile` dans `database-helpers.ts`, faire pointer
les deux modules vers cette source unique.

### C.3 Re-fetch du profil alors qu'il est déjà chargé

`../../../src/lib/server/middleware/auth.ts:137-141` exécute un
`SELECT * FROM profiles` à chaque `requireAuth(locals)`, **alors que**
`userProfileHandle` a déjà chargé `locals.profile` dans les hooks
(`hooks.server.ts:155`). Le profil est donc lu deux fois par requête API
authentifiée. Voir l'impact détaillé dans
[performance.md (F2)](./performance.md#f2--select--sur-profiles-à-chaque-requête-authentifiée-sans-cache).

**Reco** : faire lire `locals.profile` au middleware (fallback fetch seulement s'il
est `null`).

### C.4 Map `roleNames` dupliquée

Le dictionnaire `Record<UserRole, string>` de libellés FR des rôles
(`{ student: 'Élèves', teacher: 'Enseignants', admin: 'Administrateurs' }`) est
copié-collé à l'identique dans `../../../src/lib/server/middleware/auth.ts:233-237`
(`requireRole`) **et** `:313-317` (`requireRoles`). **Reco** : constante module-level
partagée.

### C.5 Bloc `logError` dupliqué dans `userProfileHandle`

`../../../src/hooks.server.ts:168-188` (cas « profil null ») et `:200-216`
(cas « fetch error ») répètent quasi mot pour mot le même appel `logError` enveloppé
d'un `try/catch` anti-cascade. **Reco** : extraire un helper local
`logProfileFailure(supabase, event, user, kind, err?)`.

### C.6 Logique de statut `pending` / `rejected` dupliquée 3×

La même cascade `if (status === 'pending') redirect ; if (status === 'rejected')
signOut + redirect` est réécrite à trois endroits :

| Fichier                                                              | Lignes  |
| -------------------------------------------------------------------- | ------- |
| `../../../src/routes/(public)/auth/callback/+server.ts`              | 143-157 |
| `../../../src/routes/(protected)/+layout.server.ts`                  | 105-115 |
| `../../../src/routes/(public)/auth/pending-approval/+page.server.ts` | 33-46   |

Trois copies divergent déjà (messages, gestion de `rejection_reason`, cible de
redirection — dont certaines pointent sur `/login` cassé, cf. A.1).

**Reco** : un helper `enforceProfileStatus(profile, supabase): void` qui throw les
redirections appropriées, appelé partout.

---

## 5. D — Patterns à risque

**Severity: Medium**

### D.1 Détection des redirects par duck-typing

Trois sites distinguent « redirect » de « vraie erreur » en inspectant la forme de
l'objet capturé, au lieu des helpers officiels de SvelteKit :

| Fichier                                                   | Ligne | Test fragile                            |
| --------------------------------------------------------- | ----- | --------------------------------------- |
| `../../../src/hooks.server.ts`                            | 191   | `'status' in err && 'location' in err`  |
| `../../../src/routes/(public)/auth/callback/+server.ts`   | 180   | `'status' in err && err.status === 303` |
| `../../../src/routes/api/google/auth/callback/+server.ts` | 137   | `'status' in err` (catch-all)           |

Le pattern `err.status === 303` (callback ligne 180) **ne re-throw pas** une vraie
`error(400)` / `error(500)` : un `throw error(500, …)` levé dans le `try` est
silencieusement **avalé** puis remplacé par une redirect générique vers `/login`
(elle-même cassée — A.1). À l'inverse, `'status' in err` (google callback ligne 137)
re-throw **toutes** les erreurs HTTP, ce qui est ici correct mais reste un heuristique
non typé.

**Reco** : utiliser `isRedirect(err)` et `isHttpError(err)` de `@sveltejs/kit` :

```typescript
import { isRedirect, isHttpError } from '@sveltejs/kit';
// …
} catch (err) {
  if (isRedirect(err) || isHttpError(err)) throw err; // laisse passer redirects + erreurs HTTP
  // … log + fallback
}
```

### D.2 `generateCronSecret` via `Math.random()`

**Severity: Medium**

`../../../src/lib/server/auth/cron.ts:156-166` génère un secret CRON en mélangeant
`Math.random()`, `Date.now()` et `process.hrtime` dans un SHA-256.
`Math.random()` n'est **pas** un CSPRNG : la prédictibilité du PRNG entame l'entropie
réelle malgré l'apparence des 128 bits annoncés. La doc de la fonction prétend même
utiliser `crypto.randomBytes()`, ce qui est faux.

> À relativiser : la fonction n'est qu'un **utilitaire d'aide** à la génération du
> secret (one-shot, hors hot path). Le secret est ensuite stocké en variable
> d'environnement. La vérification, elle, est saine (`timingSafeEqual`, cf. section 7).

**Reco** : `randomBytes(16).toString('hex')` directement. Corriger aussi la JSDoc
mensongère.

### D.3 `console.*` brut au lieu de `createLogger`

Le logging est incohérent : `createLogger` (logger structuré du projet) existe et
est utilisé dans `server/auth.ts`, `callback`, `confirm`, etc., mais le **hot path**
et plusieurs modules sensibles utilisent encore `console.*` brut :

- `../../../src/hooks.server.ts` — **7** appels `console.error` (dont en plein
  `userProfileHandle`, hot path).
- `../../../src/lib/server/middleware/auth.ts:144` — `console.error('Profile fetch
error:', …)`.
- `../../../src/lib/server/auth/cron.ts` — `console.log`/`console.warn`/`console.error`
  systématiques.
- `../../../src/routes/api/google/auth/*` — `console.*` partout.

Conséquence : pas de niveau de log filtrable, pas de préfixe module, bruit en
production.

**Reco** : migrer vers `createLogger('module')`. Voir aussi D.4 pour le coût.

### D.4 Logs verbeux non gardés par `dev`

**Severity: Minor**

Des `console.log` décoratifs (avec emojis) s'exécutent à **chaque navigation** sans
garde `if (dev)` :

| Fichier                                             | Ligne(s) | Log                                   |
| --------------------------------------------------- | -------- | ------------------------------------- |
| `../../../src/routes/+layout.server.ts`             | 27, 46   | `🎨 [ROOT LAYOUT SERVER]` + count VIP |
| `../../../src/routes/+layout.ts`                    | 117      | `🎨 [ROOT LAYOUT]`                    |
| `../../../src/routes/(protected)/+layout.server.ts` | 62       | `🎨 [PROTECTED LAYOUT SERVER]`        |

**Reco** : garder par `if (dev)` ou supprimer. Détail perf :
[performance.md (F10)](./performance.md#f10--consolelog-en-hot-path-non-gardés-par-dev).

### D.5 Avatar Google écrasé inconditionnellement à chaque login

`../../../src/routes/(public)/auth/callback/+server.ts:162-171` : à **chaque** login
d'un utilisateur approuvé, un `UPDATE profiles SET avatar_url = <google picture>` est
émis, même si l'avatar n'a pas changé. C'est à la fois une écriture DB inutile
(détail perf [performance.md (F6)](./performance.md#f6--update-avatar-inconditionnel-à-chaque-login))
et un pattern surprenant : si l'utilisateur a personnalisé son avatar côté app, il
est silencieusement écrasé par celui de Google.

**Reco** : ne mettre à jour que si `googleAvatar !== existingProfile.avatar_url`.

---

## 6. E — Typage

**Severity: Minor**

### E.1 Cast `as UserRole` superflu

`../../../src/lib/server/middleware/auth.ts:312` :

```typescript
if (!roles.includes(profile.role as UserRole)) { … }
```

`profile.role` est **déjà** typé `UserRole` (issu du type `Profile` /
`Database[...]['Row']`). Le cast `as UserRole` est redondant et masque une éventuelle
régression de type si la colonne `role` changeait.

**Reco** : supprimer le cast.

### E.2 Process 2 OAuth — typage exemplaire (positif)

À l'inverse, la couche Google OAuth (`server/google/oauth.ts`) est **bien typée** :
les réponses de Google sont validées par des schémas Zod
(`googleOAuthTokenResponseSchema`, `googleTokenInfoSchema`, `googleAPIErrorSchema`,
lignes 55-91) puis `safeParse`. **Aucun `any`** dans le périmètre.

---

## 7. G — Fonctions longues

**Severity: Medium**

Concentré dans `hooks.server.ts`, en plein hot path :

| Fonction                | Fichier:lignes                  | Taille      | Problème                                                       |
| ----------------------- | ------------------------------- | ----------- | -------------------------------------------------------------- |
| `userProfileHandle`     | `hooks.server.ts:147-231`       | ~85 lignes  | 2 branches d'erreur quasi identiques (C.5), nesting `try/try`  |
| `errorMonitoringHandle` | `hooks.server.ts:294-403`       | ~110 lignes | jusqu'à **3** `getUser()` réseau (cf. perf F1), 2 chemins log  |
| `redirectHandle`        | `hooks.server.ts:53-133`        | ~80 lignes  | ~10 `if` répétitifs (table de redirections inlinée)            |
| `callback` GET          | `(public)/auth/callback:45-191` | ~145 lignes | exchange + domaine + create + status + avatar dans un seul try |

**Reco** :

- `redirectHandle` : extraire la table en `const ROUTE_REDIRECTS: Array<[prefix,
replacement]>` + boucle (supprime ~60 lignes de `if`).
- `errorMonitoringHandle` : réutiliser `locals.user` au lieu de rappeler
  `safeGetSession()` (résout aussi perf F1).
- `callback` GET : extraire `ensureProfile(supabase, user)` et
  `enforceProfileStatus` (C.6).

---

## 8. Points positifs (sécurité)

L'audit confirme une base **sécuritairement saine** ; ces acquis ne doivent pas
régresser lors des refactors ci-dessus.

| ✅ Acquis                           | Où                                                                       | Détail                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `safeGetSession` via `getUser()`    | `../../../src/lib/server/supabase.ts:71-105`                             | vérifie le user côté serveur Supabase, ne fait jamais confiance aux cookies |
| CRON `timingSafeEqual`              | `../../../src/lib/server/auth/cron.ts:96-124`                            | comparaison à temps constant + fail-secure si `CRON_SECRET` absent          |
| OAuth PKCE **S256**                 | `../../../src/lib/server/google/oauth.ts:190-191`                        | `code_challenge_method: 'S256'`                                             |
| OAuth Zod systématique              | `../../../src/lib/server/google/oauth.ts:55-91, 253-263`                 | toutes les réponses Google validées avant usage                             |
| Chiffrement **AES-256-GCM**         | `../../../src/lib/server/google/encryption.ts:76-156`                    | tokens chiffrés (IV + authTag), pas de fuite de token dans les erreurs      |
| Anti-open-redirect                  | `../../../src/routes/(public)/auth/confirm/+server.ts:71-90`             | `validateRedirectUrl` refuse `//` et le cross-origin                        |
| Anti-énumération (reset password)   | `../../../src/routes/(public)/auth/reset-password/+page.server.ts:52-63` | message générique quel que soit l'existence de l'email                      |
| CSRF state + PKCE verifier (Google) | `../../../src/routes/api/google/auth/callback/+server.ts:66-77`          | state comparé au cookie, verifier requis                                    |

---

## 9. Priorisation

| Priorité | Item                                                          | Effort | Justification                                               |
| -------- | ------------------------------------------------------------- | ------ | ----------------------------------------------------------- |
| 🔴 1     | A.1 — constante `LOGIN_PATH` + sweep des 8 redirections       | Faible | Bug user-facing, 404 silencieux, message d'erreur jamais vu |
| 🔴 2     | A.2 + B.1 — brancher `updatePasswordSchema` (résout les deux) | Faible | Règle de sécurité (longueur mdp) actuellement contournable  |
| 🟠 3     | C.6 — helper `enforceProfileStatus` (3 copies → 1)            | Moyen  | Source des divergences de redirection (dont A.1)            |
| 🟠 4     | C.3 — middleware lit `locals.profile`                         | Faible | Supprime un SELECT par requête API (perf F2)                |
| 🟠 5     | D.1 — `isRedirect` / `isHttpError`                            | Faible | Évite d'avaler des `error(500)` réels                       |
| 🟡 6     | C.2 + E.1 — types canoniques dans `database-helpers`          | Faible | Conformité CLAUDE.md règle 6                                |
| 🟡 7     | C.1 / C.4 / C.5 / G — extractions de helpers                  | Moyen  | Maintenabilité du hot path                                  |
| 🟡 8     | A.3 — `z.enum` sur le `type` OTP                              | Faible | Durcissement entrée contrôlable                             |
| 🟢 9     | D.2 — CSPRNG pour le secret CRON + JSDoc                      | Faible | Hors hot path, faible exploitabilité                        |
| 🟢 10    | D.3 / D.4 — migration `createLogger` + gardes `dev`           | Moyen  | Hygiène logs, bruit prod                                    |
| 🟢 11    | B.2 — supprimer les schémas morts (signup/profile)            | Faible | Nettoyage, lever l'ambiguïté « flux signup »                |
| 🟢 12    | D.5 — avatar conditionnel                                     | Faible | UX + écriture DB inutile (perf F6)                          |

---

## Synthèse

La couche d'authentification d'UbuMaths est **sûre** (les 8 acquis de §8 sont
solides) mais souffre d'une **dette de cohérence** typique d'un système construit par
strates :

1. **Un bug user-facing prioritaire** (A.1) : les redirections `/login` cassées
   masquent tous les messages d'erreur d'auth — à corriger en premier.
2. **Une incohérence de validation** (A.2) : 6 vs 8 caractères pour le mot de passe,
   conséquence directe de schémas Zod définis mais non branchés (B.1).
3. **Une duplication structurelle** (C) : deux modules `auth` homonymes, des types
   redéfinis hors `database-helpers`, une logique de statut copiée 3×.

Aucun de ces points n'est une faille de sécurité, mais A.1 et A.2 ont un **impact
fonctionnel immédiat**. Le reste est de la dette de maintenabilité qui ralentira
toute évolution du flux d'auth.
