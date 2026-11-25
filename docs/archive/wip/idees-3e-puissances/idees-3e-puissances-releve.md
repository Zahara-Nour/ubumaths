# Relevé « Puissances » de 3e (2026-11-25)

Chantier [`idees-3e-puissances`](idees-3e-puissances-progress.md). Les 5 exercices de la rubrique
puissances de 3e d'une autre plateforme (codes 3C1), lus dans le code source de la copie locale.
Quatre d'entre eux héritent d'un exercice de 4e (4C30-3, 4C33-1, 4C33-0, 4C30-5), lu aussi : le
réglage de 3e change les plages ou ajoute une option. Comparés à nos modèles de tous les niveaux,
relevés en prod. Fiches de phase 0 : [idees-3e-puissances-fiches.md](idees-3e-puissances-fiches.md).

## Nos modèles (prod, 2026-11-25)

Programme de 3e : **3-004** (puissances d'exposant négatif ; a⁰ = 1), **3-005** (multiplier des
puissances), **3-052** (diviser des puissances). Les bornes notent que (aᵐ)ⁿ n'est pas citée en 3e.

- 3e : **15368b02** « Définition d'une puissance à exposant négatif » (3-004, 1 var. : a⁻ᵇ → 1/aᵇ
  écrit, jamais calculé) ; **65110463** « Calculer l'inverse d'un nombre » (3-004, a⁻¹, (1/a)⁻¹,
  (a/b)⁻¹) ; **bb9cff7b** « Multiplier 2 puissances d'un même nombre » (3-005, exposants ±2 à ±5,
  base lettre ou entier positif, l'élève tape l'exposant) ; **18761148** et **8b213d74** « Diviser 2
  puissances d'un même nombre » (3-052, même forme) ; **cf4468c3** « Puissance d'une puissance »
  (rangé **sans point**). Puissances de 10 et notation scientifique : hors de cette rubrique.
- 4e : **d9f2003b** produit → puissance, **3fe98dd9** puissance → produit (4-015, base la lettre a,
  exposants 2 à 7) ; **27d0361f** aᵇ × aᶜ ; **2e9b26b0** puissance d'un produit (4-017) ;
  **0fe6015f** problèmes.
- 2de : **f8736002** notation puissance (bases négatives, 1/(a × … × a) → a⁻ⁿ) ; **8fb1a23a** valeur
  d'une puissance (dont a⁻ⁿ en fraction, a⁰) ; **f6d63dfa** signe ; **634b55b8** une seule puissance
  (dont base −b) ; **fa0dd978** bases cachées (8ᵐ × 4ⁿ / 2ʳ, par puissance de puissance) ;
  **73514cdb** puissance d'un quotient ; **a1ae1558** puissance de puissance.

## Relevé

| Id     | Ce qu'on demande                                                                                                                                                                                                                                                                              | Forme de réponse                                                                | Modèle(s) Chiphre                                                                             | Verdict                                                                                                                                   |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 3C10-1 | Écriture entière ou fractionnaire de aⁿ et a⁻ⁿ, sans exposant ni ×. a de 2 à 9, n de 2 à 6 (couples fixés : 2⁶, 3⁴, 9³ au plus). En 3e : mélange des deux signes                                                                                                                              | saisie d'un entier ou d'une fraction                                            | 15368b02 (écrit 1/aⁿ, ne calcule pas) ; 8fb1a23a v2 (2de)                                     | 🟡 en 3e, aucun modèle ne fait **calculer** a⁻ⁿ ni a⁰ ; la valeur entière de aⁿ relève de la 4e (4-015), aucun modèle de 4e ne la demande |
| 3C10-2 | Écrire sous la forme aⁿ : produit, quotient de même base ; (aᵐ)ⁿ ; aⁿ × bⁿ ; aⁿ / bⁿ (a multiple de b). En 3e : exposants 2 à 5 distincts (le quotient peut donner un exposant négatif), option exposants négatifs (au moins un par question), base positive par défaut, option base négative | saisie de aⁿ ; (−a)ⁿ ou aⁿ acceptés si n pair                                   | bb9cff7b, 18761148, 8b213d74 (3e) ; cf4468c3 (sans point) ; 2e9b26b0 (4e) ; 73514cdb v4 (2de) | 🟡 nos modèles de 3e n'ont jamais de **base négative** ; aⁿ / bⁿ et (aᵐ)ⁿ ne sont pas cités en 3e (déjà en 2de et sans point)             |
| 3C10-3 | Notation puissance dans les deux sens : produit ↔ puissance, base ±, **signe devant** (−3⁴ ≠ (−3)⁴), exposants ± (1/(a × a × a) ↔ a⁻³). Base 2 à 10, exposant 2 à 5 (produit) ou 2 à 8 (puissance)                                                                                            | saisie ; une écriture égale mais d'une autre forme est acceptée avec un message | d9f2003b, 3fe98dd9 (4e, base lettre) ; 15368b02 (3e) ; f8736002 (2de)                         | 🟡 en 3e, manque 1/(a × … × a) → a⁻ⁿ ; en 4e, manquent base négative et signe devant la base                                              |
| 3C10-4 | Lire une puissance : « sept exposant cinq », « sept au carré / au cube », avec des étiquettes à glisser (deux à neuf, moins, exposant, au, carré, cube). Options : base négative, exposant négatif                                                                                            | étiquettes ordonnées                                                            | aucun                                                                                         | ❌ (relève de la 4e, 4-015)                                                                                                               |
| 3C10-5 | Bases cachées : écrire sous la forme aⁿ un quotient où une puissance de la base est écrite en nombre (25 pour 5²) : aⁿ × a²/(aᵐ × aᵖ), a × aⁿ/(a² × a²), et des formes avec 25ᵐ, 125ᵐ (puissance de puissance). Base 2, 3, 5, 7, signe ± en 3e ; option exposants négatifs (bornes −6 à 9)    | saisie de aⁿ                                                                    | fa0dd978 (2de, par puissance de puissance)                                                    | ❌ en 3e                                                                                                                                  |

## Ce que leur format fait et pas le nôtre

- **Étiquettes à glisser** (3C10-4) : notre bloc ```trous (texte à trous avec étiquettes et
  intrus) fait la même chose. Rien ne manque.
- **Écriture égale acceptée avec un message « juste mais pas celle attendue »** (3C10-3) : nos
  erreurs prévues et nos règles de forme jouent ce rôle. Rien ne manque.
