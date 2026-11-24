# Fiches de phase 0 : probabilités de Terminale spécialité (2026-11-24)

Chantier [`idees-tle-probas`](idees-tle-probas-progress.md) · relevé :
[idees-tle-probas-releve.md](idees-tle-probas-releve.md). Page à cocher : voir le journal.

Si tout est oui : **2 modèles neufs** (9 variations) et **8 variations** ajoutées à 5 modèles publiés.
Chaque variation a ses tests, trois erreurs prévues et un coup de pouce qui ne donne pas la réponse.
**Question d'accès** : personne ne gagne d'accès (les migrations rangent des modèles et ajoutent des
variations). **Outil manquant** : l'éditeur Python exécuté (TSP2-14 b) est déjà le n° 49 de
`outils-manquants.md`.

## Modèles neufs

### F2. Loi binomiale à la calculatrice (TSP2-10, 11, 12) — nouveau modèle, 4 variations, selon Q1

- **Chez eux → chez nous** : saisie d'une valeur arrondie au millième, n de 10 à 30. Nos modèles calculent à la main
  (a95a9c0d, n ⩽ 5) ou lisent une table. Les valeurs sont calculées par le script (pools tirés d'avance).
- **Modèle** : « Loi binomiale : P(X = k), P(X ⩾ 1) à la calculatrice » · **point** TSPE-510.
- **Variations** : (1) X ~ B(n ; p), P(X = k), n de 10 à 30, p de 0,1 à 0,9 par 0,05 ; (2) P(X ⩾ 1) = 1 − (1 − p)ⁿ ;
  (3) P(X < n) = 1 − pⁿ ; (4) urne avec remise (r rouges, b bleues), P(X = k), p = r/(r + b).
- **Erreurs prévues** : coefficient binomial oublié (pᵏ(1 − p)ⁿ⁻ᵏ), exposants inversés, P(X = 0) donnée pour P(X ⩾ 1).

### F3. Traduire « au moins », « moins de », « plus de », « au plus », « entre » (TSP2-13) — nouveau modèle, 5 variations

- **Chez eux → chez nous** : situation concrète (tirs, graines, QCM, clients, ampoules), une **table** de P(X ⩽ k)
  donnée, comme nos modèles de table. Le cœur de l'exercice, traduire les mots en P(X ⩽ …), ne dépend pas de la
  calculatrice. Réponse décimale exacte lue ou calculée dans la table.
- **Modèle** : « Loi binomiale : du vocabulaire à P(X ⩽ k) » · **point** TSPE-619.
- **Variations** : moins de k → P(X ⩽ k − 1) ; au plus k → P(X ⩽ k) ; au moins k → 1 − P(X ⩽ k − 1) ;
  plus de k → 1 − P(X ⩽ k) ; entre a et b inclus → P(X ⩽ b) − P(X ⩽ a − 1).
- **Erreurs prévues** : décalage d'un rang (P(X ⩽ k) pour « moins de k »), « 1 − » oublié, P(X ⩽ a) au lieu de
  P(X ⩽ a − 1).

## Variations de modèles publiés

### F1. Probabilités totales « à l'envers » (TSP1-11) — variation de ecf4d46b (TSPE-617)

P(A), P_A(G) et **P(G)** donnés ; trouver P_B(G) (P(B ∩ G) = P(G) − P(A ∩ G), puis ÷ P(B)). Réponse en fraction ou
décimal exact. Erreurs : P(B ∩ G) sans diviser, P(G) − P_A(G), P(B ∩ G)/P(G).

### F4. Seuil « au moins un succès » : exprimer pₙ, et la boucle Python (TSP2-14) — 2 variations de 4ee9a359 (TSPE-509)

(a) pₙ = probabilité d'au moins un succès en n épreuves : saisie de l'expression 1 − qⁿ. Erreurs : qⁿ, 1 − pⁿ, pⁿ.
(b) Fonction Python `while … : n = n + 1` : choisir la condition (`1 - q**n < seuil` ✓, `1 - q**n >= seuil`,
`q**n < seuil`, `n < seuil`), comme aa3cb8e7.

### F5. Linéarité de l'espérance sans indépendance (TSP3-01) — variation de 7974722d (TSPE-526)

Deux questions Q₁, Q₂ notées 0 ou 1, réussites liées par un arbre ; X = X₁ + X₂ ; E(X) = P(A) + P(B), P(B) par les
probabilités totales. Erreurs : P(A) + P_A(B), P(A) × P(B), 2 P(A ∩ B).

### F6. Bienaymé-Tchebychev : réunion d'intervalles, somme (TSP4-10) — 2 variations de 0943e867 (TSPE-530)

(a) majorer P(X ∈ ]−∞ ; μ − a] ∪ [μ + a ; +∞[) → V/a² ; (b) Z = X₁ + … + Xₙ indépendantes, majorer
P(|Z − nμ| ⩾ a) → nV/a². Plages : μ de −10 à 10, V de 0,1 à 0,8, a de 1,5 à 2,5. Erreurs : V/a, V/a² sans n, a²/V.

### F7. Inégalité de concentration : minorant, réunion d'intervalles (TSP4-20) — 2 variations de 95f73515 (TSPE-531)

(a) minorer P(|Mₙ − μ| < a) → 1 − V/(na²) ; (b) majorer P(Mₙ ∈ ]−∞ ; μ − a] ∪ [μ + a ; +∞[) → V/(na²).
n de 100 à 1 000. Erreurs : V/(na²) donné pour le minorant, n oublié, V/(na).

## Rien

TSP1-10 (ea48f760 v1, v3), TSP2-11 et 12 hors calcul (4ff9d049, 30b597c3, dbee4649), TSP3-10 (eafd17a1, 1re spé),
le plus petit n de TSP4-10 et 20 (91db0034), la justification rédigée de TSP2-12.

## Questions

- **Q1. Calculatrice pour la loi binomiale ?** Nos modèles binomiaux l'évitent (table, n ⩽ 5). Le BO dit
  « calculer numériquement » (TSPE-510) et Al-Kashi (721324f9) demande déjà un arrondi à la calculatrice.
  **Reco : oui**, F2 avec la calculatrice. Non → F2 ne s'écrit pas.
