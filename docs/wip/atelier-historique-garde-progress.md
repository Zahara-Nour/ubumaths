# Lignes de Calcul gardées au rechargement — progression

Décision de David du 2026-10-13 (« option 1 », [atelier-saisie-naturelle.md](atelier-saisie-naturelle.md)) :
les lignes de la vue Calcul reviennent au rechargement, comme les cartes. Branche
`feat/atelier-historique-garde`, worktree `../ubumaths-wt-historique-garde`.

## Comportements visés (brief du 2026-10-14)

- Nominal : au rechargement, les 100 dernières lignes reviennent telles qu'affichées (saisie, réponse,
  échec, note, bouton ≈) ; le rappel ↑ / ↓ des saisies TAPÉES revient aussi.
- Limite : au-delà de 100 lignes ou du plafond de taille, on garde les plus récentes ; un champ trop
  long est raccourci (texte) ou oublié (formule), jamais un échec de l'atelier.
- Erreur : stockage refusé, illisible, plein, ou d'une version plus récente → Calcul repart vide (la
  version plus récente n'est pas écrasée) ; jamais d'exception.
- Rien n'est refait : une ligne restaurée ne recalcule rien, une définition ne recrée aucune carte.
- « Repartir de zéro » vide aussi ce qui est rangé ; le lien `?a=` n'emporte pas l'historique ; le mode
  éphémère ne lit ni n'écrit rien.
- Sécurité : ce qui revient du `localStorage` est non fiable ; une formule n'atteint MathLive que si
  chacune de ses commandes est sur une liste blanche.

## Journal

- 2026-10-14 — mesures : MathLive 0.111.1 rend `\htmlStyle{…}{x}` en `<span style="…">`, `\class`,
  `\cssId`, `\htmlData` en attributs ; le texte est échappé. Relecture par `parseLatex` puis `toLatex`
  (option b du brief) : 15 réponses sur 43 d'un corpus ordinaire refusées, 2 réécrites (valeurs
  approchées, ensembles, intervalles, unités) → liste blanche de commandes retenue.
- 2026-10-14 — livré sur la branche : `history-storage.ts`, `safe-latex.ts`, `keepCalcHistory`,
  `CalcDesk.restoreHistory` ; « Repartir de zéro » actif dès qu'il y a une ligne de Calcul. Tests
  rouges vérifiés (module absent, puis liste blanche neutralisée : 30 échecs en node, une classe
  forgée `evil` dans le DOM). Pas d'étapes ni de « Garder » sur une ligne restaurée.
- 2026-10-14 — `security-auditor` : 1 bloquant (un ZWJ ou un indicateur régional devant `\\htmlStyle`
  faisait avaler un `\` à MathLive, `splitGraphemes`) → formules relues limitées à l'ASCII et au
  Latin-1 ; 1 mineur (imbrication démesurée) → 40 niveaux d'accolades au plus. `code-reviewer` :
  0 bloquant ; garde de doc (`statistiques.md`), en-tête de `FormulaText`, témoin de la sonde, deux
  onglets documentés, plafond des saisies sur `MAX_DEFINITION_LENGTH`, ordre des déclarations.
