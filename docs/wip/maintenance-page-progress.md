# Page de maintenance — progression

> Date : 2026-06-13 · Statut : **✅ Implémentée + testée (17 tests verts).** Non activée
> (OFF par défaut). Préparée pour le cutover de la migration Supabase EU.

## Objectif

Servir une page de maintenance **503** pendant la bascule de la migration, **sans
dépendre de la DB ni de l'auth** (qui seront gelées). Cf. `supabase-eu-migration-plan.md`
Phase 8.

## Décisions (validées avec David)

- **Toggle** : variable d'env `MAINTENANCE_MODE=true` (Vercel) + redeploy. Pas de DB.
- **Bypass opérateur** : `/?bypass=<MAINTENANCE_BYPASS_SECRET>` → cookie signé-par-secret
  → accès au site (migré) pour test, sans DB.
- **Exceptions** : assets statiques uniquement (`/_app/`, favicon, robots, fonts).
  Pas de `/api/health` ni de callback OAuth (volontaire — indépendance DB).

## Implémentation

- `src/lib/server/maintenance.ts` :
  - `createMaintenanceHandle(readEnv, { isDev })` — factory (env injecté → testable
    sans mocker `$env`). Export `maintenanceHandle` câblé sur `$env/dynamic/private`.
  - Logique : OFF → passe ; asset statique → passe ; `?bypass` valide → cookie + 303
    vers URL propre ; cookie valide → passe ; sinon **503 + Retry-After + no-store**.
  - `secretsMatch` : comparaison constante (sha256 + `timingSafeEqual`).
  - `renderMaintenancePage` : HTML autonome FR (inline CSS, `noindex`, ETA optionnelle).
  - `computeRetryAfter` : secondes jusqu'à `MAINTENANCE_UNTIL`, défaut 3600.
- `src/hooks.server.ts` : `maintenanceHandle` inséré **après `requestIdHandle`, avant
  `supabaseHandle`** (= avant tout accès DB).
- `.env.example` : `MAINTENANCE_MODE` / `MAINTENANCE_BYPASS_SECRET` / `MAINTENANCE_UNTIL`.

## Tests — `src/lib/server/maintenance.test.ts` (17, verts)

Helpers/pures (`isAllowedDuringMaintenance`, `secretsMatch`, `computeRetryAfter`,
`renderMaintenancePage`) + handle (OFF passe, 503+Retry-After sans resolve, asset passe,
`?bypass` valide → cookie+303, cookie valide passe, mauvais secret → 503).

## Activation le jour J (runbook)

1. Sur Vercel : `MAINTENANCE_MODE=true`, `MAINTENANCE_BYPASS_SECRET=<secret fort>`,
   (optionnel) `MAINTENANCE_UNTIL=<ISO>`. Redeploy.
2. Vérifier : visiteur lambda → 503 ; toi via `/?bypass=<secret>` → accès.
3. Faire la migration / tests.
4. Remettre `MAINTENANCE_MODE=false` + redeploy ; supprimer le secret.

## Qualité

- ESLint : 0 erreur (3 fichiers). Tests : 17/17. `check:incremental` : 0 erreur dans
  les fichiers modifiés (l'unique erreur résiduelle est en `slides/demo`/`extern`, filtrée).
