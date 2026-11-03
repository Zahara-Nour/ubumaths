---
title: Le registre des commandes, référence commune (pnpm math, Atelier, calculatrice) — journal
date: 2026-11-01
status: PR 0 mergée (#2163), lot 2 en cours (A-D tranchées)
---

## Reprendre ici

_Mis à jour le 2026-11-03, PR 2/5 (D) en cours._

- **État** : lot 2 du registre découpé en 5 PR (§ Lot 2 — correction du registre). PR 1/5 MERGÉE
  (#2281, A/B). PR 2/5 (D) écrite sur `fix/registre-lot2-d` : 22 lignes justes ; reste 20 lignes
  du registre connues fausses au lot 2 (lecture 10, plafond 5, C 5). Pas déployée.
- **Prochaine action** : ouvrir/merger la PR 2/5, puis PR 3/5 — lecture de l'entrée (degrés, `π`,
  refus de `pi`) : `remarquables-01…04, 08, 12`, `racines-06`, `approche-08, 09, 12`.
- **En attente de David** : rien.
- **Tranché** : option `unitChoice: 'school'` GARDÉE exprès (David, 2026-11-03 : « utile plus
  tard ») — ne pas proposer de la retirer ; § Unité du résultat et § Revue de #2276 ; avant : Q9 EN ENTIER, A-D du lot 2,
  `decimal` en LaTeX, `plafond-02` → 1000, Q24, `signes-06` — NE PAS reposer.
- **Pièges** : `docs:check-a-jour` local ne voit que le COMMITÉ (CI rouge sur #2281 : 2 docs) ;
  PR en conflit avec `main` = aucun run de CI → `git merge origin/main` ; `rebase` et `restore` =
  liste `ask` ; sous-expressions de `tidy` en `durations: 'single'`.
- **Worktree / branche** : `../ubumaths-wt-registre-reference` · `fix/registre-lot2-d`.

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

## Lot 2 — candidats et page à cocher (2026-11-01)

- **Page** : https://claude.ai/artifact/GZgw832zPgg2Eqqs9dpZF2 (« Corpus du registre, lot 2 », db
  `verdicts/<id>`), 108 lignes, familles 1-9, ids `decimal-`, `grands-`, `plafond-`,
  `remarquables-`, `racines-`, `signes-`, `comparer-`, `grandeurs-`, `approche-`. Source des
  données : relevé (agent Explore, tests cités `fichier:ligne`) + sonde des deux outils + `judge`
  réel ; scratchpad de la session (`build_candidates.py`, `juges-lot2.json`) — régénérable.
- **Attendus** : réponse de l'Atelier (`{,}` → point) ; écarts posés en question seulement ;
  C appliquée (`2=2`, `3! = 6`, `1/3+1/6=1/2`, `x+x=2x` → `\text{vrai}`). `decimal` tiré du bouton
  ≈ de l'Atelier, sinon du mode décimal du moteur ; absent pour les expressions à lettres, les
  comparaisons, les grandeurs (sauf `1/3[km]`, question), les angles.
- **Mesure** (juge actuel) : Atelier 96/108 juste, registre 57/108.
- **Écarts du registre trouvés** : degrés non lus (`cos(60°)` gardé ; l'Atelier traduit) ;
  `π` tapé lu comme une lettre dans `5π/6`, `π`, `π^20` (pas dans `cos(π/3)`) ; `pi` lu p·i ;
  expressions à lettres recopiées (famille 6) ; écriture gardée (> 1 000 car.) sans `answer` ;
  égalités `=` sans `answer` (« true »). Atelier : égalités `=` sans réponse lisible, `2 \approx 2`
  sans refus.
- **Juge à compléter dans la PR** : il ne lit pas `1000!`, `90{}^{\circ}`, `\mathrm{km}`
  composés/puissances, et compte `\unit{m}` contre `\mathrm{m}` comme « autre valeur ».
- **Questions sur la page (6)** : `plafond-02` 1000!/999! → 1000 ? · `plafond-04` écriture gardée
  avec `/` ou `\frac` ? · `grandeurs-01` 12000 m gardé ou → 12 km (tidy-units:24) ? ·
  `grandeurs-11` décimale d'une grandeur avec unité ? · `comparer-13` `2 \approx 2` → refus du
  registre ? · `approche-09` `decimal` en texte (`8.7700*10^9`) ou LaTeX (`8.7700 \times 10^{9}`) ?
- **Relecture en cours (2026-11-01)** : 20/108 fiches (`decimal-01…14`, `grands-01…06`), 17 OK.
  Questions de David répondues sur la page (champ `reponse`) : `decimal-07` (0,5(x+1) non
  distribué : tidy ne développe pas, comme 3(x+1)) → OK ; `decimal-10` (0,5/x : Q9 de
  simplify-carte) et `grands-06` (2,5×10⁻³ gardé : Q24 posée avec 3×10²⁰ seulement, l'exposant
  négatif n'a jamais été montré à part) → en attente.
- **Relecture, 2e passage** : 82/108. Tranché : `plafond-02` → **1000** (règle « calcul puis
  mesure » contre l'Atelier) ; `plafond-04` écriture gardée avec `/` OK ; `comparer-13` refus OK ;
  familles 4, 5, 7 entières OK. Répondu, en attente : `signes-06` (pas de réduction par 2 qui fait
  apparaître x+1 en haut et en bas) — **ma 1re raison était fausse** (« inviterait à barrer », David :
  x/x est déjà gardé) ; vraie raison : garde-fou technique de tidy (tidy-spec § réduction, 4fd94d6bd :
  réduction sur le terme accumulé, x+1 deviendrait le même facteur et s'annulerait). David veut
  peut-être `(x+1)/(2(x+1))`. **Vérifié (David : « tidy ne doit pas changer le domaine, on a ajouté
  des contraintes, vérifie »)** : `2(x+1)/(4(x+1))` → tidy `(x+1)/(2(x+1))`, avec conditions `1/2`
  (x ≠ −1) ; `(2x+2)/(4(x+1))` → inchangé dans les deux. Le garde-fou de `mergeFactors` (10-20) date
  d'avant S3/`keepDomain` (1394b7343, 10-23) ; son exception ne couvre qu'une base déjà écrite des
  deux côtés. Reste à corriger (contraire à « la réduction ne dépend pas de l'écriture »). Proposé :
  attendu `(x+1)/(2(x+1))`, les deux outils connus faux, correction de tidy en PR à part ; en attente ; `grandeurs-01` (David :
  « je ne sais pas encore ») (mon avis : garder
  12000 m, unité choisie seulement par un calcul, `.convertir` sinon ; tidy-units:24 = écart de
  tidy à signaler). Reste : `grands-09`, `grandeurs-02…11`, `approche-01…15`.

## Lot 2 — écriture, 1re partie (2026-11-02)

- **78 fiches** relues et tranchées écrites (familles 1-7 : `decimal-`, `grands-`, `plafond-`,
  `remarquables-`, `racines-`, `signes-`, `comparer-` ; sauf `decimal-10`, `grands-06`, `signes-06`
  en attente). `plafond-02` → `1000` (correction de David).
- **Juge** (`compare.ts`) : lisible = se parse (`1000!` se compare au texte) ; **grandeur / angle** :
  même unité (texte, `\unit{m}` = `\mathrm{m}`, `km^2`), puis le nombre ; une autre unité de même
  valeur est une autre réponse (`12 km` ≠ `12000 m`) ; **écriture décimale** jugée une fois la réponse
  juste, au texte près (virgule/point, `\times 10^{n}`/`*10^n`) et `=`/`≈` compris. Le registre doit
  la rendre (B : `décimal : absente` sinon) ; l'Atelier n'est jugé que s'il l'affiche (bouton ≈).
  Le format de `decimal` (question `approche-09`) ne change pas le verdict : le juge normalise.
- **Producteurs** : registre → `approximateLatex` en attendant le champ `decimal` (A) ; Atelier →
  `alternative.latex` quand il commence par `=` / `\approx` et ne porte pas de domaine.
- **Connues fausses** : registre 61 (dont 13 `décimal : absente`), Atelier 19 (`plafond-02`, égalités
  sans réponse lisible, `2 \approx 2` sans refus). Preuve rouge : `decimal-02` faussé (0.8334) →
  les deux outils échouent.

## Lot 2 — écriture, 2e partie (2026-11-02)

- David a tout relu (108/108). Tranché : `grands-06` OK (Q24 gardée, exposant négatif compris) ;
  `grandeurs-01` OK (`12000 m` gardé : l'unité ne se choisit que par un calcul ou `.convertir`) ;
  `decimal-10` corrigé en `1/(2x)` (**Q9 rouverte pour ce cas**) ; `signes-06` corrigé en
  `(x+1)(2(x+1))`, lu comme la fraction `(x+1)/(2(x+1))` (le produit n'a pas la valeur de la ligne) ;
  questions de la page : `grandeurs-11` (décimale avec unité) OK, `approche-09` OK → **`decimal` en
  LaTeX** (`8.7700 \times 10^{9}`), appliqué à toutes les écritures scientifiques.
- 30 fiches ajoutées (familles 8-9 : `grandeurs-`, `approche-`, et les 4 tranchées). Toutes les
  grandeurs passent les deux outils. Nouveaux écarts : `decimal-10`, `signes-06` (tidy, les deux
  outils) ; registre : `π`/`pi` (`approche-08/09/12`), `0.3^1000` sans `answer`, décimale absente
  de `3` et `100!`.
- **PR à part, à venir** : tidy — Q9 rouverte (portée à faire préciser), `signes-06` (garde-fou de
  `mergeFactors`, spec + `tidy-fraction-reduce.test.ts:77-84`), `tidy-units.test.ts:24` (12000 m → 12 km,
  contraire à `grandeurs-01`).

## Ordre et Q9 (David, 2026-11-02, « je valide »)

- **Q9 de simplify-carte rouverte en entier** : un décimal sous une barre se chasse aussi quand le
  dénominateur a une lettre — `0.5/x → 1/(2x)`, `1.5/x → 3/(2x)`, `0.5/(x+1) → 1/(2(x+1))`,
  `(x+0.5)/(x−1) → (2x+1)/(2(x−1))`, `x/(0.5x+1) → 2x/(x+2)`, `(0.5x+0.5)/(x+1) → (x+1)/(2(x+1))`
  (comme `signes-06`), `0.5x/x → x/(2x)` (S3 : x/x gardé). Raisons de 2026-10-23 tombées : S3 (David
  accepte `(x+1)/(2(x+1))`) et piste A (David corrige `0.5/x` en `1/(2x)`) ; une règle limitée à
  `0.5/x` dépendrait de l'écriture. Source : `docs/archive/wip/simplify-carte-progress.md` § 38.
- **Ordre** : (1) PR tidy Q9 + `signes-06` (même mécanisme ; `(0.5x+0.5)/(x+1)` a besoin des deux) ;
  (2) petite PR `tidy-units.test.ts:24` (vérifier d'abord qui utilise la conversion) ; (3) PR 1
  `.dériver`. Revue de la PR tidy : `code-reviewer` opus (change l'affichage élève).

## PR tidy Q9 + `signes-06` — phase 0 (David, 2026-11-02, « je te suis »)

- **Q9 en entier** : `0,5/x → 1/(2x)`, `1,5/x → 3/(2x)`, `0,5/(x+1) → 1/(2(x+1))`,
  `(x+0,5)/(x−1) → (2x+1)/(2(x−1))`, `x/(0,5x+1) → 2x/(x+2)`, `(0,5x+1)/(x+1) → (x+2)/(2(x+1))`,
  `(1,2x+0,6)/(x+3) → (6x+3)/(5(x+3))`, `0,5x/x → x/(2x)` (S3).
- **Q-a** (reco suivie) : quel que soit le dénominateur — `0,5√2/x → √2/(2x)`, `0,5/√x → 1/(2√x)`,
  `0,5/eˣ → 1/(2eˣ)`, `0,5/ln x → 1/(2 ln x)`.
- **`signes-06`** : une somme réduite égale à un facteur de l'autre côté y reste des deux côtés
  (comme S3), au lieu d'abandonner la réduction : `(2x+2)/(4(x+1)) → (x+1)/(2(x+1))`,
  `(4x+4)/(2(x+1)) → 2(x+1)/(x+1)`, `(2x+2)/(4(x+1)²) → 1/(2(x+1))` — chaque fois le résultat de
  l'écriture déjà réduite.
- **Limites** : L1 sans barre rien ne bouge (`0,5x`, `0,5(x+1)`, `0,5√2`, `0,4⁻¹ → 2,5`) ; L2 une
  lettre à puissance négative = dénominateur (`0,5x⁻¹ → 1/(2x)`, idempotence B1) ; L3 somme terme
  par terme (`0,5/x + 0,5 → 0,5 + 1/(2x)`) ; L4 idempotence ; L5 `tidyWithConditions` pareil pour
  les deux écritures (`1/2`, x ≠ −1).
- **Erreurs** : division par zéro, grandeurs, écriture gardée : inchangés ; `checkForm` n'utilise
  pas `tidy` (correction des élèves non touchée).

## PR tidy Q9 + `signes-06` — écriture (2026-11-02)

- **Code** (`collect.ts`) : `readsFraction` — une barre est une fraction quel que soit le
  dénominateur, un facteur resté au dénominateur aussi (`0,5x⁻¹`) ; `reduceFractionOfSums` ne garde
  plus les décimaux sous une barre à lettre ; `mergeKeepingDomain` remplace `mergeFactors` dans la
  réduction (S3 via `keepDomain`, au lieu d'abandonner) ; `meetsAcross` envoie le nombre d'une
  somme qui rejoint un facteur de l'autre côté au coefficient (`(4x+4)/(2(x+1)) → 2(x+1)/(x+1)`,
  sinon `(2x+2)/(x+1)`). `mergeFactors` reste pour `flipNumerator`.
- **Changement de plus, voulu** : Atelier, `0,5x/x` → « 1/2, pour x ≠ 0 » (avant « 0,5 » : revue du
  2026-10-26 qui découlait de l'ancienne Q9) — `domaine-garde.test.ts`.
- **Corpus** : `decimal-10`, `signes-06` justes pour l'Atelier (retirés) ; le registre reste connu
  faux sur ces deux lignes, pour la décision D (il recopie la ligne à lettres).
- **Mesures** : 41 rouges avant ; suite serveur 63 709 verts, 2 rouges (`domaine-garde`, corrigé ;
  `deploy-prod` « CI toujours en cours », rouge aussi sur main) ; banc **1 982 modèles de prod × 8
  tirages (15 856) : 0 différence** (témoin non construit) ; `check:incremental` 0 ; cliquet tenu ;
  `lint:fast` propre.
- **Revue `code-reviewer` opus, corrigé (8 rouges d'abord)** : (1) une grandeur passait en fraction
  (`0,5 m/x → (1/(2x)) m`) et (2) une division par zéro aussi (`1,5/0 → 3/(2·0)`) — contraires à
  E1 : `readsFraction` n'applique Q9 ni à un terme avec unité ni à un dénominateur nul ; (3)
  `(2x+2)/(x+1)` restait (pas de nombre commun) alors que `(4x+4)/(2(x+1)) → 2(x+1)/(x+1)` :
  réécrit aussi (`(3x+3)/(x+1)² → 3/(x+1)`). **Laissé (avant la PR, déjà ainsi)** : (4)
  `meetsAcross` ne reconnaît que l'autre côté écrit primitif — `(2x+2)/(4x+4) → (x+1)/(2x+2)`,
  `(4x+4)/(6x+6) → (2x+2)/(3x+3)`, `(2−2x)/(4(x−1))` sans `−1/2` conditionnel. Rien vu sur valeur,
  domaine, idempotence (74 entrées), narration. Après correction : banc 0 différence,
  `check:incremental` 0, cliquet tenu.

## Unité du résultat — reprise à zéro (David, 2026-11-02)

- **Constat** : deux choix d'unité. `tidy` par défaut (`'school'`, 12000 m → 12 km, contraire à
  l'ADR 0026) atteint l'Atelier par `f(4)` (f(x)=3000[m]·x → 12 km) et le registre par `.simplify`.
  `cli/quantities.ts` refait un choix par-dessus (`expressedInWritten`, écriture la plus courte) :
  `tidy` 21 600 000 J contre Atelier 6 kW·h, `tidy` 2,5 h contre Atelier 2 h 30 min.
- **Principes** (validés) : (1) indépendant de l'ordre d'écriture ; (2) indépendant du chemin, une
  seule fonction ; (3) pas de conversion non demandée → candidats = unités TAPÉES dans le calcul,
  `.convertir` sinon ; (4) lisible et exact.
- **Règle** (validée) : parmi les unités tapées, celle où la valeur s'écrit avec le MOINS DE
  CHIFFRES (zéros compris : `0,001` = 4, `5000` = 4) ; à égalité la plus petite unité ; produit /
  quotient : une unité tapée par dimension de base, ou l'unité composée tapée (`kW·h`). Sans écriture
  finie : la fraction la plus courte. Écartés : première tapée (ordre), plus petite toujours
  (`5000 m`), plus grande ≥ 1 (seuil arbitraire), toutes les unités usuelles (convertit à la place
  de l'élève).
- **Recos validées** : durées h-min-s quand ≥ 2 de h/min/s tapées et durée juste en secondes,
  DANS la règle commune ; terme à lettre inchangé (`x km + 0,5 km`) ; banc prod avant de coder ;
  retirer le second choix de `quantities.ts`. Ordre : banc → page à cocher → PR.
- **Mesures du prototype** : `12[km]+500[m]` 12,5 km ; `2000[m]+3[km]` 5 km (les deux ordres) ;
  `1[m]+1[km]` 1001 m ; `7[mm]×5[cm]` 3,5 cm² ; `2[cm]×3[mm]` 60 mm² ; `3[kW]×2[h]` 6 kW·h ;
  `2500[mL]` par `simplify` gardé (garde : le candidat développé ne gagne pas s'il écrit une unité
  absente). Tests : 31 rouges, tous des attentes de l'ancienne règle (dont `octets-calcul`
  `1[Ko]+1[o]` → 1001 o, `5[km]+3[m]` → 5003 m, `1[h]+45[min]+30[min]` → 135 min avant durées).
- **Banc** (25 modèles de `tests/fixtures/correction-cases-unite/`, 8 graines) : 5/200 changent,
  réponse attendue seule, énoncés « tu choisis l'unité » : `0bb7a4ca` 1,1 h → 66 min, `75956b22`
  3,85 h → 231 min (→ h-min avec la reco durées), `64e55fc7` 1,005 kL → 1005 L, 1,06 hg → 106 g.
  Oracle : 1 724 réponses, 0 verdict changé.
- **Banc prod** (12 modèles lus par David : 10 absents des fixtures + 2 peut-être périmés, 96
  tirages) : 0 différence. Total : 35 modèles à unités, 5 tirages changent (les 3 modèles ci-dessus).
- **Page à cocher** publiée : 5 cas réels, 24 cas types (avant : tidy / {{eval}} / Atelier
  mesurés, souvent en désaccord), 5 durées (prévues, pas codées).

## Unité du résultat — avis et PR (2026-11-03)

- **Avis** : 34/34 « ok », aucun commentaire (collection `avis`).
- **Durées** : `typesDurations` lit les unités tapées dans TOUT le calcul (`2*(1[h] 30[min])` → 3 h,
  comme l'Atelier avant) ; une partie suffit (`1[min]+3540[s]` → 1 h) ; négative : `-(2[h] 30[min])`
  sans parenthèses. `{{eval}}` : `{2[h]}{30[min]}` (format de `;hms`), négative ou `;sci` → une grandeur.
- **Mesure qui a changé le plan** : l'attendu h-min-s rendait FAUSSES toutes les réponses justes des
  4 modèles de durées (oracle : 160 verdicts ; corpus 462-468 rouge). Correctif : la correction et
  le clavier lisent l'attendu comme une durée dans sa plus petite unité. Après : 1 724/1 724 verdicts
  inchangés (sonde), oracle régénéré (1 647 saisies communes : verdict ET message identiques).
- **Portée réelle** : avec les durées, les 4 modèles de durées (0bb7a4ca, 2f3b42a3, 75956b22,
  90aaf9dd) changent l'AFFICHAGE de l'attendu à presque chaque tirage (34 attendus sur 200), pas
  seulement les 5 du banc d'avant ; verdicts inchangés.
- **Perf** : banc `tidy` (9 expressions × 3000) égal à `main` une fois la machine calmée.

## Revue de #2276 et correctifs (2026-11-03)

- **Findings** (code-reviewer Opus) : (1) une variable `{{eval}}` de durée en h-min-s cassait
  `{{eval:{{t}}*2}}` ; (2) unité imposée : l'attendu change d'unité (`1.5[km]` pour `m` imposé) →
  bonne réponse refusée ; l'oracle ne le voyait pas (0 modèle avec `required` dans les fixtures) ;
  (3) `1[h]+30[min]` sans étape ; (4) `;+ ;() ;d` perdus sur h-min-s ; (5) simplify ≠ tidy avec un
  terme à lettre (dimension invalide, laissé) ; (6) défaut `'hms'` pour tous (gardé : choix « tout
  sauf les variables »).
- **Prod (lecture seule)** : 0 modèle sur 2 013 avec `required` ; les seuls `{{eval}}` à plusieurs
  unités de durée sans `;hms` sont les attendus des 4 modèles de durées.
- **Décisions de David** : h-min-s partout sauf la valeur d'une variable ; attendu réécrit dans
  l'unité imposée au tirage ; dire le geste (`tidy-write-duration` « On décompose la durée en
  heures, minutes, secondes »).
- **Piège** : `1[h]+30[min]` en une grandeur donne `90[min]` (1,5 et 90 : 2 chiffres, la plus petite).

## Lot 2 — correction du registre (2026-11-03)

Relevé : 61 lignes du registre connues fausses (lot 2), 5 familles. Ordre (le contrat d'abord) :

1. **A/B** — `decimal` + `decimalExact` (14 lignes `décimal : absente`).
2. **D** — expression à lettres rangée comme l'Atelier (`tidy`, ordre gardé, S3) : 23 lignes.
3. **Lecture de l'entrée** — degrés, `π`, refus de `pi` (11 lignes).
4. **C** — égalité seule → `\text{vrai}`/`\text{faux}` (5 registre, 5 Atelier dont `comparer-13`).
5. **Plafond** — `1000!/999!` → 1000 (les deux outils) ; réponse de l'écriture gardée (4 lignes).

**PR 1 (A/B), mergée (#2281)** : `ReplExecutionResult.decimal` (LaTeX au point, sans signe,
`approximationLatex`) et `decimalExact`, pour un calcul tapé (dans les deux modes, nombre déjà
écrit compris) et une grandeur seule (`QuantityOutcome.decimalWriting`, `0.3333~\mathrm{km}`) ;
`answer` posée par le calcul, exacte même en mode décimal (avant : `0.3333` pour `1/3`). Pas pour
`.convert` (aucune réponse brute encore), ni l'écriture gardée (`answer` absente, PR 5). Le juge
lit `decimalExact` (le signe pour l'Atelier). Preuve rouge : 14 lignes du corpus + 6/9 tests de
`reponse-decimale.test.ts`. Suites `cli` + `atelier` : 8 038 verts. L'Atelier lit encore
`approximateLatex` (bouton ≈) : passer au champ `decimal` = travail de R1, plus tard.
Revue `code-reviewer` (Sonnet) : aucun bloquant ; corrigé — « sans signe » = sans `=`/`≈`, le
moins reste (doc + tests `-1/3`, `-3`, `2[h]-3[h]`) ; `decimal` d'une grandeur en `\unit{…}`
comme `answer` (le juge lit `\unit` = `\mathrm`).

**PR 2 (D), 2026-11-03** : une expression à lettres non liées (`createExpressionDisplayResult`)
répond par sa forme rangée, `tidiedExpression` = `tidy(…, { order: 'kept' })` sauf grandeur — la
règle de `resultToShow` de l'Atelier — dans `answer` ET `output` ; `ast` reste l'entrée (l'Atelier
la range lui-même ; ses autres lecteurs y lisent la saisie, non audités un par un). Justes : 21
lignes de D + `remarquables-06` (`2*45°` → 90°). Rendu changé, toujours faux (lecture, PR 3) :
`remarquables-08`, `racines-06`, `approche-08`. Preuve rouge : 25 tests du corpus en échec avant
la mise à jour de la liste. Test mis à jour : `reciproque-a-la-volee` `x^-1` → texte `1/x` (l'écran
affichait déjà `\dfrac{1}{x}`, seul le texte retardait). 1re retouche (dans `resultToShow` du
registre) sans effet, annulée : ce chemin ne voit que les lettres liées.
