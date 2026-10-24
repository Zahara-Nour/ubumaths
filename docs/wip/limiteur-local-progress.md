# Limiteur de connexion levé sur le serveur de dev local

## Reprendre ici

_Mis à jour le 2026-10-24, avant le premier commit._

- **État** : décidé par David le 2026-10-24 (option 1 sur 3), rien de codé.
- **Prochaine action** : worktree `../ubumaths-wt-limiteur-local` (branche `feat/limiteur-local`) depuis `origin/main` ; phase 0 (comportements) à montrer à David, puis tests rouges, puis code.
- **En attente de David** : rien.
- **Pièges en cours** : code d'authentification → revue `code-reviewer` + `security-auditor` (Opus) ; prouver par un test que le limiteur reste actif hors du serveur de dev.
- **Worktree / branche** : pas encore créés.

## Le besoin (2026-10-24)

`checkLoginRateLimitByIP` (`src/lib/server/rateLimiter.ts`) accepte 5 connexions par IP en 15 min,
**réussies comprises**, compteur dans `rate_limits` (Supabase local, partagé par tous les worktrees).
En local, toutes les sessions et les scripts Playwright viennent de `localhost` : quelques connexions
de test bloquent tout le monde 15 minutes (constaté pendant la PR #1680 de demo-debug).

## Décision de David : option 1

Écartées : variable d'environnement (`LOGIN_RATE_LIMIT_OFF`, risque d'être recopiée sur Vercel) ;
script qui vide `rate_limits` à la main.

Retenue : dans l'action `login` de `src/routes/(public)/auth/login/+page.server.ts`, sauter les
deux limiteurs (par IP et par adresse) quand `dev` (`$app/environment`) est vrai **et** que l'IP
est locale (`127.0.0.1`, `::1`, `::ffff:127.0.0.1`). `dev` n'est vrai que sous `pnpm dev`, jamais
dans un build : la prod garde le limiteur.

Idée de forme : une fonction pure (par ex. `skipsLoginRateLimit(dev, ip)`) testée seule ; tests de
l'action dans `src/routes/(public)/auth/login/__tests__/` (le limiteur y est déjà simulé).

À mettre à jour avec le code : `docs/pratiques/environnement-de-dev.md` (« Les connexions ratées
comptent dans le limiteur… ») et la doc qui couvre la page de connexion (`pnpm docs:check-a-jour`).
À trancher en phase 0 : le limiteur OAuth (`checkOAuthRateLimitByIP`) suit-il la même règle ?
