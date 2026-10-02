# Bloc ```simulation, modes `moyenne`et`échantillons` (v2, lot 3 PR b) — progression

Spec validée par David le 2026-10-02.

- [x] `mode: moyenne` : scène `moyenne-selon-n` (comme `.fréquence`), `tirages:` ≤ 10 000
- [x] `mode: échantillons` : `échantillons:` (N) et `taille:` (n), chacun ≤ 1 000, N × n ≤ 100 000 ;
      histogramme des moyennes (comme `.échantillons`), classes hors μ ± 2σ/√n grises AUSSI dans le Typst
- [x] Options dépendant du mode vérifiées une fois tout lu (le mode peut venir après) ; `taille:`
      garde son sens de taille de figure pour les autres blocs
- [x] Sous la figure : résumé (+ phrase « k échantillons sur N… ») et graine ; textes anglais
- [x] Vu sur la fiche compilée : bornes de classes au millième (« 2,53390821692 » illisible, aussi
      dans l'atelier), milliers « 1,000 » et axe « Count » en anglais
- [x] Cas frère de #671 : `.simuler` arrondissait aussi 3/80 en 0,037 (atelier) — corrigé, preuve rouge
- [x] Revue : arrondi `Math.round` aussi pour les moyennes et les bornes ; bornes distinctes si amplitude minuscule ; `taille: grande` expliqué ; message `taille` des autres blocs sans « simulations »
- [ ] PR, CI, merge
