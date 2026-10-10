# Architecture générale

> Vérifié contre le code le 2026-10-10.

## À quoi ça sert

Vue d'ensemble pour s'orienter : où vit quoi, comment une requête traverse l'application
(hooks → layouts → page ou endpoint), ce qui se joue entre SSR et hydratation (dont la contrainte
Safari TDZ), et le motif « UI optimiste + envoi groupé ». **Chaque module de `src/lib` a sa doc** :
la carte module → doc est dans [docs/README.md](../README.md#module-de-srclib--sa-doc) — ce
document n'en redécrit aucun. Vocabulaire : [CONTEXT.md](../../CONTEXT.md). Règles : [CLAUDE.md](../../CLAUDE.md).

## Carte du code

```
src/
├── hooks.server.ts     # handle = sequence(...) : peuple event.locals, une fois par requête
├── hooks.client.ts     # surveillance d'erreurs, Web Vitals, détection de gel (navigateur)
├── app.d.ts            # App.Locals : supabase, safeGetSession, user, profile, requestId, adminSupabase…
├── routes/
│   ├── +layout.server.ts   # racine serveur : renvoie user/profile (lus dans locals), cookies sb-*
│   ├── +layout.ts          # racine universelle : crée le client Supabase (imports DYNAMIQUES, cf. TDZ)
│   ├── (public)/           # pages sans authentification
│   ├── (protected)/        # authentification requise
│   ├── api/                # endpoints +server.ts
│   ├── slides/             # hors groupe (layout réinitialisé, page de test)
│   └── sitemap.xml/        # +server.ts du plan du site
└── lib/
    ├── components/         # ui/ = Shadcn ; MySelect, MyCheckbox…
    ├── server/             # code serveur seulement → serveur.md
    ├── stores/             # état partagé (.svelte.ts, runes), dont le temps réel → realtime.md
    ├── types/              # database.ts (généré) + database-helpers.ts (types dérivés)
    ├── utils/
    └── <module>/           # mathAST, questions, geometry-core, srs, games… → docs/README.md
```

Ordre dans un fichier : Imports → Types → Constantes → Variables → Functions → Components.

## Une requête, de bout en bout

### 1. Les hooks serveur

`src/hooks.server.ts` enchaîne, dans cet ordre : `requestIdHandle` → `maintenanceHandle` (avant
Supabase, pour fonctionner base gelée) → `supabaseHandle` (`src/lib/server/supabase.ts` :
`locals.supabase`, `locals.safeGetSession` vérifié par `getUser()`) → `redirectHandle` →
`userProfileHandle` (`locals.user`, `locals.profile`) → `adminElevationHandle` →
`csrfHandle` → `securityHeadersHandle` → `errorMonitoringHandle`. Détail de chaque maillon :
[auth.md](auth.md#la-chaîne-de-handles) · ce que les hooks font pour tous les endpoints :
[serveur.md](serveur.md#17-ce-que-les-hooks-font-pour-tous).

**`locals` est la source unique d'identité** : les `load` et les endpoints lisent
`locals.user` / `locals.profile`, sans refaire la vérification.

### 2. Les groupes de routes

Les parenthèses créent des groupes de layout SvelteKit, absents de l'URL
(`(protected)/dashboard/+page.svelte` → `/dashboard`).

| Groupe         | Garde                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| `(public)/`    | aucune                                                                                                    |
| `(protected)/` | `src/routes/(protected)/+layout.server.ts`, avant toute route enfant                                      |
| `api/`         | par endpoint : `requireAuth` / `requireRole` / `requireRoles` (`src/lib/server/middleware/auth.ts`) + Zod |

La garde de `(protected)/` : `requireAuth(user)` (`src/lib/server/auth.ts`, redirige vers
`/auth/login`), profil obligatoire (sinon 500 + `logError`), puis **refus par défaut** sur
`profile.status` (`pending` → `/auth/pending-approval` ; tout autre statut que `approved` →
`signOut()` + `/auth/login?error=…`). Elle renvoie aussi l'état du consentement
(`getConsentStatus`). Les rôles plus fins se vérifient dans la page ou l'endpoint. Statuts,
rôles et élévation : [auth.md](auth.md).

### 3. Les endpoints

Conventions (garde de rôle, validation Zod, choix du client Supabase, erreurs, limites de
débit, journalisation) : [serveur.md](serveur.md#1-conventions-dun-endpoint-et-dune-action).
`GET` lit ; `POST` / `PATCH` / `DELETE` écrivent. Zod : [qualite.md](../pratiques/qualite.md#input-validation-with-zod).

## SSR et hydratation

Deux `load` racine, dans l'ordre :

1. **`src/routes/+layout.server.ts`** (serveur) : renvoie `user` et `profile` tels que les hooks
   les ont posés dans `locals`, les seuls cookies `sb-*`, et le catalogue des cartes VIP si une
   session existe.
2. **`src/routes/+layout.ts`** (universel : SSR puis navigateur) : crée le client Supabase
   (`createServerClient` à partir des cookies en SSR, `createBrowserClient` dans le navigateur),
   `depends('supabase:auth')`. Les composants utilisent ce client (`data.supabase`).

**Flux d'auth réactif** : `onAuthStateChange` ne consomme **jamais** la session du rappel (non
vérifiée) ; il appelle `invalidate('supabase:auth')`, qui relance le `load` racine et la
vérification serveur. `SIGNED_IN` du même utilisateur (HMR, retour sur l'onglet) est ignoré, et
`TOKEN_REFRESHED` n'invalide que toutes les 30 min au plus (`REFRESH_INTERVAL_MS`), via
`sessionStorage`.

### ⚠️ Safari/WebKit TDZ — le chunk du layout racine

Le chunk du layout racine doit rester **< 100 Ko**, sinon iPad/Safari lève
`Cannot access 'universal' before initialization`.

- `@supabase/ssr` et `$app/navigation` sont importés **dynamiquement** dans
  `src/routes/+layout.ts` (`await import(...)`). Jamais d'import statique lourd dans ce fichier.
- Garde CI : `.github/workflows/quality.yml`, après le build, refuse un `nodes/0.*.js` de plus de
  `102400` octets.

Détail : [safari-webkit-tdz.md](../pratiques/safari-webkit-tdz.md).

## Motif : UI optimiste + envoi groupé

Pour les mises à jour fréquentes (compteurs, quantités) : la mise à jour s'applique tout de suite
à l'écran, les clics s'**accumulent** pendant 500 ms, puis un seul envoi part ; en cas d'échec,
on retire le delta accumulé et on affiche un toast d'erreur. Référence vivante :
`src/routes/(protected)/dashboard/teacher/gamification/rewards/+page.svelte`
(`debouncedUpdateStudent`, `debouncedUpdateStudentBonus`, `debouncedUpdateClass`, cache prof
`updateGidouillesOptimistic`). UI optimiste seule (sans regroupement), avec retour arrière :
`src/routes/(protected)/dashboard/student/inventory/+page.svelte`.

Réactivité : **événement → handler → mise à jour du state → mise à jour du DOM** ; `$effect`
réservé aux effets de bord ([svelte-typescript.md](../pratiques/svelte-typescript.md)).

## Systèmes volumineux (pointeurs)

- **Questions** (`src/lib/questions/`, API publique `src/lib/questions/index.ts` :
  `generateInstance`, `resolveVariables`… ; génération dans `src/lib/questions/generator/`) →
  [questions.md](questions.md). Agent : `pedagogy-expert`.
- **mathAST** (`src/lib/mathAST/`) → [mathast/](mathast/README.md). Invariants structurels
  stricts ; agent : `mathast-expert`.

## Serveur de développement

`pnpm dev --port 5175 --strictPort` — **5175** toujours ; 5173 est celui de David. Les autres
commandes : [commandes.md](../pratiques/commandes.md).

## Décisions

- Branche `production` et mise en prod manuelle : [ADR 0021](../adr/0021-branche-production-mise-en-prod-manuelle.md).
- Autres décisions d'architecture : [docs/adr/](../adr/).

## Écarts connus

- L'en-tête de `src/routes/(protected)/+layout.server.ts` documente `/login` et conseille
  `await parent()` ; la redirection réelle va vers `/auth/login`, et `locals` suffit.
- `src/routes/slides/` est hors des groupes : sa page `test-transitions` est publique (page de
  test, sans donnée).
