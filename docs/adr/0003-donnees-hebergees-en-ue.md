# 0003 — Données hébergées en UE (eu-west-3)

- **Statut** : acceptée (exécutée le 2026-06-15)
- **Date** : 2026-06-13 · **Décidée par** : David

## Contexte

La base Supabase était en us-east-2. Elle contient des données d'élèves mineurs (RGPD, contexte
post-Schrems II), et les élèves sont en France.

## Décision

Base Supabase en **eu-west-3 (Paris)**, projet `cnevnzsvixxpnurautls` ; fonctions Vercel en **`cdg1`**
(`svelte.config.js`, `regions: ['cdg1']`).

## Écarté

- Rester aux US : incompatible avec le RGPD pour des mineurs.

## Conséquences

- Tout nouveau service qui touche des données d'élèves doit être hébergé en UE.
- Après tout clone / restore Supabase, `pnpm exec supabase migration list` doit montrer la colonne Remote
  remplie, sinon `migration repair` **avant** tout push.
