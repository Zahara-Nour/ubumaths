---
title: Fonctions trigonométriques 1re SPE — questions
date: 2026-10-02
status: lot 0 livré (#627, #628, #629) ; 16 modèles en brouillon (2026-10-02)
---

# Fonctions trigonométriques 1re SPE — point de reprise

## Commande de David (2026-10-02)

« Même chose » que suites et exponentielle, en utilisant le cercle trigonométrique (bloc ```trig).
Aucun modèle n'existait. Décisions validées (« validé » sur mes recommandations) :

1. Graduations en π dans le bloc ```courbe → PR #627.
2. Écritures d'un angle `\frac{1}{3}\pi`, `\pi/3`, `5\frac{\pi}{6}` acceptées comme `\frac{\pi}{3}` /
   `\frac{5\pi}{6}` (notations) ; `\frac{2\pi}{6}` reste « non optimal » → branche `fix/notations-angle`.
3. Points nommés sur le cercle (`points: M = 2*pi/3`) + erreurs situées pour les clés inconnues →
   branche `feat/trig-points-nommes`.
4. Angle « à 2π près » : pas maintenant ; on demande des MESURES PRINCIPALES.
5. Rangement : thème « Fonctions », domaine « Fonctions trigonométriques ».
6. Inéquations incluses (niveau propre).

## Modèles (`scripts/questions/trigo-1spe/`)

| Lot | Sous-domaines                                                                                |
| --- | -------------------------------------------------------------------------------------------- |
| A   | Cercle et radians (degrés ↔ radians, mesure principale), Cosinus et sinus d'un réel         |
| B   | Propriétés (angles associés), Fonctions cosinus et sinus (parité, lecture graphique, courbe) |
| C   | Équations, Inéquations (cercle au corrigé)                                                   |

**16 modèles créés en BROUILLON en production le 2026-10-02** (A : 6 dont A-06 « lire le réel
associé à M » avec les points nommés, B : 5, C : 5). Chacun : `question:specs` vert, 150 tirages par
variation, réponses recalculées en Python ; cercles et courbes : des milliers de tirages passés par
l'analyse (0 erreur, figure = réponse) ; PDF compilés 4/4 (lot B recompilé après #627 : graduations
en π visibles).

## Lot 0 livré

- #627 graduations en π (`grille: pi/2 ; 1` → « −π, π/2, 3π/2 ») ; #628 `\frac{1}{3}\pi`, `\pi/3`,
  `5\frac{\pi}{6}` acceptés ; #629 points nommés (`points: M = 2*pi/3`), sans projection ni ligne de
  tableau (valeur cachée), et erreurs situées du bloc ```trig affichées au prof (un bloc en erreur
  disparaissait en silence).
- #631 (défaut trouvé en route) : la virgule d'un appel de fonction (`mod(16,4)`) était lue comme une
  virgule décimale dans les conditions, `{{eval}}`, `{{if}}` → 153 tirages faux sur 1050 dans un
  premier jet de A-05, specs vertes. 0 modèle de production touché (mesuré).

## Points à relire (David)

- Formes refusées (« mauvaise forme ») : `\frac{1}{\sqrt2}` pour √2/2 (A-03) ; `\sqrt{16/25}`,
  `-\frac{\sqrt8}{3}` (A-05) ; `2(\cos x-\sin x)` factorisé (B-02) ; `150^\circ` saisi avec le
  symbole jugé faux (A-01, le ° est affiché après la case).
- C-03 contient une variation sin x = sin α, ajoutée par l'agent hors commande.
- B-04 : fenêtre verticale −6 ; 6 pour une amplitude 1-2 (courbe un peu écrasée).
- Peu de tirages distincts : A-03, A-04, A-06, B-01, B-03, B-05, C-01 à C-05 (une valeur par variation).

Retouches du 2026-10-02 (« oui » de David) : B-02 v3 tire des coefficients premiers entre eux
(`abs(m) != abs(n)`), la forme factorisée ne se présente plus ; B-04 fenêtre verticale ajustée au
tirage (±(|a|+|b|+1)) ; A-01 `150^\circ` → correctif moteur (PR `fix/suffixe-degre`).

## Limites connues (non corrigées)

- Le bloc ```trig étiquette les solutions d'une équation dans [0 ; 2π[ (−π/6 → « 11π/6 ») et ne lit
pas `cos(pi/5)` ; étiquettes 0, π, π/2 qui chevauchent les graduations ±1 dans le PDF.
- Corrigé de série : un ensemble fini s'affiche « {−π/2} ∪ {π/2} » au lieu de « {−π/2 ; π/2} ».
- `{{eval:…}}` ne calcule pas cos/sin (`eval:cos(p*pi/d)`) ni d'expression en x.
