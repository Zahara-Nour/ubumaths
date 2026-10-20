# Corpus — lecture des grandeurs par le parseur maison de mathAST

_Ouvert le 2026-10-20. Phase 0 : rien n'est codé. Périmètre : `parseCustom` (syntaxe `5[m]`) et le calcul
des grandeurs (`computeQuantity`, `tidy`). Le parseur LaTeX viendra ensuite, avec le même corpus._

Référence : la Brochure SI du BIPM, `docs/ref/si/` (§ et pages dans son `README.md`).

**Colonnes.** _BIPM_ : l'écriture est-elle correcte selon la brochure ? (✔ correcte, ✘ incorrecte, — la
brochure n'en dit rien). _Aujourd'hui_ : mesuré le 2026-10-20 (`parseCustom` puis `computeQuantity`).
_Proposé_ : la lecture à valider. **Q** : une question à trancher (liste en fin de page).

## Règle proposée

> **L'unité multiplie tout le terme de nombres qui la précède, signe unaire compris** (BIPM §5.4.1 :
> valeur = valeur numérique × unité). Le terme peut contenir des produits, des quotients, des puissances
> de nombres, `√`, `π` ; il s'arrête à un `+` ou un `−` d'addition, une parenthèse ouvrante, ou une
> grandeur déjà formée. Une unité au dénominateur s'écrit avec des parenthèses (BIPM §5.4.6 :
> « (20 m)/(5 s) »). Les espaces entre chiffres sont ignorés par le parseur (`12 500` = 12500) ; le
> module des questions juge l'espacement.

C'est la règle de la lecture naturelle de l'atelier (décisions de David des 2026-10-11 et 2026-10-18).

## Décisions de David (2026-10-20)

Relecture en cours sur la page à cocher (https://claude.ai/artifact/HWJeifzvw6rL9ar72KuRHf).

- **A5, A6, B3** : le signe unaire fait partie de la valeur numérique : `-5[m]` = (−5) m, `+5[m]` = (+5) m,
  `-10^3[m]` = (−10³) m (−10³ reste −(10³)). Dans `2-3[m]`, le `−` est une soustraction.
- **A9** : le parseur ignore les espaces entre chiffres, partout (`12 5[m]` = 125 m, `12 500` = 12500,
  `0,000 01`) ; l'espacement est jugé par le contrôle « Les chiffres sont mal espacés. » des questions.
  Vérifié : aujourd'hui `12 500` est une erreur du parseur maison (rien n'est déplacé ; `x y` reste un
  produit). Nombres mixtes : écrits `2+1/3` en France, pas de conflit.
- **B4 / E4 (Q2)** : `2*3[m]` = (2 × 3) m, une seule règle « tout le terme ». **C1 (Q1)** : `1/2[m]` =
  (1/2) m, gardé.

## N. Nombres (décisions de David, 2026-10-20)

Le parseur **lit** ; la forme (espacement, virgule suivie d'une espace) est jugée par le validateur du
module des questions, jamais par le parseur ni par l'atelier.

| #   | Écriture        | Aujourd'hui (mesuré)                                                                                                                                                                               | Décidé                                                                                                                                       |
| --- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| N1  | `12 500`        | parseur maison : « Unexpected token: 500 » ; LaTeX `12 500`, `12\ 500`, `12~500` et atelier : « Nombre « 500 » écrit après un facteur : écris le nombre devant (500x)… » ; LaTeX `12\,500` : 12500 | 12500, partout (espaces entre chiffres ignorés, décimales comprises : `0,000 01`)                                                            |
| N2  | `1, 2`          | erreur « Unexpected token: , »                                                                                                                                                                     | 1,2 (la virgule hors contexte est décimale, espaces ignorés)                                                                                 |
| N3  | `x 2`, `x2`     | erreur (un chiffre ne suit pas une lettre)                                                                                                                                                         | inchangé (message en français, Q14)                                                                                                          |
| N4  | `max(2,5)`      | max(2 ; 5) : la virgule sépare les arguments, avec ou sans espace (test « le séparateur l'emporte »)                                                                                               | **à trancher** : A) `;` sépare les arguments, la virgule est décimale (max(2,5) = 2,5) ; B) la virgule reste le séparateur dans une fonction |
| N5  | `[[1,2],[3,4]]` | matrice : la virgule sépare les éléments                                                                                                                                                           | inchangé (contexte)                                                                                                                          |

Pourquoi l'erreur de N1 : le découpage saute les espaces sans les garder, et l'analyse refuse une
multiplication implicite qui commencerait par un nombre (`shouldInsertImplicitMultiply`, pour refuser
`x2`) ; il reste `500`, d'où « Unexpected token ». Aucun test ne couvrait un nombre écrit avec des espaces.
`(1;2)`, `[1;2]`, `{1;2}` sont des erreurs du parseur maison (coordonnées et intervalles lus ailleurs).

## A. Un nombre et une unité

| #   | Écriture    | BIPM       | Aujourd'hui                             | Proposé                                                              |
| --- | ----------- | ---------- | --------------------------------------- | -------------------------------------------------------------------- |
| A1  | `5[m]`      | ✔          | 5 m                                     | 5 m                                                                  |
| A2  | `5 [m]`     | ✔ (§5.4.3) | 5 m                                     | 5 m                                                                  |
| A3  | `2,5[m]`    | ✔ (§5.4.4) | 2,5 m                                   | 2,5 m                                                                |
| A4  | `2.5[m]`    | ✔ (§5.4.4) | 2,5 m                                   | 2,5 m                                                                |
| A5  | `-5[m]`     | ✔          | −5 m                                    | −5 m                                                                 |
| A6  | `+5[m]`     | —          | 5 m                                     | 5 m                                                                  |
| A7  | `0[m]`      | ✔          | 0 m                                     | 0 m                                                                  |
| A8  | `.5[m]`     | ✘ (§5.4.4) | erreur anglaise « Unexpected token: 5 » | refus en français : « Écris 0,5 (un zéro avant la virgule). » **Q5** |
| A9  | `12 500[m]` | ✔ (§5.4.4) | erreur « Unexpected token: 500 »        | 12 500 m **Q6**                                                      |

## B. Puissances de dix, notation scientifique

| #   | Écriture      | BIPM              | Aujourd'hui                                           | Proposé                   |
| --- | ------------- | ----------------- | ----------------------------------------------------- | ------------------------- |
| B1  | `10^3[m]`     | ✔ (§5.4.5, 5.4.7) | (10³)[m] = 1000 m                                     | (10³)[m] = 1000 m         |
| B2  | `2^3[m]`      | —                 | (2³)[m] = 8 m                                         | (2³)[m] = 8 m             |
| B3  | `-10^3[m]`    | ✔                 | −(10³[m]) = −1000 m                                   | −1000 m                   |
| B4  | `2,5*10^3[m]` | ✔                 | 2,5 × (10³[m]) = 2500 m                               | (2,5 × 10³)[m] = 2500 m   |
| B5  | `2,5×10^3[m]` | ✔ (§5.4.6 : `×`)  | erreur « Unexpected token: 10 »                       | 2500 m **Q7**             |
| B6  | `10^(-3)[m]`  | ✔                 | 0,001 m                                               | 0,001 m                   |
| B7  | `10^-3[m]`    | ✔ (10⁻³)          | erreur anglaise « Negative exponent requires braces » | **Q8**                    |
| B8  | `10^3/2[m]`   | —                 | 10³/(2[m]) = 500 m⁻¹                                  | (10³/2)[m] = 500 m **Q1** |

## C. Quotients de nombres

| #   | Écriture   | BIPM                   | Aujourd'hui            | Proposé                   |
| --- | ---------- | ---------------------- | ---------------------- | ------------------------- |
| C1  | `1/2[m]`   | —                      | 1/(2[m]) = **0,5 m⁻¹** | (1/2)[m] = 0,5 m **Q1**   |
| C2  | `6/2[m]`   | —                      | 6/(2[m]) = 3 m⁻¹       | (6/2)[m] = 3 m **Q1**     |
| C3  | `-1/2[m]`  | —                      | −0,5 m⁻¹               | −0,5 m **Q1**             |
| C4  | `(1/2)[m]` | ✔                      | 0,5 m                  | 0,5 m                     |
| C5  | `1/(2[s])` | ✔ (§5.4.6)             | 0,5 s⁻¹                | 0,5 s⁻¹                   |
| C6  | `6/2[s]`   | —                      | 3 s⁻¹                  | 3 s **Q1**                |
| C7  | `2*1/2[m]` | —                      | 2 × 1/(2[m]) = 1 m⁻¹   | (2 × 1/2)[m] = 1 m **Q1** |
| C8  | `1/2*3[m]` | —                      | 1,5 m                  | 1,5 m                     |
| C9  | `1/2/3[m]` | ✘ (§5.4.6 : pas a/b/c) | 1/6 m⁻¹                | **Q16**                   |

## D. Sommes et différences

| #   | Écriture       | BIPM        | Aujourd'hui                                                            | Proposé         |
| --- | -------------- | ----------- | ---------------------------------------------------------------------- | --------------- |
| D1  | `2[m]+3[m]`    | ✔           | 5 m                                                                    | 5 m             |
| D2  | `2+3[m]`       | — (2 + 3 m) | refus « On ne peut pas ajouter un nombre sans unité et une longueur. » | inchangé **Q3** |
| D3  | `(2+3)[m]`     | ✔ (§5.4.1)  | 5 m                                                                    | 5 m             |
| D4  | `2[m]+3`       | —           | refus « …une longueur et un nombre sans unité. »                       | inchangé        |
| D5  | `2[m]-3[m]`    | ✔           | −1 m                                                                   | −1 m            |
| D6  | `2-3[m]`       | —           | refus (nombre et longueur)                                             | inchangé        |
| D7  | `2[m]+30[cm]`  | ✔           | 2,3 m                                                                  | 2,3 m           |
| D8  | `2[h]+30[min]` | ✔           | 2 h 30 min                                                             | 2 h 30 min      |
| D9  | `2[m]+3[s]`    | ✘           | refus « On ne peut pas ajouter une longueur et une durée. »            | inchangé        |
| D10 | `2[m]+3[m]*2`  | ✔           | 8 m                                                                    | 8 m             |

## E. Produits et quotients de grandeurs

| #   | Écriture         | BIPM                        | Aujourd'hui                    | Proposé                                   |
| --- | ---------------- | --------------------------- | ------------------------------ | ----------------------------------------- |
| E1  | `2[m]*3[m]`      | ✔ (§5.4.6)                  | 6 m²                           | 6 m²                                      |
| E2  | `2 [m] * 3 [m]`  | ✔                           | 6 m²                           | 6 m²                                      |
| E3  | `2[m]×3[m]`      | ✔ (§5.4.6 : `×`)            | erreur « Unexpected token: 3 » | 6 m² **Q7**                               |
| E4  | `2*3[m]`         | —                           | 2 × (3[m]) = 6 m               | (2 × 3)[m] = 6 m **Q2**                   |
| E5  | `2[m]*3`         | ✔                           | 6 m                            | 6 m                                       |
| E6  | `2[m]*3[s]`      | ✔                           | 6 m·s                          | 6 m·s                                     |
| E7  | `6[m]/2[s]`      | ✘ sans parenthèses (§5.4.6) | 3 m/s                          | 3 m/s (une grandeur clôt le terme) **Q4** |
| E8  | `(6[m])/(2[s])`  | ✔ (§5.4.6)                  | 3 m/s                          | 3 m/s                                     |
| E9  | `6[m]/2`         | ✔                           | 3 m                            | 3 m                                       |
| E10 | `2[m]*3[m]*4[m]` | ✔                           | 24 m³                          | 24 m³                                     |
| E11 | `20[m]/5[s]/2`   | ✘ (§5.4.6)                  | 2 m/s                          | **Q16**                                   |
| E12 | `2[m]3[m]`       | ✘                           | erreur « Unexpected token: 3 » | refus en français **Q14**                 |

## F. Grandeurs juxtaposées (sans opérateur)

| #   | Écriture          | BIPM                                  | Aujourd'hui                                                          | Proposé                                           |
| --- | ----------------- | ------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------- |
| F1  | `2[h] 30[min]`    | ✔ temps et angle seulement (§5.4.3)   | erreur « Unexpected token: 30 »                                      | 2 h 30 min **Q9**                                 |
| F2  | `2[h]30[min]`     | ✔ (idem)                              | erreur                                                               | **Q9**                                            |
| F3  | `{2[h]}{30[min]}` | —                                     | **(2 h) × (30 min) = 1 h²** ⚠️ (c'est l'écriture que produit `;hms`) | 2 h 30 min **Q9**                                 |
| F4  | `2[m] 30[cm]`     | ✘ (§5.4.3 : « pas l = 10 m 23,4 cm ») | erreur                                                               | refus : « Une seule unité : écris 2,3 m. » **Q9** |

## G. Unités composées et exposants

| #   | Écriture                | BIPM                                    | Aujourd'hui                              | Proposé                         |
| --- | ----------------------- | --------------------------------------- | ---------------------------------------- | ------------------------------- |
| G1  | `10[m^3]`               | ✔ (§3)                                  | 10 m³                                    | 10 m³                           |
| G2  | `10[m]^3`               | ✘ ambigu                                | refus anglais « Exponent after a unit… » | même refus, en français **Q14** |
| G3  | `(10[m])^3`             | ✔                                       | 1000 m³                                  | 1000 m³                         |
| G4  | `3[km/h]`               | ✔                                       | 3 km/h                                   | 3 km/h                          |
| G5  | `3[m/s^2]`              | ✔                                       | 3 m/s²                                   | 3 m/s²                          |
| G6  | `3[m.s^-1]`             | ✔ (§5.2)                                | 3 m·s⁻¹                                  | 3 m·s⁻¹                         |
| G7  | `3[m*s]`                | ✔                                       | 3 m·s                                    | 3 m·s                           |
| G8  | `3[kg/m.s]`             | ✘ (§5.2 : une barre sans parenthèses)   | refus anglais « Ambiguous unit… »        | même refus, en français **Q14** |
| G9  | `3[kg/(m.s)]`           | ✔                                       | 3 kg/(m·s)                               | 3 kg/(m·s)                      |
| G10 | `3[m s]`                | ✔ chez le BIPM (espace = produit, §5.2) | refus anglais « Space inside a unit… »   | **Q10**                         |
| G11 | `5[xyz]`, `5[M]`, `5[]` | ✘                                       | refus anglais « Invalid unit: … »        | refus en français **Q14**       |

## H. Racines et π

| #   | Écriture          | BIPM | Aujourd'hui                                         | Proposé          |
| --- | ----------------- | ---- | --------------------------------------------------- | ---------------- |
| H1  | `sqrt(2)[m]`      | ✔    | √2 m                                                | √2 m             |
| H2  | `2sqrt(2)[m]`     | ✔    | 2√2 m                                               | (2√2)[m] = 2√2 m |
| H3  | `π[m]`            | ✔    | **refus « Ces grandeurs ne se combinent pas. »** ⚠️ | π m **Q11**      |
| H4  | `2π[m]`           | ✔    | refus (idem) ⚠️                                     | 2π m **Q11**     |
| H5  | `pi[m]`, `2pi[m]` | —    | lu **p × i** (nombre complexe) ⚠️                   | **Q11**          |

## I. Lettres

| #   | Écriture    | BIPM                                            | Aujourd'hui                                  | Proposé            |
| --- | ----------- | ----------------------------------------------- | -------------------------------------------- | ------------------ |
| I1  | `x[m]`      | ✔ (une grandeur dont la valeur numérique est x) | lu [x m] ; le calcul refuse sans valeur de x | inchangé **Q12**   |
| I2  | `3x[m]`     | ✔                                               | 3 × (x m)                                    | (3x)[m] **Q12**    |
| I3  | `x*2[m]`    | ✔                                               | x × (2 m)                                    | (x × 2)[m] **Q12** |
| I4  | `a[m]*3[m]` | ✔                                               | (a m) × (3 m)                                | inchangé           |

## J. Températures et angles

| #   | Écriture       | BIPM       | Aujourd'hui                                          | Proposé  |
| --- | -------------- | ---------- | ---------------------------------------------------- | -------- |
| J1  | `20[°C]`       | ✔          | 20 °C                                                | inchangé |
| J2  | `20[°C]+5[°C]` | ✘          | refus (« …on soustrait deux températures… »)         | inchangé |
| J3  | `20[°C]+5[K]`  | ✔          | 25 °C                                                | inchangé |
| J4  | `2*20[°C]`     | ✘          | refus « Une température en °C ne se multiplie pas… » | inchangé |
| J5  | `30[°]`        | ✔ (§5.4.3) | 30°                                                  | inchangé |
| J6  | `30[°]+2[rad]` | ✔          | π/6 + 2 rad                                          | inchangé |

## K. Exposant qui porte une unité

| #   | Écriture    | BIPM | Aujourd'hui                                                                                       | Proposé                                            |
| --- | ----------- | ---- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| K1  | `10^(3[m])` | ✘    | refus au message faux : « Une fonction comme sin ou ln ne s'applique qu'à un nombre sans unité. » | « Un exposant ne peut pas avoir d'unité. » **Q13** |
| K2  | `[m]`       | —    | lu comme la lettre m entre parenthèses, puis refus « Ces grandeurs ne se combinent pas. »         | **Q15**                                            |

## Questions à trancher

- **Q1 — quotient de nombres devant une unité** (B8, C1-C3, C6, C7) : `1/2[m]` = (1/2)[m] = 0,5 m, et
  `6/2[s]` = 3 s. Une unité au dénominateur exige des parenthèses : `1/(2[s])`. _Reco : oui (ton idée,
  la règle de l'atelier)._ ⚠️ Avant de coder : inventaire des `a/b[u]` déjà écrits (modèles publiés,
  `{{eval}}`, tests), dont la valeur changerait.
- **Q2 — produit de nombres devant une unité** (B4, E4) : (2 × 3)[m] plutôt que 2 × (3[m]). Même
  valeur ; l'arbre change (affichage à vérifier). _Reco : oui, une seule règle « tout le terme »._
- **Q3 — `2+3[m]`** : 2 + (3 m), refusé (nombre + longueur). _Reco : inchangé ; `(2+3)[m]` pour 5 m._
- **Q4 — `6[m]/2[s]`** : le BIPM demande des parenthèses, mais la lecture 3 m/s n'a qu'un sens possible
  ici (une grandeur clôt le terme). _Reco : accepter, sans remarque._
- **Q5 — `.5[m]`** : interdit par le BIPM. _Reco : refus en français, « Écris 0,5 (un zéro avant la
  virgule). »_
- **Q6 — `12 500[m]`** : groupement par trois chiffres, permis par le BIPM. _Reco : accepter (groupes de
  trois exactement)._
- **Q7 — le signe `×`** (B5, E3) : recommandé par le BIPM, illisible aujourd'hui. _Reco : `×` (et `·`)
  lus comme `*`._
- **Q8 — `10^-3[m]`** : _reco : accepter, lu 10^(−3) (un signe seul après `^`)._ Autre choix : refus en
  français.
- **Q9 — grandeurs juxtaposées** : le BIPM ne les admet que pour le temps et l'angle. _Reco :_ `2[h]
30[min]` et `{2[h]}{30[min]}` = 2 h 30 min (somme) ; pour les autres grandeurs (`2[m] 30[cm]`), refus
  « Une seule unité : écris 2,3 m. ». ⚠️ `{2[h]}{30[min]}` vaut aujourd'hui 1 h² : à corriger quoi qu'il
  arrive.
- **Q10 — `3[m s]`** (espace dans l'unité) : le BIPM l'écrit ainsi ; `notation-unites.md` la refuse
  (`m s` n'est ni `m.s` ni `ms`). _Reco : garder le refus (écriture d'élève ambiguë), en français._
- **Q11 — π** : `π[m]`, `2π[m]` refusés à tort ; `pi` lu p × i. _Reco : π[m] = π m (valeur exacte) ;
  `pi` lu π._
- **Q12 — lettres** : la règle « tout le terme » s'applique-t-elle aux lettres (`3x[m]` = (3x)[m]) ?
  Atelier : non, une lettre reste de l'algèbre (décision du 2026-10-18), mais `2πr[m]` y « impose
  l'unité ». _Reco : oui dans le parseur (les crochets sont explicites) ; l'atelier garde sa lecture du
  texte sans crochets._
- **Q13 — exposant à unité** : message juste, « Un exposant ne peut pas avoir d'unité. »
- **Q14 — refus de lecture en anglais** (A8, B7, E12, G2, G8, G10, G11) : tous en français.
- **Q15 — `[m]` seul** (une unité sans nombre) : _reco : 1 m_ ? ou refus « Écris un nombre devant
  l'unité : 1[m]. » _Reco : refus._
- **Q16 — `a/b/c`** (C9, E11) : le BIPM l'interdit sans parenthèses. _Reco : garder la lecture
  ((a/b)/c, règle de calcul ordinaire), sans refus._
