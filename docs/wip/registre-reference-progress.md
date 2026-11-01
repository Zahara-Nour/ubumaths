---
title: Le registre des commandes, référence commune (pnpm math, Atelier, calculatrice) — journal
date: 2026-11-01
status: PR 0 mergée (#2163), lot 2 en cours (A-D tranchées)
---

## Reprendre ici

_Mis à jour le 2026-11-01, après #2163 (PR 0 mergée)._

- **État** : PR 0 **#2163 mergée** (corpus 85/85, champ `answer`). Branche distante supprimée,
  `origin/main` intégré dans la branche locale (règles migrations #2165, CI allégée #2167).
- **Prochaine action** : lot 2 du corpus (section « Lot 2 — relevé »), A-D tranchées ;
  même branche `refactor/registre-reference`, repoussée avec le lot 2.
- **Tranché** (2026-11-01) : A-D du lot 2, oui ×4 (section « Lot 2 — relevé ») —
  A le registre rend l'écriture décimale `decimal` + `decimalExact` (exacte `0.25` / arrondie
  `0.7071`, le signe `=`/`≈` posé par l'outil ; nom `approx` rejeté par David) ; B mode décimal =
  affichage de l'outil ; C égalité tapée seule (`2=2`) → `\text{vrai}`/`\text{faux}` ; D expression
  nue non numérique (`2x+3x`) → forme rangée. Entrées du registre expliquées : commande, `a :=`,
  `f(x) :=`, égalité, expression nue (`web-repl-engine.ts:259-301`).
- ⚠️ **Déjà tranché, NE PAS reposer** : ordre des termes (juge E1 le tolère) ; S3 ; R-point ;
  `domaine` = ℝ \ {0}. **Étape H** : étude en profondeur AVANT tout code.
- **Pièges** : greper TOUT le journal avant une question ; `pnpm migration:horodatage`,
  `pnpm check:migrations --pr <n>` ; sonde de l'Atelier = vitest jetable sous `src/`.
- **Worktree / branche** : `../ubumaths-wt-registre-reference` · `refactor/registre-reference`.

---

## Décisions de David (2026-11-01)

- **D1** Le **registre des commandes** (`src/lib/mathAST/cli/commands/`, servi par
  `WebReplEngine`) est **la référence commune** de trois outils : l'Atelier, `pnpm math`, et la
  **calculatrice** d'un futur chantier. Il rend la **réponse brute**, la même pour tous. Un outil
  habille la réponse, il ne la remplace jamais.
- **D2** La forme de la réponse = **la forme propre** du travail `tidy` / `simplify` :
  [ADR 0032](../adr/0032-la-forme-affichee-se-choisit-par-le-but.md) (forme cible selon le but de la
  commande, puis `tidy`). Table : `docs/systeme/mathast/README.md` § Quelle fonction pour quel besoin.
- **D3** **Les étapes restent dans l'Atelier** seulement. Elles doivent aboutir à la réponse du
  registre.
- **D4** **Un corpus de réponses attendues** : des lignes, chacune avec la réponse brute écrite à
  l'avance. Il est le contrat du registre, et chaque outil (Atelier, `pnpm math`, calculatrice) est
  testé contre lui. Existants à reprendre, pas à recopier : les oracles des limites
  (`mathAST/limits/__tests__/oracle/corpus.ts`) et des primitives
  (`mathAST/integration/__tests__/oracle/primitives-corpus.ts`, avec son jugement de forme `checkForm`).

Remplace la direction du 2026-10-24 (« `pnpm math` branchée sur l'Atelier », via `runInput`) :
c'est le registre qui fait foi, pas la couche de l'Atelier.

## Pourquoi

Aujourd'hui l'Atelier appelle le registre, puis **jette sa réponse et la remplace** par un autre
calcul (exemple : `calcul.ts`, `if (name === 'diff')` → `deriveSteps`). Deux calculs de la même
chose, qui ne s'accordent pas ; `pnpm math` (`repl.ts`, sur le registre) montre l'autre réponse.

## Inventaire (2026-11-01, sonde jetable, runner de Vite)

Même ligne envoyée au registre (`WebReplEngine.execute`, nom anglais) et à l'Atelier (`runInput`).

**Même réponse** (habillage seul) : `.dériver x^2`, `ln(x²+1)`, `sin(x)²` ; `.résoudre`
d'équations (`x²−3x+1=0`, `eˣ=3`) ; `.évaluer` ; `.taylor` ; `.intégrer x^2 de 0 à 1` (`1/3`) ;
`.domaine` (`ℝ \ {0}`, `]2;+∞[`, écrit autrement) ; `.équivalent` (texte du moteur repris tel quel) ;
calculs sans lettre (`2+3*4`, `1/2+1/3`, `√8`).

**Réponses différentes** :

| Ligne                      | Registre                   | Atelier                              |
| -------------------------- | -------------------------- | ------------------------------------ |
| `.dériver x*e^x`           | `eˣ + xeˣ`                 | `(x+1)eˣ`                            |
| `.dériver (2x+1)/(x-3)`    | `(2(x−3) − (2x+1))/(x−3)²` | `−7/(x−3)²`                          |
| `.simplifier (x²−1)/(x+1)` | `x − 1` (perd x ≠ −1)      | inchangée (+ bouton « pour x ≠ −1 ») |
| `.résoudre 2x+1<7`         | `S = ]−∞ ; 3[`             | `x < 3`                              |
| `.intégrer x*e^x`          | `(x−1)eˣ`                  | `(x−1)eˣ + C`                        |

Les deux premières et `.simplifier` : le registre ne suit pas l'ADR 0032 (dérivée réduite ; pas de
simplification qui perd le domaine sans hypothèse, S3).

**Absentes du registre** (n'existent que dans l'Atelier) : `factoriser`, `développer`, `limite`,
`réciproque` ; statistiques et probabilités (`simuler`, `binomiale`, `géométrique`, `uniforme`,
`exponentielle`, `normale`, `comparer`, `croiser`, `filtrer`, `fréquence`, `échantillons`, `stats`,
`ajustement`) ; `tabuler`, `relever` (géométrie) ; la définition `f(x) = …` (le registre veut
`.def`).

**Absentes de l'Atelier** (registre seul, outils de développement ou retirées le 2026-10-13) :
`parse`, `tree`, `latex`, `custom`, `normal`, `hash`, `let`, `def`, `def'`, `inv`, `clear`,
`unset`, `undef`.

## Phase 0 — comportements visés

**Nominal**

- **R1** Pour toute commande du registre, l'Atelier affiche **la réponse du registre** (même forme),
  plus ses étapes. Le tableau « Réponses différentes » devient vide.
- **R2** `pnpm math` est un terminal sur `WebReplEngine` : mêmes entrées que le registre, mêmes
  réponses ; une seule session par console ; `pnpm math "ligne1" "ligne2"` rejoue puis rend la main.
- **R3** La forme de chaque commande suit l'ADR 0032 : `.dériver` réduite (`(x+1)eˣ`, `−7/(x−3)²`) ;
  `.simplifier` ne perd pas de domaine sans hypothèse.

**Limites**

- **R4** Quand l'Atelier n'a pas d'étapes (`sec(3x)`), il affiche la réponse du registre telle
  quelle (déjà le cas pour `.dériver`).
- **R5** Les étapes de l'Atelier qui n'aboutissent pas à la réponse du registre : on les corrige
  (pas la réponse) ; un test par commande le garde.

**Erreurs**

- **R6** Une commande refusée par le registre l'est avec le même message dans l'Atelier et le
  terminal.

## Questions — tranchées par David le 2026-11-01 (« je valide tes recos »)

Réponses retenues, en gras sous chaque question.

- **Q1 — Commandes de l'Atelier absentes du registre.** D1 veut qu'elles y descendent (sinon la
  calculatrice ne les a pas). Proposé : `factoriser`, `développer`, `limite`, `réciproque` et
  `f(x) = …` dans ce chantier ; statistiques, probabilités, `tabuler`, `relever` plus tard (elles
  lisent les listes et les figures de l'Atelier). **→ validé.**
- **Q2 — Une inéquation** : la réponse brute est-elle `S = ]−∞ ; 3[` (registre) ou `x < 3`
  (Atelier) ? **→ `S = ]−∞ ; 3[`**, comme les équations ; les étapes de l'Atelier peuvent passer
  par `x < 3` et conclure sur S.
- **Q3 — Une primitive** : `+ C` dans la réponse brute ? **→ oui**, ajouté par la commande du
  registre (le moteur calcule toujours F seul ; l'oracle des primitives ôte déjà le `+ C`).
- **Q4 — Commandes du registre seul** (`parse`, `tree`, `latex`, `custom`, `normal`, `hash`, `let`,
  `def`, `def'`, `inv`, `clear`, `unset`, `undef`). Proposé : garder les outils de développement
  pour `pnpm math` (`tree`, `hash`, `normal`, `latex`, `custom`), retirer `inv` et `def'` (réponses
  données à la main, que `.réciproque` et `.dériver` remplacent), garder les commandes de noms
  (la calculatrice en aura besoin). **→ validé.**
- **Q5 — Le nom du chantier.** `pnpm-math-atelier` ne dit plus ce qu'il fait. Proposé :
  `registre-reference` (nouveau journal, worktree et branche renommés). **→ validé, fait le
  2026-11-01.**

- **Q6 — Le corpus** (D4).
  - **Où** : un fichier de données sous `tests/fixtures/mathast/` (aucun test ne lit `docs/`), une
    entrée = `{ id, ligne, attendu, note? }`, regroupées par commande.
  - **Comparaison** : l'écriture exacte, à variations cosmétiques près (espaces, signe ×, ordre des
    termes — le `checkForm` déjà utilisé par l'oracle des primitives), plus un contrôle numérique
    quand c'est possible (une faute de frappe dans un attendu ne fabrique pas un faux « moteur
    faux »).
  - **Qui écrit les attendus** : je propose les lignes (cas réels des élèves, ~10 par commande) et
    les attendus d'après l'ADR 0032 ; **tu les valides** sur une page à cocher avant qu'ils fassent
    foi. Une ligne refusée par toi n'entre pas.
  - **Deux tests** : registre contre corpus ; Atelier contre corpus (sa réponse affichée = l'attendu).
    Les lignes qui divergent aujourd'hui sont marquées « connues fausses » (comme `known-wrong.ts`
    des limites) et se retirent de la liste au fil des PR.
  - **→ validé** (les quatre points).

## Découpage (validé avec Q1-Q6)

0. Le corpus (D4, Q6) et ses deux tests, lignes divergentes marquées « connues fausses ».
1. `.dériver` : forme réduite dans le registre, l'Atelier cesse de remplacer (pilote de la méthode).
2. `.simplifier`, `.résoudre`, `.intégrer` (même méthode).
3. Commandes de Q1 descendues dans le registre, une PR par famille.
4. `pnpm math` sur `WebReplEngine` (`repl.ts`, `cli.ts` réécrits) ; règle « ne plus sonder avec
   `pnpm math` » levée.

H. **Hypothèses `avec` / `dans` dans le registre** (ajouté le 2026-11-01, voir la section dédiée
plus bas) ; sa place par rapport à 1-3 sera fixée après l'étude.

## Étape H — hypothèses `avec` / `dans` dans le registre (décidé le 2026-11-01)

**Constat** (mesuré dans le code le 2026-11-01) : l'Atelier lit `avec CONDITION` / `dans
ENSEMBLE` sur une expression tapée et sur `.simplifier`, `.factoriser`, `.développer`
(`src/lib/atelier/hypotheses.ts`, chantier tidy-conditions, 2026-10-26) : `x/x avec x ≠ 0` → `1`,
`ln(x²) avec x > 0` → `2 ln x`, `x > 1` admis. Le registre (`WebReplEngine`, commandes de
`src/lib/mathAST/cli/commands/`) ne le lit pas : aucune trace de `avec` ni d'hypothèse. Le corpus de
la PR 0 n'a aucune ligne à hypothèse.

**Décision de David** (« ok ») : hors de la PR 0, mais dans le chantier (sinon l'Atelier redevient
plus riche que la référence). Une PR à part :

1. **Corpus d'abord** — 6 à 8 lignes validées sur la page à cocher (l'Atelier fait foi a priori) :
   simplification à condition (`x/x avec x ≠ 0`, `ln(x²) avec x > 0`), une avec `x > 1`, une avec
   `dans`, une où l'hypothèse ne suffit pas (écriture gardée + message), un refus de syntaxe.
2. **Puis le code** — la lecture des hypothèses descend dans le registre, l'Atelier l'appelle au
   lieu de la porter.

**À faire AVANT d'écrire quoi que ce soit (demande de David) : étude en profondeur de ce qu'il faut
transférer.** Pas seulement `hypotheses.ts` : suivre tout ce qui en dépend et tout ce dont il
dépend dans `calcul.ts` (découpe de la ligne, boutons « Simplifier pour … », mode « garder
l'écriture », note « on peut simplifier davantage »), `domain-guard.ts`, `simplify-steps.ts`,
`factor-steps.ts` ; dire ce qui relève de la réponse brute (registre) et ce qui relève de la
présentation (Atelier) ; où vit le module partagé (question ouverte). Rendre l'étude à David
avant le code.

## PR 0 — le corpus (2026-11-01)

- **Décision de David** (question posée en séance) : le registre déclare sa réponse brute dans un
  **champ `answer`** (LaTeX de la réponse seule) de `CommandResult` / `ReplExecutionResult`,
  rempli par `.diff`, `.simplify`, `.solve`, `.integrate` (`+ C`, Q3), `.eval`, `.taylor`,
  `.domain` (`D = …`, `domainToLatex`), `.equiv` (`\text{vrai}` / `\text{faux}`) et les calculs
  tapés seuls. Aucune réponse affichée ne change.
- **Corpus** : `tests/fixtures/mathast/registre-corpus.ts` (85 entrées `{ id, ligne, attendu,
refus?, note? }`). Juge : `src/lib/mathAST/cli/__tests__/registre-corpus/compare.ts`
  (`checkForm`, puis contrôle numérique : `forme` = même valeur ; ensembles découpés à la main,
  `checkForm` ne lit pas `S = …`). Tests : `registre.test.ts` et
  `src/lib/atelier/__tests__/registre-corpus.test.ts` ; écarts figés dans `connues-fausses.ts`
  (registre 15, Atelier 14). Preuve rouge : un attendu faussé fait échouer les deux outils.
- **Écarts trouvés en plus de l'inventaire** : `.dériver (3x-1)^2` (registre `6(3x−1)`),
  `(x²+1)e^(−x)` (registre non réduit, Atelier `−(x²−2x+1)e^{−x}`), `1/x` (registre
  `(−1)/x²`) ; `.simplifier x/x` → 1 (registre, S3) ; `.résoudre` des équations répond `x = …`
  (et `≈` pour eˣ = 3, ln x = 2) ; l'Atelier range `{1 ; −2}` ; `.équivalent` : l'Atelier affiche
  la sortie brute du moteur, et le registre dit sin² + cos² ≠ 1 (`normalFormsEquivalent`) ; le
  registre refuse la virgule décimale (`0,1+0,2`) ; messages de refus différents (R6).
- **Hors corpus pour l'instant** : `.variations` (tableau, pas une réponse en LaTeX) et les
  commandes de Q1 (elles entreront avec leur PR de descente).
- **Relecture, 1er passage (2026-11-01)** : `deriver-01…10` OK ; `deriver-10` corrigé en
  `−(x²−2x+1)e^{−x}` (règle de tidy-spec du 2026-10-20 : signe sorti d'un facteur dont le terme de
  gauche est négatif ; mon attendu la contredisait). `deriver-03`, `deriver-11` : question d'ordre
  (`(x+1)eˣ`, `ln(x)+1`), répondue par Q13 et S2 du chantier simplify-carte ; `checkForm` ignore
  l'ordre de toute façon.
- **Règle R-ordre (David, 2026-11-01)** : les solutions d'un ensemble fini se rangent dans
  l'ordre croissant de leur valeur ; une solution sans valeur (paramètre de signe inconnu) garde
  l'ordre du calcul — déjà la règle de `solve-latex.ts`, `absolute-value.ts`,
  `quadratic-renderer.ts`. Exception à corriger en PR 2 : le chemin « produit nul » de l'Atelier
  (`(x−1)(x+2)=0 → {1 ; −2}`). À verser dans la doc système avec cette PR.
- **Juge du corpus = règle E1, inchangé (David, 2026-11-01)** : `checkForm` sans remarque, comme
  `tidy-passe-le-juge.test.ts` ; une écriture que le juge reprocherait à un élève (`brackets`,
  `signs`, `reducedFractions`, `factorOne`…) sort en `forme`. Juge « strict » (égalité
  d'écriture) proposé puis écarté : une seconde définition de « bien écrit », contraire à l'ADR 0032
  § 4. `ln(|x|)` et `0.75` du registre passent le juge : acceptés ; la virgule se pose à
  l'affichage (`toFrenchDecimal`) — à retenir pour la calculatrice. Dérivées `1 + 1/x`,
  `1/x + 2x` (ordre de la règle) non ajoutées : le juge ignore l'ordre.

## Lot 2 — relevé (2026-11-01, agent Explore sur la doc, les journaux et les tests)

Décision (David, « je suis tes recos ») : PR « corpus, lot 2 » après la PR 0 et AVANT la PR 1.
Sources principales : `docs/systeme/mathast/tidy-spec.md`, `docs/adr/0032-*.md`,
`docs/systeme/atelier.md`, `docs/wip/mode-decimal-progress.md`, `docs/wip/grandes-fractions-progress.md`,
`docs/archive/wip/valeurs-remarquables-progress.md` ; tests `cli/__tests__/approximation.test.ts`,
`cli/web/__tests__/{exact-trop-long,mode-decimal,comparaisons-console,logique-console}.test.ts`,
`atelier/__tests__/degres-saisie.test.ts`, `tidy/__tests__/{tidy-decimaux,tidy}.test.ts`,
`eval/__tests__/exact-value.test.ts`. Relancer le relevé pour les `fichier:ligne` exacts.

| #   | Famille                                  | Lignes | Exemples                                                                |
| --- | ---------------------------------------- | ------ | ----------------------------------------------------------------------- |
| 1   | Décimal / fraction (S1, Q3, Q8, Q9, Q22) | ~14    | `1/3+0.5` → 5/6 · `0.5/2` → 1/4 · `0.5(x+1)` gardé · `√0.5` → √2/2      |
| 2   | Grands entiers, ×10ⁿ tapé (15 chiffres)  | ~6     | `2^40` → 1099511627776 · `3×10^20` gardé · `12×10^2` → 1200             |
| 3   | Plafond 1000, règle des 1 000 caractères | ~9     | `2^1000` calculé · `(1+1/1000)^1000` gardé · `1000!/999!` → 1000        |
| 4   | Valeurs remarquables, degrés (S4)        | ~10    | `.simplifier x cos(π/3)` → x/2 · `sin(30°)+1` → 3/2 · `cos(60)` radians |
| 5   | π, e, racines                            | ~12    | `√12+√3` → 3√3 · `2^{3/2}` → 2√2 · `1/(√3−1)` → (1+√3)/2                |
| 6   | Signes, fractions de sommes              | ~8     | `(6x−3)/(−9)` → (1−2x)/3 · `3(−x−1)` → −3(x+1)                          |
| 7   | Comparaisons, logique                    | ~12    | `1<2<3` → vrai · `1/2 != 0.5` → faux · `≈` dans une relation → refus    |
| 8   | Grandeurs                                | ~6     | `12000[m]` → 12 km · `1/3 km` garde la fraction                         |
| 9   | Scientifique, ≈                          | —      | question A                                                              |

Ordre des termes exclu (le juge le tolère). Plafond en vigueur : 1000 (la décision « d » à 10 000
a été annulée le jour même). Grille : règle distincte (10 chiffres significatifs).

**Questions ouvertes (recos : oui ×4)** — A : le registre rend `approx`, arrondi selon les règles
décidées, au point (`8.7700*10^9`), `answer` reste exact ; l'outil traduit virgule et « × ».
B : le registre rend toujours `answer` + `approx`, le mode décimal est un choix d'affichage de
l'outil (règle le point 1 de la revue). C : `2=2` → `\text{vrai}` (point 2). D : expression sans
commande → sa forme rangée ; seul `f` tapé seul n'a pas de réponse (point 3).

**Tranché (David, 2026-11-01, « ok pour les 4, decimal + decimalExact »)** — A : le registre rend
`decimal` (écriture décimale au point, arrondie selon Q3 : 4 décimales, scientifique au-delà) et
`decimalExact` (`true` si l'écriture est exacte) ; `answer` reste exact ; l'outil pose `=`/`≈`, la
virgule, le `×`. Le nom `approx` est rejeté (l'écriture peut être exacte). B : le registre rend
toujours `answer` + `decimal` + `decimalExact` ; le mode décimal est un choix d'affichage de l'outil.
C : égalité / comparaison tapée seule → `\text{vrai}` / `\text{faux}` dans `answer`. D : expression
nue → sa forme rangée (celle de l'Atelier) ; `f` seul sans réponse.

## Expressions nues : registre contre Atelier (sonde du 2026-11-01)

Sonde jetable (vitest sous `src/`, `produceRegistre` / `produceAtelier`), 25 lignes, supprimée après.

- **Pareil** : calculs sans lettre (`1/3+0.5` → 5/6, `√12+√3` → 3√3, `1/(√3−1)` → (1+√3)/2,
  `2^(3/2)` → 2√2, `calcul-01…10` du corpus) ; écritures déjà rangées (`x+1`, `3(x+1)`, `(x+1)²`,
  `x²−1`, `√(x²)`) ; `ln(eˣ)`, `sin²x+cos²x` réduits par aucun des deux.
- **Différent** : avec une lettre, le registre RECOPIE la ligne, en texte linéaire (`answer` =
  `x * x`, `2 x / 4`), l'Atelier la range : `2x+3x` → 5x · `x*x` → x² · `x+2+3` → x+5 ·
  `a+b-a` → b · `2x/4` → x/2 · `1/x+1/x` → 2/x · `(6x-3)/(-9)` → (1−2x)/3 · `3(-x-1)` →
  −3(x+1) · `e^x*e^2` → e²eˣ · `x/x` gardé par l'Atelier (S3) · `0.5x` → `0{,}5 x` (R-point).
- **Bug du registre** : `cos(pi/3)` lu `cos(p·i/3)` (i imaginaire) ; l'Atelier refuse (« Écris π
  avec \pi ou le symbole π. »). Pour le lot 2, famille 4.
- **Conséquence pour D** : ces lignes entrent au lot 2, attendu = la réponse de l'Atelier, registre
  en « connue fausse » jusqu'à la PR qui le corrige.
