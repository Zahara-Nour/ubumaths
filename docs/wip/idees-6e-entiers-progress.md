# Chantier `idees-6e-entiers` : idées reprises d'ailleurs, rubrique « Nombres entiers » de 6e

Skill [`idees-rubrique`](../../.claude/skills/idees-rubrique/SKILL.md). Tableau :
[idees-ailleurs-repartition.md](idees-ailleurs-repartition.md) (section Sixième, ligne 6N0 prise le
2026-11-22). Relevé : [idees-6e-entiers-releve.md](idees-6e-entiers-releve.md).

## Reprendre ici

_Mis à jour le 2026-11-22, lot écrit, PR des fichiers en cours._

- **État** : lot commité (d6a626d60). 3 modèles neufs dans `scripts/questions/6e-entiers-a/` (F1, F5, F2),
  variations ajoutées en fin de 98f558e4, b9677e1f, d793de49 dans `6e-entiers-publies/`. Simulation et
  specs vertes. Brouillons créés en base LOCALE (0f60e07e, e30d9b3b, 082bd126), ids restaurés dans les
  fichiers. Aperçu local pas vu : le Chrome connecté n'atteint pas `[::1]:5178` (serveur du worktree).
- **Prochaine action** : PR des fichiers, CI, merge ; puis David lance `create-questions --publier` en
  prod sur `6e-entiers-a` ; migrations de rangement (nœud + tag : CM2-065 ×2, CM2-003) et de contenu
  (`migration-contenu.ts --dir scripts/questions/6e-entiers-publies`), tests d'intégration, `security-auditor`.
- **En attente de David** : question d'accès des migrations ; regard sur l'aperçu (grille Yohaku avec
  `\hline`, bloc trous) ; titre de b9677e1f à renommer dans l'éditeur s'il le veut.
- **Pièges en cours** : migration-contenu refuse un titre différent de la prod ; hook pre-commit laisse
  l'index avec une vieille copie (`git diff HEAD` vide → `git restore --staged`) ; zsh ne découpe pas `$F`.
- **Worktree / branche** : `../ubumaths-wt-idees-6e-entiers`, `docs/idees-6e-entiers`.

## Historique

- 2026-11-22 : section Sixième ajoutée au tableau (23 rubriques), 6N0 réservée (commit sur `main`).
  Worktree créé. Relevé commencé.

## 2026-11-22 — verdicts et phase 0

Variations relues en prod pour les trois priorités. **6N0A-14** : aucune égalité d'entiers n'a de calcul
des deux côtés du signe =, sauf la commutativité (b2a4a178, CE1) ; le BO du CM2 cite « 178 – … = 6 × 8 ».
**6N0A-12** : d793de49 décompose dans le corrigé seulement. **6N0A-5** : b9677e1f, un produit seul.
Lettres : rien au-delà du CP. Verdicts détaillés dans le relevé ; fiches F1 à F7 et Q1 sur la page à cocher.

## 2026-11-22 — phase 0 validée

David : « je valide tes recommandations dans la page à cocher » (la base de la page est restée vide).
Donc Q1 oui (CM2 + 6, point du CM), fiches 1, 2, 3, 4, 5, 7 oui, fiche 6 (rose) plus tard : rien dans
`outils-manquants.md`, idée notée dans « Idées en attente » du tableau. Modèles réservés : 98f558e4,
b9677e1f, d793de49 (commit sur `main`) ; export de prod commité (c7a1a87ab).

## 2026-11-22 — lot écrit

Agent `pedagogy-expert` : 3 modèles neufs (22, 7, 33 specs) et variations des 3 publiés (16, 12, 16 specs).
Relu dans les tirages. Corrigé : tranche vide « $000$ (pas de mille) » ; grille Yohaku avec `\hline` et double
trait avant les sommes (`\hline` déjà utilisé par `6-nombres/04-grands-nombres.json`). V2, V3, V4 de l'égalité :
deux erreurs prévues seulement (pas de troisième erreur réelle). Yohaku : une erreur prévue (cases échangées).
