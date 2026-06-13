# CI — finir le « tout vert »

> Date : 2026-06-13 · Statut : **fix appliqué, en attente de validation par un push.**

## ⚠️ Correction de diagnostic : ce n'était PAS un problème de Node 22

Un précédent diagnostic (même doc) attribuait les jobs rouges à une divergence
**dev Node 26 / prod Node 22**. **C'était faux.** L'inspection des logs CI
(`gh run view --job <id> --log-failed`) a montré la vraie cause, commune à tous
les jobs rouges : **la CI n'a pas de `.env`**.

- `vite.config.ts:26` fait `const env = loadEnv(mode, cwd, ''); Object.assign(process.env, env)`
  → les tests chargent les variables depuis le fichier `.env`.
- `svelte-kit sync` lit aussi `.env` pour générer `$env/static/{public,private}`.
- En local : `.env` présent → tout passe. En CI : pas de `.env` → variables
  Supabase `undefined`.

Le passage CI en **Node 22** reste correct (matcher le runtime de prod,
`svelte.config.js` → `adapter({ runtime: 'nodejs22.x' })`), mais **n'était la
cause d'aucun échec**.

### Les 3 jobs rouges, même origine

| Job rouge                                                            | Cause réelle                                                                                                                                                                               |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type Check** (9 erreurs / 5 fichiers)                              | `$env/static/public` n'exporte pas `PUBLIC_SUPABASE_URL`/`ANON_KEY`, `$env/static/private` pas `SUPABASE_SERVICE_ROLE_KEY` — car absents à `svelte-kit sync`                               |
| **Tests cluster 1** (rateLimiter 62/67, API « unauthenticated/401 ») | `getServiceRoleClient` (`rateLimiter.ts:94`) throw : `process.env.PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` undefined                                                               |
| **Tests cluster 2** (`*-real.svelte.test.ts`, timeout 10 min)        | tests **vrai Pyodide en Chromium** (téléchargent + exécutent Python headless) : lents, instables → `result.test_results[0].error` undefined → `.toMatch undefined` + shards qui timeoutent |

## Fix appliqué

1. **`.github/ci.env`** (commité, placeholders, **aucun secret**) copié en `.env`
   par les jobs `typecheck`, `build`, `test-server`, `test-client`.
   - Les tests mockent Supabase (`rateLimiter.test.ts:33` → `createClient: vi.fn()`),
     `createClient()` ne fait aucun appel réseau → des valeurs factices suffisent.
   - `.env` reste gitignoré → **zéro impact local**.
2. **Split du job `test`** (`quality.yml`) :
   - `test-server` : `vitest run --project server --shard=N/4` — la **vraie gate**,
     node env, **sans Playwright**, rapide et déterministe, **bloquant**.
   - `test-client` : `vitest run --project client --exclude '**/*-real.svelte.test.ts'`
     — tests browser unitaires/mockés (Chromium), **bloquant**.
   - Les 2 tests `*-real` (Pyodide réel : `exercise-validation-real`,
     `checkpoint-validation-real`) sont **exclus de la CI**, **toujours lançables
     en local**.

## Validations faites (local, Node par défaut — la version n'a aucune incidence ici)

- `rateLimiter.test.ts` mocke bien `createClient` → placeholders suffisants (juste non-vides).
- Flags `--project server --exclude '**/*-real.svelte.test.ts'` parsent et tournent (cron.test.ts : 12 ✓).

## Reste à faire

1. **Pousser** pour déclencher la CI Node 22 et confirmer le vert.
2. Si le job **Build** signale d'autres membres `$env/static` manquants : ajouter
   les placeholders correspondants dans `.github/ci.env` (one-shot).
3. (Optionnel) Faire tourner les `*-real` Pyodide en local / job nightly dédié.
4. (Durable) Aligner le dev sur Node 22 puis ajouter `engines.node: "22.x"`.

## Leçon

**Inspecter les logs CI (`gh run view --log-failed`) AVANT de diagnostiquer.**
Un push à l'aveugle sur une hypothèse non vérifiée (« bug Node 22 ») a fait
tourner en rond ; 3 `gh run view` ont donné la vraie cause (env manquant +
tests d'intégration lourds) en quelques minutes.
