# Chantier `idees-6e-entiers` : idées reprises d'ailleurs, rubrique « Nombres entiers » de 6e

Skill [`idees-rubrique`](../../../../.claude/skills/idees-rubrique/SKILL.md). Tableau :
[idees-ailleurs-repartition.md](../../../wip/idees-ailleurs-repartition.md) (section Sixième, ligne 6N0 prise le
2026-11-22). Relevé : [idees-6e-entiers-releve.md](idees-6e-entiers-releve.md).

## Reprendre ici

_Mis à jour le 2026-11-22, chantier clos._

- **État** : rubrique **publiée** : les 3 modèles neufs (818d5e6b, ba899229, e76ab26f) et les variations
  des 3 publiés (98f558e4, b9677e1f, d793de49) validés par David et publiés (vérifié par MCP) ; prénoms
  d'énoncé confirmés fictifs ; journal archivé · **Prochaine action** : aucune · **En attente de David** :
  rien (idée reportée : la rose des sommes, 6N0A-2, dans « Idées en attente » du tableau).
- **Pièges retenus** : migration-contenu refuse un titre différent de la prod ; zsh ne découpe pas `$F` ;
  le Chrome connecté n'atteint pas `[::1]:<port>` du Mac mini.
- **Worktree / branche** : aucun.

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

## 2026-11-22 — question d'accès, brouillons en prod

David confirme : les migrations de rangement et de contenu ne donnent aucun accès nouveau (« je confirme
pour la question d'accès »). Condition (1) de `db:migrate` remplie. Brouillons créés en prod par David
(818d5e6b, ba899229, e76ab26f), ids vérifiés par MCP (draft, CM2 + 6).

## 2026-11-22 — rangement et contenu en prod (#2998)

Migrations `20261122115157` (rangement + tags des 3 neufs) et `20261122115342` (contenu des 3 publiés).
Tests rouges sans elles (6 et 5 échecs), verts avec (11/11, 24/24). `security-auditor` : aucun finding
bloquant. `db:migrate` joué depuis `main` (seules ces deux migrations en attente).
