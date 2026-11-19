# Mises à jour des dépendances — journal du chantier

## Reprendre ici

_Mis à jour le 2026-11-19 : chantier clos._

- **État** : clos. Mises à jour faites (SvelteKit 2.70.4 puis 3.2.0, adapter-vercel 7, TypeScript 6, `#lib`, `json`/`invalidateAll`/`$env`), cache ESLint réparé (#2867). #2711 fermée (périmée), #2738 (contrôle de santé lu sur `production`) reprise dans ce chantier.
- **Versé** : `docs/pratiques/svelte-typescript.md` § SvelteKit 3, `docs/pratiques/tests.md` (pièges vitest), `docs/pratiques/environnement-de-dev.md` (cache ESLint et `.nvmrc`, déjà versé par #2867).
- **Laissé à Dependabot** : #2075 (Brevo 6, CI rouge) et les versions en retard listées plus bas.

## `json()` → `Response.json` (2026-11-19)

- Décidé par David le 2026-11-19 (« on fait le 2 »). `text()` de kit : aucun appel.
- Différences lues dans `@sveltejs/kit` 3.2.0 (`src/exports/index.js`) : (1) kit pose `Content-Length`, pas `Response.json` → le serveur envoie par morceaux ; aucun code ne lit cet en-tête sur nos propres réponses ; (2) `json(undefined)` rend un corps vide, `Response.json(undefined)` **lève une `TypeError`**. `Content-Type` : identique (`application/json` si absent).
- Preuve pour (2) : passe de détection où les 867 appels passaient par une fonction temporaire `jsonStrict<T>(data: 0 extends 1 & T ? never : undefined extends T ? never : T)` → typecheck : **0 appel** dont la donnée peut être `undefined`, `unknown` ou `any`. Sonde vérifiée rouge sur les trois cas, dans `src/lib/server` et dans un `+server.ts`.
- Transformation par script (import retiré de la ligne `@sveltejs/kit`, `json(` → `Response.json(` hors `.json(`), puis `pnpm format`. Piège : le `sed` de macOS ignore `\b` → perl.

## Dépréciations de kit 3 (2026-11-18)

- `invalidateAll` → `refreshAll` : seule différence documentée, `refreshAll` ne remet pas `page.state` à `{}` et relance aussi les fonctions distantes. Aucune fonction distante (`$app/server` non importé) ; `page.state` n'est jamais rempli (seulement retransmis) → même effet. Piège : deux méthodes de cache s'appellent aussi `invalidateAll` (`teacherDashboardCache`, `studentDashboardCache`) — à ne pas renommer.
- `pushState`/`replaceState` **laissés** : le remplaçant `goto(url, { state, shallow: true, replace: true })` passe par `_before_navigate` (le code de kit le dit : « for backwards compatibility we don't trigger navigation hooks etc for push/replaceState »). Effets ici : `navigating.to` → barre et squelette à chaque frappe de la recherche du catalogue ; `beforeNavigate` racine (`shouldReloadOnNavigate`) → rechargement complet si une nouvelle version est en ligne ; `afterNavigate` du Palotin. À rouvrir seulement si kit 4 les retire.

## Origine

Après le `deploy:prod` v0.95.0 (2026-11-18), GitHub signale 11 failles dans les dépendances (3 graves, 4 moyennes, 4 faibles). David : « ouvre un chantier mises à jour ».

## Décisions de David

- 2026-11-18 : **choix 1** — SvelteKit 2.70.4 d'abord (ferme les 2 alertes qui nous concernent), SvelteKit 3 ensuite dans une PR à part. Autres montées hors du chantier (lot mensuel de Dependabot).

- 2026-11-18 : **découpage de SvelteKit 3 validé** (« oui ») : 2a = TypeScript 6 seul, sur kit 2 ; 2b = kit 3.2.0 + adapter-vercel 7.0.3 (versions mûres), outil `npx sv migrate sveltekit-3` + corrections à la main, revues `code-reviewer` + `security-auditor` ; si `$lib` reste accepté, `$lib` → `#lib` dans une PR mécanique à part ; les dépréciations (json, invalidateAll, $env, pushState, goto) plus tard.

## Relevé des alertes (2026-11-18)

SvelteKit installé : 2.70.3. Dernières versions : 2.70.4 (2026-11-05), 3.3.1 (2026-11-17).

| Gravité    | Paquet                                                  | Corrigé en     | Nous concerne ?                                                                   |
| ---------- | ------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------- |
| moyenne    | kit (import de module `//…` à la résolution des routes) | 2.70.4         | oui                                                                               |
| moyenne    | kit (adapter-node, `reroute` et URL mal formée)         | 2.70.4         | non (adapter-vercel), corrigé au passage                                          |
| grave ×2   | kit (formulaire des « remote functions »)               | 3.1.1          | non : aucune remote function (`$app/server`, `query.batch` : 0 usage dans `src`)  |
| moyenne ×2 | kit (`query.batch` privées)                             | 3.1.1          | non : même raison                                                                 |
| faible ×2  | kit (redirection par formulaire amélioré)               | 3.0.0          | à voir (`use:enhance`)                                                            |
| faible ×2  | kit (en-tête cache-control d'une page prérendue)        | 3.0.0          | à voir (pages prérendues)                                                         |
| grave      | picomatch 4.0.7 (ReDoS sur des motifs de fichiers)      | aucune version | non : outil de construction seulement (vite → tinyglobby), motifs écrits par nous |

Les « ×2 » = la même faille comptée deux fois (dépendance de dev et d'exécution).

## Étude SvelteKit 3 (2026-11-18)

Source : https://svelte.dev/docs/kit/migrating-to-sveltekit-3. Comptes faits par grep dans `src` + `tests`.

**Les 2 faibles ne nous concernent pas** : aucun formulaire `use:enhance` ne poste vers une autre page (43 fichiers, tous `?/…`, y compris les 2 `action={…}` dynamiques) ; une seule page prérendue (`/demo`).

**Obligatoire en 3.0 :**

- TypeScript 6 (5.9.3 → 6.0.3 ; typescript-eslint 8.71.0 l'accepte, `<6.1.0` ; svelte-check aussi). Node 22.17+ : OK.
- `svelte.config.js` plus lu : adaptateur, `csrf`, alias `$tests`, `version.pollInterval` → options du plugin `sveltekit()` dans `vite.config.ts`.
- `$lib` → `#lib` + extensions explicites : 4 088 fichiers, 14 600 imports (outil de migration). Retiré ou seulement déprécié : à vérifier.
- `$app/stores` retiré : 22 fichiers → `$app/state`. `$app/environment` → `$app/env` : 86 fichiers.
- `error(NNN, { message })` : 2ᵉ argument = chaîne : 36 appels, 6 fichiers (`csrfHandle`, `consent`, chat, documents, upload, test des messages).
- `handleError` reçoit aussi les `error(...)` voulus : `hooks.client.ts`, bruit possible dans le suivi des erreurs.
- CSRF toujours actif, requête d'une autre origine sans `Content-Type` refusée : à confronter à notre `csrfHandle` (retour OAuth Google). Sécurité → `security-auditor`.
- Cookies : `cookie` v2, `path` par défaut `/` ; nous passons `path: '/'` presque partout, vérifier les `cookieOptions` de Google.
- `App.Error` a toujours `status` (`app.d.ts`). adapter-vercel 7 : plus d'`edge` (nous : `nodejs22.x`, rien).

**Seulement déprécié (plus tard)** : `json()`/`text()` de kit (368 fichiers), `invalidateAll` (54), `$env/*` (18), `pushState`/`replaceState` (15), `goto` avec options (10).

**Rien chez nous** : `$service-worker`, remote functions, `instanceof HttpError`, `data-sveltekit-*="off"`, `preloadData`, `getRequest`, `src/params`.

## PR 2b — SvelteKit 3 (2026-11-18)

Versions : kit **3.2.0**, adapter-vercel **7.0.3** (3.3.x et 7.0.4 publiées le 17, trop jeunes). Outil `sv migrate sveltekit-3` (sv 1.4.0) lancé tâche par tâche, mais il **reformate chaque fichier touché** (commentaires d'en-tête déplacés, `{disabled}` → `disabled={disabled}`) : seule la tâche `svelte-config` est gardée, le reste refait à la main. L'outil ne rend pas la main (prompt final) : arrêter ses processus `node` à la fin.

Constats dans le code de kit 3.2.0 (pas dans le guide) :

- **`$lib` retiré, mais réactivable** par `alias: { $lib: './src/lib' }` (option `alias` dépréciée, simple avertissement) → gardé ainsi ; `#lib` (≈ 14 600 imports) dans une PR à part.
- **`$env/*` ne rend plus que les variables déclarées dans `src/env.ts`** (`defineEnvVars`), et n'a plus de types → `src/env.ts` créé (3 statiques obligatoires, 9 facultatives `schema: optionnelle`), 18 imports passés à `$app/env/public|private`. Sans `schema` = obligatoire : `check-env-parity` vérifie maintenant ces variables-là contre `.github/ci.env`.
- **Tests navigateur** : `$app/env/public` lit `globalThis.__sveltekit_dev`, posé par la page HTML de kit, pas par vitest → posé dans `vitest-setup-client.ts`.
- `Handle` & co → `@sveltejs/kit/hooks` ; `ActionResult` → `$app/forms`.
- `error(N, { message })` et `pushState`/`replaceState` seulement **dépréciés** (avertissement) ; les appels dépréciés de `replaceState` ne déclenchent pas `before/afterNavigate` → laissés. Mais **`replaceState` est devenu asynchrone** et rejette quand le routeur n'est pas démarré : le `try/catch` de `slides/navigation/hash.ts` ne voyait plus l'échec → rejet non géré qui **figeait toute la suite client** (`wrapDynamicImport` absent dans les fichiers suivants) → repli par `.catch`.
- **`importOriginal` de `$app/navigation` dans un `vi.mock` ne se termine jamais** en kit 3 : le fichier se fige, puis toute la suite client (`wrapDynamicImport` absent = bruit, présent aussi sur `main`). 11 fichiers passés au mock partagé `tests/helpers/app-navigation-mock.ts` (`appNavigationMock({ goto })`).
- **`ActionResult`** : succès/échec portent `location`, `App.Error` a un `status` (test `form-action`, cliquet).
- **Suite d'intégration** : `sveltekit()` sans options ne résout plus `$lib` → `kitAlias` partagé (`vitest.base.config.ts`) entre `vite.config.ts` et `vitest.integration.config.ts`.
- **`data-sveltekit-noscroll`/`keepfocus` ignorés** (avertissement en dev seulement) → `data-sveltekit-reset="false"` (programme, classements).
- **`goto` rejette une route inconnue** (kit 2 chargeait la page, donc une 404) → liens de notification par `gotoNotification` (repli `location.assign`, chemins du site seulement) ; deux notifications ont des adresses mortes (`student/resources/<id>`, `student/vip-cards`), fonctions plus appelées.
- **cookie** : l'override `cookie >=0.7.0` imposait 1.1.1 à kit 3 (qui exige ^2.0.1, sa validation des noms retirée) → borné à `cookie@<0.7.0`.
- **`@vercel/speed-insights`** importe encore `$app/environment` (avertissement en dev, accepté par kit 3).
- **Suite client en local** : sans `CI=true`, elle lance aussi les tests Pyodide réels (`*-real`) ; lancer `CI=true pnpm exec vitest run --project=client` pour reproduire la CI.
- **`goto` : `keepFocus`/`noScroll` retirés** (erreur en dev) → `reset: false` (9 appels).
- **`redirect()` vers une autre origine** exige `{ external }` : seule la connexion Google (`auth/login`) sort du site → liste blanche = origine Supabase, test à l'appui. Les `next` de `auth/callback` et `auth/confirm` sont relatifs ou de même origine (permis).
- **`resolve('/x')`** = id de route ; un chemin s'écrit sans `/` (`resolve('shtam')`) : 109 littéraux corrigés ; les chemins portés par une variable passent par `resolvePath` (`$lib/navigation/resolve-path`), `resolve` refusant de typer une union.
- `page.url` en lecture seule (`ReadonlyURLSearchParams`) : `new URL(page.url.href)`, fonctions de lecture retypées.
- **`handleError` client** reçoit `kind` (`app`/`framework`/`unknown`) et désormais les `error(...)` voulus → non journalisés ; 404 en avertissement, exception en erreur avec `detail`.
- **`fail()` répond avec son vrai statut** : `form-action.ts` lisait déjà le corps (en-tête corrigé) ; le combat Navadra (`response.ok`) affichera « Erreur lors de la validation » au lieu de « Réponse incorrecte » sur un refus — mieux.
- **CSRF** : un POST/PUT/PATCH/DELETE **sans `Content-Type`** d'une autre origine (ou sans `Origin`) est refusé. Crons Vercel en GET, aucun script ne poste vers l'appli → rien ne casse ; à faire relire par `security-auditor`.
- `tsconfig.json` étend `$app/tsconfig` (`node_modules/$app/`, écrit par `svelte-kit sync`) ; `.svelte-kit/tsconfig.json` n'existe plus → sentinelle `.svelte-kit/.sync-sentinel` dans `check-incremental.sh`.

## PR 3 — `#lib` (2026-11-18)

- **Transformation** : script maison (pas `sv migrate`, qui reformate chaque fichier), même règle que l'outil : `'$lib/x'` → `'#lib/x.ts'` (ou `.js`, `/index.ts`, `/index.js`, selon le fichier qui existe ; chemin déjà complet, `?raw`/`?inline` : inchangé), `$tests` de même ; les mentions en commentaire passent à `#lib` sans extension. ≈ 4 250 fichiers. `#lib/utils.js` des composants shadcn → `utils.ts`. Docs vivantes (`docs/pratiques`, `docs/systeme`, `CLAUDE.md`, agents) passées aussi ; `docs/archive`, journaux wip et migrations SQL laissés.
- `package.json` : `"imports": { "#lib/*": "./src/lib/*", "#tests/*": "./tests/*" }` ; `kitAlias` et l'option `alias` de `sveltekit()` retirés (`vite.config.ts`, `vitest.integration.config.ts`).
- **Typecheck incrémental** : sans `paths` dans `tsconfig.json`, tsgo ne relie pas `#lib/…/X.svelte` au composant (le `rootDirs` de `.svelte-kit/.svelte-check` ne s'applique pas aux imports de sous-chemin) → type générique `*.svelte`, 178 erreurs (props en `any`). `paths` `#lib/*` et `#tests/*` ajoutés : 0 erreur.
- **Piège du script** : le littéral `'$lib/'` (préfixe testé par `startsWith`) est devenu `'#lib//index.ts'` → 4 gardes qui suivent les imports (`find-top-level-effects`, `chaque-page-a-un-titre`, `sans-blockly`, `workers-sans-runes`) devenaient aveugles ; seule `chaque-page-a-un-titre` a échoué. Corrigé ; `listBareImportTargets` retrouve bien `utils/mathlive-styles.ts` & co.
- **Revue (`code-reviewer` Opus)** : deux autres gardes vertes à vide, corrigées. `sans-blockly` cherchait `x.ts.ts` (8 fichiers suivis au lieu de 603) ; la garde de poids de `figure-typst-setup` ne voyait plus `figure-typst.ts'`. `components.json` (shadcn) est passé à `#lib`. Les `paths` rendent TS tolérant à l'extension oubliée, d'où la nouvelle garde `scripts/__tests__/imports-lib-avec-extension.test.ts`, vérifiée rouge en retirant une extension.
- `check-integration-paths` : filtre esbuild `^#lib`. `tsx` résout `#lib` sans rien (Node lit `package.json`).

## PR 4 — `pnpm migrer:diese` (2026-11-18)

- Les 20 worktrees ouverts sont partis d'avant #2826 : `$lib` ne se résout plus chez eux après `git merge origin/main`. Le script de #2826 n'avait pas été commité → `scripts/migrer-diese.ts` (même règle, fichiers de la branche par défaut, `--essai`), test `scripts/__tests__/migrer-diese.test.ts`.
- Essai à blanc dans `ecarts-a-trier` : 31 fichiers, 169 imports, 0 introuvable.
- Après merge : message à toutes les sessions (consigne de merge + `pnpm migrer:diese`).

## Autres versions en retard (pnpm outdated, 2026-11-18)

- Mineures : tiptap 3.34, bits-ui 2.21, vite 8.3.8, prettier 3.10 (épinglé), oxlint 1.93, playwright 1.65.1…
- Majeures : kit 3 + adapter-vercel 7, vitest 5 (chemin dans la mémoire `project_vitest-5-chemin`), TypeScript 7, ESLint 10, marked 18, Brevo 6, supabase CLI 3, tailwind-variants 4…

## Historique

- 2026-11-18 : #2830 mergée (CI verte, 14 contrôles ; étape ESLint 1 s) : lint de PR sur les fichiers changés + importeurs `.svelte` ; revue `code-reviewer` (no-unused-props type-aware → importeurs ; vite.config, .d.ts, .nvmrc → tout l'arbre ; quotepath ; cache nocturne save always).
- 2026-11-18 : #2828 mergée (CI verte, 16 contrôles) : `pnpm migrer:diese` ; revue `code-reviewer` (script limité aux imports, hors commentaires, hors lui-même) ; garde imports-lib : exclusion du test.
- 2026-11-18 : #2825 mergée (CI verte, 16 contrôles) : SvelteKit 3.2.0 + adapter-vercel 7.0.3, `src/env.ts`, cookie 2 ; revues `code-reviewer` + `security-auditor` traitées.
- 2026-11-18 : #2814 mergée (CI verte, 16 contrôles) : SvelteKit 2.70.3 → 2.70.4.
- 2026-11-18 : #2821 mergée (CI verte, 17 contrôles) : TypeScript 5.9.3 → 6.0.3 ; `pnpm check` local 0 erreur sur 11 653 fichiers, cliquet tenu, aucune correction de code nécessaire.

## Cache ESLint en CI (2026-11-18 ; cause trouvée le 2026-11-19)

**Cause (2026-11-19)** : ESLint calcule l'empreinte de config à partir de `${version d'ESLint}_${process.version}_${config}` (`lint-result-cache.js`, `hashOfConfigFor`). `.nvmrc` valait `22` : `setup-node` prend le Node 22 de l'image du runner, et GitHub déploie ses images progressivement. Nocturnes du 2026-11-18 : 17:34 image 20261111, Node 22.23.4 ; 19:28 image 20261116, **22.23.5** ; 20:46 image 20261111, 22.23.4 → cache de 19:28 restauré (même clé), tout relu, 31 min. Les jobs du diagnostic d'hier étaient tombés sur la même image, d'où « Node identique ». Contre-épreuve : la config sérialisée de `.lintstagedrc.js` en local (autre commit, autre machine) est identique au caractère près à celle de la CI. Correctif : `.nvmrc` = `22.23.5` (choix de David : la version exacte dans `.nvmrc`, pas seulement dans les jobs ESLint).

Vérifié après #2867 : nocturne sur main n° 1 (Node 22.23.5) 21 min, n° 2 restaure ce cache et relit tout l'arbre en 5 s.

Ce que le diagnostic d'hier avait établi :

Établi par une branche jetable (`diag/eslint-cache`, supprimée) et en local :

- Dans un même job de CI, le cache marche : `eslint src/lib/utils` deux fois → 169/169 sautés au 2e passage.
- D'un job à l'autre, non : avec le cache enregistré par `lint-nocturne` sur main, 0/169 sautés ; sur 310 entrées échantillonnées, 0 changement de contenu, 100 % `hashOfConfig` différent (même pour `.lintstagedrc.js`).
- Pourtant la config sérialisée (`calculateConfigForFile` + `json-stable-stringify`) est identique au caractère près entre deux jobs ; Node identique (22.23.4) ; pas de changement de config entre les commits.
- En local, rien ne se reproduit : après `pnpm lint .` complet (24 min), `eslint src/lib/utils` saute 169/169.
- Pistes non explorées : comparer la config d'un job qui relit TOUT l'arbre (nocturne) à celle d'un job qui ne relit qu'un dossier, dans la même exécution ; `hashOfConfigFor` mis en cache par objet de config (une mutation avant le premier calcul ?).
- Contournement : attente de `deploy:prod` portée à 2700 s. Option écartée pour l'instant (à trancher par David, touche l'ADR 0021) : CI de version qui s'appuie sur le nocturne vert au lieu de tout relire.
