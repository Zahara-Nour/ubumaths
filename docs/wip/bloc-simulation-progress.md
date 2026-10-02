# Bloc ```simulation, mode `tirages` (v2, lot 3 PR a) — progression

Spec validée par David le 2026-10-02 (cf. `outils-statistiques-v2-progress.md`).

- [x] Type `simulation` dans `STAT_CHART_KINDS`, `SimulationData`, plafonds (10 000 tirages, graine ≤ 999 999 999)
- [x] Parseur : lignes de la loi partagées avec ```loi, options `mode`/`tirages`/`graine`, `?` refusé, modes moyenne / échantillons « arrive bientôt »
- [x] Scène `SimulationScene` (effectifs par `simulateCounts` + graine), Typst, rendu écran (tableau accessible)
- [x] Tests : `simulation-block.test.ts` (serveur), `StatChart.svelte.test.ts` (navigateur)
- [x] Fiche compilée avec `compile-prod.mjs` (FR + EN) : mêmes nombres qu'à l'écran
- [ ] check:incremental, lint, revue, PR
