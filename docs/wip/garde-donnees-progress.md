# Chantier `garde-donnees`

## Reprendre ici

_Mis à jour le 2026-11-11, à l'ouverture de la PR._

- **État** : PR ouverte · **Prochaine action** : merge, archiver ce journal · **En attente de David** : décider du sort des adresses de domaines réels déjà présentes dans le dépôt (voir ci-dessous) · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-garde-donnees` / `chore/garde-donnees-sensibles`

## Historique

- 2026-11-11 : garde `scripts/garde-donnees-sensibles.ts` (lignes ajoutées seulement) au pre-commit et en CI ; règle « données fictives seulement » dans CLAUDE.md. Rejouée sur 2 000 commits de `main` : une seule alerte (ancien domaine du projet, admis pour les adresses de service).
- Existant NON traité (la garde ne relit pas le passé) : environ 70 adresses d'un domaine d'établissement réel dans des fixtures de tests, des migrations archivées et des docs archivées (ajoutées avant décembre 2025). Réelles ou inventées : à vérifier par David avant de décider (remplacement dans l'arbre ; la réécriture de l'historique est une autre affaire).
