---
title: Fonctions trigonométriques 1re SPE — questions
date: 2026-10-02
status: lot 0 en cours (3 PR) ; modèles en cours (3 agents)
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

À faire après le merge des points nommés : modèle « lire le réel associé à un point M ».
