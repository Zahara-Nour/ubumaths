---
title: Outil 47 — triangle quelconque à reproduire sur quadrillage
date: 2026-11-28
status: phase 0 validée le 2026-11-28, code en cours
---

# Chantier `outil-triangle-quadrillage`

## Reprendre ici

_Mis à jour le 2026-11-28, avant la première PR._

- **État** : phase 0 validée (§ 1) ; tests puis code en cours.
- **Prochaine action** : `triangle-copy.ts` (juge, correction), branché sur `triangle.ts` et
  `construction-parser.ts` ; tests `construction-triangle-copy.test.ts`.
- **En attente de David** : rien.
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

Décisions (David, « oui » à mes recommandations, 2026-11-28) :

1. **Même triangle déplacé seulement** (ni retourné, ni tourné). Un triangle pareil au modèle mais
   retourné ou tourné a son message : « Ton triangle est retourné par rapport au modèle. »
2. **Les deux formes, dans la même PR.** B dans la figure → forme 1 ([AB] tracé, [AB] = [DE]
   déplacé, sinon erreur d'auteur) ; B absent → forme 2 (l'élève trace les trois côtés depuis A).
3. **Syntaxe `reproduit DEF`** : A ↔ D, B ↔ E, C ↔ F ; quadrillage obligatoire, palette Segment seule.

On juge le résultat : côtés dans n'importe quel ordre, dans un sens ou l'autre, en plusieurs morceaux
(fusion des traits de `polygon.ts`) ; un trait de trop est refusé.
