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
   au corrigé, et convertit chaque formule maison `~…~` / `~~…~~` en LaTeX `$…$` / `$$…$$` avec
   les fonctions déclarées par **le modèle de la question** (formule illisible : série refusée).
   L'exercice figé n'a donc pas de `generic_functions` : l'écran et le PDF ne relisent jamais une
   formule LaTeX avec la liste d'un exercice. **Relire les séries en simulation** et changer une
   graine qui tombe sur un cas limite (coefficient 0) ou sur une question déjà posée (refusé
   automatiquement).
3. Vérifier comme au § 2.6 (`regen-depuis-base.ts`, compilation, débords, pages).

Un exercice figé ne suit plus son modèle : corriger un modèle ne corrige pas une fiche déjà créée.

### Rattacher un modèle au référentiel (`points`)

Champ facultatif du JSON, **codes** des points (`curriculum_points.code`) :

```json
"grades": ["1_SPE"],
"points": ["1SPE-135", "1SPE-118"]
```

Tableau de codes, sans doublon, au plus 20. Ce n'est pas une colonne du modèle : `create-questions.ts`
(et `question:specs`) le retirent avant `checkTemplate`, et les liens sont écrits dans
`question_template_points`. Avant toute écriture, **tous** les fichiers sont vérifiés : code inconnu
ou archivé, ou niveau du point absent de `grades` (un point `TCOMP-…` sur un modèle `["T_SPE"]`) →
erreur qui nomme fichier et code, rien d'écrit. La simulation affiche par fichier les liens à
ajouter, déjà présents, et ceux en base absents du fichier. À la création les liens sont écrits ;
sur un modèle déjà en base (brouillon), `--mettre-a-jour` ajoute les liens manquants. Un lien absent
du fichier n'est **jamais** supprimé, sauf `--mettre-a-jour --remplacer-points`. Sans champ `points`,
aucun lien n'est lu ni touché.

**Changer de niveau un brouillon** : `--mettre-a-jour` réécrit aussi ses `grades` (comparés comme un
ensemble, l'ordre ne compte pas), avant ses liens. Un brouillon `["1_SPE"]` passé à `["2"]` avec des
points `2-…` reçoit ses nouveaux liens ; les anciens `1SPE-…` restent, signalés « en base absents du
fichier, gardés » — `--remplacer-points` pour les retirer. Les `grades` d'un modèle publié ne sont
jamais touchés.

Modèle **publié** : refusé, sauf `--mettre-a-jour --liens-publies`, qui **ajoute** seulement ses liens
manquants — contenu jamais touché, aucun lien retiré (incompatible avec `--remplacer-points`). Une
carte publiée rattachée entre dans le paquet de révision « Programme » des élèves dès qu'ils la
travaillent : simuler d'abord, montrer la simulation à David (décidé le 2026-10-04). Ses points sont
alors contrôlés contre les `grades` **lus en base**, pas ceux du fichier.

**Modèle sans fichier dans le dépôt** (écrit dans l'éditeur, importé) : `link-template-points.ts`.

```bash
pnpm tsx scripts/link-template-points.ts --mapping liens.json            # simulation
pnpm tsx scripts/link-template-points.ts --mapping liens.json --publier  # écrit
```

```json
[{ "id": "<uuid du modèle>", "points": ["1SPE-050", "1SPE-051"] }]
```

Au plus 500 entrées, 1 à 20 codes chacune, sans doublon ni id répété. **Ajout seulement** : aucun
lien retiré, aucun contenu touché. Avant toute écriture : id inexistant, code inconnu ou archivé,
niveau du point absent des `grades` **en base** du modèle → erreur, rien d'écrit. Un modèle publié
est refusé sans `--liens-publies` (même règle que ci-dessus). Chaque ajout est relu.

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
générées), réponse de l'élève, barème serveur, `testSpecs`, et la question figée dans une série
(depuis le 2026-10-03, `buildSerie` convertit ses `~…~` en LaTeX avec la liste DE SON modèle : `P`
déclaré par un modèle reste un produit dans `P(1+t)` d'une autre question de la série ; avant, la
série recevait `generic_functions` = union des modèles — les deux séries « Évolutions » déjà
créées n'ont aucune `~…~` ni liste, rien à reprendre). Un motif `requiredForm` les lit aussi : `a:integer*C(b:integer)`
reconnaît `3C(2)` (le motif était illisible, jamais reconnu).

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
Absente ou `false` : rien ne change. Les étapes générées (`generatedSteps`) partent de la formule
nettoyée (`x = 5`, pas `1x + 0 = 5`) ; une parenthèse devenue inutile disparaît (`(x+0)^2` →
`x^2`, `2(x+0)` → `2x` ; `C(x)` et `2(3)` restent) ; une réponse attendue écrite en LaTeX
(`x^2+{{b}}x\leqslant 2`) est nettoyée et reste en LaTeX (`x^2 + x \leqslant 2`).
Autour d'une exponentielle aussi (2026-10-04) : `{{k}}e^{{{a}}x}{{b;+}}` tiré avec k = 1, a = −1,
b = −3 donne `e^{-x}-3` (l'attendue nettoyée écrivait `\euler`, illisible pour le validateur :
la bonne réponse était jugée fausse). Plus besoin de `{{if:k==1|…}}` pour éviter `1e^{…}`. Une
puissance nulle n'est pas réduite : `e^{0x}` devient `e^0`, comme `x^0` reste `x^0`.

⚠️ `{{c;+}}` avec c = 0 écrit `0` sans `+` (« 1y0 », lu comme un produit) : l'option ne le
répare pas. Écrire `+{{c}}` (ou `+({{c}})`), que l'option nettoie.

### Pièges de l'écriture d'un modèle (relevés pendant les chantiers suites et exponentielle, 2026-10)

**Variable qui peut être négative, citée sans parenthèses** : `{{a}}` est remplacé par sa valeur
telle quelle (voulu : `{{a}}x{{b}}` avec b toujours négatif donne `2x-3`). Avec a = −3, `x-{{a}}`
s'affiche `x--3`, `5\times{{a}}` → `5\times-3`, `2^{{a}}` → `2^-3`, `{{a}}^2` → `-3^2` (lu −(3²)),
et `2{{a}}` → `2-3` (produit lu comme une soustraction). Écrire `{{a;()}}` (parenthèses si
négatif) ou `{{eval:…}}` ; terme signé : `{{a;+}}`. `pnpm question:specs` **avertit**
(« Avertissement : … », exemple de rendu sur un tirage réel) sans changer le verdict : formules
seulement (`$…$`, `~…~`, réponses attendues, formats), variable négative sur au moins un tirage ;
le produit implicite (collé à un chiffre, une lettre, `)`) n'est signalé que si la variable prend
aussi des valeurs positives. Mesure du 2026-10-03 : 0 avertissement sur les 209 JSON du dépôt et
les 815 modèles de production (2424 citations de variables négatives examinées ; les 32 contextes
suspects hors formules sont dans des blocs ` ```courbe `, lus par le parseur : `x--2` = x + 2).

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

Corrigés dans le moteur le 2026-10-03 (branche `fix/regle-negatif-inegalite`), ne plus
contourner : dans une règle de validation (`custom`, `range`, `divisor`, `multiple`,
`equation_root`, `equivalent`), une variable négative ou une expression est substituée entre
parenthèses (`answer^2 + {{p}} < {{q}}*answer` avec p = −3, `{{p}}^2` vaut p²) ; `({{p}})` reste
accepté ; `cleanCoefficients` nettoie une inégalité écrite en LaTeX (`\leqslant`, `\geqslant`,
`\leq`, `\geq`, `\le`, `\ge`, `\neq` : `x^2+1x\leqslant2` → `x^2 + x \leqslant 2`, `\le` / `\leq`
rendus `\leqslant`) avec les mêmes gardes (chaîne `0\leqslant x\leqslant 2` laissée telle quelle,
chaque membre garde sa valeur) ; rien à nettoyer : le texte d'auteur reste intact.

Corrigés dans le moteur le 2026-10-03 (branche `fix/rendu-ensembles`), ne plus contourner :
dans le PDF, une commande collée à la suivante (`\mathbb{N}\subset\mathbb{Z}`, `𝔻\subset`,
`x\in𝔻`, `a\cdot{b}`, `\alpha2`) ne fait plus échouer la fiche ; `\mathbb{X}` pour toute lettre
(`\mathbb{D}` = 𝔻) ; `\not\subset`, `\nsubset`, `\not\subseteq`, `\nsubseteq`, `\not\supset`,
`\not\in`, `\ni`, `\not=`, `\neg` / `\lnot`, `\wedge` / `\land`, `\vee` / `\lor`,
`\complement`, `\operatorname{Card}` ; à l'écran comme au PDF, une formule réduite à `$𝔻$`
(caractère hors du plan de base) n'est plus coupée en deux caractères cassés.

Corrigés dans le moteur le 2026-10-03 (branche `fix/generation-auteurs`), ne plus contourner :
condition `a<-1` (= `a < -1`, l'espace n'est plus nécessaire ; dans un `~…~`, écrire toujours
`k< -3`) ; `{{if:condition|alors|sinon}}` dans une réponse attendue et dans l'expression d'une
variable, imbriqué ou non (`{{if:a>0|{{if:b>0|1|2}}|3}}`) — une condition qui ne porte pas sur
les variables y est une erreur explicite ; variable dont la valeur est une formule citée dans
une autre (`N = T/g` avec T = « 11\*11-3 » → `(11*11-3)/2`, parenthèses seulement quand le sens
l'exige ; `{{eval:…}}` reste nécessaire pour un NOMBRE) ; raccourci `{{b;();d}}` = `{{eval:b;();d}}`
(plusieurs modificateurs) ; faute d'écriture dans une variable (fonction ou lettre inconnue,
syntaxe, variable non déclarée) : la génération échoue au premier tirage avec son message, au
lieu de 100 relances ; une division par zéro ou un `arccos` hors domaine restent relancés ;
`cleanCoefficients` (étapes générées, `\leqslant` en réponse, `(x+0)`) et `genericFunctions`
(motifs `requiredForm`, séries de plus de 10 fonctions) : voir les deux sections ci-dessus.

Corrigés dans le moteur le 2026-10-03 (branche `fix/figures-pdf`), ne plus contourner :
`\iff\ &` (et tout `\ ` avant un `&`, en fin de ligne, suivi d'un retour à la ligne, ou dans un
`cases`) ne fait plus échouer la fiche ; nom de point ou d'objet en lettre grecque (`Ω`, `α`…`ω`,
`Α`…`Ω` ; `π` est un nom ordinaire, la constante reste `\pi`) ; `texte(…, "n⃗")` (flèche
combinante U+20D7, aussi ←⃖, ↔⃡) dessine la lettre en italique surmontée de la flèche, à l'écran
comme au PDF ; `forme="croix"` / `"cercle"` / `"carre"` dessinés à l'écran comme au PDF (une forme
inconnue est une erreur) ; au PDF, un objet qui dépasse de la `fenetre:` (cercle, droite, segment,
arc, polygone) est découpé au cadre comme à l'écran, le repère, les noms et les textes restant
entiers (un nom de point hors de la fenêtre est omis).

Corrigés dans le moteur le 2026-10-03 (branche `feat/reponse-vecteur-premier`), ne plus
contourner : **vecteur colinéaire** — une case `answerKind: "vecteur"` reçoit le vecteur entier
(`(2;-3)` ou en colonne) et, avec `vectorMode: "colineaire"`, accepte tout vecteur colinéaire non
nul (vecteur normal, directeur) ; ne plus imposer une coordonnée ni demander deux cases (voir
« Case vecteur » ci-dessous) ; **`isPrime(…)`** utilisable dans une règle `custom` (voir
« Plusieurs bonnes réponses »).

Corrigés dans le moteur le 2026-10-03 (branche `feat/trous-dans-tableau`), ne plus contourner :
un trou dans une cellule de tableau (`| $P(X=x_k)$ | $0{,}2$ | $?$ |`, ou `{{blank:N}}` en texte)
est saisissable comme dans un paragraphe : numéroté dans l'ordre d'écriture (cellules de gauche à
droite, ligne après ligne, puis la suite de l'énoncé ; un tableau `:table-h` s'affiche transposé
mais garde cette numérotation), Tab passe à la case suivante, états juste /
faux par case, case « ? » en flash, réponse affichée en correction ; sur téléphone le tableau défile
dans son cadre. Au PDF, la cellule montre « …… » et le corrigé la réponse en gras.

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
- **Virgule décimale en dur** dans une formule (`0,1\times`) : la virgule nue est une ponctuation
  (espace après, à l'écran comme dans le PDF : « 0, 1 × 0,3 ») et reste une virgule dans un document
  anglais (« 0, 1 × 0.3 »). Écrire `{{eval:1/10;d}}` (virgule ou point selon la langue) ; `0{,}1`
  s'affiche bien en français mais reste une virgule en anglais (décision du 2026-09-25).
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
- **Case équation avec `requiredForm: "centre-rayon"`** : un multiple de l'équation est
  `bad_form` (0 point), pas `unoptimal_form` (½) comme sans forme imposée.
- **Coefficients d'une équation** : `{{a}}x{{b;+}}y{{c;+}}` affiche « 1x », « -1y », et « 1y0 » si
  c = 0 → `shared.cleanCoefficients: true` (ci-dessus ; `{{c;+}}` écrit `+0` depuis #701, que
  l'option retire). Ne plus exclure ±1 et 0 des tirages pour ce seul motif.
- **`\vec` ou `\overrightarrow` dans la formule d'une case** : `$\vec{n}=?$` ou
  `$\vec{n}\begin{pmatrix}?\\?\end{pmatrix}$` n'affiche AUCUNE case à l'élève (le parseur mathAST
  ne connaît pas `\vec` : la formule est rendue statique — mesuré le 2026-10-03, test
  `FillBlanksInput-vector-keyboard`). Mettre la case seule dans sa formule :
  `un vecteur normal $\vec{n}$ : $?$`.
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
  `rulesSuffice: true` + règle (`{ "type": "custom", "expression": "answer^2 <= answer" }`).
  `isPrime(expr)` y vaut 1 si expr est un entier premier, 0 sinon (non entier, < 2) : contre-exemple
  à « n² + n + 41 est toujours premier » → `"isPrime(answer^2+answer+41) == 0"` ; seul,
  `"isPrime(answer)"` (non nul = vrai). Au-delà de 10^12, règle non évaluable (réponse fausse,
  « Impossible de vérifier ta réponse. »). Règles seulement : pas dans `{{eval:…}}` ni dans une
  condition (autre évaluateur). Un
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

**Case « vecteur » (2026-10-03).** Le vecteur dans UNE case, coordonnées exactes comparées
exactement (fractions, racines) ; option `vectorMode` (case ou `blankDefaults` ; éditeur : cases
« Réponse : vecteur » et « Vecteur : tout vecteur colinéaire non nul est juste ») :

```json
{ "expectedAnswer": "({{a}};{{b}})", "answerKind": "vecteur", "vectorMode": "colineaire" }
{ "expectedAnswer": "\\begin{pmatrix}{{eval:xb-xa}}\\\\{{eval:yb-ya}}\\end{pmatrix}", "answerKind": "vecteur" }
```

- l'élève écrit `(2;-3)` (clavier physique ; la virgule `(2,3)` est une virgule DÉCIMALE → faux,
  avec le message « Écris un vecteur : … point-virgule ») ou utilise l'onglet « Vecteur » du clavier
  virtuel (colonne à 2 ou 3 coordonnées, `(□;□)`, flèche droite pour passer à la coordonnée
  suivante) ; dimension 2 ou 3 ;
- `exact` (défaut) : mêmes coordonnées ; `colineaire` : tout multiple non nul est juste
  (`(-4;6)` pour `(2;-3)`, sans ½), le vecteur nul est faux avec un message ;
- vecteur juste : chaque coordonnée est ensuite jugée comme une case ordinaire (2026-10-04) —
  en `exact`, contre la coordonnée attendue (`(\frac{2}{4};3)` pour `(\frac{1}{2};3)` : juste avec
  « La fraction peut être simplifiée », `unoptimal_form` ; `(0.5;3)` : `bad_form`) ; en
  `colineaire`, la valeur est libre, seules les contraintes d'écriture restent (fraction
  simplifiable). Écrire l'attendue en LaTeX (`\frac{1}{2}`, pas `1/2`, sinon `\frac{1}{2}` est
  jugé de mauvaise forme, comme dans une case) ; pas de `requiredForm` ; specs : `correct`,
  `incorrect`, `unoptimal_form`, `bad_form` ;
- attendue illisible, de dimension ≠ 2 ou 3, ou nulle en mode `colineaire` → specs rouges.
  Règle complète : `docs/ref/convention-equivalence.md` (§ Réponse « vecteur »).

**Cases « primitive » et « solution-ed » (2026-10-04).** Une primitive, ou une solution d'équation
différentielle, dans UNE case, jugée par le calcul et jamais par comparaison au texte attendu ;
champs dans la case ou dans `blankDefaults` (éditeur : cases « Réponse : primitive d'une
fonction » et « Réponse : solution d'une équation différentielle », avec leurs champs) ; les
variables tirées sont résolues dans `integrand`, `interval`, `equation`, `initial` :

```json
{ "expectedAnswer": "x^{{n}}", "answerKind": "primitive", "integrand": "{{n}}x^{{eval:{{n}}-1}}" }
{ "expectedAnswer": "\\ln(x)", "answerKind": "primitive", "integrand": "\\frac{1}{x}", "interval": "]0;+\\infty[" }
{ "expectedAnswer": "Ce^{2x}+3", "answerKind": "solution-ed", "equation": "y'=2y-6", "solutionMode": "generale" }
{ "expectedAnswer": "e^{2x}+3", "answerKind": "solution-ed", "equation": "y'=2y-6", "initial": "y(0)=4" }
```

- primitive : juste si la dérivée de la réponse vaut `integrand` ; à une constante près (`x^3+5`,
  `x^3+C`, `x^3+\lambda` : toute lettre autre que `variable`, sauf e, i, π, est une constante) ;
  la dérivée de f au lieu d'une primitive est fausse avec « C'est la dérivée de f, pas une
  primitive. » ; `interval` (facultatif) : la réponse doit y être définie (`\ln(-x)` pour 1/x sur
  ]0;+∞[ est faux, `\ln|x|` juste) ; `variable` : défaut `x` ;
- solution-ed : `y` ← réponse, `y'` ← sa dérivée, les deux membres de `equation` doivent être
  égaux pour tout x (1er ordre seulement ; `y'`, `y'(x)`, `y(x)` lus ; `function` : défaut `y`) ;
  une constante écrite est essayée avec 3 valeurs ; `solutionMode: "generale"` exige une
  constante qui compte (`5e^{2x}` pour y' = 2y : faux, « C'est une solution particulière : il
  manque la constante. ») ; `"une"` (défaut) accepte toute solution ; `initial` (mode `une`
  seulement) doit être vérifiée ; préfixe `y=` / `F(x)=` toléré ;
- réponse juste : écriture jugée comme une case ordinaire comparée à elle-même (`\frac{3x^3}{3}` :
  « La fraction peut être simplifiée », `unoptimal_form`) ; specs : `correct`, `incorrect`,
  `unoptimal_form`, `bad_form` ;
- `integrand` ou `equation` absent → la génération échoue ; attendue qui n'est pas une primitive
  (ou une solution, générale en mode `generale`), équation illisible ou du 2d ordre, condition
  initiale en mode `generale` → specs rouges. Règle complète :
  `docs/ref/convention-equivalence.md` (§ Réponse « primitive » / « solution-ed »).

Corrigés dans le moteur (ne plus contourner) : `\frac{x^3}{3}` et `\frac{1}{3}x^3` (et
`\frac{-x^2}{4}`, `-\frac{1}{4}x^2`) sont une seule forme dans une case ordinaire, une fraction
simplifiable restant perfectible (2026-10-04) ; `\ln|x|` a la forme de `\ln(x)` quand
`options.answerAssumptions` déclare x > 0 (2026-10-04) ; notations `\exp`, `\exponentialE`, `\mathrm{e}`
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
- **Couleurs** des blocs ` ```figure `, ` ```courbe `, ` ```stat-chart `, ` ```line ` (droite
  graduée : `points: A=2 bleu`, `segments: [1, 3] vert`) et ` ```trig ` (`color: rouge`) : écrire un
  **nom** de la palette commune (bleu, rouge, vert, orange, violet, jaune, cyan, marron, rose,
  gris, noir, blanc), ou son nom anglais (`blue`, `red`, `green`, `purple`, `yellow`, `brown`,
  `pink`, `gray`/`grey`, `black`, `white` ; `orange` et `cyan` sont identiques). Le nom suit le
  mode clair / sombre à l'écran et s'imprime dans sa variante claire. `noir` et `blanc` suivent le
  texte et le fond de la page. Un code `#1e40af` reste figé dans les deux modes : à éviter.
- **Avertissements de couleur** (visibles du prof seulement, dans l'éditeur et l'aperçu ; le bloc
  s'affiche toujours) :
  - couleur **inconnue** (`magenta`) dans ` ```line ` ou ` ```trig ` : remplacée par la couleur
    par défaut (points de la droite : rouge ; segments : bleu ; cercle : bleu) ;
  - **code trop sombre** (`#000080`, `#1a1a1a`) dans ` ```line `, ` ```trig ` ou ` ```figure ` :
    contraste < 3:1 sur le fond sombre, ou opacité < 50 % ; le message propose le nom de la palette le plus proche
    (`bleu`, `noir`…). Le code n'est pas modifié.
  - dans ` ```figure `, une couleur inconnue reste une **erreur** (figure non dessinée).
- **Daltonisme** (décision D4, 2026-10-03) : **4 couleurs au plus** par figure ; au-delà,
  distinguer aussi par le trait (`pointillé`) ou par une étiquette, jamais par la couleur seule.
  Éviter d'opposer rouge et vert, ou bleu et violet, sans autre indice.

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
