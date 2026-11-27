# Chantier `lien-messages-menu` : le lien « Messages » dans le menu (écart V104)

## Reprendre ici

_Mis à jour le 2026-11-27, avant l'ouverture de la PR._

- **État** : lot de `ecarts-a-trier`. Essai de la messagerie par David bon le 2026-11-27 (« c'est bon pour les messages »). Lien « Messages » (`/messages`, icône enveloppe) ajouté au menu de l'élève et du prof dans `src/lib/config/dashboard-nav.ts`, juste avant les amis et le chat ; pas pour l'admin. Test dans `src/lib/config/__tests__/dashboard-nav.test.ts`. Commité sur la branche, PAS poussé.
- **Prochaine action** : attendre que David valide l'emplacement sur les captures (envoyées le 2026-11-27), puis PR, merge, V104 barré à la main, journal archivé.
- **En attente de David** : l'emplacement du lien. Question annexe posée : faut-il une pastille du nombre de messages non lus sur ce lien (pas faite).
- **Pièges en cours** : `/messages` a sa propre mise en page, hors du tableau de bord : le lien n'y est jamais « allumé ».
- **Worktree / branche** : `../ubumaths-wt-lien-messages-menu`, `feat/lien-messages-menu`.
