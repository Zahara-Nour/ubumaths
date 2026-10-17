---
title: Les grandeurs (nombre + unité) — analyse et plan
date: 2026-10-11
status: décisions de David prises le 2026-10-11 (« je suis tes recos ») — phase 0 des lots A et B : grandeurs-phase0.md
---

# Les grandeurs — pourquoi ça casse encore, et comment régler le problème

Analyse demandée par David le 2026-10-11 (« un problème récurrent qu'il faut régler »).
Tout ce qui suit a été **mesuré sur le code de `main` le 2026-10-11** (sondes vitest jetables),
sauf mention contraire. Vocabulaire : une **grandeur** est un nombre muni d'une unité (`CONTEXT.md`).

## En bref

1. **Calcul (atelier) et `/cas` affichent des grandeurs fausses** : 9 cas sur 26 de la batterie
   (`10 km ÷ 1 h` → « 10 m/s », `7 mm × 5 mm` → « 35 m² », `90 km/h × 2 h` → « 180 m »). La
   valeur calculée est juste, l'**étiquette** de l'unité est fausse. Défaut **connu et mesuré le
   2026-09-27** (`docs/archive/wip/grandeurs-eval-progress.md` : « à corriger à part »), jamais corrigé.
2. **Le bon calculateur existe déjà** : `tidy` (unité écrite d'abord), sur lequel `{{eval}}` des
   questions a été bâti — juste sur les 26 cas. Calcul passe par un **autre**, plus ancien :
   `evaluateWithUnits`.
3. **L'affichage de Calcul devine** qu'une réponse est une grandeur à la présence d'un antislash
   dans le texte du moteur : l'unité disparaît (`5[km]` → « 5 ») et `π/3` s'écrit « 1/3π ».
4. **L'écriture naturelle `5 km` n'existe pas dans l'atelier** (lue 5·k·m) alors que les cases à
   unité des questions l'acceptent déjà — elles savent qu'une grandeur est attendue, l'atelier non.
   C'est la seule vraie **décision produit** (§6, Q1).
5. **Pourquoi ça revient** : il y a trois lecteurs, trois calculateurs et quatre écritures des
   grandeurs, et chaque correction n'en répare qu'un (117 commits « unités / grandeurs » depuis
   mai). ~2 000 lignes de `questions/units` sont mortes.

---

## 1. Ce que l'élève voit aujourd'hui (Calcul ; `/cas` est le même moteur)

### Résultats faux

| Saisie                         | Calcul affiche                             | Juste (`tidy`) |
| ------------------------------ | ------------------------------------------ | -------------- |
| `10[km]/1[h]`                  | **10 m/s**                                 | 10 km/h        |
| `7[mm]*5[mm]`                  | **35 m²**                                  | 35 mm²         |
| `7[mm]*5[cm]`                  | **350 m²**                                 | 350 mm²        |
| `90[km/h]*2[h]`                | **180 m**                                  | 180 km         |
| `100[g]/2[L]`                  | **50 g/m³**                                | 50 g/L         |
| `9.81[m/s^2]*2[kg]`            | **981/50 m·g/s²** (facteur 1000)           | 19,62 N        |
| `3[h]+20[min]`                 | **33333333333333333/10000000000000000 h**  | 200 min        |
| `3[h]/1[min]`                  | **1500000000000000000/8333333333333333 1** | 180            |
| `10[km]/2[m]`                  | **5000 1**                                 | 5000           |
| `d = 5[km]`, `t = 2[h]`, `d/t` | **5/2 m/s**                                | 2,5 km/h       |
| `v*3[h]` (v = d/t)             | **15/2 m**                                 | 7,5 km         |

Cause : `createUnitAwareResult` (`mathAST/cli/web/web-repl-engine.ts:1213`) écrit l'unité par
`unit.original || formatUnitComponents(unit)`. Une unité **calculée** (km ÷ h) n'a pas
d'« original » ; `formatUnitComponents` écrit les unités de base et **oublie le coefficient**
(km/h est rangé m·s⁻¹ × 1000/3600). `.convertir km/h` répond alors « 10 m/s → 10 km/h,
facteur 1 » : pour le moteur, c'est déjà du km/h. Le README de `mathAST/units` documente cette
perte comme un style (`format(km_h, 'fraction') // 'm/s'`).

### Unité qui disparaît, π mal écrit

| Saisie                | Calcul affiche | Pourquoi                                                   |
| --------------------- | -------------- | ---------------------------------------------------------- |
| `5[km]`, `5\unit{km}` | **5**          | réponse dessinée depuis l'arbre — le nombre seul           |
| `90[km/h]`, `20[°C]`  | **90**, **20** | idem                                                       |
| `12[km]+300[m]`       | 123/10 km      | le texte contient `\dfrac` → le texte est affiché tel quel |
| `π/3`, `arcsin(1)`    | **1/3π**, 1/2π | le texte contient `\pi` → même chemin                      |

Cause : la vue (`atelier/render.ts:149`) affiche le **texte** du moteur s'il contient un antislash
(chemin prévu pour les grandeurs), sinon l'**arbre** — que le moteur rend **sans l'unité**
(`ast: exactEvalResult.node`, un nombre).

### Messages en anglais, écritures parasites

| Saisie                             | Calcul affiche                                               |
| ---------------------------------- | ------------------------------------------------------------ |
| `5[m]+3[s]`                        | « Cannot add 'm' and 's': incompatible dimensions »          |
| `5[m]+3`                           | « Cannot add 'm' and dimensionless value »                   |
| `20[°C]*2`                         | « AFFINE_COMPOSITION_FORBIDDEN: cannot multiply, divide, … » |
| `.convertir m`                     | « Converted: 1 km → 1000 m / Factor: 1000 »                  |
| `12[km]+300[m]` en `.mode décimal` | « ≈ 12,3 km » (≈ devant une valeur exacte)                   |
| `10[km]/3` en `.mode décimal`      | « ≈ 3,3333333333333335 km »                                  |

### L'écriture naturelle

| Saisie                                                        | Aujourd'hui                                              |
| ------------------------------------------------------------- | -------------------------------------------------------- |
| `5 km` (Calcul)                                               | 5·k·m, affiché « 5 k m »                                 |
| `12 km + 300 m`                                               | **l'exemple du champ de Calcul** — lu 12·k·m + 300·m     |
| `d = 5 km` (valeur)                                           | carte « En attente de « k » »                            |
| `5 m` avec une valeur `m = 3`                                 | 15                                                       |
| `5 km` dans une **carte** (MathLive)                          | l'espace est ignorée (`mathModeSpace` non réglé) : `5km` |
| `5 km`, `5km`, `5 m` dans une **case à unité** d'une question | ✅ lus 5 km, 5 m (`normalizeStudentQuantity`)            |

---

## 2. La carte des chemins

Trois étapes — **lire** (écriture → arbre avec nœud `unit`), **calculer**, **écrire** — et, pour
chacune, plusieurs implémentations selon le contexte.

### Lire

| Écriture                                                                                            | Lecteur                                                                        | Contexte                                                                     |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `5[km]` (syntaxe maison, `~…~`)                                                                     | parseur maison (`parser/custom`, `unit-writing.ts`)                            | énoncés, `{{eval}}`, Calcul, URL                                             |
| `5~\unit{km}` (LaTeX)                                                                               | parseur LaTeX (`parser-pratt.ts`)                                              | énoncés `$…$`, Calcul                                                        |
| MathLive : `5\operatorname{\mathrm{km}}`, `5\,h`, `5\min`, `\frac{90\operatorname{\mathrm{km}}}{h}` | `normalizeStudentQuantity` (`questions/units/student-input.ts`) → `5\unit{km}` | cases à unité ; **secours** des cartes de l'atelier (`atelier/mathfield.ts`) |
| `2 h 15 min`                                                                                        | `composite-duration.ts`                                                        | cases à unité (durées)                                                       |
| `5 km`, `5km` (texte)                                                                               | **aucun** — produit de lettres                                                 | Calcul, définitions                                                          |

### Calculer

| Calculateur                                                                                        | Qui s'en sert                                                | État mesuré                                                                    |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `evaluateWithUnits` (`eval/evaluate-with-units.ts`) + `.convertir`, `.mode-unités` (first/si/best) | **Calcul, `/cas`** (seul usage réel)                         | 9 faux sur 26 ; flottants ; messages anglais                                   |
| `normalize` / `tidy` (`unitChoice: 'written'` ou scolaire)                                         | `{{eval}}` (`evaluateQuantity`), `simplify`, `areEquivalent` | juste sur 26/26 ; exact (rationnels)                                           |
| `validator.ts` + `ce-integration.ts` (ComputeEngine)                                               | correction des cases à unité                                 | hors de cette analyse (corrections fréquentes en septembre : °C ↔ K, arrondis) |
| ~~`questions/units/dimensional.ts`~~                                                               | **personne** (code mort)                                     | seconde analyse dimensionnelle                                                 |

### Écrire

| Écriture                                                            | Où                                      |
| ------------------------------------------------------------------- | --------------------------------------- |
| texte `${valeur} ${unité}` du moteur                                | Calcul (deviné par l'antislash), `/cas` |
| `toLatex` → `3~\unit{km}` → `displayUnitsInLatex` → `3~\mathrm{km}` | ubumark (énoncés, corrections)          |
| `forMathlive` → `\operatorname{\mathrm{km}}`                        | champ des cartes de l'atelier           |
| `unitWritingToLatex`, `unitWritingToTypst`                          | clavier « Unités », PDF                 |

### Trois causes, une seule racine

1. **Deux calculateurs du même calcul** : `evaluateWithUnits` (ancien, faux) et `tidy` (récent,
   juste). La correction de septembre a construit `{{eval}}` sur `tidy` et laissé l'ancien à
   Calcul (« à corriger à part »).
2. **L'affichage lit du texte au lieu de l'arbre** : le moteur jette l'unité de l'arbre, la vue
   la repêche dans le texte par une heuristique (l'antislash).
3. **Aucune règle de lecture pour l'écriture naturelle hors des cases à unité.**

La racine : **pas de contrat unique « une grandeur se lit, se calcule et s'écrit ainsi »** ; chaque
contexte a reconstruit son morceau, et chaque correction n'en répare qu'un.

---

## 3. Pourquoi ça revient — les traces

- 117 commits « unité / grandeur » depuis mai 2026 ; trois chantiers (`units-*`, `saisie-unites`,
  `grandeurs-eval`), chacun sur un chemin différent.
- Le défaut de Calcul était mesuré le 2026-09-27 (`grandeurs-eval-progress.md`) et laissé.
- `questions/units` : partiellement migré vers `mathAST/units` (« source of truth ») ; restent
  **morts**, joignables seulement par `index.ts` que personne n'importe (résolution des imports,
  2026-10-11) : `dimensional.ts` (608 l.), `hms.ts` (556), `tokenizer.ts` (415),
  `definitions.ts` (247), `index.ts` (210) — ~2 000 lignes, avec leurs tests.
- Le README de `mathAST/units` présente la perte du coefficient comme un style d'écriture.

---

## 4. La cible : un contrat unique

**Une grandeur se lit en arbre (nœud `unit`), se calcule par `tidy`/`normalize`, s'écrit depuis
l'arbre.** Seule la **lecture** dépend du contexte, avec une règle écrite par contexte :

| Contexte                          | Règle de lecture                                                                |
| --------------------------------- | ------------------------------------------------------------------------------- |
| Énoncés, `{{eval}}`, données      | stricte : `5[km]`, `5~\unit{km}` (inchangé — l'auteur doit être sans ambiguïté) |
| Case à unité (question)           | tout ce qui suit le nombre est l'unité (inchangé)                               |
| **Atelier** (Calcul, cartes, URL) | **écriture naturelle — règle à trancher (Q1)**, crochets toujours acceptés      |

Écrire : `toLatex` de l'arbre, puis la traduction d'affichage (`displayUnitsInLatex`) — la même
partout où l'on affiche (Calcul, cartes, énoncés). Aucune heuristique sur du texte.

---

## 5. Le plan, en lots indépendants

### Lot A — Calculer juste (aucune décision produit : des résultats faux à corriger)

- Calcul et `/cas` calculent les grandeurs par `tidy` (unité écrite d'abord), comme `{{eval}}` ;
  la réponse est un **arbre qui garde son unité**.
- `.convertir` reprend la logique de `;[unité]` (`valueIn`, exact) ; message en français.
- Erreurs de dimension en français (« On ne peut pas ajouter une longueur et une durée. ») ;
  températures : les règles affines de `tidy` (déjà spécifiées, §D.2 de `tidy-spec.md`).
- Valeur sans écriture décimale finie (`10[km]/3`) : fraction exacte en mode exact, et le bouton
  ≈ de #1086 (`≈ 3,3333 km`) ; en `.mode décimal`, la règle des 4 décimales (Q3).
- Oracle : la batterie de 26 cas + grandeurs nommées (`d/t`, `v*3[h]`), dans les deux sens.
- Retrait de `evaluateWithUnits` une fois Calcul passé (seul usage réel ; ailleurs, des
  commentaires).

### Lot B — Afficher depuis l'arbre

- `render.ts` : plus d'heuristique de l'antislash ; une réponse s'écrit depuis l'arbre, unités
  traduites par `displayUnitsInLatex`. Corrige « 5 » sans unité **et** « 1/3π ».
- Les grandeurs avec unité redeviennent compatibles avec le bouton ≈ (#1086).

### Lot C — Écrire naturellement (après la décision Q1)

- Un lecteur de l'atelier, appliqué au texte de Calcul, aux définitions de valeurs et aux cartes,
  qui produit `5[km]` avant le parseur ; message d'aide quand la lecture est ambiguë.
- Cartes : `mathModeSpace = '\,'` (comme les cases à unité) pour que l'espace tapée survive.
- L'exemple du champ de Calcul (`12 km + 300 m`) devient vrai.

### Lot D — Ménage et contrat écrit

- Suppression du code mort de `questions/units` (~2 000 lignes) et de leurs tests.
- `docs/systeme/grandeurs.md` : le contrat (lire, calculer, écrire, règles par contexte),
  avec en-tête `couvre:` ; README de `mathAST/units` corrigé ; ADR pour la règle d'écriture.

### Plus tard (hors de ce chantier)

- Cartes : clavier « Unités » (comme les cases à unité), action « Convertir » (aujourd'hui
  désactivée, « prochain lot »).
- Correction des cases à unité (`validator` + ComputeEngine) : un troisième calculateur ; à
  rapprocher de `normalize`, avec un oracle sur les vraies réponses d'élèves — chantier à part.

---

## 6. Décisions

> **Tranchées par David le 2026-10-11 (« je suis tes recos »)** : Q1 = **A** (« un nombre, une
> espace, une unité » ; collé ou `*` = produit ; aide ciblée pour `5km` ; une lettre déclarée
> variable n'est jamais une unité) ; Q2 = **unité écrite d'abord** ; Q3 = **4 décimales pour les
> grandeurs en `.mode décimal`, `.mode-unités` retirée** ; Q4 = **lots A et B, puis C, puis D**.

### Q1 — L'écriture naturelle dans l'atelier

Le fond du problème : **18 unités tiennent en une lettre** (m, g, t, q, L, l, s, h, j, a, K, N, J,
W, V, A, C, F) et presque toutes sont des lettres courantes de l'atelier (t curseur, a paramètre,
m pente, q raison, g et h fonctions, C constante d'intégration, F primitive, V volume). Le
dictionnaire ne peut pas trancher seul ; il faut une règle.

- **A — l'espace (reco)** : _un nombre, une espace, une unité_ = une grandeur (`5 km`, `5 m`,
  `90 km/h`, `2 h 30 min`) ; **collé ou avec `*`, c'est un produit** (`5m`, `2a+1`, `3t+2`).
  C'est la convention typographique officielle (SI : une espace entre le nombre et l'unité ; un
  coefficient collé à sa lettre) — une seule règle, sans état, qui enseigne la bonne écriture.
  Garde : une lettre **déclarée variable** (`f(t) = 3 t + 2`, `; t`) n'est jamais une unité.
  `5km` collé (fréquent) : lu produit, mais avec une aide ciblée « Pour 5 kilomètres, écris 5 km
  (avec une espace). ». Coût : `3 t + 2` écrit avec des espaces devient 3 tonnes + 2 → message
  « « 3 t » est lu 3 tonnes : pour 3 × t, écris 3t ».
- **B — collé ou espacé, la lecture qui a un sens l'emporte** : `5km` et `5 km` sont des grandeurs ;
  une lettre déjà nom d'objet reste l'objet ; si la lecture en grandeurs est incohérente
  (`3t + 2` : une masse plus un nombre), retour à l'algèbre. Plus permissif, mais plusieurs règles
  cachées, et des lectures silencieuses (`2a + 3a` → 5 ares, qui s'affiche presque comme 5a).
- **C — crochets seulement, plus un clavier « Unités »** : aucune ambiguïté, mais pas naturel —
  ce que tu ne veux pas.

### Q2 — L'unité du résultat dans Calcul

- **L'unité écrite d'abord (reco)**, comme `{{eval}}` : `1500 m` reste `1500 m`, `0,5 h` reste
  `0,5 h`, `7 mm × 5 cm` → `350 mm²` ; changer d'unité = `.convertir`.
- Ou l'unité scolaire adaptée (`tidy` par défaut) : `1500 m` → `1,5 km`, `0,5 h` → `30 min`.

### Q3 — `.mode décimal` et `.mode-unités`

- `.mode décimal` : la règle du bouton ≈ (4 décimales, `=` quand c'est exact) — décision déjà
  prise pour les nombres (« PR à part »), à étendre aux grandeurs (reco : oui, même PR).
- `.mode-unités` (first/si/best, commande de développeur sous `.aide dev`) : sans objet une fois
  Calcul sur `tidy` — reco : la retirer.

### Q4 — Ordre

Reco : **A et B d'abord** (des réponses fausses en production, sans décision produit), puis C
une fois Q1 tranchée, puis D. Le bug `1/3π` (mis de côté le 2026-10-11) est réglé par B.

---

## Annexe — la batterie (2026-10-11)

26 saisies, trois colonnes : moteur de Calcul (`WebReplEngine.execute`), `tidy` unité écrite,
`tidy` unités scolaires.

| Saisie                   | Calcul (aujourd'hui)                     | `tidy` écrite        | `tidy` scolaire |
| ------------------------ | ---------------------------------------- | -------------------- | --------------- |
| `5[km]`                  | 5 km                                     | 5 km                 | 5 km            |
| `12[km]+300[m]`          | 123/10 km                                | 12,3 km              | 12,3 km         |
| `10[km]/1[h]`            | 10 m/s ✗                                 | 10 km/h              | 10 km/h         |
| `120[km]/2[h]`           | 60 m/s ✗                                 | 60 km/h              | 60 km/h         |
| `7[mm]*5[mm]`            | 35 m² ✗                                  | 35 mm²               | 35 mm²          |
| `7[mm]*5[cm]`            | 350 m² ✗                                 | 350 mm²              | 3,5 cm²         |
| `3[h]+20[min]`           | 33333333333333333/10000000000000000 h ✗  | 200 min              | 200 min         |
| `3[h]/1[min]`            | 1500000000000000000/8333333333333333 1 ✗ | 180                  | 180             |
| `10[km]/2[m]`            | 5000 1 ✗                                 | 5000                 | 5000            |
| `(3[h]+20[min])*1[km/h]` | 3,33… m ✗                                | 10/3 km              | 10/3 km         |
| `90[km/h]*2[h]`          | 180 m ✗                                  | 180 km               | 180 km          |
| `5[m]+3[s]`              | erreur (anglais)                         | laissé tel quel      | laissé tel quel |
| `5[m]+3`                 | erreur (anglais)                         | laissé tel quel      | laissé tel quel |
| `(3[m])^2`               | 9 m²                                     | 9 m²                 | 9 m²            |
| `sqrt(9[m^2])`           | 3 m                                      | √(9 m²) (non réduit) | idem            |
| `30[°C]-20[°C]`          | 10 K                                     | 10 K                 | 10 K            |
| `20[°C]+5[K]`            | 25 °C                                    | 25 °C                | 25 °C           |
| `10[km]/3`               | 10/3 km                                  | 10/3 km              | 10/3 km         |
| `x[km]+500[m]`           | non calculé                              | x km + 0,5 km        | idem            |
| `1/2[m]`                 | 1/2 · 1/m (lu 1 ÷ (2 m))                 | 0,5 m⁻¹              | idem            |
| `5[€]*3`                 | 15 €                                     | 15 €                 | 15 €            |
| `100[g]/2[L]`            | 50 g/m³ ✗                                | 50 g/L               | 50 g/L          |
| `9.81[m/s^2]*2[kg]`      | 981/50 m·g/s² ✗                          | 19,62 m·kg/s²        | 19,62 N         |
| `0.5[h]`                 | 1/2 h                                    | 0,5 h                | 30 min          |
| `1500[m]`                | 1500 m                                   | 1500 m               | 1,5 km          |
| `2.5[km]*4`              | 10 km                                    | 10 km                | 10 km           |

À noter pour le lot A : `tidy` ne réduit pas `sqrt(9[m^2])` (Calcul le faisait), laisse
`5[m]+3[s]` sans erreur (l'erreur se décide à l'appelant, comme `{{eval}}`), et `1/2[m]` se lit
1 ÷ (2 m) dans les deux parseurs (`(1/2)[m]` pour ½ m) — à garder en tête pour la règle Q1.
