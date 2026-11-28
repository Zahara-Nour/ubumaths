# Relevé « probabilités » de 3e (2026-11-25)

Chantier [`idees-3e-probabilites`](idees-3e-probabilites-progress.md). Les 5 exercices de la rubrique
« probabilités » de 3e de l'autre plateforme, lus dans leur code source (copie locale), comparés à nos
modèles de probabilités de tous les niveaux en prod (MCP en lecture seule, 2026-11-25).

## Points de 3e

| Point | Énoncé                                                     | Modèles en prod                                              |
| ----- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| 3-033 | Connaître et appliquer P(A ∪ B) + P(A ∩ B) = P(A) + P(B)   | cd2ffd9b « Probabilité de A ou B, de A et B » (4 variations) |
| 3-034 | Simuler des expériences aléatoires indépendantes           | c7928fc7 « Simuler deux épreuves indépendantes » (3)         |
| 3-035 | Stabilisation des fréquences, lien fréquence / probabilité | 1 modèle                                                     |

Bornes ([cycle4.md](../../../systeme/programmes/bornes/cycle4.md)) : 3-033 en équiprobabilité, évènements
« ou », « et », « ou exclusif » ; deux épreuves en **4e** (4-049 : deux pièces, pièce et dé, deux dés,
tableau ou arbre) ; contraire en 4e (4-079). Probabilité conditionnelle (« sachant ») : Seconde.

Nos modèles voisins : 4e b28ed4fa « Deux épreuves » (deux pièces ; pièce + dé ; deux dés, somme = s,
tableau donné ; pièce + urne 1/1/1, arbre donné), e73b947f « Probabilité d'un évènement » (urne, dé,
32 cartes, lettres), 247fddd1 « Évènement contraire », abd1eeb7 « Contraire, réunion, intersection » ;
Seconde : tableaux croisés (89e928a4 compléter, cf548ea1 intersection, f3e68e4b / 4016b05c sachant).

## Exercices

| Id      | Ce qu'on demande                                                                                                                                                                                                                                                                                                                                                                                                                       | Forme de réponse                 | Nos modèles                                      | Verdict                                                                 |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| 3S20    | Renvoie à leur exercice de Seconde (yaourts sans remise, chaussettes et T-shirts, cartes, dé) ; eux-mêmes le disent hors programme de 3e (tirage sans remise, arbre pondéré)                                                                                                                                                                                                                                                           | fractions                        | —                                                | ❌ rien en 3e ; à voir avec leur rubrique de Seconde (2P, libre)        |
| 3S20-1a | Une pièce choisit l'urne (Pile : urne 1, Face : urne 2 ; 6 boules chacune, 1-2-3 bleues/rouges/vertes) ; a) « la pièce est tombée sur Pile » : probabilité d'une couleur ; b) probabilité d'une couleur sur toute l'expérience (12 issues équiprobables)                                                                                                                                                                               | deux fractions, égales acceptées | b28ed4fa v4 (une seule urne 1/1/1)               | 🟡 variation 4e                                                         |
| 3S20-1b | Urne à deux couleurs (1 à 4 boules de chaque, effectifs différents), deux tirages avec remise : deux boules X ; même couleur ; couleurs différentes (contraire)                                                                                                                                                                                                                                                                        | trois fractions                  | aucun en collège (T_SPE b500b44e)                | 🟡 variation 4e                                                         |
| 3S20-2  | Tableau d'effectifs 2 × 2 avec totaux (8 contextes : salariés, volière, bouquet, fruits, voitures, cité scolaire, plats, appareils) : compléter 5 cases, puis P(caractère de ligne), P(caractère de colonne), P(… sachant …)                                                                                                                                                                                                           | cases du tableau + 3 fractions   | Seconde seulement (tableaux croisés)             | ❌ en 3e → 🆕 modèle 3-033 ; la question « sachant » reste à la Seconde |
| 3S20-3  | « Calculer la probabilité de gagner », cinq jeux à deux épreuves : dé + urne de 6 boules numérotées et colorées (bleue et numéro ≥ dé) ; deux dés (somme, différence, produit comparés à un seuil) ; urne avec remise 3 couleurs (même couleur, différentes, au moins une X) ; dé à 4 et dé à 6 faces (produit pair, somme multiple de 3, d6 > d4, deux pairs, au moins un impair…) ; deux tas de cartes (même figure ou même couleur) | une fraction                     | b28ed4fa v3 (deux dés, somme = s, tableau donné) | 🟡 / ❌ : variations 4e + 🆕 modèle 3-033                               |
| 3S20DNB | Roulette 0 à 36 : P(un numéro) = 1/37 (expliquer) ; P(couleur et parité) lue sur la roue ; P(≤ n) = (n + 1)/37 (piège du 0) ; en déduire P(≥ n + 1) ; « plus de 3 chances sur 4 ? »                                                                                                                                                                                                                                                    | rédigé (exercice de brevet)      | e73b947f, 247fddd1 (pas de roulette)             | 🟡 variations 4e ; la roue colorée et le Oui / Non : rien               |

## Ce que leur format fait et pas le nôtre

- Cases **dans** le tableau d'effectifs (3S20-2). Le nôtre : ` ```tableau-croise ` avec `masquer:` et
  cases sous le tableau (89e928a4) ; les cases dans un tableau markdown existent mais débordent sur
  téléphone (ligne 57 de `outils-manquants.md`, déjà notée). Rien de neuf à ajouter.
- Figure de la roulette (cases noires et blanches alternées) : pas de bloc, mais la question qui en
  dépend (couleur et parité) n'apporte rien de plus qu'un dénombrement ; pas une idée d'outil.
