# Bloc ```effectifs (tableau de dépouillement) — progression

Décisions Q125-Q133 (`outils-statistiques-v2-progress.md`). Spec PR (a) validée le 2026-10-03.

## PR (a) — le bloc

- [x] `effectifs` dans `STAT_CHART_KINDS` ; données comme les autres blocs (lignes, `données:`,
      classes écrites ou `classes:` + `données:`) ; classes détectées sur les données
- [x] `lignes:` (effectifs, fréquences, cumulés), `fréquences: décimales`, `sens:`, `totaux:` ;
      erreurs : cumuls avec des mots, pourcentages, ligne inconnue / en double, options orphelines
- [x] Scène `FrequencyTableScene` (horizontal, vertical au-delà de 12 valeurs), écran, Typst,
      textes FR / EN (Q133) ; filet anglais étendu au nouveau bloc
- [x] Fiche compilée : colonnes à la largeur du contenu, sans césure (« Ef-fec-tif » sinon)
- [ ] Revue, PR, CI, merge

## PR (b) — `masquer:`, `indicateurs:`
