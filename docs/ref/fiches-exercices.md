# Créer des fiches d'exercices — démarche, choix et pièges

> Rédigé le 2026-09-26, après les 18 fiches de 1re spécialité (8 thèmes + géométrie repérée).
> Outillage : `scripts/fiches/` (#453). Scripts de création : `scripts/create-*-1spe.ts`.

Une fiche se fabrique **hors de l'application** : les exercices sont rédigés en fichiers `.md`
(ubumark), vérifiés (calculs, rendu écran, PDF de production), puis écrits en base par un script
gardé. On ne passe par l'éditeur qu'ensuite, pour retoucher.

---

## 1. Ce qui existe (1re spécialité, brouillons FR + EN)

Deux fiches par thème : **Entraînement technique** (catégorie `automatisme`, exercices numérotés,
sans section) et **Applications** (catégorie `application`, 3 sections, variantes `guided` et
parfois `autonomous`).

| Thème (topic en base)      | Entraînement technique                                      | Applications                     | Script                                        |
| -------------------------- | ----------------------------------------------------------- | -------------------------------- | --------------------------------------------- |
| Second degré               | `b5ca9ed3`                                                  | `d6c03510` (de David, complétée) | `create-fiche-technique-second-degre.ts`      |
| Suites                     | `f09992e6`                                                  | `2d043bf5`                       | `create-suites-1spe.ts`                       |
| Fonction exponentielle     | `ad1083a2`                                                  | `18f2252a`                       | `create-exponentielle-1spe.ts`                |
| Dérivation                 | `139ec069` (12 neufs + 17 existants)                        | `4fea9f37`                       | `create-derivation-1spe.ts`                   |
| Fonctions trigonométriques | `808e2eee`                                                  | `dde45b26`                       | `create-trigonometrie-1spe.ts`                |
| Géométrie (produit scal.)  | `c20d4094` (10 neufs + 6 existants)                         | `7d94d681` (7 + 5 existants)     | `create-produit-scalaire-1spe.ts`             |
| Probabilités               | `570376ab`                                                  | `eaf297d5`                       | `create-probabilites-conditionnelles-1spe.ts` |
| Variables aléatoires       | `0ef45afb`                                                  | `d720d039`                       | `create-variables-aleatoires-1spe.ts`         |
| Géométrie repérée          | `6ee9c178` (10 neufs + 2 existants)                         | `bb53d116`                       | `create-geometrie-reperee-1spe.ts`            |
| Automatismes (évolutions)  | `9217dfaa` « Automatismes : évolutions (1) », 2 séries de 8 | —                                | `create-automatismes-evolutions-1spe.ts`      |

Restent (priorité) : automatismes transverses (évolutions, droites, lectures graphiques,
statistiques), listes Python injectées dans les thèmes, logique et ensembles, démonstrations
manquantes.

---

## 2. La démarche, pas à pas

### 2.1 Cadrer sur le programme

- Référence : **nouveau programme de 1re spécialité** (PDF fourni par David le 2026-09-25). Lire la
  section du thème : contenus, capacités attendues, algorithmes, approfondissements, et ce qui
  n'y est PAS (« hors programme » = terminale).
- Inventorier l'existant en base (MCP Supabase, lecture seule) : exercices du thème, leur auteur,
  leur présence dans des fiches, leur corrigé et leur traduction.

  ```sql
  select left(id::text,8), title, topic from exercises
  where '1_SPE' = any(grades) and variations::text ilike '%vecteur normal%';
  ```

### 2.2 Écrire les conventions du thème

Un fichier `CONVENTIONS.md` par thème, donné tel quel aux agents de rédaction. Il contient : le
programme (contenus, hors programme), les modèles à imiter (fiches déjà validées), les exercices
existants à ne pas dupliquer, la **notation vérifiée** (§ 4), les blocs spéciaux du thème (arbre,
tableau de loi…), les consignes d'anglais et les vérifications obligatoires. Partir de la dernière
version et l'adapter.

### 2.3 Faire rédiger (deux agents en parallèle)

Agents `pedagogy-expert`, modèle **Opus**, un par fiche. Le brief fixe **les mathématiques**
(exercice par exercice : données, questions, résultats attendus) — l'agent rédige, il ne choisit
pas le contenu. Disposition de sortie :

```
<dossier>/
  md/  sol/  en/  sol-en/        énoncés FR, corrigés FR, énoncés EN, corrigés EN
  titles.txt                      (technique)   un titre FR par ligne → md/01.md…
  plan.json                       (applications) sections {id,title,position,en}, exercices {key,section,title,en_title}
                                                 → md/<CLÉ>-guided.md (+ -autonomous.md)
  generic.txt                     « CLÉ: C,P » lettres déclarées comme fonctions (sinon vide)
  verif/assert_all.py             sympy / Fraction : UNE assertion par résultat des corrigés
```

L'agent doit rendre : `assert_all.py` qui passe, `pnpm check:ubumark <dossier>` à 0 problème, et
la liste de ses écarts au plan. **Relire ces écarts** : un agent a déjà corrigé une erreur du plan
(parabole y = x²/2 + 1/2, pas x²/4 + 1/2).

### 2.4 Vérifier le rendu

```bash
python3 -m venv scripts/fiches/.venv && scripts/fiches/.venv/bin/pip install pymupdf   # une fois
pnpm fiche:verifier <dossier> "Titre de la fiche"
```

Enchaîne : Typst par le vrai générateur (FR/EN, énoncé/corrigé) → compilation par le compilateur
**exact** de la production → débords de colonne (texte et tracés) → pages en PNG.

Puis **relire les pages**. Les détecteurs ne voient pas : une chaîne d'égalités fausse, un vecteur
minuscule, une ligne justifiée étirée par du code, un renvoi « question 3.a » alors que l'affichage
numérote a) 1), un identifiant Python passé en italique. Chacun de ces défauts a été trouvé à l'œil.

Un défaut du **générateur** (pas du contenu) se corrige dans le code — voir § 2.7.

### 2.5 Écrire en base

Copier le script du thème le plus proche (`scripts/create-*-1spe.ts`), adapter `TOPIC`, `DIR`,
titres FR/EN des fiches, et les exercices existants à inclure (`EXISTANTS_APRES` : après quel
exercice neuf ; `EXISTANTS_SECTION` : fin de section).

```bash
pnpm tsx scripts/create-<thème>-1spe.ts            # simulation : Zod, collisions de titres, existants
pnpm tsx scripts/create-<thème>-1spe.ts --publier  # écrit en prod
```

Garde-fous du modèle : base = prod vérifiée ; tout validé par Zod avant la moindre écriture ;
arrêt si un titre existe déjà dans le thème ou si une fiche de même titre existe ; existants
retrouvés par préfixe d'id **et** titre ; chaque écriture doit rendre sa ligne (`.select()`) ; en
cas d'échec, tout ce qui a été créé est supprimé.

### 2.6 Vérifier ce qui est en base

```bash
pnpm tsx scripts/fiches/regen-depuis-base.ts <sortie> <préfixe fiche 1> <préfixe fiche 2>
node scripts/fiches/compile-prod.mjs <sortie>/*.typ
scripts/fiches/.venv/bin/python scripts/fiches/debord.py <sortie>
```

Puis versionner le script de création (branche → PR), et mettre à jour ce document (§ 1).

### 2.7 Corriger le générateur PDF

1. Test d'abord (rouge), dans `src/lib/ubumark/generators/__tests__/` (`typst-authoring-defects`,
   `pdf-lisibilite`, …).
2. Correctif, suites `ubumark` + `typst` vertes, `check:incremental`.
3. **Empreinte** de tout le contenu en base, `main` puis branche :
   ```bash
   pnpm tsx scripts/fiches/empreinte-typst.ts avant.json     # depuis main
   pnpm tsx scripts/fiches/empreinte-typst.ts apres.json     # depuis la branche
   pnpm tsx scripts/fiches/empreinte-typst.ts --compare avant.json apres.json
   ```
   Chaque changement doit s'expliquer par le correctif, et seulement par lui. Si aucun texte en
   base ne contient le défaut, « 0 changement » ne prouve rien : c'est le test qui prouve.
4. Recompiler les fiches existantes les plus exposées (`regen-depuis-base.ts`).

---

## 2 bis. Fiches d'automatismes : séries figées de questions (ADR 0011)

Les automatismes passent par le **système de questions** (modèles paramétrés, corrigés
automatiquement, Automaths) ; la fiche en est tirée **figée par une graine** : même copie pour
toute la classe.

1. Modèles neufs : un JSON par modèle (camelCase, `testSpecs` obligatoires) dans
   `scripts/questions/<thème>/`, vérifié par `pnpm question:specs --file <json> --apercu 3`, puis
   créé en brouillon par `pnpm tsx scripts/create-questions.ts --dir <dossier> [--publier]`
   (`--mettre-a-jour` pour corriger un modèle encore en brouillon). Les modèles d'autres niveaux
   se réutilisent tels quels (pas de niveau ajouté).
2. Fiche : script sur le modèle de `scripts/create-automatismes-evolutions-1spe.ts` — chaque
   **série** est un exercice listant des (modèle, graine) ; `buildSerie`
   (`src/lib/worksheets/serie-automatismes.ts`) met les cases en pointillés et les réponses en gras
   au corrigé. **Relire les séries en simulation** et changer une graine qui tombe sur un cas limite
   (coefficient 0) ou sur une question déjà posée (refusé automatiquement).
3. Vérifier comme au § 2.6 (`regen-depuis-base.ts`, compilation, débords, pages).

Un exercice figé ne suit plus son modèle : corriger un modèle ne corrige pas une fiche déjà créée.

### Déclarer des fonctions dans un modèle (`shared.genericFunctions`)

Par défaut, seules f, g, h, u, v, w, F, G, H sont des fonctions : dans un modèle, `P(x)` ou
`C(q)` sont lus comme des **produits** et `P'(2)`, `C'(x)` ne se lisent pas du tout (erreur
rouge dans `~…~`, réponse de l'élève jamais comprise). Déclarer les lettres utilisées :

```json
"shared": { "genericFunctions": ["P", "C"] }
```

(éditeur : champ **Fonctions**, `P, C`). La liste **complète** les défauts (f reste une
fonction ; différence avec `generic_functions` d'un exercice, qui les remplace) ; dérivées
(`P'`, `P''`) et réciproque (`P^{-1}`) comprises. Une lettre par nom, ni `e` ni `i`, au plus 10.
Vaut pour tout le modèle : énoncé, choix, réponses attendues, correction (y compris les étapes
générées), réponse de l'élève, barème serveur, `testSpecs`, et l'exercice figé d'une série
(`buildSerie` lui donne `generic_functions` = défauts ∪ fonctions déclarées).

Le contrôle de forme relit aussi la réponse avec ces fonctions : `P'(2)` tapé (ou saisi
`P'\left(2\right)` par MathLive) est juste sans `form: "off"` ; `P'(1+1)` a la bonne valeur
mais pas la forme attendue, comme pour toute autre réponse.

### Nettoyer les coefficients tirés (`shared.cleanCoefficients`)

Un modèle à coefficients tirés (`{{a}}x+({{b}})y+{{c}}=0`) affiche « 1x », « (-1)y », « +0 »
selon le tirage. Plutôt que d'exclure ±1 et 0 des tirages :

```json
"shared": { "cleanCoefficients": true }
```

(éditeur : case **Nettoyer les coefficients (1x → x, +0)**). Après le tirage, chaque formule
`$…$` / `$$…$$` en syntaxe maison de l'énoncé, de la correction (étapes, feedback), des choix de
QCM, et la réponse attendue des cases mathématiques (sans unité ni intervalles) passent par 4
étapes du contrôle de forme : 0·x → 0, x + 0 → x, signes (`(-1)y` → `-y`, `- (-3)` → `+ 3`),
1·x → x. `1x+(-1)y+0=0` s'affiche `x - y = 0`, et la réponse attendue devient `x-y=0` (la
réponse juste de l'élève le reste ; aucun verdict ne change).

Jamais touchés : une fonction (`f(1)`, `P'(-3)`), une parenthèse ou un nombre qui suit une lettre
ou un × (`C(1)`, `x×(-7)`, `97,6×1` : seul le nombre écrit DEVANT un terme est un coefficient), le
signe d'un numérateur (`\dfrac{-10}{10}`), un + écrit (`+\infty`), une chaîne de calcul
(`r = -1 - (-4) = 3`), une relation qui deviendrait `x + 3 = x + 3`, une formule LaTeX d'auteur
illisible en syntaxe maison (`\begin{…}`, `f\left(1\right)`) et le DSL des blocs `courbe / `figure.
Absente ou `false` : rien ne change. Les étapes générées (`generatedSteps`) ne sont pas nettoyées.

⚠️ `{{c;+}}` avec c = 0 écrit `0` sans `+` (« 1y0 », lu comme un produit) : l'option ne le
répare pas. Écrire `+{{c}}` (ou `+({{c}})`), que l'option nettoie.

### Pièges de l'écriture d'un modèle (relevés pendant les chantiers suites et exponentielle, 2026-10)

Corrigés dans le moteur le 2026-10-02 (#616 et la PR `fix/pieges-generation`), ne plus
contourner : réponse attendue réduite à `e` ou `i` ; `{{eval:…}}` contenant e (rendu
`\exponentialE`, accepté comme e) ; nom de variable avec un chiffre (`u1`, `q2`) dans une
condition ; `{{b;+}}` / `{{b;()}}` sur une variable déclarée (= `{{eval:b;+}}`) ; et (PR
`fix/pieges-rendu`) `{{eval:sqrt(21/25)}}` / `{{eval:-sqrt(2)/2}}` rendus `\dfrac{\sqrt{21}}{5}` /
`-\dfrac{\sqrt{2}}{2}` (la bonne réponse de l'élève n'est plus « mauvaise forme ») ; dans le PDF,
`\lVert … \rVert`, `\lvert … \rvert`, `\perp`, `\parallel`, `\angle`, `\triangle`.

Corrigés dans le moteur le 2026-10-02 (branche `fix/pieges-generation-2`), ne plus contourner :
dans une condition, `a % 10 != 0` (= `mod(a, 10)`, l'opérande gauche est le produit qui précède),
`and` / `or` / `not` (= `&&` / `||` / `!(…)`, `not a = 1` nie toute la comparaison ; `!a = 1` est
désormais une erreur explicite) et `pi` (= π, comme dans `{{eval:…}}`) ; `sign()` dans `eval` et
dans une condition (−1, 0 ou 1) ; modificateurs enchaînés en plusieurs `;` (`{{eval:E;();d}}` =
`{{eval:E;d;()}}` = `{{eval:E;d,()}}`) ; tirage dont une variable ne se calcule pas (division par
zéro, `arccos(3/2)`) relancé comme une condition fausse, échec explicite après 100 essais ; variable
de plusieurs lettres valant un multiple de π dans `round(…)` / `cos(…)` ; `x_i`, `p_i`, `u_{i+1}`
dans un énoncé (un `i` en indice est un nom d'indice ; `1+i` reste l'unité imaginaire).

Toujours vrai :

- **`{{eval:…}}` ne calcule que des NOMBRES** : une expression en x (`{{eval:a*cos(x)}}`) sort en
  texte brut (`-cos(x)+2sin(x)`) et les bonnes réponses sont refusées ; `{{eval:cos(p*pi/d)}}`
  n'est pas calculé. Écrire l'expression avec des coefficients tirés, ou une variation par valeur.
- **Pas d'opérateur ternaire** dans `eval` (`a>0?1:3` → « Unexpected token ») : `2-a/abs(a)`.
- **Bloc ```trig** : les étiquettes sont écrites dans [0 ; 2π[ par défaut (−π/6 devient
  « 11π/6 ») ; pour un intervalle d'étude ]−π ; π], ajouter `mesures: principales` (preset,
  `angles:`, solutions et bornes étiquetées ; les points ne bougent pas). `equation:` lit une valeur
  non remarquable écrite avec une fonction : `cos(x) = cos(pi/5)`, `sin(x) > sin(2*pi/7)`. Une borne
  d'arc n'est étiquetée que si elle figure dans le preset ou `angles:`.
- **Variable nommée `e` ou `i`** : c'est la constante (Euler, imaginaire). Ne jamais nommer ainsi.
- **`{{if:…|…|…}}`** est inutilisable dans `expectedAnswer` et dans une variable (le `|` est lu
  comme un tirage) : une variation par cas.
- **Virgule décimale en dur** dans une formule (`0,1\times`) : la virgule nue est une ponctuation
  (espace après, à l'écran comme dans le PDF : « 0, 1 × 0,3 ») et reste une virgule dans un document
  anglais (« 0, 1 × 0.3 »). Écrire `{{eval:1/10;d}}` (virgule ou point selon la langue) ; `0{,}1`
  s'affiche bien en français mais reste une virgule en anglais (décision du 2026-09-25).
- **Variable calculée** utilisée sans `{{eval:…}}` : substituée telle quelle, sans parenthèses
  (`T/g` → « 11\*11-3/2 ») ; toujours passer par `{{eval:…}}`.
- **Trou dans une cellule de tableau** : affiché mais NON saisissable (le tableau est un bloc
  statique) ; poser la question sous le tableau (`$P(X=3)=?$`).
- **Écart-type attendu** `\frac{\sqrt{21}}{5}` : `\sqrt{0,84}` est « mauvaise forme » → annoncer la
  forme dans l'énoncé ; une valeur arrondie demande `precision`. Une réponse avec trop de
  décimales dont l'arrondi redonne l'attendu (`1,136` pour `1,14`) est « mauvaise forme » (0 point,
  spec : `bad_form` + `constraintViolations: ["rounding"]`) ; si son arrondi ne redonne pas
  l'attendu (`1,131`), elle est « incorrect ». Dans les deux cas, le message « Arrondis au
  centième. » s'affiche sous la case. Une troncature au bon nombre de décimales (`1,13`) est
  « incorrect », sans ce message. Même règle avec `orderIndependent` (une réponse exacte est
  appariée avant une réponse trop précise).
- **Un modèle ne mélange pas QCM et cases** (« fill_in_blanks requires blanks[] ») : un modèle par type.
- **Bloc ```figure** : repère avec `axes: oui` et `grille: oui` dans l'en-tête (pas 1 ;
  `grille: 2`, `graduations: 2`, `graduations: non` — voir `docs/ref/geometry/dsl-builtins.md`) ;
  sans ces clés, ni axes ni grille. `O = point(0, 0)` remplace le « O » de l'origine. Nom d'un point : `etiquette="bas-gauche"` (8
  directions `haut`, `bas`, `gauche`, `droite`, `haut-gauche`, `haut-droite` — défaut —,
  `bas-gauche`, `bas-droite` ; `"aucune"` masque le nom seul), sur `point(…)` comme sur tout point
  construit (`milieu`, `intersection`, `projection`…) ou après coup avec `style(A, etiquette=…)` ;
  plus de `masque(A)` + `texte` (corrigé le 2026-10-02 : le nom restait en haut à droite). Un
  `texte(x, y, "…")` est CENTRÉ sur `(x, y)` à l'écran comme au PDF ; `ancre="bas-gauche"` pose son
  coin bas-gauche sur `(x, y)`. Pointillés `trait="pointilles"` / `"tirets"` (alias
  `style="pointille"`). `point(…, visible=faux)` = point masqué, utilisable dans les constructions.
- **`\iff\ &` dans un `align*`** fait échouer TOUT le PDF (« unclosed delimiter ») : écrire
  `X&=0\\\iff Y&=Z` (relevé sur la géométrie repérée, 2026-10-03).
- **Nom de point `Ω` refusé** par le DSL du bloc ```figure (« Caractère inattendu ») : point `W`avec`etiquette="aucune"`puis`texte(…, "Ω")`.
- **Case équation avec `requiredForm: "centre-rayon"`** : un multiple de l'équation est
  `bad_form` (0 point), pas `unoptimal_form` (½) comme sans forme imposée.
- **Condition `a<-1`** est mal lue : écrire `a< -1` (espace).
- **Coefficients d'une équation** : `{{a}}x{{b;+}}y{{c;+}}` affiche « 1x », « -1y », et « 1y0 » si
  c = 0 → `shared.cleanCoefficients: true` (ci-dessus) et `+{{c}}` au lieu de `{{c;+}}` (le `;+`
  d'un 0 n'écrit pas de `+`). Ne plus exclure ±1 et 0 des tirages pour ce seul motif.
- **Vecteur colinéaire** : deux cases de coordonnées n'acceptent pas un vecteur colinéaire
  (aucune réponse « vecteur ») ; imposer une coordonnée ou demander « le vecteur lu sur l'équation ».
- **`texte(…, "n⃗")`** (flèche combinante) sort en carrés vides dans le PDF : nommer le vecteur
  dans l'énoncé (« tracé en bleu »).
- **PDF, ensembles** (relevé sur la logique, 2026-10-03) : `\mathbb{D}` sort « mathbbD » (seuls
  R, N, Z, Q, C sont convertis) → caractère `𝔻` ; mais une formule réduite à `$𝔻$` est coupée en
  deux moitiés UTF-16 (caractères cassés) → toujours derrière une commande (`x\in 𝔻`) ; une
  commande collée `\mathbb{N}\subset` fait échouer TOUTE la fiche → espace (`\mathbb{N} \subset`) ;
  `\not\subset`, `\nsubseteq`, `\operatorname{Card}` sortent en texte brut → `\mathrm{Card}`.
- **Règle `custom` avec une variable négative** : `{{p}}` est substitué sans parenthèses
  (`+ -3`) → écrire `({{p}})`.
- **`cleanCoefficients` ne nettoie pas une formule contenant `\leqslant` / `\geqslant`**
  (`x^2+1x\leqslant2` reste tel quel ; `x^2-x>7` est nettoyé).
- **QCM et réponse « intervalles »** : un modèle ne mélange pas QCM et cases ; `shuffleChoices`
  vaut pour tout le modèle → faire tourner les choix avec une variable pour placer la bonne
  réponse.

Règles d'écriture qui évitent un défaut :

- Indice variable dans un **corrigé** : `u_{ {{a}} }`, jamais `u_{{a}}` (rendu « u₁0 » pour 10 ;
  l'énoncé, lui, est renormalisé).
- Une spec `bad_form` / `unoptimal_form` liste ses `constraintViolations`, sinon elle est rouge.
- Case de l'énoncé : `$x=?$` (le `?` devient la case).
- Décimal exact accepté (3,5 pour 7/2) : option de case `acceptDecimal` (pas d'équivalent dans
  TinyMath). Ensemble de solutions : case `answerKind: "intervalles"`.
- Plusieurs bonnes réponses (contre-exemple à « pour tout réel x, x² > x ») : case
  `rulesSuffice: true` + règle (`{ "type": "custom", "expression": "answer^2 <= answer" }`). Un
  nombre simple OU une fraction (`\frac{1}{2}`, `-\frac{3}{4}`) y est accepté, valeur exacte jugée
  par les règles ; fraction à simplifier (`\frac{2}{4}`, `\frac{-3}{4}`) → `unoptimal_form`
  (`reducedFractions`), calcul non effectué (`1-1`) → `bad_form` (décision du 2026-10-03). Avec
  `precision`, seul un nombre simple reste admis.
- Commande LaTeX suivie de `e` : laisser l'espace (`\geqslant e^{…}`) ; collé, `\geqslante` fait
  échouer tout le PDF.
- Titre de modèle = texte brut : pas de `e^(kx)`, écrire en mots ou en exposants Unicode (`eᵏˣ`).

Équation attendue (`y=x+1`) : `y=1+x` est juste (#622) ; `x+1=y` (membres échangés) est jugé
« mauvaise forme », **décision de David du 2026-10-02** (on attend l'équation réduite `y = mx + p`).
Une valeur recopiée derrière « x = » (`x=\frac32`) est jugée sur la valeur (#624).

**Case « équation » (droite, cercle — 2026-10-03).** Sans marquage, une équation est comparée comme
une ÉCRITURE : pour `2x-y+1=0`, `y=2x+1` ou `4x-2y+2=0` sont « faux ». Pour juger l'ensemble de
points, marquer la case `answerKind: "equation"` (ou `blankDefaults`, case « Réponse : équation »
de l'éditeur) :

```json
{ "expectedAnswer": "{{a}}x-y+{{b}}=0", "answerKind": "equation" }
{ "expectedAnswer": "(x-{{a}})^2+(y-{{b}})^2={{r2}}", "answerKind": "equation", "requiredForm": "centre-rayon" }
```

- droite : toute équation proportionnelle est juste (`y=2x+1`, `-2x+y-1=0`, `x-4=0` et `2x=8`
  pour `x=4`, fractions comprises) ;
- cercle (degré 2) : forme développée ou centre-rayon (`3^2` ou `9`), membres échangés ou signes
  changés, sont justes (coefficient de x² égal à ±1) ; un multiple (`2x^2+2y^2…`) vaut ½ avec
  « Simplifie l'équation : le coefficient de x² doit valoir 1. ». L'attendue peut être écrite avec
  n'importe quel multiple, elle est ramenée au coefficient 1 (x², sinon y², sinon le premier terme
  de plus haut degré) ;
- forme exigée (`requiredForm`) : `reduite` (y = mx + p, ou x = c ; `x+1=y` refusée),
  `cartesienne` (ax + by + c = 0, membre droit 0), `centre-rayon` ; juste mais autre forme →
  `bad_form` (spec : `constraintViolations: ["form"]`, comme pour un cercle à simplifier) ;
- une attendue qui n'est pas une équation polynomiale en x et y fait échouer les specs du modèle.
  Règle complète : `docs/ref/convention-equivalence.md` (§ Réponse « équation »).

Corrigés dans le moteur (ne plus contourner) : notations `\exp`, `\exponentialE`, `\mathrm{e}`
(#616) ; `(x+1)/e^x`, `e×e`, `(e²)ⁿ` (#618) ; `\textcolor{#…}` dans le PDF (#602) ; tableau à
cellules `{{…}}` dans un énoncé, `\dots`, bloc de code sous « 10. » (#609) ; courbe, tableau, code
et liste dans l'énoncé d'une question à trous (#607).

## 3. Choix faits avec David

- **Fiches les plus complètes possible** : elles incluent les exercices existants du thème, sans
  les modifier (ils restent aussi dans leurs fiches d'origine). Ne jamais modifier une fiche ou un
  exercice publié de David sans son accord.
- **Brouillons** (`status: draft`) : David relit et publie.
- **Thème (topic)** : un par chapitre du programme (`Suites`, `Variables aléatoires`, `Géométrie
repérée`…). Les titres d'exercices sont uniques par thème (« Bilan technique » existe dans chacun).
- **Hors programme** (nouveau programme, 2026-09-25) : dans les brouillons, un exercice entièrement
  hors programme va dans une section « Pour aller plus loin (terminale) » ; une question hors
  programme dans un exercice au programme est réécrite (#440, #441).
- **Anglais** : britannique scolaire ; titres d'exercices non traduits ; la **langue du document**
  décide du séparateur décimal : point en anglais, virgule en français (#448).
- **Lisibilité PDF** (« variante E ») : fraction et vecteur en colonne de premier niveau d'une
  formule du texte en taille normale (#436, #451).
- Numérotation affichée : **a) 1) i)** (le markdown s'écrit `1.` puis `   a.`).

---

## 4. Notation : ce qui marche (vérifié à l'écran et dans le PDF)

- `~…~` (notation maison) pour les calculs ; `$…$` (LaTeX) pour le reste : vecteurs
  (`$\overrightarrow{AB}$`, `$\vec{n}\begin{pmatrix}a\\b\end{pmatrix}$`), points
  (`$A(2\,;-1)$`), ensembles, intervalles, primes sur une autre lettre que f, g, h.
- `~…~` refuse : grec **sans** antislash (`~alpha~` = a·l·p·h·a), grec majuscule (`\Delta`,
  `\Omega`), `\neq`, `\geq`, `\mapsto`, les primes hors f/g/h (sauf fonctions déclarées : §
  2 bis, `genericFunctions`), `k<-3` (écrire `k< -3`).
- **Décimaux : toujours avec un point** (`~0.3~`, `$0.3$`), dans les deux langues. Jamais `0{,}3`
  (resterait une virgule en anglais).
- Jamais de crochet `[` `]` dans le texte brut (segment : `$[AB]$`, et pas dans un titre).
- Listes : `1.` seul sur sa ligne puis `   a. …` ; jamais « 1. a. texte ». Renvois : « question c) 1) ».
- Calcul sur plusieurs lignes : `$$\begin{align*} A &= B \\ C &= D \end{align*}$$` au-delà de
  ~35 caractères ou de 2 « = » ; jamais de `\quad`.
- Tableaux markdown : formules des cellules en `$…$` uniquement ; au plus 6 colonnes de valeurs.
- Arbre pondéré : bloc ` ```probtree ` (une branche par ligne, `étiquette:probabilité`, enfants
  indentés de 2 espaces) ; 3 épreuves au plus en arbre complet ; sous une sous-question, indenter
  le bloc de 6 espaces.
- Python : bloc ` ```python ` ; dans le texte, identifiants entre backticks (`` `moyenne(n)` ``).
- Pas d'image ni de figure : décrire la configuration, conseiller une figure à main levée.

---

## 5. Pièges techniques rencontrés (et corrigés)

**Le PDF est compilé dans le navigateur par typst.ts 0.6.1-rc5** : une seule erreur Typst fait
échouer tout le PDF de la fiche, sans message à l'enseignant. Le Typst CLI local (0.14) n'est pas
un témoin : il échoue sur cetz 0.3.0 et accepte ce que 0.6.1-rc5 refuse. D'où `compile-prod.mjs`.

| Symptôme dans le PDF                                        | Cause                                              | PR   |
| ----------------------------------------------------------- | -------------------------------------------------- | ---- |
| fiche entière en échec après un vecteur `AB` suivi d'un nom | nom lu comme fonction                              | #437 |
| fractions minuscules dans le texte                          | Typst réduit toute fraction en ligne               | #436 |
| décimaux d'un arbre en `0″,″3` ; issue sur l'étiquette      | guillemets repassés en primes                      | #443 |
| arbre de 3 épreuves débordant sur la colonne voisine        | largeur non ajustée                                | #444 |
| `0,0 484` au lieu de `0,048 4` (écran aussi)                | décimales après `{,}` groupées comme un entier     | #445 |
| issue `RR` affichée ℝ                                       | `RR`, `NN`, `ZZ`, `QQ`, `CC` = ensembles en Typst  | #446 |
| « 0,8 » dans les fiches anglaises                           | formatage français quelle que soit la langue       | #448 |
| `3p = 0,45` affiché « = 0,45 » dans un `align*`             | seule la 1re ligne gardait son membre de gauche    | #449 |
| fiche entière en échec avec `Ω(1 ; 2)`                      | `Omega(` lu comme appel de fonction, `;` = tableau | #451 |
| coordonnées de vecteur en colonne minuscules                | matrice en ligne composée en taille d'indice       | #451 |

Autres leçons :

- Un détecteur qui ne trouve rien doit prouver qu'il a regardé : l'ancien détecteur de débords
  attendait un dossier et, appelé sur des fichiers, affichait « 0 débord » sans rien analyser.
  `debord.py` refuse désormais de conclure sans PDF, et se valide sur un témoin fautif.
- Les tracés (arbres cetz) ne sont pas du texte : un détecteur de texte ne voit pas leurs débords.
- `jsonb` réordonne les clés : relire une ligne écrite en comparant `JSON.stringify` échoue dès
  qu'une clé est ajoutée — comparer avec des clés triées.
- `worksheet_sections` a une contrainte d'unicité sur la position : réordonner via une position
  temporaire.
- Un sous-agent qui dit avoir « tué » un test peut laisser un `vitest` orphelin à 100 % CPU :
  `ps -axo pid,ppid,etime,%cpu,command | grep "node .*ubumaths-wt-"`.
