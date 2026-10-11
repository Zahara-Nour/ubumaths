# Chiphre (ex-UbuMaths)

[![CI](https://github.com/Zahara-Nour/ubumaths/actions/workflows/quality.yml/badge.svg)](https://github.com/Zahara-Nour/ubumaths/actions/workflows/quality.yml)
[![CodeQL](https://github.com/Zahara-Nour/ubumaths/actions/workflows/codeql.yml/badge.svg)](https://github.com/Zahara-Nour/ubumaths/actions/workflows/codeql.yml)
[![Release](https://img.shields.io/github/v/release/Zahara-Nour/ubumaths?sort=semver)](https://github.com/Zahara-Nour/ubumaths/releases)
[![Node](https://img.shields.io/badge/node-22.x-339933?logo=node.js&logoColor=white)](.nvmrc)

Application de mathématiques pour élèves francophones, écrite par leur professeur — [chiph.re](https://chiph.re). Le dépôt garde son nom historique, « ubumaths ».

**Modèle mono-professeur** : un professeur et un admin ; l'école est la frontière sociale, la classe un sous-groupe d'organisation ([ADR 0002](docs/adr/0002-mono-professeur-ecole-frontiere-sociale.md)). Les données sont celles d'**élèves mineurs**, hébergées en Europe (RGPD : [docs/systeme/conformite/](docs/systeme/conformite/)).

## Stack

Svelte 5 (runes) · SvelteKit · TypeScript strict · Tailwind 4 · shadcn-svelte · MathLive · Supabase (Postgres, Auth, RLS — région eu-west-3) · Vercel · pnpm 12 · Node 22 · Vitest · Playwright.

## Démarrer

```bash
pnpm install
cp .env.example .env          # puis renseigner les clés Supabase
pnpm db:start                 # Supabase local (Docker)
pnpm db:reset && pnpm db:seed-riche   # base locale remplie : contenu + 30 élèves fictifs
pnpm dev --port 5175 --strictPort
```

Toutes les commandes : [docs/pratiques/commandes.md](docs/pratiques/commandes.md).

## Où est quoi

| Je cherche…                       | Aller à                                            |
| --------------------------------- | -------------------------------------------------- |
| Le vocabulaire du domaine         | [CONTEXT.md](CONTEXT.md)                           |
| Ce que fait chaque partie du code | [docs/README.md](docs/README.md) → `docs/systeme/` |
| Comment travailler (git, tests…)  | [docs/pratiques/](docs/pratiques/)                 |
| Les décisions d'architecture      | [docs/adr/](docs/adr/)                             |
| Les règles pour Claude Code       | [CLAUDE.md](CLAUDE.md)                             |

## Livraison

`main` est la branche de travail (branche → PR → CI verte → merge). La production suit la branche `production`, avancée à la main par `pnpm deploy:prod` ([ADR 0021](docs/adr/0021-branche-production-mise-en-prod-manuelle.md)).
