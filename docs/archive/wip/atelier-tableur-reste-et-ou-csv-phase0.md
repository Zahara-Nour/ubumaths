---
title: Atelier — tableur intégré : RESTE, ET/OU, ouvrir un fichier CSV (phase 0)
date: 2026-10-18
status: phase 0 VALIDÉE (2026-10-18, « je valide tes recos ») ; Q-RE-1 à Q-RE-6 = les recos
---

# Atelier — tableur intégré : RESTE, ET/OU, ouvrir un fichier CSV

Demande de David (2026-10-18) : reprendre de `/spreadsheet` (V4) ce qui manque encore à la grille
de l'atelier — **RESTE**, **ET/OU** et **l'ouverture d'un fichier CSV**. Le tableur est complet
(lots 1 à 5) et mis en forme (#1466, #1469), rien n'est en production. Journal :
[atelier-tableur-progress.md](atelier-tableur-progress.md).

## Ce que fait V4 (`/spreadsheet`), lu le 2026-10-18

- **RESTE(n ; d)** (`MOD`, `src/lib/spreadsheet/functions/math.ts`) : `n − d × ENT(n/d)`, du signe du
  diviseur (comme Excel et LibreOffice) ; `d = 0` → `#DIV/0!`.
- **ET, OU** (`logic.ts`) : rendent VRAI ou FAUX ; au moins un argument ; une erreur se propage.
  V4 a aussi **NON**, VRAI, FAUX.
- **Import CSV** (`csv.ts`, `SpreadsheetImportExport.svelte`) : une fenêtre avec aperçu des
  5 premières lignes, séparateur automatique ou choisi, case « la première ligne est un en-tête » ;
  l'import **remplace** toute la feuille, **tronqué en silence** à 20 × 20.

## Ce qui existe déjà dans l'atelier (rappel)

- La grille n'a pas de valeur VRAI/FAUX : une comparaison ne s'écrit que dans la condition de SI
  (`=SI(A1>=10;"admis";"refusé")`, lot 4) ; une case vide dans la condition laisse la formule vide.
- **Coller** un tableau (Ctrl+V) : posé à partir de la case choisie, **tout ou rien** (Q3 : jamais
  tronqué en silence), une première ligne de mots devient les titres (T4), annulable (Ctrl+Z).
  Séparateurs reconnus : tabulation, et `;` quand chaque ligne en a un.
- **Télécharger en CSV** : `;`, décimaux à virgule, UTF-8 avec BOM (`donnees-atelier.csv`).
- `ENT(x)` existe : `=ENT(17/5)` → 3.

---

## Comportements proposés

### 1. RESTE

- **Nominal** — `=RESTE(17;5)` → `2`. `=RESTE(A2;2)` → `0` ou `1` : pair ou impair.
- **Nominal** — Négatifs, comme LibreOffice (le reste a le signe du diviseur) : `=RESTE(-7;3)` → `2`,
  ce qui est le reste de la division euclidienne du collège.
- **Nominal** — Décimaux et fractions acceptés, et exacts : `=RESTE(7,5;2)` → `1,5`,
  `=RESTE(1/3;1/6)` → `0`. Une valeur approchée (`√2`) donne un reste approché (`≈`).
- **Erreur** — `=RESTE(5;0)` → refus : « RESTE : on ne divise pas par 0. »
- **Erreur** — Un seul argument, ou trois : « RESTE attend deux arguments : RESTE(nombre ; diviseur). »
- L'aide sous la barre : « RESTE(n ; d) — le reste de la division de n par d ».

### 2. ET, OU — dans la condition de SI

- **Nominal** — `=SI(ET(A2>=10;B2>=10);"admis";"refusé")` : vrai si **toutes** les comparaisons le sont.
- **Nominal** — `=SI(OU(A2<5;A2>15);"hors norme";"")` : vrai si **au moins une** l'est.
- **Nominal** — Chaque argument est une comparaison, comme la condition de SI : `A2>=10`,
  `B2="fille"`, `A2<>B2`. Au moins une, pas de plafond autre que la longueur d'une case.
- **Limite** — Une case vide dans l'une des comparaisons laisse la formule vide, comme pour SI (T5 :
  recopiée sous les données, la formule n'écrit rien sur les lignes vides).
- **Limite** — Une erreur dans une comparaison donne l'erreur, comme pour SI.
- **Erreur** — `=ET(A1>1;B1>1)` seul (hors de SI) : refus qui donne la bonne écriture (Q-RE-2).
- **Erreur** — Un argument qui n'est pas une comparaison (`ET(A1;B1)`) : « Dans ET, chaque argument
  compare deux choses : ET(A1>=10 ; B1="fille"). »
- **Erreur** — ET dans OU, ou OU dans ET (Q-RE-3).
- `ET` et `OU` ne deviennent pas des produits de lettres (`E×T`) : même règle que `NB` et `SI`
  (noms de deux lettres sans point ignorés comme fonctions de Calcul).

### 3. Ouvrir un fichier CSV

- **Nominal** — Un bouton « Ouvrir un CSV… » à côté de « Télécharger en CSV ». Le fichier se pose
  **comme un collage**, à partir de la case sélectionnée (A1 pour une grille vide), en un seul
  geste : Ctrl+Z le défait (Q-RE-4).
- **Nominal** — Une première ligne de mots au-dessus de nombres devient les titres des colonnes,
  comme au collage (T4).
- **Nominal** — Séparateurs : `;` (Excel et LibreOffice en français, et notre propre
  téléchargement) et tabulation, reconnus seuls. La virgule : Q-RE-5.
- **Nominal** — Le fichier téléchargé par l'atelier se rouvre à l'identique (aller-retour testé).
- **Nominal** — Accents : un fichier en UTF-8 (avec ou sans BOM) **et** un fichier enregistré par
  Excel sous Windows (Windows-1252) se lisent bien (`é` reste `é`).
- **Limite** — Un fichier trop grand pour la grille (au-delà de Z ou de la ligne 200) est **refusé
  entier**, avec sa taille, comme un collage (Q3) — jamais tronqué en silence (V4 tronquait).
- **Limite** — Une case qui commence par `=` dans le fichier est lue comme une formule de la grille,
  comme si on la tapait. Ce n'est pas dangereux : les formules de l'atelier ne lisent que la grille.
- **Erreur** — Fichier de plus de 1 Mo, ou qui n'est pas du texte : refus avant lecture (« Ce
  fichier est trop gros pour la grille (1 Mo au plus). »).
- **Erreur** — Fichier vide : « Ce fichier est vide. »
- Rien ne quitte le navigateur : le fichier est lu sur place, rien n'est envoyé au serveur (RGPD).
- Un message dit ce qui a été posé : « 12 lignes et 3 colonnes posées à partir de A1. »

---

## Questions — tranchées par David (2026-10-18 : les six recos)

**Q-RE-1 — NON aussi ?** V4 a NON. Dans la grille, `NON(A1>3)` s'écrit déjà `A1<=3`.

- **(a)** Non : ET et OU seulement.
- **(b)** Oui, NON(comparaison), dans SI.

**Reco (a).** NON n'apporte rien qu'une comparaison inversée ne fasse déjà, et c'est une fonction de
plus à apprendre.

**Q-RE-2 — ET/OU hors de SI ?**

- **(a)** Refusé, avec la bonne écriture : « ET s'écrit dans la condition de SI :
  =SI(ET(A1>=10;B1>=10);"oui";"non"). »
- **(b)** Accepté : la case montre le mot VRAI ou FAUX (comme LibreOffice).

**Reco (a).** La grille n'a pas de valeur vraie ou fausse : un VRAI affiché ne pourrait servir à
rien ensuite (ni dans un calcul, ni dans SI, qui attend une comparaison) ; même règle que les
comparaisons seules, déjà refusées hors de SI (lot 4).

**Q-RE-3 — ET dans OU (et l'inverse) ?** `=SI(OU(ET(A1>0;B1>0);C1=1);…)`.

- **(a)** Non : un seul niveau, refus clair (« Un ET dans un OU n'est pas pris en charge : écris
  deux SI. »).
- **(b)** Oui, à toute profondeur.

**Reco (a).** Cas rare chez les élèves ; un seul niveau couvre « les deux notes » et « en dehors de
l'intervalle ». À ouvrir plus tard si un professeur le demande.

**Q-RE-4 — Où va le fichier ouvert ?**

- **(a)** Comme un collage : à partir de la case sélectionnée, sans rien effacer d'autre, Ctrl+Z
  le défait.
- **(b)** Comme V4 : il **remplace** toute la grille (après confirmation).

**Reco (a).** Même règles que le collage déjà connu (tout ou rien, titres, annulation) ; on peut
ouvrir deux fichiers côte à côte. Pour repartir de zéro, « Repartir de zéro » existe déjà.

**Q-RE-5 — Les fichiers séparés par des virgules ?** (CSV « à l'anglaise » : `1.5,2.5`.)

- **(a)** Reconnus seulement quand le fichier n'a ni `;` ni tabulation **et** écrit ses décimaux
  avec un point : sinon, la virgule reste décimale (`1,5` sur une ligne reste 1,5).
- **(b)** Jamais : seulement `;` et tabulation.
- **(c)** Une fenêtre d'aperçu où l'on choisit le séparateur (V4).

**Reco (a).** Un fichier d'une seule colonne de décimaux à la française (`1,5`) ne doit jamais être
coupé en deux ; un fichier à l'anglaise (données téléchargées sur un site, souvent en anglais) doit
s'ouvrir sans réglage. La fenêtre de V4 demande un choix que les élèves ne savent pas faire.

**Q-RE-6 — QUOTIENT ?** (Pas demandé, mais c'est la paire de RESTE.)

- **(a)** Non : `ENT(17/5)` donne déjà le quotient (3), l'aide de RESTE le dit.
- **(b)** Oui, QUOTIENT(n ; d).

**Reco (a).** Dans LibreOffice, QUOTIENT(−7 ; 3) = −2 alors que RESTE(−7 ; 3) = 2 : les deux ne
forment pas la division euclidienne pour les négatifs, piège pour un élève. `ENT(n/d)` et
`RESTE(n;d)` vont ensemble (−3 et 2).

---

## Découpage en PR

1. **RESTE, ET, OU** : `grid-functions.ts` et `formula.ts`, aide sous la barre, tests en node.
2. **Ouvrir un CSV** : bouton dans `DataView.svelte`, lecture (taille, encodage, séparateur) dans
   `grid.ts`, pose par `pasteTable` ; tests en node et dans un vrai navigateur.

Doc : [atelier.md](../../systeme/atelier.md) à chaque PR (section « La grille »).
