# Chantier `ensembles-2de` — ensembles de nombres en Seconde : couverture et manques

## Reprendre ici

_Mis à jour le 2026-11-20 : relevé fait, aucun code écrit._

- **État** : 6 exercices d'une autre plateforme (Seconde, « Ensembles de nombres ») comparés à nos modèles de questions publiés : 4 manques repérés (tableau ci-dessous). Rien de créé.
- **Prochaine action** : David choisit par où commencer ; recommandation : manque 1 (plus petit ensemble qui contient le résultat d'un calcul).
- **En attente de David** : le choix du premier manque à traiter.
- **Pièges en cours** : ne jamais nommer la plateforme d'origine dans un commit, une branche, une PR ou ce journal (consigne de David, 2026-11-20).
- **Worktree / branche** : aucun.

## Relevé (2026-11-20)

| Exercice relevé                                                | Ce qu'on demande                                                      | Modèle(s) Chiphre                                                                                                          | Verdict                                                                     |
| -------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Plus petit ensemble d'un nombre (question flash et série de 5) | −123 · 146 · 59/4 · √47 · 6/3 → ℕ, ℤ, 𝔻, ℚ ou ℝ                       | « Le plus petit ensemble de nombres » (ab/b, −√a², p/q décimal, p/q non décimal, √k)                                       | ✅ ; pas de 5,78, de −123 écrit tel quel, ni de π                           |
| Plus petit ensemble du **résultat d'un calcul**                | 3−15 · 24/2−√16 · 4+√29 · 8/10+5/100 · √49−√121 · 3+4/7 · 1/3+1/3+1/3 | aucun                                                                                                                      | ❌ manque 1                                                                 |
| Cocher **tous** les ensembles d'un nombre                      | 5,78 · −√81 · (6−1)/5 · π · 3+1/3                                     | « À quels ensembles de nombres appartient ce nombre ? » (±p/q, ±√n, m/100) ; « Entiers naturels, entiers relatifs » var. 3 | 🟡 ; pas de π ni de sommes                                                  |
| Compléter par ∈ / ∉ / ⊂ / ⊄                                    | 17 … {16;22;44} · {b;p;t;x} … {b;h;p;t;x}                             | « Élément d'un ensemble, appartenance » · « Vrai ou faux : inclusion » · « Le bon symbole : ∈, ⊂, ∩, ∪ »                   | 🟡 ; jamais ⊄, jamais le choix parmi les quatre, pas d'ensembles de lettres |
| A∪B, A∩B, A∖B, B∖A                                             | ensembles de lettres ou de nombres                                    | « Réunion… », « Intersection… », « Complémentaire d'un ensemble fini », « L'ensemble vide »                                | 🟡 ; pas de différence A∖B entre deux ensembles quelconques                 |

### Manques, par priorité

1. Plus petit ensemble qui contient le résultat d'un calcul (nouveau modèle).
2. Différence A∖B / B∖A (variation ou nouveau modèle).
3. Choisir entre ∈, ∉, ⊂, ⊄ (variation de « Le bon symbole »).
4. Petits ajouts : π et 5,78 dans « À quels ensembles… » ; −123 écrit tel quel dans « Le plus petit ensemble… ».

## Comment un modèle devient « automatisme » (rappel, 2026-11-20)

Un modèle ne porte aucune marque « automatisme ». Il est relié à des **points** (`question_template_points`) ; un point figure dans la liste d'automatismes d'un ou plusieurs programmes (`curriculum_point_automatismes`). Exemple : « Réunion de deux ensembles finis » → point 2-404 (Seconde) → listes de 1re spé, 1re techno, Tle spé, Tle compl., Tle techno.
