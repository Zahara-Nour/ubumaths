# Chantier `idees-6e-decimaux` : idées reprises d'ailleurs, rubrique « Nombres décimaux » de 6e

Skill [`idees-rubrique`](../../.claude/skills/idees-rubrique/SKILL.md). Tableau :
[idees-ailleurs-repartition.md](idees-ailleurs-repartition.md) (section Sixième, ligne 6N2 prise le
2026-11-22). Relevé : [idees-6e-decimaux-releve.md](idees-6e-decimaux-releve.md).

## Reprendre ici

_Mis à jour le 2026-11-22, lecture des exercices faite._

- **État** : lecture factuelle des 55 exercices versée dans le relevé (4 lots ; 53 lignes `| 6N2` comptées,
  2 manquent ou sont fusionnées : à recompter). Lots B et C pas encore relus dans le code · **Prochaine
  action** : recompter, relire B et C par sondage, écrire les **verdicts** (✅ / 🟡 / ❌) contre nos modèles
  en prod, puis la page à cocher de la phase 0 · **En attente de David** : rien.
- **Pièges en cours** : le worktree `../ubumaths-wt-idees-6e-decimaux` (branche
  `docs/idees-6e-decimaux`, aucun commit) contient une copie **non suivie** de ce journal, périmée ; à
  supprimer avec l'accord de David avant d'y travailler (le journal vit sur `main`).
- **Worktree / branche** : voir ci-dessus ; il ne servira qu'à la PR des migrations.

## Historique

- 2026-11-22 : ligne 6N2 réservée (commit b4010dd46 sur `main`). Worktree créé. Points de 6e et de CM2
  relevés en prod avec leurs modèles (MCP). Chaque point de 6e sur les décimaux et la division
  (6-102 à 6-124, 6-198) a au moins un modèle ; 6-118 en a 12. Les modèles de division euclidienne du
  CE2 (14a51794, 15ed5af4, 3d4c45e5, 59a07a94) n'ont **aucun point**. 6-123 : 3c9284c5 (bloc
  `operation`, 3 variations), 6-124 : 3f4bacc6 (boîtes, cars, durées). Aucun modèle de 6e sur
  « divisible / diviseur / multiple » à partir d'une division (faf57d3b est de 5e, Oui / Non et QCM).
- 2026-11-22 : les 4 agents ont lu le code source des exercices ; tables versées dans le relevé.
