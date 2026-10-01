---
title: Suites numériques 1re SPE — questions et escalier du bloc courbe
date: 2026-10-01
status: lot 0 (escalier) en cours
---

# Suites 1re SPE — point de reprise

## Commande de David (2026-10-01)

Compléter les questions sur les suites (1re SPE) : améliorer l'existant, ajouter des questions,
utiliser les représentations graphiques (bloc ```courbe).

Décisions (réponses de David, 2026-10-01) :

- Périmètre : TOUS les blocs A à I (géométriques, compléments arithmétiques, reconnaître, sens
  de variation, représentation graphique, récurrences variées, sommes, seuil/algorithmes,
  modélisation).
- **Escalier ajouté au bloc courbe d'abord** (lot 0, branche + PR), puis les questions.
- Modèles publiés défectueux : **corrigés en place** (variations ajoutées EN FIN de liste
  seulement — les indices de variation des tentatives existantes ne doivent pas bouger).
- Rangement : **un domaine par notion** dans le thème « Suites » (Suites géométriques, Sens de
  variation, Sommes, Représentation graphique, Seuil et algorithmes, Modélisation, Reconnaître
  une suite) à côté d'Apprivoiser / Suites arithmétiques / Limites.
- Option `termes` de l'escalier : ma recommandation, acceptée par le « ok » de David à la spec
  (à confirmer s'il préfère autre chose).
- Ordre : lot 0 → lot 1 (existant) → lots 2 à 5.

## Lot 0 — escalier dans le bloc ```courbe (branche `feat/courbe-escalier`)

```courbe
x: -1 ; 7
y: -1 ; 7
u(0) = 0.5 ; u(n+1) = 0.5*u(n)+3 pour n de 0 à 4   bleu   escalier termes
```

Repère (uₙ ; uₙ₊₁) : courbe de f (`u(n)` → x, trait foncé), droite y = x (pointillés gris),
escalier (couleur de la suite), réutilisant `computeCobwebPath` du grapheur.

Comportements :

- E1 nominal : courbe de f + y = x + escalier (u₀;0)→(u₀;u₁)→(u₁;u₁)→… , n1 − n0 marches.
- E2 pas de nuage de points pour une suite en escalier.
- E3 `termes` : rappels pointillés verticaux vers l'axe des abscisses + étiquettes u₀, u₁…
  (une étiquette trop proche d'une précédente est omise — convergence).
- E4 escalier hors fenêtre : coupé au bord, avertissement prof.
- E5 `escalier` sur une suite explicite → erreur située.
- E6 relation dépendant de n → erreur située.
- E7 escalier + nuage dans le même bloc → erreur (repères incompatibles). `termes` sans
  `escalier`, `escalier` sur une fonction → erreur.
- E8 même scène écran (SVG) et Typst ; compilation d'une fiche.
- E9 aria-label mentionne l'escalier. `nom=` nomme la courbe de f.

- [ ] Tests rouges · [ ] parseur · [ ] scène · [ ] Typst · [ ] SVG · [ ] compilation fiche · [ ] PR

## Lot 1 — existant (corrigé en place)

- `8ed02829` / `a8b51d16` identiques (arith. › calculer un terme 3 et 4) ; `u_a = a·r` ⇒ u₀ = 0.
- Récurrence `79d69593`, `1239554b` : une seule variation.
- `7703e625` variation `(-1)^n` triviale.
- Deviner (`0af4bf32`, `fc921674`, `95c38330`) : liste à partir de u₁.
- `158ecaa4` sans description ; `requiredForm: {pattern: "u"}` à comprendre.
- Sous-domaines sans accent : vérifier les dépendances au texte avant de renommer.

## Lots 2 à 5 — modèles neufs (brouillon)

Voir la spec validée dans la conversation du 2026-10-01 ; tableau détaillé à reporter ici au
démarrage du lot 2.

## Journal

- 2026-10-01 : spec validée, worktree `../ubumaths-wt-courbe-escalier`.
