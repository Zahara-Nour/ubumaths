---
title: authentication — Analyse de performance
date: 2026-06-12
version: 1.0
status: vivant
audience: 'Développeurs UbuMaths, optimisation du hot path serveur'
scope: src/hooks.server.ts, src/lib/server/supabase.ts, src/lib/server/auth.ts, src/lib/server/middleware/auth.ts, src/routes/+layout.server.ts, src/routes/+layout.ts, src/routes/(public)/auth/*, src/lib/server/rateLimiter.ts, src/lib/server/google/*
---

# authentication — Analyse de performance (lecture statique)

> **Contexte hot path.** Le pipeline `hooks.server.ts` s'exécute sur **chaque
> requête HTTP** (pages ET API, sauf assets statiques court-circuités). Deux
> opérations coûteuses y sont sur le chemin critique :
>
> 1. `safeGetSession()` → `supabase.auth.getUser()` : un **appel réseau** au serveur
>    d'auth Supabase, par requête.
> 2. `getUserProfile()` → `SELECT * FROM profiles` : une requête DB, par requête
>    authentifiée.
>
> Tout coût ici est multiplié par le volume de requêtes. C'est le périmètre où une
> optimisation a le plus de valeur — **et** celui où une optimisation en aveugle
> (cache mal invalidé sur un statut `pending`/`rejected`) fait le plus de dégâts.

---

## 1. Profil de charge par phase

### Requête authentifiée (pages, hot path)

Chemin nominal d'une navigation authentifiée :

```
requestIdHandle
  → supabaseHandle           (crée le client + définit safeGetSession)
  → redirectHandle           (table de redirections, ~10 if)
  → userProfileHandle        ─┐ getUser() RÉSEAU  (safeGetSession)
                              └ getUserProfile()   SELECT * profiles
  → csrfHandle
  → securityHeadersHandle
  → errorMonitoringHandle     (mesure le temps ; rappelle getUser() sur erreur/slow)
```

Le profil est chargé **une fois** dans `userProfileHandle` puis posé dans
`locals.profile` (bonne pratique, cf. section 5). Les couches au-dessus (root layout,
protected layout) lisent `locals` sans re-fetch — sauf exceptions documentées plus
bas (F2-C3, F5).

### Requête API authentifiée (`+server.ts`)

Même pipeline hooks, **plus** un `requireAuth(locals)` / `requireRole(locals, …)`
dans l'endpoint qui **re-`SELECT *` le profil** (`middleware/auth.ts:137-141`) alors
que `locals.profile` est déjà disponible → **2 lectures du profil** par requête API.

### OAuth Google (process 2, hors hot path)

Le flux OAuth (`callback`, `connect`, refresh) est rare (connexion ponctuelle d'un
compte Classroom). Coût concentré : `exchangeCodeForTokens`, `validateToken`,
chiffrement AES, upsert. **Pas dans le hot path** — priorité basse.

---

## 2. Hotspots identifiés

### CRITIQUES

### F1 — `getUser()` réseau bloquant à chaque requête, jamais mémoïsé

**Severity: HIGH** · **Fichiers** : `../../../src/lib/server/supabase.ts:71-105`,
`../../../src/hooks.server.ts:330,363`

`safeGetSession()` appelle `supabase.auth.getUser()` (`supabase.ts:90`), un **aller-
retour réseau** vers le serveur d'auth Supabase, à chaque invocation. Or il est
appelé plusieurs fois sur les chemins non nominaux :

- `userProfileHandle:149` (1×, attendu).
- `errorMonitoringHandle:330` (chemin slow-request, ré-appel).
- `errorMonitoringHandle:363` (chemin erreur, ré-appel).

Sur une requête lente **ou** en erreur, on peut donc faire **jusqu'à 3 appels réseau
`getUser()`** alors que `locals.user` a déjà été résolu par `userProfileHandle`. Le
résultat n'est jamais mémoïsé : `safeGetSession` recrée la promesse à chaque appel.

**Reco** : mémoïser le résultat de `getUser()` au niveau de la requête (cache sur
`event.locals`), et dans `errorMonitoringHandle` réutiliser `event.locals.user`
plutôt que rappeler `safeGetSession()`. Gain : −1 à −2 appels réseau sur les chemins
erreur/slow, et un seul `getUser()` garanti par requête.

> ⚠️ Ne pas court-circuiter `getUser()` lui-même : c'est le **seul** contrôle de
> sécurité (cf. code-quality.md §8). On mémoïse son résultat dans la requête, on ne
> le supprime pas.

### F2 — `SELECT *` sur `profiles` à chaque requête authentifiée, sans cache

**Severity: HIGH** · **Fichiers** : `../../../src/lib/server/auth.ts:76`
(appelé depuis `../../../src/hooks.server.ts:155`)

`getUserProfile` exécute `from('profiles').select('*')` à **chaque** requête
authentifiée (hot path). Le `select('*')` ramène **toutes** les colonnes, dont
`vip_cards` (JSONB potentiellement lourd) et les champs de gamification, alors que la
plupart des requêtes n'ont besoin que de `id, role, status`.

S'ajoute le re-`SELECT *` du middleware API (`middleware/auth.ts:137-141`, cf.
code-quality.md C.3) : **2 lectures** du profil complet par requête API.

**Reco** (en deux temps) :

1. **Quick win** : `select('id, role, status, school_id, …')` ciblé pour le hot path
   (évite de transporter `vip_cards` JSONB inutilement). Les vues qui ont besoin de la
   gamification (layout élève) la chargent séparément.
2. **Plus tard, sous mesure** : cache TTL très court (quelques secondes) du profil par
   `user.id`.

> ⚠️ **Piège du cache profil** : `status` peut passer à `pending` / `rejected`
> (approbation/rejet admin). Un cache trop long laisserait un utilisateur rejeté
> accéder au site, ou un nouvel approuvé bloqué. Le TTL doit rester très court **et**
> être invalidé explicitement lors des changements de statut. **À ne pas faire sans
> mesure préalable** (cf. section 7).

---

### MODÉRÉS

### F3 — `vip_card_templates` `SELECT *` dans le root layout à chaque navigation

**Severity: MEDIUM** · **Fichier** : `../../../src/routes/+layout.server.ts:37-47`

Le root layout server recharge `from('vip_card_templates').select('*').order(...)`
à **chaque navigation** server-side. Ces templates sont **quasi statiques** (catalogue
de cartes VIP modifié rarement par un admin). C'est un round-trip DB systématique pour
des données qui changent une fois par mois.

**Reco** : cache module-level (variable de module + TTL long, ou invalidation
explicite à l'édition d'un template). Bien moindre piège que F2 puisque les templates
ne portent pas d'autorisation.

### F4 — `invalidate('supabase:auth')` recharge tout l'arbre

**Severity: MEDIUM** · **Fichier** : `../../../src/routes/+layout.ts:108-111, 194-273`

Chaque `invalidateAuth()` relance `+layout.ts` → `+layout.server.ts` → toute la
chaîne de load des enfants (profil, classes, templates…). C'est structurellement
nécessaire (re-vérification serveur après un vrai changement d'auth), mais déclenché
par des événements Supabase parfois spurieux.

**Atténuation déjà en place (à préserver)** : le throttling de `onAuthStateChange`
(section 5) skippe les faux `SIGNED_IN` (même user) et throttle `TOKEN_REFRESHED` à
30 min. Le coût résiduel est donc faible. **Pas d'action recommandée** sans preuve que
les invalidations restantes sont fréquentes.

### F5 — Re-`SELECT profiles` dans le layout élève

**Severity: MEDIUM** · **Fichier** :
`../../../src/routes/(protected)/dashboard/student/+layout.server.ts:107-111`

```typescript
const { data: rewardsData } = await supabase
	.from('profiles')
	.select('gidouilles, bonus, vip_cards')
	.eq('id', user.id)
	.single();
```

Or `locals.profile` (chargé dans les hooks) **contient déjà** `gidouilles`, `bonus`
et `vip_cards` (c'est un `select('*')`). Ce second SELECT est donc redondant avec le
hot path.

**Reco** : lire `locals.profile.gidouilles / bonus / vip_cards` au lieu de re-
sélectionner. Quick win à fort ratio (supprime 1 round-trip DB par navigation élève).

### F6 — `UPDATE` avatar inconditionnel à chaque login

**Severity: MEDIUM** · **Fichier** :
`../../../src/routes/(public)/auth/callback/+server.ts:162-171`

À chaque login OAuth d'un utilisateur approuvé, un `UPDATE profiles SET avatar_url`
est émis même si l'avatar est inchangé (cf. code-quality.md D.5). Écriture DB inutile
sur le chemin de login. **Reco** : conditionner sur `googleAvatar !==
existingProfile.avatar_url`. Faible fréquence (login uniquement) → priorité basse.

---

### MINEURS

### F7 — `deriveKey` (SHA-256) recalculée à chaque chiffrement

**Severity: MINOR / hors hot path** · **Fichier** :
`../../../src/lib/server/google/encryption.ts:29-58`

`getEncryptionKey()` rappelle `deriveKey()` (un `createHash('sha256')`) à **chaque**
`encryptToken` / `decryptToken`. Le hash d'une clé d'env constante pourrait être
calculé une seule fois. Mais : SHA-256 est trivial (~µs) **et** c'est hors hot path
(seulement lors d'opérations OAuth). **Reco** : mémoïser au niveau module si on
touche le fichier ; sinon ne rien faire.

### F8 — Refresh de token (déjà bon)

**Severity: (OK)** · **Fichier** :
`../../../src/lib/server/google/oauth.ts:468` (`shouldRefreshToken`)

Le refresh n'est pas dans le hot path et la marge de 5 minutes avant expiration
(`shouldRefreshToken`) est un bon compromis (ni trop tôt = appels inutiles, ni trop
tard = token expiré en cours d'usage). **Aucune action.**

### F9 — Import dynamique de `@supabase/ssr` (NE PAS régresser)

**Severity: (INVARIANT)** · **Fichier** : `../../../src/routes/+layout.ts:124`

`@supabase/ssr` est importé **dynamiquement** (`await import(...)`) à l'intérieur du
load, pas en static top-level. Ce n'est **pas** une optimisation perf à « corriger » :
c'est un **invariant de correction** contre le bug TDZ Safari/WebKit
([#242740](https://bugs.webkit.org/show_bug.cgi?id=242740), « Cannot access 'universal'
before initialization » sur iPad/Safari). Le static import casserait l'app sur Safari.

> ⛔ **Ne jamais convertir cet import dynamique en static import.** Voir
> `docs/ref/safari-webkit-tdz.md`.

### F10 — `console.log` en hot path non gardés par `dev`

**Severity: MINOR** · **Fichiers** : `../../../src/routes/+layout.server.ts:27,46`,
`../../../src/routes/+layout.ts:117`, `../../../src/routes/(protected)/+layout.server.ts:62`,
`../../../src/hooks.server.ts` (7 `console.*`)

Des `console.log` décoratifs (`🎨 [ROOT LAYOUT SERVER]`, etc.) s'exécutent à chaque
navigation, y compris en production. Le coût d'un `console.log` est faible mais
non nul, et le bruit pollue les logs serveur. **Reco** : garder par `if (dev)`
(résout aussi code-quality.md D.4). Quick win.

---

## 3. Déjà bien optimisé (à documenter et préserver)

Ces optimisations sont **acquises** ; tout refactor doit les conserver.

| ✅ Optimisation                       | Où                                                                            | Détail                                                                                                                                      |
| ------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Profil chargé **une fois** → `locals` | `../../../src/hooks.server.ts:155`                                            | évite le N+1 : les layouts/pages lisent `locals.profile` sans re-fetch                                                                      |
| Throttling `onAuthStateChange`        | `../../../src/routes/+layout.ts:182-273`                                      | skip `SIGNED_IN` même user, throttle `TOKEN_REFRESHED` à 30 min, état en `sessionStorage` (survit au HMR)                                   |
| Timeouts défensifs                    | `supabase.ts:90` (15s), `auth.ts:78-80` (10s), `hooks.server.ts:323-325` (2s) | `getUser` 15s, `getUserProfile` 10s, `getUserContext` 2s — évite de pendre le hot path                                                      |
| Slow-request logging fire-and-forget  | `../../../src/hooks.server.ts:313-354`                                        | le log des requêtes >3s est non bloquant (`Promise.resolve().then(...)` sans `await`)                                                       |
| Rate limiter service-role singleton   | `../../../src/lib/server/rateLimiter.ts:77-114,160-163`                       | client service-role unique via `globalThis` (persiste au HMR) + RPC atomique `check_and_increment_rate_limit` (1 round-trip), **fail-open** |
| Cookies filtrés `sb-`                 | `../../../src/routes/+layout.server.ts:30-32`                                 | seuls les cookies `sb-*` sont renvoyés au client → le load ne se ré-exécute que s'ils changent                                              |
| Import dynamique `@supabase/ssr`      | `../../../src/routes/+layout.ts:124`                                          | bundle du node de layout racine allégé (et invariant TDZ Safari, cf. F9)                                                                    |

---

## 4. Patterns d'allocation / round-trips par requête

| Coût                          | Localisation                                  | Fréquence                                  | Statut                        |
| ----------------------------- | --------------------------------------------- | ------------------------------------------ | ----------------------------- |
| `getUser()` réseau            | `supabase.ts:90`                              | 1× nominal, **jusqu'à 3×** sur erreur/slow | F1 — à mémoïser               |
| `SELECT *` profiles           | `auth.ts:76` (hooks:155)                      | 1× / requête authentifiée                  | F2 — select ciblé             |
| `SELECT *` profiles (API)     | `middleware/auth.ts:137-141`                  | +1× / requête API                          | F2/C3 — lire `locals.profile` |
| `SELECT *` vip_card_templates | `+layout.server.ts:37-47`                     | 1× / navigation                            | F3 — cache module             |
| `SELECT` rewards (élève)      | `dashboard/student/+layout.server.ts:107-111` | 1× / navigation élève                      | F5 — lire `locals.profile`    |
| `UPDATE` avatar               | `callback:164`                                | 1× / login                                 | F6 — conditionner             |
| `createHash` deriveKey        | `encryption.ts:30`                            | 1× / encrypt/decrypt (hors hot path)       | F7 — mémoïser si on y touche  |

---

## 5. Réactivité (couche client)

Le throttling de `onAuthStateChange` (`+layout.ts:182-273`) est la pièce maîtresse
côté client. Sans lui, chaque changement de fenêtre virtuelle macOS / focus d'onglet
émettrait un `SIGNED_IN` ou `TOKEN_REFRESHED` déclenchant un full reload du layout
(3-5 requêtes DB). Le mécanisme :

- **`SIGNED_IN`** : comparé à l'ID user persisté en `sessionStorage` → skip si même
  user (faux positif HMR / refocus).
- **`TOKEN_REFRESHED`** : throttlé à 30 min (`REFRESH_INTERVAL_MS`).
- **`sessionStorage`** : survit aux reloads HMR Vite (les variables de module sont
  réinitialisées, pas `sessionStorage`).

> Sécurité non impactée : RLS est vérifié sur chaque requête DB, le throttling ne
> retarde que la **re-vérification proactive** du profil, pas l'autorisation réelle.

---

## 6. Priorisation (impact / effort)

| Gain / Effort       | Items                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Fort / Faible**   | **F2** (`select` ciblé), **F1** (réutiliser `locals.user` dans errorMonitoring), **F5** (lire `locals.profile`), **F10** (garder logs par `dev`) |
| **Fort / Moyen**    | **F1** (mémoïsation `getUser` par requête), **F3** (cache templates module-level), **F2** (cache profil TTL court — _sous mesure_)               |
| **Faible / Faible** | **F6** (avatar conditionnel), **F7** (mémoïser `deriveKey`)                                                                                      |
| **Faible / Moyen**  | **F4** (déjà atténué par le throttling — à laisser)                                                                                              |
| **Ne pas toucher**  | **F8** (refresh OK), **F9** (invariant TDZ Safari)                                                                                               |

**Ordre recommandé** : commencer par les quick wins « fort/faible » (F2 select ciblé,
F1 réutilisation de `locals.user`, F5, F10) qui ne portent **aucun risque de
correction** — pas de cache, juste éviter du travail dupliqué. Les caches (F2-TTL,
F3) viennent ensuite, avec mesure.

---

## 7. Pas d'optimisation en aveugle

> **Garde-fou.** F1 (mémoïsation `getUser`) et F2 (cache profil) sont les deux plus
> gros gains **potentiels**, mais aussi les plus risqués. Avant d'introduire le
> moindre cache à TTL :
>
> 1. **Mesurer réellement** le coût du hot path. Wrapper `safeGetSession()` et
>    `getUserProfile()` avec `performance.now()` dans `userProfileHandle`, logguer la
>    répartition (réseau vs DB) sur un échantillon de requêtes représentatives.
> 2. **Distinguer ce qui est déjà gratuit** : F1 et F2 ont une **partie quick-win
>    sans cache** (réutiliser `locals.user`, `select` ciblé, lire `locals.profile`).
>    Ces parties-là ne demandent **aucune mesure** — elles suppriment du travail
>    purement redondant. Les faire **d'abord**.
> 3. **Le cache à TTL ne se justifie que si** la mesure montre que `getUser()` réseau
>    ou le `SELECT` profiles domine le temps serveur. Sur le tier gratuit Supabase, la
>    latence réseau `getUser()` est probablement le facteur dominant — mais cela doit
>    être **prouvé**, pas supposé.
> 4. **Le piège du cache profil (F2)** : `status` pending/rejected change par action
>    admin. Un cache mal invalidé = faille d'autorisation (rejeté qui accède) ou bug
>    UX (approuvé bloqué). Un cache profil **sans** invalidation explicite sur
>    changement de statut est pire que pas de cache du tout.
>
> En résumé : **les quick wins sans cache (F1-réutilisation, F2-select, F5, F10) sont
> à faire les yeux fermés ; les caches à TTL (F2, F3) ne se décident qu'après un
> profiling du hot path.**

---

## 8. Benchmarks suggérés

| Mesure                                            | Comment                                                             | Priorité |
| ------------------------------------------------- | ------------------------------------------------------------------- | -------- |
| Temps `getUser()` réseau / requête                | `performance.now()` autour de `getUser()` dans `safeGetSession`     | Haute    |
| Temps `getUserProfile` (SELECT \*) / requête      | `performance.now()` dans `getUserProfile`, logguer si > 50ms        | Haute    |
| Nombre de `getUser()` par requête erreur/slow     | compteur sur `safeGetSession`, vérifier le ×3 théorique (F1)        | Haute    |
| Poids du payload `profiles.*` (vip_cards JSONB)   | logguer `JSON.stringify(profile).length` sur un échantillon         | Moyenne  |
| Round-trips DB / navigation élève                 | compter les `from('profiles')` (hooks + student layout, F5)         | Moyenne  |
| Fréquence réelle de `invalidate('supabase:auth')` | compteur sur `invalidateAuth()`, valider l'efficacité du throttling | Faible   |

### Scénarios recommandés

1. **Hot path nominal** : 1 utilisateur authentifié, 20 navigations successives.
   Mesurer la part `getUser()` réseau vs `SELECT profiles` dans le temps total des
   hooks.
2. **API burst** : 50 appels API authentifiés. Vérifier le **double** SELECT profiles
   (hooks + middleware) et le gain de C.3 (lire `locals.profile`).
3. **Navigation élève** : tableau de bord élève. Confirmer le SELECT rewards redondant
   (F5) et mesurer le gain de sa suppression.
4. **Slow / erreur** : forcer une requête lente (>3s) et une erreur 500. Compter les
   appels `getUser()` (attendu ×2-3 avant F1, ×1 après).
