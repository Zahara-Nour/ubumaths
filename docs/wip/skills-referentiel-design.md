# Système de compétences UbuMaths — Design

**Date** : 2026-05-27
**Statut** : Design en cours — pas d'implémentation démarrée
**Phase** : 0 — Spécification

---

## Contexte et objectif

Avant d'enrichir les outils d'organisation élève (`/organisation/*`), on consolide d'abord les fondations pédagogiques d'UbuMaths. Étape 1 : un référentiel de compétences qui structure l'avancement de l'élève par rapport aux attendus du programme officiel français.

**Objectif côté élève** : que le dashboard permette à l'élève de répondre simplement à trois questions :

1. Où en suis-je dans les attendus ?
2. Que me reste-t-il à faire ?
3. Qu'est-ce que je dois remédier ?

**Inspiration** : Sacoche (logiciel libre Sésamath, source dans `extern/sacoche`). On reprend ses choix éprouvés (hiérarchie, fenêtre glissante, sources de saisies) en simplifiant pour l'élève (échelle visible 4-états, non commencé caché du dashboard, distinction remédier/renforcer).

**Décision structurante** : l'élève voit des **objectifs** (~15-25 par niveau scolaire, vocabulaire BO « attendus de fin d'année »), pas les compétences atomiques sous-jacentes. Le système fin existe pour la validation auto et la remédiation ciblée, mais reste caché par défaut.

---

## 1. Deux familles d'objectifs, vocabulaire fixé

Le programme distingue **deux familles complémentaires**, avec des **régimes d'évaluation distincts** :

- **Famille A — Connaissances et savoir-faire** : contenus disciplinaires (Nombres, Géométrie, Fonctions, etc.). Évaluées par des tâches techniques ciblées. Régime : **échelle descriptive 1-4 avec indicateurs**.
- **Famille B — Compétences mathématiques** : les **6 compétences transversales** (Chercher, Modéliser, Représenter, Raisonner, Calculer, Communiquer). Évaluées sur des **tâches à prise d'initiative** (problèmes ouverts, modélisation). Régime : **codage ternaire `+/–/∅` par tâche, consolidation par observable, règle conjonctive par compétence avec cœur d'excellence**.

La famille B suit le **cadre d'évaluation des 6 compétences mathématiques** (`docs/wip/referentiel/cadre_evaluation_six_competences_mathematiques.md`) — source canonique pour les observables, les règles de validation et les niveaux du socle.

### Hiérarchies

| Famille A                            | Famille B                                                               |
| ------------------------------------ | ----------------------------------------------------------------------- |
| Thème (BO) → Objectif → **Capacité** | Compétence mathématique → **Sous-dimension** (A/B/C/D) → **Observable** |

**Famille A** — 3 niveaux avec état à chaque niveau, calculs par agrégation.

**Famille B** — 3 niveaux pour la structuration, mais **un seul niveau a un état** : la compétence mathématique (calculée directement depuis les observables consolidés via la règle conjonctive). Les sous-dimensions A/B/C/D **n'ont pas d'état propre** ; elles servent uniquement de **regroupement structurel** (cohérence pédagogique de la grille, nommage des conditions dans les règles de validation).

Les sous-dimensions de la famille B sont **stables sur tout le collège** (6ᵉ + cycle 4 — pour l'instant unique référentiel partagé).

### Dictionnaire de noms fixé

| Concept                    | Famille A — Connaissances                | Famille B — Compétences math                                    | Code (EN)                                    | Visible élève       |
| -------------------------- | ---------------------------------------- | --------------------------------------------------------------- | -------------------------------------------- | ------------------- |
| Conteneur de + haut niveau | **Thème**                                | **Compétence mathématique**                                     | `theme` / `math_competence`                  | Oui                 |
| Conteneur intermédiaire    | **Objectif** (= attendu BO)              | **Sous-dimension** (codes A, B, C, D)                           | `objective` / `math_competence_subdimension` | Regroupement visuel |
| **Unité de saisie**        | **Capacité**                             | **Observable** (code Xn, ex. A1, B3, C2)                        | `skill` avec `skill_type`                    | Sur demande         |
| Codage par tâche           | succès/échec à un `target_level` 1–4     | **ternaire `+/–/∅`** (cf. section 3)                            | `skill_attempt`                              | Non                 |
| Méthode d'évaluation       | échelle descriptive 1–4 avec indicateurs | consolidation par observable + règle conjonctive par compétence | (cf. section 6)                              | —                   |

**Termes bannis** :

- « Compétence atomique » → remplacé par « capacité » (famille A) ou « observable » (famille B).
- « Compétence » seule, sans qualificatif, est ambigu — toujours préciser « compétence mathématique ».
- « Composante » → conservée uniquement comme référence historique.
- « Domaine » → on garde « thème ».
- **`is_contextual` (flag statique universel/contextuel)** → **supprimé**, remplacé par la **notion de périmètre par tâche** (cf. section 3 et plus bas).
- **« Sous-thème » avec état propre (modèle Option β-ter)** → **caduc** ; remplacé par « sous-dimension » (regroupement structurel sans état agrégé).

### La notion de **périmètre par tâche** (Famille B)

Le marquage statique `is_contextual` est abandonné. À la place, **chaque tâche** d'évaluation déclare son **périmètre** : la liste des observables qu'elle permet réellement d'observer. Cette déclaration est faite par l'enseignant **en amont** de la tâche.

- Un observable **dans le périmètre** d'une tâche peut être codé `+` ou `–`.
- Un observable **hors périmètre** est automatiquement `∅` pour cette tâche (l'occasion d'observation n'existait pas).

C'est un mécanisme **dynamique** : un même observable peut être dans le périmètre d'une tâche et hors périmètre d'une autre. Plus juste pédagogiquement que le marquage statique — un même observable « Convertit entre registres » peut être pertinent dans une tâche qui mêle plusieurs représentations, et hors champ dans une tâche à représentation unique.

### Quantités visées (collège, référentiel partagé 6ᵉ + cycle 4)

| Famille              | Niveau 1                 | Niveau 2                                                 | Niveau 3                                                         |
| -------------------- | ------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------- |
| A — Connaissances    | 4–6 thèmes               | 15–25 objectifs                                          | 3–6 capacités par objectif                                       |
| B — Compétences math | **6 compétences (fixe)** | **3–4 sous-dimensions par compétence (stables collège)** | **6–13 observables par compétence**, répartis en sous-dimensions |

**Famille B — totaux par compétence** (source : cadre canonique) :

| Compétence  | Sous-dimensions | Observables | Cœur d'excellence                                |
| ----------- | --------------- | ----------- | ------------------------------------------------ |
| Chercher    | A / B / C / D   | 13          | Réorientation                                    |
| Calculer    | A / B / C / D   | 13          | Contrôle du résultat + calcul littéral           |
| Raisonner   | A / B / C / D   | 8           | Cas général + outil logique + relecture critique |
| Communiquer | A / B / C       | 6           | Dimension dialogique + langage rigoureux         |
| Modéliser   | A / B / C       | 8           | Regard critique sur le modèle                    |
| Représenter | A / B / C / D   | 8           | Conversion entre registres                       |

### Vocabulaire UI élève (côte à côte)

Deux sections dans le dashboard, alimentées par les deux familles :

- **Mes objectifs** (Famille A). Vue détail → liste des **capacités** acquises / à travailler.
- **Mes compétences mathématiques** (Famille B). Vue détail → 4 niveaux du socle, **regroupés par sous-dimension A/B/C/D**, avec état consolidé de chaque observable (acquis / non acquis / hors champ).

L'échelle 1-4 (famille A) et les codes ternaires (famille B) ne sont jamais montrés comme une note à l'élève ; la vue détaillée présente l'état consolidé en langage clair.

---

## 2. États affichés à l'élève

Les 4 **visuels** sont les mêmes pour les deux familles ; le **vocabulaire** diffère, aligné sur le socle commun pour la famille B.

### Famille A — 4 états sur l'objectif

| Visuel | Famille A — Connaissances |
| ------ | ------------------------- |
| ◯      | Non commencé              |
| 🟠     | En cours                  |
| 🟢     | Maîtrisé                  |
| ✨     | Maîtrisé en profondeur    |

### Famille B — 4 niveaux du socle commun

| Visuel | Famille B — Compétences math (vocabulaire du socle) |
| ------ | --------------------------------------------------- |
| ◯      | **Insuffisante**                                    |
| 🟠     | **Fragile**                                         |
| 🟢     | **Satisfaisante**                                   |
| ✨     | **Très bonne maîtrise**                             |

Les 4 visuels (◯/🟠/🟢/✨) sont conservés des deux côtés du dashboard pour la cohérence d'UI. Le vocabulaire **Insuffisante / Fragile / Satisfaisante / Très bonne** est celui du socle commun (alignement sur le bulletin LSU).

### Badges transversaux — Famille A uniquement

| Badge              | Sens                                         | Condition (famille A)                                                   |
| ------------------ | -------------------------------------------- | ----------------------------------------------------------------------- |
| 🆘 **À remédier**  | L'élève bute sur un niveau pas encore validé | ≥ 1 capacité avec robustesse récente < 50 % au niveau pas encore validé |
| 🔁 **À renforcer** | Niveau déjà acquis qui faiblit récemment     | ≥ 1 capacité avec robustesse récente < 50 % au niveau déjà validé       |

**Famille B : pas de badges**. Le cadre d'évaluation des 6 compétences est volontairement **formatif** (il explique son verdict et désigne le geste à travailler) **sans alerte automatique de régression**. C'est le geste pédagogique du prof qui agit, pas un signal système.

### Règles d'affichage

- Le **Non commencé / Insuffisante est caché du dashboard d'entrée** (pas de mur de rouge décourageant). Visible uniquement dans la liste complète.
- L'échelle 1-4 (famille A) et les codes ternaires `+/–/∅` (famille B) **ne sont jamais montrés à l'élève comme une note brute**. La vue détaillée présente :
  - Famille A : capacités avec état acquis / à travailler
  - Famille B : observables avec état **acquis / non acquis / hors champ**, **regroupés par sous-dimension A/B/C/D**
- **Transparence** : pour la famille B, le système explicite **pourquoi** tel niveau est attribué (« tu es à Satisfaisante. Pour atteindre Très bonne maîtrise, il te manque… »). Le dispositif est formatif : il désigne le prochain objectif de travail.

---

## 3. Deux régimes d'évaluation distincts par famille

Famille A et famille B ont des **natures d'évaluation différentes**, ce qui se traduit par deux régimes :

### Famille A — Échelle descriptive 1-4 sur la capacité

Une capacité (savoir-faire de contenu) se maîtrise **graduellement**. On distingue 4 paliers de maîtrise avec un **indicateur** rédigé par niveau (l'indicateur dit ce qui permet de valider ce niveau).

- Objectif (A) → état calculé par agrégation
- Capacité (A) → niveau atteint 1-4 calculé depuis les saisies (`skill_attempts`)

Stockage : `level_indicators` (JSONB `{"1": "...", "2": "...", "3": "...", "4": "..."}`).

### Famille B — Cadre d'évaluation des 6 compétences mathématiques

Le régime famille B suit le **cadre canonique** (`cadre_evaluation_six_competences_mathematiques.md`). Cinq mécaniques s'enchaînent.

#### 3.1 Codage ternaire `+/–/∅` par tâche

Chaque observable est codé, pour une tâche donnée, sur trois valeurs :

| Code    | Sens                                               | Info sur… |
| ------- | -------------------------------------------------- | --------- |
| **`+`** | Réussi en autonomie                                | l'élève   |
| **`–`** | Non réussi alors que l'occasion était présente     | l'élève   |
| **`∅`** | Hors champ : la tâche ne permettait pas d'observer | la tâche  |

La distinction `–` vs `∅` est essentielle :

- `–` est une information sur l'**élève** (l'occasion était là, le geste n'a pas abouti)
- `∅` est une information sur la **tâche** (l'occasion n'existait pas)

Les confondre reviendrait à lire comme une faiblesse de l'élève ce qui n'est qu'un trou dans les données.

Le `+/–` code une **observation**, pas une perfection ponctuelle : une réussite obtenue par hasard ou entièrement guidée n'est pas un `+`, et une erreur isolée ne fait pas un `–` — c'est la **régularité sur plusieurs tâches** qui est jugée (voir 3.3 Consolidation).

**Stockage** : voir section 7 (`skill_attempts.code` enum `'plus' | 'minus'` pour famille B ; `∅` est implicite — pas de ligne stockée).

#### 3.2 Saisie par périmètre

La saisie est allégée par un principe simple :

1. **En amont de la tâche**, l'enseignant désigne les observables que la tâche permet réellement d'observer — son **périmètre**.
2. **En séance**, il coche uniquement les **réussites**.

Le reste se déduit :

- dans le périmètre, un observable non coché devient `–` ;
- hors périmètre, tout est `∅`.

On ne note donc que ce que l'on observe ; les deux types d'absence se reconstituent sans se confondre. La qualité du diagnostic se joue dans le **cadrage initial du périmètre** — c'est là que se décide ce que la tâche met réellement en jeu.

#### 3.3 Consolidation d'un observable

Avant d'appliquer une règle de niveau, on consolide chaque observable sur la durée. Sur toutes les tâches où il était dans le périmètre (les `∅` sont écartés), un observable devient **acquis** ssi :

```
≥ 2 tâches avec code = '+'   ET   nombre de '+' > nombre de '–'
```

Les deux conditions sont nécessaires ensemble :

- « **au moins deux `+`** » garantit la **régularité** (une réussite isolée peut tenir au hasard)
- « **plus de `+` que de `–`** » garantit la **dominance** (réussi deux fois mais échoué trois fois n'est pas acquis)

C'est ici que le `–` joue son rôle de **contrepoids** : il interdit de conclure à la maîtrise en ne regardant que les réussites. Toute la suite raisonne sur ces **statuts consolidés** (acquis / non acquis), jamais sur les coches brutes.

#### 3.4 Règle de validation conjonctive et hiérarchisée

Le passage des observables consolidés au niveau de maîtrise (4 niveaux du socle) obéit à une logique :

- **conjonctive** : chaque niveau exige que **toutes** ses conditions soient remplies (aucune accumulation sur une dimension ne compense l'absence d'un critère définissant)
- **hiérarchisée** : un niveau supérieur inclut les exigences des niveaux inférieurs

On teste **du haut vers le bas** et l'on retient le premier niveau dont toutes les conditions sont satisfaites — ce qui attribue à l'élève le niveau le plus élevé qu'il mérite.

Le détail des conditions est **propre à chaque compétence**. Pour chaque compétence, la **Très bonne maîtrise** est verrouillée par un **cœur d'excellence** — un critère qu'aucune autre réussite ne peut remplacer :

| Compétence  | Cœur d'excellence                                                                  |
| ----------- | ---------------------------------------------------------------------------------- |
| Chercher    | **Réorientation** (tester une autre piste quand bloqué)                            |
| Calculer    | **Contrôle du résultat** + entrée dans le calcul littéral                          |
| Raisonner   | **Raisonnement sur le cas général** + outil logique + relecture critique           |
| Communiquer | **Dimension dialogique** (reformuler/questionner + argumenter) + langage rigoureux |
| Modéliser   | **Regard critique sur le modèle** (validation, hypothèses/limites, ajustement)     |
| Représenter | **Conversion entre registres** (au sens de Duval) + coordination                   |

Les règles complètes par compétence (Insuffisante / Fragile / Satisfaisante / Très bonne) sont dans `docs/wip/referentiel/college-competences.md`.

#### 3.5 Garde-fous

Trois protections rendent l'automatisation **défendable** plutôt que trompeuse.

**Minimum de tâches**. Un niveau ne se valide pas sur une observation isolée : alerte en dessous de **2 tâches** ; une « Très bonne maîtrise » établie sur moins de **3 tâches** demande confirmation.

**Neutralité du `∅`**. Un observable hors périmètre **ne pénalise jamais** l'élève. Et si toute une sous-dimension reste en `∅`, c'est un signal sur la **tâche** (la grille proposée ne sollicite pas cette facette), pas sur l'élève — l'occasion d'observer cette facette n'existait pas.

**Transparence**. Le dispositif ne rend pas un verdict : il propose un niveau **en explicitant son raisonnement** (ce qui valide ce niveau, ce qui manque pour le niveau supérieur). C'est ce qui le rend **formatif** (il désigne le prochain geste à travailler). Le positionnement final reste celui de l'enseignant.

**Exemple — Famille A (capacité, échelle 1-4)** :

```
Capacité : « Isoler la variable dans ax + b = c »

  Niveau 1 — N'identifie pas l'opération à effectuer en premier.
  Niveau 2 — Identifie l'opération mais commet des erreurs de signe
             ou d'opération inverse.
  Niveau 3 — Isole correctement la variable pour des coefficients
             entiers relatifs simples.
  Niveau 4 — Isole correctement avec coefficients fractionnaires
             ou mise en équation issue d'un énoncé.
```

**Exemple — Famille B (observable, codage par tâche)** :

Pour l'observable C2 de Chercher (« Tester une autre piste quand bloqué ») sur 5 tâches successives :

```
Tâche T1 (dans le périmètre) : prof coche                → '+'
Tâche T2 (dans le périmètre) : prof ne coche pas         → '–'
Tâche T3 (hors périmètre)    : pas observable            → '∅'
Tâche T4 (dans le périmètre) : prof coche                → '+'
Tâche T5 (dans le périmètre) : prof coche                → '+'

Total : 3 '+', 1 '–', 1 '∅'
Consolidation : ≥ 2 '+' ✓ ET 3 '+' > 1 '–' ✓ → observable acquis
```

### Cumulativité (uniquement pour l'échelle famille A) : flag `is_progressive`

Concerne **uniquement les capacités (famille A)**. Pour les observables (famille B), la question ne se pose pas (binaire).

| `is_progressive` (famille A) | Sens                                                       | Conséquence sur le calcul                                                                  |
| ---------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `true` (défaut)              | Échelle progressive : niveau N inclut tous les niveaux < N | Une saisie niveau N compte automatiquement pour les niveaux ≤ N                            |
| `false` (exceptionnel)       | Échelle cloisonnée : chaque niveau distinct                | Saisie niveau N compte uniquement pour N ; niveau N validable seulement si N-1 déjà validé |

Le défaut est `true` (cas idéal). `false` réservé aux cas où l'échelle a été rédigée non progressive.

---

## 4. Modèle de saisie

### Principe fondamental : une saisie est une preuve **positive uniquement**

Une `skill_attempts` avec `success = true` est la preuve que l'élève a réussi à un niveau cible donné. Un échec n'enregistre **aucune saisie négative** et ne fait pas baisser le niveau atteint.

C'est la correction d'une logique punitive initiale : un échec à niveau 3 ne prouve rien sur les niveaux inférieurs (peut-être que l'élève ne sait pas faire le niveau 1 non plus). On accumule des moments de réussite, pas des sanctions.

### Tentative ratée : stockée pour analytics et alerte robustesse

L'échec est **quand même stocké** comme `skill_attempts` avec `success = false`. Il ne contribue pas au calcul du niveau atteint mais :

- alimente la **robustesse récente** (% de succès)
- déclenche les badges 🆘 À remédier / 🔁 À renforcer

Une seule table, deux usages selon `success`. Pas de duplication conceptuelle.

### Aide du tuteur : marqueur, pas pénalité

Un attempt avec `with_help = true` (l'élève a sollicité le tuteur sur cette tentative) compte comme **réussite au niveau visé**, sans pénalité sur le niveau atteint.

**Garde-fou activé** : pour passer en niveau **stable**, il faut au moins 1 attempt `with_help = false` parmi les K récentes. Sinon le niveau reste **provisoire**.

### Sources de saisies

| Source         | Comment                                                   | Contribue au calcul ?                             |
| -------------- | --------------------------------------------------------- | ------------------------------------------------- |
| `auto`         | Question répondue (success déterminé par validation auto) | Oui                                               |
| `teacher`      | Saisie manuelle prof après éval ou observation            | Oui — pondération à trancher (cf. Q1)             |
| `student_self` | Auto-évaluation élève avant un DS                         | **Non** — affichée en parallèle, non contributive |

---

## 5. Calibration des Questions

Chaque Question liée à une capacité ou une composante reçoit un **niveau cible** (`target_level` ∈ 1..4) dans la junction `question_skills`.

**Le niveau cible est déterminé par les indicateurs de l'échelle descriptive**, pas par une notion vague de difficulté. Le concepteur de la Question lit les indicateurs des niveaux 1, 2, 3, 4 et choisit le niveau dont l'**indicateur correspond à ce que la Question évalue effectivement**.

**Exemple** sur la capacité « Isoler la variable dans `ax + b = c` » (indicateurs de la section 3) :

| Question                                                                         | Indicateur correspondant                             | `target_level` |
| -------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------- |
| « Résoudre `3x + 7 = 22` »                                                       | Niveau 3 — « coefficients entiers relatifs simples » | 3              |
| « Résoudre `(1/2)x − 4 = 1` »                                                    | Niveau 4 — « coefficients fractionnaires »           | 4              |
| « Pierre achète 3 stylos à `x` € et un cahier à 5 €. Il paie 11 €. Trouve `x`. » | Niveau 4 — « mise en équation issue d'un énoncé »    | 4              |

Le concepteur fait le **mapping indicateur → question** : si la question évalue exactement ce que décrit l'indicateur d'un niveau, c'est ce niveau qu'on cible. Pas plus, pas moins. La difficulté ressentie par l'élève est une conséquence de cette correspondance, pas son critère de calibration.

**Corollaire** : la qualité de la calibration dépend de la qualité des indicateurs. Un indicateur flou ou redondant avec ses voisins rend la calibration ambiguë. C'est pourquoi l'effort de rédaction des `level_indicators` est central.

Validation auto :

- **Succès** (avec ou sans aide) → `skill_attempts (success=true, target_level=N, with_help=?)`
- **Échec** → `skill_attempts (success=false, target_level=N)` — stocké mais ne valide aucun niveau

Une Question peut viser **plusieurs capacités et/ou composantes simultanément** (junction M2M avec `target_level` propre à chaque lien). Une question d'une tâche à prise d'initiative en famille A mobilise typiquement aussi des composantes de famille B (par exemple « Calculer » + « Raisonner »).

---

## 6. Algorithme de calcul

### 6.1 Niveau atteint d'une capacité (Famille A, `skill_type='progressive'`)

**Paramètres globaux** (constantes du système) :

- Fenêtre de récence : **60 jours**
- Seuil de stabilité K : **3 attempts success**
- Garde-fou « sans aide » : **actif** (≥ 1 attempt `with_help=false` dans les K)

**Cas `is_progressive = true`** :

```
niveau_atteint_stable = max N ∈ {1..4} tel que :
  - ≥ 3 attempts (success=true, ≤ 60 jours) avec target_level ≥ N
  - dont au moins 1 avec with_help=false

niveau_atteint_provisoire = max N tel que ≥ 1 attempt récent (success=true) avec target_level ≥ N
```

**Cas `is_progressive = false`** :

```
Pour chaque N de 1 à 4 :
  niveau N "validé" ssi :
    - ≥ 3 attempts (success=true, ≤ 60 jours) avec target_level = N (exact)
    - dont au moins 1 avec with_help=false
    - ET niveau N-1 validé (pour N ≥ 2)

niveau_atteint_stable = plus grand N validé
```

**Décay** : si aucune saisie récente (≤ 60 jours), niveau passe en « à confirmer » (affichage atténué). Pas d'effacement.

### 6.1bis Consolidation d'un observable (Famille B, `skill_type='observable'`)

Le cadre famille B abandonne la distinction `is_contextual` statique et le calcul par sous-thème (Options β / β-ter caducs). À la place :

**Étape 1 — Codage par tâche** (cf. section 3.1) :

- `+` : observable réussi en autonomie dans une tâche donnée
- `–` : non réussi alors que l'occasion était présente (observable dans le périmètre de la tâche)
- `∅` : observable hors du périmètre déclaré de la tâche (pas de stockage)

**Étape 2 — Consolidation** : on agrège toutes les saisies `+/–` (les `∅` sont écartés par construction) :

```
Pour un observable, sur l'ensemble des tâches où il était dans le périmètre :

  count_plus  = nombre de saisies avec code = '+'
  count_minus = nombre de saisies avec code = '–'

  observable_acquis = (count_plus ≥ 2) ET (count_plus > count_minus)

  observable_non_acquis = sinon
```

**Pas de fenêtre temporelle**, pas de critère de diversité, pas de garde-fou « sans aide ». Le prof gère la pertinence des tâches via le périmètre déclaré.

`with_help` reste stocké (utile analytics + carnet d'erreurs) mais n'intervient pas dans la consolidation.

### 6.1ter Évaluation d'une compétence mathématique (Famille B)

Plus d'agrégation par sous-thème (caduc). L'évaluation va **directement** des observables consolidés au niveau de la compétence, via la **règle conjonctive et hiérarchisée** propre à chaque compétence.

**Schéma général** (instancié par compétence dans `college-competences.md`) :

```
ÉTAT_COMPÉTENCE :
  on teste séquentiellement du haut vers le bas

  Très bonne maîtrise (✨) :
    toutes les conditions de Satisfaisante remplies
    ET
    cœur d'excellence acquis (critère défini par compétence)
    ET
    conditions supplémentaires nommées par la règle (par observable code)

  Satisfaisante (🟢) :
    conjonction d'observables nommés acquis
    (typiquement : 1 ou 2 obs identitaires + couverture sur sous-dimension)

  Fragile (🟠) :
    Satisfaisante non atteint
    ET
    ≥ 1 observable d'amorçage acquis (variable selon compétence)

  Insuffisante (◯) :
    niveau résiduel — aucune des conditions ci-dessus
```

**Exemple — Chercher** (extrait `college-competences.md`) :

```
Très bonne maîtrise :
  conditions Satisfaisante remplies
  ET C2 acquis (réoriente : teste une autre piste quand bloqué)  ← cœur d'excellence
  ET C1 acquis (organise sa démarche)
  ET au moins 1 observable de D acquis

Satisfaisante :
  B1 acquis (premier essai sans aide)
  ET au moins 2 des 3 observables de A acquis (appropriation solide)
  ET au moins 1 observable parmi B2-B5 acquis (exploration effective)

Fragile :
  Satisfaisante non atteint
  ET au moins 1 observable de A acquis
  ET au moins 1 observable de B acquis

Insuffisante : sinon.
```

Les 6 règles complètes sont consignées dans `college-competences.md`. Chaque règle nomme les observables par leur **code (A1, B2, C3, D2, …)** issu de la grille de codage enseignant du cadre canonique.

**Aucune accumulation ne compense un cœur d'excellence absent.** Un élève parfait sur A et B mais qui ne réoriente jamais (C2 non acquis) plafonne à Satisfaisante. C'est juste : la réorientation _est_ le cœur de Chercher.

### 6.2 Robustesse récente (driver des alertes remédier/renforcer)

**Famille A (`skill_type='progressive'`)** :

```
niveau_visé = niveau_atteint_stable + 1   (ou 4 si déjà au max)

attempts_au_niveau_visé = attempts récents (≤ 60j) avec target_level = niveau_visé
total = compte(attempts_au_niveau_visé)
success_count = compte(success=true parmi total)

robustesse = success_count / total   (si total ≥ 3, sinon undefined)

Si total ≥ 3 ET robustesse < 50 % :
  Si niveau_visé > niveau_atteint_stable :
    → capacité marquée "à remédier"
  Sinon (déjà au sommet) :
    → capacité marquée "à renforcer"
```

**Famille B (`skill_type='observable'`)** : **pas de calcul de robustesse**, **pas de badges À remédier / À renforcer**.

Décision design : le cadre famille B est volontairement formatif (il explicite son verdict et désigne le geste à travailler), sans alerte automatique de régression. C'est le geste pédagogique du prof qui agit, pas un signal système. Les saisies `–` participent à la consolidation (contrepoids du `+`) mais ne déclenchent aucune alerte indépendante.

### 6.3 État d'un objectif (Famille A)

Inchangé.

```
Sur les capacités du périmètre de l'objectif :

  - aucune saisie sur aucune capacité → ◯ Non commencé
  - ≥ 80 % capacités avec niveau_atteint_stable ≥ 4 → ✨ Maîtrisé en profondeur
  - ≥ 80 % capacités avec niveau_atteint_stable ≥ 3 → 🟢 Maîtrisé
  - sinon avec au moins une saisie → 🟠 En cours
```

Badges transversaux famille A : voir 6.2. Famille B : pas d'agrégation par objectif, pas de badges — l'évaluation de la compétence se fait directement par règle conjonctive (6.1ter).

### 6.4 Garde-fous globaux famille B

**Minimum de tâches** :

- ≥ 2 tâches dans le périmètre d'un observable pour qu'il puisse devenir acquis (sinon : non acquis par défaut)
- Pour attribuer **Très bonne maîtrise** à une compétence : ≥ 3 tâches au total dans le périmètre (sinon : confirmation manuelle prof requise, affichage du niveau en pointillé)

**Neutralité du `∅`** : un observable hors périmètre ne pénalise jamais l'élève. Si toute une sous-dimension reste en `∅` sur les tâches récentes, c'est un signal sur le **choix des tâches** par le prof (la sous-dimension n'a pas eu d'occasion d'émerger), pas sur l'élève.

**Transparence du verdict** : pour la famille B, le système retourne le niveau **plus** l'explication :

- quels observables ont validé le niveau (« B1 acquis : 4 `+` sur 5 tâches »)
- ce qui manque pour le niveau supérieur (« pour atteindre Très bonne, il te manque C2 — réorienter quand tu es bloqué »)

---

## 7. Schéma DB préliminaire

Nommage : **anglais**, cohérent avec le codebase (`chapters`, `worksheets`, `class_journal_entries`, `kanban_*`, etc.).

**Option de design retenue** : **Option 3 hybride** — les capacités (A) et les observables (B) partagent la même table `skills`. La distinction se fait par la clé étrangère (`objective_id` pour A vs `subtheme_id` pour B).

```sql
-- ============================================================
-- FAMILLE A — Connaissances et savoir-faire
-- ============================================================

skill_themes (
  id                uuid pk,
  niveau_scolaire   text not null,        -- '6e', '5e', ..., 'terminale-spe'
  name              text not null,
  display_order     int not null,
  bo_reference      text                   -- ex: "BO cycle 3, thème Nombres et calculs"
)

skill_objectives (
  id                uuid pk,
  theme_id          uuid fk → skill_themes(id),
  name              text not null,
  description       text,
  display_order     int not null
)

-- ============================================================
-- FAMILLE B — Compétences mathématiques (6, partagées tous niveaux)
-- ============================================================

math_competences (
  id                  uuid pk,
  code                text unique not null,    -- 'chercher' | 'modeliser' | 'representer' | 'raisonner' | 'calculer' | 'communiquer'
  name                text not null,           -- 'Chercher', 'Modéliser', ...
  description         text,                    -- vocabulaire BO / IGÉSR
  gloss_for_student   text not null,           -- glose pédagogique visible élève (ex: « essayer des pistes, persévérer »)
  display_order       int not null
  -- pas de niveau_scolaire : ces 6 sont stables tous niveaux
)

math_competence_subdimensions (
  id                  uuid pk,
  math_competence_id  uuid fk → math_competences(id),
  letter              char(1) not null,         -- 'A' | 'B' | 'C' | 'D' (cadre canonique)
  name                text not null,            -- ex: 'S\'approprier le problème', 'Mathématiser la situation'
  description         text,
  display_order       int not null,
  UNIQUE (math_competence_id, letter)
  -- pas de niveau_scolaire : sous-dimensions stables sur tout le collège
  -- les sous-dimensions n'ont PAS d'état propre — elles servent au regroupement
  -- structurel et au nommage des conditions des règles de validation
)

-- ============================================================
-- UNITÉ DE SAISIE COMMUNE (capacité OU observable)
-- ============================================================

skills (
  id                  uuid pk,
  -- Exactement UNE des deux FK suivantes est non-null :
  objective_id        uuid fk → skill_objectives(id) nullable,                  -- famille A → capacité
  subdimension_id     uuid fk → math_competence_subdimensions(id) nullable,     -- famille B → observable
  niveau_scolaire     text nullable,        -- famille A : null (hérité du thème) ; famille B : 'college' pour V1
  observable_code     text nullable,        -- famille B uniquement : 'A1', 'B3', 'C2', 'D2' (cadre canonique)
  name                text not null,        -- A : nom court de la capacité ; B : énoncé côté élève (« Je teste plusieurs pistes »)
  teacher_grid_text   text nullable,        -- famille B : reformulation enseignant (grille de codage)
  skill_type          text not null check (skill_type in ('progressive', 'observable')),
  is_progressive      boolean nullable,     -- famille A uniquement
  level_indicators    jsonb nullable,       -- famille A uniquement
  display_order       int not null,
  CONSTRAINT chk_skill_family CHECK (
    (objective_id IS NOT NULL AND subdimension_id IS NULL AND skill_type = 'progressive')
    OR (objective_id IS NULL AND subdimension_id IS NOT NULL AND skill_type = 'observable')
  ),
  CONSTRAINT chk_skill_a_indicators CHECK (
    skill_type = 'observable'
    OR (is_progressive IS NOT NULL AND level_indicators IS NOT NULL)
  ),
  CONSTRAINT chk_skill_b_code CHECK (
    skill_type = 'progressive' OR observable_code IS NOT NULL
  )
)

-- Le flag is_contextual a été retiré : la pertinence est désormais déclarée
-- par tâche via evaluation_task_perimeter.

-- ============================================================
-- TÂCHES D'ÉVALUATION (famille B uniquement)
-- ============================================================
-- Une "tâche d'évaluation" est tout contexte d'observation des compétences
-- mathématiques : un problème ouvert, un DM, un travail de groupe, etc.
-- Elle peut être liée à un assessment / exercise existant ou être ad-hoc.

evaluation_tasks (
  id              uuid pk,
  teacher_id      uuid fk → profiles(id),
  class_id        uuid fk nullable,
  niveau_scolaire text not null,
  name            text not null,
  description     text,
  -- Lien optionnel à une entité existante du contenu
  source_type     text nullable check (source_type in ('assessment', 'exercise', 'worksheet', 'ad_hoc')),
  source_ref      uuid nullable,
  task_date       date,
  created_at      timestamptz default now()
)

-- Périmètre déclaré par le prof : quels observables cette tâche permet d'observer
evaluation_task_perimeter (
  task_id  uuid fk → evaluation_tasks(id) ON DELETE CASCADE,
  skill_id uuid fk → skills(id),  -- doit être skill_type='observable'
  PRIMARY KEY (task_id, skill_id)
)

-- ============================================================
-- Junctions vers le contenu existant (famille A)
-- ============================================================

chapter_objectives        (chapter_id, objective_id)                          -- M2M
question_skills           (question_id, skill_id, target_level int 1-4)      -- famille A
assessment_objectives     (assessment_id, objective_id)                       -- M2M
exercise_objectives       (exercise_id, objective_id)                         -- M2M

-- ============================================================
-- Saisies — modèle dual famille A / famille B
-- ============================================================

skill_attempts (
  id              uuid pk,
  student_id      uuid fk,
  skill_id        uuid fk → skills(id),
  -- famille A : target_level + success
  target_level    int (1..4) nullable,
  success         boolean nullable,
  -- famille B : code ternaire (+/-) et lien à la tâche d'évaluation (∅ = absence de ligne)
  code            text nullable check (code in ('plus', 'minus')),
  task_id         uuid fk → evaluation_tasks(id) nullable,
  -- communs
  source          text not null,                -- 'auto' | 'teacher' | 'student_self'
  source_ref      uuid,
  with_help       boolean not null default false,
  phase_blocage   text nullable,
  created_at      timestamptz default now(),
  CONSTRAINT chk_attempt_family CHECK (
    -- Famille A : success + target_level renseignés, code et task_id null
    (success IS NOT NULL AND target_level IS NOT NULL AND code IS NULL AND task_id IS NULL)
    OR
    -- Famille B : code + task_id renseignés, success et target_level null
    (success IS NULL AND target_level IS NULL AND code IS NOT NULL AND task_id IS NOT NULL)
  )
)

-- ============================================================
-- Caches (recalculés par trigger)
-- ============================================================

-- Famille A : niveau atteint par capacité
student_skill_state_a (
  student_id                  uuid,
  skill_id                    uuid,
  level_reached_stable        int (1..4) null,
  level_reached_provisional   int (1..4) null,
  recent_success_rate         float,
  needs_remediation           boolean,
  needs_reinforcement         boolean,
  last_attempt_at             timestamptz,
  PRIMARY KEY (student_id, skill_id)
)

-- Famille B : consolidation par observable
student_observable_state (
  student_id     uuid,
  skill_id       uuid,  -- observable
  count_plus     int not null default 0,
  count_minus    int not null default 0,
  is_acquis      boolean not null default false,  -- (count_plus ≥ 2) AND (count_plus > count_minus)
  last_attempt_at timestamptz,
  PRIMARY KEY (student_id, skill_id)
)

-- Famille B : niveau de la compétence (Insuffisante/Fragile/Satisfaisante/Très bonne)
student_competence_level (
  student_id           uuid,
  math_competence_id   uuid,
  niveau               text not null check (niveau in ('insuffisante', 'fragile', 'satisfaisante', 'tres_bonne')),
  validated_observables jsonb,  -- liste des observable_codes acquis
  missing_for_next      jsonb,  -- liste des observable_codes manquants pour le niveau supérieur (transparence)
  task_count            int,    -- nombre de tâches dans le périmètre (garde-fou minimum)
  last_recalc_at        timestamptz,
  PRIMARY KEY (student_id, math_competence_id)
)
```

**Hypothèses** :

- Trigger PL/pgSQL sur `INSERT INTO skill_attempts` recalcule la ligne de cache appropriée (`student_skill_state_a` pour famille A, `student_observable_state` puis `student_competence_level` pour famille B).
- La règle de validation famille B (conjonctive par compétence) est codée en **fonction PL/pgSQL** ou en TypeScript côté serveur ; elle prend en entrée la liste des observable_codes acquis et retourne (niveau, missing_for_next).
- RLS : élève voit ses propres données ; prof voit ses élèves selon `class_members`.
- Les 6 `math_competences` sont seedées une fois ; les `math_competence_subdimensions` (≈ 22 lignes : 4 ou 3 par compétence) sont seedées une fois. Les `skills` (observables) sont seedés depuis `college-competences.md`.

**Caduc** (supprimé du schéma) :

- `skills.is_contextual` (remplacé par périmètre dynamique par tâche)
- `math_competence_subthemes` (renommée en `math_competence_subdimensions`, sans état)
- `assessment_math_competences` / `exercise_math_competences` (remplacées par `evaluation_tasks` qui peut référencer un assessment via `source_type`)
- `student_skill_state.level_reached_*` pour famille B (caduc — pas de stable/provisoire en B)

---

## 8. UI élève — éléments actés (mockups dans l'historique de conversation)

### Dashboard d'entrée — deux sections côte à côte

```
┌───────────────────────────┐  ┌───────────────────────────┐
│ Mes objectifs             │  │ Mes compétences math.     │
│ (Famille A — Connaissances)│  │ (Famille B — les 6)       │
├───────────────────────────┤  ├───────────────────────────┤
│ ✨ 2  🟢 8  🟠 7          │  │ ✨ 1  🟢 3  🟠 2          │
│ ████████░░░ 10/27        │  │ ████░░░ 4/6              │
│ 🔥 À remédier (3)         │  │ 🔥 À remédier (1)         │
│ 🎯 À préparer DS du 12/06 │  │                           │
└───────────────────────────┘  └───────────────────────────┘
```

Sur petit écran : empilées verticalement (A au-dessus, B en-dessous), même rendu interne.

### Vue « Tous mes objectifs » (Famille A)

- Liste groupée par thème BO.
- Filtre : Tous / En cours / Maîtrisés.
- Les acquis (✨, 🟢) remontent visuellement ; les non commencés en bas, texte gris clair.

### Vue « Mes compétences mathématiques » (Famille B)

- Liste des 6 compétences (Chercher, Modéliser, …) en pleine largeur.
- **Chaque compétence est affichée avec sa glose pédagogique** à côté du nom officiel et du niveau du socle. Exemple :

```
┌────────────────────────────────────────────────────────────────┐
│ Mes compétences mathématiques — Collège                        │
├────────────────────────────────────────────────────────────────┤
│  ✨  Calculer       Très bonne maîtrise   calculer juste, vérifier
│  🟢  Communiquer    Satisfaisante         expliquer ma démarche
│  🟢  Raisonner      Satisfaisante         justifier mes affirmations
│  🟠  Représenter    Fragile               schémas, tableaux, figures
│  🟠  Chercher       Fragile               essayer des pistes, persévérer
│  ◯   Modéliser      Insuffisante          traduire en maths
└────────────────────────────────────────────────────────────────┘
```

- Stockage de la glose : champ `math_competences.gloss_for_student` (cf. schéma DB section 7).
- Comme il n'y en a que 6, pas de filtre ni de regroupement nécessaire.

### Outil de diagnostic post-erreur — les 4 phases (BO 2026)

Le **nouveau programme cycle 3 (BO 2026)** introduit un cadre de résolution de problèmes en **4 phases + Régulation** :

1. **Comprendre** — saisir l'énoncé et la question
2. **Modéliser** — identifier le(s) modèle(s) mathématique(s)
3. **Calculer** — effectuer les calculs
4. **Répondre** — formuler la solution en contexte
5. **Régulation** (transversale) — contrôler la vraisemblance

**Ce cadre ne remplace pas** les 6 compétences mathématiques (couverture plus étroite, limitée à la résolution de problèmes). Il sert comme **outil de diagnostic post-erreur** :

```
Quand l'élève bute sur un exercice ou signale une difficulté :

  À quelle phase tu as bloqué ?
  [Comprendre] [Modéliser] [Calculer] [Répondre]
```

Stockage : champ `skill_attempts.phase_blocage` (enum nullable). Alimente le carnet d'erreurs et les suggestions de remédiation.

### Vue détaillée d'un objectif (Famille A)

- Liste des **capacités** de l'objectif, séparées en « Ce que tu sais faire » / « Ce qu'il reste ».
- Ressources liées (chapitre, fiches).
- 3 boutons d'action : `[Pratiquer]`, `[Réviser N cartes SRS]`, `[Demander au tuteur]`.

### Vue détaillée d'une compétence mathématique (Famille B)

- Niveau du socle en gros (Insuffisante / Fragile / Satisfaisante / Très bonne) avec le visuel ◯/🟠/🟢/✨.
- **Explication transparente du verdict** : ce qui valide ce niveau, ce qui manque pour le niveau supérieur (cœur d'excellence, observables encore non acquis).
- Liste des observables **regroupés par sous-dimension** A/B/C/D, avec état consolidé (acquis / non acquis / hors champ récent).
- Pas de chapitre rattaché (compétences transversales) — au lieu : liste des tâches d'évaluation récentes du périmètre.
- Mêmes 3 boutons d'action.

```
┌────────────────────────────────────────────────────────────────┐
│ ← Chercher — Fragile  🟠                                       │
├────────────────────────────────────────────────────────────────┤
│ Tu es à Fragile.                                               │
│ Pour atteindre Satisfaisante, il te manque :                   │
│   • B1 — Produire un premier essai sans aide                   │
│   • Au moins une exploration parmi B2-B5                       │
│                                                                │
│ A — S'approprier le problème                                   │
│   ✓ A1 Reformuler                  ✗ A2 Trier informations     │
│   ✓ A3 Représentation pour comprendre                          │
│                                                                │
│ B — S'engager et explorer                                      │
│   ✗ B1 Premier essai sans aide     ✗ B2 Cas simples            │
│   ✗ B3 Conjecture                  ⊝ B4 (hors champ récent)    │
│   ⊝ B5 (hors champ récent)                                     │
│                                                                │
│ C — Conduire et réorienter                                     │
│   ✗ C1                             ✗ C2 (cœur d'excellence)    │
│                                                                │
│ D — Mobiliser des ressources                                   │
│   ✗ D1   ✗ D2   ✗ D3                                           │
└────────────────────────────────────────────────────────────────┘
```

---

## 9. Audit de l'existant (synthèse)

3 agents d'exploration ont audité l'app le 2026-05-27. Constats utiles pour la suite :

- **Aucun système de compétence existant** — `chapters.displayOrder` est la seule structure.
- **Liens Ubumark `[[type:uuid|label]]`** parsés (cf. `src/lib/ubumark/types/ast.ts:159-188`) mais **non résolus** — types supportés : `chapter | document | exercise | assessment`. À étendre avec `skill` / `objective`.
- **SRS FSRS-6** existant (`src/lib/srs/`) **non alimenté** par les questions ratées des assessments. Boucle à fermer ultérieurement.
- **ChapterProgressIndicator** agrège 60 % checklist + 40 % quiz. Pas de notion de compétence.
- **`/reports`** = « Mes signalements de bugs », pas des stats (vérifié dans `src/routes/(protected)/dashboard/student/reports/+page.svelte`).
- **Mode examen avec timer** existe via `TestModeDialog` ("Course aux nombres").
- **Streaks** : connexion quotidienne uniquement, single counter dans `student_buddies`.
- **3 silos d'assignment** se chevauchent : un exercice peut atteindre l'élève par `exercise_assignments`, par `worksheet_assignments`, ou indirectement par un assessment. Pas de déduplication côté élève.
- **Cahier de texte** : `class_journal_entries.lesson_content` et `homework_content` en Ubumark, mais **aucun lien typé** vers les ressources (juste du texte plat tant que les liens internes ne sont pas résolus).

---

## 10. Décisions actées (récapitulatif)

| #           | Sujet                                                                                                | Choix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1           | Vocabulaire UI élève                                                                                 | « **Objectifs** »                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2           | États visibles                                                                                       | 4 : non commencé / 🟠 / 🟢 / ✨                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 3           | Visuel non commencé                                                                                  | ◯ contour gris, **caché du dashboard** principal                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 4           | Visuel ✨                                                                                            | pastille verte + halo doré (effet spécial)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 5           | Hiérarchie famille A                                                                                 | 3 : thème → objectif → **capacité**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 6           | Hiérarchie famille B                                                                                 | 2 : compétence mathématique → **composante**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 7           | Échelle descriptive                                                                                  | sur la **capacité** (A) / **composante** (B)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 8           | Visibilité capacités/composantes                                                                     | sur demande (vue détaillée)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 9           | Saisie                                                                                               | preuve **positive** uniquement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 10          | Échec                                                                                                | stocké pour analytics, ne pénalise pas le niveau                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 11          | Aide tuteur                                                                                          | marqueur sans pénalité                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 12          | Garde-fou « sans aide »                                                                              | **actif** : ≥ 1 attempt sans aide dans les K récentes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 13          | Cumulativité                                                                                         | flag `is_progressive` par capacité/composante, défaut `true`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 14          | Seuil de stabilité K                                                                                 | **3** attempts success                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 15          | Fenêtre de récence                                                                                   | **60 jours**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 16          | Source `student_self`                                                                                | **ne contribue pas** au calcul officiel                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 17          | Distinction remédier/renforcer                                                                       | 🆘 (niveau non validé) vs 🔁 (niveau validé qui faiblit)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 18          | Robustesse                                                                                           | < 50 % sur les 5 dernières au niveau visé, min 3 tentatives                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 19          | Seuils agrégation (🟢 / ✨)                                                                          | ≥ 80 % capacités/composantes à niveau ≥ 3 / ≥ 4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 20          | Nommage tables                                                                                       | **anglais** (cohérent codebase)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 21          | Table unique tentatives                                                                              | `skill_attempts` (success bool, pas de duplication)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 22          | Cible des Questions                                                                                  | `target_level` (1-4) dans `question_skills`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 23          | **Deux familles d'objectifs**                                                                        | A (connaissances/savoir-faire) + B (6 compétences math), côte à côte                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 24          | **Schéma DB option 3**                                                                               | `skills` partagé entre A et B (FK `objective_id` ou `math_competence_id` mutex)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 25          | **Les 6 compétences math**                                                                           | stables tous niveaux ; composantes calibrées par niveau scolaire                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 26          | Mapping socle commun                                                                                 | **V2** (hors V1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 27          | UI dashboard                                                                                         | **deux sections côte à côte** (objectifs + compétences math)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 28          | Vocabulaire fixé                                                                                     | « capacité » (A) / « composante » (B), « indicateur » (échelle), « thème »/« objectif »/« compétence math » pour les conteneurs. « Compétence atomique » et « compétence » sans qualificatif sont **bannis**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 29          | **Glose pédagogique** par compétence math                                                            | champ `gloss_for_student` sur `math_competences`. Visible élève à côté du nom officiel BO. Une ligne, actionnable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 30          | **4 phases de résolution** (Comprendre/Modéliser/Calculer/Répondre + Régulation)                     | introduites par le **BO 2026** ; utilisées comme **outil de diagnostic post-erreur**, pas comme grille principale. Stockées dans `skill_attempts.phase_blocage` (nullable). Alimentent le carnet d'erreurs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 31          | **Famille B = observables binaires** (pas d'échelle 1-4)                                             | Pivot vers le cadre **IGÉSR mai 2023** (description / ressources / observables). Une compétence math = 6-10 observables binaires à la 1ʳᵉ personne (« Je teste plusieurs pistes »). Validation : ≥ 2 observations positives en 60j dont 1 sans aide. Famille A garde l'échelle 1-4 avec indicateurs (régime adapté aux savoirs gradables).                                                                                                                                                                                                                                                                                                                                                                               |
| 32          | **Champ `skill_type`** sur `skills`                                                                  | `'progressive'` (famille A) vs `'observable'` (famille B). Détermine quel régime de calcul s'applique. `level_indicators` et `is_progressive` nullables (non utilisés en famille B).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 33          | **Composantes BO 2020 archivées**                                                                    | Le tableau « Compétences travaillées » de 2020 sert de **référence pour rédiger les observables** mais n'est plus l'unité d'évaluation. Conservées en annexe des fichiers de référentiel (`<niveau>-competences.md`) pour traçabilité.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 34          | **Hiérarchie famille B à 3 niveaux**                                                                 | Compétence math → **Sous-thème** → Observable. Nouvelle table `math_competence_subthemes`. Les sous-thèmes sont **stables tous niveaux** (Engagement, Émission, etc.) ; ce sont les observables qui se calibrent par niveau scolaire.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 35          | **Validation observable (B) simplifiée**                                                             | `validé ssi ≥ 2 attempts success=true`. **Pas de fenêtre temporelle**, pas de critère de diversité de tâches, pas de garde-fou « sans aide ». Le prof gère ces dimensions hors système. `with_help` reste stocké pour analytics mais ne pèse pas dans la validation.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ~~36~~      | ~~Validation sous-thème (B) — Option β~~                                                             | Remplacée par Option β-ter (décision 43)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 37          | **Validation compétence math (B) — Option C hybride graduel**                                        | 🟢 Maîtrisée = TOUS les sous-thèmes au moins 🟢. ✨ En profondeur = tous 🟢 ou ✨ ET ≥ moitié des sous-thèmes en ✨. Force la **largeur** (tous les sous-thèmes) pour la maîtrise + **densité** sur au moins la moitié pour la profondeur.                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ~~38~~      | ~~Alertes B sans fenêtre temporelle~~                                                                | **Annulée** : pas d'alertes À remédier / À renforcer pour la famille B (décision suivante)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 39          | **Pas de badges famille B**                                                                          | Les badges 🆘 À remédier et 🔁 À renforcer sont réservés à la **famille A**. La famille B (observables binaires) ne génère pas d'alerte automatique — c'est la responsabilité pédagogique du prof. Les attempts `success=false` restent stockés pour le carnet d'erreurs et les analytics, mais ne déclenchent aucun signal automatique.                                                                                                                                                                                                                                                                                                                                                                                 |
| 40          | **Asymétrie universel/contextuel des observables**                                                   | Chaque observable famille B porte un flag `is_contextual` (défaut `false`). Universel → K=2 pour valider, compte toujours. Contextuel → **K=1** (un succès suffit), ne compte dans le sous-thème **que** s'il est validé.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 41          | **Interprétation B pour les contextuels ratés**                                                      | Un observable contextuel tenté mais non validé (uniquement `success=false`) est **ignoré** au calcul du sous-thème — ne pénalise pas l'élève. Justification : le contextuel est un bonus si observé positivement, pas un boulet si raté.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 42          | **Compétence math : Option C stricte conservée**                                                     | 🟢 Maîtrisée ssi **tous** les sous-thèmes sont ≥ 🟢. Pas d'assouplissement (pas d'Option C-bis). La largeur stricte est volontairement gardée pour favoriser le développement équilibré de la compétence.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 43          | **Validation sous-thème (B) — Option β-ter**                                                         | Algorithme à 3 chemins (n_univ ≤ 2, n_univ = 3, n_univ ≥ 4) avec garde-fou sur ✨. **✨ ssi `n_total ≥ n_univ` ET `n_univ_validés ≥ n_univ − 1`** (couverture totale + socle universel quasi complet). **🟢** : pour n_univ = 3 → exactement `n_univ_validés = 3` ou `(=2 ET ≥1 ctx)` ; pour n_univ ≥ 4 → `= n_univ−1` ou `(= n_univ−2 ET ≥1 ctx)`. AU PLUS 1 tolérance étendue par contextuel (les ctx suivants ne donnent rien sur les universels manquants, mais contribuent à n_total pour ✨). **Conséquence** : pour n_univ ≤ 3, l'état 🟢 strict n'existe pas (tous les chemins de validation sont aussi ✨) — transition directe 🟠 → ✨, cohérente avec la philosophie « petit sous-thème = exigence stricte ». |
| ~~31 à 43~~ | ~~Décisions 31 à 43 (modèle Option β/β-ter, asymétrie universel/contextuel, sous-thèmes avec état)~~ | **Toutes caduques** — remplacées par le bloc « cadre d'évaluation des 6 compétences mathématiques » (décisions 44 à 50). Voir historique « suite 16 ».                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 44          | **Adoption du cadre canonique**                                                                      | Le fichier `docs/wip/referentiel/cadre_evaluation_six_competences_mathematiques.md` devient la **source canonique** pour la famille B. Le design doc s'aligne sur ce cadre.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 45          | **Codage ternaire `+/–/∅` par tâche**                                                                | Chaque observable est codé par tâche : `+` (réussi en autonomie), `–` (occasion présente mais non réussi), `∅` (hors périmètre de la tâche). Distinction `–` vs `∅` essentielle : `–` = info sur l'élève, `∅` = info sur la tâche.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 46          | **Périmètre par tâche** (remplace `is_contextual` statique)                                          | Le prof déclare en amont de chaque tâche les observables qu'elle permet d'observer (le périmètre). Hors périmètre = `∅` automatique. Le marquage statique universel/contextuel est abandonné.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 47          | **Consolidation : `≥ 2 +` ET `+ > –`**                                                               | Un observable est **acquis** ssi (count_plus ≥ 2) AND (count_plus > count_minus). Pas de fenêtre temporelle. Le `–` joue son rôle de contrepoids.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 48          | **Règle conjonctive par compétence avec cœur d'excellence**                                          | Plus d'agrégation par sous-thème. L'évaluation va directement des observables consolidés au niveau de la compétence, via une **règle conjonctive et hiérarchisée propre à chaque compétence** (Insuffisante / Fragile / Satisfaisante / Très bonne). Chaque compétence a un **cœur d'excellence** verrouillant la Très bonne maîtrise.                                                                                                                                                                                                                                                                                                                                                                                   |
| 49          | **Vocabulaire socle pour la famille B**                                                              | Insuffisante / Fragile / Satisfaisante / Très bonne maîtrise (alignement bulletin LSU). Visuels ◯/🟠/🟢/✨ conservés des deux côtés.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 50          | **Sous-dimensions A/B/C/D structurelles, sans état**                                                 | Les sous-dimensions issues du cadre canonique servent uniquement au **regroupement visuel** (UI élève) et au **nommage des conditions** dans les règles de validation. **Pas d'agrégation observable → sous-dimension → compétence**. La règle conjonctive nomme directement les observables par leur code (A1, B2, C3…).                                                                                                                                                                                                                                                                                                                                                                                                |
| 51          | **Référentiel collège partagé 6ᵉ + cycle 4**                                                         | Pour V1 : un seul référentiel pour tout le collège. Distinction 6ᵉ vs cycle 4 reportée à plus tard. Le fichier `college-competences.md` regroupe les observables (le calcul littéral en C de Calculer reste plafonné à `∅` en 6ᵉ par défaut).                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 52          | **Renommage `math_competence_subthemes` → `math_competence_subdimensions`**                          | Aligné sur le vocabulaire du cadre. Lettre A/B/C/D explicite. Pas de `niveau_scolaire` (stables collège).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 53          | **Nouvelle table `evaluation_tasks` + `evaluation_task_perimeter`**                                  | Concept de tâche d'évaluation, avec son périmètre déclaré. Une tâche peut être liée à un assessment / exercise / worksheet existant ou être ad-hoc. Le périmètre liste les observables pertinents.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 54          | **`skill_attempts` à double régime**                                                                 | Famille A : `success` + `target_level`. Famille B : `code` ('plus'                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 'minus') + `task_id`. CHECK constraint pour exactement un régime. Un `∅` n'a pas de ligne — il est implicite par absence dans le périmètre. |
| 55          | **Caches famille B** : `student_observable_state` + `student_competence_level`                       | Deux niveaux de cache : par observable (count_plus, count_minus, is_acquis) et par compétence (niveau du socle + transparence du verdict via JSONB `validated_observables` et `missing_for_next`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

---

## 11. Questions en suspens

| #       | Question                                                          | Proposition Claude                                                           | Statut                                  |
| ------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------- |
| Q1      | Pondération des sources prof vs auto (Sacoche : prof × 2)         | Égaux en V1 (simplifier) ou prof × 2 ?                                       | Non tranché                             |
| Q2      | Format des `level_indicators`                                     | JSONB `{"1": ..., "2": ..., ...}`                                            | À valider                               |
| Q3      | Référentiel partagé global ou par prof                            | Partagé global V1 (David rédige)                                             | À valider                               |
| Q4      | Niveaux scolaires V1                                              | Cycle 4 + 2nde ? Cycle 4 seul ? Tout lycée ?                                 | **À trancher** (en cours : 6ᵉ démarrée) |
| Q5      | Granularité finale (combien d'objectifs / capacités par niveau)   | Cible 15–25 objectifs/niveau, 3–6 capacités/objectif                         | À mesurer après travail référentiel     |
| ~~Q6~~  | ~~Mapping vers socle commun~~                                     | **Reporté en V2** ✓ tranché                                                  | ~~résolu~~                              |
| Q7      | Versionnement du référentiel (si modification en cours d'année ?) | Pas de versionnement V1, fige le ref par année scolaire                      | À trancher                              |
| Q8      | UI prof : saisie item par item ou globale ventilée                | Item par item V1 (Sacoche-style), à enrichir                                 | À détailler                             |
| Q9      | Auto-éval élève — où / comment l'élève la déclare                 | Avant un DS, dans le plan de révision                                        | UX à designer                           |
| ~~Q10~~ | ~~Trame vide BO (cycle 4 + 2nde) à pré-générer~~                  | ~~Proposée par Claude~~                                                      | ✓ en cours (6ᵉ produite)                |
| Q11     | Décay temporel — passage en « à confirmer »                       | 60 jours sans saisie, niveau atténué visuellement, pas effacé                | À valider                               |
| ~~Q12~~ | ~~Composantes par compétence math, par niveau~~                   | **Composantes officielles BO 2020 récupérées** (cycle 3 : 21 ; cycle 4 : 26) | ✓ tranché — voir `6e-competences.md`    |

---

## 12. Prochaines étapes

### Côté David (utilisateur)

1. Reprendre le travail de référentiel (claude.ai → format compatible).
2. Trancher Q3, Q4, Q10 a minima pour démarrer.
3. Si Q10 confirmée : Claude génère la trame vide BO à partir des programmes officiels (cycle 4, 2nde).

### Côté implémentation (quand le référentiel est figé)

1. **Schéma SQL Supabase** (migration) — tables ci-dessus + indexes + RLS.
2. **Fonctions PL/pgSQL** : trigger sur `INSERT skill_attempts` → recalcul `student_skill_state` ; vue calculée pour l'état des objectifs.
3. **RLS policies** : élève ↔ ses propres données ; prof ↔ ses élèves via `class_members`.
4. **Import du référentiel** : script qui ingère le JSON/MD de David → DB.
5. **Types TypeScript** + helpers (`src/lib/types/skills.ts`, `src/lib/types/database-helpers.ts`).
6. **Calibration des Questions existantes** : ajout `target_level` à `question_skills`.
7. **Branchement validation auto** : à chaque réponse de Question, créer `skill_attempts`.
8. **UI prof V1** : éditeur de référentiel + saisie sur évaluation.
9. **UI élève V1** : dashboard objectifs + vue détail + liste complète.

### Chantiers ultérieurs (V2+)

- Extension Ubumark `[[skill:uuid|label]]` et `[[objective:uuid|label]]` dans le résolveur de liens internes (cf. audit).
- Plan de révision pour évaluation : orchestrateur Kanban / Pomodoro / SRS / worksheet ciblé sur les objectifs visés par un DS.
- Carnet d'erreurs : capture des `skill_attempts (success=false)` avec catégorisation manuelle de l'élève (calcul / méthode / lecture / étourderie).
- Auto-alimentation du SRS depuis les `skill_attempts (success=false)`.
- Mapping LSU vers socle commun (binding optionnel).

---

## 13. Documentation produite

- (ce document) `docs/wip/skills-referentiel-design.md`
- `docs/wip/referentiel/6e-savoirs.md` — trame Famille A pour la 6ᵉ (à compléter par David)
- `docs/wip/referentiel/college-competences.md` — référentiel Famille B collège partagé (à reconstruire en Phase 3 depuis le cadre canonique ; renommé depuis `6e-competences.md`)
- `docs/wip/referentiel/cadre_evaluation_six_competences_mathematiques.md` — **source canonique** du cadre famille B (codage ternaire, consolidation, règles par compétence)

## 14. Historique de session

- **2026-05-27** : audit existant (3 agents), choix vocabulaire (« objectifs »), structure 3 niveaux DB, 4 états visibles + 2 badges transversaux, décisions saisie/cumulativité/calcul, distinction remédier vs renforcer, calibration des Questions clarifiée (par mapping **indicateur → question**, pas par difficulté ressentie), terminologie pédagogique fixée (« **indicateur** » plutôt que « rubrique »), schéma DB préliminaire, ~22 décisions actées, ~11 questions en suspens.
- **2026-05-30** : prise en compte des **deux familles d'objectifs** (Connaissances/savoir-faire + 6 compétences mathématiques) ; refonte de la hiérarchie (A : thème → objectif → **capacité** ; B : compétence math → **composante**) ; schéma DB unifié (option 3 : `skills` partagé) ; consolidation de vocabulaire (capacité/composante/indicateur), termes « compétence atomique » et « compétence » seule bannis ; UI dashboard à deux sections côte à côte ; ~6 nouvelles décisions actées (23–28).
- **2026-05-30 (suite)** : récupération des **composantes officielles** par recherche web (BO cycle 3 du 30 juillet 2020 + programme cycle 4 BO 2015 + IGÉSR mai 2023) ; refonte intégrale de `6e-competences.md` avec **les 21 composantes officielles cycle 3** (texte exact) + indicateurs proposés par Claude pour chacune ; ajout des **26 composantes cycle 4** pour réutilisation 5ᵉ/4ᵉ/3ᵉ ; section « Notes pour la relecture » liste les écarts avec ma première ébauche. Q12 résolue.
- **2026-05-30 (suite 2)** : analyse du **nouveau programme cycle 3 (BO 2026)** fourni par David — abandon du tableau « Compétences travaillées » au profit d'un cadre **4 phases de résolution** (Comprendre/Modéliser/Calculer/Répondre + Régulation). Choix de design retenu : **garder les 6 compétences BO 2020 + IGÉSR 2023 comme grille principale d'évaluation** (couverture plus large que les 4 phases) ; **ajouter une glose pédagogique** d'une ligne par compétence (champ `gloss_for_student` sur `math_competences`) pour rendre la grille lisible et actionnable côté élève ; **mobiliser les 4 phases comme outil de diagnostic post-erreur** (champ `phase_blocage` nullable sur `skill_attempts`) qui alimentera le carnet d'erreurs. 2 décisions ajoutées (29, 30).
- **2026-05-30 (suite 3)** : pivot majeur sur la famille B suite à 2 préoccupations de David — (a) le cadre IGÉSR parle d'« observables » et pas d'échelle, (b) 21 composantes × 4 indicateurs = 84 textes lourds inapplicables. **Famille B passe à des observables binaires** (vu / pas encore vu), 6-10 par compétence math, formulés à la 1ʳᵉ personne. Famille A garde l'échelle 1-4 (nature différente : savoirs gradables). Schéma DB : ajout du champ `skill_type` ('progressive' | 'observable'), `level_indicators` et `is_progressive` nullables. Algorithme branché (sections 6.1 et 6.1bis). Refonte intégrale de `6e-competences.md` avec **46 observables** proposés par Claude. Composantes BO 2020 conservées en annexe pour référence. 3 décisions ajoutées (31, 32, 33).
- **2026-05-30 (suite 4)** : David fournit la **carte mentale IGÉSR pour la compétence Chercher** (capture). Fusion : la carte organise les observables en 4 sous-thèmes (Engagement, Mise en œuvre, Persévérance, Analyse réflexive). Les observables IGÉSR sont ajoutés (`Utilisation d'un brouillon`, `Détection d'invariants`, `Changement de représentation`, `Mobilisation d'outils logiciels`, `Analyse de la production pour poursuivre/réorienter`, `Contrôle critique de la démarche`) aux observables Claude existants. **Chercher passe de 8 à 13 observables**. Chaque observable est marqué `[IGÉSR]`, `[BO 2020]` ou `[Claude]` selon sa source. Sous-thèmes IGÉSR conservés comme structure de groupement. Choix de design : « Examen de la vraisemblance du résultat » (IGÉSR Chercher) est rattaché à **Calculer** plutôt qu'à Chercher pour éviter qu'un même geste soit compté deux fois côté élève. Les 5 autres compétences attendent leurs captures IGÉSR pour fusion analogue.
- **2026-05-30 (suite 5)** : David fournit la **carte mentale IGÉSR pour la compétence Modéliser**. Fusion : la carte ne propose **pas de sous-thèmes** ici, juste 5 observables très généraux (`Détection de grandeurs et de relations`, `Traduction sous forme mathématique`, `Utilisation d'une simulation pour éprouver un modèle`, `Interprétation des résultats dans la situation d'origine`, `Analyse de la validité et confrontation de deux modèles`). On les enrichit avec les observables concrets 6ᵉ issus du BO 2020 (proportionnalité, géométrie, opération adaptée). **Modéliser passe de 7 à 11 observables**. Adaptation 6ᵉ explicite : `simulation` → `test sur un cas particulier` ; `confrontation de deux modèles` → `comparaison de deux façons de résoudre`. Total cumulé : 55 observables pour Chercher+Modéliser+propositions Claude.
- **2026-05-30 (suite 6)** : David fournit la **carte mentale IGÉSR pour la compétence Représenter**. La carte propose 3 grands axes (sans sous-thèmes nommés) : `Choix d'une modalité de représentation`, `Analyse, compréhension, interprétation d'une représentation`, `Passage d'une représentation à une autre`. On structure les observables 6ᵉ sous ces 3 axes : observables méta IGÉSR (#1 et #6) + observables concrets BO 2020 (schéma, tableau, codages, solides, droite graduée pour fractions/décimaux). **Représenter passe de 8 à 11 observables**. Total cumulé : 58 observables pour Chercher+Modéliser+Représenter+propositions Claude (Raisonner, Calculer, Communiquer).
- **2026-05-30 (suite 7)** : David fournit la **carte mentale IGÉSR pour la compétence Calculer**. La carte propose 3 sous-thèmes : `Mise en œuvre d'une démarche, d'une stratégie` | `Mobilisation de techniques de calcul` (avec 2 sous-items `Numérique, algébrique` et `Calcul mental, posé, instrumenté`) | `Analyse des résultats et recherche d'éventuelles erreurs` (avec 2 sous-items `Ordre de grandeur` et `Homogénéité`). On structure les observables 6ᵉ en miroir ; ajout de l'observable `Homogénéité` (cohérence des unités) qui manquait. Adaptation : l'observable `algébrique` est réduit à l'évaluation d'expression littérale simple (initiation 6ᵉ). **Calculer passe de 8 à 11 observables**. Total cumulé : 61 observables. Raisonner et Communiquer attendent leurs cartes.
- **2026-05-30 (suite 8)** : David fournit la **carte mentale IGÉSR pour la compétence Communiquer**. La carte propose 3 sous-thèmes pédagogiquement riches : `Réception` (2 items : compréhension de la situation, mise en relation de plusieurs registres) | `Émission` (4 items : reformulation, explicitation des étapes, respect des spécificités mathématiques, mobilisation de plusieurs registres oral/écrit/vidéo/diaporama) | `Interaction` (2 items : argumentations entre pairs, richesse des échanges et débats). On structure les observables 6ᵉ sous ces 3 axes. **Communiquer passe de 8 à 13 observables**. Adaptation 6ᵉ : `vidéo, diaporama` (IGÉSR) réduit à `oral, écrit, schéma` (les registres lycée/cycle 4 sont laissés pour plus tard). Total cumulé : 66 observables. Seule Raisonner attend encore sa carte.
- **2026-05-30 (suite 9 — fusion IGÉSR complète)** : David fournit la **dernière carte mentale IGÉSR, pour Raisonner**. La carte propose 4 sous-thèmes : `Distinction de l'affirmation et de la preuve, de la perception et de la déduction` (avec 2 sous-items `Distinction entre cas particulier et cas général` et `Passage à l'abstraction`) | `Mobilisation et mise en œuvre de règles logiques ou de propriétés` | `Construction d'une argumentation` | `Analyse, correction d'un raisonnement`. **Raisonner passe de 7 à 12 observables**. Ajouts notables : `distinguer affirmation/preuve`, `distinguer cas particulier/règle générale`, `appliquer une règle logique simple (si A alors B)`, `construire une argumentation claire`, `relire son raisonnement pour le corriger`. **Référentiel famille B 6ᵉ complet : 71 observables au total** (Chercher 13, Modéliser 11, Représenter 11, Raisonner 12, Calculer 11, Communiquer 13). Métadonnée `fusion_igesr_complete: true` ajoutée. Phase 0 de spécification famille B → fonctionnellement bouclée, reste les choix de design à acter avant implémentation (Q1, Q3, Q4, Q7, Q8, Q9, Q11 dans le design doc).
- **2026-05-30 (suite 10 — revue David, curation Chercher)** : David retire 5 observables de Chercher (« distinguer données utiles/inutiles » : doublon avec « prélever les informations utiles » ; puis « changement de représentation » : déjà dans Représenter ; « mobiliser une procédure déjà rencontrée » : relève des automatismes ; « analyse pour poursuivre/réorienter » : recouvre Raisonner ; « relire ma démarche d'un œil critique » : recouvre Raisonner). **Chercher passe de 13 → 8 observables** ; la sous-section _Analyse réflexive_ est de fait vidée et retirée. **Total famille B 6ᵉ : 66 observables** (Chercher 8, Modéliser 11, Représenter 11, Raisonner 12, Calculer 11, Communiquer 13). Justifications consignées dans `6e-competences.md` section Chercher. Choix de curation : préférer une couverture nette sans chevauchements à l'exhaustivité IGÉSR brute — cohérent avec l'objectif d'évaluation utilisable côté prof et lisible côté élève.
- **2026-05-30 (suite 11 — revue David, curation Modéliser)** : David flag deux doublons dans Modéliser. Fusions appliquées : (a) « traduire situation géométrique » + « identifier figure usuelle par propriétés » → un seul observable de modélisation géométrique réelle ; (b) « reconnaître proportionnalité » + « distinguer additive/multi/proportionnalité » → un seul observable (le second subsume le premier). **Modéliser passe de 11 → 9 observables**. **Total famille B 6ᵉ : 64 observables**. Justifications consignées dans `6e-competences.md` section Modéliser, note dédiée.
- **2026-05-30 (suite 12 — algorithme de validation famille B refondu)** : David acte une hiérarchie famille B à **3 niveaux** (compétence math → sous-thème → observable) avec les sous-thèmes comme entités schéma stables tous niveaux. Algorithme de validation arrêté : (1) **Observable** : ≥ 2 attempts success=true, **pas de fenêtre temporelle**, pas de critère de diversité de tâches, pas de garde-fou « sans aide » — le prof gère ces dimensions. (2) **Sous-thème (Option β tolérance 1 erreur)** : pour n_obs ≤ 2 → tous validés ; pour n_obs ≥ 3 → au plus 1 observable manquant. (3) **Compétence (Option C hybride graduel)** : tous sous-thèmes ≥ 🟢 pour Maîtrisée ; tous 🟢 ou ✨ ET ≥ moitié ✨ pour En profondeur. **Schéma DB** : ajout de `math_competence_subthemes` ; la FK `math_competence_id` sur `skills` est remplacée par `subtheme_id`. **Alertes** : fenêtre par séquence (5 dernières tentatives) au lieu de fenêtre temporelle. 5 nouvelles décisions actées (34-38). Phase 0 spécification famille B définitivement bouclée.
- **2026-05-30 (suite 13 — pas de badges famille B)** : David acte qu'il ne veut **pas de badges À remédier ni À renforcer pour la famille B**. Justification : les observables sont binaires, et la responsabilité pédagogique du suivi appartient au prof qui contrôle les contextes d'observation. Une alerte automatique de régression sur un comportement (« Tu n'es plus persévérant ! ») serait infantilisante et contre-productive — l'analyse fine appartient à l'humain. Les `skill_attempts` famille B avec `success=false` restent stockés (utiles pour le carnet d'erreurs + analytics) mais ne déclenchent plus aucun signal automatique. Décision 38 (fenêtre par séquence) annulée. Décision 39 (pas de badges famille B) ajoutée. Les badges restent en place pour la **famille A** (capacités avec échelle 1-4) où ils gardent tout leur sens.
- **2026-05-31 (suite 14 — asymétrie universel/contextuel)** : David soulève une difficulté de calibration : certains observables peuvent émerger dans n'importe quelle tâche à prise d'initiative, d'autres uniquement dans des tâches très spécifiques (outil logiciel, problèmes 3D, débat collaboratif…). Le K=2 universel rend ces derniers difficiles à valider sur une année. **Solution actée** : flag `is_contextual` sur chaque observable famille B. **Universel** (défaut) → K=2, compte toujours dans le sous-thème. **Contextuel** → K=1 (un succès = validé immédiat), ne compte dans le sous-thème **que si validé** (interprétation B : un contextuel raté est ignoré, pas pénalisant). **Option C stricte conservée** au niveau compétence (tous les sous-thèmes ≥ 🟢 pour Maîtrisée — la largeur reste exigée). Schéma DB : ajout de `skills.is_contextual` (boolean, default false), avec contrainte que famille A ait toujours `false`. Algorithme 6.1bis et 6.1ter mis à jour. 3 nouvelles décisions actées (40-42). David fera lui-même le marquage universel/contextuel des observables 6ᵉ.
- **2026-05-31 (suite 15 — algorithme sous-thème Option β-ter)** : David affine la règle de validation du sous-thème (jugée trop permissive sur la version précédente où chaque contextuel ajoutait +1 tolérance). **Nouvelle règle** : **AU PLUS 1 tolérance étendue** quelque soit le nombre de contextuels validés. **🟢 Maîtrisé** strict selon n_univ : pour n_univ ≤ 2 → tous validés ; pour n_univ = 3 → 3 univ validés OU (2 univ + ≥1 ctx) ; pour n_univ ≥ 4 → (n_univ−1) univ validés OU ((n_univ−2) univ + ≥1 ctx). **✨ En profondeur** : `n_total ≥ n_univ` ET `n_univ_validés ≥ n_univ − 1` (garde-fou empêchant l'excellence sans socle universel). **Conséquence** : pour n_univ ≤ 3, tous les chemins du 🟢 sont aussi ✨ → pas d'état 🟢 strict pour les petits sous-thèmes, transition directe 🟠 → ✨. Pour n_univ ≥ 4, 🟢 strict existe comme palier intermédiaire. Décision 36 (Option β initiale) marquée caduque, remplacée par décision 43 (Option β-ter).
- **2026-06-06 (suite 16 — PIVOT MAJEUR : adoption du cadre canonique d'évaluation)** : David fournit un nouveau document `docs/wip/referentiel/cadre_evaluation_six_competences_mathematiques.md` (949 lignes), construit à un niveau de maturité pédagogique nettement supérieur à ce qu'on avait. Décision d'**adopter ce cadre tel quel** en remplacement complet du modèle Option β-ter / is_contextual / sous-thèmes avec état. Changements structurants : (1) **Codage ternaire `+/–/∅` par tâche** au lieu de booléen + flag statique — distinction `–` (info élève) vs `∅` (info tâche) explicite ; (2) **Périmètre dynamique par tâche** déclaré en amont par le prof, remplaçant le marquage `is_contextual` statique ; (3) **Consolidation** : `≥2 +` ET `+ > –` (le `–` joue contrepoids) ; (4) **Règle conjonctive par compétence avec cœur d'excellence** : plus d'agrégation par sous-thème, l'évaluation va directement observable→compétence via règle propre à chaque compétence ; (5) **Vocabulaire socle** : Insuffisante / Fragile / Satisfaisante / Très bonne maîtrise (visuels ◯/🟠/🟢/✨ conservés) ; (6) **Sous-dimensions A/B/C/D structurelles sans état**, juste pour regroupement UI et nommage des conditions ; (7) **Référentiel collège partagé 6ᵉ + cycle 4** pour V1. **Décisions 31 à 43 caduques**, remplacées par décisions 44 à 55. Refonte schéma DB : suppression `skills.is_contextual` ; renommage `math_competence_subthemes` → `math_competence_subdimensions` ; nouvelles tables `evaluation_tasks` + `evaluation_task_perimeter` ; `skill_attempts` à double régime (success/code) avec CHECK ; nouveaux caches `student_observable_state` + `student_competence_level` (avec champs de transparence du verdict). Fichier `6e-competences.md` renommé en `college-competences.md` (Phase 3 à venir : refonte complète depuis le cadre canonique).
