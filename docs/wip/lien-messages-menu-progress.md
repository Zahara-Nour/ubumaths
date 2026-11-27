# Chantier `lien-messages-menu` : le lien « Messages » dans le menu (écart V104)

## Reprendre ici

_Mis à jour le 2026-11-27, à l'ouverture de la PR._

- **État** : lot de `ecarts-a-trier`. David a validé le 2026-11-27 l'emplacement du lien « Messages » (élève : sous « Carnet de liaison » ; prof : sous « Modération » ; pas l'admin) et demandé la pastille des messages non lus. Les deux sont faits : `src/lib/config/dashboard-nav.ts` (`messagesLink`, champ `badgeLabel`), layout du tableau de bord, tiroir mobile. Revue `code-reviewer` : rien de bloquant, remarques appliquées. Pastille vue à l'écran sur le compte prof local (1 non lu).
- **Prochaine action** : PR mergée → barrer V104 à la main au registre, mettre à jour `ecarts-a-trier-progress.md`, archiver ce journal.
- **En attente de David** : rien.
- **Pièges en cours** : `/messages` a sa propre mise en page, hors du tableau de bord : le lien n'y est jamais « allumé ». Le compteur est lu une fois à l'entrée dans le tableau de bord, puis à chaque lecture d'un message ; pas de mise à jour en direct.
- **Worktree / branche** : `../ubumaths-wt-lien-messages-menu`, `feat/lien-messages-menu`.
