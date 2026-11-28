---
title: Outil 47 — triangle quelconque à reproduire sur quadrillage
date: 2026-11-28
status: phase 0 envoyée à David, en attente
---

# Chantier `outil-triangle-quadrillage`

## Reprendre ici

_Mis à jour le 2026-11-28, avant la première PR._

- **État** : phase 0 de l'outil 47 envoyée à David (§ 1), rien de codé.
- **Prochaine action** : lire sa réponse, l'écrire au § 1, puis tests rouges dans
  `src/lib/questions/construction/triangle.ts` (et le parseur `construction-parser.ts`).
- **En attente de David** : les trois questions du § 1.
- **Pièges en cours** : même module que le lot `equerre-uni` → `git merge origin/main` avant la PR.
- **Worktree / branche** : `../ubumaths-wt-outil-triangle-quadrillage`, `feat/outil-triangle-quadrillage`.

## Lot

Un seul outil : n° 47 d'[outils-manquants.md](outils-manquants.md) (CE1-072 ; CP, CE2 sur quadrillage).
Origine : [`questions-ce1`](../archive/wip/questions-ce1-progress.md) § 20.

## 1. Phase 0 (2026-11-28)

Aujourd'hui : `verifier: triangle ABC : …` sur quadrillage est une erreur d'auteur, sauf le triangle
rectangle (`triangle.ts`, « seul le triangle rectangle se construit sur quadrillage », modèle
`e50d512d`).

Proposition : un modèle DEF est tracé sur le quadrillage ; l'élève reproduit ABC en comptant les
carreaux, au seul outil Segment. Syntaxe `verifier: triangle ABC : reproduit DEF`.

- Forme 1 : [AB] tracé (même côté que [DE], décalé) ; l'élève place C et trace [AC] et [BC].
- Forme 2 : seul A est placé ; l'élève trace les trois côtés.

Questions posées : (1) seulement le même triangle décalé, ou aussi retourné / tourné ? (2) les
deux formes ? (3) la syntaxe.
