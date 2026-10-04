# Simulation des lois de maths complémentaires (manche 14, PR b) — progression

Décisions Q160-Q163 (`outils-statistiques-v2-progress.md`). Spec validée par David le 2026-10-04.

## Périmètre (bloc ```simulation)

- `tirages`, G(p) : valeur / effectif / fréquence / probabilité pour k = 1 à 10, puis
  « 11 ou plus » (P(X ⩾ 11) = (1 − p)^10 exacte) ; `jusqu'à:` change la coupure ; somme des
  effectifs = tirages.
- `tirages`, U(a ; b) : une ligne par valeur ; plus de 30 valeurs → « au plus 30 valeurs à tirer ».
- `tirages`, U([a ; b]) et E(λ) : histogramme des tirages EN DENSITÉ (fréquence / amplitude),
  10 classes égales (U : [a ; b] ; E : [0 ; joli arrondi de ln(100)/λ], dernière classe = tout
  ce qui dépasse, dit sous la figure) ; courbe de densité superposée (couleur du bloc ```loi) ;
résumé « 1 000 tirages ; moyenne observée ≈ … (E(X) = 2) » puis la graine ; `classes: N`
  (2 ⩽ N ⩽ 50, un NOMBRE ; une liste de bornes → « un nombre de classes »).
- `moyenne` et `échantillons` : inchangés pour les quatre lois (E, σ ; μ ± 2σ/√n) ; plafonds
  actuels (10 000 tirages, N × n ⩽ 100 000).
- Tirages : générateur à graine existant (uniforme u ∈ [0 ; 1[), inversion : G ⌈ln(u)/ln(1 − p)⌉
  (u = 0 à exclure / gérer), E −ln(u)/λ, U([a ; b]) a + (b − a)u, U(a ; b) a + ⌊(b − a + 1)u⌋.
- Même graine → mêmes nombres écran / PDF ; anglais (« 11 or more », « Density ») ;
  `seuil:` / `intervalle:` refusés dans une simulation, comme aujourd'hui.

## Étapes

- [ ] Tests rouges · [ ] Implémentation · [ ] Fiche compilée et regardée · [ ] Revue ·
      [ ] PR, CI, merge
