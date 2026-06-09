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

- **Famille A — Connaissances et savoir-faire** (code `family = 'knowledge'`) : contenus disciplinaires (Nombres, Géométrie, Fonctions, etc.). Évaluées par des tâches techniques ciblées. Régime : **4 capacités binaires ordonnées par difficulté sous chaque objectif**. Niveau d'un objectif = max capacité acquise.
- **Famille B — Compétences mathématiques** (code `family = 'competence'`) : les **6 compétences transversales** (Chercher, Modéliser, Représenter, Raisonner, Calculer, Communiquer). Évaluées sur des **tâches à prise d'initiative** (problèmes ouverts, modélisation). Régime : **codage ternaire `+/–/∅` par tâche, consolidation par observable, règle conjonctive par compétence avec cœur d'excellence**.

> **Convention d'appellation** : « famille A » / « famille B » sont des **alias courts** utilisés dans la doc et l'historique. Côté schéma / code, on utilise le champ `skills.family` avec valeurs `'knowledge'` (famille A) et `'competence'` (famille B). C'est une **colonne calculée** par Postgres (`GENERATED ALWAYS AS ... STORED`) à partir des FK ; impossible à désynchroniser (cf. §7 + décision 67).

La famille B suit le **cadre d'évaluation des 6 compétences mathématiques** (`docs/wip/referentiel/cadre_evaluation_six_competences_mathematiques.md`) — source canonique pour les observables, les règles de validation et les niveaux du socle.

### Hiérarchies

| Famille A                                                                     | Famille B                                                               |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Thème (BO) → Objectif → **4 capacités ordonnées par difficulté** (rang 1 → 4) | Compétence mathématique → **Sous-dimension** (A/B/C/D) → **Observable** |

**Famille A — modèle 4 capacités ordonnées (style référentiel 2016)** :

- Un **objectif** = ce que l'élève voit dans le dashboard (correspond à un attendu BO).
- Chaque objectif a **exactement 4 capacités**, ordonnées par difficulté (rang 1 = base, rang 4 = expert).
- Les capacités sont **binaires** : acquises ou pas.
- **Niveau atteint sur l'objectif** = rang de la plus grande capacité acquise (0 si aucune).
- Niveau 3 = « objectif attendu pour tous » ; Niveau 4 = « expert / approfondissement ».
- Les 4 capacités d'un même objectif ne sont **pas** 4 paliers d'une même compétence : ce sont **4 savoir-faire distincts** ordonnés par difficulté croissante.

**Famille B** — 3 niveaux pour la structuration, mais **un seul niveau a un état** : la compétence mathématique (calculée directement depuis les observables consolidés via la règle conjonctive). Les sous-dimensions A/B/C/D **n'ont pas d'état propre** ; elles servent uniquement de **regroupement structurel** (cohérence pédagogique de la grille, nommage des conditions dans les règles de validation).

Les sous-dimensions de la famille B sont **stables sur tout le collège** (6ᵉ + cycle 4 — pour l'instant unique référentiel partagé).

### Diagramme des deux hiérarchies — asymétrie volontaire

```text
FAMILLE 'knowledge' (alias famille A — connaissances et savoir-faire)
─────────────────────────────────────────────────────────────────────────────────
  skill_themes              (Nombres et calcul, Géométrie, ...)      ← 6 thèmes
    └─ skill_objectives       (Nombres entiers, Fractions, ...)       ← 18 objectifs  ⬅ vu par l'élève (dashboard d'entrée)
         └─ skills              (Comparer décimaux, Arrondir, ...)      ← 72 capacités  ⬅ vu par l'élève (vue détail tableau 4 colonnes)

  Parent direct du skill : skill_objectives (via skills.objective_id)


FAMILLE 'competence' (alias famille B — compétences mathématiques transversales)
─────────────────────────────────────────────────────────────────────────────────
  math_competences                        (Chercher, Calculer, ...)   ← 6 compétences ⬅ vu par l'élève (dashboard d'entrée)
    └─ math_competence_subdimensions       (A, B, C, D)                ← 22 sous-dim.   (regroupement structurel, pas d'état propre)
         └─ skills                          (A1, A2, B1, ...)            ← 56 observables ⬅ vu par l'élève (vue détail, groupés par sous-dim.)

  Parent direct du skill : math_competence_subdimensions (via skills.subdimension_id)
```

**L'asymétrie est volontaire** et reflète une différence de design pédagogique :

| Aspect                   | Famille `knowledge`                                                | Famille `competence`                                                                                                        |
| ------------------------ | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Niveau visible dashboard | **2ᵉ** niveau (`skill_objectives`)                                 | **1ᵉʳ** niveau (`math_competences`)                                                                                         |
| Parent direct du skill   | `skill_objectives` via `objective_id`                              | `math_competence_subdimensions` via `subdimension_id`                                                                       |
| Rôle de l'intermédiaire  | Le thème est un regroupement disciplinaire (Nombres, Géométrie...) | La sous-dimension est un regroupement structurel sans état (regroupe les observables par grande dimension de la compétence) |
| Volume 6ᵉ                | 6 thèmes / 18 objectifs / 72 capacités                             | 6 compétences / 22 sous-dimensions / 56 observables                                                                         |

→ Les deux FK `objective_id` et `subdimension_id` sont **miroirs au niveau du skill** (l'une ou l'autre est non-null, jamais les deux, jamais aucune). C'est ce qui détermine `family` (cf. décision 67) :

```
family = CASE
  WHEN objective_id IS NOT NULL THEN 'knowledge'  -- famille A
  ELSE 'competence'                                -- famille B
END
```

### Dictionnaire de noms fixé

| Concept                    | Famille A — Connaissances                                              | Famille B — Compétences math                                    | Code (EN)                                               | Visible élève |
| -------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------- | ------------- |
| Conteneur de + haut niveau | **Thème**                                                              | **Compétence mathématique**                                     | `theme` / `math_competence`                             | Oui           |
| Conteneur intermédiaire    | **Objectif** (= attendu BO)                                            | **Sous-dimension** (codes A, B, C, D)                           | `objective` / `math_competence_subdimension`            | Oui           |
| **Unité de saisie**        | **Capacité** (rang 1 à 4 sous un objectif)                             | **Observable** (code Xn, ex. A1, B3, C2)                        | `skill` avec `family` (`'knowledge'` \| `'competence'`) | Vue détail    |
| Codage par tâche           | succès/échec sur la `skill_id` taguée par la question                  | **ternaire `+/–/∅`** (cf. section 3)                            | `skill_attempt`                                         | Non           |
| Méthode d'évaluation       | binaire avec validation par variations (N réussites + couverture pool) | consolidation par observable + règle conjonctive par compétence | (cf. section 6)                                         | —             |

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
| A — Connaissances    | 6 thèmes                 | **18 items (= objectifs)** par niveau scolaire           | **exactement 4 capacités** par objectif (ordonnées par rang)     |
| B — Compétences math | **6 compétences (fixe)** | **3–4 sous-dimensions par compétence (stables collège)** | **6–13 observables par compétence**, répartis en sous-dimensions |

Pour la 6ᵉ : **18 items × 4 capacités = 72 capacités** à rédiger en famille A (cf. `referentiel/6e-savoirs.md`).

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
| 🟢     | Objectif atteint          |
| ✨     | Maîtrisé en profondeur    |

> Libellé 🟢 : « Objectif atteint » plutôt que « Maîtrisé » — colle à la sémantique BO « attendu pour tous » (niveau 3 = rang 3 ⭐ du référentiel famille A), conserve « Maîtrisé en profondeur » pour le niveau 4 (rang expert ✨).

### Famille B — 4 niveaux du socle commun

| Visuel | Famille B — Compétences math (vocabulaire du socle) |
| ------ | --------------------------------------------------- |
| ◯      | **Insuffisante**                                    |
| 🟠     | **Fragile**                                         |
| 🟢     | **Satisfaisante**                                   |
| ✨     | **Très bonne maîtrise**                             |

Les 4 visuels (◯/🟠/🟢/✨) sont conservés des deux côtés du dashboard pour la cohérence d'UI. Le vocabulaire **Insuffisante / Fragile / Satisfaisante / Très bonne** est celui du socle commun (alignement sur le bulletin LSU).

### Badges transversaux — Famille A uniquement

Définitions cohérentes avec le modèle B binaire (cf. §6.2) :

| Badge              | Sens                                                    | Condition (famille A — modèle B)                                                                                                                                                                                                     |
| ------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🆘 **À remédier**  | L'élève bute sur cette capacité (régression OU blocage) | `needs_remediation = true` : capacité **non acquise** AVEC **≥ 2 échecs** dans la fenêtre récente (3 dernières pour `capacite_attendue`, 5 dernières pour `automatisme`). Pas de seuil sur l'historique de succès (décisions 63, 64) |
| 🔁 **À renforcer** | Capacité acquise qui faiblit par non-usage              | `to_review = true` : capacité **acquise** mais `last_success_at > 30 jours`. Visuellement **atténué** dans les listes ; capacité reste acquise tant qu'aucun échec ne casse                                                          |

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

### Famille A — 4 capacités binaires ordonnées par objectif

Un objectif a **exactement 4 capacités** ordonnées par difficulté (rang 1 → 4). Chaque capacité est un **savoir-faire distinct** (pas un palier de gradation d'un même geste). Une capacité est **binaire** : acquise ou pas.

- Objectif (A) → niveau atteint = rang de la plus grande capacité acquise (0 si aucune)
- Capacité (A) → état binaire `acquise | non acquise` calculé depuis les saisies (`skill_attempts`)

**Validation d'une capacité par variations dans les templates (approche par couverture du pool)** :

Plutôt qu'une table d'observables séparée, les **variations canoniques** d'une capacité sont incarnées dans la diversité du pool de templates de questions taguées avec cette capacité. La règle de validation s'appuie sur la **diversité des templates** réussis, pas sur la rédaction préalable d'observables.

Deux régimes selon le **knowledge_type** de la capacité (champ `skills.knowledge_type` — reprend la rubrique BO 2026, cf. §7 + décisions 66 + 68) :

| `knowledge_type`    | Règle d'acquisition                                                                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `capacite_attendue` | ≥ 1 réussite (`success=true`) sur ≥ **2 `template_id` distincts** taggés avec cette `skill_id`, ET **aucun échec dans les 3 dernières tentatives** |
| `automatisme`       | ≥ **5 réussites totales** sur la capacité, ET ≥ 3 sur les 5 dernières tentatives                                                                   |

**Pourquoi cette asymétrie ?**

- Une `capacite_attendue` vise la **compréhension et la généralisation** : on demande la couverture d'au moins 2 variations distinctes du pool (refus de la validation par répétition triviale).
- Un `automatisme` vise la **fluence** : la régularité prime sur la diversité (la capacité étant déjà étroite).

**Décroissance V1 (à confirmer en implémentation)** :

Une capacité acquise depuis > **30 jours** sans réussite récente est marquée **« à revoir »** (affichage atténué). Elle n'est pas perdue, mais signalée pour ramener l'élève dessus.

**Stockage** : pas de `level_indicators`, pas de `is_progressive`, pas de `target_level`. La capacité est définie par son **nom** + son **knowledge_type** (`automatisme` | `capacite_attendue`) + son **rang** sous l'objectif. La couverture des variations est garantie côté création des templates de questions, pas côté référentiel.

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

**Exemple — Famille A (objectif avec 4 capacités ordonnées)** :

```
Objectif : « Comparer et ranger des nombres décimaux »

  Capacité rang 1 — Comparer deux décimaux avec parties entières différentes.
  Capacité rang 2 — Comparer deux décimaux avec la même partie entière et
                    parties décimales de même longueur.
  Capacité rang 3 — Comparer deux décimaux avec la même partie entière et
                    parties décimales de longueurs différentes (ex. 2,5 vs 2,15).
  Capacité rang 4 — Ranger une liste de décimaux mêlés, justifier l'ordre.
```

Chacune de ces 4 capacités est validée indépendamment via la règle d'acquisition de son knowledge_type. Le niveau atteint sur l'objectif est le rang maximal acquis.

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

### Cumulativité — caduque (modèle B)

Le flag `is_progressive` n'a plus de sens dans le modèle B : les 4 capacités d'un objectif sont des **savoir-faire distincts**, pas des paliers d'une même compétence. La question de la cumulativité ne se pose pas.

Conséquence : `skills.is_progressive` est **supprimé** du schéma.

---

## 4. Modèle de saisie

### Principe fondamental (famille A modèle B)

Une `skill_attempts` est attachée à **une capacité précise** (`skill_id`). Plus de `target_level` : la capacité elle-même porte sa propre identité (rang sous l'objectif + knowledge_type).

- `success = true` : l'élève a réussi un template de cette capacité → contribue à la règle d'acquisition de son knowledge_type.
- `success = false` : tentative ratée, stockée pour analytics et **fenêtre des 3/5 dernières tentatives** (utilisée par la règle d'acquisition).

### Tentative ratée : stockée et **utilisée pour le filtre récent**

Contrairement au modèle 1-4 d'origine (où les échecs n'influençaient pas le niveau atteint), dans le modèle B les échecs **filtrent** l'acquisition :

- `capacite_attendue` : pas d'échec dans les 3 dernières tentatives pour rester acquise.
- `automatisme` : ≥ 3 réussites sur les 5 dernières pour rester acquise.

C'est un garde-fou contre la régression : une capacité qu'on rate plusieurs fois récemment redevient « à revoir » même si elle a été acquise dans le passé.

### Aide du tuteur : marqueur, pas pénalité (décision 58)

Un attempt avec `with_help = true` (l'élève a sollicité le tuteur sur cette tentative) est **stocké pour analytics et carnet d'erreurs**, mais **n'intervient pas dans la règle d'acquisition §6.1**. Un succès avec aide compte comme un succès ordinaire au regard de la validation de la capacité.

Justification : préserve la simplicité de l'algorithme §6.1 (binaire `success`), évite les heuristiques discutables. Le garde-fou pédagogique « ne pas dépendre du tuteur » est délégué à la responsabilité du prof / élève, pas mécanisé. Si l'usage du tuteur devient problématique, il sera visible dans les analytics et pourra être adressé via une révision future de la règle.

### Sources de saisies

| Source         | Comment                                                   | Contribue au calcul ?                             |
| -------------- | --------------------------------------------------------- | ------------------------------------------------- |
| `auto`         | Question répondue (success déterminé par validation auto) | Oui                                               |
| `teacher`      | Saisie manuelle prof après éval ou observation            | Oui — pondération à trancher (cf. Q1)             |
| `student_self` | Auto-évaluation élève avant un DS                         | **Non** — affichée en parallèle, non contributive |

---

## 5. Calibration des Questions (famille A — modèle B)

### Tagging au niveau du **template**, pas de l'instance (décision 59)

Le tagging skill_id se fait sur le `question_template` (ce qui est **rédigé** par le prof), pas sur la question **instanciée** qu'un élève voit. Junction : `question_template_skills (template_id, skill_id)`.

Quand l'élève répond à une instance générée du template :

- Le système crée un `skill_attempts` par `skill_id` tagué sur le template.
- `skill_attempts.template_id` enregistre quel template a produit l'attempt (nécessaire pour la règle `capacite_attendue` qui compte `distinct_template_successes`).

Justification : un template peut générer des centaines d'instances. Tagger le template évite la duplication, reflète l'**acte de classification** du rédacteur (« ce patron évalue tel savoir-faire »), et toutes les instances héritent naturellement.

### Convention « 1 template = 1 variation canonique » (décision 60)

Le champ `question_templates.variations[]` (JSONB, migration 074) sert à varier des **paramétrages aléatoires** d'un **même cas pédagogique** (mêmes nombres alternatifs, même geste évalué).

Quand deux cas sont **pédagogiquement distincts** (= deux « variations canoniques » différentes au sens du référentiel, cf. listes V1.a / V1.b / … dans `6e-savoirs.md`), on les rédige comme **deux `question_template` séparés** avec deux `template_id` distincts.

Conséquence : la règle d'acquisition `capacite_attendue` (« ≥ 1 succès sur ≥ 2 `template_id` distincts ») s'applique naturellement : l'élève doit avoir réussi sur au moins 2 cas pédagogiques distincts pour valider la capacité.

**Exemple — Item 2 Rang 3 « Comparer et ranger des décimaux » (5 variations canoniques V3.a à V3.e)** :

| `template_id`                      | Variation canonique | Skill taguée | Champ `variations[]` JSONB          |
| ---------------------------------- | ------------------- | ------------ | ----------------------------------- |
| #101 « Comparer pièges longueurs » | V3.a                | item2_rang3  | [{a:2.5,b:2.15}, {a:7.8,b:7.15}, …] |
| #102 « Comparer rang par rang »    | V3.b                | item2_rang3  | [{a:4.17,b:4.32}, …]                |
| #103 « Ordonner liste 4-5 nb »     | V3.c                | item2_rang3  | [{list:[3.2,3.15,3.201,3.07]}, …]   |
| #104 « Encadrer entre 2 unités »   | V3.d                | item2_rang3  | [{x:2.37,unit:'dixième'}, …]        |
| #105 « Intercaler »                | V3.e                | item2_rang3  | [{a:1.4,b:1.5}, …]                  |

→ 5 `template_id` distincts taguant tous `item2_rang3`. Si l'élève réussit sur #101 puis sur #103, `distinct_template_successes = 2` → capacité validée (sous réserve « pas d'échec dans les 3 dernières »).

**Couverture cible du pool** : ≥ 2 (mini) à 3-5 (idéal) variations canoniques par capacité, **toutes rédigées comme `template_id` distincts**.

### Validation auto

- **Succès** (avec ou sans aide) → `INSERT skill_attempts (skill_id, template_id, success=true, with_help=?)` pour chaque skill_id tagué sur le template
- **Échec** → `INSERT skill_attempts (skill_id, template_id, success=false, with_help=?)` — stocké, utilisé pour le filtre des dernières tentatives
- `with_help` stocké mais ignoré dans la règle d'acquisition (cf. décision 58)

### Tagging multi-skills

Un template peut viser **plusieurs capacités/observables simultanément** (junction M2M sur `question_template_skills`). Une question d'une tâche à prise d'initiative en famille A peut typiquement aussi mobiliser des observables de famille B (par exemple « Calculer » + « Raisonner »).

Note : tagger un template avec un `skill_id` de famille B reste **documentaire** — une réponse auto via question UbuMaths ne génère **jamais** d'attempt famille B (qui exige `task_id` non-null, donc une tâche d'évaluation prof). Voir question ouverte 3.12 dans le rapport de revue.

---

## 6. Algorithme de calcul

### 6.1 État d'une capacité (Famille A `knowledge` — modèle B)

L'état d'une capacité est **binaire** : `acquise` ou `non acquise`. La règle dépend du **knowledge_type** (`automatisme` | `capacite_attendue`) porté par la capacité.

**Constantes globales** :

- Fenêtre de décroissance : **30 jours** sans réussite → capacité acquise marquée « à revoir »
- Fenêtre des dernières tentatives : **3** (pour `capacite_attendue`) ou **5** (pour `automatisme`)

**Cas `knowledge_type = 'capacite_attendue'`** :

```
distinct_template_successes = nombre de template_id distincts parmi
                              les attempts (success=true) sur cette skill_id

last_3 = 3 dernières tentatives chronologiques (tous statuts)

capacité_acquise ssi :
  - distinct_template_successes ≥ 2
  - AND aucun success=false dans last_3
```

**Cas `knowledge_type = 'automatisme'`** :

```
total_successes = nombre d'attempts (success=true) sur cette skill_id

last_5 = 5 dernières tentatives chronologiques (tous statuts)
recent_successes = nombre de success=true dans last_5

capacité_acquise ssi :
  - total_successes ≥ 5
  - AND recent_successes ≥ 3
```

**Décroissance** :

```
last_success_at = date du dernier success=true sur la capacité

Si capacité_acquise ET (now − last_success_at > 30 jours) :
  → marquée « à revoir » (statut visuel atténué, mais reste acquise tant
    qu'aucun échec récent ne casse la règle d'acquisition du knowledge_type)
```

**Note implémentation** : le cache `student_skill_state_a` stocke `is_acquired`, `distinct_template_successes`, `total_successes`, `last_success_at`, `to_review` (boolean dérivé de la décroissance). Recalcul par trigger à chaque `INSERT skill_attempts` famille A.

### 6.1bis Consolidation d'un observable (Famille B `competence`)

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

### 6.2 Drivers d'alerte (famille A — modèle B)

**Famille A** : les badges 🆘 À remédier / 🔁 À renforcer sont conservés mais redéfinis pour le modèle B binaire.

```
Capacité non acquise AVEC ≥ 2 échecs dans la fenêtre récente (K dernières tentatives)
  → needs_remediation = true → badge 🆘 « À remédier »
    (l'élève bute — peu importe qu'il ait déjà réussi par le passé ou non)

Fenêtre K : 3 dernières pour knowledge_type 'capacite_attendue', 5 dernières pour 'automatisme'.
Seuil min 2 échecs : évite qu'un seul ratage isolé déclenche l'alerte.

Capacité acquise (is_acquired = true) AND last_success_at > 30 jours
  → to_review = true → affichage atténué + badge 🔁 « À renforcer »
    (acquis qui faiblit par non-usage)

Capacité acquise avec succès récent et règle satisfaite
  → état stable (pas de badge, pas d'atténuation)
```

**Note schéma** : `to_review` est l'unique flag pour la décroissance (cf. §7). Le badge UI 🔁 « À renforcer » est dérivé directement de ce flag — pas de `needs_reinforcement` séparé (redondant). Le compteur agrégé du dashboard (« 🔁 À renforcer (N) ») se calcule à la volée comme `COUNT(*) WHERE is_acquired AND to_review`.

Une capacité **jamais touchée** (aucun attempt) n'est ni acquise ni à remédier : elle est simplement « non commencée » (◯) et cachée du dashboard d'entrée — pas d'échec récent, donc `needs_remediation = false`.

#### 🆘 « À remédier » vs liste des capacités à travailler

C'est une **distinction importante** pour ne pas confondre deux questions UI distinctes :

| Question                                                                                      | Réponse                                                                           |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| « Quelles capacités me bloquent en ce moment ? » (signal d'urgence pédagogique)               | Filtre `needs_remediation = true` → badge 🆘                                      |
| « Que dois-je acquérir pour passer au rang suivant de cet objectif ? » (vue de planification) | Filtre `objective_id = X AND display_order > rang_max_acquis AND NOT is_acquired` |

→ Le badge 🆘 est un **sous-ensemble strict** des capacités à travailler. Une capacité jamais touchée (◯) ou en cours d'apprentissage normal (🟠 sans échec récent bloquant) ne porte pas 🆘 — elle apparaît dans la liste de planification mais sans alerte.

Exemple : un élève au niveau 2 sur un objectif (rangs 1 et 2 acquis), souhaitant atteindre le niveau 3.

| Historique sur la capacité rang 3                               | État            | Badge              | Dans la liste « à travailler » ? |
| --------------------------------------------------------------- | --------------- | ------------------ | -------------------------------- |
| 0 attempt                                                       | ◯ Non commencée | aucun              | oui                              |
| 1+ attempts, jamais validée, < 2 échecs dans la fenêtre récente | 🟠 En cours     | aucun              | oui                              |
| 1 seul échec isolé dans la fenêtre récente                      | 🟠 En cours     | aucun (sous seuil) | oui                              |
| **≥ 2 échecs** dans la fenêtre récente                          | 🟠 + 🆘         | **🆘 À remédier**  | oui                              |
| Règle validée                                                   | 🟢 acquise      | aucun              | non                              |

**Décisions 63 + 64 (2026-06-09)** :

- Décision 63 : 🆘 ne requiert plus de succès historique — le badge couvre régression **et** blocage d'apprentissage.
- Décision 64 : **seuil minimum de 2 échecs** dans la fenêtre récente pour déclencher 🆘. Évite qu'un seul ratage isolé (faute d'inattention, distraction) ne provoque une alerte intempestive. La fenêtre récente est de 3 dernières tentatives pour `capacite_attendue`, 5 dernières pour `automatisme`.

**Famille B `competence`** : **pas de calcul de robustesse**, **pas de badges À remédier / À renforcer**.

Décision design : le cadre famille B est volontairement formatif (il explicite son verdict et désigne le geste à travailler), sans alerte automatique de régression. C'est le geste pédagogique du prof qui agit, pas un signal système. Les saisies `–` participent à la consolidation (contrepoids du `+`) mais ne déclenchent aucune alerte indépendante.

### 6.3 État et niveau d'un objectif (Famille A — modèle B)

Le niveau d'un objectif est le **rang maximal de ses capacités acquises** (lecture directe, pas d'agrégation par seuil).

```
Soit objectif avec capacités de rangs {1, 2, 3, 4} :

  acquis_set = { rang r | la capacité de rang r est acquise }

  niveau_objectif = max(acquis_set) si non vide, 0 sinon

  état_visuel = selon niveau_objectif :
    0 → ◯ Non commencé (caché du dashboard d'entrée)
    1 ou 2 → 🟠 En cours
    3 → 🟢 Objectif atteint
    4 → ✨ Maîtrisé en profondeur (expert)
```

**Justification des seuils visuels** :

- Niveau 3 = capacité « attendue pour tous » par le BO → c'est le seuil 🟢.
- Niveau 4 = approfondissement / expert → ✨.
- Niveaux 1-2 = en construction → 🟠.

Pas de seuil 80 % à appliquer (modèle 1-4 caduc) : la lecture est directe sur le rang max acquis.

**Cas particulier — capacités non contigües** : si l'élève a acquis la capacité de rang 3 sans avoir acquis la rang 2, on affiche `niveau_objectif = 3` mais on signale le « trou » en vue détail (« Tu as réussi le rang 3 mais le rang 2 n'est pas validé — étrange, à vérifier »). Cas atypique mais possible avec un pool de questions hétérogène.

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
  -- Exactement UNE des deux FK suivantes est non-null (la FK porte la famille) :
  objective_id        uuid fk → skill_objectives(id) nullable,                  -- famille knowledge → capacité
  subdimension_id     uuid fk → math_competence_subdimensions(id) nullable,     -- famille competence → observable
  -- Colonne calculée par Postgres (décision 67 — generated column) :
  family              text generated always as (
                        CASE WHEN objective_id IS NOT NULL THEN 'knowledge' ELSE 'competence' END
                      ) stored,
                                            -- 'knowledge'   = Connaissances et savoir-faire (ex-famille A)
                                            -- 'competence'  = Compétences mathématiques transversales (ex-famille B)
                                            -- Lisibilité dans SQL/code : WHERE family = 'knowledge'
                                            -- Impossible à désynchroniser (calculée par PG depuis les FK).
  niveau_scolaire     text nullable,        -- knowledge : null (hérité du thème) ; competence : 'college' pour V1
  observable_code     text nullable,        -- famille competence uniquement : 'A1', 'B3', 'C2', 'D2' (cadre canonique)
  name                text not null,        -- knowledge : nom court de la capacité ; competence : énoncé côté élève
  teacher_grid_text   text nullable,        -- famille competence : reformulation enseignant (grille de codage)
  knowledge_type      text nullable check (knowledge_type in ('automatisme', 'capacite_attendue')),
                                            -- famille knowledge uniquement : reprend la rubrique BO 2026 cycle 3
                                            -- 'automatisme'        : geste à automatiser (calcul mental, lexique de base...)
                                            -- 'capacite_attendue'  : compétence à mobiliser réfléchie
                                            -- NULL pour famille competence (le concept ne s'applique pas)
                                            -- détermine la règle d'acquisition (cf. §3 et §6.1)
  display_order       int not null,        -- knowledge : rang 1..4 sous l'objectif ; competence : ordre d'affichage
  -- Exactement une famille (XOR sur les FK) :
  CONSTRAINT chk_skill_family CHECK (
    (objective_id IS NOT NULL) <> (subdimension_id IS NOT NULL)
  ),
  -- Famille knowledge : rang dans [1,4] et knowledge_type renseigné :
  CONSTRAINT chk_skill_knowledge_rang CHECK (
    family = 'competence'                                                    -- famille competence : on s'abstient
    OR (display_order BETWEEN 1 AND 4 AND knowledge_type IS NOT NULL)        -- famille knowledge : rang ok + knowledge_type ok
  ),
  -- Famille competence : observable_code renseigné :
  CONSTRAINT chk_skill_competence_code CHECK (
    family = 'knowledge'                                            -- famille knowledge : on s'abstient
    OR observable_code IS NOT NULL                                  -- famille competence : code requis
  ),
  -- Unicité du rang sous un même objectif (famille knowledge)
  CONSTRAINT uq_skill_knowledge_rang UNIQUE NULLS NOT DISTINCT (objective_id, display_order)
)

-- Note (décision 65, 2026-06-09) : le champ `skill_type` ('progressive' | 'observable')
-- a été supprimé. La famille est intrinsèquement portée par les FK.

-- Note (décision 66 puis 68, 2026-06-09) : le champ `rubrique` est devenu `type`
-- puis `knowledge_type` (nom plus explicite — le champ est spécifique à la famille
-- 'knowledge', il est NULL pour 'competence'). Valeurs ('automatisme' |
-- 'capacite_attendue') inchangées.

-- Note (décision 67, 2026-06-09) : colonne `family` rajoutée en GENERATED column
-- pour récupérer la lisibilité (WHERE family = 'knowledge'). Calculée par Postgres
-- depuis les FK ; impossible à désynchroniser. Valeurs en anglais ('knowledge' |
-- 'competence') alignées sur la convention codebase. Le vocabulaire UI/français
-- reste « connaissances et savoir-faire » / « compétences mathématiques » ; A/B
-- restent utilisés comme alias court dans la doc et l'historique.

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
  skill_id uuid fk → skills(id),  -- doit être famille 'competence' — vérifié applicatif
  PRIMARY KEY (task_id, skill_id)
)

-- ============================================================
-- Junctions vers le contenu existant
-- ============================================================

chapter_objectives        (chapter_id, objective_id)                          -- M2M
assessment_objectives     (assessment_id, objective_id)                       -- M2M
exercise_objectives       (exercise_id, objective_id)                         -- M2M

-- Junction TEMPLATES ↔ SKILLS (décision 59 — tagging au niveau template, pas instance)
-- Source de vérité pour le calcul de progression (cf. §5 + §6.1).
question_template_skills (
  template_id  uuid fk → question_templates(id) ON DELETE CASCADE,
  skill_id     uuid fk → skills(id) ON DELETE RESTRICT,
  PRIMARY KEY (template_id, skill_id)
)
-- Un template peut tagger plusieurs skills (M2M). Un même skill peut être tagué
-- sur N templates (typiquement N = nombre de variations canoniques, cf. décision 60).
-- En famille 'knowledge' : skill_id pointe vers une capacité.
-- En famille B : tagging documentaire uniquement (les attempts famille B passent par
-- evaluation_tasks, pas par les réponses auto aux questions UbuMaths).

-- Champs descriptifs anciens de question_templates : theme/domain/subdomain/level/grades
-- Décision 61 : cohabitation. Conservés comme étiquettes libres de classement (utiles
-- pour filtres et recherche prof) ; non autoritaires pour la progression (c'est
-- question_template_skills qui pilote). Pas de drop, pas de FK ajoutée vers skill_themes.

-- ============================================================
-- Saisies — modèle dual famille A / famille B
-- ============================================================

skill_attempts (
  id              uuid pk,
  student_id      uuid fk,
  skill_id        uuid fk → skills(id),
  -- famille A : success seul (plus de target_level — modèle B)
  success         boolean nullable,
  template_id     uuid fk → question_templates(id) nullable,  -- famille A : nécessaire pour compter
                                                              -- distinct_template_successes (capacite_attendue)
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
    -- Famille A : success renseigné, code et task_id null
    (success IS NOT NULL AND code IS NULL AND task_id IS NULL)
    OR
    -- Famille B : code + task_id renseignés, success null
    (success IS NULL AND code IS NOT NULL AND task_id IS NOT NULL)
  )
)

-- ============================================================
-- Caches (recalculés par trigger)
-- ============================================================

-- Famille A — modèle B : état binaire par capacité
student_skill_state_a (
  student_id                    uuid,
  skill_id                      uuid,
  is_acquired                   boolean not null default false,
  total_successes               int not null default 0,
  distinct_template_successes   int not null default 0,        -- pour la règle capacite_attendue
  last_success_at               timestamptz,
  last_attempt_at               timestamptz,
  to_review                     boolean not null default false, -- (is_acquired AND now - last_success_at > 30 jours) → affichage estompé + badge 🔁 « À renforcer »
  needs_remediation             boolean not null default false, -- 🆘 ≥ 2 échecs dans la fenêtre récente (selon knowledge_type) bloquant la règle
  PRIMARY KEY (student_id, skill_id)
)
-- Recalculé par trigger PL/pgSQL sur INSERT skill_attempts famille A.
-- Le flag to_review est rafraîchi par un job quotidien (ou recalculé à la volée
-- en lecture si on veut éviter le cron — décision implémentation).

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
- `skills.level_indicators` (caduc — modèle B : pas de paliers d'indicateurs sur une capacité)
- `skills.is_progressive` (caduc — modèle B : les 4 capacités sont distinctes, pas un palier)
- `skill_attempts.target_level` (caduc — modèle B : tagging skill_id seul)
- `question_skills` (table caduque — remplacée par `question_template_skills`, décision 59 : tagging au niveau template, pas instance)
- `student_skill_state_a.level_reached_stable` / `level_reached_provisional` (caduc — modèle B : binaire)
- `math_competence_subthemes` (renommée en `math_competence_subdimensions`, sans état)
- `assessment_math_competences` / `exercise_math_competences` (remplacées par `evaluation_tasks` qui peut référencer un assessment via `source_type`)
- `student_skill_state.level_reached_*` pour famille B (caduc — pas de stable/provisoire en B)

**Cohabitation préservée** (pas de drop, cf. décision 61) :

- `question_templates.theme / domain / subdomain / level / grades` : conservés comme étiquettes libres descriptives (utiles pour filtres/recherche prof). Non autoritaires pour la progression — la source de vérité est `question_template_skills`. Pas de FK ajoutée vers `skill_themes` / `skill_objectives`.

---

## 8. UI élève — éléments actés (mockups dans l'historique de conversation)

### Dashboard d'entrée — deux sections côte à côte

```
┌───────────────────────────┐  ┌───────────────────────────┐
│ Mes objectifs             │  │ Mes compétences math.     │
│ (Famille A — 18 items 6ᵉ) │  │ (Famille B — les 6)       │
├───────────────────────────┤  ├───────────────────────────┤
│ ✨ 2  🟢 8  🟠 7          │  │ ✨ 1  🟢 3  🟠 2          │
│ ████████░░░  10/18 ✓     │  │ ████░░░ 4/6 ✓            │
│ 🆘 À remédier (3)         │  │                           │
│ 🎯 À préparer DS du 12/06 │  │                           │
└───────────────────────────┘  └───────────────────────────┘
```

- Famille A : `10/18 ✓` = nombre d'objectifs atteints (✨ + 🟢) sur le total d'items du niveau (18 pour la 6ᵉ). Le 1 objectif ◯ Non commencé reste caché.
- Famille B : `4/6 ✓` = nombre de compétences math au moins ≥ 🟢 Satisfaisante sur les 6.
- Badges 🆘 À remédier / 🔁 À renforcer : **famille A uniquement** (cf. §2 et §6.2). Pas de badge famille B (volontaire).

Sur petit écran : empilées verticalement (A au-dessus, B en-dessous), même rendu interne.

### Vue « Tous mes objectifs » (Famille A — modèle B)

- Liste groupée par thème BO.
- Pour chaque objectif : son **état visuel** (◯/🟠/🟢/✨) + une **mini-barre 4 segments** indiquant les capacités acquises sous l'objectif.
- Filtre : Tous / En cours / Objectif atteint / Maîtrisé en profondeur / À revoir.
- Les acquis (✨, 🟢) remontent visuellement ; les non commencés en bas, texte gris clair.

```
Thème — Nombres et calculs
  🟢 ▓▓▓░  Comparer et ranger des nombres décimaux       (3/4)
  🟠 ▓▓░░  Additionner et soustraire des décimaux         (2/4)
  ◯  ░░░░  Pourcentages : appliquer un pourcentage         (0/4)
```

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

### Vue détaillée d'un objectif (Famille A — modèle B, style PDF 2016)

Affichage en **tableau 4 colonnes** correspondant aux 4 capacités ordonnées par difficulté. Inspiré du référentiel personnel de David (PDF 2016, « échelles descriptives connaissance 6 2016 »).

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ← Comparer et ranger des nombres décimaux                                │
│   Niveau atteint : 🟢 Objectif atteint (3/4)                              │
├─────────────┬─────────────┬─────────────┬─────────────────────────────────┤
│  Rang 1     │  Rang 2     │  Rang 3     │  Rang 4 (expert)               │
│  Base       │             │ ⭐ Attendu  │                                │
├─────────────┼─────────────┼─────────────┼─────────────────────────────────┤
│ ✓ Parties   │ ✓ Mêmes     │ ✓ Mêmes     │ ◯ Ranger une liste mêlée       │
│   entières  │   parties   │   parties   │   et justifier l'ordre          │
│   diffé-    │   entières, │   entières, │                                │
│   rentes    │   longueurs │   longueurs │                                │
│             │   égales    │   diffé-    │                                │
│             │             │   rentes    │                                │
│  acquise    │  acquise    │  acquise    │  non acquise                   │
└─────────────┴─────────────┴─────────────┴─────────────────────────────────┘

[Pratiquer le rang 4]   [Réviser N cartes SRS]   [Demander au tuteur]
```

**Conventions visuelles** :

- ✓ = acquise (badge vert / coche)
- ◯ = non acquise
- 🔁 ou « à revoir » : capacité acquise mais > 30 jours sans pratique
- 🆘 ou « à remédier » : tentatives récentes en échec qui empêchent l'acquisition
- Étoile « ⭐ Attendu » sur le rang 3 (seuil BO « pour tous »)

**Sur mobile** : empilement vertical (4 lignes au lieu de 4 colonnes), même contenu.

**Actions** : 3 boutons d'action sous le tableau — `[Pratiquer]` (priorité sur la prochaine capacité non acquise), `[Réviser N cartes SRS]`, `[Demander au tuteur]`.

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

| #                           | Sujet                                                                                                 | Choix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1                           | Vocabulaire UI élève                                                                                  | « **Objectifs** »                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2                           | États visibles                                                                                        | 4 : non commencé / 🟠 / 🟢 / ✨                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 3                           | Visuel non commencé                                                                                   | ◯ contour gris, **caché du dashboard** principal                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 4                           | Visuel ✨                                                                                             | pastille verte + halo doré (effet spécial)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 5                           | Hiérarchie famille A                                                                                  | 3 niveaux : thème → objectif → **capacité** (toujours valide en modèle B — la capacité y est binaire et il y en a 4 par objectif)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ~~6~~                       | ~~Hiérarchie famille B : 2 niveaux compétence → composante~~                                          | **Caduque** — remplacée par décision 50 (3 niveaux structurels : compétence → sous-dimension A/B/C/D → observable, sous-dimensions sans état propre). Vocabulaire « composante » banni en §1.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ~~7~~                       | ~~Échelle descriptive sur capacité/composante~~                                                       | **Caduque** — modèle B famille A : capacité binaire (pas d'échelle 1-4). Famille B : niveau du socle à 4 paliers calculé par règle conjonctive (cf. décision 48), pas une échelle descriptive sur l'observable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 8                           | Visibilité unités de saisie                                                                           | Sur demande (vue détaillée). Famille A : **capacités**. Famille B : **observables** regroupés par sous-dimension.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 9                           | Saisie                                                                                                | **Famille A modèle B** : succès ET échecs stockés ; les échecs filtrent l'acquisition (cf. §3 + §6.1). **Famille B** : le prof coche les `+` ; les `–` se déduisent du périmètre (cf. §3.2). « Preuve positive uniquement » de la formulation initiale est donc réinterprétée selon la famille.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 10                          | Échec                                                                                                 | Stocké pour analytics ; **modèle B famille A** : utilisé aussi pour le filtre des dernières tentatives.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 11                          | Aide tuteur                                                                                           | Marqueur stocké, sans pénalité immédiate. **Rôle exact dans la règle d'acquisition famille A : en suspens** (cf. §4 + vague 2 phase 0).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 12                          | Garde-fou « sans aide »                                                                               | **En suspens** (modèle B famille A) : §4 mentionne le garde-fou mais §6.1 ne l'implémente pas. À trancher en vague 2 phase 0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ~~13~~                      | ~~Cumulativité (flag `is_progressive`)~~                                                              | **Caduque** — modèle B : les 4 capacités d'un objectif sont des savoir-faire distincts, pas un palier d'une même capacité ; la question de la cumulativité ne se pose pas. `skills.is_progressive` supprimé du schéma.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ~~14~~                      | ~~Seuil de stabilité K = 3~~                                                                          | **Caduque** — modèle B : règle d'acquisition différenciée par rubrique (cf. décision 57 + §6.1) : `capacite_attendue` = ≥ 1 succès sur ≥ 2 templates distincts ; `automatisme` = ≥ 5 succès dont ≥ 3 sur les 5 dernières.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ~~15~~                      | ~~Fenêtre de récence 60 jours~~                                                                       | **Caduque** — modèle B : fenêtre **30 jours** pour la décroissance (cf. décision 57 + §6.1). Q11 close.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 16                          | Source `student_self`                                                                                 | **Ne contribue pas** au calcul officiel. **Famille A uniquement** — famille B n'a pas de saisie élève auto-déclarée (le cadre canonique définit le codage comme une observation enseignant).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 17                          | Distinction remédier/renforcer                                                                        | 🆘 « À remédier » (capacité non acquise avec succès historique mais échecs récents) vs 🔁 « À renforcer » (capacité acquise > 30 j sans pratique). **Famille A uniquement** (cf. décision 39 : pas de badges famille B).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ~~18~~                      | ~~Robustesse < 50 % sur les 5 dernières au niveau visé~~                                              | **Caduque** — modèle B binaire : plus de score continu de robustesse, plus de « niveau visé ». La fonction est répartie sur le filtre 3/5 dernières (anti-régression) + décroissance 30 j (anti-oubli).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ~~19~~                      | ~~Seuils agrégation 🟢/✨ à ≥ 80 % capacités à niveau ≥ 3/4~~                                         | **Caduque** — modèle B : niveau objectif = `max(rang capacité acquise)`, lecture directe sans seuil de pourcentage (cf. §6.3 + décision 57).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 20                          | Nommage tables                                                                                        | **anglais** (cohérent codebase)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 21                          | Table unique tentatives                                                                               | `skill_attempts` (success bool famille A ; code 'plus'/'minus' famille B — cf. décision 54, double régime)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ~~22~~                      | ~~Cible des Questions : `target_level` (1-4) dans `question_skills`~~                                 | **Caduque** — modèle B : tagging `skill_id` seul (pas de calibration `target_level`). Acte de classification objectif (cf. décision 57 + §5).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 23                          | **Deux familles d'objectifs**                                                                         | A (connaissances/savoir-faire) + B (6 compétences math), côte à côte                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 24                          | **Schéma DB option 3**                                                                                | `skills` partagé entre A et B (FK `objective_id` ou `math_competence_id` mutex)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 25                          | **Les 6 compétences math**                                                                            | Stables tous niveaux. Sous-dimensions A/B/C/D stables collège (cadre canonique). Observables stables collège pour V1 (référentiel partagé 6ᵉ + cycle 4 — cf. décision 51).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 26                          | Mapping socle commun                                                                                  | **V2** (hors V1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 27                          | UI dashboard                                                                                          | **deux sections côte à côte** (objectifs + compétences math)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 28                          | Vocabulaire fixé (réécrit 2026-06-08)                                                                 | Famille A : **thème → objectif → capacité** (rang 1-4). Famille B : **compétence mathématique → sous-dimension A/B/C/D → observable** (code Xn). « Compétence atomique », « compétence » sans qualificatif, « composante », « domaine », « sous-thème avec état » sont **bannis** (cf. §1).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 29                          | **Glose pédagogique** par compétence math                                                             | champ `gloss_for_student` sur `math_competences`. Visible élève à côté du nom officiel BO. Une ligne, actionnable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 30                          | **4 phases de résolution** (Comprendre/Modéliser/Calculer/Répondre + Régulation)                      | introduites par le **BO 2026** ; utilisées comme **outil de diagnostic post-erreur**, pas comme grille principale. Stockées dans `skill_attempts.phase_blocage` (nullable). Alimentent le carnet d'erreurs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 31                          | **Famille B = observables binaires** (pas d'échelle 1-4)                                              | Pivot vers le cadre **IGÉSR mai 2023** (description / ressources / observables). Une compétence math = 6-10 observables binaires à la 1ʳᵉ personne (« Je teste plusieurs pistes »). Validation : ≥ 2 observations positives en 60j dont 1 sans aide. Famille A garde l'échelle 1-4 avec indicateurs (régime adapté aux savoirs gradables).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ~~32~~                      | ~~Champ `skill_type` sur `skills`~~                                                                   | **Caduque** — supprimé en décision 65 (2026-06-09). La famille est intrinsèquement portée par les FK `objective_id` (A) vs `subdimension_id` (B). `level_indicators` et `is_progressive` déjà supprimés (décision 57).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 33                          | **Composantes BO 2020 archivées**                                                                     | Le tableau « Compétences travaillées » de 2020 sert de **référence pour rédiger les observables** mais n'est plus l'unité d'évaluation. Conservées en annexe des fichiers de référentiel (`<niveau>-competences.md`) pour traçabilité.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 34                          | **Hiérarchie famille B à 3 niveaux**                                                                  | Compétence math → **Sous-thème** → Observable. Nouvelle table `math_competence_subthemes`. Les sous-thèmes sont **stables tous niveaux** (Engagement, Émission, etc.) ; ce sont les observables qui se calibrent par niveau scolaire.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 35                          | **Validation observable (B) simplifiée**                                                              | `validé ssi ≥ 2 attempts success=true`. **Pas de fenêtre temporelle**, pas de critère de diversité de tâches, pas de garde-fou « sans aide ». Le prof gère ces dimensions hors système. `with_help` reste stocké pour analytics mais ne pèse pas dans la validation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ~~36~~                      | ~~Validation sous-thème (B) — Option β~~                                                              | Remplacée par Option β-ter (décision 43)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 37                          | **Validation compétence math (B) — Option C hybride graduel**                                         | 🟢 Maîtrisée = TOUS les sous-thèmes au moins 🟢. ✨ En profondeur = tous 🟢 ou ✨ ET ≥ moitié des sous-thèmes en ✨. Force la **largeur** (tous les sous-thèmes) pour la maîtrise + **densité** sur au moins la moitié pour la profondeur.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ~~38~~                      | ~~Alertes B sans fenêtre temporelle~~                                                                 | **Annulée** : pas d'alertes À remédier / À renforcer pour la famille B (décision suivante)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 39                          | **Pas de badges famille B**                                                                           | Les badges 🆘 À remédier et 🔁 À renforcer sont réservés à la **famille A**. La famille B (observables binaires) ne génère pas d'alerte automatique — c'est la responsabilité pédagogique du prof. Les attempts `success=false` restent stockés pour le carnet d'erreurs et les analytics, mais ne déclenchent aucun signal automatique.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 40                          | **Asymétrie universel/contextuel des observables**                                                    | Chaque observable famille B porte un flag `is_contextual` (défaut `false`). Universel → K=2 pour valider, compte toujours. Contextuel → **K=1** (un succès suffit), ne compte dans le sous-thème **que** s'il est validé.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 41                          | **Interprétation B pour les contextuels ratés**                                                       | Un observable contextuel tenté mais non validé (uniquement `success=false`) est **ignoré** au calcul du sous-thème — ne pénalise pas l'élève. Justification : le contextuel est un bonus si observé positivement, pas un boulet si raté.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 42                          | **Compétence math : Option C stricte conservée**                                                      | 🟢 Maîtrisée ssi **tous** les sous-thèmes sont ≥ 🟢. Pas d'assouplissement (pas d'Option C-bis). La largeur stricte est volontairement gardée pour favoriser le développement équilibré de la compétence.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 43                          | **Validation sous-thème (B) — Option β-ter**                                                          | Algorithme à 3 chemins (n_univ ≤ 2, n_univ = 3, n_univ ≥ 4) avec garde-fou sur ✨. **✨ ssi `n_total ≥ n_univ` ET `n_univ_validés ≥ n_univ − 1`** (couverture totale + socle universel quasi complet). **🟢** : pour n_univ = 3 → exactement `n_univ_validés = 3` ou `(=2 ET ≥1 ctx)` ; pour n_univ ≥ 4 → `= n_univ−1` ou `(= n_univ−2 ET ≥1 ctx)`. AU PLUS 1 tolérance étendue par contextuel (les ctx suivants ne donnent rien sur les universels manquants, mais contribuent à n_total pour ✨). **Conséquence** : pour n_univ ≤ 3, l'état 🟢 strict n'existe pas (tous les chemins de validation sont aussi ✨) — transition directe 🟠 → ✨, cohérente avec la philosophie « petit sous-thème = exigence stricte ».                                                                                                                                                                                                                                                                                                                                                       |
| ~~31 à 43~~                 | ~~Décisions 31 à 43 (modèle Option β/β-ter, asymétrie universel/contextuel, sous-thèmes avec état)~~  | **Toutes caduques** — remplacées par le bloc « cadre d'évaluation des 6 compétences mathématiques » (décisions 44 à 50). Voir historique « suite 16 ».                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 44                          | **Adoption du cadre canonique**                                                                       | Le fichier `docs/wip/referentiel/cadre_evaluation_six_competences_mathematiques.md` devient la **source canonique** pour la famille B. Le design doc s'aligne sur ce cadre.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 45                          | **Codage ternaire `+/–/∅` par tâche**                                                                 | Chaque observable est codé par tâche : `+` (réussi en autonomie), `–` (occasion présente mais non réussi), `∅` (hors périmètre de la tâche). Distinction `–` vs `∅` essentielle : `–` = info sur l'élève, `∅` = info sur la tâche.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 46                          | **Périmètre par tâche** (remplace `is_contextual` statique)                                           | Le prof déclare en amont de chaque tâche les observables qu'elle permet d'observer (le périmètre). Hors périmètre = `∅` automatique. Le marquage statique universel/contextuel est abandonné.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 47                          | **Consolidation : `≥ 2 +` ET `+ > –`**                                                                | Un observable est **acquis** ssi (count_plus ≥ 2) AND (count_plus > count_minus). Pas de fenêtre temporelle. Le `–` joue son rôle de contrepoids.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 48                          | **Règle conjonctive par compétence avec cœur d'excellence**                                           | Plus d'agrégation par sous-thème. L'évaluation va directement des observables consolidés au niveau de la compétence, via une **règle conjonctive et hiérarchisée propre à chaque compétence** (Insuffisante / Fragile / Satisfaisante / Très bonne). Chaque compétence a un **cœur d'excellence** verrouillant la Très bonne maîtrise.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 49                          | **Vocabulaire socle pour la famille B**                                                               | Insuffisante / Fragile / Satisfaisante / Très bonne maîtrise (alignement bulletin LSU). Visuels ◯/🟠/🟢/✨ conservés des deux côtés.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 50                          | **Sous-dimensions A/B/C/D structurelles, sans état**                                                  | Les sous-dimensions issues du cadre canonique servent uniquement au **regroupement visuel** (UI élève) et au **nommage des conditions** dans les règles de validation. **Pas d'agrégation observable → sous-dimension → compétence**. La règle conjonctive nomme directement les observables par leur code (A1, B2, C3…).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 51                          | **Référentiel collège partagé 6ᵉ + cycle 4**                                                          | Pour V1 : un seul référentiel pour tout le collège. Distinction 6ᵉ vs cycle 4 reportée à plus tard. Le fichier `college-competences.md` regroupe les observables (le calcul littéral en C de Calculer reste plafonné à `∅` en 6ᵉ par défaut).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 52                          | **Renommage `math_competence_subthemes` → `math_competence_subdimensions`**                           | Aligné sur le vocabulaire du cadre. Lettre A/B/C/D explicite. Pas de `niveau_scolaire` (stables collège).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 53                          | **Nouvelle table `evaluation_tasks` + `evaluation_task_perimeter`**                                   | Concept de tâche d'évaluation, avec son périmètre déclaré. Une tâche peut être liée à un assessment / exercise / worksheet existant ou être ad-hoc. Le périmètre liste les observables pertinents.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 54                          | **`skill_attempts` à double régime**                                                                  | Famille A : `success` (bool) + `template_id` (uuid). Famille B : `code` (`'plus' \| 'minus'`) + `task_id`. CHECK constraint pour exactement un régime. Un `∅` famille B n'a pas de ligne — il est implicite par absence dans le périmètre déclaré. (Note : référence à `target_level` dans la version initiale de cette décision est caduque — cf. décision 57.)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 55                          | **Caches famille B** : `student_observable_state` + `student_competence_level`                        | Deux niveaux de cache : par observable (count_plus, count_minus, is_acquis) et par compétence (niveau du socle + transparence du verdict via JSONB `validated_observables` et `missing_for_next`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 56 (partiellement caduque)  | **Champ `rubrique` sur famille A + adoption BO 2026 cycle 3** ; ~~Option L 25 obj / 127 cap~~ caduque | **Partie vivante** : adoption du **BO 2026 cycle 3** comme source pour la 6ᵉ ; champ `skills.rubrique` (`'automatisme' \| 'capacite_attendue'`, nullable, famille A uniquement). **Partie caduque** : ~~Option L littéral à 25 objectifs / 127 capacités~~ — remplacée par la structure modèle B à **18 items × 4 capacités = 72 capacités** (cf. décision 57 + `referentiel/6e-savoirs.md`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ~~5, 7, 13–15, 18, 19, 22~~ | ~~Modèle famille A « 4 paliers d'indicateurs par capacité » + tagging `target_level`~~                | **Toutes caduques** — remplacées par le modèle B (décision 57). Note : la décision 5 (hiérarchie 3 niveaux thème → objectif → capacité) **reste valide** : seul le sens du mot « capacité » change (binaire en modèle B, gradée en ancien modèle).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 57                          | **Pivot vers modèle B pour la famille A (référentiel 2016 style)**                                    | Hiérarchie : Thème → Objectif → **exactement 4 capacités ordonnées par difficulté** (rang 1 → 4). Chaque capacité **binaire** (acquise ou pas), **distincte** (pas un palier d'une même compétence). Niveau objectif = max rang acquis. Niveau 3 = « attendu pour tous » (BO), Niveau 4 = expert. **Tagging questions** : `skill_id` seul (pas de `target_level`) — acte de classification, pas de calibration. **Validation par variations dans les templates (approche 3)** : pas de table d'observables séparée, la diversité du pool incarne les variations. **Règle d'acquisition modulée par rubrique** : `capacite_attendue` → ≥ 1 succès sur ≥ 2 templates distincts + aucun échec dans les 3 dernières ; `automatisme` → ≥ 5 succès + ≥ 3 dans les 5 dernières. **Décroissance** : > 30 jours sans succès → capacité acquise marquée « à revoir ». Schéma DB : drop `level_indicators`, `is_progressive`, `target_level` ; cache `student_skill_state_a` refondu (binaire). **Réalisé 6ᵉ : 18 items × 4 capacités = 72 capacités** (cf. `referentiel/6e-savoirs.md`). |
| 58                          | **`with_help` ignoré dans la règle d'acquisition** (famille A modèle B)                               | Un `skill_attempts.with_help=true` (succès avec aide tuteur) compte comme succès ordinaire dans la règle §6.1. Le champ reste stocké pour analytics et carnet d'erreurs, mais n'intervient pas dans la validation de la capacité. Préserve la simplicité de l'algorithme binaire ; le garde-fou « ne pas dépendre du tuteur » est délégué à la responsabilité pédagogique (visibilité analytics, pas mécanisation). Tranchée le 2026-06-08 en phase 0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 59                          | **Tagging au niveau template, pas instance** (junction `question_template_skills`)                    | Le tag `skill_id` est porté par le **`question_template`** (ce que le prof rédige), pas par l'**instance** générée. Junction : `question_template_skills (template_id, skill_id)` PK composite. Toutes les instances du template héritent du tagging. `skill_attempts.template_id` enregistre quel template a produit l'attempt (nécessaire pour `distinct_template_successes`). Tranchée le 2026-06-08 en phase 0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 60                          | **Convention « 1 template = 1 variation canonique »**                                                 | Chaque variation canonique du référentiel (cf. listes V1.a / V1.b / … dans `6e-savoirs.md`) est rédigée comme un `question_template` séparé avec un `template_id` distinct. Le champ JSONB `question_templates.variations[]` (migration 074) sert uniquement à varier les paramétrages aléatoires d'un **même cas pédagogique** (mêmes nombres alternatifs, même geste évalué). La règle « ≥ 2 templates distincts réussis » s'applique sans réinterprétation. Tranchée le 2026-06-08 en phase 0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 61                          | **Cohabitation `theme/domain/subdomain/level` libres + `skill_id` autoritaire**                       | Les champs descriptifs existants `question_templates.theme / domain / subdomain / level / grades` (migration 070) sont **conservés** comme étiquettes libres de classement (utiles pour filtre/recherche prof). Ils ne sont **pas autoritaires** pour le calcul de progression — la source de vérité devient la junction `question_template_skills`. Pas de FK ajoutée vers `skill_themes` / `skill_objectives`, pas de drop. Migration douce, aucun seed existant cassé. Tranchée le 2026-06-08 en phase 0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 62                          | **`needs_reinforcement` retiré du cache (redondant avec `to_review`)**                                | Dans `student_skill_state_a` cache famille A : un seul flag `to_review` pour la décroissance temporelle, défini comme `is_acquired AND (now − last_success_at > 30 jours)`. Visuellement : affichage **atténué** dans les listes. Badge UI 🔁 « À renforcer » dérivé directement de `to_review` (pas de boolean séparé). Compteur agrégé du dashboard calculé à la volée : `COUNT(*) WHERE is_acquired AND to_review`. Tranchée le 2026-06-09.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 63                          | **🆘 « À remédier » étendu — pas de seuil sur l'historique de succès**                                | Définition v1 : `needs_remediation = true SSI capacité non acquise AND échec(s) récent(s) bloquant la règle de rubrique`. Auparavant la définition exigeait « ≥ 1 succès historique » (signal de régression spécifique). Étendu pour couvrir aussi les capacités tentées sans succès mais bloquées — le signal vaut pour la régression **et** le blocage d'apprentissage. Distinction explicite ajoutée en §6.2 entre 🆘 (signal d'urgence) et la liste « à travailler pour passer au rang suivant » (vue de planification, sous-ensemble plus large). Tranchée le 2026-06-09. **Voir aussi décision 64** pour le seuil minimum d'échecs.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 64                          | **Seuil minimum 2 échecs pour déclencher 🆘**                                                         | Définition consolidée : `needs_remediation = true SSI capacité non acquise AND ≥ 2 échecs dans la fenêtre récente`. Fenêtre récente : 3 dernières tentatives pour knowledge_type `capacite_attendue`, 5 dernières pour `automatisme`. Justification : un seul ratage isolé (étourderie, distraction) ne doit pas déclencher une alerte ; deux échecs dans la fenêtre indiquent un véritable blocage. Tranchée le 2026-06-09.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 65                          | **`skill_type` supprimé** (redondant avec les FK)                                                     | Le champ `skill_type` (autrefois `'progressive' \| 'observable'`) duplique l'information déjà portée par les FK (`objective_id` non-null = famille A, `subdimension_id` non-null = famille B). CHECK simplifiée en XOR : `(objective_id IS NOT NULL) <> (subdimension_id IS NOT NULL)`. Famille calculable au runtime depuis les FK. Tranchée le 2026-06-09.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 66                          | **`rubrique` renommé `type`** (libéré par 65)                                                         | Le champ `rubrique` (valeurs `'automatisme' \| 'capacite_attendue'`) est renommé `type`. Le mot « rubrique » restait fidèle au BO 2026 mais peu explicite côté schéma ; « type » est plus court et clair. Le nom était bloqué par `skill_type` ; sa suppression (décision 65) le libère. Valeurs inchangées. Mises à jour : §3, §6.1, §7, `referentiel/6e-savoirs.md`. Le mot « rubrique » reste utilisé dans le texte du doc quand il désigne la convention BO 2026 (« reprend la rubrique BO »). Tranchée le 2026-06-09.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 67                          | **`family` réintroduit en GENERATED column** (`'knowledge' \| 'competence'`)                          | Pour récupérer la lisibilité perdue par la décision 65 sans réintroduire de redondance maintenue à la main, le champ `family` est rajouté en **GENERATED column** Postgres : `family text generated always as (CASE WHEN objective_id IS NOT NULL THEN 'knowledge' ELSE 'competence' END) stored`. Valeurs en anglais alignées sur le codebase. « famille A » / « famille B » restent comme alias courts dans la doc et l'historique. Permet `WHERE family = 'knowledge'` au lieu de `WHERE objective_id IS NOT NULL`. Calculé par Postgres → impossible à désynchroniser. Tranchée le 2026-06-09.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 68                          | **`type` renommé `knowledge_type`** (préfixage par famille)                                           | Le champ `type` (introduit en décision 66) est renommé `knowledge_type` pour expliciter qu'il s'applique uniquement à la famille `'knowledge'` (NULL en famille `'competence'`). Le nom `type` seul laissait croire à un champ générique de tous les skills, alors qu'il est spécifique au régime d'acquisition des capacités knowledge. Valeurs inchangées (`'automatisme' \| 'capacite_attendue'`). Diagramme d'asymétrie hiérarchique knowledge/competence ajouté en §1 pour clarifier la structure. Tranchée le 2026-06-09.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

---

## 11. Questions en suspens

| #       | Question                                                            | Proposition Claude                                                                                                                                                                                                                | Statut                                    |
| ------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| ~~Q1~~  | ~~Pondération des sources prof vs auto (Sacoche : prof × 2)~~       | **Tranché 2026-06-08** : pas de pondération en V1 (cohérent avec modèle B binaire). Une saisie `source='teacher'` famille A est traitée à égalité avec une `source='auto'`. Si besoin pédagogique apparaît, à reconsidérer en V2. | ~~résolu~~                                |
| ~~Q2~~  | ~~Format des `level_indicators`~~                                   | **Caduque** — modèle B sans indicateurs (cf. décision 57)                                                                                                                                                                         | ~~résolu (caduque)~~                      |
| Q3      | Référentiel partagé global ou par prof                              | Partagé global V1 (David rédige)                                                                                                                                                                                                  | À valider                                 |
| Q4      | Niveaux scolaires V1                                                | Cycle 4 + 2nde ? Cycle 4 seul ? Tout lycée ?                                                                                                                                                                                      | **À trancher** (en cours : 6ᵉ démarrée)   |
| ~~Q5~~  | ~~Granularité finale (combien d'objectifs / capacités par niveau)~~ | **Tranché 2026-06-08** : 18 items × 4 capacités = 72 (cf. 6ᵉ ; modèle B fixe la cardinalité)                                                                                                                                      | ~~résolu~~                                |
| ~~Q6~~  | ~~Mapping vers socle commun~~                                       | **Reporté en V2** ✓ tranché                                                                                                                                                                                                       | ~~résolu~~                                |
| Q7      | Versionnement du référentiel (si modification en cours d'année ?)   | Pas de versionnement V1, fige le ref par année scolaire                                                                                                                                                                           | À trancher                                |
| Q8      | UI prof : saisie item par item ou globale ventilée                  | Item par item V1 (Sacoche-style), à enrichir                                                                                                                                                                                      | À détailler                               |
| Q9      | Auto-éval élève — où / comment l'élève la déclare                   | Avant un DS, dans le plan de révision                                                                                                                                                                                             | UX à designer                             |
| ~~Q10~~ | ~~Trame vide BO (cycle 4 + 2nde) à pré-générer~~                    | ~~Proposée par Claude~~                                                                                                                                                                                                           | ✓ en cours (6ᵉ produite)                  |
| ~~Q11~~ | ~~Décay temporel — passage en « à confirmer »~~                     | **Tranché 2026-06-08** : **30 jours** sans réussite → « à revoir » (cf. §3 + §6.1, décision 57)                                                                                                                                   | ~~résolu~~                                |
| ~~Q12~~ | ~~Composantes par compétence math, par niveau~~                     | **Composantes officielles BO 2020 récupérées** (cycle 3 : 21 ; cycle 4 : 26)                                                                                                                                                      | ✓ tranché — voir `college-competences.md` |

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
6. **Tagging des Questions existantes** : associer chaque template à sa capacité (`skill_id` seul, modèle B). Acte de classification objectif — pas de calibration de niveau.
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
- **2026-06-07 (suite 17 — refonte famille A à partir du BO 2026 cycle 3)** : David fournit le PDF `programme-de-math-matiques-pour-le-cycle-3` (BO 2026). Le `6e-savoirs.md` existant (Phase 2) était basé sur BO 2020 + estimations — devenu obsolète. Reconstruction intégrale à partir du BO 2026 avec **Option 3 (champ `rubrique`)** et **Option L (structure littérale)**. Champ `skills.rubrique` ajouté (`'automatisme' | 'capacite_attendue'`, nullable, famille A uniquement) pour préserver la traçabilité BO. Structure : sous-domaine BO = objectif UbuMaths ; sous-headers internes du BO (« Distances », « Cercles », « Médiatrice »… dans Configurations planes ; « Sens quotient », « Opérateur multiplicatif », « Comparer », « Effectuer des opérations », « Pourcentages » dans Les fractions) deviennent des objectifs séparés ; objectifs d'automatismes dédiés (`1.2.0`, `3.1.0`) pour les sous-domaines sous-divisés dont les automatismes BO couvrent l'ensemble. Total 6ᵉ : **25 objectifs / 127 capacités** sur **6 thèmes** (Nombres/calcul, Grandeurs/mesures, Espace/géométrie, OGD/probabilités, Proportionnalité, Pensée informatique). Décision 56 ajoutée. Réécriture complète de `6e-savoirs.md` (indicateurs en placeholder à rédiger par David ultérieurement).

- **2026-06-07 (suite 18 — PIVOT MODÈLE B pour famille A : 4 capacités ordonnées par item)** : après le travail de structuration BO 2026 (suite 17), David rouvre le fond du modèle famille A. Le modèle « 4 paliers d'indicateurs par capacité » s'avère lourd (rédaction de ~500 indicateurs estimés pour la 6ᵉ uniquement) et tend à s'effondrer en pratique vers 4 capacités distinctes empilées. **Décision : adopter le modèle du référentiel personnel 2016 de David** (« échelles descriptives connaissance 6 2016 ») — chaque objectif a **exactement 4 capacités ordonnées par difficulté**, binaires, distinctes. Niveau de l'objectif = rang max acquis. Niveau 3 = « attendu pour tous » (BO), Niveau 4 = expert/approfondissement. **Validation par variations dans les templates** (approche 3) : pas de table d'observables séparée — la diversité du pool de questions taguées sur une capacité incarne les variations. **Règle d'acquisition modulée par rubrique BO** : `capacite_attendue` → ≥ 1 succès sur ≥ 2 templates distincts + aucun échec dans les 3 dernières ; `automatisme` → ≥ 5 succès + ≥ 3 dans les 5 dernières. **Décroissance V1** : > 30 jours sans succès → « à revoir ». **Schéma DB** : drop `level_indicators`, `is_progressive`, `target_level` (table `skills` + junction `question_skills` + table `skill_attempts` + cache `student_skill_state_a`). Refonte `student_skill_state_a` en cache binaire avec `is_acquired`, `total_successes`, `distinct_template_successes`, `to_review`. Conserver `template_id` sur `skill_attempts` pour la règle de couverture. **Tagging questions** simplifié à `skill_id` seul — acte de classification objectif (« cette question teste cette capacité »), pas de calibration subjective de niveau. **Décisions caduques** : 5, 7, 13-15, 18, 19, 22. **Décision ajoutée** : 57. Famille B (cadre canonique 6 compétences) **intacte**. Cible 6ᵉ : ~20 objectifs × 4 capacités = ~80 capacités à rédiger. Prochaine étape : valider avec David la liste des ~20 items et leurs 4 capacités, puis réécrire `6e-savoirs.md`. Handoff de session : `docs/wip/referentiel-handoff.md`.

- **2026-06-09 (suite 20 — micro-ajustement schéma cache famille A)** : David note la redondance entre `student_skill_state_a.to_review` et `student_skill_state_a.needs_reinforcement` — les deux décrivent la même condition (« capacité acquise mais > 30 j sans pratique »). **Décision 62** : suppression de `needs_reinforcement`. Un seul flag `to_review`. Visuellement : capacité atténuée dans les listes. Badge UI 🔁 « À renforcer » et compteur agrégé dérivés à la volée depuis `to_review`. §6.2 et §7 mis à jour.

- **2026-06-09 (suite 24 — diagramme asymétrie + rename `type`→`knowledge_type`)** : David demande à illustrer l'asymétrie hiérarchique knowledge vs competence (l'élève voit l'objectif en knowledge mais la compétence math elle-même en competence ; le parent direct du skill n'est pas au même niveau de la hiérarchie). Diagramme ASCII ajouté en §1 avec les deux arbres (thèmes/objectifs/capacités vs compétences/sous-dimensions/observables) + tableau récapitulatif de l'asymétrie. Et : David note que `type` (renommé en décision 66) est peu explicite — c'est un champ spécifique à la famille knowledge, pas un type général du skill. **Décision 68** : `type` renommé `knowledge_type`. Valeurs inchangées. Préfixage par famille pour clarifier le scope. §3 (table régime), §6.1 (cas knowledge_type=...), §6.2 (commentaire cache), §7 (schéma + CHECK), §10 (décision 64 réécrite avec knowledge_type) mis à jour.

- **2026-06-09 (suite 23 — `family` réintroduit en GENERATED column)** : après la suppression de `skill_type` (décision 65), David souligne qu'il faut quand même un moyen simple de distinguer les deux familles dans le SQL et le code, sans réintroduire la redondance manuelle. **Décision 67** : `family` ajouté en colonne calculée Postgres (`GENERATED ALWAYS AS ... STORED`), valeurs `'knowledge'` (ex-famille A) / `'competence'` (ex-famille B). Lisibilité retrouvée (`WHERE family = 'knowledge'`), zero risque de désynchronisation. « famille A » / « famille B » conservés comme alias courts dans la doc. §1 (table vocabulaire + note de convention), §6.1, §6.1bis, §6.1ter, §7 (schéma + 3 CHECK renommées `chk_skill_knowledge_rang` / `chk_skill_competence_code` / `uq_skill_knowledge_rang`) mis à jour.

- **2026-06-09 (suite 22 — nettoyage schéma `skills` : drop `skill_type`, rename `rubrique`→`type`)** : David questionne le nom « rubrique » (peu explicite, emprunté au BO mais polysémique côté DB) ; propose `type`. Détection d'un conflit avec `skill_type` (famille A/B) déjà présent. Analyse : `skill_type` est en fait redondant avec les FK `objective_id` (A) vs `subdimension_id` (B). **Décision 65** : suppression de `skill_type`. CHECK constraint simplifiée en XOR sur les FK. Famille calculable au runtime via les FK. **Décision 66** : renommage `rubrique`→`type` (libéré par 65). Valeurs inchangées (`'automatisme' \| 'capacite_attendue'`). §1 (table vocabulaire), §3 (régime modulé par type), §6.1 (cas type=...), §6.1bis/§6.1ter/§6.2 (filtres famille via FK), §7 (schéma `skills` simplifié) mis à jour. Décision 32 marquée caduque. Aussi `6e-savoirs.md` aligné.

- **2026-06-09 (suite 21 — clarification 🆘 + extension du seuil + minimum 2 échecs)** : David demande à clarifier dans le doc que 🆘 « À remédier » est un sous-ensemble strict des capacités à travailler (signal d'urgence pédagogique vs vue de planification). Question subsidiaire : faut-il garder le seuil « ≥ 1 succès historique » pour déclencher 🆘 ? **Décision 63** : étendre 🆘 aux capacités tentées sans succès mais bloquées par échec(s) récent(s). Question complémentaire : un seul ratage suffit-il ? **Décision 64** : seuil minimum **2 échecs** dans la fenêtre récente — un ratage isolé (étourderie) ne doit pas alerter. Fenêtre : 3 dernières pour `capacite_attendue`, 5 dernières pour `automatisme`. §2 (tableau badges), §6.2 (drivers d'alerte avec sous-section dédiée + tableau d'exemple sur capacité rang 3) mis à jour. Capacité jamais touchée (0 attempt) reste ◯ Non commencée, pas 🆘 (0 échec < 2). Le signal couvre désormais régression **et** blocage d'apprentissage, sans bruit sur les ratages isolés.

- **2026-06-08 (suite 19 — Phase 0 : nettoyage du design doc avant implémentation)** : revue critique à froid des 4 documents de référence (design doc, cadre canonique famille B, college-competences, 6e-savoirs) ; rapport listant 12 incohérences, 11 ambiguïtés, 14 zones sous-spécifiées (cf. rapport en conversation). **Phase 0 — nettoyages purs effectués** : alignement chiffres 18 items / 72 capacités (§1, §8 mockup, décision 56 partiellement caduque, décision 57 mise à jour) ; réécriture §2 (badges) en binaire (suppression « robustesse < 50 % au niveau visé » caduque) ; réécriture §4 (saisie / aide tuteur) en binaire (suppression « stable/provisoire ») ; harmonisation libellé `🟢 Objectif atteint` (vs ancien « Maîtrisé ») ; clôture Q11 à 30 j ; rature des décisions caduques 6, 7, 13-15, 18, 19, 22 dans le tableau §10 + reformulation des décisions 6, 8, 9, 11, 12, 16, 17, 21, 25, 28, 54 pour aligner vocabulaire et neutraliser le modèle 1-4. **Phase 0 — décisions architecturales tranchées et ajoutées** : décision 58 (`with_help` ignoré dans la règle d'acquisition famille A, juste stocké analytics) ; décision 59 (tagging au niveau template via junction `question_template_skills`, pas au niveau instance) ; décision 60 (convention « 1 template = 1 variation canonique », `variations[]` JSONB réservé aux paramétrages aléatoires d'un même cas pédagogique) ; décision 61 (cohabitation des étiquettes libres `theme/domain/subdomain/level/grades` de `question_templates` + `question_template_skills` autoritaire pour la progression). Schéma DB §7 mis à jour : `question_skills` retirée (caduque), `question_template_skills` introduite. Q1 close à « pas de pondération teacher/auto en V1 ». **Pas d'implémentation démarrée** — le doc est prêt à servir de spec pour la phase 1 (migration DB + seeds).
