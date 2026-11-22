# Chantier `idees-6e-entiers` : idées reprises d'ailleurs, rubrique « Nombres entiers » de 6e

Skill [`idees-rubrique`](../../.claude/skills/idees-rubrique/SKILL.md). Tableau :
[idees-ailleurs-repartition.md](idees-ailleurs-repartition.md) (section Sixième, ligne 6N0 prise le
2026-11-22). Relevé : [idees-6e-entiers-releve.md](idees-6e-entiers-releve.md).

## Reprendre ici

_Mis à jour le 2026-11-22, phase 0 validée, lot en écriture (aucune PR)._

- **État** : phase 0 validée par David (toutes les recommandations). Les 3 modèles publiés sont réservés
  au tableau et exportés de prod dans `scripts/questions/6e-entiers-publies/` (identiques à la prod).
  Lot en cours d'écriture : `docs/wip/questions/lot-6e-entiers-a.py` → `scripts/questions/6e-entiers-a/`
  (F1, F5, F2) et `lot-6e-entiers-publies.py` (F3, F4, F7).
- **Prochaine action** : simulation `create-questions` verte sur les deux dossiers, tirages lus ;
  essai en base locale ; migration de contenu des publiés (`migration-contenu.ts`) ; PR.
- **En attente de David** : rien. À lui dire : le titre de b9677e1f (« … d'un produit ») ne peut pas
  changer par `migration-contenu` (titre comparé à la prod) ; le renommer dans l'éditeur s'il le veut.
- **Pièges en cours** : case Texte tolérante → bloc trous ; `?` dans un `array` = une case (4b080eed) ;
  le hook pre-commit laisse l'index avec une vieille copie (`git diff HEAD` vide → `git restore --staged`).
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
