---
title: Corrigés « Réponses » et « Corrigé » des fiches d'exercices
date: 2026-10-13
status: lot 1 (code) en cours
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

- [ ] lot 1 · [ ] lot 2 · [ ] lot 3
