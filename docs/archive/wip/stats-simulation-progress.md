# v2 lot 1, PR (a) — moteur de simulation

Branche `feat/stats-simulation-moteur`. Décisions Q72-Q76 (`outils-statistiques-v2-progress.md`).

- `src/lib/statistics/simulation.ts` : `simulateCounts` (n ≤ 100 000), `simulateRunningMean`
  (n ≤ 10 000), `simulateSamples` (N, n ≤ 1 000) ; loi validée par `randomVariable` ; hasard par
  `RandomSource` (`utils/random.ts`, graine).
- Revue : moyenne pile sur la marge 2σ/√n comptée dehors par arrondi → tolérance ; tests de loi
  asymétrique et de probabilité nulle en tête / en queue (une inversion valeur → indice passait).
- Suite : PR (b) `.simuler` + liste d'effectifs dans l'atelier ; PR (c) `.fréquence`, `.échantillons`.
