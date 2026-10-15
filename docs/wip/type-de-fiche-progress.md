# Chantier — le type de fiche décide de la forme du PDF (ADR 0030)

Worktree : `../ubumaths-wt-type-fiche`, branche `feat/type-de-fiche`. Décision :
[ADR 0030](../adr/0030-type-de-fiche-decide-la-forme.md).

## Décisions de David (2026-10-15)

- Quatre types : Fiche d'exercices, Évaluation écrite, Devoir maison, Examen blanc ; Quiz retiré
  (aucune fiche de ce type en base, 32 fiches toutes `worksheet`).
- Devoir maison : pas de points, une date de rendu.
- Évaluation écrite : points en option ; calculatrice autorisée / interdite ; réponses sur le sujet
  en option.
- Examen blanc : points toujours (comme au bac) ; durée ; calculatrice ; réponses sur le sujet en
  option.
- Cadres : après chaque question ou après l'exercice ; hauteur estimée d'après le corrigé, réglable
  par question dans la fiche.
- Options d'affichage supprimées ; corrigé PDF toujours détaillé.

## État

- [ ] Phase 0 : cartographie + spécification TDD + question d'accès (cadres) → validation de David
- [ ] Lots à définir après la phase 0
