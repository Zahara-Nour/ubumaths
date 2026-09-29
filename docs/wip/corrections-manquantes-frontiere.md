> ✅ **TERMINÉ (2026-09-30)** — 585/636 modèles corrigés en prod. Les 51 sans correction : 49 faits
> mémorisés (F, décidé) + 2 invérifiables (d6268317 réponse dans une image ; 64e55fc7 unité au choix de
> l'élève). Lots et outil : `scripts/corrections/`, `docs/corrections/`, suivi
> `docs/wip/corrections-strategies-progress.md`. Sauvegardes des lignes avant écriture :
> `data/migration-output/backups/corrections-*.json` (local, non versionné).

> Proposition du 2026-09-29, **à corriger par David** : changer la colonne « classe » (F / R / N) ou la stratégie / règle d'une ligne suffit. Cadre validé : F = fait mémorisé (aucune correction) ; R = calcul réfléchi (une stratégie) ; N = règle ou notion (rappel de la règle appliquée). Classement fait sur deux exemples tirés par modèle : un modèle qui mélange plusieurs cas peut être mal rangé (ex. forme décimale d'une fraction : 1/10 mais aussi 7/2).

# Frontière F / R / N proposée — 283 modèles sans correction

## Décisions (2026-09-29)

- **Trous chez les relatifs** (24331791, 84755a7b, b1550840, 372d4f79, 0b6d749f, a5d4c3ee) : passent de
  R-INV à **N-SIGNES** (× et :) ou **N-REL-ADD** (+ et −) — recommandation suivie par David.
- **Défauts, NON tranchés explicitement par David** (proposition conservée, modifiable) : opérations
  à trou dans les tables → F ; compléments à 100 → R-COMPL ; 313 − 126 → R-POSE, 244 + 128 et 164 × 3 →
  R par décomposition. Les autres cas limites (§ 4) gardent aussi la proposition.

Source : `types-par-niveau.md`. Classement fait à partir des exemples générés (les niveaux ne sont pas ordonnés par difficulté). ⚑ = choix à confirmer.

## 1. Synthèse

| Classe                                | Modèles | Unités de travail              |
| ------------------------------------- | ------- | ------------------------------ |
| F — fait mémorisé (pas de correction) | 49      | 0                              |
| R — calcul réfléchi (stratégie)       | 107     | 15 stratégies distinctes       |
| N — règle ou notion                   | 127     | 41 règles distinctes           |
| **Total**                             | **283** | **56 corrections paramétrées** |

Une correction à variables sert tous les modèles d'une même stratégie / règle : l'unité de travail réelle est la colonne de droite. Certaines règles gagneront à être déclinées (ex. `N-DECOMP` entiers / décimaux, `R-INV` selon l'opération), ce qui porterait le total vers ~65.

## 2. Stratégies et règles distinctes

### Stratégies (R)

| code            | stratégie                                                                                                                             | modèles |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `R-INV`         | opération à trou : utiliser l'opération inverse (a + ? = b → b − a ; a × ? = b → b : a ; ? : a = b → a × b), ou compléter en avançant | 42      |
| `R-COMPL`       | compléter par étapes jusqu'à la dizaine / centaine / millier / unité supérieure (29 → 30 ; 7900 → 8000 → 10 000 ; 1,56 → 1,6 → 2)     | 11      |
| `R-X10`         | × ou : par 10, 100, 1000 : chaque chiffre glisse de 1, 2 ou 3 rangs (vers la gauche pour ×, vers la droite pour :)                    | 11      |
| `R-DEC-RANG`    | décimaux : additionner / soustraire rang par rang (unités avec unités, dixièmes avec dixièmes) ; 10 dixièmes = 1 unité                | 8       |
| `R-RANGPARRANG` | décomposer le 2ᵉ terme et calculer rang par rang (centaines, puis dizaines, puis unités)                                              | 7       |
| `R-RANG`        | ajouter / retrancher des dizaines ou centaines entières : seul le chiffre de ce rang change (attention au passage de la centaine)     | 6       |
| `R-DISTRIB`     | décomposer un facteur (distributivité) : 18 × 3 = 10 × 3 + 8 × 3 ; 1,5 × 3 = 1 × 3 + 0,5 × 3                                          | 5       |
| `R-PASS`        | passage de la dizaine : compléter à la dizaine puis ajouter le reste (+9 = +10 − 1 ; 26 + 5 = 26 + 4 + 1)                             | 4       |
| `R-DIV-DIZ`     | diviser des dizaines : 120 = 12 dizaines, 12 : 3 = 4 dizaines = 40 (lien avec la table)                                               | 3       |
| `R-QUAD`        | quadruple = double du double (4 × 12 = 2 × 24)                                                                                        | 3       |
| `R-DOUBLE`      | double = double des dizaines + double des unités (12 → 20 + 4)                                                                        | 2       |
| `R-XDIZ`        | × 20, × 30… × 90 = × 2 (× 3…) puis × 10                                                                                               | 2       |
| `R-PETIT-DIV`   | chercher un petit diviseur (2, 3, 5…) avec les tables / critères de divisibilité, puis diviser                                        | 1       |
| `R-ECART`       | soustraction = écart : avancer du petit nombre au grand par bonds (22 → 30 → 31)                                                      | 1       |
| `R-POSE`        | calcul posé (ou décomposition longue) ⚑                                                                                               | 1       |

### Règles (N)

| code              | règle                                                                                                                                                               | modèles |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------- | --- |
| `N-FRACDEC`       | fraction décimale ↔ écriture décimale : 1/10 = 0,1 ; 1/100 = 0,01 ; 1/1000 = 0,001 (le dénominateur donne le rang du dernier chiffre) ; simplifier si demandé      | 20      |
| `N-DECOMP`        | décomposition selon les rangs (unités, dizaines, centaines… / dixièmes, centièmes…) et recomposition                                                                | 13      |
| `N-SIGNES`        | règle des signes (× et :) : signe positif si le nombre de facteurs négatifs est pair, négatif s'il est impair                                                       | 9       |
| `N-POSITION`      | valeur de position des chiffres (tableau de numération) ; nombre de dizaines ≠ chiffre des dizaines                                                                 | 8       |
| `N-REL-ADD`       | addition de relatifs : même signe → on ajoute les distances à 0 ; signes contraires → on soustrait, signe du plus éloigné de 0 (droite graduée : avancer / reculer) | 8       |
| `N-ENCADR`        | encadrement : garder les chiffres jusqu'au rang demandé (troncature), puis ajouter 1 à ce rang                                                                      | 4       |
| `N-COMPARER-ENT`  | comparer deux entiers : nombre de chiffres, puis chiffre par chiffre depuis la gauche                                                                               | 4       |
| `N-UNITES`        | conversions d'unités : tableau de conversion (1 colonne par unité), convertir dans la même unité avant d'opérer                                                     | 4       |
| `N-OPPOSE-EXPR`   | opposé d'une expression : on change le signe de chaque terme                                                                                                        | 3       |
| `N-PUISS-DEF`     | définition d'une puissance : aⁿ = a × a × … × a (n facteurs)                                                                                                        | 3       |
| `N-ESPACES`       | écriture des grands nombres : groupes de 3 chiffres à partir de la droite                                                                                           | 3       |
| `N-FRAC-MULT`     | produit de fractions : numérateurs entre eux, dénominateurs entre eux (puis simplifier)                                                                             | 3       |
| `N-REL-SUB`       | soustraire un relatif = ajouter son opposé ; −(−a) = +a                                                                                                             | 3       |
| `N-IDREM`         | identité remarquable (a + b)(a − b) = a² − b² (dans les deux sens)                                                                                                  | 2       |
| `N-ECRIT-PRODUIT` | conventions d'écriture : suppression du signe × devant une lettre ou une parenthèse, le nombre s'écrit en premier                                                   | 2       |
| `N-NEUTRE-ABS`    | produit par 0 → 0 (absorbant) ; produit par 1 → inchangé (neutre)                                                                                                   | 2       |
| `N-FACT-COMMUN`   | facteur commun : repérer le facteur présent dans chaque terme de la somme                                                                                           | 2       |
| `N-DIVEUCL`       | égalité de la division euclidienne : a = b × q + r avec 0 ≤ r < b                                                                                                   | 2       |
| `N-VOCAB-OP`      | vocabulaire somme / différence / produit / quotient ; l'opération nommée en premier est la dernière effectuée                                                       | 2       |
| `N-ABS`           | valeur absolue = distance à 0 :                                                                                                                                     | a       | = −a si a < 0 | 2   |
| `N-FRAC-ADD`      | somme / différence de fractions de même dénominateur : on garde le dénominateur, on ajoute / soustrait les numérateurs                                              | 2       |
| `N-PUISS-NEG`     | puissance d'exposant négatif : a⁻ⁿ = 1/aⁿ (donc a⁻¹ = inverse de a)                                                                                                 | 2       |
| `N-UNITES-VOL`    | conversions de volumes : 3 colonnes par unité (1 m³ = 1000 dm³) ; 1 L = 1 dm³                                                                                       | 2       |
| `N-POURCENT`      | définition : p % = p/100                                                                                                                                            | 2       |
| `N-PUISS10`       | puissances de 10 : 10ⁿ = 1 suivi de n zéros, 10⁰ = 1 ; a × 10ⁿ                                                                                                      | 2       |
| `N-COMPARER-REL`  | comparer deux relatifs : un négatif < un positif ; entre deux négatifs, le plus petit est le plus éloigné de 0                                                      | 2       |
| `N-REL-DEF`       | définition d'un négatif : −a = 0 − a                                                                                                                                | 2       |
| `N-PARENTH`       | parenthèses précédées de − : on les supprime en changeant le signe de chaque terme                                                                                  | 1       |
| `N-COMPARER-DEC`  | comparer deux décimaux : parties entières, puis dixièmes, centièmes… (compléter par des zéros)                                                                      | 1       |
| `N-ZEROS`         | zéros inutiles : seuls les zéros à gauche du premier chiffre non nul sont inutiles                                                                                  | 1       |
| `N-GRADUATION`    | droite graduée : trouver le pas (écart entre deux repères ÷ nombre d'intervalles), puis compter                                                                     | 1       |
| `N-DIVISEUR`      | définition : si n = a × b, alors a et b sont des diviseurs de n                                                                                                     | 1       |
| `N-RACINE-AFF`    | racine d'une fonction affine : résoudre ax + b = 0, x = −b/a                                                                                                        | 1       |
| `N-SIGNE-AFF`     | signe de ax + b : signe de a à droite de la racine, signe contraire à gauche                                                                                        | 1       |
| `N-VOCAB-AFF`     | vocabulaire de f(x) = ax + b : a coefficient directeur, b ordonnée à l'origine                                                                                      | 1       |
| `N-INVERSE`       | inverse : 1/a ; inverse de a/b = b/a                                                                                                                                | 1       |
| `N-UNITES-AIRE`   | conversions d'aires : 2 colonnes par unité (1 m² = 100 dm²)                                                                                                         | 1       |
| `N-NOTSCI`        | notation scientifique : a × 10ⁿ avec 1 ≤ a < 10 ; n = nombre de rangs de décalage de la virgule                                                                     | 1       |
| `N-OPPOSES`       | la somme de deux nombres opposés vaut 0                                                                                                                             | 1       |
| `N-REL-ALG`       | somme algébrique : regrouper les termes positifs et les termes négatifs                                                                                             | 1       |
| `N-LIM-OPS`       | opérations sur les limites (tableaux) ; ∞/∞ forme indéterminée                                                                                                      | 1       |

## 3. Table complète par type de tâche

### Calcul littéral / Transformation / Déterminer l'opposé d'une expression (2)

| id       | niv   | classe | stratégie ou règle | exemple                                                                    |
| -------- | ----- | ------ | ------------------ | -------------------------------------------------------------------------- |
| aeb86af9 | 1 [3] | N      | `N-OPPOSE-EXPR`    | Quel est l'opposé de cette expression ? -6 a L'opposé est ?. ⇒ 6 a         |
| 843c3186 | 2 [3] | N      | `N-OPPOSE-EXPR`    | Quel est l'opposé de cette expression ? -6 x - 8 L'opposé est ?. ⇒ 6 x + 8 |

### Calcul littéral / Transformation / Développer $(a+b)(a-b)$ (1)

| id       | niv   | classe | stratégie ou règle | exemple                                                                   |
| -------- | ----- | ------ | ------------------ | ------------------------------------------------------------------------- |
| a6a6c491 | 1 [3] | N      | `N-IDREM`          | Développe et réduis : \left( t - 2 \right) \left( t + 2 \right) ⇒ t^2 - 4 |

### Calcul littéral / Transformation / Enlever les parenthèses (1)

| id       | niv   | classe | stratégie ou règle | exemple                                                                                      |
| -------- | ----- | ------ | ------------------ | -------------------------------------------------------------------------------------------- |
| c32ebff9 | 3 [3] | N      | `N-PARENTH`        | Réécris l'expression en enlevant les parenthèses. -6 a - \left( b - 3 \right) ⇒ -6 a - b + 3 |

### Calcul littéral / Transformation / Factoriser $a^2-b^2$ (1)

| id       | niv   | classe | stratégie ou règle | exemple                                            |
| -------- | ----- | ------ | ------------------ | -------------------------------------------------- |
| ff8082bd | 3 [3] | N      | `N-IDREM`          | Factorise. y^2 - 4 ⇒ \left( y + 2 \right) \left( y |

### Calcul littéral / Transformation / Simplifier à l'aide d'un carré ou d'un cube (1)

| id       | niv   | classe | stratégie ou règle | exemple                                                                        |
| -------- | ----- | ------ | ------------------ | ------------------------------------------------------------------------------ |
| 7410800b | 4 [5] | N      | `N-PUISS-DEF`      | Simplifie l'écriture de cette expression littérale : b \times b \times b ⇒ b^3 |

### Calcul littéral / Transformation / Simplifier le symbole de multiplication (2)

| id       | niv   | classe | stratégie ou règle | exemple                                                                                          |
| -------- | ----- | ------ | ------------------ | ------------------------------------------------------------------------------------------------ |
| 077c01e0 | 1 [5] | N      | `N-ECRIT-PRODUIT`  | Réécris l'expression en la simplifiant. b \times 2 ⇒ 2 b                                         |
| 33b1b496 | 2 [5] | N      | `N-ECRIT-PRODUIT`  | Simplifie l'écriture de cette expression. 4 \times \left( b + 5 \right) ⇒ 4 \left( b + 5 \right) |

### Calcul littéral / Transformation / Simplifier un produit par $0$ ou $1$ (1)

| id       | niv   | classe | stratégie ou règle | exemple                                                    |
| -------- | ----- | ------ | ------------------ | ---------------------------------------------------------- |
| 6fbf1ab2 | 3 [5] | N      | `N-NEUTRE-ABS`     | Écris plus simplement cette expression littérale : 0 b ⇒ 0 |

### Calcul littéral / Transformation / Trouver un facteur commun (2)

| id       | niv   | classe | stratégie ou règle | exemple                                                                                      |
| -------- | ----- | ------ | ------------------ | -------------------------------------------------------------------------------------------- |
| 294c4316 | 1 [4] | N      | `N-FACT-COMMUN`    | Trouve un facteur commun (autre que 1). 2 \times 3 + 9 \times 3 Un facteur commun est ?. ⇒ 3 |
| e66089e0 | 3 [4] | N      | `N-FACT-COMMUN`    | Trouve un facteur commun (autre que 1). 2 y - 2 x Un facteur commun est ?. ⇒ 2               |

### Décimaux / Additionner / Calculer une somme (4)

| id       | niv     | classe | stratégie ou règle | exemple                    |
| -------- | ------- | ------ | ------------------ | -------------------------- |
| 3bbe92f2 | 1 [CM1] | R      | `R-DEC-RANG`       | Calcule. 2.1 + 4.3 ⇒ 6.4   |
| f1a392f5 | 2 [CM1] | R      | `R-DEC-RANG`       | Calcule. 4.34 + 2.1 ⇒ 6.44 |
| a0241952 | 3 [CM1] | R      | `R-DEC-RANG`       | Calcule. 2.2 + 3.8 ⇒ 6     |
| ff3ee576 | 4 [CM1] | R      | `R-DEC-RANG`       | Calcule. 2.1 + 8.9 ⇒ 11    |

### Décimaux / Additionner / Compléter une addition à trou (4)

| id       | niv     | classe | stratégie ou règle | exemple                         |
| -------- | ------- | ------ | ------------------ | ------------------------------- |
| e49b0cf8 | 2 [CM1] | R      | `R-INV`            | Complète. ? + 2.1 = 6.4 ⇒ 4.3   |
| c9c1966e | 3 [CM1] | R      | `R-INV`            | Complète. ? + 2.1 = 6.44 ⇒ 4.34 |
| 421e9fc9 | 4 [CM1] | R      | `R-INV`            | Complète. ? + 2.2 = 6 ⇒ 3.8     |
| b4b5cf8b | 5 [CM1] | R      | `R-INV`            | Complète. ? + 2.1 = 11 ⇒ 8.9    |

### Décimaux / Additionner / Trouver le complément (1)

| id       | niv     | classe | stratégie ou règle | exemple                       |
| -------- | ------- | ------ | ------------------ | ----------------------------- |
| b19167c8 | 1 [CM1] | R      | `R-COMPL`          | Complète. 1.56 + ? = 2 ⇒ 0.44 |

### Décimaux / Apprivoiser / Comparer deux nombres décimaux (1)

| id       | niv     | classe | stratégie ou règle | exemple                                            |
| -------- | ------- | ------ | ------------------ | -------------------------------------------------- |
| 9c0c47ef | 2 [CM1] | N      | `N-COMPARER-DEC`   | Quel est le plus petit de ces deux nombres ? ⇒ QCM |

### Décimaux / Apprivoiser / Connaître la position décimale (4)

| id       | niv     | classe | stratégie ou règle | exemple                                                                                        |
| -------- | ------- | ------ | ------------------ | ---------------------------------------------------------------------------------------------- |
| f96588e4 | 1 [CM1] | N      | `N-POSITION`       | Quel est le chiffre des **centièmes** dans le nombre 5.02 ? Le chiffre des centièmes est ? ⇒ 2 |
| ce00dd64 | 2 [CM1] | N      | `N-POSITION`       | Quel est le chiffre des **dizaines** dans le nombre 345.02 ? Le chiffre des dizaines est ? ⇒ 4 |
| 1b94c415 | 6 [CM2] | N      | `N-POSITION`       | Quel est le chiffre des **unités** dans le nombre 4.502 ? Le chiffre des unités est ?. ⇒ 4     |
| 5cc22ecd | 7 [CM2] | N      | `N-POSITION`       | Quel est le chiffre des **unités** dans le nombre 6834.502 ? Le chiffre des unités est ?. ⇒ 4  |

### Décimaux / Apprivoiser / Décomposer en unités, dixièmes, centièmes (2)

| id       | niv     | classe | stratégie ou règle | exemple                                                                                                      |
| -------- | ------- | ------ | ------------------ | ------------------------------------------------------------------------------------------------------------ |
| 2227cd4e | 1 [CM1] | N      | `N-DECOMP`         | Décompose comme dans cet exemple : 5.34 = 5 + 0.3 + 0.04 5.82 ⇒ 5 + 0.8 + 0.02                               |
| 160f782d | 2 [CM1] | N      | `N-FRACDEC`        | Décompose comme dans cet exemple : 5.34 = 5 + \dfrac{3}{10} + \dfrac{4}{100} 5.82 ⇒ 5 + \dfrac{8}{10} + \df… |

### Décimaux / Apprivoiser / Décomposer en unités, dixièmes, centièmes, millièmes (2)

| id       | niv     | classe | stratégie ou règle | exemple                                                                                                      |
| -------- | ------- | ------ | ------------------ | ------------------------------------------------------------------------------------------------------------ |
| ef7785cf | 3 [CM2] | N      | `N-DECOMP`         | Décompose comme dans cet exemple : 5.346 = 5 + 0.3 + 0.04 + 0.006 5.824 ⇒ 5 + 0.8 + 0.02 + 0.004             |
| 58f7a8dd | 4 [CM2] | N      | `N-FRACDEC`        | Décompose comme dans cet exemple : 5.346 = 5 + \dfrac{3}{10} + \dfrac{4}{100} + \dfrac{6}{ ⇒ 5 + \dfrac{8}{… |

### Décimaux / Apprivoiser / Définition à l'aide de fractions décimales (4)

| id       | niv     | classe | stratégie ou règle | exemple                                                                                  |
| -------- | ------- | ------ | ------------------ | ---------------------------------------------------------------------------------------- |
| 8e32995e | 3 [CM1] | N      | `N-FRACDEC`        | Réécris sous la forme d'un nombre décimal. 5 + \dfrac{8}{10} + \dfrac{2}{100} ⇒ 5.82     |
| 9c602223 | 4 [CM1] | N      | `N-FRACDEC`        | Réécris sous la forme d'un nombre décimal. \dfrac{8}{10} + 5 + \dfrac{2}{100} ⇒ 5.82     |
| a377acaf | 8 [CM2] | N      | `N-FRACDEC`        | Quel est le nombre décimal représenté par cette expression ? 5 + \dfrac{4}{1000} ⇒ 5.004 |
| fcc54919 | 9 [CM2] | N      | `N-FRACDEC`        | Réécris sous la forme d'un nombre décimal. \dfrac{4}{1000} + 5 ⇒ 5.004                   |

### Décimaux / Apprivoiser / Définition à l'aide de fractions décimales (2) (2)

| id       | niv      | classe | stratégie ou règle | exemple                                                                |
| -------- | -------- | ------ | ------------------ | ---------------------------------------------------------------------- |
| c680af72 | 5 [CM1]  | N      | `N-FRACDEC`        | Réécris sous la forme d'un nombre décimal. 5 + \dfrac{2}{100} ⇒ 5.02   |
| 757fc872 | 10 [CM2] | N      | `N-FRACDEC`        | Réécris sous la forme d'un nombre décimal. 5 + \dfrac{2}{1000} ⇒ 5.002 |

### Décimaux / Apprivoiser / Déterminer une forme fractionnaire (2)

| id       | niv   | classe | stratégie ou règle | exemple                                                                                                   |
| -------- | ----- | ------ | ------------------ | --------------------------------------------------------------------------------------------------------- |
| 000368e1 | 1 [6] | N      | `N-FRACDEC`        | Réécris ce nombre décimal sous forme fractionnaire. 0.5 ⇒ \dfrac{1}{2}                                    |
| c1a83c8f | 2 [6] | N      | `N-FRACDEC`        | Réécris ce nombre décimal sous forme fractionnaire, en simplifiant la fraction au maximum. ⇒ \dfrac{1}{2} |

### Décimaux / Apprivoiser / Encadrer un nombre décimal au centième près (1)

| id       | niv     | classe | stratégie ou règle | exemple                                                                 |
| -------- | ------- | ------ | ------------------ | ----------------------------------------------------------------------- |
| 6379fa20 | 3 [CM1] | N      | `N-ENCADR`         | Encadre ce nombre décimal au centième près. ? < 2.055 < ? ⇒ 2.05 ; 2.06 |

### Décimaux / Apprivoiser / Encadrer un nombre décimal au dixième près (1)

| id       | niv     | classe | stratégie ou règle | exemple                                                           |
| -------- | ------- | ------ | ------------------ | ----------------------------------------------------------------- |
| 32724446 | 2 [CM1] | N      | `N-ENCADR`         | Encadre ce nombre décimal au dixième près. ? < 2.05 < ? ⇒ 2 ; 2.1 |

### Décimaux / Apprivoiser / Encadrer un nombre décimal par deux entiers consécutifs (1)

| id       | niv     | classe | stratégie ou règle | exemple                                                                     |
| -------- | ------- | ------ | ------------------ | --------------------------------------------------------------------------- |
| fac5225d | 1 [CM1] | N      | `N-ENCADR`         | Encadre ce nombre décimal par deux entiers consécutifs. ? < 2.1 < ? ⇒ 2 ; 3 |

### Décimaux / Apprivoiser / Trouver l'entier supérieur ou inférieur le plus proche (1)

| id       | niv     | classe | stratégie ou règle | exemple                                                                                   |
| -------- | ------- | ------ | ------------------ | ----------------------------------------------------------------------------------------- |
| b26e8a84 | 1 [CM1] | N      | `N-ENCADR`         | Quel est le plus grand entier inférieur à 2.1 ? Le plus grand entier inférieur est ?. ⇒ 2 |

### Décimaux / Diviser / Calculer un quotient (4)

| id       | niv     | classe | stratégie ou règle | exemple                     |
| -------- | ------- | ------ | ------------------ | --------------------------- |
| 0629645f | 1 [CM1] | R      | `R-X10`            | Calcule. 0.7 : 10 ⇒ 0.07    |
| 590169c4 | 2 [CM2] | R      | `R-X10`            | Calcule. 0.7 : 100 ⇒ 0.007  |
| de15a4b0 | 3 [CM2] | R      | `R-X10`            | Calcule. 8 : 1000 ⇒ 0.008   |
| a94ddf87 | 4 [CM2] | R      | `R-X10`            | Calcule. 73.99 : 10 ⇒ 7.399 |

### Décimaux / Diviser / Compléter une division à trou (5)

| id       | niv     | classe | stratégie ou règle | exemple                          |
| -------- | ------- | ------ | ------------------ | -------------------------------- |
| 668b1fe6 | 1 [CM1] | R      | `R-INV`            | Complète. ? : 10 = 0.07 ⇒ 0.7    |
| 651836d4 | 2 [CM2] | R      | `R-INV`            | Complète. ? : 100 = 0.007 ⇒ 0.7  |
| 4b1968b9 | 3 [CM2] | R      | `R-INV`            | Complète. ? : 1000 = 0.008 ⇒ 8   |
| 45e06ece | 4 [CM2] | R      | `R-INV`            | Complète. ? : 10 = 7.399 ⇒ 73.99 |
| 6632e5c2 | 5 [6]   | R      | `R-INV`            | Complète. ? : 0.01 = 200 ⇒ 2     |

### Décimaux / Multiplier / Calculer un produit (5)

| id       | niv     | classe | stratégie ou règle | exemple                         |
| -------- | ------- | ------ | ------------------ | ------------------------------- |
| 69f6a332 | 1 [CM1] | R      | `R-X10`            | Calcule. 0.4 \times 10 ⇒ 4      |
| e38d205a | 2 [CM1] | R      | `R-X10`            | Calcule. 0.4 \times 100 ⇒ 40    |
| 19323604 | 3 [CM1] | R      | `R-X10`            | Calcule. 0.4 \times 1000 ⇒ 400  |
| 814a46a9 | 4 [CM2] | R      | `R-DISTRIB`        | Calcule. 1.5 \times 3 ⇒ 4.5     |
| 819df2a9 | 4 [6]   | R      | `R-X10`            | Calcule. 0.708 \times 10 ⇒ 7.08 |

### Décimaux / Soustraire / Calculer une différence (4)

| id       | niv     | classe | stratégie ou règle | exemple                    |
| -------- | ------- | ------ | ------------------ | -------------------------- |
| b100ddb2 | 1 [CM1] | R      | `R-DEC-RANG`       | Calcule. 3.2 - 1.1 ⇒ 2.1   |
| 6a16303a | 2 [CM1] | R      | `R-DEC-RANG`       | Calcule. 12.2 - 6.1 ⇒ 6.1  |
| b9a9048a | 3 [CM1] | R      | `R-DEC-RANG`       | Calcule. 3.25 - 1.1 ⇒ 2.15 |
| 7d57fb3b | 4 [CM1] | R      | `R-DEC-RANG`       | Calcule. 3.1 - 1.4 ⇒ 1.7   |

### Entiers / Additionner / Calculer une somme (17)

| id       | niv      | classe | stratégie ou règle | exemple                   |
| -------- | -------- | ------ | ------------------ | ------------------------- |
| 12c377ec | 1 [CP]   | F      | —                  | Calcule. 2 + 8 ⇒ 10       |
| 0eb500fe | 2 [CP]   | F      | —                  | Calcule. 4 + 2 ⇒ 6        |
| 7feb1566 | 3 [CP]   | F      | —                  | Calcule. 2 + 2 ⇒ 4        |
| aeca7054 | 4 [CP]   | F      | —                  | Calcule. 4 + 1 ⇒ 5        |
| 716d5c68 | 5 [CP]   | R      | `R-RANGPARRANG`    | Calcule. 25 + 43 ⇒ 68     |
| 5fea90e6 | 6 [CP]   | R      | `R-PASS`           | Calcule. 32 + 9 ⇒ 41      |
| 54468151 | 7 [CP]   | R      | `R-RANG`           | Calcule. 31 + 40 ⇒ 71     |
| 713b71ab | 8 [CE1]  | F      | —                  | Calcule. 3 + 8 ⇒ 11       |
| ce3247c0 | 9 [CE1]  | R      | `R-RANGPARRANG`    | Calcule. 25 + 12 ⇒ 37     |
| 579d0b00 | 10 [CE1] | R      | `R-RANG`           | Calcule. 205 + 40 ⇒ 245   |
| 5706769f | 11 [CE2] | R      | `R-COMPL`          | Calcule. 13 + 87 ⇒ 100    |
| 83c1feb9 | 12 [CE2] | R      | `R-PASS`           | Calcule. 13 + 27 ⇒ 40     |
| df3cb8ad | 13 [CE2] | F      | —                  | Calcule. 20 + 6 ⇒ 26      |
| ed5f5f52 | 14 [CE2] | R      | `R-RANG`           | Calcule. 2055 + 40 ⇒ 2095 |
| e6df0a85 | 15 [CE2] | R      | `R-PASS`           | Calcule. 26 + 17 ⇒ 43     |
| 5d4dfd32 | 16 [CM1] | R      | `R-RANGPARRANG`    | Calcule. 253 + 123 ⇒ 376  |
| fe9df9ba | 17 [CM1] | R      | `R-RANGPARRANG`    | Calcule. 244 + 128 ⇒ 372  |

### Entiers / Additionner / Compléter une addition (1)

| id       | niv      | classe | stratégie ou règle | exemple                    |
| -------- | -------- | ------ | ------------------ | -------------------------- |
| 32beec3b | 12 [CM1] | R      | `R-INV`            | Complète. 26 + ? = 43 ⇒ 17 |

### Entiers / Additionner / Compléter une addition à trou (12)

| id       | niv      | classe | stratégie ou règle | exemple                        |
| -------- | -------- | ------ | ------------------ | ------------------------------ |
| 00497e5e | 1 [CP]   | F      | —                  | Complète. 4 + ? = 6 ⇒ 2        |
| 987d3641 | 2 [CP]   | F      | —                  | Complète. ? + 2 = 4 ⇒ 2        |
| cf0d20d5 | 3 [CP]   | F      | —                  | Complète. 4 + ? = 5 ⇒ 1        |
| 4372eb03 | 4 [CP]   | R      | `R-INV`            | Complète. 26 + ? = 38 ⇒ 12     |
| 8a843682 | 5 [CP]   | R      | `R-INV`            | Complète. 32 + ? = 41 ⇒ 9      |
| 1507465f | 6 [CP]   | R      | `R-INV`            | Complète. 31 + ? = 71 ⇒ 40     |
| 76d8c8ee | 7 [CE1]  | F      | —                  | Complète. ? + 3 = 5 ⇒ 2        |
| 777dc505 | 8 [CE1]  | R      | `R-INV`            | Complète. 25 + ? = 37 ⇒ 12     |
| de71495c | 9 [CE1]  | R      | `R-INV`            | Complète. 205 + ? = 245 ⇒ 40   |
| 18b7cc5c | 10 [CE2] | R      | `R-INV`            | Complète. ? + 6 = 26 ⇒ 20      |
| 22b8da83 | 11 [CE2] | R      | `R-INV`            | Complète. 2055 + ? = 2095 ⇒ 40 |
| 6661b9ae | 13 [CM2] | R      | `R-INV`            | Complète. 253 + ? = 376 ⇒ 123  |

### Entiers / Additionner / Table d'addition' (9)

| id       | niv    | classe | stratégie ou règle | exemple    |
| -------- | ------ | ------ | ------------------ | ---------- |
| 0830bc42 | 1 [CP] | F      | —                  | 2 + 1 ⇒ 3  |
| f316e71e | 2 [CP] | F      | —                  | 2 + 2 ⇒ 4  |
| 3acfd757 | 3 [CP] | F      | —                  | 2 + 3 ⇒ 5  |
| 9e936c05 | 4 [CP] | F      | —                  | 2 + 4 ⇒ 6  |
| 38d05331 | 5 [CP] | F      | —                  | 2 + 5 ⇒ 7  |
| 03d73489 | 6 [CP] | F      | —                  | 2 + 6 ⇒ 8  |
| 14db0ac6 | 7 [CP] | F      | —                  | 2 + 7 ⇒ 9  |
| ce407cd3 | 8 [CP] | F      | —                  | 2 + 8 ⇒ 10 |
| 1bd5fec6 | 9 [CP] | F      | —                  | 2 + 9 ⇒ 11 |

### Entiers / Additionner / Trouver le complément (10)

| id       | niv      | classe | stratégie ou règle | exemple                                                                         |
| -------- | -------- | ------ | ------------------ | ------------------------------------------------------------------------------- |
| 0e5372a4 | 1 [CP]   | F      | —                  | Complète. 2 + ? = 10 ⇒ 8                                                        |
| c381596f | 2 [CE1]  | R      | `R-COMPL`          | Complète. 29 + ? = 30 ⇒ 1                                                       |
| cba5b70a | 3 [CE1]  | R      | `R-COMPL`          | Complète. 3 + ? = 30 ⇒ 27                                                       |
| b2ad1cc0 | 4 [CE1]  | R      | `R-COMPL`          | Complète. 20 + ? = 100 ⇒ 80                                                     |
| 6ac9df91 | 5 [CE1]  | R      | `R-COMPL`          | Complète. 293 + ? = 300 ⇒ 7                                                     |
| ff427b27 | 6 [CE2]  | R      | `R-COMPL`          | Complète. 20 + ? = 100 ⇒ 80                                                     |
| d186d4ef | 7 [CE2]  | R      | `R-COMPL`          | Complète. 200 + ? = 1000 ⇒ 800                                                  |
| 115745fe | 8 [CE2]  | R      | `R-COMPL`          | Complète. 2930 + ? = 3000 ⇒ 70                                                  |
| 45e9fa53 | 9 [CM1]  | R      | `R-COMPL`          | Complète. 7900 + ? = 10000 ⇒ 2100                                               |
| 17a3c039 | 10 [CM1] | R      | `R-COMPL`          | Combien faut-il ajouter à 7900 pour obtenir 10\,000 ? Il faut ajouter ?. ⇒ 2100 |

### Entiers / Additionner / Trouver le double (1)

| id       | niv     | classe | stratégie ou règle | exemple                                                |
| -------- | ------- | ------ | ------------------ | ------------------------------------------------------ |
| 022130ca | 4 [CE1] | R      | `R-DOUBLE`         | Quel est le double de 12 ? Le double de 12 est ?. ⇒ 24 |

### Entiers / Apprivoiser / Comparer deux nombres entiers (4)

| id       | niv     | classe | stratégie ou règle | exemple                                         |
| -------- | ------- | ------ | ------------------ | ----------------------------------------------- |
| 943151d0 | 1 [CP]  | N      | `N-COMPARER-ENT`   | Quel est le plus petit de ces 2 nombres ? ⇒ QCM |
| d4245f88 | 2 [CE1] | N      | `N-COMPARER-ENT`   | Quel est le plus petit de ces 2 nombres ? ⇒ QCM |
| 68775a97 | 3 [CE2] | N      | `N-COMPARER-ENT`   | Quel est le plus petit de ces 2 nombres ? ⇒ QCM |
| 0021eee7 | 4 [CM1] | N      | `N-COMPARER-ENT`   | Quel est le plus petit de ces 2 nombres ? ⇒ QCM |

### Entiers / Apprivoiser / Connaître la position décimale (3)

| id       | niv     | classe | stratégie ou règle | exemple                                                     |
| -------- | ------- | ------ | ------------------ | ----------------------------------------------------------- |
| 5bd4b19a | 1 [CP]  | N      | `N-POSITION`       | Dans le nombre 20, le chiffre des **unités** est ?. ⇒ 0     |
| 17ed1fc1 | 2 [CE1] | N      | `N-POSITION`       | Dans le nombre 205, le chiffre des **centaines** est ?. ⇒ 2 |
| 13d52989 | 4 [CE2] | N      | `N-POSITION`       | Dans le nombre 2054, le chiffre des unités est ?. ⇒ 4       |

### Entiers / Apprivoiser / Décomposer l'écriture décimale d'un nombre (3)

| id       | niv     | classe | stratégie ou règle | exemple                                                                                                     |
| -------- | ------- | ------ | ------------------ | ----------------------------------------------------------------------------------------------------------- |
| 52c4d773 | 1 [CP]  | N      | `N-DECOMP`         | Décompose ce nombre en dizaines et unités comme dans cet exemple : 74 = 70 + 4. 21 ⇒ 20 + 1                 |
| 9827242b | 3 [CE1] | N      | `N-DECOMP`         | Décompose ce nombre en centaines, dizaines et unités comme dans l'exemple : 235 = 200 + 30 ⇒ 200 + 10 + 5   |
| 495a397f | 4 [CE1] | N      | `N-DECOMP`         | Décompose ce nombre comme dans cet exemple : 345 = \left( 3 \times 100 \right) + \left( 4 ⇒ \left( 2 \time… |

### Entiers / Apprivoiser / Décomposer l'écriture décimale un nombre (4)

| id       | niv      | classe | stratégie ou règle | exemple                                                                                                      |
| -------- | -------- | ------ | ------------------ | ------------------------------------------------------------------------------------------------------------ |
| 7a34967c | 6 [CE2]  | N      | `N-DECOMP`         | Décompose ce nombre comme dans cet exemple : 2345 = 2000 + 300 + 40 + 5 2155 ⇒ 2000 + 100 + 50 + 5           |
| 823f9e95 | 7 [CE2]  | N      | `N-DECOMP`         | Décompose ce nombre comme dans cet exemple : 2345 = \left( 2 \times 1000 \right) + \left( ⇒ \left( 2 \time…  |
| a6045667 | 10 [CM1] | N      | `N-DECOMP`         | Décompose ce nombre en dizaines de milliers, milliers, centaines, dizaines et unités, comm ⇒ 20000 + 1000 +… |
| 7612e79a | 11 [CM1] | N      | `N-DECOMP`         | Décompose ce nombre comme dans cet exemple : 23456 = \left( 2 \times 10000 \right) + \left ⇒ \left( 2 \time… |

### Entiers / Apprivoiser / Décomposition décimale -> nombre entier (2)

| id       | niv     | classe | stratégie ou règle | exemple                                                                                            |
| -------- | ------- | ------ | ------------------ | -------------------------------------------------------------------------------------------------- |
| accbfd16 | 8 [CM1] | N      | `N-DECOMP`         | Réécris cette expression sous la forme d'un nombre entier. \left( 2 \times 10000 \right) + ⇒ 20543 |
| 7c642d2f | 9 [CM1] | N      | `N-DECOMP`         | Réécris cette expression sous la forme d'un nombre entier. \left( 4 \times 10 \right) + \l ⇒ 20543 |

### Entiers / Apprivoiser / Décomposition décimale -> nombre entier (jusqu'aux centaines) (1)

| id       | niv     | classe | stratégie ou règle | exemple                                                                                          |
| -------- | ------- | ------ | ------------------ | ------------------------------------------------------------------------------------------------ |
| 3eedd905 | 2 [CE1] | N      | `N-DECOMP`         | Réécris cette expression sous la forme d'un nombre entier. \left( 2 \times 100 \right) + 5 ⇒ 205 |

### Entiers / Apprivoiser / Décomposition décimale -> nombre entier (jusqu'aux milliers) (1)

| id       | niv     | classe | stratégie ou règle | exemple                                                                                          |
| -------- | ------- | ------ | ------------------ | ------------------------------------------------------------------------------------------------ |
| 6ef8aedf | 5 [CE2] | N      | `N-DECOMP`         | Réécris cette expression sous la forme d'un nombre entier. \left( 2 \times 1000 \right) + ⇒ 2054 |

### Entiers / Apprivoiser / Ecrire un grand nombre entier avec des espaces (3)

| id       | niv     | classe | stratégie ou règle | exemple                                                  |
| -------- | ------- | ------ | ------------------ | -------------------------------------------------------- |
| 906252f8 | 5 [CE2] | N      | `N-ESPACES`        | Réécris en espaçant correctement les chiffres. ? ⇒ 2800  |
| bd760867 | 6 [CM1] | N      | `N-ESPACES`        | Réécris en espaçant correctement les chiffres. ? ⇒ 8499  |
| 0dd3de90 | 8 [CM2] | N      | `N-ESPACES`        | Réécris en espaçant correctement les chiffres. ? ⇒ 84990 |

### Entiers / Apprivoiser / Ecrire un grand nombre entier sans les zéros inutiles (1)

| id       | niv     | classe | stratégie ou règle | exemple                                                           |
| -------- | ------- | ------ | ------------------ | ----------------------------------------------------------------- |
| cda36cc2 | 7 [CM1] | N      | `N-ZEROS`          | Réécris ce nombre entier en enlevant les zéros inutiles. ? ⇒ 2055 |

### Entiers / Apprivoiser / Enigme pour trouver un nombre (1)

| id       | niv     | classe | stratégie ou règle | exemple                                                                                            |
| -------- | ------- | ------ | ------------------ | -------------------------------------------------------------------------------------------------- |
| ec030034 | 9 [CM2] | N      | `N-POSITION`       | Je suis un nombre à 3 chiffres. Mon **chiffre des unités** est 6. Le \*\*nombre de mes dizai ⇒ 186 |

### Entiers / Apprivoiser / Repérer sur une demi-droite graduée (1)

| id       | niv     | classe | stratégie ou règle | exemple                                                                                          |
| -------- | ------- | ------ | ------------------ | ------------------------------------------------------------------------------------------------ |
| d6268317 | 1 [CE1] | N      | `N-GRADUATION`     | Quel est ce nombre ? Le nombre est ?. ![Question image](entiers/reperage/droite_graduee-10 ⇒ 210 |

### Entiers / Diviser / Calculer un quotient entier (3)

| id       | niv     | classe | stratégie ou règle | exemple               |
| -------- | ------- | ------ | ------------------ | --------------------- |
| e6ddf5d7 | 1 [CE2] | F      | —                  | Calcule. 6 : 2 ⇒ 3    |
| 61baef92 | 2 [CM1] | R      | `R-DIV-DIZ`        | Calcule. 90 : 3 ⇒ 30  |
| 09f22a2f | 3 [CM1] | R      | `R-DIV-DIZ`        | Calcule. 120 : 3 ⇒ 40 |

### Entiers / Diviser / Compléter l'égalité d'une division euclidienne (1)

| id       | niv     | classe | stratégie ou règle | exemple                                                                                            |
| -------- | ------- | ------ | ------------------ | -------------------------------------------------------------------------------------------------- |
| 14a51794 | 3 [CE2] | N      | `N-DIVEUCL`        | Complète l'égalité de la division euclidienne de 8 par 3 : 8 = \left( 3 \times ? \right) + ⇒ 2 ; 2 |

### Entiers / Diviser / Compléter une division à trou (2)

| id       | niv     | classe | stratégie ou règle | exemple                 |
| -------- | ------- | ------ | ------------------ | ----------------------- |
| 8d6d79a2 | 1 [CE2] | R      | `R-INV`            | Complète. ? : 2 = 3 ⇒ 6 |
| 6ca01910 | 2 [CE2] | R      | `R-INV`            | Complète. 6 : ? = 3 ⇒ 2 |

### Entiers / Diviser / Effectuer une division euclidienne (1)

| id       | niv     | classe | stratégie ou règle | exemple                                                                                                   |
| -------- | ------- | ------ | ------------------ | --------------------------------------------------------------------------------------------------------- |
| 15ed5af4 | 4 [CE2] | N      | `N-DIVEUCL`        | Écris l'égalité correspondant à la division euclidienne de 7 par 2. 7 = ? ⇒ \left( 3 \times 2 \right) + 1 |

### Entiers / Diviser / Trouver un diviseur (1)

| id       | niv     | classe | stratégie ou règle | exemple                                                                                        |
| -------- | ------- | ------ | ------------------ | ---------------------------------------------------------------------------------------------- |
| bd21a9d7 | 1 [CE2] | N      | `N-DIVISEUR`       | Trouve un diviseur de 6 (autre que 1 et 6), sachant que : 6 = 3 \times 2 Un diviseur est ? ⇒ 3 |

### Entiers / Multiplier / Calculer un carré (1)

| id       | niv   | classe | stratégie ou règle | exemple           |
| -------- | ----- | ------ | ------------------ | ----------------- |
| 3107454a | 1 [5] | F      | —                  | Calcule. 4^2 ⇒ 16 |

### Entiers / Multiplier / Calculer un produit d'entiers (8)

| id       | niv     | classe | stratégie ou règle | exemple                       |
| -------- | ------- | ------ | ------------------ | ----------------------------- |
| 220b954f | 1 [CE2] | F      | —                  | Calcule. 3 \times 2 ⇒ 6       |
| 59b781cc | 1 [CM1] | R      | `R-DISTRIB`        | Calcule. 3 \times 25 ⇒ 75     |
| 4063af49 | 1 [CE1] | R      | `R-X10`            | Calcule. 10 \times 20 ⇒ 200   |
| e58b1357 | 2 [CM2] | R      | `R-DISTRIB`        | Calcule. 4 \times 15 ⇒ 60     |
| 2c3a18e7 | 2 [CE2] | R      | `R-X10`            | Calcule. 100 \times 20 ⇒ 2000 |
| 8390762c | 3 [CM1] | R      | `R-X10`            | Calcule. 21 \times 10 ⇒ 210   |
| 3d0d175f | 7 [CM2] | R      | `R-DISTRIB`        | Calcule. 18 \times 3 ⇒ 54     |
| d793de49 | 8 [6]   | R      | `R-DISTRIB`        | Calcule. 164 \times 3 ⇒ 492   |

### Entiers / Multiplier / Combien de fois ... dans .... (1)

| id       | niv      | classe | stratégie ou règle | exemple                                                    |
| -------- | -------- | ------ | ------------------ | ---------------------------------------------------------- |
| 4ee04b22 | 14 [CM1] | R      | `R-DIV-DIZ`        | Dans 80, combien de fois 2 ? On peut mettre ? fois 2. ⇒ 40 |

### Entiers / Multiplier / Compléter une multiplication à trou (19)

| id       | niv      | classe | stratégie ou règle | exemple                             |
| -------- | -------- | ------ | ------------------ | ----------------------------------- |
| b8e781f6 | 1 [CE1]  | F      | —                  | Complète. 2 \times ? = 6 ⇒ 3        |
| 0d57cc73 | 2 [CE1]  | F      | —                  | Complète. 3 \times ? = 9 ⇒ 3        |
| b1c712cd | 3 [CE1]  | F      | —                  | Complète. 4 \times ? = 12 ⇒ 3       |
| a0ac57ee | 4 [CE1]  | F      | —                  | Complète. 5 \times ? = 15 ⇒ 3       |
| 89525edd | 5 [CE2]  | F      | —                  | Complète. 6 \times ? = 18 ⇒ 3       |
| bd127419 | 6 [CE2]  | F      | —                  | Complète. 7 \times ? = 21 ⇒ 3       |
| 91ebd2ad | 7 [CE2]  | F      | —                  | Complète. 8 \times ? = 24 ⇒ 3       |
| f4abc638 | 8 [CE2]  | F      | —                  | Complète. 9 \times ? = 27 ⇒ 3       |
| 2042caf5 | 9 [CE2]  | F      | —                  | Complète. 3 \times ? = 9 ⇒ 3        |
| 31c3963e | 10 [CE2] | R      | `R-INV`            | Complète. 20 \times ? = 40 ⇒ 2      |
| 9c32b3cc | 11 [CE2] | R      | `R-INV`            | Complète. 20 \times ? = 500 ⇒ 25    |
| ee0ae544 | 12 [CM1] | R      | `R-INV`            | Complète. ? \times 40 = 80 ⇒ 2      |
| e4e3b16e | 13 [CM1] | R      | `R-INV`            | Complète. 2 \times ? = 80 ⇒ 40      |
| a5d5a7a0 | 15 [CM1] | R      | `R-INV`            | Complète. ? \times 30 = 600 ⇒ 20    |
| 1af7263e | 16 [CM1] | N      | `N-NEUTRE-ABS`     | Complète. ? \times 25 = 25 ⇒ 1      |
| ae96d7af | 17 [CM2] | R      | `R-INV`            | Complète. ? \times 30 = 18000 ⇒ 600 |
| 883fbf29 | 18 [CM2] | R      | `R-INV`            | Complète. ? \times 5 = 60 ⇒ 12      |
| 7ac0e898 | 19 [CM2] | R      | `R-INV`            | Complète. ? \times 50 = 200 ⇒ 4     |
| d22731c2 | 20 [CM2] | R      | `R-INV`            | Complète. ? \times 25 = 200 ⇒ 8     |

### Entiers / Multiplier / Décomposer un entier en produit (1)

| id       | niv     | classe | stratégie ou règle | exemple                                                                                            |
| -------- | ------- | ------ | ------------------ | -------------------------------------------------------------------------------------------------- |
| 7caa084f | 1 [CM1] | R      | `R-PETIT-DIV`      | Décompose ce nombre en un produit de 2 facteurs (1 n'est pas un facteur autorisé). 12 ⇒ 2 \times 6 |

### Entiers / Multiplier / Multiplier par $30$, $40$, $50$, $60$, $70$, $80$, $90$ (1)

| id       | niv     | classe | stratégie ou règle | exemple                   |
| -------- | ------- | ------ | ------------------ | ------------------------- |
| 68bb6eda | 4 [CM1] | R      | `R-XDIZ`           | Calcule. 2 \times 40 ⇒ 80 |

### Entiers / Multiplier / Multiplier par 20 (1)

| id       | niv     | classe | stratégie ou règle | exemple                   |
| -------- | ------- | ------ | ------------------ | ------------------------- |
| 0e39dbfb | 2 [CE2] | R      | `R-XDIZ`           | Calcule. 20 \times 2 ⇒ 40 |

### Entiers / Multiplier / Table de multiplication (9)

| id       | niv     | classe | stratégie ou règle | exemple                  |
| -------- | ------- | ------ | ------------------ | ------------------------ |
| c956b35f | 1 [CE1] | F      | —                  | Calcule. 1 \times 4 ⇒ 4  |
| cf28acc2 | 2 [CE1] | F      | —                  | Calcule. 2 \times 4 ⇒ 8  |
| 5e316657 | 3 [CE1] | F      | —                  | Calcule. 3 \times 4 ⇒ 12 |
| 3ba51eb3 | 4 [CE1] | F      | —                  | Calcule. 4 \times 4 ⇒ 16 |
| 9d2df894 | 5 [CE1] | F      | —                  | Calcule. 5 \times 4 ⇒ 20 |
| 523f3f10 | 6 [CE2] | F      | —                  | Calcule. 6 \times 4 ⇒ 24 |
| 6c53e785 | 7 [CE2] | F      | —                  | Calcule. 7 \times 4 ⇒ 28 |
| b78363f9 | 8 [CE2] | F      | —                  | Calcule. 8 \times 4 ⇒ 32 |
| c32bfeba | 9 [CE2] | F      | —                  | Calcule. 9 \times 4 ⇒ 36 |

### Entiers / Multiplier / Trouver le double (1)

| id       | niv     | classe | stratégie ou règle | exemple                                                           |
| -------- | ------- | ------ | ------------------ | ----------------------------------------------------------------- |
| 47f97c9f | 4 [CE1] | R      | `R-DOUBLE`         | Quel est le résultat de 2 \times 12 ? Le double de 12 est ?. ⇒ 24 |

### Entiers / Multiplier / Trouver le quadruple (4)

| id       | niv     | classe | stratégie ou règle | exemple                                                       |
| -------- | ------- | ------ | ------------------ | ------------------------------------------------------------- |
| 4988fdac | 1 [CE2] | F      | —                  | Quel est le quadruple de 2 ? Le quadruple de 2 est ?. ⇒ 8     |
| 56b2737d | 2 [CE2] | R      | `R-QUAD`           | Quel est le quadruple de 20 ? Le quadruple de 20 est ?. ⇒ 80  |
| b7cd1846 | 4 [CM1] | R      | `R-QUAD`           | Quel est le quadruple de 12 ? Le quadruple de 12 est ?. ⇒ 48  |
| 3c79eb9c | 5 [CM1] | R      | `R-QUAD`           | Quel est le quadruple de 25 ? Le quadruple de 25 est ?. ⇒ 100 |

### Entiers / Soustraire / Calculer une différence (résultat positif) (11)

| id       | niv      | classe | stratégie ou règle | exemple           |
| -------- | -------- | ------ | ------------------ | ----------------- |
| 73550ee8 | 1 [CP]   | F      | —                  | 6 - 1 ⇒ 5         |
| fc29d0c2 | 2 [CP]   | R      | `R-RANGPARRANG`    | 26 - 1 ⇒ 25       |
| 201b17f0 | 3 [CP]   | R      | `R-RANG`           | 35 - 20 ⇒ 15      |
| acf15102 | 4 [CE1]  | F      | —                  | 11 - 3 ⇒ 8        |
| 83aa2196 | 5 [CE1]  | R      | `R-PASS`           | 21 - 6 ⇒ 15       |
| b0b30022 | 6 [CE1]  | R      | `R-RANGPARRANG`    | 326 - 12 ⇒ 314    |
| 4d94ec28 | 7 [CE1]  | R      | `R-RANG`           | 315 - 100 ⇒ 215   |
| 810f1824 | 8 [CE1]  | R      | `R-RANGPARRANG`    | 2265 - 23 ⇒ 2242  |
| a0cae721 | 9 [CE2]  | R      | `R-RANG`           | 2054 - 400 ⇒ 1654 |
| 5f78bd0e | 10 [CE2] | R      | `R-ECART`          | 31 - 22 ⇒ 9       |
| 08fbcd26 | 11 [CM1] | R      | `R-POSE`           | 313 - 126 ⇒ 187   |

### Entiers / Soustraire / Compléter une soustraction à trou (8)

| id       | niv     | classe | stratégie ou règle | exemple                         |
| -------- | ------- | ------ | ------------------ | ------------------------------- |
| e7e7662d | 2 [CP]  | R      | `R-INV`            | Complète. 26 - ? = 25 ⇒ 1       |
| 1e93a463 | 3 [CP]  | R      | `R-INV`            | Complète. 35 - ? = 15 ⇒ 20      |
| 48cac183 | 4 [CE1] | F      | —                  | Complète. 11 - ? = 8 ⇒ 3        |
| 27bf3101 | 5 [CE1] | R      | `R-INV`            | Complète. 21 - ? = 15 ⇒ 6       |
| caa02a8c | 6 [CE1] | R      | `R-INV`            | Complète. 326 - ? = 314 ⇒ 12    |
| 3d6def48 | 7 [CE1] | R      | `R-INV`            | Complète. 315 - ? = 215 ⇒ 100   |
| 7d2d412b | 8 [CE1] | R      | `R-INV`            | Complète. 2265 - ? = 2242 ⇒ 23  |
| 9f4cbd66 | 9 [CE2] | R      | `R-INV`            | Complète. 2054 - ? = 1654 ⇒ 400 |

### Entiers / Soustraire / Compléter une soustraction à trou (résultat positif) (1)

| id       | niv    | classe | stratégie ou règle | exemple                 |
| -------- | ------ | ------ | ------------------ | ----------------------- |
| fa57c725 | 1 [CP] | F      | —                  | Complète. 3 - ? = 1 ⇒ 2 |

### Entiers / Vocabulaire / Traduire une phrase en expression mathématique (2)

| id       | niv   | classe | stratégie ou règle | exemple                                                                                                     |
| -------- | ----- | ------ | ------------------ | ----------------------------------------------------------------------------------------------------------- |
| 5d515eb1 | 1 [6] | N      | `N-VOCAB-OP`       | Traduis cette phrase par une expression mathématique : le quotient de 4 par 2 L'expression ⇒ 4 : 2          |
| 78feafed | 2 [5] | N      | `N-VOCAB-OP`       | Traduis cette phrase par une expression mathématique : le quotient de la somme de 3 et de ⇒ \left( 3 + 2 \… |

### Fonctions / Fonctions affines / Racine d'une fonction affine (1)

| id       | niv   | classe | stratégie ou règle | exemple                                                                                                    |
| -------- | ----- | ------ | ------------------ | ---------------------------------------------------------------------------------------------------------- |
| 2bdb3db6 | 1 [3] | N      | `N-RACINE-AFF`     | Pour quelle valeur de x la fonction f s'annule-t-elle ? f\left( x \right) = -8 - 6 x f\lef ⇒ -\dfrac{4}{3} |

### Fonctions / Fonctions affines / Reconnaître le tableau de signe d'une fonction affine (1)

| id       | niv   | classe | stratégie ou règle | exemple                                                                                         |
| -------- | ----- | ------ | ------------------ | ----------------------------------------------------------------------------------------------- |
| bba95c2d | 3 [3] | N      | `N-SIGNE-AFF`      | Quel est le tableau de signe correspondant à la fonction affine : f\left( x \right) = 3 x ⇒ QCM |

### Fonctions / Fonctions affines / Vocabulaire des fonctions affines (1)

| id       | niv   | classe | stratégie ou règle | exemple                                                                                    |
| -------- | ----- | ------ | ------------------ | ------------------------------------------------------------------------------------------ |
| 2d29792b | 3 [3] | N      | `N-VOCAB-AFF`      | Dans la fonction affine f\left( x \right) = 1 - 6 x, comment s'appelle le nombre 1 ? ⇒ QCM |

### Fonctions / Valeur absolue / Calculer la valeur d'une valeur absolue (2)

| id       | niv   | classe | stratégie ou règle | exemple                                        |
| -------- | ----- | ------ | ------------------ | ---------------------------------------------- |
| 226e5b3b | 4 [2] | N      | `N-ABS`            | Calcule. \left\| -6 \right\| ⇒ 6               |
| d540f96e | 5 [2] | N      | `N-ABS`            | Calcule. \left\| -\sqrt{5} \right\| ⇒ \sqrt{5} |

### Fonctions / Valeur absolue / Opposé d'une expression (1)

| id       | niv   | classe | stratégie ou règle | exemple                                                        |
| -------- | ----- | ------ | ------------------ | -------------------------------------------------------------- |
| 34e569e7 | 1 [2] | N      | `N-OPPOSE-EXPR`    | Quel est l'opposé de l'expression : -2 x L'opposé est ?. ⇒ 2 x |

### Fractions / A trou / Compléter une addition ou soustraction à trou (2)

| id       | niv   | classe | stratégie ou règle | exemple                                                                                         |
| -------- | ----- | ------ | ------------------ | ----------------------------------------------------------------------------------------------- |
| 7d12a172 | 1 [5] | N      | `N-FRAC-ADD`       | Complète. \dfrac{4}{11} - \dfrac{2}{?} = \dfrac{2}{11} ⇒ 11                                     |
| 86b80159 | 2 [4] | N      | `N-FRAC-ADD`       | Complète cette égalité avec le nombre manquant. \dfrac{-6}{11} - \dfrac{-8}{?} = \dfrac{2} ⇒ 11 |

### Fractions / A trou / Compléter une multiplication à trou (2)

| id       | niv   | classe | stratégie ou règle | exemple                                                                                         |
| -------- | ----- | ------ | ------------------ | ----------------------------------------------------------------------------------------------- |
| e8de8b81 | 1 [4] | N      | `N-FRAC-MULT`      | Complète. \left( \dfrac{3}{6} \right) \times \left( \dfrac{2}{?} \right) = \dfrac{6}{30} ⇒ 5    |
| 23b29a15 | 2 [4] | N      | `N-FRAC-MULT`      | Complète. \left( \dfrac{-6}{-5} \right) \times \left( \dfrac{-8}{?} \right) = \dfrac{48}{2 ⇒ -5 |

### Fractions / Apprivoiser / Déterminer la forme décimale d'une fraction (2)

| id       | niv     | classe | stratégie ou règle | exemple                                                        |
| -------- | ------- | ------ | ------------------ | -------------------------------------------------------------- |
| 322f3479 | 5 [CM1] | N      | `N-FRACDEC`        | Écris la forme décimale de la fraction \dfrac{1}{10} ⇒ 0.1     |
| dd7db98e | 9 [CM2] | N      | `N-FRACDEC`        | Écris la forme décimale de la fraction \dfrac{3}{1000} ⇒ 0.003 |

### Fractions / Apprivoiser / Déterminer une forme fractionnaire (1)

| id       | niv    | classe | stratégie ou règle | exemple                                                                              |
| -------- | ------ | ------ | ------------------ | ------------------------------------------------------------------------------------ |
| 81a64b0a | 12 [6] | N      | `N-FRACDEC`        | Réécris ce nombre décimal sous forme fractionnaire la plus simple. 0.5 ⇒ \frac{1}{2} |

### Fractions / Apprivoiser / Forme décimale d'une fraction (7)

| id       | niv     | classe | stratégie ou règle | exemple                                                          |
| -------- | ------- | ------ | ------------------ | ---------------------------------------------------------------- |
| d159d49f | 1 [CM1] | N      | `N-FRACDEC`        | Écris la forme décimale de la fraction \dfrac{2}{10} ⇒ 0.2       |
| 37e39a3e | 2 [CM1] | N      | `N-FRACDEC`        | Écris la forme décimale de la fraction \dfrac{2}{100} ⇒ 0.02     |
| c88d66d6 | 3 [CM1] | N      | `N-FRACDEC`        | Écris la forme décimale de la fraction \dfrac{21}{100} ⇒ 0.21    |
| 8a3a572b | 4 [CM1] | N      | `N-FRACDEC`        | Écris la forme décimale de la fraction \dfrac{84}{100} ⇒ 0.84    |
| f3477519 | 6 [CM2] | N      | `N-FRACDEC`        | Écris la forme décimale de la fraction \dfrac{2}{1000} ⇒ 0.002   |
| b1d3c8aa | 7 [CM2] | N      | `N-FRACDEC`        | Écris la forme décimale de la fraction \dfrac{205}{1000} ⇒ 0.205 |
| a62ccb82 | 8 [CM2] | N      | `N-FRACDEC`        | Écris la forme décimale de la fraction \dfrac{84}{100} ⇒ 0.84    |

### Fractions / Apprivoiser / Simplifier une fraction (1)

| id       | niv   | classe | stratégie ou règle | exemple                                                            |
| -------- | ----- | ------ | ------------------ | ------------------------------------------------------------------ |
| b2af6f39 | 5 [4] | N      | `N-SIGNES`         | Simplifie les signes. \dfrac{\left( -2 \right)}{9} ⇒ -\dfrac{2}{9} |

### Fractions / Calculer / Calculer l'inverse d'un nombre (2)

| id       | niv   | classe | stratégie ou règle | exemple                                                                         |
| -------- | ----- | ------ | ------------------ | ------------------------------------------------------------------------------- |
| 4115768c | 1 [4] | N      | `N-INVERSE`        | Quel est l'inverse de ce nombre : 5 L'inverse de ce nombre est ?. ⇒ \frac{1}{5} |
| 65110463 | 2 [4] | N      | `N-PUISS-NEG`      | Calcule. 5^{-1} ⇒ \frac{1}{5}                                                   |

### Fractions / Calculer / Calculer un produit (1)

| id       | niv   | classe | stratégie ou règle | exemple                                                 |
| -------- | ----- | ------ | ------------------ | ------------------------------------------------------- |
| 25b78a6f | 5 [4] | N      | `N-FRAC-MULT`      | Calcule. \dfrac{3}{6} \times \dfrac{2}{5} ⇒ \frac{1}{5} |

### Grandeurs / Unités / Calculer avec des unités (2)

| id       | niv   | classe | stratégie ou règle | exemple                                                                                                   |
| -------- | ----- | ------ | ------------------ | --------------------------------------------------------------------------------------------------------- |
| b6269f1e | 3 [6] | N      | `N-UNITES`         | Complète. 2~\unit{dm} + 1~\unit{m} = ?~\unit{m} ⇒ 1.2                                                     |
| 64e55fc7 | 4 [6] | N      | `N-UNITES`         | Calcule. Tu peux choisir l'unité du résultat, mais n'oublie pas de l'écrire. 2~\unit{dm} + ⇒ 12~\unit{dm} |

### Grandeurs / Unités / Convertir dans une autre unité (4)

| id       | niv   | classe | stratégie ou règle | exemple                                                                  |
| -------- | ----- | ------ | ------------------ | ------------------------------------------------------------------------ |
| 7a90fc45 | 1 [6] | N      | `N-UNITES`         | Convertis dans l'unité demandée. 2~\unit{dm} = ?~\unit{m} ⇒ 0.2          |
| 82748db8 | 1 [6] | N      | `N-UNITES-AIRE`    | Convertis dans l'unité demandée. 2~\unit{dm^2} = ?~\unit{m^2} ⇒ 0.02     |
| c31c9d95 | 2 [6] | N      | `N-UNITES`         | Convertis dans l'unité demandée. 2~\unit{km} = ?~\unit{m} ⇒ 2000         |
| b79d4cb7 | 2 [6] | N      | `N-UNITES-VOL`     | Convertis dans l'unité demandée. 2~\unit{cm^3} = ?~\unit{m^3} ⇒ 0.000002 |

### Grandeurs / Volumes / Convertir dans une autre unité (1)

| id       | niv   | classe | stratégie ou règle | exemple                                                         |
| -------- | ----- | ------ | ------------------ | --------------------------------------------------------------- |
| 355bd41a | 1 [6] | N      | `N-UNITES-VOL`     | Convertis dans l'unité demandée. 2~\unit{L} = ?~\unit{dm^3} ⇒ 2 |

### Proportionnalité / Pourcentages / Définition d'un pourcentage (2)

| id       | niv   | classe | stratégie ou règle | exemple                                                                           |
| -------- | ----- | ------ | ------------------ | --------------------------------------------------------------------------------- |
| 62590cd3 | 1 [6] | N      | `N-POURCENT`       | Écris sous la forme d'une fraction de dénominateur 100 : 21\,\% ⇒ \dfrac{21}{100} |
| 8fd459da | 2 [6] | N      | `N-POURCENT`       | Écris cette fraction sous forme de pourcentage. \dfrac{21}{100} ⇒ 21\,\%          |

### Puissances / Apprivoiser / Définition d'une puissance à exposant négatif (1)

| id       | niv   | classe | stratégie ou règle | exemple                                                           |
| -------- | ----- | ------ | ------------------ | ----------------------------------------------------------------- |
| 15368b02 | 3 [4] | N      | `N-PUISS-NEG`      | Écris la définition de cette puissance. c^{-2} ⇒ \dfrac{1}{c^{2}} |

### Puissances / Apprivoiser / Écrire un nombre décimal à l'aide de la notation scientifique (1)

| id       | niv   | classe | stratégie ou règle | exemple                                                    |
| -------- | ----- | ------ | ------------------ | ---------------------------------------------------------- |
| 953574d4 | 1 [4] | N      | `N-NOTSCI`         | Écris ce nombre en notation scientifique. 0.025 ⇒ 2.5 ; -2 |

### Puissances / Apprivoiser / Écrire un nombre entier à l'aide d'une puissance de $10$ (2)

| id       | niv   | classe | stratégie ou règle | exemple                                                                                           |
| -------- | ----- | ------ | ------------------ | ------------------------------------------------------------------------------------------------- |
| ac0e5b62 | 2 [4] | N      | `N-PUISS10`        | Écris ce nombre sous la forme d'un seul nombre entier. 2 \times 10^1 ⇒ 20                         |
| ae8ad17a | 3 [4] | N      | `N-PUISS10`        | Écris ce nombre à l'aide d'une puissance de 10. Exemple : 400 = 4 \times 10^2 200 ⇒ 2 \times 10^2 |

### Puissances / Apprivoiser / Puissances de 10 (1)

| id       | niv   | classe | stratégie ou règle | exemple                                                              |
| -------- | ----- | ------ | ------------------ | -------------------------------------------------------------------- |
| 2d8e7948 | 1 [4] | F      | —                  | Calcule en écrivant le résultat sous forme décimale. 10^{-3} ⇒ 0.001 |

### Puissances / Apprivoiser / Traduire un produit en puissance (1)

| id       | niv   | classe | stratégie ou règle | exemple                                                                                       |
| -------- | ----- | ------ | ------------------ | --------------------------------------------------------------------------------------------- |
| d9f2003b | 1 [4] | N      | `N-PUISS-DEF`      | Réécris cette expression à l'aide d'une puissance c \times c \times c \times c \times c ⇒ c^5 |

### Puissances / Apprivoiser / Traduire une puissance en produit (1)

| id       | niv   | classe | stratégie ou règle | exemple                                                                                                   |
| -------- | ----- | ------ | ------------------ | --------------------------------------------------------------------------------------------------------- |
| 3fe98dd9 | 2 [4] | N      | `N-PUISS-DEF`      | Réécris cette expression à l'aide de la définition d'une puissance. c^5 ⇒ c \times c \times c \times c \  |

### Racines carrées / Apprivoiser / Trouver un nombre positif de carré donné (1)

| id       | niv   | classe | stratégie ou règle | exemple                                          |
| -------- | ----- | ------ | ------------------ | ------------------------------------------------ |
| 5edc1514 | 1 [5] | F      | —                  | Complète avec un nombre **positif**. ?^2 = 9 ⇒ 3 |

### Relatifs / Additionner et soustraire / Ajouter $1$ ou $2$ à un nombre négatif (1)

| id       | niv   | classe | stratégie ou règle | exemple                             |
| -------- | ----- | ------ | ------------------ | ----------------------------------- |
| fd2c3e4b | 1 [5] | N      | `N-REL-ADD`        | Calcule. \left( -4 \right) + 2 ⇒ -2 |

### Relatifs / Additionner et soustraire / Ajouter $2$ nombres opposés (1)

| id       | niv   | classe | stratégie ou règle | exemple                            |
| -------- | ----- | ------ | ------------------ | ---------------------------------- |
| b896b6ce | 2 [5] | N      | `N-OPPOSES`        | Calcule. 4 + \left( -4 \right) ⇒ 0 |

### Relatifs / Additionner et soustraire / Ajouter deux nombres négatifs (1)

| id       | niv   | classe | stratégie ou règle | exemple                                             |
| -------- | ----- | ------ | ------------------ | --------------------------------------------------- |
| 31144f5f | 4 [5] | N      | `N-REL-ADD`        | Calcule. \left( -2 \right) + \left( -1 \right) ⇒ -3 |

### Relatifs / Additionner et soustraire / Calculer (1)

| id       | niv   | classe | stratégie ou règle | exemple              |
| -------- | ----- | ------ | ------------------ | -------------------- |
| 0a34e472 | 2 [5] | N      | `N-REL-ADD`        | Calcule. -3 + 2 ⇒ -1 |

### Relatifs / Additionner et soustraire / Calculer une somme (1)

| id       | niv   | classe | stratégie ou règle | exemple                             |
| -------- | ----- | ------ | ------------------ | ----------------------------------- |
| 32469cec | 6 [5] | N      | `N-REL-ADD`        | Calcule. \left( -3 \right) + 2 ⇒ -1 |

### Relatifs / Additionner et soustraire / Calculer une somme algébrique (1)

| id       | niv   | classe | stratégie ou règle | exemple                       |
| -------- | ----- | ------ | ------------------ | ----------------------------- |
| abc5d417 | 4 [5] | N      | `N-REL-ALG`        | Calcule. -6 - 8 + 2 - 2 ⇒ -14 |

### Relatifs / Additionner et soustraire / Calculer une somme ou une différence (3)

| id       | niv   | classe | stratégie ou règle | exemple                                                                                           |
| -------- | ----- | ------ | ------------------ | ------------------------------------------------------------------------------------------------- |
| db4f1dde | 1 [5] | N      | `N-REL-ADD`        | Calcule en t'aidant de la droite graduée. \left( -1 \right) + 1 ![Question image 1](relati ⇒ 0    |
| 347eb0d0 | 2 [5] | N      | `N-REL-ADD`        | Calcule en t'aidant de la droite graduée. \left( -2 \right) + 1 ![Question image 1](relati ⇒ -1   |
| 5b53b1be | 5 [5] | N      | `N-REL-ADD`        | Calcule en t'aidant de la droite graduée. \left( -1.5 \right) + 1 ![Question image 1](rela ⇒ -0.5 |

### Relatifs / Additionner et soustraire / Compléter une addition à trou (2)

| id       | niv   | classe | stratégie ou règle | exemple                                                                                        |
| -------- | ----- | ------ | ------------------ | ---------------------------------------------------------------------------------------------- |
| 24331791 | 3 [5] | R      | `R-INV`            | Complète en t'aidant de la droite graduée. \left( -1 \right) + ? = 0 ![Question image 1](r ⇒ 1 |
| 84755a7b | 4 [5] | R      | `R-INV`            | Complète en t'aidant de la droite graduée. \left( -2 \right) + ? = -1 ![Question image 1]( ⇒ 1 |

### Relatifs / Additionner et soustraire / Compléter une égalité (1)

| id       | niv   | classe | stratégie ou règle | exemple                   |
| -------- | ----- | ------ | ------------------ | ------------------------- |
| b1550840 | 3 [5] | R      | `R-INV`            | Complète. -3 + ? = -1 ⇒ 2 |

### Relatifs / Additionner et soustraire / Compléter une somme (1)

| id       | niv   | classe | stratégie ou règle | exemple                                                                    |
| -------- | ----- | ------ | ------------------ | -------------------------------------------------------------------------- |
| 372d4f79 | 7 [5] | R      | `R-INV`            | Complète l'égalité avec le nombre manquant. ? + \left( -3 \right) = -1 ⇒ 2 |

### Relatifs / Additionner et soustraire / Enlever $1$ ou $2$ à un nombre négatif (1)

| id       | niv   | classe | stratégie ou règle | exemple                             |
| -------- | ----- | ------ | ------------------ | ----------------------------------- |
| a7ba721b | 1 [5] | N      | `N-REL-ADD`        | Calcule. \left( -2 \right) - 2 ⇒ -4 |

### Relatifs / Additionner et soustraire / Simplifier l'écriture (1)

| id       | niv   | classe | stratégie ou règle | exemple                                                                         |
| -------- | ----- | ------ | ------------------ | ------------------------------------------------------------------------------- |
| 8c7942e4 | 1 [5] | N      | `N-REL-SUB`        | Simplifie les doubles signes de cette expression. 3 - \left( -2 \right) ⇒ 3 + 2 |

### Relatifs / Additionner et soustraire / Soustraire (cas général) (1)

| id       | niv   | classe | stratégie ou règle | exemple                             |
| -------- | ----- | ------ | ------------------ | ----------------------------------- |
| 1d41e370 | 4 [5] | N      | `N-REL-SUB`        | Calcule. \left( -3 \right) - 2 ⇒ -5 |

### Relatifs / Additionner et soustraire / Transformer une soustraction en addition (1)

| id       | niv   | classe | stratégie ou règle | exemple                                                                                                |
| -------- | ----- | ------ | ------------------ | ------------------------------------------------------------------------------------------------------ |
| 1b866448 | 3 [5] | N      | `N-REL-SUB`        | Réécris cette soustraction en une addition équivalente. \left( -3 \right) - 2 ⇒ -3 + \left( -2 \right) |

### Relatifs / Apprivoiser / Comparer deux nombres relatifs. (2)

| id       | niv   | classe | stratégie ou règle | exemple                                         |
| -------- | ----- | ------ | ------------------ | ----------------------------------------------- |
| e0b6d00a | 1 [5] | N      | `N-COMPARER-REL`   | Quel est le plus petit de ces 2 nombres ? ⇒ QCM |
| 12e27dba | 2 [5] | N      | `N-COMPARER-REL`   | Quel est le plus petit de ces 2 nombres ? ⇒ QCM |

### Relatifs / Apprivoiser / Nombre négatif défini par une soustraction (1)

| id       | niv   | classe | stratégie ou règle | exemple                                                  |
| -------- | ----- | ------ | ------------------ | -------------------------------------------------------- |
| 756bdbb7 | 2 [5] | N      | `N-REL-DEF`        | Écris la soustraction définissant le nombre : -5 ⇒ 0 - 5 |

### Relatifs / Apprivoiser / Trouver l'opposé d'un nombre (1)

| id       | niv   | classe | stratégie ou règle | exemple                                                       |
| -------- | ----- | ------ | ------------------ | ------------------------------------------------------------- |
| 0f182533 | 3 [5] | F      | —                  | Quel est l'opposé de ce nombre ? -5 L'opposé de -5 est ?. ⇒ 5 |

### Relatifs / Apprivoiser / Une soustraction enfin possible (1)

| id       | niv   | classe | stratégie ou règle | exemple                           |
| -------- | ----- | ------ | ------------------ | --------------------------------- |
| f7f22023 | 1 [5] | N      | `N-REL-DEF`        | Écris le résultat de : 0 - 5 ⇒ -5 |

### Relatifs / Multiplier et Diviser / Calculer un produit (1)

| id       | niv   | classe | stratégie ou règle | exemple                                  |
| -------- | ----- | ------ | ------------------ | ---------------------------------------- |
| 2da974f7 | 5 [4] | N      | `N-SIGNES`         | Calcule. \left( -3 \right) \times 2 ⇒ -6 |

### Relatifs / Multiplier et Diviser / Compléter une division à trou (1)

| id       | niv   | classe | stratégie ou règle | exemple                                  |
| -------- | ----- | ------ | ------------------ | ---------------------------------------- |
| 0b6d749f | 4 [4] | R      | `R-INV`            | Complète. ? : 2 = -3 ⇒ \left( -6 \right) |

### Relatifs / Multiplier et Diviser / Compléter une multiplication à trou (1)

| id       | niv   | classe | stratégie ou règle | exemple                                       |
| -------- | ----- | ------ | ------------------ | --------------------------------------------- |
| a5d4c3ee | 6 [4] | R      | `R-INV`            | Complète. ? \times \left( -3 \right) = -6 ⇒ 2 |

### Relatifs / Multiplier et Diviser / Déterminer le signe d'un facteur (1)

| id       | niv   | classe | stratégie ou règle | exemple                                                        |
| -------- | ----- | ------ | ------------------ | -------------------------------------------------------------- |
| ace89247 | 2 [4] | N      | `N-SIGNES`         | Quel est le signe du facteur manquant ? 44 \times ? = 34 ⇒ QCM |

### Relatifs / Multiplier et Diviser / Déterminer le signe d'un produit (3)

| id       | niv   | classe | stratégie ou règle | exemple                                                                                          |
| -------- | ----- | ------ | ------------------ | ------------------------------------------------------------------------------------------------ |
| 4bee24f9 | 1 [4] | N      | `N-SIGNES`         | Quel est le signe de ce produit ? -71 \times \left( -90 \right) ⇒ QCM                            |
| 74a31e06 | 3 [4] | N      | `N-SIGNES`         | Quel est le signe de ce produit ? -71 \times \left( -90 \right) \times 34 ⇒ QCM                  |
| aa8d6e3b | 4 [4] | N      | `N-SIGNES`         | Quel est le signe de ce produit ? -71 \times \left( -90 \right) \times 34 \times \left( -3 ⇒ QCM |

### Relatifs / Multiplier et Diviser / Déterminer le signe d'un quotient (1)

| id       | niv   | classe | stratégie ou règle | exemple                                                           |
| -------- | ----- | ------ | ------------------ | ----------------------------------------------------------------- |
| 4d13f5d6 | 1 [4] | N      | `N-SIGNES`         | Quel est le signe de ce quotient ? -71 : \left( -90 \right) ⇒ QCM |

### Relatifs / Multiplier et Diviser / Déterminer le signe dans un quotient (1)

| id       | niv   | classe | stratégie ou règle | exemple                                                                                  |
| -------- | ----- | ------ | ------------------ | ---------------------------------------------------------------------------------------- |
| 4b07cd65 | 2 [4] | N      | `N-SIGNES`         | Quel est le signe du nombre manquant : ? : \left( -71 \right) = \left( -90 \right) ⇒ QCM |

### Relatifs / Multiplier et Diviser / Diviser (1)

| id       | niv   | classe | stratégie ou règle | exemple                             |
| -------- | ----- | ------ | ------------------ | ----------------------------------- |
| 995bd551 | 3 [4] | N      | `N-SIGNES`         | Calcule. \left( -6 \right) : 2 ⇒ -3 |

### Suites / Limites / Déterminer la limite d'une suite (1)

| id       | niv       | classe | stratégie ou règle | exemple                                                                                  |
| -------- | --------- | ------ | ------------------ | ---------------------------------------------------------------------------------------- |
| 07bce646 | 2 [T_SPE] | N      | `N-LIM-OPS`        | Détermine le résultat de cette opération sur les limites. \dfrac{-\infty}{+\infty} ⇒ QCM |

Vérification : 283 lignes, 283 identifiants distincts, tous présents dans la source.

## 4. Cas limites

1. **Opérations à trou dans le répertoire** (00497e5e, 987d3641, cf0d20d5, 76d8c8ee, 48cac183, fa57c725 ; multiplications à trou b8e781f6…f4abc638, 2042caf5 ; division e6ddf5d7) → classées F (tables « dans les deux sens »). Alternative : R-INV si l'on estime que le trou demande l'opération inverse.
2. **Compléments à 100 de dizaines entières** (b2ad1cc0 CE1, ff427b27 CE2 : 20 + ? = 100) et 13 + 87 (5706769f) → R-COMPL. Alternative : F si les repères CE2 comptent les compléments à 100 comme mémorisés.
3. **df3cb8ad** (20 + 6, 10 + 46) → F « lecture directe ». Alternative : N-DECOMP.
4. **acf15102** (11 − 3) → F (répertoire soustractif lié à la table d'addition). Alternative : R-PASS (11 − 1 − 2).
5. **Double / quadruple** : 022130ca, 47f97c9f (double de 12) et 3c79eb9c (4 × 25 = 100) → R. Alternative : F (4 × 25 = 100 est souvent traité comme fait mémorisé en CM).
6. **2d8e7948** (10⁻³) → F (puissances de 10 dans le répertoire). Alternative : N-PUISS10 en 4ᵉ, où la règle est encore en cours d'acquisition.
7. **5edc1514** (?² = 9) → F (carrés usuels). Alternative : N (définition de la racine carrée).
8. **4115768c** (inverse de 5 ou de 3/11) → N-INVERSE, car l'exemple contient une fraction. Alternative : F (« inverse d'un nombre simple »).
9. **0,5 → 1/2** (000368e1, c1a83c8f, 81a64b0a) → N-FRACDEC. Alternative : F si le modèle ne génère que des équivalences usuelles (1/2, 1/4, 3/4).
10. **R-POSE / grands calculs** : 08fbcd26 (313 − 126) en R-POSE ⚑ ; fe9df9ba (244 + 128) et d793de49 (164 × 3) mis en R (décomposition) mais ils sont à la limite du calcul posé.
11. **Trous chez les relatifs** (24331791, 84755a7b, b1550840, 372d4f79, 0b6d749f, a5d4c3ee) → R-INV. Alternative : N-REL-ADD / N-SIGNES, la vraie difficulté étant le signe.
12. **2bdb3db6** (racine de f affine) → N-RACINE-AFF. La correction pourrait être produite par `pedagogical-solve/linear` (palier 1) plutôt qu'écrite à la main.
13. **Additions de relatifs avec droite graduée** (db4f1dde, 347eb0d0, 5b53b1be, a7ba721b) → N-REL-ADD. Alternative : R « avancer / reculer sur la droite ».
