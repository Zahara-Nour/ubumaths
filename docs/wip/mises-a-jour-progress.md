# Mises à jour des dépendances — journal du chantier

## Reprendre ici

_Mis à jour le 2026-11-18, après #2821._

- **État** : #2814 (kit 2.70.4) et #2821 (TypeScript 6.0.3, CI verte, Lint compris) mergées, pas encore en prod. Étude SvelteKit 3 : section « Étude SvelteKit 3 ».
- **Prochaine action** : PR 2b, kit 3 + adapter-vercel 7 (versions mûres au jour J, règle des 3 j ; 3.2.0 / 7.0.3 au 2026-11-18). Nouveau worktree, `npx sv migrate sveltekit-3`, d'abord vérifier si `$lib` est retiré ou seulement déprécié (sinon `#lib` dans une PR à part), puis corrections à la main de la liste « Obligatoire en 3.0 ». Revues `code-reviewer` + `security-auditor` (CSRF, cookies).
- **En attente de David** : `deploy:prod` pour livrer #2814 et #2821, quand il le voudra.
- **Pièges en cours** : `check:incremental` tourne sous tsgo (TS 7) : il NE vérifie PAS TS 6, seul `pnpm check` le fait. Dépendances retenues exprès (mémoire `project_dependances-epinglees`) ; `minimumReleaseAge` 3 j, ne jamais le contourner.
- **Worktree / branche** : aucun (supprimés après #2821).

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

## Autres versions en retard (pnpm outdated, 2026-11-18)

- Mineures : tiptap 3.34, bits-ui 2.21, vite 8.3.8, prettier 3.10 (épinglé), oxlint 1.93, playwright 1.65.1…
- Majeures : kit 3 + adapter-vercel 7, vitest 5 (chemin dans la mémoire `project_vitest-5-chemin`), TypeScript 7, ESLint 10, marked 18, Brevo 6, supabase CLI 3, tailwind-variants 4…

## Historique

- 2026-11-18 : #2814 mergée (CI verte, 16 contrôles) : SvelteKit 2.70.3 → 2.70.4.
- 2026-11-18 : #2821 mergée (CI verte, 17 contrôles) : TypeScript 5.9.3 → 6.0.3 ; `pnpm check` local 0 erreur sur 11 653 fichiers, cliquet tenu, aucune correction de code nécessaire.
