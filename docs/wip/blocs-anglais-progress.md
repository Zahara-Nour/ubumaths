# Blocs statistiques dans une fiche en anglais (Q121-Q124) — progression

Décidé le 2026-10-03 : les blocs d'une fiche en anglais (`contentLocale`) produisent leurs
textes en anglais ; textes d'auteur et messages d'erreur inchangés ; atelier inchangé.

- [x] `ubumark/utils/stat-chart-text.ts` : dictionnaire FR / EN (genres, axes, indicateurs,
      carreaux, polygone, lectures, comparaison, « Figure indisponible »)
- [x] Vocabulaire scolaire anglais (Q122) : _frequency_ = effectif, _relative frequency_ =
      fréquence ; « Count » → « Frequency », « Observed frequency » → « Observed relative frequency »
- [x] Tableau de comparaison : lignes par identifiant (`IndicatorRowId`), nom selon la langue
- [x] Filet (Q124) : `english-texts.test.ts`, 15 genres de blocs, scène + Typst sans mot français
- [x] Fiche anglaise compilée (`compile-prod.mjs`) et regardée
- [x] Revue : filet `FRENCH` réparé (drapeau `u` : `\b` ignorait les lettres accentuées) + test du filet ; « Cumulative relative frequency polygon », titre « Increasing … » ; « Two-way table » d’une seule source ; typographie anglaise (« : », « % » sans espace), français inchangé
- [ ] PR, CI, merge
