---
title: Atelier — la réciproque calculée (phase 0)
date: 2026-10-13
status: chantier livré (#1302, #1304, #1314, #1328, 2026-10-13) ; questions (1)-(5) tranchées et livrées (#1338, #1342) ; paramètres décrits dans docs/systeme/atelier.md ; archivé le 2026-10-25
---

# Atelier — la réciproque calculée

Décision de David (2026-10-13) : on ne reprend pas `.inv` de `/cas` (réciproque donnée à la main,
jamais vérifiée) ; on garde l'idée d'une **vraie réciproque, calculée algébriquement par le moteur**.
Contexte : [atelier-cas-phase0.md](atelier-cas-phase0.md). Chapeau : [atelier-progress.md](../../wip/atelier-progress.md).

## Décisions de David (2026-10-13, « tes recos pour les 4 questions »)

- **R1 — Accès** : comme Dériver. Bouton « Réciproque » sur la carte de f → carte `f⁻¹` + ligne dans
  Calcul, sans changer de vue ; et la commande `.réciproque f`.
- **R2 — f non bijective** (`x²` sur ℝ) : refus expliqué en français, qui propose l'écriture avec un
  intervalle : `.réciproque f sur [0;+∞[`. Pas de « deux branches ».
- **R3 — Étapes** : affichées, comme `.résoudre` : `y = 2x + 3 ⇔ x = (y − 3)/2`, donc
  `f⁻¹(x) = (x − 3)/2`.
- **R4 — Ensembles** : la ligne dit de quel ensemble à quel ensemble : `f⁻¹ : ]0 ; +∞[ → ℝ`.

## Q5 — tranchée (b) : quand la formule de f⁻¹ vaut sur plus large que son ensemble

`f(x) = √(x+2)` donne `f⁻¹(x) = x² − 2`, **mais seulement sur [0 ; +∞[**. Une carte de fonction ne
porte aucun intervalle (`FunctionObject`, `atelier/types.ts`) : la carte `f⁻¹` serait tracée sur tout
ℝ, une parabole entière au lieu d'une demi-parabole. Faux à l'écran. Trois choix :

- **(a)** Ligne dans Calcul seulement, **sans carte**, dans ce cas-là (et carte quand les ensembles
  coïncident : affines, homographiques, `eˣ`/`ln`, `x³`). Simple, mais deux comportements.
- **(b)** Apprendre aux cartes de fonction à porter un intervalle (`f(x) = x² − 2 sur [0;+∞[`), tracé
  et calculs compris. Utile bien au-delà de la réciproque (fonctions définies sur un intervalle, partout
  au lycée), mais c'est un chantier à part, à faire AVANT.
- **(c)** Carte toujours créée, tracée sur tout ℝ, avec l'ensemble écrit sur la ligne. Rejeté d'avance :
  la courbe est fausse.

**Décision de David (2026-10-13) : (b)** — « mathAST gère les domaines ». Les cartes de fonction
apprendront à porter un intervalle (chantier à part, sa propre phase 0, AVANT le lot 3) ; la carte
`f⁻¹` est alors toujours créée, avec son ensemble.

## Comportements attendus (TDD)

### Cas nominaux

| f                  | Intervalle | Attendu                                                               |
| ------------------ | ---------- | --------------------------------------------------------------------- |
| `2x + 3`           | —          | `f⁻¹(x) = (x − 3)/2`, `ℝ → ℝ`, carte `f⁻¹`                            |
| `(2x + 1)/(x − 3)` | —          | `f⁻¹(x) = (3x + 1)/(x − 2)`, `ℝ \ {2} → ℝ \ {3}`                      |
| `x³`               | —          | `f⁻¹(x) = ∛x`, `ℝ → ℝ`                                                |
| `e^{2x+1}`         | —          | `f⁻¹(x) = (ln x − 1)/2`, `]0 ; +∞[ → ℝ`                               |
| `ln(x − 1)`        | —          | `f⁻¹(x) = eˣ + 1`, `ℝ → ]1 ; +∞[`                                     |
| `x²`               | `[0;+∞[`   | `f⁻¹(x) = √x`, `[0 ; +∞[ → [0 ; +∞[`                                  |
| `x²`               | `]−∞;0]`   | `f⁻¹(x) = −√x`, `[0 ; +∞[ → ]−∞ ; 0]`                                 |
| `√(x + 2)`         | —          | `f⁻¹(x) = x² − 2`, `[0 ; +∞[ → [−2 ; +∞[` — carte sur `[0 ; +∞[` (Q5) |

Les étapes (R3) écrivent `y = f(x) ⇔ x = …` puis le renommage en x. L'écriture finale passe par la
mise au propre habituelle de Calcul (ordre de David, virgule décimale).

### Cas limites

- **Une carte `f⁻¹` existe déjà** : elle est mise à jour, pas doublée (comme `f′`).
- **f modifiée** : la carte `f⁻¹` suit, ou disparaît avec un message si f n'est plus bijective
  (même règle que `f′` qui suit f).
- **Intervalle où f n'est pas bijective** (`x²` sur `[−1 ; 2]`) : refus R2.
- **Lettre choisie** (`f(t) = 2t + 3`) : `f⁻¹(t) = (t − 3)/2`, comme les autres cartes.

### Refus (en français, sans écriture interne)

- **f non bijective** sur son ensemble : « `f` n'est pas bijective sur ℝ (`f(−1) = f(1)`) : choisis un
  intervalle, par exemple `.réciproque f sur [0;+∞[`. » — avec deux valeurs qui ont la même image
  quand le moteur en trouve.
- **Le moteur ne sait pas résoudre** `y = f(x)` (`x eˣ`, `x + sin x`) : « Je ne sais pas calculer la
  réciproque de f algébriquement. » Jamais une réponse approchée, jamais « pas de solution ».
- **f est constante** : « Une fonction constante n'a pas de réciproque. »
- **Pas une fonction** (`.réciproque a`, liste, suite) : refus qui nomme le type.

## Lots

1. **Solveur (mathAST)** — `solve(y = f(x), x)` répond aujourd'hui **« pas de solution »** (faux) dès
   que le second membre est une lettre, pour `e^{2x+1}`, `ln(x − 1)`, `√(x + 2)`, `2ˣ`, `3eˣ − 1`
   (mesuré le 2026-10-13) ; il sait `e^x = 3`. Le corriger, avec la condition sur le paramètre
   (`y > 0`). Vérifier au passage `.résoudre e^(2x+1)=a` dans Calcul. PR à part.
2. **Le calcul de la réciproque** — résolution, choix de la branche dans l'intervalle, bijectivité,
   ensembles de départ et d'arrivée, étapes ; refus. Testé sans l'atelier.
3. **L'atelier** — bouton, commande `.réciproque f [sur I]`, carte `f⁻¹` portant son ensemble (Q5), aide — après le chantier « carte sur un intervalle ».

## Journal

- 2026-10-13 — phase 0 écrite ; R1-R4 tranchées ; Q5 = (b) ; phase 0 validée (« ok pour la phase 0 »).
- 2026-10-13 — **lot 1 MERGÉ (#1302)** : `solve(y = f(x), x)` avec second membre littéral (exp, ln,
  log_b, racine d'indice n, base constante ; substitution u = eˣ), condition sur le paramètre dans
  `Solution.condition` ; bug de main `\log_2(x)=3` → 1000 corrigé (→ 8). Deux revues avec
  vérification numérique : aucune réponse fausse. Restent (refus honnêtes, comme sur main) :
  `y = eˣ + e⁻ˣ`, `y = e^{2x}/(eˣ − 2)` (le domaine de la valeur ne se résout pas → `definedFor`
  refuse) ; plusieurs lettres ; coefficient littéral devant ln/cos/sin ; `y = x eˣ`. Écritures à
  mettre au propre au lot 2 (`ln(y/3 + 1/3)` → `ln((y+1)/3)`, `(1/2)^a`). **Question à David** :
  `ax = 1` → `1/a` et `e^{ax} = 2` → `ln 2 / a` sans « si a ≠ 0 » (convention V41, déjà sur main).
- 2026-10-13 — **lot 2 en PR** : `computeReciprocal` (`src/lib/mathAST/reciprocal/`, doc
  [reciproque.md](../../systeme/mathast/reciproque.md)) ; les 8 cas du tableau et les 4 refus testés,
  aller-retour numérique ; f(I) lue par les variations ET par le solveur, en accord. Écritures
  laissées au solveur : `x² − 4x + 1` sur [2 ; +∞[ → `√(4x + 12)/2 + 2`, `1/x²` → `√x/x`.
- 2026-10-13 — **lot 2 MERGÉ (#1304)** : `computeReciprocal` (`src/lib/mathAST/reciprocal/`, doc
  `docs/systeme/mathast/reciproque.md`) ; injectivité acceptée seulement si PROUVÉE (variations ou
  solution unique) ; f(I) lu par variations et par le solveur ; `root(a, n)` désormais évalué.
  Deux revues (62 cas vérifiés numériquement, aucune réciproque, borne ni bijectivité fausse).
  Refus honnêtes restants : `1/x³` (Cardano imprécis), `1/x⁴`, `(x−2)⁴`, `|x|`, `ch x`.
  Constat hors lot (déjà sur main) : un indice de racine négatif (`\sqrt[-3]{27}`) fige
  l'évaluateur > 15 s → PR à part (garde `index < 1`). **Questions à David** : écritures du manuel
  (`2 + √(x+3)` plutôt que `√(4x+12)/2 + 2`) ; intervalle suggéré = morceau monotone le plus à
  droite ; paire `f(a) = f(b)` citée seulement si a, b entiers ; 3ᵉ étape « ensembles » (R4).
- 2026-10-13 — **DÉCISIONS DE DAVID** (« je valide tout »), à livrer avec le lot 3 :
  - **Écriture** : `tidy` ne factorise pas (mesuré : `√(4x+12)/2 + 2` et `ln(x/3 + 1/3)` inchangés).
    Réécritures ciblées sur l'écriture finale de la réciproque seulement : sous une racine, sortir le
    contenu par **`factorPolynomial`** (noyau de l'ADR 0024, `mathAST/factor/factor.ts` — pas de
    nouvelle factorisation) puis la racine du carré parfait (`normal/radical.ts`) :
    `√(4x+12)/2 + 2 → √(x+3) + 2` ; dans un ln, une somme de fractions au même dénominateur :
    `ln(x/3 + 1/3) → ln((x+1)/3)`.
  - **f non bijective** : le refus EXPLIQUE (deux antécédents d'une même image → f⁻¹ ne saurait pas
    choisir) et LISTE les réciproques par morceau monotone : « sur ]−∞ ; 0] : f⁻¹(x) = −√x ; sur
    [0 ; +∞[ : f⁻¹(x) = √x » (morceau sans formule calculable : cité sans formule), puis
    « choisis un intervalle ». La paire `f(a) = f(b)` reste citée seulement si a, b entiers.
  - **3ᵉ étape « ensembles »** (R4) : gardée.
  - **Paramètres** : (1) lettre qui a une carte (curseur) : formule gardée avec la lettre, condition
    jugée sur la valeur actuelle ; la carte `f⁻¹` suit le curseur et dit « pour a = 0, f est
    constante : pas de réciproque » quand c'est le cas ; (2) lettre libre (Calcul) : discussion par
    cas comme un manuel (« si a ≠ 0 : … ; si a = 0 : f est constante »), en trouvant les valeurs du
    paramètre qui cassent la bijectivité. (1) d'abord.
- 2026-10-13 — **écriture + refus expliqué en PR** (`feat/reciproque-ecriture`) : racine (contenu
  sorti par `factorPolynomial`, `√(x + 3) + 2`), logistique `ln(x/(1 − x))` ; refus « non bijective »
  qui explique et liste les réciproques par morceau (`pieces`), périodique (sin, cos) détecté ;
  x⁴ − 2x² et x eˣ sur ℝ passent de `unsolved` à `not-bijective`. Doc `reciproque.md`.
- 2026-10-13 — **lot 3 en PR** (`feat/atelier-reciproque`) : bouton « Réciproque » et
  `.réciproque f [sur I]` (aussi sur une expression : ligne seule) → carte `f⁻¹` (rangée `f^-1`),
  qui suit f, porte son ensemble de départ comme intervalle (tracé restreint), se recrée au
  rechargement sans formule rangée ; `sur I` CROISÉ avec l'ensemble de f (revue de #1328 ; d'abord « remplace », faux). Paramètres, cas 1 : formule
  à lettres (`(x − b)/a`) quand le solveur la trouve et qu'elle coïncide avec la réciproque jugée
  aux valeurs actuelles, sinon formule à nombres (`a eˣ` → `ln(x/2)`) recalculée à chaque cran ;
  « Pour a = 0 et b = 3, f est constante : pas de réciproque. » Refus composés en maths dans Calcul
  et sur la carte. Doc : [atelier.md](../../systeme/atelier.md) § « La réciproque ».
- 2026-10-13 — **lot 3 MERGÉ (#1328)** : bouton « Réciproque », `.réciproque f [sur I]` (I CROISÉ avec
  l'ensemble de f), carte `f⁻¹` (nom interne `f^-1`) qui suit f, ensemble = départ de f⁻¹,
  paramètres avec curseurs. Deux revues ciblées. **Chantier livré** (lots 1-3 + écriture/refus #1314).
  **Questions ouvertes à David** : (1) `f^-1` tapé dans Calcul doit-il désigner la carte (aujourd'hui
  refus honnête) ; (2) `.réciproque 2x+3` sans carte → ligne seule, OK ? ; (3) tracer y = x ? ;
  (4) pas de Réciproque sur f′ ni de Dériver sur f⁻¹, OK ? ; (5) refus de sin x qui propose
  [−π/2 ; π/2] sans arcsin (reco : ne pas proposer). Suite : paramètres sans carte (discussion par
  cas, décidée). Constat hors lot : `g(x) = f(x)^-1` puis `g(2)` → « Fonction inconnue : g ».
- 2026-10-13 — **DÉCISIONS DE DAVID** (« oui ») sur les questions (1)-(5) :
  - (1) `f⁻¹` / `f^-1` / `f^{-1}` tapé dans Calcul = la réciproque, **calculée à la volée comme
    `f'`** (`expandDerivatives`, engine.ts) — AUCUNE carte requise ; f non bijective → même refus que
    `.réciproque f` ; `f⁻¹(5)` hors du départ → refus comme `f(5)` ; `g(x) = f⁻¹(x)` suit f ;
    l'inverse 1/f s'écrit `1/f(x)`. Remplace le refus honnête provisoire de #1328.
  - (2) `.réciproque 2x+3` sans carte : ligne seule, gardé.
  - (3) droite y = x grise en pointillés, tracée d'office quand f ET f⁻¹ sont affichées (pas une carte).
  - (4) pas de Réciproque sur f′ ni de Dériver sur la carte f⁻¹ (`.dériver f⁻¹` suffit via (1)).
  - (5) sin : le refus dit la vérité (bijective sur [−π/2 ; π/2], réciproque arcsin, que Chiphre ne
    sait pas encore calculer) sans proposer une commande qui échouerait.
- 2026-10-13 — **décisions (1), (3), (5) en PR** (`feat/reciproque-a-la-volee`) : `f⁻¹` tapé =
  la réciproque à la volée (`expandDerivatives`, sans carte ; refus de `.réciproque f`, hors du
  départ → refus de `f(5)`) ; droite y = x grise en pointillés (`syncPlots`) ; sin/cos/tan : refus
  qui nomme arcsin/arccos/arctan sans commande. Défaut `g(x) = f(x)^-1` corrigé (exposant négatif
  sans accolades relu `^(-1)` par `parse.ts`).
- 2026-10-13 — #1338 (f⁻¹ à la volée, y = x, refus de sin/cos/tan, `g(x) = f(x)^-1` réparé) et #1342
  (définition en erreur dite telle quelle dans Calcul ; refus de sin avec son explication ; borne
  ouverte où f n'existe pas, tan sur ]−1 ; 4[) MERGÉS. Reste noté : `m(x) = 1/0` — une carte en
  erreur devient inconnue du moteur (`.domaine h` → ℝ, `h(1)` → « Fonction inconnue »), PR à part.
