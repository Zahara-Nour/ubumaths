# Chantier `idees-3e-statistiques`

## Reprendre ici

_Mis à jour le 2026-11-26, relevé et phase 0 écrits._

- **État** : rubrique réservée, relevé écrit ([idees-3e-statistiques-releve.md](idees-3e-statistiques-releve.md)), fiches de phase 0 sur la page à cocher.
- **Prochaine action** : lire les verdicts de David, puis réserver les modèles retenus et écrire le lot.
- **En attente de David** : verdicts des fiches V1 à V3 et Q1.
- **Pièges en cours** : aucun.
- **Worktree / branche** : `../ubumaths-wt-idees-3e-statistiques` · `feat/idees-3e-statistiques`.

## Relevé (2026-11-26)

3 exercices (3S12, 3S14-0, 3S14-1). Nos modèles couvrent déjà toute la rubrique ; il manque des
grands effectifs pour la médiane de 3e, une moyenne arrondie au dixième (4e) et la fréquence lue sur
un diagramme ou pour un regroupement (5e). Question d'accès des migrations à venir : personne ne gagne
d'accès (variations ajoutées à des modèles publiés).

Page à cocher de la phase 0 : https://claude.ai/artifact/JWpuBjpG9vRQDNwHnmfEp1

## Fiches de la phase 0 (copie de la page à cocher)

Chaque variation aura ses `testSpecs` (réponses justes sous plusieurs écritures, erreurs typiques
refusées), trois erreurs prévues par case et un coup de pouce qui ne donne pas la réponse.

### V1 — Médiane d'une série à grands effectifs (2 variations à 96992ea8, 3e)

- **Chez eux** : 3S14-1, score médian de 49 à 2 000 lancers de dé (tableau d'effectifs) ; salaire médian d'une entreprise de 80 à 99 salariés (5 catégories, un dirigeant à plus de 8 000 €).
- **Chez nous** : 96992ea8 n'a que des effectifs de 1 à 9 par valeur. Une case, bloc ` ```effectifs `. Le passage par les effectifs cumulés (rang N/2) devient nécessaire.
- **Point** : 3-056 (inchangé).
- **Variations** : (a) dé à 6 faces lancé N fois, N parmi 50, 100, 200 ou 99, 199, effectifs de 5 à 45 par face ; (b) salaires d'une entreprise : 5 salaires (environ 1 300, 1 500, 1 750, 3 550, 8 500 €), effectif total de 41 à 99. Tirages où la médiane est unique (effectif impair, ou deux valeurs centrales égales), comme v2.
- **Réponse** : la valeur médiane. Erreurs prévues : le rang (N + 1)/2 au lieu de la valeur, la valeur du milieu du tableau (3e colonne), la moyenne (salaires).

### V2 — Moyenne pondérée arrondie au dixième (1 variation à c2497d96, 4e)

- **Chez eux** : 3S14-1, moyenne des notes, des pointures ou des scores « arrondie au dixième ».
- **Chez nous** : c2497d96 ne tire que des moyennes décimales exactes. On ajoute la consigne d'arrondi, petits effectifs (bornes de 4-039).
- **Point** : 4-039 (inchangé).
- **Variations** : pointures d'un club (5 pointures de 35 à 44, effectifs de 1 à 8, total de 10 à 30), moyenne non décimale exacte.
- **Réponse** : moyenne arrondie au dixième. Erreurs prévues : la troncature, la moyenne des valeurs sans les effectifs, la somme des produits ÷ nombre de valeurs (5).

### V3 — Fréquence lue sur un diagramme, et fréquence d'un regroupement (2 variations à 21ebfb57, 5e)

- **Chez eux** : 3S12, parc animalier en diagramme en barres (3 quadrupèdes, 2 à 4 oiseaux) : fréquence d'une espèce, puis des oiseaux, en % arrondi à 0,1 %.
- **Chez nous** : 21ebfb57 donne le total dans le tableau et une catégorie seule. Ici l'élève calcule le total à partir d'un diagramme ` ```barres `, puis regroupe des catégories. Une case `? %`.
- **Point** : 5-134 (inchangé).
- **Variations** : (a) fréquence d'une espèce lue sur le diagramme (6 espèces, effectifs de 2 à 12) ; (b) fréquence des oiseaux (2 ou 3 espèces sur 6). En % arrondi au dixième.
- **Réponse** : 100 × n ÷ N arrondi au dixième. Erreurs prévues : l'effectif n, n ÷ N sans × 100, la troncature (ou, pour b, la fréquence d'une seule espèce d'oiseaux).

### R — Ce que je ne reprends pas

- Étendue (3S14-0, 3S14-1) : 4604b429 couvre notes, températures avec négatifs, tableau et diagramme ; un mois de températures (30 valeurs) déborde sur téléphone.
- Médiane d'effectif pair entre deux valeurs centrales différentes : b2908d52 v2 (4e) l'accepte déjà ; en 3e, 96992ea8 tire des médianes uniques, ce que les bornes permettent (décision c4-3).
- Salaire moyen tiré par le dirigeant : 410c104b (valeur extrême) le fait déjà.
- Lancers de deux dés : rien de plus que V1 côté statistiques.

### Q1 — Pas de point de 3e pour la moyenne ni la fréquence : V2 et V3 vont aux modèles de 4e et de 5e ?

Les bornes mettent la moyenne pondérée en 4e et la fréquence en 5e. Les élèves de 3e ne voient ces
variations que si le prof leur donne ces modèles. Recommandation : oui (pas de niveau 3e ajouté).
