# Chantier `kit3` — passage à SvelteKit 3 (étude)

## Reprendre ici

_Mis à jour le 2026-10-28, étude seule (aucune PR)._

- **État** : étude faite (ci-dessous), aucun code touché · **Prochaine action** : David choisit l'ordre (§ 5) et la fenêtre de gel pour le gros diff `$lib` → `#lib`
- **En attente de David** : (1) ordre des lots ; (2) quand geler les worktrees ouverts ; (3) accord pour TypeScript 6.0.x
- **Pièges en cours** : Vite 8 est étudié par la session `questions-reponses-a-placer` — c'est un prérequis de Kit 3, ne pas doubler ce travail
- **Worktree / branche** : aucun (étude sur `main`, doc seule)

---

## 1. Où en est SvelteKit 3

- **3.0.0 sorti le 2026-10-01**, `latest` = **3.1.0** (vérifié `npm view` le 2026-10-28).
- Guide officiel : <https://svelte.dev/docs/kit/migrating-to-sveltekit-3> ; outil `npx sv migrate sveltekit-3` (fait « une partie » des changements, sans dire laquelle).
- Le guide conseille de passer d'abord par la **dernière 2.x** pour lire ses avertissements de dépréciation.

## 2. Prérequis (peerDependencies de `@sveltejs/kit@3.1.0`)

| Dépendance                     | Exigé          | Chez nous (`main`)                          | Écart                                                                                     |
| ------------------------------ | -------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Node                           | ≥ 22.17        | 22.23.3 local, `22.x` (Vercel `nodejs22.x`) | ✅                                                                                        |
| Svelte                         | ^5.57.1        | ^5.57.2                                     | ✅                                                                                        |
| Vite                           | ^8.0.12        | ^7.3.7                                      | ⛔ — l'autre session                                                                      |
| `@sveltejs/vite-plugin-svelte` | ^7             | ^6.2.4                                      | ⛔ (7.3.1 exige Vite 8)                                                                   |
| TypeScript                     | **^6.0.0**     | ^5.9.3                                      | ⛔ — et **`typescript-eslint` 8.71/8.72 plafonne à `<6.1.0`** : viser TS **6.0.x**, pas 7 |
| `@sveltejs/adapter-vercel`     | 7 (peer Kit 3) | ^6.3.3                                      | ⛔ ; on n'utilise pas `edge` (retiré) → sans effet                                        |
| `@tailwindcss/vite`            | —              | 4.3.3 accepte Vite 8                        | ✅                                                                                        |
| vitest / browser-playwright    | —              | 4.1.11, accepte Vite 8                      | ✅ (vitest 5 = autre sujet)                                                               |
| svelte-check                   | —              | 4.7.x accepte TS 6                          | ✅                                                                                        |

## 3. Inventaire : ce que Kit 3 casse chez nous

Comptes faits le 2026-10-28 sur `src`, `tests`, `scripts` (`.ts`, `.svelte`, `.js`).

### 3.1 Le gros morceau : `$lib` → `#lib`

- `$lib` n'existe plus ; `#lib` = imports de sous-chemin Node (`"imports"` de `package.json`), **extension obligatoire** : `$lib/foo` → `#lib/foo.js`.
- Chez nous : **13 332 imports `$lib` dans 3 784 fichiers**, dont **11 445 sans extension** ; **108 spécifiants distincts visent un dossier** (`index.ts`, ex. composants Shadcn `$lib/components/ui/button`) → `…/button/index.js`.
- Touche aussi : `vitest-setup-server.ts`, `vitest.definer-guard.config.ts`, `vitest.integration.config.ts`, `eslint.config.js` (2 motifs), `scripts/check-integration-paths.ts` (suit les alias), une centaine de scripts `scripts/*.ts`, **les `vi.mock('$lib/…')`** des tests (le chemin moqué doit être réécrit pareil).
- **À vérifier dans un essai** : que Vite/vitest résolvent `#lib/foo.js` vers `foo.ts` ; que `tsx` (scripts) suit `imports`.
- **Conséquence pratique** : un diff de ~3 800 fichiers entre en conflit avec **tous** les worktrees ouverts (13 le 2026-10-28). Il faut une **fenêtre de gel** : merger ou geler les chantiers, passer le codemod, puis rebaser chaque worktree en relançant le codemod sur ses fichiers.
- `alias: { $tests: './tests' }` (55 fichiers) : le guide ne dit pas qu'`alias` disparaît → à confirmer à l'essai.

### 3.2 Configuration

- `svelte.config.js` **n'est plus lu** : `adapter`, `csrf`, `alias`, `preprocess` passent dans `sveltekit({...})` de `vite.config.ts`.
- Fichiers qui lisent `svelte.config.js` : `eslint.config.js` (passé à `eslint-plugin-svelte`), `eslint.fast.config.js`, `scripts/doc-a-jour.config.ts`, `scripts/check-integration-paths.ts` (commentaire). Tester `eslint-plugin-svelte` sans ce fichier.
- `tsconfig.json` : `extends: "./.svelte-kit/tsconfig.json"` → `"$app/tsconfig"`, avec `include`/`exclude` **écrits à la main**. `verbatimModuleSyntax` et `isolatedModules` sont **déjà** actifs chez nous → rien de neuf de ce côté.
- `version.pollInterval` passe à 1 h par défaut (avant, aucune vérification) : sans risque ; avec la skew protection de Vercel, la détection passive peut rater.

### 3.3 Modules `$app/*`

| Changement                                                   | Chez nous                                                                          | Codemod ?              |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ---------------------- |
| `$app/stores` supprimé → `$app/state`                        | **23 fichiers** (dont 2 tests)                                                     | faisable **dès Kit 2** |
| `$app/environment` → `$app/env`                              | 87 fichiers + mocks de tests                                                       | mécanique              |
| `$app/paths` : `base`, `assets`, `resolveRoute` retirés      | on n'importe que `resolve` (74 fichiers)                                           | ✅ rien                |
| `resolve('/…')` : le `/` initial réservé aux **id de route** | 142 appels, tous des id `'/(protected)…'` / `'/(public)…'` ; 2 dynamiques à relire | quasi rien             |
| `page.url` en lecture seule                                  | 0 mutation                                                                         | ✅                     |
| `$service-worker` supprimé                                   | pas de service worker                                                              | ✅                     |
| `$env/*` déprécié (pas retiré) → `$app/env/private           | public`                                                                            | 17 imports             | plus tard |

### 3.4 Navigation

- `invalidateAll` → `refreshAll` : **76 appels + 5 options `invalidateAll: true`** (51 fichiers). Mécanique. `refreshAll` ne remet plus `page.state` à zéro.
- `pushState`/`replaceState` → `goto(url, { shallow: true, replace: true, state })` : **6 appels** (`slides/navigation/hash.ts`, `progression`, `atelier`, `grapheur`, `automaths/test`, `automaths/panier`). Les navigations superficielles déclenchent désormais `beforeNavigate`/`afterNavigate` (3 fichiers en ont) → vérifier qu'elles filtrent `shallow`.
- `goto` : `keepFocus: true, noScroll: true` → `reset: false` (3 appels) ; `keepFocus: true` seul (5 appels, worksheets, templates, figures) → voir ce que devient l'option.
- **`goto` rejette une URL qui n'est pas une route de l'appli** : `goto(notification.action_url)` (`dashboard/notifications`) et `goto(backUrl)` (admin/migration) à relire — rejet non attrapé = erreur console.
- Un lien vers la page courante lance `refreshAll()` (avant : rien) : à observer sur les menus.
- `use:enhance` dont l'`action` vise une autre page navigue vers elle : aucun cas trouvé (`action="/…"`).

### 3.5 Erreurs et réponses

- **`error(N, { message })` → `error(N, 'message', { …extra })`** : **36 appels dans 6 fichiers** (`api/chat`, `api/documents`, `api/documents/upload`, `csrfHandle.ts`, `middleware/consent.ts`) + le test-garde `messages-erreur-en-francais.test.ts` qui reconnaît cette forme. `error(N, 'msg')` marche déjà en Kit 2 → **faisable dès maintenant**.
- `App.Error` contient toujours `status` (notre `app.d.ts` déclare `message` + détail technique) : ajuster le type.
- `handleError` reçoit **toutes** les erreurs, `error(...)` compris, et les erreurs de rendu. Pas de `handleError` serveur chez nous ; le client (`hooks.client.ts`) traite déjà 404 à part → vérifier qu'il n'envoie pas de bruit à l'observabilité pour les 403/400 attendus.
- ⚠️ **`fail(...)` répond avec son vrai statut HTTP** (avant : toujours 200). Notre `src/lib/utils/form-action.ts` est **construit sur le 200** (doc d'en-tête, incident du 2026-09-16) et ses tests l'assertent ; `admin/questions/[id]/edit` teste `status !== 200`. Le helper doit lire le corps sans supposer le statut — à réécrire avec ses tests.
- `json()`/`text()` dépréciés (pas retirés) → `Response.json()` : 368 fichiers importent `json` ; **à laisser pour plus tard**.
- Une réponse 204 n'a plus de corps : 2 mocks de tests seulement.
- `isHttpError`/`isRedirect` déjà utilisés (14 fichiers), aucun `instanceof` → ✅.

### 3.6 Redirections externes : ⚠️ connexion Google

- `redirect()` vers une autre origine exige `{ external: true }` (ou une liste).
- **`auth/login/+page.server.ts:114` : `redirect(303, data.url)`** vers l'écran de consentement Google (OAuth Supabase) → **sans l'option, la connexion Google casse**. À corriger dans la PR de migration, avec un test.
- À relire : `l/[code]` (`redirect(302, target)`, liens courts : cible interne seulement ?), `automaths/test` (`launch.href`, a priori interne), `auth/callback` et `auth/confirm` (`next`, interne par construction ?).

### 3.7 Cookies, CSRF, modules serveur

- Cookies : `cookie` v2, `path` par défaut `/` — nous le donnons déjà partout (`path: '/'`) ; noms ASCII → ✅.
- CSRF : `csrf: {}` vide côté Kit, notre `csrfHandle.ts` à nous ; `checkOrigin` non utilisé → ✅.
- Modules serveur : tout dossier `server` (hors `src/routes`) et tout `server.ts` deviennent serveur-seul ; aucun hors `src/lib/server` → ✅.
- Remote functions, `@sveltejs/kit/node`, `src/params` : non utilisés → ✅.

## 4. Ce qui reste inconnu (à mesurer dans un essai)

- Résolution `#lib/x.js` → `x.ts` par Vite 8, vitest, `tsx`, `tsgo` (`check:incremental`).
- `eslint-plugin-svelte` et le pre-commit sans `svelte.config.js`.
- Mémoire du build Vercel (marge ~1 Go, cf. mémoire OOM) : relève surtout de Vite 8 / rolldown.
- Ce que `sv migrate sveltekit-3` fait vraiment sur notre code (le lancer dans un worktree jetable et lire son diff).

## 5. Ordre proposé (à valider)

1. **Vite 8** (+ vite-plugin-svelte 7) — session `questions-reponses-a-placer`.
2. **Dernière 2.x** + lecture des avertissements de dépréciation.
3. **PR préparatoires, faisables sur Kit 2, petites et sans gel** :
   - `$app/stores` → `$app/state` (23 fichiers) ;
   - `error(N, { message })` → `error(N, 'message')` (36 appels) + test-garde ;
   - `form-action.ts` indépendant du statut HTTP du `fail()` ;
   - **TypeScript 6.0.x** (et vérifier `@typescript/native-preview`, `typescript-eslint`).
4. **Essai** : worktree jetable, `sv migrate sveltekit-3`, lever les inconnues du § 4, mesurer le build.
5. **PR de migration, pendant une fenêtre de gel** : config dans `vite.config.ts`, `$lib` → `#lib`, `$app/env`, `refreshAll`, navigation superficielle, `goto`, redirection Google externe, `App.Error`, adapter-vercel 7, tsconfig. Revue `code-reviewer` (opus, gros diff) + `security-auditor` (auth, CSRF, cookies).
6. Plus tard, sans urgence : `json()` → `Response.json()`, `$env/*` → `$app/env/*`.

## Sources

- <https://svelte.dev/docs/kit/migrating-to-sveltekit-3> (guide officiel, lu le 2026-10-28)
- `npm view @sveltejs/kit@3.1.0 peerDependencies engines`, et versions des paquets ci-dessus (2026-10-28)
