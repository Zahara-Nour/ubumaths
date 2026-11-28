# Chantier `lien-messages-menu` : le lien « Messages » dans le menu (écart V104)

## Reprendre ici

_Mis à jour le 2026-11-27, après #3219. **Chantier clos.**_

- **État** : #3219 mergée le 2026-11-27 : lien « Messages » au menu de l'élève (sous « Carnet de liaison ») et du prof (sous « Modération »), pas de l'admin, avec pastille des messages non lus. V104 barré au registre. Pas encore en prod (aucun `deploy:prod` demandé).
- **Prochaine action** : aucune. · **En attente de David** : rien.
- **Pièges en cours** : `/messages` a sa propre mise en page, hors du tableau de bord : le lien n'y est jamais « allumé ». Le compteur est lu à l'entrée dans le tableau de bord, puis à chaque message ouvert ; pas de mise à jour en direct.
- **Worktree / branche** : retirés par `pnpm pr:merger`.
