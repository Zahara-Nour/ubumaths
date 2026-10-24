# Limiteur de connexion levé sur le serveur de dev local

## Reprendre ici

_Mis à jour le 2026-10-24, PR à ouvrir._

- **État** : phase 0 validée (OAuth non touché) ; code et tests écrits, verts ; doc `auth.md` + `environnement-de-dev.md` à jour.
- **Prochaine action** : PR, revues `code-reviewer` + `security-auditor` (Opus), CI verte → merge.
- **En attente de David** : rien.
- **Pièges en cours** : sous vitest `dev` est vrai → un test d'action avec IP `127.0.0.1` saute le limiteur ; les anciens tests passent par `203.0.113.7`.
- **Worktree / branche** : `../ubumaths-wt-limiteur-local` · `feat/limiteur-local`.

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

## Phase 0 validée (2026-10-24)

David suit les recos : limiteur OAuth inchangé (pas de besoin constaté, Playwright ne passe pas
par Google). Comportements : boucle locale exacte + `dev` → aucun des deux limiteurs ; autre IP
ou build → limiteur ; IP vide/bizarre → limiteur ; erreurs Zod / identifiants inchangées.

## Fait

- `src/lib/server/local-login-rate-limit.ts` : `skipsLoginRateLimit(dev, ip)` (fichier à part :
  les tests de l'action simulent tout `rateLimiter`).
- Tests : `src/lib/server/__tests__/local-login-rate-limit.test.ts`,
  `src/routes/(public)/auth/login/__tests__/login-limiteur-local.test.ts` (rouges avant le code,
  `dev` réglable par test, cas build + 127.0.0.1 prouvé).
