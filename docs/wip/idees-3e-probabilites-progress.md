# Chantier `idees-3e-probabilites`

## Reprendre ici

_Mis à jour le 2026-11-25, phase 0 envoyée (aucune PR encore)._

- **État** : relevé fait ([idees-3e-probabilites-releve.md](idees-3e-probabilites-releve.md)) ; fiches de phase 0 sur la page à cocher https://claude.ai/artifact/7e2RLrn89HwU8qNJuBLThS (copie ci-dessous).
- **Prochaine action** : lire les verdicts de la page (collection `verdicts`), puis réserver b28ed4fa, e73b947f et 247fddd1 dans le tableau de répartition si V1 à V3 sont acceptées, et écrire le gros lot.
- **En attente de David** : verdicts des fiches N1, N2, V1, V2, V3, R et de la question Q1.
- **Pièges en cours** : aucun.
- **Worktree / branche** : `../ubumaths-wt-idees-3e-probabilites`, `docs/idees-3e-probabilites` (à renommer en `feat/…` avant le lot si besoin).

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
