---
title: Corrigés « Réponses » et « Corrigé » des fiches d'exercices
date: 2026-10-13
status: lots 1 et 2 faits (PR #1268, réponses VA en base) ; reste lot 3 (ADR)
---

# Deux corrigés PDF pour les fiches — point de reprise

## Décisions de David (2026-10-13)

- Deux corrigés : **« Réponses »** (résultats seuls, sans détail, pour que l'élève voie s'il a bon et
  cherche seul) et **« Corrigé »** (la correction détaillée actuelle).
- Nom « Réponses » choisi pour ne pas confondre avec la **correction concise** de l'ADR 0017
  (correction rédigée sans ses détails).
- Contenu des réponses : un **champ « Réponses » par variation** (FR + EN), écrit par Claude pour les
  fiches qu'il génère ; facultatif. Exercice sans réponses → « Réponses non rédigées : voir le corrigé ».
- **Plus d'énoncé avant la correction, dans TOUTES les fiches** (Réponses et Corrigé).
- Corrigé : texte **Shantell Sans**, formules **Chiphre Math** (duo de `/test-font`). Réponses : police
  actuelle.
- Choix par **trois PDF** côté prof : Fiche · Réponses · Corrigé. Côté élève inclus dans la même PR
  (générateur `student-worksheet-typst.ts`, déjà sans énoncé dans ses corrections).
- Échec de compilation du Corrigé : corriger le GÉNÉRATEUR (compilation de toutes les fiches en base
  avant livraison) + filet en prod (repli police actuelle, avertissement).
- Plus tard (noté) : réunir les deux générateurs prof / élève.

## Lots

1. Code (une PR) : champ + éditeur + Zod + propagation ; PDF Réponses ; Corrigé sans énoncé en
   Shantell/Chiphre Math ; trois choix PDF prof ; côté élève ; repli ; tests d'abord.
2. Réponses des 2 fiches de variables aléatoires (FR/EN), vérifiées ; PDF montrés à David.
3. ADR « Réponses ≠ correction concise » ; puis autres fiches de 1re spé à la demande.

## État

- [x] lot 1 (PR #1268, mergée) · [x] lot 2 : réponses des 29 exercices VA en base le 2026-10-13 (`scripts/reponses-variables-aleatoires-1spe.ts`), PDF montrés à David · [ ] lot 3

### Lot 1 — ce qui est fait (2026-10-13)

- Champ `answers_md` (+ EN) : types, Zod (écriture, réponse, relecture de signalement, export),
  générateur d'instance (`{{var}}` résolues), copie, API élève (sous `correction_visible` seulement).
- Générateur prof : modes `worksheet | answers | correction`, jamais d'énoncé dans les corrigés ;
  polices du Corrigé par règles encadrées (`src/lib/typst/correction-fonts.ts`), option
  `correctionFonts: false`. Libellés EN : Corrigé = « Solutions », Réponses = « Answers ».
- Compilateur du Corrigé (`src/lib/typst/compiler/correction-fonts-compiler.ts`, partagé avec
  /test-font) + repli police standard (`toaster.warning`).
- `PdfPreview` : Fiche · Réponses · Corrigé ; élève : « avec réponses » / « avec corrigé ».
- Preuve : 32 fiches en base, Corrigé FR + EN = 64 compilations par le compilateur de prod avec
  les polices : 0 échec. Glyphes manquants (≠, ·, calligraphiques, grec en texte) : repli de
  glyphe par Typst, sans erreur (point ouvert : couverture de Chiphre Math / Shantell).
- Point ouvert : avec ces polices plus larges, une égalité alignée longue peut passer à la ligne
  dans sa cellule (d720d039, E(G) = … page 2) : taille du Corrigé à trancher.
