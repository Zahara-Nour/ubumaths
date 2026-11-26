# Relevé « continuité » et « dénombrement » de Terminale spécialité (2026-11-25)

Chantier [`idees-tle-continuite-combinatoire`](idees-tle-continuite-combinatoire-progress.md).
15 exercices des rubriques TSA4 (continuité, 6) et TSG1 (dénombrement, 9) d'une autre plateforme,
lus dans leur code source (copie locale, sans les anciennes versions `-old` / `Old`), comparés à nos
modèles publiés en prod (MCP en lecture seule, énoncés des variations lus). Les ids sont ceux de la
plateforme. Relevé fait par la session elle-même, sans agent.

**Leur forme** : TSG1 se saisit (un nombre, deux ou trois nombres pour 04 et 07, deux cases d'un
coefficient binomial pour 08). TSA4 n'est pas interactif : courbe à lire (10), sujets rédigés (11,
31, 32, 40), 41 se saisit en partie.

## Nos modèles (prod, publiés, Tle spé)

### Continuité

| Id court | Titre                                                         | Var. | Point    |
| -------- | ------------------------------------------------------------- | ---- | -------- |
| 10393ff9 | Continuité lue sur une courbe : saut ou point anguleux (QCM)  | 2    | TSPE-425 |
| 7ea93a82 | Dérivable implique continue (QCM)                             | 3    | TSPE-426 |
| 1c4204c4 | Fonctions continues telles que f(x + y) = f(x) + f(y)         | 4    | TSPE-436 |
| ec4fa70f | Prolongement par continuité en un point                       | 3    | TSPE-437 |
| c10096eb | Théorème des valeurs intermédiaires (QCM abstrait)            | 3    | TSPE-428 |
| fe7f5218 | TVI : cas strictement monotone (QCM abstrait)                 | 3    | TSPE-429 |
| 2491dd75 | TVI : nombre de solutions de f(x) = k (tableau de variations) | 3    | TSPE-430 |
| 3c6d8ed7 | Démontrer le TVI par dichotomie                               | 4    | TSPE-435 |
| d3ae0f61 | Encadrer la solution de f(x) = k à l'aide d'un tableau        | 2    | TSPE-431 |
| 641e5a83 | Dichotomie en Python                                          | 3    | TSPE-433 |
| 85a3aec6 | Newton en Python                                              | 3    | TSPE-434 |
| 3bc7b3c9 | Sécante en Python                                             | 3    | TSPE-592 |
| 57063ada | uₙ₊₁ = f(uₙ) convergente : limite avec f(ℓ) = ℓ               | 4    | TSPE-432 |
| d1aee0b9 | Récurrence sur une suite définie par une fonction croissante  | 5    | TSPE-386 |

**TSPE-427** (« image d'une suite convergente par une fonction continue ») n'a **aucun** modèle.

### Dénombrement

| Id court | Titre                                                              | Var. | Point    |
| -------- | ------------------------------------------------------------------ | ---- | -------- |
| 89d49fae | Principe additif : « ou », sans compter deux fois                  | 4    | TSPE-305 |
| ed01a843 | Principe multiplicatif : produit cartésien, menus, identifiants    | 4    | TSPE-306 |
| a26e6e50 | Cardinal d'un produit cartésien                                    | 1    | TSPE-306 |
| 67b349ab | k-uplets (avec répétition) : n puissance k                         | 5    | TSPE-307 |
| dfb727cd | Nombre de parties d'un ensemble : 2 puissance n                    | 3    | TSPE-308 |
| 0965c56c | k-uplets d'éléments distincts : codes, bureaux, places, anagrammes | 4    | TSPE-309 |
| e76a43eb | Arrangements : nombre de podiums                                   | 1    | TSPE-309 |
| dd23bf2d | Permutations : ranger n objets                                     | 1    | TSPE-311 |
| 3aca54e9 | Combinaisons en situation : délégués, cartes, loto, poignées       | 4    | TSPE-312 |
| 7d9d9b81 | Formule des coefficients binomiaux                                 | 2    | TSPE-313 |
| ef3c495c | Relation et triangle de Pascal                                     | 2    | TSPE-316 |
| 185496e9 | Démontrer la relation de Pascal par le calcul                      | 4    | TSPE-321 |
| 2bae040c | Somme des coefficients binomiaux : 2 puissance n                   | 3    | TSPE-320 |
| f796ffc0 | Quel modèle ? k-uplet, k-uplet distinct ou combinaison (QCM)       | 4    | TSPE-318 |
| b500b44e | Tirages dans une urne : avec remise, sans remise, simultanés       | 3    | TSPE-318 |
| 4a1deda8 | « Au moins un » : compter par le complémentaire                    | 4    | TSPE-319 |
| 0feeabaf | « Exactement » : produit de combinaisons                           | 3    | TSPE-319 |

Aucun modèle ne passe d'un dénombrement à une **probabilité** (recherche des énoncés « simultané » +
« probabilité » : rien).

## Exercices

| Id      | Ce qu'on demande                                                                              | Forme chez eux        | Nos modèles                                                | Verdict               |
| ------- | --------------------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------- | --------------------- |
| TSA4-10 | Intervalles de continuité lus sur une courbe (continue, point anguleux, 1 ou 2 sauts)         | rédigé                | 10393ff9 (un saut, QCM)                                    | 🟡 → V2               |
| TSA4-11 | Fonction par morceaux (affine ou carré) : limites à gauche, à droite, continue en a ?         | rédigé                | aucun (ec4fa70f = prolongement)                            | ❌ → N1               |
| TSA4-31 | TVI sur une équation donnée (x³ = ax + b, x − cos x = k, eˣ = x + a, quotient)                | rédigé                | c10096eb, 2491dd75 (abstrait, tableau)                     | ❌ → N2               |
| TSA4-32 | Corollaire : unique solution (signe de h′), puis valeur approchée à 10⁻²                      | rédigé                | fe7f5218 (abstrait), d3ae0f61                              | 🟡 → N2 (variation 4) |
| TSA4-40 | Synthèse (ax + b)e^(mx) : limites, f′, variations, convexité, nombre de solutions de f(x) = k | rédigé                | rubriques limites et dérivation (publiées), 2491dd75       | 🟡 → V1               |
| TSA4-41 | Suite uₙ₊₁ = f(uₙ) homographique : variations, point fixe, récurrence, limite                 | saisie partielle      | 57063ada, d1aee0b9 ; TSPE-427 sans modèle                  | ✅ + idée N4          |
| TSG1-01 | Urne : avec remise, sans remise, simultané, parties, permutations                             | saisie (nombre)       | b500b44e, 67b349ab, 0965c56c, 3aca54e9, dfb727cd, dd23bf2d | ✅                    |
| TSG1-02 | Ranger n objets sur une étagère                                                               | saisie                | dd23bf2d                                                   | ✅                    |
| TSG1-03 | Code : n chiffres (répétés) puis p lettres **distinctes** parmi L                             | saisie                | ed01a843 v3 (tout répété), 0965c56c v1 (tout distinct)     | 🟡 → V3               |
| TSG1-04 | Tirage simultané de 2 lettres : nombre de tirages, puis **probabilité** voyelle + consonne    | 2 saisies             | aucun pour la probabilité                                  | ❌ → N5               |
| TSG1-05 | Binôme mixte f × g                                                                            | saisie                | ed01a843, a26e6e50                                         | ✅                    |
| TSG1-06 | ∑ C(n, k) = 2ⁿ                                                                                | saisie                | 2bae040c                                                   | ✅                    |
| TSG1-07 | CA de k parmi n ; au moins une femme ; bureau de 3 postes                                     | 3 saisies             | 3aca54e9, 4a1deda8 v1, 0965c56c v2                         | ✅                    |
| TSG1-08 | C(n−1, k−1) + C(n−1, k) = C(?, ?)                                                             | 2 cases d'un binomial | ef3c495c v1 (avec les valeurs)                             | 🟡 rien               |
| TSG1-09 | k objets parmi n en vitrine                                                                   | saisie                | 3aca54e9                                                   | ✅                    |

**TSG1-08, rien** : la forme « deux cases d'un binomial » accepterait mal C(n, n − k), juste aussi ;
ef3c495c v1 (valeurs données) et 185496e9 (démonstration) couvrent l'idée.

**TSA4-41** : l'idée de la suite est couverte. Elle montre que **TSPE-427** n'a aucun modèle : la
fiche N4 propose de le couvrir (idée voisine, pas reprise d'un exercice).

**Idée en attente reprise** : TSA5-41 (`idees-tle-ln`) « f(x) = 0 a deux solutions » sur
ax + b + k ln x → V1.
