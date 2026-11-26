# Chantier `idees-3e-probabilites`

## Reprendre ici

_Mis à jour le 2026-11-26, après #3156._

- **État** : #3156 mergée (fichiers du lot, § « Lot » ci-dessous) : N1 et N2 dans `scripts/questions/idees-3e-probabilites-neufs/`, V1 à V3 ajoutées à la fin des trois modèles exportés de prod dans `scripts/questions/idees-3e-probabilites-publies/`. Rien n'est encore en prod.
- **Prochaine action** : quand David a lancé le `--publier`, nouveau worktree sur `origin/main` ; commiter les ids écrits en tête des deux fichiers neufs ; PR des migrations générées : rangement (`migration-rangement.ts --dir …-neufs`, champ `rangement` déjà écrit) et contenu des trois publiés (`migration-contenu.ts --dir …-publies`), `security-auditor`, puis `db:migrate` (4 conditions de `CLAUDE.md`). Ensuite relecture dans `/dev/modeles` (brouillons : `?point=3-033` ; publiés : série de relecture).
- **En attente de David** : `pnpm tsx scripts/create-questions.ts --dir scripts/questions/idees-3e-probabilites-neufs --publier` (brouillons en prod, depuis le dépôt principal).
- **Pièges en cours** : les fichiers `…-publies` repartent de l'export de prod du 2026-11-26 ; `migration-contenu.ts` refuse si un modèle a changé en prod entre-temps. La base locale garde 5 brouillons d'essai (N1, N2, et trois copies « (essai local) »).
- **Worktree / branche** : aucun (retiré par `pr:merger`) ; le prochain : `../ubumaths-wt-idees-3e-probabilites-migrations`.

## Lot (2026-11-26)

Scripts : `docs/wip/questions/idees-3e-probabilites-neufs.py` et `…-publies.py`.

- **N1** « Probabilités dans un tableau d'effectifs » (3e, niveau 2, 4 variations, fractions non
  réduites acceptées) et **N2** « Jeux à deux épreuves : évènements « et », « ou » » (3e, niveau
  3, 4 variations). Rangement : nœud « Probabilités > Expériences aléatoires > événements » (celui
  de cd2ffd9b, niveau 1 en prod le 2026-11-26), point 3-033.
- **Écart à la fiche N1** : effectifs de 100 à **240** (et non 500) pour le garage et la cité
  scolaire : le total reste sous 1 000, sans espace à écrire dans les grands nombres (énoncé,
  corrigé, réponse). Coin du tableau retiré (débord à 390 px).
- **N2, variation dé à 4 et dé à 6** : la réponse ne prend que deux valeurs (1/4, 3/4), comme la
  fiche le donne (parité seule).
- **V1** (b28ed4fa, variations 5 à 8) : urne avec remise, pièce qui choisit l'urne, deux dés sans
  tableau (somme, produit, écart ; ⩽ < ⩾ >), dé à 4 et dé à 6 (cinq évènements). Les dénombrements
  des deux dés sont calculés par formules dans les variables, contrôlées par force brute dans le
  script sur tous les tirages. **V2** (e73b947f, variation 5) et **V3** (247fddd1, variation 5) :
  roulette.
- Trois erreurs prévues par case et un coup de pouce par variation, partout.
- Essai en base locale : les cinq modèles créés en brouillon (les trois publiés en copie
  « (essai local) »), rendus vus dans `/dev/modeles` à 390 px (tableaux, case masquée, `{{if}}`).
  Le jugement des réponses est vérifié par les specs, pas en saisissant dans l'aperçu.

## Relevé (2026-11-25)

5 exercices (3S20, 3S20-1, 3S20-2, 3S20-3, 3S20DNB). Points de 3e : 3-033 (cd2ffd9b), 3-034
(c7928fc7), 3-035. Les deux épreuves simples sont de 4e (4-049, b28ed4fa). Question d'accès des
migrations à venir : personne ne gagne d'accès (rangement de modèles, variations ajoutées).

## Fiches de la phase 0 (copie de la page à cocher)

Chaque variation aura ses `testSpecs` (réponses justes sous plusieurs écritures, erreurs typiques
refusées), trois erreurs prévues par case et un coup de pouce qui ne donne pas la réponse.

### N1 — Probabilités dans un tableau d'effectifs (nouveau modèle de 3e, 4 variations)

- **Chez eux** : 3S20-2, tableau 2 × 2 avec totaux ; compléter 5 cases, P(un caractère), P(l'autre), P(… sachant …).
- **Chez nous** : bloc `tableau-croise`, une case par variation ; « et », « ou », « ou mais pas les deux ». « Sachant » laissé à la Seconde (f3e68e4b).
- **Point** : 3-033, nœud de cd2ffd9b.
- **Variations** : « A et B » (volière, bouquet, garage, cité scolaire ; effectifs 3 à 15, ou 100 à 500) ; « A ou B » ; « A ou B, mais pas les deux » ; un effectif masqué à retrouver avant P(A ou B).
- **Réponse** : fraction ou décimal exact, toute écriture égale. Erreurs prévues : P(A) + P(B) sans retirer P(A et B), case sur le total de sa ligne, total de ligne à la place de la case.

### N2 — Jeux à deux épreuves : évènements « et », « ou » (nouveau modèle de 3e, 4 variations)

- **Chez eux** : 3S20-3, « probabilité de gagner » à cinq jeux.
- **Chez nous** : une case, tableau des issues à construire par l'élève.
- **Point** : 3-033, même nœud que N1.
- **Variations** : deux tas de 4 à 6 cartes (même figure ou même couleur) ; dé + urne de 6 boules numérotées rouges ou bleues (bleue et numéro ⩾ dé) ; urne de 3 couleurs avec remise (au moins une de la couleur tirée) ; dé à 4 et dé à 6 (les deux pairs, ou au moins un impair).
- **Réponse** : fraction ou décimal exact. Erreurs prévues : « au moins une » compté deux fois, « et » pris pour « ou », dénominateur n₁ + n₂.

### V1 — 4 variations de b28ed4fa « Deux épreuves » (4e, 4-049)

- Urne de r rouges et v vertes (1 à 4, r ≠ v), deux tirages avec remise : deux rouges, même couleur ou couleurs différentes.
- Une pièce choisit l'urne (deux urnes de 6 boules 1-2-3) : P(une couleur) = (a + b)/12.
- Deux dés sans tableau : somme (seuil 5 à 8), produit (12 à 20) ou différence (3) comparés par ⩽, ⩾, <, >.
- Dé à 4 et dé à 6 (24 issues) : somme multiple de 3, somme > 7, somme ⩽ 5, dé à 6 > dé à 4, produit > 10.
- Erreurs prévues : r/(r + v), rv/(r + v)², dénominateur 36 au lieu de 24, 11 sommes équiprobables.

### V2 — variation de e73b947f « Probabilité d'un évènement » (4e, 4-048)

- Roulette de 0 à 36, n de 5 à 30 : P(numéro ⩽ n) = (n + 1)/37. Erreurs : n/37, (n + 1)/36, n/36.

### V3 — variation de 247fddd1 « Évènement contraire » (4e, 4-079)

- P(numéro ⩽ n) = (n + 1)/37 donnée : P(numéro ⩾ n + 1) = (36 − n)/37. Erreurs : (n + 1)/37, (37 − n)/37, (36 − n)/36.

### R — Rien

3S20 (sans remise : rubrique Probabilités de Seconde) ; « la pièce est tombée sur Pile » (e73b947f) ;
« sachant » (Seconde) ; compléter le tableau seul (89e928a4, et N1 variation 4) ; couleur et parité
lues sur la roue ; « plus de 3 chances sur 4 ? » (Oui / Non).

### Q1 — N1 et N2 sur 3-033 plutôt que 3-034 ?

Recommandation : oui. 3-034 parle de simulation (c7928fc7) ; le calcul à deux épreuves est déjà de
4e (4-049) ; ce que la 3e ajoute, ce sont les évènements « et », « ou » (3-033).
