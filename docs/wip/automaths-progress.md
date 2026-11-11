# Chantier `automaths` — filtre par niveau du catalogue

## Reprendre ici

_Mis à jour le 2026-11-11, à l'ouverture de la PR._

- **État** : filtre par niveau sur `/automaths` codé et testé, PR ouverte · **Prochaine action** : CI verte → merge · **En attente de David** : rien · **Pièges en cours** : la base locale n'a que 5 modèles « Non classés », le rendu réel se voit mieux en prod · **Worktree / branche** : `../ubumaths-wt-automaths` / `feat/automaths-filtre-niveau`

## Décisions (phase 0, David, 2026-11-11)

- Menu « Niveau » : « Tous les niveaux » par défaut, puis CP → Terminale.
- Case « et niveaux inférieurs » **décochée** au départ, visible seulement quand un niveau est choisi ; elle suit l'arbre des prérequis (`getAccessibleGrades`).
- Filtre **gardé dans l'adresse** : `?niveau=<code>&inferieurs=1`.
- Branche/notion vidées par le filtre : disparaissent ; la page passe à la première branche restante. Aucun modèle : « Aucune question pour ce niveau. »
