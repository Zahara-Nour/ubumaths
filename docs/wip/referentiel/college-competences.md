# Référentiel Mathématiques — Collège — **Famille B : Compétences mathématiques**

> **Niveau scolaire** : collège (6ᵉ + cycle 4 — référentiel partagé pour V1, distinction à introduire ultérieurement).
> **Famille** : B (les 6 compétences mathématiques transversales). La famille A est dans `6e-savoirs.md`.
> **Source canonique** : `docs/wip/referentiel/cadre_evaluation_six_competences_mathematiques.md`. Ce fichier-ci est la **transcription opérationnelle** du cadre — observables par compétence, codes, règles de validation. La justification pédagogique de chaque choix est dans la source canonique.
>
> **Modèle d'évaluation** : codage ternaire `+/–/∅` par tâche, consolidation par observable, règle conjonctive par compétence avec cœur d'excellence. Niveaux du socle : Insuffisante / Fragile / Satisfaisante / Très bonne maîtrise. Détails techniques dans `docs/wip/skills-referentiel-design.md` sections 3 et 6.

---

## Métadonnées

```yaml
niveau_scolaire: college # 6e + cycle 4 partagé pour V1
famille: B
math_competences_count: 6
observables_total: 56 # Chercher 13 + Calculer 13 + Raisonner 8 + Communiquer 6 + Modéliser 8 + Représenter 8
evaluation_model: ternaire_consolidation_regle_conjonctive
source_canonique: docs/wip/referentiel/cadre_evaluation_six_competences_mathematiques.md
date_generation: 2026-06-06
```

---

## Vue élève (synthèse)

| Compétence      | Glose visible élève            | Cœur d'excellence                                |
| --------------- | ------------------------------ | ------------------------------------------------ |
| **Chercher**    | essayer des pistes, persévérer | Réorientation                                    |
| **Modéliser**   | traduire en maths              | Regard critique sur le modèle                    |
| **Représenter** | schémas, tableaux, figures     | Conversion entre registres                       |
| **Raisonner**   | justifier mes affirmations     | Cas général + outil logique + relecture critique |
| **Calculer**    | calculer juste, vérifier       | Contrôle du résultat + calcul littéral           |
| **Communiquer** | expliquer ma démarche          | Dimension dialogique + langage rigoureux         |

---

## Mécanique commune (rappel rapide)

1. **Codage par tâche** : chaque observable du périmètre de la tâche reçoit `+` (réussi en autonomie) ou `–` (non réussi). Hors périmètre : `∅` (implicite, pas de saisie).
2. **Consolidation** : un observable est **acquis** ssi `(count_plus ≥ 2) AND (count_plus > count_minus)` sur toutes les tâches où il était dans le périmètre.
3. **Règle conjonctive** : le niveau du socle est attribué en testant les conditions du haut vers le bas (Très bonne → Satisfaisante → Fragile → Insuffisante). Chaque niveau exige TOUTES ses conditions ; un niveau supérieur inclut les exigences des niveaux inférieurs.
4. **Cœur d'excellence** : aucune accumulation ne compense l'absence du critère définissant verrouillant la Très bonne maîtrise.
5. **Garde-fous** : minimum 2 tâches pour valider un observable, minimum 3 tâches dans le périmètre pour une Très bonne maîtrise. `∅` ne pénalise jamais l'élève.

---

## 1. CHERCHER

> **Glose élève** : _« essayer des pistes, persévérer »_ > **Cœur d'excellence** : la **réorientation** — ne pas s'enfermer dans la première idée.

### Sous-dimensions

- **A — S'approprier le problème** (3 observables)
- **B — S'engager et explorer** (5 observables)
- **C — Conduire et réorienter** (2 observables)
- **D — Mobiliser des ressources** (3 observables)

### Observables — grille élève (1ʳᵉ personne) et grille enseignant

#### A — S'approprier le problème

| Code   | Énoncé élève                                   | Grille enseignant                                                                   |
| ------ | ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| **A1** | Je reformule ce qui est demandé.               | Reformule la question avec ses propres mots, sans recopier l'énoncé.                |
| **A2** | Je trie les informations utiles.               | Distingue les informations utiles des données inutiles ou distractrices.            |
| **A3** | Je produis une représentation pour comprendre. | Construit une représentation (schéma, figure, tableau) pour clarifier la situation. |

#### B — S'engager et explorer

| Code   | Énoncé élève                                  | Grille enseignant                                                          |
| ------ | --------------------------------------------- | -------------------------------------------------------------------------- |
| **B1** | Je produis un premier essai sans aide.        | Produit une première tentative personnelle avant toute demande de méthode. |
| **B2** | J'essaie sur des cas simples.                 | Explore en traitant des cas particuliers ou simplifiés.                    |
| **B3** | J'émets une conjecture.                       | Formule une hypothèse ou une affirmation à vérifier.                       |
| **B4** | J'expérimente pour produire des données.      | Manipule, calcule ou teste pour produire des données exploitables.         |
| **B5** | Je détecte des invariants ou des régularités. | Repère une régularité, un motif ou une propriété qui se répète.            |

#### C — Conduire et réorienter

| Code   | Énoncé élève                                                                        | Grille enseignant                                                                                                    |
| ------ | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **C1** | J'organise ma démarche, par exemple en la découpant en étapes ou en sous-problèmes. | Structure sa recherche de façon visible (étapes ordonnées, sous-problèmes), plutôt que d'accumuler des essais épars. |
| **C2** | Je teste une autre piste quand je suis bloqué.                                      | Face à un blocage, abandonne la voie en cours et engage une autre piste, plutôt que de rester figé.                  |

#### D — Mobiliser des ressources

| Code   | Énoncé élève                                                                                 | Grille enseignant                                                                     |
| ------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **D1** | Je mobilise une connaissance utile (une propriété, une définition, un résultat déjà appris). | Convoque à bon escient une connaissance ponctuelle (propriété, définition, résultat). |
| **D2** | Je mobilise un outil adapté (instrument, logiciel, technique, représentation).               | Met en œuvre un outil adapté (instrument, logiciel, technique, représentation).       |
| **D3** | Je rapproche ce problème d'un problème déjà rencontré.                                       | Reconnaît que la situation entière est analogue à un problème antérieur.              |

### Règle de validation

```
Très bonne maîtrise (✨) — toutes les conditions de Satisfaisante remplies, ET :
  • C2 acquis           (cœur : teste une autre piste quand bloqué)
  • C1 acquis           (organise sa démarche)
  • au moins 1 observable de D acquis

Satisfaisante (🟢) :
  • B1 acquis           (premier essai sans aide → engagement autonome)
  • au moins 2 des 3 observables de A acquis (appropriation solide)
  • au moins 1 observable parmi B2, B3, B4, B5 acquis (exploration effective)

Fragile (🟠) — Satisfaisante non atteint, ET :
  • au moins 1 observable de A acquis (appropriation partielle)
  • au moins 1 observable de B acquis (engagement amorcé)

Insuffisante (◯) : niveau résiduel — aucune des conditions ci-dessus.
```

### Note d'observation

« Chercher » ne s'observe que sur des **problèmes ouverts**, qui laissent l'élève explorer et se réorienter. Une tâche fermée à procédure imposée laisse l'engagement (B) et la conduite (C) en `∅` — et le cœur de la compétence devient inobservable.

---

## 2. CALCULER

> **Glose élève** : _« calculer juste, vérifier »_ > **Cœur d'excellence** : le **contrôle du résultat** ; au collège, le calcul littéral conditionne aussi la maîtrise la plus haute.

### Sous-dimensions

- **A — Choisir une stratégie de calcul** (3 observables)
- **B — Exécuter le calcul** (5 observables)
- **C — Calculer avec des lettres** (3 observables)
- **D — Contrôler le résultat** (2 observables)

### Observables — grille élève et grille enseignant

#### A — Choisir une stratégie de calcul

| Code   | Énoncé élève                                                               | Grille enseignant                                                                                                  |
| ------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **A1** | Je choisis un mode de calcul adapté (mental, posé, calculatrice, tableur). | Choisit un mode de calcul adapté à la situation (mental, posé, instrumenté) plutôt qu'un mode imposé par habitude. |
| **A2** | Je décide si un résultat exact ou approché est nécessaire.                 | Juge si la situation appelle un résultat exact ou une valeur approchée, et tranche en conséquence.                 |
| **A3** | J'organise un calcul en plusieurs étapes.                                  | Décompose un calcul complexe en étapes ordonnées, avec des résultats intermédiaires.                               |

#### B — Exécuter le calcul

| Code   | Énoncé élève                                                                       | Grille enseignant                                                                                                             |
| ------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **B1** | Je calcule de tête de façon sûre.                                                  | Effectue un calcul mental fiable sur les nombres en jeu.                                                                      |
| **B2** | Je pose et j'effectue une opération correctement.                                  | Pose et exécute une opération écrite sans erreur de technique.                                                                |
| **B3** | J'utilise la calculatrice ou le tableur pour écrire un calcul et lire le résultat. | Écrit un calcul à la calculatrice ou au tableur, en lit le résultat, et y recourt à bon escient.                              |
| **B4** | J'applique une procédure ou un algorithme connu.                                   | Met en œuvre une procédure ou un algorithme connu (conversion, formule, suite d'opérations).                                  |
| **B5** | Je mène mes calculs en gérant correctement les unités (conversions, cohérence).    | Gère les unités au cours du calcul : convertit, suit la cohérence dimensionnelle, n'additionne pas des grandeurs hétérogènes. |

#### C — Calculer avec des lettres

| Code   | Énoncé élève                                                              | Grille enseignant                                                                |
| ------ | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **C1** | Je calcule la valeur d'une expression en remplaçant les lettres.          | Substitue des valeurs aux lettres et calcule l'expression numérique obtenue.     |
| **C2** | Je transforme une expression littérale (développer, factoriser, réduire). | Transforme une expression littérale (développe, factorise, réduit) sans erreur.  |
| **C3** | Je calcule avec des lettres pour établir une expression générale.         | Conduit un calcul littéral pour produire une expression ou une formule générale. |

#### D — Contrôler le résultat

| Code   | Énoncé élève                                                                    | Grille enseignant                                                                        |
| ------ | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **D1** | Je vérifie que mon résultat est plausible (ordre de grandeur, signe, unité).    | Apprécie la plausibilité du résultat : ordre de grandeur, signe, unité, taille attendue. |
| **D2** | Je contrôle mon résultat par un autre moyen (opération inverse, second calcul). | Vérifie par un moyen indépendant (opération inverse, autre méthode, second calcul).      |

### Règle de validation

```
Très bonne maîtrise (✨) — toutes les conditions de Satisfaisante remplies, ET :
  • contrôle systématique : D1 ET D2 acquis              (cœur)
  • exécution flexible    : au moins 3 des 5 de B acquis
  • stratégie affirmée    : au moins 2 des 3 de A acquis
  • calcul littéral       : au moins 1 observable de C acquis (C1, C2 ou C3)

Satisfaisante (🟢) :
  • exécution fiable      : au moins 2 des 5 de B acquis
  • choix d'une stratégie : au moins 1 observable de A acquis
  • contrôle minimal      : au moins 1 observable de D acquis

Fragile (🟠) — Satisfaisante non atteint, ET :
  • au moins 1 observable de B acquis (calcule mais partiel ou peu fiable)

Insuffisante (◯) : niveau résiduel.
```

### Note d'observation

Concevoir des tâches qui **laissent le choix du mode ouvert**, mettent des grandeurs en jeu (pour les unités) et rendent le contrôle utile. Le calcul littéral (C) verrouille la Très bonne maîtrise : prévoir une composante algébrique au périmètre dès qu'il s'agit de positionner un élève au plus haut niveau.

**6ᵉ** : la sous-dimension C est largement en `∅` (le calcul littéral n'est pas encore central). Le niveau Très bonne maîtrise est donc difficile à atteindre en 6ᵉ — ce qui est cohérent avec la progression collège.

---

## 3. RAISONNER

> **Glose élève** : _« justifier mes affirmations »_ > **Cœur d'excellence** : le **raisonnement sur le cas général**, appuyé par un outil logique et la relecture critique.

### Sous-dimensions

- **A — Organiser** (1 observable)
- **B — Justifier et démontrer** (2 observables)
- **C — Utiliser des outils logiques** (3 observables)
- **D — Valider et critiquer** (2 observables)

### Observables — grille élève et grille enseignant

#### A — Organiser

| Code   | Énoncé élève                                                            | Grille enseignant                                                                                 |
| ------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **A1** | J'organise mon raisonnement en étapes enchaînées dans un ordre logique. | Enchaîne les étapes de son raisonnement dans un ordre où chacune prépare logiquement la suivante. |

#### B — Justifier et démontrer

| Code   | Énoncé élève                                                         | Grille enseignant                                                                                                     |
| ------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **B1** | Je justifie mes affirmations en m'appuyant sur des résultats connus. | Fonde chaque affirmation sur un résultat établi (propriété, théorème, définition, donnée), et en tire la conséquence. |
| **B2** | Je raisonne sur le cas général, pas seulement sur des exemples.      | Conduit son raisonnement sur un objet ou un cas général, sans se limiter à la vérification sur des exemples.          |

#### C — Utiliser des outils logiques

| Code   | Énoncé élève                                                                                                     | Grille enseignant                                                                                                                  |
| ------ | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **C1** | Je trouve un contre-exemple pour montrer qu'une affirmation est fausse.                                          | Produit un contre-exemple pertinent pour réfuter une affirmation.                                                                  |
| **C2** | J'utilise les outils de la logique : disjonction de cas, « si… alors », contraposée, raisonnement par l'absurde. | Mobilise un mode de raisonnement logique : disjonction de cas, implication « si… alors », contraposée, raisonnement par l'absurde. |
| **C3** | Je distingue une propriété de sa réciproque, et je ne confonds pas les deux sens d'une implication.              | Distingue une propriété de sa réciproque ; n'infère pas l'une de l'autre sans justification.                                       |

#### D — Valider et critiquer

| Code   | Énoncé élève                                                                       | Grille enseignant                                                                                         |
| ------ | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **D1** | Je distingue ce qui est démontré de ce qui est seulement vérifié sur des exemples. | Distingue une vérification empirique (sur des exemples) d'une démonstration (valable en général).         |
| **D2** | Je relis un raisonnement d'un œil critique pour repérer et corriger les erreurs.   | Relit un raisonnement — le sien ou celui d'autrui — pour y détecter et corriger une erreur ou une faille. |

### Règle de validation

```
Très bonne maîtrise (✨) — toutes les conditions de Satisfaisante remplies, ET :
  • généralité déductive : B2 acquis                    (cœur)
  • recul critique       : D2 acquis
  • outillage logique    : au moins 1 observable de C acquis (C1, C2 ou C3)

Satisfaisante (🟢) :
  • raisonnement organisé : A1 acquis
  • affirmations fondées  : B1 acquis

Fragile (🟠) — Satisfaisante non atteint, ET :
  • au moins 1 observable parmi A1, B1, D1 acquis
    (amorce d'organisation, ou de justification, ou lucidité sur la valeur d'un exemple)

Insuffisante (◯) : niveau résiduel.
```

### Note d'observation

Il faut des consignes qui **appellent une justification** (« démontre », « est-ce toujours vrai ? »), faute de quoi B, C et D restent en `∅`. Les outils logiques (C) relèvent du collège : un C entièrement hors champ plafonne le niveau à « Satisfaisante », ce qui est assumé. En **6ᵉ**, C2 et C3 (contraposée, raisonnement par l'absurde, réciproque) sont en pratique en `∅` — accessibles plutôt en cycle 4.

---

## 4. COMMUNIQUER

> **Glose élève** : _« expliquer ma démarche »_ > **Cœur d'excellence** : la **dimension dialogique** — comprendre autrui et argumenter — servie par un langage rigoureux.

### Sous-dimensions

- **A — Employer un langage mathématique correct** (2 observables)
- **B — Expliquer ma démarche** (2 observables)
- **C — Comprendre et échanger** (2 observables)

### Observables — grille élève et grille enseignant

#### A — Employer un langage mathématique correct

| Code   | Énoncé élève                                          | Grille enseignant                                                                                |
| ------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **A1** | J'emploie le vocabulaire mathématique précis.         | Emploie le vocabulaire mathématique exact et à propos (et non un terme approximatif ou courant). |
| **A2** | J'utilise correctement les symboles et les notations. | Écrit symboles et notations correctement (signes, parenthèses, égalités, unités).                |

#### B — Expliquer ma démarche

| Code   | Énoncé élève                                                                     | Grille enseignant                                                                                                    |
| ------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **B1** | J'explique ma démarche ou mon résultat par écrit, de façon claire et structurée. | Rédige une explication claire et structurée de sa démarche ou de son résultat, compréhensible sans commentaire oral. |
| **B2** | J'explique ma démarche à l'oral, de façon claire et structurée.                  | Expose oralement sa démarche de façon claire, structurée et audible.                                                 |

#### C — Comprendre et échanger

| Code   | Énoncé élève                                                                    | Grille enseignant                                                                        |
| ------ | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **C1** | Je reformule ou je questionne pour clarifier.                                   | Reformule ce qu'il a compris, ou pose une question pertinente pour lever une ambiguïté.  |
| **C2** | J'argumente dans l'échange : je défends mon point et je réponds aux objections. | Argumente dans l'échange : défend sa position, prend en compte et répond aux objections. |

### Règle de validation

```
Très bonne maîtrise (✨) — toutes les conditions de Satisfaisante remplies, ET :
  • échange dialogique : C1 ET C2 acquis      (cœur)
  • langage rigoureux  : A1 ET A2 acquis

Satisfaisante (🟢) :
  • expression claire : au moins 1 observable de B acquis (B1 ou B2)
  • langage correct   : au moins 1 observable de A acquis

Fragile (🟠) — Satisfaisante non atteint, ET :
  • au moins 1 observable de B OU de A acquis
    (communique en partie : explication sans langage correct, ou langage correct sans explication aboutie)

Insuffisante (◯) : niveau résiduel.
```

### Frontière avec les autres compétences

- **Raisonner** juge si le raisonnement est **valide** ; **Communiquer** juge s'il est **clairement et correctement exposé**. Les deux sont indépendants : un raisonnement valide peut être inintelligible (Raisonner `+`, Communiquer `–`) ; un raisonnement faux peut être parfaitement exposé (Communiquer `+`, Raisonner `–`).
- **Représenter** : produire un graphique ou un schéma _comme objet mathématique_ relève de Représenter ; son **usage pour rendre une explication intelligible** relève de la clarté de l'exposé (Communiquer B).

### Note d'observation

La sous-dimension dialogique (C) ne s'observe que dans des **situations d'oral et d'échange**. Sans elles, C reste en `∅` et la Très bonne maîtrise est inatteignable : prévoir exposés, débats ou explications entre pairs est la condition pour évaluer le cœur de la compétence.

---

## 5. MODÉLISER

> **Glose élève** : _« traduire en maths »_ > **Cœur d'excellence** : le **regard critique sur le modèle** — le confronter au réel, en voir les limites, l'ajuster.

### Sous-dimensions

- **A — Mathématiser la situation** (3 observables — du réel vers les maths)
- **B — Revenir à la situation réelle** (2 observables — des maths vers le réel)
- **C — Valider et ajuster le modèle** (3 observables)

### Observables — grille élève et grille enseignant

#### A — Mathématiser la situation

| Code   | Énoncé élève                                                                          | Grille enseignant                                                                                                                                                                        |
| ------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A1** | Je tente de traduire la situation en mathématiques.                                   | Amorce un traitement mathématique de la situation : quantifie, esquisse une mise en équation ou un schéma, même imparfait ou inadapté.                                                   |
| **A2** | J'identifie les grandeurs et les relations utiles, et je néglige ce qui ne l'est pas. | Sélectionne les grandeurs et relations pertinentes, écarte le superflu, pose au besoin des hypothèses simplificatrices.                                                                  |
| **A3** | Je construis un modèle mathématique fidèle à la situation.                            | Aboutit à un modèle mathématique fidèle à la situation : les grandeurs et les relations du réel y sont correctement rendues (équation, fonction, configuration, modèle probabiliste...). |

#### B — Revenir à la situation réelle

| Code   | Énoncé élève                                                            | Grille enseignant                                                                                              |
| ------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **B1** | J'interprète le résultat mathématique dans le contexte de la situation. | Réexprime le résultat mathématique dans les termes de la situation réelle (et non comme un nombre nu).         |
| **B2** | Je vérifie que ma réponse est vraisemblable dans la situation.          | Apprécie la plausibilité concrète du résultat (ordre de grandeur, sens physique, cohérence avec la situation). |

#### C — Valider et ajuster le modèle

| Code   | Énoncé élève                                                          | Grille enseignant                                                                                  |
| ------ | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **C1** | Je confronte le modèle à la réalité et je le valide ou je l'invalide. | Confronte le modèle aux faits et juge s'il convient : le valide ou l'invalide.                     |
| **C2** | J'identifie les hypothèses et les limites du modèle.                  | Explicite les hypothèses retenues et les limites du modèle (domaine de validité, simplifications). |
| **C3** | J'ajuste le modèle ou j'en propose un meilleur.                       | Corrige le modèle, l'affine ou en propose un plus pertinent.                                       |

### Règle de validation

```
Très bonne maîtrise (✨) — toutes les conditions de Satisfaisante remplies, ET :
  • contrôle du retour     : B2 acquis
  • validation du modèle   : C1 acquis                       (cœur)
  • examen critique        : au moins 1 parmi C2 et C3 acquis

Satisfaisante (🟢) :
  • mathématisation : A2 acquis ET A3 acquis (identifie grandeurs/relations + modèle adapté)
  • retour au réel  : B1 acquis (interprète dans le contexte)

Fragile (🟠) — Satisfaisante non atteint, ET :
  • au moins 1 observable de A acquis (amorce une mathématisation)

Insuffisante (◯) : niveau résiduel.
```

### Note d'observation

« Modéliser » suppose de **vraies situations réelles** à mathématiser puis à valider — pas des énoncés déjà mis en équation. Sans confrontation au réel, la sous-dimension critique (C), qui porte l'excellence, reste en `∅`.

---

## 6. REPRÉSENTER

> **Glose élève** : _« schémas, tableaux, figures »_ > **Cœur d'excellence** : la **conversion entre registres** et leur coordination (au sens de Duval).

### Sous-dimensions

- **A — Lire et interpréter** (2 observables)
- **B — Produire une représentation** (2 observables)
- **C — Convertir et mettre en relation** (2 observables)
- **D — Choisir et exploiter** (2 observables)

### Observables — grille élève et grille enseignant

#### A — Lire et interpréter

| Code   | Énoncé élève                                                                                   | Grille enseignant                                                                                                       |
| ------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **A1** | Je lis une représentation pour en extraire une information.                                    | Extrait une information exacte d'une représentation donnée (graphique, tableau, figure, écriture).                      |
| **A2** | J'interprète une représentation : je comprends ce qu'elle décrit, au-delà de la lecture brute. | Dégage la signification de la représentation — ce qu'elle décrit, sa tendance, sa structure — au-delà de la valeur lue. |

#### B — Produire une représentation

| Code   | Énoncé élève                                                                            | Grille enseignant                                                                                                                                                       |
| ------ | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1** | Ma représentation est correcte sur la forme (codages, en-têtes, échelle, perspective…). | Produit une représentation correcte sur la forme : codages sur figure, en-têtes et unités d'un tableau, axes / échelle / légende d'un graphique, règles de perspective. |
| **B2** | Ma représentation est fidèle à l'objet ou aux données représentés.                      | Produit une représentation fidèle à l'objet ou aux données : ce qui est représenté correspond à ce qui devait l'être.                                                   |

#### C — Convertir et mettre en relation

| Code   | Énoncé élève                                                                                     | Grille enseignant                                                                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C1** | Je passe d'une représentation à une autre du même objet.                                         | Convertit une représentation en une autre du même objet, sans en altérer le sens (formule ↔ courbe, tableau ↔ graphique, figure ↔ coordonnées...). |
| **C2** | Je mets en relation plusieurs représentations du même objet et je contrôle qu'elles s'accordent. | Fait correspondre plusieurs représentations du même objet et vérifie leur cohérence mutuelle.                                                         |

#### D — Choisir et exploiter

| Code   | Énoncé élève                                                                           | Grille enseignant                                                                                                  |
| ------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **D1** | Je choisis la représentation la plus adaptée, au besoin en en comparant plusieurs.     | Choisit la représentation qui rend le problème le plus traitable, le cas échéant après en avoir comparé plusieurs. |
| **D2** | Je m'appuie sur une représentation pour faire avancer mon travail (recherche, calcul). | Mobilise une représentation comme appui pour progresser (orienter une recherche, conduire un calcul).              |

### Règle de validation

```
Très bonne maîtrise (✨) — toutes les conditions de Satisfaisante remplies, ET :
  • conversion              : C1 acquis                       (cœur, partie 1)
  • coordination            : C2 acquis                       (cœur, partie 2)
  • déploiement stratégique : au moins 1 observable de D acquis

Satisfaisante (🟢) :
  • interprétation       : A2 acquis (interprète au-delà de la lecture brute)
  • production correcte  : B1 ET B2 acquis (forme et fond)

Fragile (🟠) — Satisfaisante non atteint, ET :
  • au moins 1 observable de A OU de B acquis (lit ou produit partiellement)

Insuffisante (◯) : niveau résiduel.
```

### Note d'observation

La conversion (C), cœur de la compétence, ne s'observe que dans des tâches **mettant plusieurs registres en jeu**. Une tâche à représentation unique laisse C en `∅` et plafonne le niveau à « Satisfaisante ».

---

## La distinction décisive : **Modéliser vs Représenter**

C'est la confusion la plus fréquente du référentiel.

|                     | **Modéliser**                                                                                               | **Représenter**                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Frontière           | franchit la **frontière réel ↔ math**                                                                      | reste **à l'intérieur des maths**                                                                                 |
| Geste               | traduire une situation **concrète** en objet mathématique, puis revenir au réel pour interpréter et valider | passer d'un **registre** à un autre d'un **même objet mathématique** (au sens des registres sémiotiques de Duval) |
| Question            | _« Comment capter cette situation en maths, et le résultat a-t-il un sens dans la situation ? »_            | _« Comment exprimer cet objet sous différentes formes et passer de l'une à l'autre ? »_                           |
| Critère de fidélité | au **réel**                                                                                                 | à l'**objet ou aux données**                                                                                      |

**Exemple illustratif** — une cuve qui se remplit de 3 litres par minute :

- Passer de la situation à _V(t) = 3t_ (décider que le débit constant se traduit par une proportionnalité) → **Modéliser** (réel → math). Juger que ce modèle ignore le débordement, et le corriger → **Modéliser** (validation).
- Une fois _V(t) = 3t_ posée : en tracer la courbe, en dresser un tableau de valeurs, lire la courbe (passer formule ↔ tableau ↔ graphique) → **Représenter** (registre → registre, tout en mathématiques).

**Règle de codage** : dans une tâche à périmètre mixte, on s'appuie sur le **périmètre déclaré** pour décider à quelle compétence rattacher chaque observation. Une même action n'est jamais codée dans les deux — la saisie par périmètre l'en empêche.

---

## Chevauchements assumés (note du cadre canonique)

L'IGÉSR assume explicitement que « des cas de chevauchement entre compétences peuvent se rencontrer ». Quelques cas notables :

- **Trier les informations** : Chercher A2 et Modéliser A2 partagent ce geste. Chercher trie les _informations_ d'un problème ; Modéliser sélectionne les _grandeurs du réel_ à faire entrer dans un modèle (avec hypothèses simplificatrices). Le **périmètre déclaré** de la tâche tranche.
- **Conjecture (Chercher) vs preuve (Raisonner)** : émettre une hypothèse relève de Chercher (B3) ; la prouver ou la réfuter relève de Raisonner.
- **Clarté de l'exposition (Communiquer) vs validité du raisonnement (Raisonner)** : exposer clairement un raisonnement faux donne Communiquer `+` et Raisonner `–` ; exposer un raisonnement valide mais inintelligible donne l'inverse.

---

## Pour aller plus loin

- Pour les **justifications pédagogiques** détaillées de chaque observable, les **notes d'arbitrage** sur les choix de fusion / séparation, et les **frontières** entre compétences : voir le cadre canonique `cadre_evaluation_six_competences_mathematiques.md`.
- Pour le **modèle de données**, l'algorithme de consolidation et les caches : voir `docs/wip/skills-referentiel-design.md` (sections 3, 6, 7).
- Pour le **vocabulaire fixé** (sous-dimensions, observables, codes, périmètre) : voir le design doc section 1.

## Récapitulatif

| Compétence  | Sous-dim. | Observables        | Cœur                                                             |
| ----------- | --------- | ------------------ | ---------------------------------------------------------------- |
| Chercher    | A B C D   | 13                 | C2 (réorientation) + C1 (organisation) + au moins 1 de D         |
| Calculer    | A B C D   | 13                 | D1 ET D2 (contrôle) + 3 de B + 2 de A + 1 de C (calcul littéral) |
| Raisonner   | A B C D   | 8                  | B2 (cas général) + D2 (relecture critique) + 1 de C              |
| Communiquer | A B C     | 6                  | C1 ET C2 (dialogue) + A1 ET A2 (langage rigoureux)               |
| Modéliser   | A B C     | 8                  | C1 (validation modèle) + B2 (plausibilité) + 1 parmi C2/C3       |
| Représenter | A B C D   | 8                  | C1 ET C2 (conversion + coordination) + 1 de D                    |
| **Total**   | —         | **56 observables** |                                                                  |
