# Chantier `garde-donnees`

## Reprendre ici

_Mis à jour le 2026-11-12, après #2569._

- **État** : clos, #2569 mergée · **Prochaine action** : aucune · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : supprimés

## Historique

- 2026-11-11 : garde `scripts/garde-donnees-sensibles.ts` (lignes ajoutées seulement) au pre-commit et en CI ; règle « données fictives seulement » dans CLAUDE.md. Rejouée sur 2 000 commits de `main` : une seule alerte (ancien domaine du projet, admis pour les adresses de service).
- Existant NON traité (la garde ne relit pas le passé) : environ 70 adresses d'un domaine d'établissement réel dans des fixtures de tests, des migrations archivées et des docs archivées (ajoutées avant décembre 2025). Réelles ou inventées : à vérifier par David avant de décider (remplacement dans l'arbre ; la réécriture de l'historique est une autre affaire).
- 2026-11-12 : #2569 mergée (CI relancée par fermeture/réouverture : job « CI Summary » resté sans runner). David confirme que les ~70 adresses existantes sont des données de démo : rien à changer.
