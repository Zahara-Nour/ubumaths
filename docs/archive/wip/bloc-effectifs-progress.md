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
- [x] Revue : valeurs dans le désordre avec un cumul REFUSÉES (cumul faux sinon, preuve rouge) ; total nul refusé ; vrai signe moins lu comme l’atelier ; fréquences décimales toujours à deux décimales (0,50) ; case Total vide annoncée « sans objet » ; vertical aussi si les libellés dépassent 60 caractères ; messages `classes:` et « valeurs »
- [ ] PR, CI, merge

## PR (b) — `masquer:`, `indicateurs:`

Spec validée le 2026-10-03.

- [x] `masquer:` lignes entières ou cases (`valeur/ligne`, `Total/ligne`, classe avec son « ; ») ;
      résolu dans `resolveTableMasks` ; le Total d'un cumul reste « sans objet »
- [x] Case masquée : vide, annoncée « case à compléter » ; Typst : boîte de 0,8 cm (1,2 cm
      faisait déborder six cases sur une demi-page, vu sur la fiche)
- [x] `indicateurs:` : ligne sous le tableau (barres ou classes, exacts avec `données:`)
- [x] Tests `frequency-table-masks.test.ts` (13) + navigateur ; fiche énoncé / corrigé compilée
- [x] Revue : `masquer:` vide refusé ; classe sans « / » → « écrire valeur/ligne » ; valeurs à la casse près ; « Total » réservé avec la colonne des totaux ; tests verticale, écritures, nombre de cases dans le PDF
- [ ] PR, CI, merge
