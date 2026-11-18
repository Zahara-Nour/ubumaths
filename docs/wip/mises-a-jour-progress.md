# Mises à jour des dépendances — journal du chantier

## Reprendre ici

_Mis à jour le 2026-11-18, PR 2b en cours (branche `chore/sveltekit-3`)._

- **État** : kit 3.2.0 + adapter-vercel 7.0.3 posés dans le worktree, `check:incremental` à 0 erreur ; détail dans « PR 2b — SvelteKit 3 ». #2814 et #2821 mergées, pas encore en prod.
- **Prochaine action** : suites serveur + client, `types:cliquet`, `pnpm build`, essai manuel sur 5176 (connexion, navigation, page d'erreur), docs (`docs:check-a-jour`), revues `code-reviewer` (opus) + `security-auditor`, puis PR.
- **En attente de David** : `deploy:prod` pour livrer #2814 et #2821, quand il le voudra.
- **Pièges en cours** : `$lib` gardé par `alias` (déprécié) — `#lib` = PR à part ; `$env/*` n'expose plus que ce que déclare `src/env.ts` ; `check:incremental` (tsgo) ne vérifie pas TS 6, seul `pnpm check`. `minimumReleaseAge` 3 j.
- **Worktree / branche** : `../ubumaths-wt-mises-a-jour` · `chore/sveltekit-3`.

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
- `error(N, { message })` et `pushState`/`replaceState` seulement **dépréciés** (avertissement) ; les appels dépréciés de `replaceState` ne déclenchent pas `before/afterNavigate` → laissés.
- **`goto` : `keepFocus`/`noScroll` retirés** (erreur en dev) → `reset: false` (9 appels).
- **`redirect()` vers une autre origine** exige `{ external }` : seule la connexion Google (`auth/login`) sort du site → liste blanche = origine Supabase, test à l'appui. Les `next` de `auth/callback` et `auth/confirm` sont relatifs ou de même origine (permis).
- **`resolve('/x')`** = id de route ; un chemin s'écrit sans `/` (`resolve('shtam')`) : 109 littéraux corrigés ; les chemins portés par une variable passent par `resolvePath` (`$lib/navigation/resolve-path`), `resolve` refusant de typer une union.
- `page.url` en lecture seule (`ReadonlyURLSearchParams`) : `new URL(page.url.href)`, fonctions de lecture retypées.
- **`handleError` client** reçoit `kind` (`app`/`framework`/`unknown`) et désormais les `error(...)` voulus → non journalisés ; 404 en avertissement, exception en erreur avec `detail`.
- **`fail()` répond avec son vrai statut** : `form-action.ts` lisait déjà le corps (en-tête corrigé) ; le combat Navadra (`response.ok`) affichera « Erreur lors de la validation » au lieu de « Réponse incorrecte » sur un refus — mieux.
- **CSRF** : un POST/PUT/PATCH/DELETE **sans `Content-Type`** d'une autre origine (ou sans `Origin`) est refusé. Crons Vercel en GET, aucun script ne poste vers l'appli → rien ne casse ; à faire relire par `security-auditor`.
- `tsconfig.json` étend `$app/tsconfig` (`node_modules/$app/`, écrit par `svelte-kit sync`) ; `.svelte-kit/tsconfig.json` n'existe plus → sentinelle `.svelte-kit/.sync-sentinel` dans `check-incremental.sh`.

## Autres versions en retard (pnpm outdated, 2026-11-18)

- Mineures : tiptap 3.34, bits-ui 2.21, vite 8.3.8, prettier 3.10 (épinglé), oxlint 1.93, playwright 1.65.1…
- Majeures : kit 3 + adapter-vercel 7, vitest 5 (chemin dans la mémoire `project_vitest-5-chemin`), TypeScript 7, ESLint 10, marked 18, Brevo 6, supabase CLI 3, tailwind-variants 4…

## Historique

- 2026-11-18 : #2814 mergée (CI verte, 16 contrôles) : SvelteKit 2.70.3 → 2.70.4.
- 2026-11-18 : #2821 mergée (CI verte, 17 contrôles) : TypeScript 5.9.3 → 6.0.3 ; `pnpm check` local 0 erreur sur 11 653 fichiers, cliquet tenu, aucune correction de code nécessaire.
