# Chantier `automaths` — filtre par niveau du catalogue

## Reprendre ici

_Mis à jour le 2026-11-11, après #2566._

- **État** : ✅ clos — filtre par niveau mergé (#2566), doc dans `docs/systeme/questions.md`, vérification à l'œil dans `docs/wip/verifications-manuelles.md` · **Prochaine action** : aucune · **En attente de David** : supprimer le brouillon doublon `3a7a5711` (« Trouver la largeur d'un rectangle. », 6e) depuis `/dashboard/admin/questions` · **Pièges** : la condition de tirage d'un modèle peut être dans `shared`, pas dans les variations · **Worktree / branche** : supprimés

## Décisions (phase 0, David, 2026-11-11)

- Menu « Niveau » : « Tous les niveaux » par défaut, puis CP → Terminale.
- Case « et niveaux inférieurs » **décochée** au départ, visible seulement quand un niveau est choisi ; elle suit l'arbre des prérequis (`getAccessibleGrades`).
- Filtre **gardé dans l'adresse** : `?niveau=<code>&inferieurs=1`.
- Branche/notion vidées par le filtre : disparaissent ; la page passe à la première branche restante. Aucun modèle : « Aucune question pour ce niveau. »

## Hors chantier : brouillon de 6e (2026-11-11)

- `3a7a5711` « Trouver la largeur d'un rectangle. » (brouillon, sans tag) = doublon du modèle publié `059e3fc9` (tagué 6-200), à une phrase près. Rien n'y est rattaché : David le supprime depuis l'admin.
- Le tirage était déjà correct : `shared.conditions = ["a>b"]` sur les trois modèles (largeur, aire `fdd849f5`), appliqué par `instance-generator.ts` quand la variation n'a pas sa propre condition.
