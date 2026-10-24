# Relevé des modèles du lycée (passe lycée, étape c)

Fait le 2026-10-23. Lecture seule : rien n'est écrit en base.

## Lot

Les **432 modèles** de niveau lycée en prod (`grades` ∩ {`2`, `1_SPE`, `T_SPE`, `T_COMP`, `T_EXP`}) : 420 tagués sur
des points du lycée (367 sur un point, 53 sur deux) et les 12 sans point. Aucun modèle tagué au lycée n'a un autre
niveau. 67 publiés, 365 brouillons.

| Niveau           | Brouillons | Publiés |
| ---------------- | ---------: | ------: |
| 2de              |          6 |      31 |
| 1re spé          |        168 |      34 |
| Tle spé          |         70 |       1 |
| Tle spé + compl. |         54 |       1 |
| Tle compl.       |         10 |       0 |
| Tle expertes     |         57 |       0 |

Aucun modèle n'est de niveau 1re ES ou voie techno.

## Fichiers

- `lot.csv` : une ligne par (modèle, tag actuel) ; `SANS_POINT` pour les 12.
- `templates.json` : instantané complet de `question_templates` pour le lot, pris par le MCP Supabase (lecture seule),
  en quatre paquets de 110 triés par `id`. La clé anonyme ne voit pas les brouillons.
- `releve.ts` : copie de `../../arbre-notions/releves/releve.ts`, lot et sortie changés, sans rafraîchissement.
  `pnpm exec tsx docs/wip/passe-lycee/releves/releve.ts` (≈ 2 min).
- `<template_id>.json` : par variation, 300 tirages (graines 1..300, modèle réduit à la variation) : variables,
  réponses, nombres de l'énoncé et des réponses, fractions, format, exemples.
- `index.csv` : une ligne par modèle (variations, échecs, tags actuels, statut).

## Constats

- 1 638 variations, 491 400 tirages. Réponses : 1 250 variations en saisie, 379 en QCM.
- **Un seul modèle échoue** : `9a6087c5` « Systèmes linéaires et calcul matriciel » (Tle expertes, brouillon),
  6 tirages sur 300 dans chacune de ses deux variations (conditions `mod(1+a2*a3,a1) == 0`… non tenues après 100
  essais). À corriger dans le modèle, quel que soit son verdict.
- Aucune erreur de conversion.

## Suite

Étape d : verdicts en inclusion stricte contre `../bornes/<programme>.json`, sur la consigne du collège
(`../../arbre-notions/analyse/CONSIGNE.md`).
