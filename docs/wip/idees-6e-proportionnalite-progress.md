# Chantier `idees-6e-proportionnalite`

## Reprendre ici

_Mis à jour le 2026-11-25, phase 0 validée._

- **État** : rubrique 6P3 réservée (commit sur `main`), relevé écrit ([idees-6e-proportionnalite-releve.md](idees-6e-proportionnalite-releve.md)), 12 fiches de phase 0 sur la page à cocher https://claude.ai/artifact/8WUcuNwaQY2PvBydaLivW3 (collection `verdicts`).
- **Prochaine action** : écrire le gros lot (modèles neufs N1 à N5, variations F1 à F3, ouverture de 06df72fd à la 6e en F4).
- **En attente de David** : rien.
- **Pièges en cours** : les variations de modèles publiés (e0ccaf84, 7981dab0, 52bf3fb9, 5e4e5e9d, 06df72fd) se réservent dans le tableau avant l'export. Bornes de 6e : pas de produit en croix (6-191, 6-192), échelles graphiques seulement (6-193).
- **Worktree / branche** : `../ubumaths-wt-idees-6e-proportionnalite`, `docs/idees-6e-proportionnalite`.

## Journal

### 2026-11-25 : réservation, relevé, phase 0

- Ligne 6P3 du tableau de répartition passée à « prise » (commit `1b949686e`, direct sur `main`).
- Relevé des 16 exercices par deux agents (Sonnet), échantillon vérifié dans le code. Verdicts : ✅ 3 · 🟡 9 · ❌ 4.
- Points de 6e en jeu : 6-189, 6-190, 6-191, 6-192, 6-193, 6-211. Aucun modèle de 6e ne fait la linéarité additive, le retour à l'unité, ni compléter un tableau par le calcul, alors que le BO les nomme.
- Rien dans leur format qui manque au nôtre : pas de ligne pour `outils-manquants.md`. À vérifier à l'écriture : l'échelle graphique dessinée (F3) avec un bloc de figure existant.
- Question d'accès des futures migrations : personne ne gagne d'accès (rangement de modèles, variations ajoutées).

#### Fiches de phase 0 (page à cocher)

| Fiche | Idée                                                       | Recommandation                          | Point |
| ----- | ---------------------------------------------------------- | --------------------------------------- | ----- |
| F1    | Prix : masses à virgule, sens de la division               | 2 variations de e0ccaf84                | 6-191 |
| F2    | Tiers et quart de grands nombres et de décimaux            | 2 variations de 7981dab0                | 6-211 |
| F3    | Échelle graphique 1 cm pour 2, 4 ou 5 m, terrain rectangle | 1 variation de 52bf3fb9 + 1 de 5e4e5e9d | 6-193 |
| F4    | Situations de proportionnalité en mots                     | 06df72fd (5e) ouvert à la 6e, tag 6-190 | 6-190 |
| N1    | Retour à l'unité                                           | Nouveau modèle, 4 variations            | 6-191 |
| N2    | Linéarité additive                                         | Nouveau modèle, 4 variations            | 6-191 |
| N3    | Compléter un tableau de proportionnalité par la linéarité  | Nouveau modèle, 3 variations            | 6-192 |
| N4    | Grandeur ou unité ?                                        | Nouveau modèle, 2 variations            | 6-189 |
| N5    | Peut-on le calculer ? (piège de l'âge et de la taille)     | Nouveau modèle, 2 variations            | 6-190 |
| R1    | Déjà couverts                                              | Rien                                    | —     |
| R2    | Échelles 1/n                                               | Rien en 6e ; idée pour la session de 5e | —     |
| R3    | « A-t-il assez ? » (Oui / Non)                             | Rien                                    | —     |

#### Décision de David (2026-11-25)

« Je valide » : toutes les fiches acceptées telles que recommandées (aucune case cochée sur la page,
donc aucune note). Modèles publiés réservés dans le tableau de répartition : e0ccaf84, 7981dab0,
52bf3fb9, 5e4e5e9d, 06df72fd. Idée R2 (échelles 1/n) notée dans « Idées en attente » pour la 5e.
