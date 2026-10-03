# Comparer deux séries (v2, lot 5) — progression

Décisions Q111-Q118 (`outils-statistiques-v2-progress.md`), Q119 (plafond 11). Spec PR (a)
validée le 2026-10-03.

## PR (a) — `.comparer L M` dans l'atelier

- [x] `atelier/compare.ts` : `compareCommand`, `compareProblem` ; listes de longueurs quelconques ;
      qualitative refusée avec sa cause ; aucune conclusion
- [x] Scène `comparaison` (`ubumark/utils/comparison-scene.ts`) : une ligne par indicateur (ordre
      Q112, 3 groupes marqués), une colonne par série, valeurs de « Statistiques » (= / ≈)
- [x] Rendu écran (tableau accessible), Typst (pour l'exhaustivité ; pas encore utilisé)
- [x] Action « Comparer avec M » (partenaire), exécutée au clic ; catalogue « comparer »
- [x] **Q119** (David, 2026-10-03) : plafond de boutons par carte 10 → 11
- [x] Tests : `comparer.test.ts` (12), navigateur (tableau, plafond 11)
- [x] Revue : liste partenaire en erreur (201 valeurs, virgules) refusée avec son message ; brouillon de l’élève conservé au clic ; même raison pour le bouton et la commande ; `.comparer L L` refusé ; légende du tableau lue seulement (sr-only) ; test des valeurs comparé à la sortie de `formatSummary`
- [ ] PR, CI, merge

## PR (b) — barres à deux séries + tableau d'indicateurs

## PR (c) — deux histogrammes
