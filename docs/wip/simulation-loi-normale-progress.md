# K5 / D7 — simulation de la loi normale (progression)

Décision de David (2026-10-11) : simuler N(μ ; σ²) comme les autres lois, dans le bloc

```simulation. Choix validés : tirage **par inversion** Y = μ + σ·Φ⁻¹(u) ; histogramme sur
**μ ± 3σ**, les deux classes du bord prenant ce qui dépasse.

Branche `feat/simulation-loi-normale`, worktree `../ubumaths-wt-sim-normale`.

- [x] Tests rouges : `statistics/__tests__/simulation-normale.test.ts` (Φ⁻¹, échantillonneur),
      `ubumark/__tests__/stat-chart/simulation-laws.test.ts` (bloc, histogramme, modes, Typst),
      `atelier/__tests__/loi-normale.test.ts` (refus inversé).
- [ ] `normalQuantile` (Acklam + un pas de Halley), `normalSampler`.
- [ ] Parseur (refus retiré), type `SimulatedNamedLaw`, scène (classes ±∞, mention des deux bords).
- [ ] Doc `statistiques.md`, `ubumark.md` ; D7 / K5 retirés de `ecarts-a-trier.md`.
- [ ] check, revue, PR.
```
