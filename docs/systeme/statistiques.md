---
couvre:
  - 'src/lib/statistics/**'
  - src/lib/utils/random.ts
  - 'src/lib/atelier/{chart,compare,desk.svelte,filter,law-commands,simulate}.ts'
  - src/lib/components/atelier/DataView.svelte
  - src/lib/ubumark/parser/stat-chart-parser.ts
  - src/lib/ubumark/types/stat-chart.ts
  - 'src/lib/ubumark/utils/{comparison-scene,scatter-lines,stat-chart-scene}.ts'
---

# Statistiques et probabilités (`src/lib/statistics/`)

> Vérifié contre le code le 2026-10-10. Usage dans l'atelier : [atelier.md](atelier.md)
> (§ « Liens avec `mathAST` et `statistics` ») ; syntaxe des blocs statistiques :
> [ubumark.md](ubumark.md) (genres de `stat-chart`). Cette doc ne décrit que le **calcul**.

## À quoi ça sert

**La** source de calcul des statistiques et probabilités du site : indicateurs d'une **série
statistique** (brute, à effectifs, en classes), tableau croisé, série à deux variables et
ajustement, changement de variable, lois discrètes et à densité, seuils, simulation à graine.
L'atelier, le moteur web (`.stats`, `.ajustement`, `.linreg`) et les blocs ubumark l'appellent ;
aucune seconde implémentation ailleurs. Il calcule et met en forme des **nombres et des
lignes de texte** ; les scènes (diagrammes, courbes de densité) sont construites dans
`src/lib/ubumark/utils/stat-chart-scene.ts`.

Termes ([CONTEXT.md](../../CONTEXT.md)) : **Série statistique** — toujours avec l'adjectif
(sans lui, « série » = composition de questions) ; jamais `series` dans le code pour des données.

## Carte du code

19 modules, 12 fichiers de tests. Aucun point d'entrée unique (pas de `index.ts`) : on importe
le module voulu.

| Fichier                                 | Rôle                                                                                                           |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `src/lib/statistics/describe.ts`        | Série brute / à effectifs : `Summary`, tableau d'effectifs, fréquences de catégories                           |
| `src/lib/statistics/classes.ts`         | Série en classes `[a ; b[` : moyenne aux centres, médiane et quantiles interpolés                              |
| `src/lib/statistics/cumulative.ts`      | `reaches` / `isExactly` : comparer un cumul à un seuil (tolérance relative 1e-12)                              |
| `src/lib/statistics/cross-table.ts`     | Tableau croisé : totaux, fréquences, fréquences conditionnelles                                                |
| `src/lib/statistics/fit.ts`             | `fitAffine` : moindres carrés en flottants, paires complètes (atelier, `.linreg`)                              |
| `src/lib/statistics/bivariate.ts`       | Deux variables en fractions EXACTES : point moyen, droite, r, prévisions                                       |
| `src/lib/statistics/variable-change.ts` | `z = ln(y)`, `t = x²`… : lecture, domaine, ajustement décimal, relation retrouvée                              |
| `src/lib/statistics/fraction.ts`        | Classe `Fraction` (bigint, irréductible) : lecture d'auteur, `fromNumber`, `sqrt` exacte                       |
| `src/lib/statistics/random-variable.ts` | Variable aléatoire finie : contrôle de la loi, E, V (König-Huygens), σ                                         |
| `src/lib/statistics/binomial.ts`        | B(n ; p) exacte, intervalle de fluctuation, seuil                                                              |
| `src/lib/statistics/geometric.ts`       | G(p) exacte : P(a ⩽ X ⩽ b), conditionnelle sans mémoire, moments, seuil                                        |
| `src/lib/statistics/uniform.ts`         | U(a ; b) discrète, exacte                                                                                      |
| `src/lib/statistics/density.ts`         | Lois à densité : uniforme U([a ; b]) exacte, exponentielle E(λ) et normale N(μ ; σ²)                           |
| `src/lib/statistics/threshold.ts`       | `findThreshold` : recherche dichotomique du seuil k, commune binomiale / géométrique                           |
| `src/lib/statistics/simulation.ts`      | Échantillonneurs (`LawSampler`) et simulations à graine                                                        |
| `src/lib/statistics/format.ts`          | Mise en forme française : `= 15,75` / `≈ 14,44`, lignes d'indicateurs, E/V/σ                                   |
| `src/lib/statistics/rounding.ts`        | **L'arrondi d'affichage, une seule règle** : `roundExact`, `roundFraction` (exacts), `roundNumber` (flottants) |
| `src/lib/statistics/read-value.ts`      | Lire `12,5`, `1/6`, `−3` (virgule décimale, vrai signe moins)                                                  |
| `src/lib/statistics/outcome.ts`         | `Outcome<T>` : une valeur ou un message français situé — jamais d'exception sur une saisie                     |
| `src/lib/statistics/limits.ts`          | `STATISTICS_LIMITS.maxValues` = 10 000 (plafond commun)                                                        |

Seul import hors du module : `RandomSource` de `src/lib/utils/random.ts` (chemin relatif).

## Ce que le module calcule

### Séries à une variable (`describe.ts`, `classes.ts`, `cross-table.ts`)

- `summarizeList(values)` → `Outcome<Summary> | null` : effectif, moyenne, médiane, min, max,
  étendue, variance, écart type, Q1, Q3, écart interquartile, D1, D9. `describeList` en est la
  version sans message (`Summary | null`).
- `summarizeTable(values, counts)` → `Outcome<FrequencyTable>` : lignes triées et **fusionnées**
  par valeur (fréquence, effectif cumulé, fréquences cumulées croissante et décroissante) + le
  `Summary`. Les effectifs peuvent être des pourcentages (seules les proportions comptent).
- `categoryFrequencies(counts)` : fréquences d'une variable qualitative, dans l'ordre donné.
- `summarizeClasses(classes)` → `ClassSummary` : par classe amplitude, **densité**
  (effectif / amplitude = hauteur d'histogramme), fréquences cumulées ; moyenne aux centres,
  indice de la classe médiane, médiane estimée par interpolation linéaire.
  `estimateClassQuantile(classes, percent)` : même interpolation pour un quantile quelconque.
- `crossTable(counts, mode)` : modes `effectifs`, `fréquences`, `fréquences par ligne`,
  `fréquences par colonne` (`CrossTableMode`) ; `null` dans une case quand le total de sa ligne
  ou colonne est nul.

### Deux variables (`fit.ts`, `bivariate.ts`, `variable-change.ts`)

Trois ajustements affines coexistent, chacun pour un usage :

| Fonction       | Arithmétique        | Rend                                             | Utilisé par                                 |
| -------------- | ------------------- | ------------------------------------------------ | ------------------------------------------- |
| `fitAffine`    | flottants           | a, b, **R²**, paires utilisées / ignorées        | atelier (`desk.svelte.ts`), `.linreg`       |
| `bivariateFit` | `Fraction` (exacte) | point moyen, a, b, **r** (± r² exact), min/max x | bloc ` ```nuage `, atelier, `.ajustement`   |
| `decimalFit`   | flottants           | idem en décimal (`DecimalFit`)                   | changement de variable (ln, √ irrationnels) |

- Prévisions exactes : `predictY`, `predictX` (null si pente nulle), `isInterpolation`
  (x dans l'étendue observée, bornes comprises).
- Lecture d'une valeur d'auteur : `readExactValue` (refuse `1e3`, `0x1A`, pourcentages, plus
  de 15 chiffres, dénominateur > `MAX_WRITTEN_DENOMINATOR` = 1000) et `invalidValueReason`
  (le message français). `toSafeNumber` convertit une fraction géante sans `NaN`.
- Changement de variable : `readVariableChange` reconnaît les huit formes
  (`VARIABLE_CHANGE_LIST`, z sur y, t sur x : ln, carré, √, inverse) ; `changeDomainProblem`
  situe la valeur interdite ; `transformValue`, `squaredSign` (branche de ± √ pour un carré) ;
  `relationY`, `relationX`, `relationPole` donnent la relation retrouvée entre x et y, avec
  `'overflow'` au-delà de `MAX_COMPUTED_VALUE` (1e15).

### Lois (`random-variable.ts`, `binomial.ts`, `geometric.ts`, `uniform.ts`, `density.ts`)

Toutes rendent leurs moments sous la forme `RandomVariableLaw` : `expectation` et `variance` en
`Fraction`, `deviation` décimal, `exactDeviation` quand la racine tombe juste.

- **Loi finie écrite à la main** : `randomVariable(values, probabilities)` refuse valeurs en
  double, probabilité hors de [0 ; 1], somme ≠ 1 (égalité exacte en fractions).
- **Binomiale** : `binomialDistribution(n, p)` (n ⩽ `BINOMIAL_MAX_N` = 1000) garde les
  numérateurs sur le dénominateur commun bⁿ ; `binomialProbability(law, contains)`,
  `binomialMoments`, `binomialInterval(law, level)`, `binomialThreshold`.
- **Géométrique** (X ⩾ 1) : `geometricProbability(p, low, high)`, `geometricConditional`,
  `geometricMoments`, `geometricThreshold` (k ⩽ `GEOMETRIC_MAX_K` = 1000).
- **Uniforme discrète** : `uniformProbability`, `uniformMoments` (au plus `UNIFORM_MAX_VALUES`).
- **À densité** : `uniformDensityProbability` / `uniformDensityMoments` (exactes) ;
  `exponentialProbability`, `exponentialMoments`, `exponentialDensity` ; `normalCdf` (Φ),
  `normalProbability`, `normalDensity`, `normalMoments`.

### Seuils (`threshold.ts`)

`findThreshold(last, open, probability, event, comparison, alpha)` cherche le k qui vérifie
« P(X ⋄ k) ⩽ α » ou « ⩾ α ». Le sens (plus petit ou plus grand k) se déduit de la monotonie
de l'événement : décroissante pour `>` / `⩾`, croissante pour `<` / `⩽`. Recherche
dichotomique, comparaisons en entiers (`atMost`, `atLeast`). `open` (géométrique : le support
continue après 1000) rend `beyond: true` au lieu d'annoncer un faux « plus grand k ».

### Simulation et échantillonnage (`simulation.ts`)

- Échantillonneurs `LawSampler` (un tirage + la loi) : `discreteSampler` (probabilités
  cumulées), et par **inversion** `geometricSampler`, `uniformSampler`, `uniformDensitySampler`,
  `exponentialSampler`, `normalSampler` (μ + σ·Φ⁻¹(u), u = 0 ramené au plus petit flottant
  positif ; D7, décision de David du 2026-10-11). Dans un bloc ` ```simulation `, `Y ~ N(μ ; σ²)`
  se tire en histogramme sur **μ ± 3σ**, les deux classes du bord prenant ce qui dépasse (mention
  des deux bords sous le graphique), courbe de ` ```loi ` superposée ; modes `moyenne` et
  `échantillons` comme les autres lois. Tests : `statistics/__tests__/simulation-normale.test.ts`,
  `ubumark/__tests__/stat-chart/simulation-laws.test.ts`.
- `simulateCounts` (effectifs par valeur), `simulateDraws` (tirages bruts),
  `simulateRunningMean` / `simulateLawRunningMean` (loi des grands nombres),
  `simulateSamples` / `simulateLawSamples` (N échantillons de taille n, nombre de moyennes à
  au plus 2σ/√n de μ). Bornes : `SIMULATION_LIMITS` (100 000 tirages, 10 000 pour la moyenne
  courante, 1 000 × 1 000 pour les échantillons).
- Le hasard vient d'une `RandomSource` : avec une graine (`createRandomSource(seed)`), les
  mêmes tirages à chaque fois (un atelier partagé montre ce qu'a vu l'élève).

### Lecture et mise en forme (`read-value.ts`, `fraction.ts`, `format.ts`)

- `readNumber` : virgule décimale ; `readListValue` : en plus fractions d'entiers, `−`, et la
  virgule MathLive `{,}`. `Fraction.parse` : `1/6`, `0,25`, `25 %` ; `Fraction.fromNumber` :
  fractions continues, dénominateur ⩽ 10 000, à 10⁻⁹ près (null pour π).
- `formatSummary` (13 lignes, ordre du programme), `formatApproxValue`, `formatLawApproxValue`
  (deux chiffres significatifs sous 0,01), `formatStatNumber`, `formatFraction`,
  `formatLawIndicators` (`E(X) = 7/2 = 3,5`, `V(X) = 35/12 ≈ 2,92`). `StatLocale` : `fr` | `en`.

## Conventions mathématiques non évidentes

1. **Variance de population** (division par l'effectif total, pas n − 1) : celle du programme
   et de la touche σₓ — tranché par David le 2026-09-16 (en tête de `describe.ts`).
2. **Quartiles et déciles du programme de 2de**, pas ceux des calculatrices : Q1 = plus petite
   valeur dont la fréquence cumulée atteint 25 % (rang ⌈n/4⌉ en série brute). Sur
   `3 ; 5 ; 7 ; 8 ; 12 ; 13 ; 14 ; 18 ; 21` : Q1 = 7 (calculatrice : 6), Q3 = 14. Q1 et Q3 sont
   toujours des valeurs de la série ; la **médiane** est usuelle (moyenne des deux valeurs
   centrales si l'effectif total est atteint pile) et n'est **jamais appelée « Q2 »** : sur
   `1 ; 2 ; 3 ; 4`, médiane 2,5 mais Q1 = 1, Q3 = 3. Testé :
   `src/lib/statistics/__tests__/summary.test.ts` (A).
3. **Séries à effectifs** : mêmes définitions via les fréquences cumulées ; une valeur
   d'effectif nul reste dans le tableau mais hors des indicateurs (même hors de la variance :
   `0 × ∞` donnerait `NaN`). Pourcentages flottants (33,8 + 15,8 + 0,4) : `cumulative.ts`
   compare avec une tolérance **relative** à l'effectif total.
4. **Classes** `[a ; b[` contiguës, répartition supposée uniforme ; la médiane et les
   quantiles de classes sont des **estimations** — à ne pas confondre avec ceux d'une série
   brute.
5. **Série constante** : variance forcée à 0 (la moyenne flottante de `0,1 ; 0,1 ; 0,1` n'est
   pas 0,1) ; dans `fitAffine` et `decimalFit`, on teste les **valeurs** égales, pas une
   variance flottante nulle ; R² = 1 si toutes les ordonnées sont égales.
6. **`fitAffine` n'utilise que les paires complètes** (liste plus longue : valeurs ignorées,
   comptées dans `ignored`) ; `bivariateFit` suppose des longueurs égales (contrôlées par
   l'appelant).
7. **Exact d'abord, arrondi une seule fois** : probabilités et moments en `Fraction` / `bigint`
   (E(X) = 7/2, pas 3,5000000000000004). r est irrationnel en général : décimal, mais r² exact
   dit si r = ±1. Exponentielle, normale, changement de variable : flottants.
8. **Arrondis d'affichage : une seule règle** (`rounding.ts`, écart V6 corrigé le 2026-10-11) :
   demi vers le haut sur la valeur absolue (−0,125 → −0,13), calculé **en entiers**, sans
   « −0,00 ». `roundExact` / `roundFraction` pour les fractions exactes ; `roundNumber` pour les
   flottants, lus d'abord comme le décimal qu'ils écrivent (12 chiffres : 1,005 → 1,01, là où
   `Math.round(1,005 × 100)` donnait 1). `formatApproxValue` (`=` si exact à 2 décimales, `≈`
   sinon), `formatLawApproxValue`, E et V d'une loi et les moyennes simulées au millième passent
   par elle. Test : `src/lib/statistics/__tests__/arrondi-unique.test.ts`.
9. **Loi normale** : Φ par série puis fraction continue de Laplace (pas de table), précision
   relative des queues (Φ(−8) ≈ 6,2 × 10⁻¹⁶) ; une seule borne → la queue directement.
   Φ⁻¹ (`normalQuantile`, pour les tirages) : approximation rationnelle d'Acklam affinée par un
   pas de Halley sur Φ (≈ 10⁻¹⁵), pas sauté au-delà de |z| = 37.
10. **Intervalle de fluctuation binomial** (`binomialInterval`) : le plus petit [a ; b] tel que
    P(X < a) ⩽ α/2 et P(X > b) ⩽ α/2 — le programme n'impose pas de méthode, celle-ci est
    écrite sous le résultat par le bloc.
11. **Simulation** : une valeur de probabilité nulle n'est jamais tirée ; une moyenne pile sur
    la marge 2σ/√n compte dedans (tolérance 1e-9).

## Qui l'utilise

- **Atelier** : `src/lib/atelier/desk.svelte.ts` (indicateurs, `fitAffine`, `bivariateFit`,
  `randomVariable`), `src/lib/atelier/simulate.ts` (`.simuler`, `.fréquence`, `.échantillons`),
  `src/lib/atelier/parse.ts` (`readListValue`), `src/lib/atelier/chart.ts`,
  `src/lib/atelier/compare.ts`, `src/lib/atelier/filter.ts`,
  `src/lib/atelier/law-commands.ts`, `src/lib/components/atelier/DataView.svelte`.
  Détails : [atelier.md](atelier.md).
- **Moteur web** : `src/lib/mathAST/cli/web/web-repl-engine.ts` (`.stats`, `.ajustement`,
  `.linreg`), par **chemins relatifs**.
- **ubumark** : `src/lib/ubumark/parser/stat-chart-parser.ts` (validation, plafonds),
  `src/lib/ubumark/utils/stat-chart-scene.ts` (presque tout : lois, seuils, simulations,
  classes), `src/lib/ubumark/utils/scatter-lines.ts` (lignes du ` ```nuage `),
  `src/lib/ubumark/utils/comparison-scene.ts`, `src/lib/ubumark/types/stat-chart.ts`.
  Détails : [ubumark.md](ubumark.md).
- **Questions** : aucun import direct (`git grep` sur `src/lib/questions`, `src/lib/exercises`).
  Une question qui affiche un bloc statistique passe par ubumark.

## Invariants

1. **Aucun import `$lib`** dans `src/lib/statistics/` : `mathAST` l'importe par chemin relatif
   et `pnpm math` le fait tourner sous `tsx`, sans alias.
2. **Une seule source** : un indicateur, une loi, un texte d'indicateurs ne se recalculent pas
   ailleurs ; l'atelier et les fiches montrent les mêmes nombres.
3. **Une saisie invalide n'est jamais une exception** : `Outcome` avec un message français
   situé (« La valeur n° 3… »), et `null` pour une absence (série vide). Exception : le
   constructeur de `Fraction` lève sur un dénominateur nul (erreur de programmation).
4. **Plafonds partout** : `STATISTICS_LIMITS`, `BINOMIAL_MAX_N`, `GEOMETRIC_MAX_K`,
   `UNIFORM_MAX_VALUES`, `SIMULATION_LIMITS`, `MAX_WRITTEN_DENOMINATOR` — chaque calcul reste
   instantané dans un onglet. Les appelants peuvent fixer plus bas, jamais plus haut.
5. **Aléa injecté** : aucune fonction n'appelle `Math.random` ; la graine fait la
   reproductibilité.

## Comment étendre

- **Une loi de plus** : un fichier par loi, moments en `RandomVariableLaw` (pour
  `formatLawIndicators`), probabilités exactes si possible (`{ num, den }` puis `roundExact`),
  un plafond exporté ; un `LawSampler` par inversion si elle doit se simuler ; `findThreshold`
  si elle a un seuil. Puis la scène et le parseur ubumark (voir [ubumark.md](ubumark.md)).
- **Un indicateur de plus** : l'ajouter à `Summary` dans `summarizeWeighted` (`describe.ts`),
  puis à `formatSummary` — l'atelier et `.stats` le suivent.
- Tests d'abord, dans `src/lib/statistics/__tests__/`, avec un exemple chiffré du programme.

## Tests

`pnpm test:server src/lib/statistics/__tests__/` (12 fichiers) :

| Fichier                                         | Couvre                                                        |
| ----------------------------------------------- | ------------------------------------------------------------- |
| `summary.test.ts`                               | quartiles du programme, effectifs, pourcentages, refus situés |
| `describe-and-fit.test.ts`                      | `describeList`, `fitAffine`                                   |
| `classes.test.ts`                               | classes, interpolation, contiguïté                            |
| `categories.test.ts`, `cross-table.test.ts`     | qualitatives, tableau croisé                                  |
| `bivariate.test.ts`, `variable-change.test.ts`  | deux variables exactes, changements de variable               |
| `random-variable.test.ts`                       | loi finie, `Fraction`                                         |
| `simulation.test.ts`, `simulation-laws.test.ts` | simulations, échantillonneurs par inversion                   |
| `simulation-golden.test.ts`                     | non-régression « or » : tirages exacts figés pour une graine  |
| `format.test.ts`                                | libellés, ordre, `=` / `≈`                                    |

⚠️ **Binomiale, géométrique, uniforme, densités et seuils** n'ont pas de test dans le module :
ils sont testés à travers les blocs (`src/lib/ubumark/__tests__/stat-chart/binomial.test.ts`,
`geometric.test.ts`, `geometric-threshold.test.ts`, `uniform.test.ts`, `density.test.ts`) et la
loi normale par `src/lib/atelier/__tests__/loi-normale.test.ts`.

## Décisions

Aucune ADR. Décisions de David consignées dans les journaux archivés :
[outils-statistiques](../archive/wip/outils-statistiques-progress.md) (quartiles du programme,
médiane jamais « Q2 », arrondis d'affichage Q13, vocabulaire, boîte à moustaches hors
périmètre), [v2](../archive/wip/outils-statistiques-v2-progress.md) (simulation à graine,
fractions de liste), [loi binomiale](../archive/wip/loi-binomiale-progress.md) (calcul exact,
intervalle Q140, pas de liste créée par une loi — Q142),
[lois discrètes](../archive/wip/lois-discretes-progress.md),
[lois à densité](../archive/wip/lois-densite-progress.md),
[simulation des lois](../archive/wip/simulation-lois-progress.md),
[seuil géométrique](../archive/wip/seuil-geometrique-progress.md),
[nuage](../archive/wip/bloc-nuage-progress.md) et
[changement de variable](../archive/wip/nuage-changement-variable-progress.md) (coefficients
exacts, jamais les arrondis affichés). Variance de population : 2026-09-16.

## Écarts connus

- **Trois ajustements affines** (`fitAffine`, `bivariateFit`, `decimalFit`) : la formule des
  moindres carrés est écrite trois fois ; `fitAffine` rend R², `bivariateFit` rend r.
- Graduations et fréquences (`formatRounded`, `formatTick`, pourcentages) arrondissent encore
  en flottant : valeurs positives ou de grille, sans demi négatif à départager.
- `exponentialProbability` et `normalProbability` prennent des `number`, leurs moments des
  `Fraction` : l'appelant convertit.
- La binomiale n'a pas d'échantillonneur propre : la scène la tire comme loi finie, avec les
  probabilités exactes de `binomialDistribution`.
- `atMost`, `findThreshold` et `MAX_COMPUTED_VALUE` ne servent qu'à l'intérieur du module,
  bien qu'exportés.

Vérifié contre le code le 2026-10-10.
