# v2 lot 2, PR (a) — listes qualitatives dans l'atelier

Branche `feat/atelier-listes-qualitatives`. Décisions Q84-Q88, Q91 (`outils-statistiques-v2-progress.md`).

- Une liste est qualitative dès qu'une entrée contient une LETTRE (`ListObject.categories`) ; `1/0`
  reste ignoré (Q45). Modalités sans la casse ni les espaces, accents comptés, écrites comme leur
  1re occurrence. ≤ 20 modalités, ≤ 40 caractères ; `fille, garçon` → points-virgules.
- Une liste ne cite aucun objet (`#cited`) et n'est jamais réécrite au renommage (Q87).
- Actions : Effectifs, Diagramme en barres, Diagramme circulaire ; Statistiques désactivée ; groupe
  partenaire masqué (revient avec `.croiser`). Liste de nombres avec partenaire qualitative :
  actions désactivées avec la raison. État du diagramme `{ partner, kind? }`.
- Revue : « Diagramme circulaire » menait à la vue Calcul (bloquant, test au clic) ; `.simuler` et
  les actions atteintes par commande avec une liste qualitative → la raison du bouton ; liste
  au-delà de 4 000 caractères refusée à la saisie (sinon perdue au rechargement,
  `MAX_DEFINITION_LENGTH` partagé) ; modalité `titre: Z` lue comme une option → jetons neutres ;
  « circulaire » collé à une liste redevenue numérique ; liste refusée gardant le catalogue numérique.
- Ouvert pour David (M1) : `1e3`, `π`, `2x`, `3 m` rendent désormais la liste qualitative
  (en v1 : `1e3` → 1000, les autres ignorés).
