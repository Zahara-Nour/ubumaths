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

Spec validée le 2026-10-03.

- [x] Parseur : `données Nom: …` (NAMED_SERIES_REGEX), exactement deux, plusieurs lignes par série,
      homonymes de casse refusés ; `groupRaw` partagé avec une série ; `afficher:` pour les barres
- [x] Scène : `labels` (une par catégorie), `bars[].series`, `legend`, `secondColor`,
      `indicatorTable` (scène de `.comparer`, lignes demandées) ; fréquences au dixième si effectifs
      différents ; `série:` une ligne par série
- [x] Écran : motif SVG de hachures, légende, tableau (StatChart imbriqué) ; Typst : `tiling`
      (vérifié avec le compilateur de prod), légende, tableau, valeurs en 5 pt
- [x] Tests `two-series.test.ts` (19) + navigateur (2) ; fiche FR / EN compilée et vérifiée à la main
- ⚠️ Connu, hors périmètre : en-têtes du tableau et titres d'axe en français dans un document anglais
  (comme les indicateurs de tous les blocs aujourd'hui)
- [x] Revue : nom de série vide refusé ; valeurs plus petites à l’écran avec deux séries (test navigateur) ; test `couleur: orange` ; test Typst des hauteurs proportionnelles. PDF déjà compilé avec le compilateur de prod (`tiling` OK)
- [ ] PR, CI, merge

## PR (c) — deux séries dans l'histogramme et le polygone

Spec validée le 2026-10-03 (polygones superposés, pas de mode carreaux).

- [x] Parseur : `tallyTwoSeriesInClasses` (mêmes classes ; erreur hors classes nommant la série) ;
      pas de mode carreaux : `légende:` refusé, classes d'amplitudes différentes refusées (elles
      imposent le mode carreaux) ; `afficher:` pour l'histogramme
- [x] Scène : `seriesSpec` (une série, effectifs ou fréquences au dixième) ; deux histogrammes
      (`second`, même `yMax` / graduations, hachuré) ; deux polygones (`second` en pointillés,
      `legend`) ; tableau d'indicateurs avec la classe médiane (Q109)
- [x] Écran (nom au-dessus, motif, StatChart imbriqué pour le second et le tableau) et Typst
- [x] Tests `two-series-classes.test.ts` (15) + navigateur (2) ; fiche compilée et vérifiée à la main
- [ ] Revue, PR, CI, merge
