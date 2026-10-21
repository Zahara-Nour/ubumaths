# Brochure SI (BIPM) — référence

`brochure-si-9e-edition-v4.01-fr.pdf` : _Le Système international d'unités (SI)_, 9e édition (2019),
version 4.01 de juin 2026, Bureau international des poids et mesures. Téléchargée le 2026-10-20 depuis
<https://www.bipm.org/documents/20126/41483022/SI-Brochure-9-FR.pdf> (DOI 10.59161/AUEZ1291).

## Ce qui sert à Chiphre (écriture des grandeurs)

| § (page)             | Règle                                                                                                                                                                                      | Chez nous                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| 3 (p. 32)            | Préfixe + unité = un symbole inséparable, élevé à une puissance en bloc : 2,3 cm³ = 2,3 (cm)³                                                                                              | `10 m^3` = 10 m³, jamais (10 m)³                                                |
| 5.2 (p. 35)          | Symboles d'unités = entités mathématiques ; produits et quotients par les règles de l'algèbre ; produit par une espace ou `⋅` ; une seule barre oblique sans parenthèses                   | `kg/m.s` refusé (`notation-unites.md`)                                          |
| 5.4.1 (p. 37)        | Valeur d'une grandeur = produit d'une valeur numérique par une unité, traités par les règles ordinaires de l'algèbre (p = 48 kPa ⇔ p/kPa = 48)                                             | `valueIn`, `tidy` en rationnels                                                 |
| 5.4.3 (p. 38)        | Le nombre précède l'unité, séparé par une espace, qui est un signe de multiplication ; pas d'espace pour °, ′, ″ ; une seule unité par valeur, sauf temps et angle (10 m 23,4 cm interdit) | « un nombre, une espace, une unité » (ADR 0026) ; durées composées `2 h 15 min` |
| 5.4.4 (p. 38)        | Virgule ou point décimal ; zéro obligatoire avant le séparateur (−0,234, pas −,234) ; tranches de trois chiffres séparées par une espace                                                   | `.5 m` n'est pas une écriture correcte                                          |
| 5.4.5, 5.4.7 (p. 39) | La puissance de 10 fait partie de la valeur numérique : 1,674… × 10⁻²⁷ kg, 1,3 × 10⁻⁶                                                                                                      | `10^3 m` = (10³) m                                                              |
| 5.4.6 (p. 39)        | Produit de valeurs de grandeurs : `×` ou parenthèses, (53 m/s) × 10,2 s ; quotient : (20 m)/(5 s) = 4 m/s, jamais a/b/c                                                                    | `2 m × 3 m` = 6 m²                                                              |
