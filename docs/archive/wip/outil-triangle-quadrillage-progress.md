---
title: Outil 47 — triangle quelconque à reproduire sur quadrillage
date: 2026-11-28
status: clos le 2026-11-28 (#3289)
---

# Chantier `outil-triangle-quadrillage`

## Reprendre ici

_Mis à jour le 2026-11-28, après #3289._

- **État** : lot clos. Outil 47 livré par #3289 (mergée), passé au § 4 « Livré » d'`outils-manquants.md` ;
  journal archivé.
- **Prochaine action** : aucune. Les modèles qui s'en servent (CE1-072 triangle quelconque) restent aux
  sessions « questions ».
- **En attente de David** : rien.
- **Worktree / branche** : retirés par `pnpm pr:merger`.

## Lot

Un seul outil : n° 47 d'[outils-manquants.md](../../wip/outils-manquants.md) (CE1-072 ; CP, CE2 sur quadrillage).
Origine : [`questions-ce1`](questions-ce1-progress.md) § 20.

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

## 2. Revue de code (2026-11-28)

Revue `code-reviewer` (Opus) : aucune réponse jugée à l'envers sur 24 cas. Corrigés : modèle non
tracé et A posé sur D refusés à l'auteur ; un trait seul dans le prolongement de [AB] → « Trace les
côtés [AC] et [BC] du triangle. ».

Question ouverte (point 1) : l'élève trace le modèle déplacé tel quel, mais A est au coin qui
correspond à E (ou à F) ; le juge répond « retourné », ce qui est faux. Proposé à David : un message
à part, « Ton triangle est bien pareil au modèle, mais il ne part pas du bon coin : A doit être à la
place de D. »

Réponse de David (2026-11-28) : message « Ton triangle est bien pareil au modèle, mais il ne part pas
du bon coin : A doit être à la place de D. » **validé** (`wrongCornerFeedback`, avant « retourné »).
