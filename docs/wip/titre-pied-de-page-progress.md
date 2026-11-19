# Titre de la fiche au pied de page — journal

## Reprendre ici

_Mis à jour le 2026-11-19, avant la PR._

- **État** : PR ouverte · **Prochaine action** : CI verte → merge · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-titre-pied-de-page` / `feat/titre-pied-de-page`

## Historique

- 2026-11-19 — Demande de David : le nom de la fiche en bas de page du PDF, pour s'y retrouver
  dans plusieurs pages. Pied de page des styles « Fiche élève » et « 2 colonnes - paysage »
  (`studentStyleCommon`, `default-templates.ts`) : titre à gauche, « n / N » à droite. Les autres
  styles intégrés (Standard, Examen…) ont leur propre pied, non touchés. Test au compilateur de
  prod : `titre-pied-de-page.test.ts` (rouge avant, vert après).
