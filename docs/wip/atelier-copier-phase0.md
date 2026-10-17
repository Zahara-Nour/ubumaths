---
title: Atelier — le bouton « Copier » d'une ligne de Calcul (phase 0)
date: 2026-10-15
status: livré (#1417, 2026-10-15), en attente du deploy:prod
---

# Atelier — le bouton « Copier »

Inventaire de `/calc` du 2026-10-13 : il manque à l'atelier un bouton « Copier » ; décision de
David du même jour : oui. `/calc` copie la sortie brute du moteur (`result.output`).

## Mesures (2026-10-15, moteur de `main`)

- **Le texte d'une ligne (`Entry.text`) n'est pas copiable** : c'est souvent la sortie de terminal du
  moteur — `.résoudre` donne toute sa trace (« Equation quadratique: … → On calcule le
  discriminant… »), `.dériver` `d/dx(x^2*sin(x)) = …`, `.réciproque` `{x-3}/2`, `√8` `2sqrt(2)`.
- **Le LaTeX d'une ligne est propre partout** : c'est lui qu'on convertit.
- **La conversion de MathLive (`convertLatexToAsciiMath`) ne convient pas** : `(1)/(2)`, `k m`,
  `m i n`, `S=\{2 ; 3\}`, `RR->RR`.

## Décisions de David (2026-10-15)

1. **Copier = un texte lisible**, qui se colle partout (message, document) ; une petite flèche
   propose **« Copier en LaTeX »**.
2. **La réponse seule** : ce qui est affiché à droite — la valeur approchée si le bouton ≈ a basculé.

## Détails fixés par défaut (à revoir si besoin)

- Le bouton est sur chaque ligne qui a une réponse, à côté de « Garder… » : pas sur un refus, ni sur
  une définition (« « f » est dans tes objets. »).
- **Le texte lisible** : `2√2`, `2x² + 5x − 3`, `(x − 3)/2`, `f⁻¹(x)`, `S = ]−∞ ; −2[ ∪ ]2 ; +∞[`,
  `12,3 km`, `e²ˣ`, `lim x→+∞ (1 + 1/x)ˣ = e`. Exposant en chiffres ou lettres simples → en exposant
  (², ⁻¹, ˣ), sinon `^(…)` ; fraction `a/b`, entre parenthèses dès qu'un membre n'est pas simple.
- Une formule que la conversion ne sait pas écrire (tableau, environnement) : le LaTeX est copié,
  et le message le dit.
- Une ligne sans formule (`.stats`) : son texte, tel qu'affiché ; pas de « Copier en LaTeX ».
- Retour : « Copié. » (ou « Copié en LaTeX. »), annoncé ; refus du navigateur : « Ton navigateur a
  refusé la copie. »
- Une valeur approchée copiée garde son « ≈ » ; un « = » de tête tombe (`= 0,5` → `0,5`).

## Journal

- 2026-10-15 — mesures, décisions 1 et 2 de David.
- 2026-10-15 — **#1417 mergée**. Revue : dénominateur produit sans parenthèses (`1/2√x`) et racines
  ambiguës (`√2x`, `√x²`) corrigés, cas réels ajoutés aux tests.
