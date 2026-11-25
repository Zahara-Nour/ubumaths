# Chantier `idees-6e-proportionnalite`

## Reprendre ici

_Mis à jour le 2026-11-25, lot écrit._

- **État** : lot entier écrit, vérifié (`question:specs --file` : 10 fichiers « importable ») et poussé sur la branche : 4 publiés (+6 variations) et 5 neufs (N1 à N5, `scripts/questions/idees-6e-proportionnalite-neufs/`).
- **Prochaine action** : les retouches validées (ci-dessous), puis essai en base LOCALE (neufs + copie brouillon des publiés, aperçus avec `pnpm voir`, puis suppression), puis donner à David `create-questions --dir scripts/questions/idees-6e-proportionnalite-neufs --publier`.
- **En attente de David** : prix à deux décimales (« 3,70 € ») : réglage automatique des grandeurs en € ou modificateur `{{eval:…;…}}` explicite (petite PR du moteur, avant le lot) ? Le reste est tranché (journal, 2026-11-25 « retouches validées »).
- **Pièges en cours** : F4 (06df72fd : niveau 6 + point 6-190) = migration écrite à la main, gabarit `20261118202805_questions_1techno_lot5_communs_tags.sql` + son test. Rangements des neufs dans les fichiers (quatrième proportionnelle 4, 5, 6 ; caractérisation 8, 9) : relever les niveaux en prod avant la migration.
- **Worktree / branche** : `../ubumaths-wt-idees-6e-proportionnalite`, `docs/idees-6e-proportionnalite` (poussée, pas de PR).

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

### 2026-11-25 : lot des modèles publiés

- Exportés de prod : e0ccaf84, 7981dab0, 52bf3fb9, 5e4e5e9d, 06df72fd (ce dernier inchangé : F4 se fait par migration).
- e0ccaf84 +2 (masses au dixième ; diviser), 7981dab0 +2 (tiers / quart de grands nombres ; de décimaux), 52bf3fb9 +1 et 5e4e5e9d +1 (échelle graphique dessinée par un bloc `figure`, 1 cm pour 2, 4 ou 5 m, deux cases). Coup de pouce et trois erreurs prévues par case.
- Écarts : prix écrits « 7,2 € » (la règle des zéros juge « 21,60 € » forme à améliorer) ; espace des milliers écrit à la main (`2\,700`) ; une échelle par terrain, ni tennis ni handball (dimensions connues).

### 2026-11-25 : modèles neufs

- N1 retour à l'unité (4 var., 23 specs), N2 linéarité additive (4, 17), N3 compléter un tableau (3, 26, point 6-192), N4 grandeurs (2 : choix plusieurs, relier ; 10), N5 peut-on le calculer (2, 12). `zeros: off` sur N1 à N3.
- Écarts : N3 moyen x pair ∈ {4, 8, 10} (sinon la différence vaut 1 = valeur pour 1) ; prix unitaire 1,10 à 3,50 € jamais entier ; N1 recette 2 à 10, sirop 2 à 9 ; certaines cases n'ont que deux erreurs prévues (pas d'invention) ; N5 v2 : l'âge du père se calcule par l'écart.

### 2026-11-25 : retouches validées par David (« je valide »)

1. e0ccaf84 : `zeros: off` (« 21,60 € » accepté), par migration de contenu (options).
2. Prix affichés à deux décimales : David demande pourquoi un outil à part, et propose que le moteur
   écrive lui-même une grandeur en € avec deux décimales (option du format). Vérifié : les
   modificateurs de `{{eval:…}}` sont `d`, `+`, `()`, `'`, `hms`, `sci`, `[unité]`
   (`src/lib/ubumark/parameterization/parser/eval-parser.ts`) ; rien pour les centimes. Choix posé à David.
3. N5 v2 : l'âge du père reste calculable par l'écart ; ajouter une situation vraiment incalculable
   (pointure du père) pour que « on ne peut pas » soit parfois juste.
4. N5 : le piège « valeur × quantité » seulement quand il reste vraisemblable, sinon l'écart ajouté.
5. N4 relier : une série tirée parmi 4 ou 5 situations.
