---
couvre:
  - 'src/lib/mathAST/structure/**'
  - 'src/lib/components/structure/**'
  - src/lib/lexicon/parentheses-advice-grade.ts
---

# Structure d'une expression

> Outil **« Structure d'une expression »** : page publique `/test-structure`
> ([utilitaires-et-demos.md](../utilitaires-et-demos.md)) ; moteur `src/lib/mathAST/structure/`
> ([README.md](README.md)). Héritier d'Algebria (outil Flash/Haxe de David, Sésamath, article 487
> de MathemaTICE). Vocabulaire : [CONTEXT.md](../../../CONTEXT.md) § « La structure d'une
> expression ». Livré le 2026-10-11 (#1125) ; journal du chantier :
> [structure-expression-progress.md](../../archive/wip/structure-expression-progress.md).

Au survol (ou au toucher), la plus petite **sous-expression** sous le pointeur est encadrée, et une
**lecture en français** dit ce qu'elle est (« la somme de 2 et du produit de 3 par y »), avec des
mots cliquables vers le dictionnaire. Un élève de 6e ou avant reçoit un message à la place quand
l'expression demande les relatifs ou les priorités de 5e.

## Décisions de David (2026-10-11, Q22 étendue le 2026-10-12)

| #   | Question                     | Décision                                                                                                                                                                                                                                                                                                                                      |
| --- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Où                           | d'abord un **outil dédié** (page), puis l'**Atelier**. Pas dans les formules des énoncés.                                                                                                                                                                                                                                                     |
| Q2  | Signe « − »                  | **à l'écran, le signe appartient à la somme** (comme la démo, case « le signe − » décochée).                                                                                                                                                                                                                                                  |
| Q3  | Nombre, lettre seuls         | **encadrés**.                                                                                                                                                                                                                                                                                                                                 |
| Q4  | Sous-expressions englobantes | **en option** (réglage, décoché par défaut).                                                                                                                                                                                                                                                                                                  |
| Q5  | Ce qui est affiché           | une **lecture en français** : `2+3y` → « la somme de 2 et du produit de 3 par y », mots en **mots cliquables** vers le dictionnaire.                                                                                                                                                                                                          |
| Q6  | Glisser-déposer              | **pas en v1** (phase 0 à part).                                                                                                                                                                                                                                                                                                               |
| Q7  | Fonctions                    | **argument explorable** (`\sin(2x+1)` : `2x+1` s'encadre).                                                                                                                                                                                                                                                                                    |
| Q8  | Vocabulaire                  | **sous-expression** ; outil : **Structure d'une expression**.                                                                                                                                                                                                                                                                                 |
| Q9  | Somme mêlant `+` et `−`      | à l'écran : somme aplatie, signe à la somme. **Lecture** : somme aplatie avec ses signes, « la somme de 5, −3 et x ». Parenthéser pour les classes sans somme algébrique : à l'auteur.                                                                                                                                                        |
| Q10 | Où la lecture                | celle de la sous-expression survolée, celle de l'expression entière en permanence, et **en sens inverse** : survoler un mot encadre sa sous-expression.                                                                                                                                                                                       |
| Q11 | Formulations                 | le tableau ci-dessous.                                                                                                                                                                                                                                                                                                                        |
| Q12 | Mots cliquables              | la **même fiche que dans les énoncés** (niveau de l'élève) ; définitions manquantes proposées par Claude, validées par David.                                                                                                                                                                                                                 |
| Q13 | Deux termes avec « − »       | « la différence de 5 et 3 » (exactement deux termes), à tous les niveaux.                                                                                                                                                                                                                                                                     |
| Q14 | Élève de 6e ou avant         | message si une suite **mêle `+` et `−` sur 3 termes ou plus**, ou commence par **`−`** ; structure et lecture **masquées** tant que le message est là.                                                                                                                                                                                        |
| Q15 | Accès                        | page **publique** ; niveau = celui de l'élève connecté (`readReaderGrade`) ; visiteur : pas de message.                                                                                                                                                                                                                                       |
| Q16 | Puissance d'un groupe        | base composée OU exposant composé, exposant ≠ 2, 3 : « la puissance 4 de la somme de a et b », « la puissance n + 1 de 2 », « la puissance 2x de e » (exposant en formule, accord au féminin). Base et exposant nombre ou lettre seuls : forme simple, « x puissance 4 », « x puissance n », « e puissance x ».                               |
| Q17 | Base 10                      | jamais carré ni cube : « le produit de 3 par 10 puissance 2 », « 10 puissance −3 ».                                                                                                                                                                                                                                                           |
| Q18 | `AB²` lu comme un produit    | rien dans la lecture : chantier séparé (parseur).                                                                                                                                                                                                                                                                                             |
| Q19 | `−1 × x`                     | inchangé : « l'opposé du produit de 1 par x ».                                                                                                                                                                                                                                                                                                |
| Q20 | « par » emboîtés             | facteur dont la lecture contient « par » : « le produit de A et de B » (« de A, de B et de C ») ; quotient : « le quotient dont le numérateur est A et le dénominateur B » (mots du dictionnaire).                                                                                                                                            |
| Q21 | Message « 6e ou avant »      | tout « − » sans parenthèses devant un nombre ou une lettre déclenche le message (relatifs = 5e).                                                                                                                                                                                                                                              |
| Q22 | Texte du message             | dans une somme : « Le signe − devant un nombre ou une lettre s'apprend en 5e : écris-le entre parenthèses, par exemple (−x) + 3. » (exemple tiré de l'expression de l'élève) ; ailleurs : « Le signe − devant un nombre ou une lettre s'apprend en 5e. » Étendu le 2026-10-12 (longueurs) : « devant un nombre, une lettre ou une longueur ». |
| Q23 | « − » devant une parenthèse  | `−(3 + 2) + 1`, `2 × −(x + 1)` : « Le signe − devant une parenthèse s'apprend en 5e. », sans exemple.                                                                                                                                                                                                                                         |
| Q24 | Suite de plus de 3 termes    | avec une soustraction (`1 + 2 − 3 + 4 − 5`) : « Ajoute des parenthèses pour montrer ce que tu calcules d'abord. », sans propositions ; 3 termes : inchangé (deux propositions).                                                                                                                                                               |

Programmes (points en base) : relatifs, opposé, priorités opératoires et enchaînement d'additions et
soustractions de relatifs arrivent en **5e** (5-007, 5-012, 5-013, 5-023) ; avant, calculs avec
parenthèses (CM1-049, CM2-054). D'où la frontière « 6e ou avant ».

## Spécification (validée par David le 2026-10-11)

### A. L'encadré

| #   | Cas                                        | Comportement attendu                                                                                     |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| A1  | survol d'une expression reconnue           | la plus petite sous-expression contenant le pointeur est encadrée, par-dessus ; la formule ne bouge pas. |
| A2  | `5 − 3 + x`, survol de `−`                 | la somme entière.                                                                                        |
| A3  | `5 − 3 + x`, survol de `3`                 | `3` (terme).                                                                                             |
| A4  | `2 + 3 + 4`, survol du premier `+`         | la somme entière (pas `2 + 3`).                                                                          |
| A5  | `6a`, survol entre `6` et `a`              | le produit `6a`.                                                                                         |
| A6  | `(√3 + 6a) × 2/7`, survol d'une parenthèse | `(√3 + 6a)`, parenthèses comprises.                                                                      |
| A7  | dénominateur d'une fraction                | le dénominateur (pas le quotient).                                                                       |
| A8  | `\sin(2x+1)`, survol de `2`                | `2` ; survol de « sin » : la fonction appliquée.                                                         |
| A9  | `2x + 3 = 7`, survol de `=`                | l'égalité ; survol de `7` : `7` (membre de droite).                                                      |
| A10 | réglage « sous-expressions englobantes »   | coché : toutes les sous-expressions qui contiennent le pointeur sont encadrées (extérieures en gris).    |
| A11 | tactile                                    | un toucher encadre ; un nouveau toucher dans le cadre remonte d'un cran ; l'expression entière reste.    |
| A12 | expression vide                            | rien (pas de message).                                                                                   |
| A13 | expression non reconnue ou incomplète      | « Expression non reconnue ou incomplète », pas d'encadré, pas de lecture.                                |

### B. La lecture

| #   | Écriture                  | Lecture                                                          |
| --- | ------------------------- | ---------------------------------------------------------------- |
| B1  | `2 + 3y`                  | la somme de 2 et du produit de 3 par y                           |
| B2  | `a + b + c`               | la somme de a, b et c                                            |
| B3  | `5 − 3`                   | la différence de 5 et 3                                          |
| B4  | `5 − 3 + x`               | la somme de 5, −3 et x                                           |
| B5  | `−3 + x`                  | la somme de −3 et x                                              |
| B6  | `a × b × c`               | le produit de a, b et c                                          |
| B7  | `a ÷ b`, `\frac{a}{b}`    | le quotient de a par b                                           |
| B8  | `−a`                      | l'opposé de a                                                    |
| B9  | `x²`, `x³`, `x⁴`, `x⁻¹`   | le carré de x ; le cube de x ; x puissance 4 ; x puissance −1    |
| B10 | `√a`                      | la racine carrée de a                                            |
| B11 | `(a + b)`                 | les parenthèses ne se lisent pas : la somme de a et b            |
| B12 | `2x + 3 = 7`              | la somme du produit de 2 par x et de 3 est égale à 7             |
| B13 | `f(x)`, `\sin x`, `\ln x` | l'image de x par f ; le sinus de x ; le logarithme népérien de x |
| B14 | `(2 + x)²`                | le carré de la somme de 2 et x                                   |
| B15 | `−3y + x`                 | la somme de l'opposé du produit de 3 par y et de x               |

- B15 (décision de David, 2026-10-11) : dans une somme, un terme précédé de « − » se lit
  « l'opposé de <terme> », SAUF un nombre seul, lu signé (B4, B5). `−3x` seul : « l'opposé du
  produit de 3 par x ». Un nombre négatif hors somme se lit signé aussi (`2 × (−3)` : « le produit
  de 2 par −3 »).
- Nombres en chiffres, rendus comme formules ; contractions gérées (« du », « des », « de la »,
  « de l' », « au », « aux »). Énumération : dès qu'un élément commence par un article, chacun est
  introduit par « de » (B1 « de 2 et du produit », B12 « du produit … et de 3 ») ; sinon seul le
  premier (B2 « de a, b et c »).
- Inégalités : « est strictement inférieur(e) à », « est inférieur(e) ou égal(e) à », idem
  supérieur ; « est différent(e) de ». Encadrement : « 1 est strictement inférieur à x, qui est
  strictement inférieur à 3 ». Autres relations (∈, ≈…) : la relation entière en formule.
- Bloc sans lecture prévue (`90°`, `n!`, limite, `max`, `\log_2`, `\sin^{-1}`…) : lu comme
  formule, sans mot. Une durée composée (`2 h 30 min`, somme juxtaposée) aussi : un bloc, comme une
  grandeur, jamais aplatie dans la somme qui la contient (lecture-grandeurs, PR 5).
- Puissance : 2 → carré, 3 → cube, sinon « x puissance n », exposant en formule (négatif compris) ;
  `(−1)ⁿ` garde ses parenthèses (« (−1) puissance n », sinon confondu avec `−1ⁿ`).
- Accord : « la somme … est **égale** à », « le produit … est **égal** à ».
- Lecture de la sous-expression survolée dans le panneau, lecture de l'expression entière en
  permanence ; survoler un mot de la lecture encadre sa sous-expression.
- Mots cliquables (somme, différence, produit, quotient, opposé, carré, cube, puissance, racine carrée,
  image…) : la fiche du dictionnaire au niveau de l'élève, comme dans un énoncé. Un mot absent du
  dictionnaire s'affiche sans lien.

### C. Élève de 6e ou avant

| #   | Expression (élève de 6e ou avant)   | Comportement                           |
| --- | ----------------------------------- | -------------------------------------- |
| C1  | `5 − 3 + x`, `10 − 2 − 3`           | message, structure et lecture masquées |
| C2  | `−3 + x`                            | message                                |
| C3  | `2 + 3 + 4`, `5 − 3`, `5 − (3 + x)` | pas de message                         |
| C4  | visiteur, ou élève de 5e et plus    | jamais de message                      |

Texte : « Ajoute des parenthèses pour montrer ce que tu calcules d'abord : (5 − 3) + x ou
5 − (3 + x) ? » — les deux propositions construites depuis l'expression de l'élève.

### D. Accès

Page publique **`/test-structure`** (la démo devient la page, décision de David) ; rien n'est
enregistré ; niveau lu par `readReaderGrade()` (`profiles.grade`).

Points proposés par Claude et acceptés : « x puissance 4 » (B9) ; survol de « sin » = la fonction
appliquée (A8) ; cadres englobants en pointillés gris (A10).

## Comment c'est fait (mesuré, Chromium et WebKit)

- **L'arbre vient de mathAST, pas de MathLive** : MathLive ne connaît qu'une suite plate
  d'atomes. `structure/` aplatit sommes, produits et chaînes de relations (signe « − » à la somme,
  `signs` gardés pour la lecture). Un « − » en tête sans parenthèses porte sur tout le produit ou
  le quotient en ligne qui suit (décision de David) : `−3x` ≡ `−(3x)`, `−6 ÷ 3 + 1` ≡
  `−(6 ÷ 3) + 1` ; inchangés : `(−3)x`, `2 × (−3)`, `−3`, `−3²` (opposé de 3²).
- **Marqueurs `\class{ubs-n<id>}{…}`** : un span par nœud, imbriqués comme l'arbre, rendu
  identique au pixel à `toLatex` (`\htmlData` décale `2\sin x` de 0,17 em). Puissance : jamais
  `{base}^{…}` (des accolades font un atome ordinaire : −0,46 em autour d'un `+` voisin) ; écrire
  `base^{…}`. **Base qui finit par un délimiteur** (`(…)`, `|…|`, `⌊…⌋`, `\cos(x)`) : l'exposant s'écrit DANS le marqueur de la base,
  `\class{…}{\left( … \right)^{…}}` : hors du marqueur, la base est un groupe et MathLive place
  l'exposant d'après le dernier caractère avant `)` (`(−½ + x)²` : 66 px de haut au lieu de 73,
  corrigé le 2026-10-13). Seule exception à « marqueurs imbriqués comme l'arbre » : la zone d'une
  sous-expression ne compte que ses descendants (`StructureFormula`), le cadre de `(x + 1)` ne
  prend pas le `²`.
- **Repérage** : pas l'élément sous le pointeur (dans une fraction les boîtes absolues se
  chevauchent : le dénominateur rendait le quotient) ; on mesure la zone des caractères de chaque
  nœud (Range, svg, `.ML__frac-line`) et on prend le plus profond qui contient le point.
- **Encadré dessiné par-dessus** (div absolue), jamais `\enclose`.
- **Lecture** (`readingOf`) : segments texte / formule / mot, chacun rattaché à l'id de sa
  sous-expression ; la clé d'un mot est le `termId` du dictionnaire (`carré (puissance)`,
  `image (fonction)`…), passée telle quelle à `LexiconTerm`.
- **Message « 6e ou avant »** : `parenthesesAdvice` (un message à la fois, première
  sous-expression en ordre préfixe, « − » en tête avant la suite), appelé seulement si
  `needsParenthesesAdvice(readReaderGrade()())` (`src/lib/lexicon/parentheses-advice-grade.ts` :
  élève de 6e ou avant ; visiteur ou niveau inconnu : jamais).
- **Longueurs** : deux majuscules collées se lisent comme une longueur (« la longueur AB »,
  `capitalPairs: 'length'`), voir [convention-equivalence.md](convention-equivalence.md).
- **Pas dans le chat** : `\class` est interdit en mode restreint.
- **Déplacer une partie** (glisser-déposer, `rearrange.ts`) : `movableGroupOf` dit dans quel
  groupe une sous-expression peut se déplacer (terme dans sa somme, facteur dans son produit,
  membre d'une égalité à deux membres ; rien pour une inégalité ; élève de 6e ou avant : somme
  figée dès qu'elle contient une soustraction) ; `movedLatex` réécrit le seul contenu du marqueur
  du groupe, les marqueurs des parties restent (la formule réécrite reste explorable). Le signe
  suit le terme, un `+` en tête disparaît ; dans un produit, le signe × seulement devant un nombre
  ou une fraction (même écrit par l'élève) — toujours en 6e ou avant (E5.4, David, 2026-10-14) ; un quotient en ligne posé ailleurs qu'en tête
  d'un produit prend des parenthèses (`12 : 3 × 2` → `2 (12 : 3)` : `2 × 12 : 3` se relirait
  `(2 × 12) : 3`) ; une parenthèse de l'écriture usuelle (`2 × (−3)` saisi `2×-3`) suit sa partie ;
  posée à sa place, une partie ne change rien. Un second déplacement repart d'une structure relue. `groupLatex` écrit la ligne pendant le glisser : espaces
  `\mathord{\class{ubs-gap<k>}{\hspace{…em}\vphantom{…}}}` (largeur animée, hauteur de la
  partie saisie ; un « − » en tête précédé d'un espace est groupé, sinon il devient binaire).

## Le champ de formule (glisser-déposer, lot 2, 2026-10-14)

`$lib/components/structure/StructureField.svelte` : une seule formule, qu'on écrit et qu'on
manipule, réutilisable (l'outil `/test-structure` d'abord, l'Atelier ensuite). Spécification F
et décisions G1-G11 : [structure-glisser-deposer-progress.md](../../wip/structure-glisser-deposer-progress.md).

- **Réglages** : `structure` (cadres au survol, règles A), `reading` (lecture de l'expression
  entière et de la dernière sous-expression survolée, sens inverse), `move` (glisser, allume
  `structure`, bouton « Annuler »), `lift` (la carte monte au-dessus de la ligne). Aucun : un
  champ de saisie ordinaire.
- **Gestes** : clic court → champ de saisie MathLive, curseur au même endroit relatif (le champ
  n'a ni la taille ni la place de la formule) ; Entrée ou un clic ailleurs garde la saisie,
  Échap l'annule. Appui sur une partie puis mouvement → déplacement (pas de délai : un délai de
  300 ms cassait le geste naturel) ; hors du groupe, la carte s'arrête au bord (G5) ; Échap la
  ramène. « Annuler » : plusieurs retours ; une saisie au clavier ou un exemple chargé vide
  l'historique. Le toucher bref au doigt écrit (remplace A11).
- **Cadres** (`frame-geometry.ts`, pur) : la zone de chaque sous-expression est mesurée caractère
  par caractère (la boîte d'un élément compte les cales invisibles de MathLive) ; cadre = marge
  fine, puis à gauche et à droite une bordure de plus que les cadres contenus (sur la bordure de
  `2x`, hors des cadres de `2` et de `x`, on vise `2x`) ; jamais plus de 40 % du chemin vers une
  voisine, ni au-delà du fond du groupe, ni à travers la barre d'une fraction. Visé : la plus
  profonde sous-expression dont le cadre contient le point (A1). Au survol, seuls la visée (et
  ses englobantes si réglé) et, si c'est une partie, le fond de son groupe avec son nom.
- **Rendu** : MathLive dans la page (`convertLatexToMarkup`), redessiné à chaque image pendant un
  déplacement (`expressionLatex` avec espaces `\hspace` animés) ; mesures hors écran.
- **Tactile** (`any-pointer: coarse`, ou `touch`) : cadres des parties toujours visibles,
  bordures larges, formule écartée autour des parties (seulement si `move`).
- **6e ou avant** : message C1 → formule affichée et modifiable, sans cadres ni déplacement ;
  sinon somme avec soustraction figée, × toujours écrit.

## Mots ajoutés au dictionnaire pour la lecture (validés par David le 2026-10-11)

Niveaux vérifiés contre les points des programmes en base. Ajout par migration de données
(`20261016090300_dictionnaire_mots_lecture.sql`), question d'accès tranchée : lecture publique,
comme les autres entrées, rien d'autre.

| Mot                | Niveau   | Programmes                                                     |
| ------------------ | -------- | -------------------------------------------------------------- |
| différent          | CE1      | symbole absent du BO ; `=`, `<`, `>` du CP au CE1              |
| racine cubique     | 2        | 2-344, fonction cube : résoudre $f(x) = k$                     |
| racine n-ième      | T_EXP    | TEXP-257 à 269, racines $n$-ièmes (complexes)                  |
| logarithme décimal | T_TECHNO | TTECHNO-040, unique solution de $10^x = b$, définition sans ln |

## Suites décidées, pas commencées

- **L'Atelier** (Q1 : « d'abord un outil dédié, puis l'Atelier ») : phase 0 à ouvrir.
- **Glisser-déposer** de termes, facteurs et membres, comme dans Algebria (Q6) : **en cours**.
  Décisions G1 à G11 et spécification E (validée par David le 2026-10-13) :
  [structure-glisser-deposer-progress.md](../../wip/structure-glisser-deposer-progress.md). Lot 1
  (la réécriture, `rearrange.ts`) et lot 2 (le champ de formule, ci-dessus) livrés ; lot 3 :
  phrase de refus sur un numérateur ou un dénominateur (G7), flèches du clavier (E6) ; puis
  l'Atelier.
