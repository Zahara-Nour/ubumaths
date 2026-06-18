# Unification admin/teacher — Élévation admin côté serveur (Pattern 2) — Progress

> Statut : **Phase 0 (spec) — en attente de validation PO avant de coder.**
> Date : 2026-06-18. Suite de [[project_single-teacher-refactor]] / audit mono-prof.
> Dépend de : PR #26 (Option B) — implémenter **après** son merge (branches indépendantes mais on évite 2 gros chantiers en vol).

## Décisions PO

- **Pattern 2** (élévation serveur), pas Pattern 1. Deux comptes séparés (prof + admin).
- On **garde** le rôle `admin` + les ~100 policies RLS **inchangées** (séparation de privilège, RGPD-safe). **Quasi zéro changement DB.**

## Principe

Le prof reste connecté (session `sb-*`, `profile.role === 'teacher'`). Pour agir en admin, il fournit les identifiants du **compte admin** → le serveur les vérifie → pose une **élévation éphémère** (cookie httpOnly, hors `sb-*`) → un **client Supabase en contexte admin** (`locals.adminSupabase`, RLS admin, `auth.uid() = admin`) sert les routes `/api/admin/*` et pages `/dashboard/admin/*`. **Le token prof n'acquiert jamais les pouvoirs admin.**

Point clé (vérifié) : le `role` vient de la **DB** (`getUserProfile`, `src/lib/server/auth.ts:70`), pas du JWT → l'élévation est un **état parallèle** (`locals.adminElevation` + `locals.adminSupabase`), consulté par un nouveau helper `requireAdmin(locals)`. On ne mute jamais `profile.role`.

## Architecture (points d'intégration vérifiés)

1. **`src/app.d.ts`** : étendre `Locals` → `adminSupabase?`, `adminElevation?: { active; adminUserId; expiresAt } | null`.
2. **`src/lib/server/adminElevation.ts`** (nouveau) : factory de handle (modèle `src/lib/server/maintenance.ts:142`), mint/verify du cookie, construction du client admin.
3. **`src/hooks.server.ts`** (`sequence` ligne ~518) : insérer `adminElevationHandle` **après `userProfileHandle`**, **avant `csrfHandle`**. Lit le cookie, valide (expiration + `getUser()` sur le token admin), pose `locals.adminSupabase` + `locals.adminElevation`.
4. **Cookie** `ubu-admin-elevation` (nom hors `sb-*` → transparent pour `@supabase/ssr` ; déjà filtré du payload client par `+layout.server.ts:30`). httpOnly, `secure:!dev`, `sameSite:'lax'`, `maxAge` court. Modèles : `maintenance.ts:170`, `api/google/auth/connect/+server.ts:53`.
5. **`POST /api/admin/elevate`** (nouveau) : reçoit `{email,password}` admin, vérifie via un client `@supabase/ssr` **éphémère** (`signInWithPassword`, store cookies jetable, ne touche pas la session prof), confirme `role==='admin'`, pose le cookie. **`POST /api/admin/elevate/revoke`** : efface le cookie. Rate-limit comme le login (`auth/login/+page.server.ts:134`).
6. **`requireAdmin(locals)`** dans `src/lib/server/middleware/auth.ts` : OK si `locals.adminElevation?.active` **OU** `profile.role==='admin'` (un vrai login admin marche toujours).
7. **Guard de groupe manquant** : créer `src/routes/(protected)/dashboard/admin/+layout.server.ts` (aucun n'existe → ~20 pages re-checkent `role!=='admin'` à la main) → centraliser sur `requireAdmin`, rediriger vers l'écran d'élévation si non élevé.
8. **Migrer** les ~20 gardes de pages + les `/api/admin/*` (inline + middleware) vers `requireAdmin(locals)` et **utiliser `locals.adminSupabase`** pour les écritures privilégiées.

## Contraintes (NE PAS casser)

- **Safari/WebKit TDZ** : tout le code d'élévation vit dans `$lib/server/*` ; **aucun** import statique de lib lourde dans `src/routes/+layout.ts`/`+layout.server.ts` (`@supabase/ssr` y est en `await import()` exprès). Voir [[safari-webkit-tdz]].
- Ne pas toucher `getAll/setAll` du hook Supabase (`src/lib/server/supabase.ts:40`) ni `filterSerializedResponseHeaders`.
- `locals.session` n'existe pas ici ; seul `safeGetSession()`/`getUser()` fait foi.
- CSP `form-action 'self'` + CSRF handle : un POST interne vers `/api/admin/elevate` passe.

## Comportements (TDD — à valider)

### Élévation

- **Nominal** : prof connecté + creds admin valides → cookie posé, `locals.adminSupabase` actif, accès `/dashboard/admin/*` + `/api/admin/*` (RLS admin).
- **Limite** : creds d'un compte **non-admin** → refusé (role check), pas d'élévation.
- **Limite** : élévation **expirée** (TTL) → traité comme non élevé → re-demande.
- **Erreur** : cookie falsifié / token admin invalide → non élevé.
- **Sécurité** : prof **non élevé** → `/dashboard/admin/*` redirige vers l'écran d'élévation ; `/api/admin/*` → 403 « admin elevation required ». Le seul token prof ne donne **aucun** accès admin.
- **Compat** : un vrai login `admin` (`profile.role==='admin'`) garde l'accès sans élévation.
- **Révocation** : logout prof **ou** « quitter le mode admin » **ou** TTL → cookie effacé, accès admin coupé immédiatement.

### Actions destructives (cron destructif, anti-fraude, delete school, user status, purge logs…)

- **Nominal** : action destructive avec **confirmation tapée correcte** (nom exact de la ressource, ou mot-clé d'action) → exécutée.
- **Sécurité** : `confirm` absent ou incorrect → 400 (validé **serveur** ; non contournable par appel API direct).
- **Pas de re-saisie de mot de passe** : l'élévation seule prouve l'identité ; la confirmation tapée ne prouve que l'**intention** (anti-accident).
- **Liste « destructive »** (à valider en Phase 1, brouillon) : `DELETE /api/admin/schools/[id]`, changement de statut compte (`users/[id]/status` → rejected/banned), `cron/trigger`, `anti-fraud/run`, purge `error_logs`/`bug_reports`, suppression `vip_card_config`/`templates`, `remove-from-class`. (Backup = création, **non** destructif.)

## Décisions actées (PO, 2026-06-18)

- **Contenu du cookie d'élévation** : **Opt 1** — access token admin court (~1 h, **sans** refresh token), chiffré (secret serveur) → client RLS admin (`auth.uid()=admin`, audit préservé) ; re-élévation à l'expiration. Exposition minimale si le cookie fuit.
- **TTL élévation** : ≈ durée de vie de l'access token (~1 h, absolu) ; au-delà → re-élévation (re-saisie du mot de passe admin). Pas de refresh silencieux.
- **Confirmation destructive** : **PAS de 2ᵉ saisie de mot de passe** une fois élevé. À la place, **confirmation tapée** (server-enforced) sur les opérations destructives.
  - **Forme** : ops **ciblées** (supprimer une école/un compte/un enregistrement précis) → taper le **nom exact** de la ressource ; ops **globales** (cron destructif, anti-fraude, purge) → taper un **mot-clé fixe** (nom de l'action, ex. `LANCER-CRON`).
  - **Application** : l'endpoint exige un champ `confirm` === valeur attendue (validé **serveur**, pas seulement UI → non contournable par appel API direct).

## Phasing

1. **Phase 1 — tests d'abord** : intégration (handle d'élévation + `requireAdmin` + RLS admin via `adminSupabase` sur une table admin) + unit (endpoints elevate/revoke, garde de layout). Fixtures : prof, admin.
2. **Phase 2 — infra élévation** : `app.d.ts`, `adminElevation.ts` (handle + cookie + client admin), insertion dans `sequence`, endpoints elevate/revoke, `requireAdmin`.
3. **Phase 3 — migration des gardes** : `dashboard/admin/+layout.server.ts` + bascule des ~20 pages + `/api/admin/*` vers `requireAdmin` + `locals.adminSupabase`.
4. **Phase 4 — UI** : entrée « Administration » dans le dashboard prof, modale d'élévation, bandeau « mode admin (expire dans mm:ss) / quitter », re-confirm destructif. `svelte-autofixer` sur les `.svelte`.
5. **Phase 5 — revues** : **`security-auditor` (OBLIGATOIRE** : auth/cookie/élévation/CSRF/exposition token) + `code-reviewer`.

Mostly app code, **quasi zéro RLS**.

## Agents / modèles

- `backend-developer` (Opus) — `adminElevation.ts`, hooks, endpoints, `requireAdmin`, migration des gardes.
- `frontend-developer` — modale d'élévation, bandeau, nav, re-confirm.
- `security-auditor` (Opus) — **obligatoire**.
- `test-automator` — couverture.

## Definition of Done

- [ ] Tests d'intégration verts (élévation pose/retire l'accès admin ; prof non élevé bloqué ; RLS admin via `adminSupabase`).
- [ ] `requireAdmin` sur 100 % des `/api/admin/*` + pages `dashboard/admin/*` ; aucun `role!=='admin'` inline résiduel.
- [ ] `security-auditor` OK (cookie httpOnly/secure/TTL, pas de fuite de token, révocation, CSRF).
- [ ] `pnpm check:incremental` = 0 ; `svelte-autofixer` sur `.svelte`.
- [ ] Safari TDZ respecté (aucun import statique lourd dans le root layout).
