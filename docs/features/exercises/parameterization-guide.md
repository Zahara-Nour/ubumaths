# Guide de Paramétrisation des Exercices

Guide complet pour créer des exercices paramétrés avec des valeurs aléatoires et des calculs dynamiques.

🆕 **2025-11-25** - Ajout des modificateurs d'évaluation pour contrôler le format de sortie des expressions
🆕 **2025-10-27** - Système de paramétrisation complet avec générateur d'instances et trois modes de distribution

---

## Table des matières

1. [Introduction](#introduction)
2. [Démarrage rapide](#démarrage-rapide)
3. [Comprendre les variables](#comprendre-les-variables)
4. [Référence de syntaxe](#référence-de-syntaxe)
5. [Modes de distribution](#modes-de-distribution)
6. [Exemples détaillés](#exemples-détaillés)
7. [Fonctionnalités avancées](#fonctionnalités-avancées)
8. [Bonnes pratiques](#bonnes-pratiques)
9. [Dépannage](#dépannage)
10. [Migration d'exercices statiques](#migration-dexercices-statiques)

---

## Introduction

### Qu'est-ce que la paramétrisation ?

La **paramétrisation** permet de créer des exercices avec des valeurs qui changent automatiquement. Au lieu d'écrire "Calculez 5 + 3", vous écrivez "Calculez {{a}} + {{b}}" où `a` et `b` sont des variables qui génèrent des nombres aléatoires.

### Pourquoi utiliser la paramétrisation ?

**Avantages pour les enseignants** :

- ✅ Créez un exercice, générez des milliers de variantes
- ✅ Évitez la tricherie (chaque élève a des valeurs différentes)
- ✅ Permettez aux élèves de s'entraîner indéfiniment
- ✅ Générez automatiquement les corrections avec les bonnes valeurs

**Avantages pour les élèves** :

- ✅ Pratique illimitée avec des problèmes toujours nouveaux
- ✅ Exercices personnalisés adaptés à leur niveau
- ✅ Corrections automatiques avec leurs valeurs spécifiques

### Types d'exercices adaptés

**Excellents candidats** :

- Calculs arithmétiques (addition, soustraction, multiplication, division)
- Géométrie avec dimensions variables (aires, périmètres, volumes)
- Algèbre (résolution d'équations, factorisation)
- Fractions (simplification, opérations)
- Pourcentages et proportions
- Conversions d'unités

**Moins adaptés** :

- Exercices narratifs complexes
- Démonstrations géométriques théoriques
- Questions à développement libre
- Problèmes nécessitant un contexte spécifique

---

## Démarrage rapide

### Créer votre premier exercice paramétré (3 minutes)

**Étape 1 : Accédez à la création d'exercice**

Naviguez vers `/dashboard/teacher/exercises` et cliquez sur "Créer un exercice".

**Étape 2 : Remplissez les métadonnées**

```
Titre : Pratique d'addition
Difficulté : 1 (Facile)
Sujet : Arithmétique
```

**Étape 3 : Ouvrez la section Variables**

Cliquez sur "Variables" pour déplier la section de paramétrisation.

**Étape 4 : Ajoutez des variables**

Cliquez sur "Ajouter une variable" deux fois et remplissez :

```
Variable 1 :
  Nom : a
  Expression : {{1..20}}

Variable 2 :
  Nom : b
  Expression : {{1..20}}
```

**Étape 5 : Écrivez l'énoncé avec les variables**

Dans l'éditeur d'énoncé :

```markdown
Calculez : ${{a}} + {{b}}$
```

**Étape 6 : Écrivez la solution**

Dans l'éditeur de solution :

```markdown
La réponse est : ${{eval:{{a}}+{{b}}}}$
```

**Étape 7 : Choisissez le mode de distribution**

Sélectionnez "À la demande" pour permettre aux élèves de générer de nouveaux problèmes.

**Étape 8 : Sauvegardez**

Cliquez sur "Sauvegarder". Votre exercice est prêt !

**Résultat** :
Chaque élève verra des valeurs différentes, par exemple :

- Élève 1 : "Calculez : 7 + 3" → Réponse : 10
- Élève 2 : "Calculez : 15 + 8" → Réponse : 23

---

## Comprendre les variables

### Qu'est-ce qu'une variable ?

Une **variable** est un nom qui représente une valeur. Cette valeur peut être :

- Un nombre fixe : `5`
- Un nombre aléatoire : `{{1..10}}`
- Le résultat d'un calcul : `{{eval:a+b}}`
- Une référence à une autre variable : `{{a}}`

### Ordre de déclaration

**Important** : Les variables sont résolues dans l'ordre de déclaration. Une variable ne peut utiliser que les variables définies **avant** elle.

**✅ Correct** :

```
Variable 1 : a = {{1..10}}
Variable 2 : b = {{1..10}}
Variable 3 : somme = {{eval:{{a}}+{{b}}}}
```

**❌ Incorrect** :

```
Variable 1 : somme = {{eval:{{a}}+{{b}}}}  ← Erreur ! a et b n'existent pas encore
Variable 2 : a = {{1..10}}
Variable 3 : b = {{1..10}}
```

### Noms de variables

**Règles** :

- Lettres, chiffres et underscore uniquement
- Pas d'espaces
- Sensible à la casse (case-sensitive)

**✅ Valides** :

- `a`, `x`, `num1`, `cote_carre`, `angleA`, `base_triangle`

**❌ Invalides** :

- `côté carré` (espace)
- `angle-A` (tiret)
- `1var` (commence par un chiffre)

### Utilisation dans le contenu

Une fois définies, utilisez vos variables dans l'énoncé et la solution avec `{{nomVariable}}` :

```markdown
Énoncé : Un rectangle a une longueur de {{longueur}} cm et une largeur de {{largeur}} cm.

Solution : Aire = {{longueur}} × {{largeur}} = {{aire}} cm²
```

---

## Référence de syntaxe

### 1. Référence de variable : `{{nom}}`

**Usage** : Insérer la valeur d'une variable définie précédemment.

**Exemples** :

```markdown
La valeur de x est {{x}}
Calculez {{a}} + {{b}}
Si $a = {{a}}$ alors...
```

### 2. Nombre aléatoire entier : `{{min-max}}`

**Syntaxe** : `{{min-max}}` ou `{{random:min-max}}`

**Génère** : Un nombre entier aléatoire entre min et max (inclus).

**Exemples** :

```
{{1..10}}           → Génère 1, 2, 3, ..., 9, ou 10
{{random:5-15}}    → Même chose (forme explicite)
{{-5..5}}           → Génère -5, -4, ..., 4, ou 5
{{random:100-200}} → Génère entre 100 et 200
```

**Avec variables** :

```
Variable 1 : min = 1
Variable 2 : max = 100
Variable 3 : x = {{{{min}}-{{max}}}}  ← Utilise les valeurs de min et max
```

### 3. Nombre décimal par chiffres : `{{avant.après}}`

**Syntaxe** : `{{chiffresAvant.chiffresAprès}}` ou `{{random:avant.après}}`

**Génère** : Un nombre décimal avec le nombre de chiffres spécifié avant et après la virgule.

**Exemples** :

```
{{2.3}}         → Exemple : 45.123 (2 chiffres avant, 3 après)
{{random:1.2}}  → Exemple : 7.89 (1 chiffre avant, 2 après)
{{3.1}}         → Exemple : 234.5 (3 chiffres avant, 1 après)
```

**Note** : Les chiffres avant peuvent être zéro (ex : `{{2.3}}` peut donner 04.567).

### 4. Nombre décimal avec intervalle : `{{min-max:pas}}`

**Syntaxe** : `{{min-max:pas}}` ou `{{random:min-max:pas}}`

**Génère** : Un nombre décimal dans l'intervalle [min, max] par pas de `pas`.

**Exemples** :

```
{{0.5..9.99:0.01}}     → 0.50, 0.51, ..., 9.98, 9.99
{{random:0-1:0.1}}    → 0.0, 0.1, 0.2, ..., 0.9, 1.0
{{2..10:0.5}}          → 2.0, 2.5, 3.0, ..., 9.5, 10.0
```

### 5. Exclusions : `{{base!exclusions}}`

**Syntaxe** : `{{base!exclusion1,exclusion2,...}}`

**Usage** : Exclure certaines valeurs d'une génération aléatoire.

#### Exclure une valeur

```
{{1..10!5}}           → 1..10 sauf 5
{{random:1-20!7}}    → 1..20 sauf 7
{{1..100!{{a}}}}      → 1..100 sauf la valeur de a
```

#### Exclure plusieurs valeurs

```
{{1..20!5,7}}         → 1..20 sauf 5 et 7
{{1..50!10,15,20}}    → 1..50 sauf 10, 15 et 20
```

#### Exclure un intervalle

```
{{1..100!40-60}}      → 1..100 sauf 40 à 60
{{random:1-50!10-20}} → 1..50 sauf 10 à 20
```

#### Exclure mixte (valeurs + intervalles)

```
{{1..100!5,10-20,50}} → 1..100 sauf 5, 10-20, et 50
{{1..50!{{a}},{{b}}-{{c}}}} → Exclusions avec variables
```

### 6. Évaluation d'expression : `{{eval:expression}}`

**Syntaxe** : `{{eval:expression mathématique}}` ou `{{eval:expression|modifiers}}`

**Usage** : Calculer une expression mathématique en utilisant les valeurs des variables.

**Important** : Toutes les références `{{var}}` dans l'expression sont **remplacées par leurs valeurs** avant le calcul.

**Exemples simples** :

```
{{eval:5+3}}              → "8"
{{eval:2*7}}              → "14"
{{eval:10/2}}             → "5"
{{eval:2^3}}              → "8" (puissance)
```

**Avec variables** :

```
Supposons : a = 7, b = 3

{{eval:{{a}}+{{b}}}}      → "10"
{{eval:{{a}}*{{b}}}}      → "21"
{{eval:{{a}}^2}}          → "49"
{{eval:({{a}}+{{b}})/2}}  → "5"
```

**Fonctions mathématiques** :

```
{{eval:Math.sqrt({{a}})}}           → Racine carrée
{{eval:Math.abs({{a}})}}            → Valeur absolue
{{eval:Math.round({{a}})}}          → Arrondi
{{eval:Math.floor({{a}})}}          → Plancher
{{eval:Math.ceil({{a}})}}           → Plafond
```

**Expressions complexes** :

```
{{eval:({{b}})^2 - 4*{{a}}*{{c}}}}  → Discriminant
{{eval:Math.sqrt({{a}}^2 + {{b}}^2)}} → Hypoténuse
```

### Modificateurs d'évaluation (🆕 2025-11-25)

Les **modificateurs** permettent de contrôler le format de sortie d'une expression `{{eval:}}`.

**Syntaxe** : `{{eval:expression|modifiers}}`

Les modificateurs se placent après l'expression, séparés par une barre verticale `|`. Plusieurs modificateurs peuvent être combinés avec des virgules.

#### Modificateurs disponibles

| Modificateur | Forme longue | Description                                    | Exemple                        |
| ------------ | ------------ | ---------------------------------------------- | ------------------------------ |
| `d`          | `decimal`    | Force la sortie décimale                       | `{{eval:1/3\|d}}` → "0.333..." |
| `+`          | `positive`   | Ajoute le signe + pour les résultats positifs  | `{{eval:5\|+}}` → "+5"         |
| `()`         | `bracket`    | Entoure les résultats négatifs de parenthèses  | `{{eval:-3\|()}}` → "(-3)"     |
| `'`          | `derivative` | Dérive l'expression avant évaluation (réservé) | À venir                        |

#### Exemples d'utilisation

**Forcer la sortie décimale** :

```markdown
Variables :
a = 1
b = 3
quotient = {{eval:{{a}}/{{b}}|d}}

Énoncé : Le quotient de {{a}} par {{b}} est {{quotient}}
→ "Le quotient de 1 par 3 est 0.333..."
```

**Ajouter le signe + pour les positifs** :

```markdown
Variables :
x = 8
variation = {{eval:{{x}}-5|+}}

Énoncé : La variation est de {{variation}}
→ "La variation est de +3"
```

**Utiliser des parenthèses pour les négatifs** :

```markdown
Variables :
x = -5
valeur = {{eval:{{x}}|()}}

Énoncé : La valeur est {{valeur}}
→ "La valeur est (-5)"
```

**Combiner plusieurs modificateurs** :

```markdown
Variables :
a = 3
b = 2
resultat = {{eval:{{a}}\*{{b}}|d,+}}

Énoncé : Le résultat est {{resultat}}
→ "Le résultat est +6" (décimal si nécessaire + signe positif)
```

#### Cas d'usage pratiques

**1. Températures avec signes** :

```markdown
Variables :
temp = {{-10..30}}
temp_signee = {{eval:{{temp}}|+}}

Énoncé : La température est de {{temp_signee}}°C
→ Génère : "+15°C" ou "-5°C"
```

**2. Équations avec coefficients signés** :

```markdown
Variables :
a = {{-5..5!0}}
b = {{-10..10}}
b_signe = {{eval:{{b}}|+,()}}

Énoncé : Résolvez : ${{a}}x {{b_signe}} = 0$
→ Si b = -3 : "Résolvez : 2x + (-3) = 0"
→ Si b = 5 : "Résolvez : 2x +5 = 0"
```

**3. Divisions exactes ou décimales** :

```markdown
Variables :
numerateur = {{1..10}}
denominateur = {{1..10!0}}
division = {{eval:{{numerateur}}/{{denominateur}}|d}}

Énoncé : Calculez {{numerateur}} ÷ {{denominateur}} = {{division}}
→ Affiche toujours un résultat décimal : "0.5" au lieu de "1/2"
```

#### Notes importantes

⚠️ **LaTeX et la barre verticale** :

Si votre expression contient des barres verticales pour la valeur absolue LaTeX (`|x|`), les modificateurs doivent être placés **après** la dernière barre :

```markdown
✅ Correct : {{eval:|{{x}}||+}} (valeur absolue avec modificateur +)
❌ Incorrect : {{eval:|{{x}}|+|}}
```

Le système détecte automatiquement si une barre verticale fait partie de l'expression mathématique ou sert de séparateur de modificateur.

### Comment fonctionne `{{eval:}}` ?

Le système utilise un pipeline en 3 étapes :

**Étape 1 - Remplacement des variables** :

```
"{{eval:{{a}}+{{b}}}}" → "{{eval:7+3}}" (si a=7, b=3)
```

**Étape 2 - Génération des nombres aléatoires** :

```
"{{eval:7+{{1..5}}}}" → "{{eval:7+3}}" (si random=3)
```

**Étape 3 - Évaluation** :

```
"{{eval:7+3}}" → Extrait "7+3" → Calcule → "10"
```

**Étape 4 - Application des modificateurs** :

```
Si modificateurs présents (ex: |d,+)
"10" → Format selon modificateurs → "+10" ou "10.0"
```

**Résultat final** : "10" (ou "+10", "10.0", etc. selon modificateurs)

---

## Modes de distribution

Le **mode de distribution** détermine comment les valeurs des variables sont attribuées aux élèves. C'est un choix crucial qui affecte l'expérience d'apprentissage.

### Mode 1 : À la demande (on_demand)

**Description** : Les élèves peuvent cliquer sur "Nouveau problème" pour obtenir de nouvelles valeurs à chaque fois.

**Usage recommandé** :

- ✅ Pratique autonome
- ✅ Entraînement illimité
- ✅ Révisions avant un contrôle
- ✅ Exercices de drill (calcul mental, tables)

**Comportement** :

- Chaque clic sur "Nouveau problème" génère de nouvelles valeurs
- Les valeurs ne sont **pas sauvegardées**
- Un élève peut faire le même exercice 100 fois avec des valeurs différentes

**Exemple d'utilisation** :

```markdown
Titre : Tables de multiplication
Variables :
a = {{2..9}}
b = {{2..9}}
Énoncé : Calculez {{a}} × {{b}}
Mode : À la demande

→ L'élève peut pratiquer indéfiniment
```

### Mode 2 : Par élève (per_student)

**Description** : Chaque élève reçoit des valeurs uniques et cohérentes. Les mêmes valeurs apparaissent à chaque connexion.

**Usage recommandé** :

- ✅ Devoirs personnalisés
- ✅ Évaluations à distance
- ✅ Éviter la tricherie (chaque élève a un problème différent)
- ✅ Suivi individuel

**Comportement** :

- Les valeurs sont générées à partir de l'ID de l'élève (seed déterministe)
- Un même élève verra **toujours les mêmes valeurs**
- Chaque élève a des valeurs **différentes** des autres
- Parfait pour les devoirs notés

**Exemple d'utilisation** :

```markdown
Titre : Devoir de géométrie
Variables :
longueur = {{5..15}}
largeur = {{3..10}}
Énoncé : Calculez l'aire d'un rectangle de {{longueur}} cm × {{largeur}} cm
Mode : Par élève

→ Alice aura toujours 12 cm × 7 cm
→ Bob aura toujours 8 cm × 5 cm
→ Chaque élève garde ses valeurs, même en se reconnectant
```

### Mode 3 : Par groupe (per_group)

**Description** : Tous les élèves d'un groupe (ou d'une classe) voient les mêmes valeurs.

**Usage recommandé** :

- ✅ Travail en classe (tous sur le même problème)
- ✅ Correction collective
- ✅ Discussion en groupe
- ✅ Travaux dirigés synchrones

**Comportement** :

- Les valeurs sont générées à partir de l'ID du groupe/devoir (seed déterministe)
- **Tous les élèves du groupe** voient les mêmes valeurs
- Idéal pour une correction au tableau
- Permet les discussions collectives

**Exemple d'utilisation** :

```markdown
Titre : Exercice du jour
Variables :
a = {{10..50}}
b = {{10..50}}
Énoncé : Calculez {{a}} + {{b}}
Mode : Par groupe

→ Tous les élèves de la classe 6ème A voient : 37 + 24
→ Tous les élèves de la classe 6ème B voient : 42 + 19
→ L'enseignant peut corriger au tableau avec tout le monde
```

### Comparaison des modes

| Aspect                               | À la demande      | Par élève      | Par groupe     |
| ------------------------------------ | ----------------- | -------------- | -------------- |
| **Valeurs identiques pour un élève** | ❌ Non (changent) | ✅ Oui (fixes) | ✅ Oui (fixes) |
| **Valeurs identiques entre élèves**  | ❌ Non            | ❌ Non         | ✅ Oui         |
| **Bouton "Nouveau problème"**        | ✅ Oui            | ❌ Non         | ❌ Non         |
| **Anti-triche**                      | ⚠️ Moyen          | ✅ Excellent   | ❌ Aucun       |
| **Correction collective**            | ❌ Difficile      | ❌ Difficile   | ✅ Facile      |
| **Pratique illimitée**               | ✅ Oui            | ❌ Non         | ❌ Non         |

### Quand utiliser quel mode ?

**Scénario 1 : Tables de multiplication**
→ **À la demande** - Les élèves doivent s'entraîner encore et encore

**Scénario 2 : Devoir noté à la maison**
→ **Par élève** - Chaque élève a un problème différent (anti-triche)

**Scénario 3 : Exercice de cours en classe**
→ **Par groupe** - Tous travaillent sur le même problème, correction collective

**Scénario 4 : Révisions avant le bac**
→ **À la demande** - Pratique intensive avec variété

**Scénario 5 : Évaluation en ligne surveillée**
→ **Par élève** - Chacun a son propre sujet

---

## Exemples détaillés

### Exemple 1 : Addition simple (Débutant)

**Objectif** : Pratique d'addition avec nombres de 1 à 20.

**Variables** :

```
a = {{1..20}}
b = {{1..20}}
```

**Énoncé** :

```markdown
Calculez : ${{a}} + {{b}}$
```

**Solution** :

```markdown
${{a}} + {{b}} = {{eval:{{a}}+{{b}}}}$
```

**Mode de distribution** : À la demande

**Résultat pour un élève** (exemple) :

```
Énoncé : Calculez : 7 + 3
Solution : 7 + 3 = 10
```

---

### Exemple 2 : Périmètre d'un rectangle (Intermédiaire)

**Objectif** : Calculer le périmètre avec des dimensions variables.

**Variables** :

```
longueur = {{5..15}}
largeur = {{3..12}}
perimetre = {{eval:2*({{longueur}}+{{largeur}})}}
```

**Énoncé** :

```markdown
Un rectangle a les dimensions suivantes :

- Longueur : {{longueur}} cm
- Largeur : {{largeur}} cm

Calculez son périmètre.
```

**Solution** :

```markdown
Le périmètre d'un rectangle est : $P = 2 \times (L + l)$

Donc : $P = 2 \times ({{longueur}} + {{largeur}})$

$P = 2 \times {{eval:{{longueur}}+{{largeur}}}}$

$P = {{perimetre}}$ cm
```

**Mode de distribution** : Par élève

**Résultat pour Alice** (exemple) :

```
Énoncé :
  Longueur : 12 cm
  Largeur : 7 cm

Solution :
  P = 2 × (12 + 7)
  P = 2 × 19
  P = 38 cm
```

---

### Exemple 3 : Résolution d'équation (Avancé)

**Objectif** : Résoudre une équation linéaire $ax + b = 0$.

**Variables** :

```
a = {{2..9!0}}          ← Exclut 0 pour éviter division par zéro
b = {{-20..20}}
solution = {{eval:-{{b}}/{{a}}}}
```

**Énoncé** :

```markdown
Résolvez l'équation suivante :

$${{a}}x + {{b}} = 0$$
```

**Solution** :

```markdown
**Étape 1** : Isoler le terme en $x$

$${{a}}x = -{{b}}$$

**Étape 2** : Diviser par ${{a}}$

$$x = \frac{-{{b}}}{ {{a}} }$$

**Étape 3** : Calculer

$$x = {{solution}}$$
```

**Mode de distribution** : Par élève

**Résultat pour Bob** (exemple) :

```
Énoncé : Résolvez 5x + 15 = 0

Solution :
  Étape 1 : 5x = -15
  Étape 2 : x = -15/5
  Étape 3 : x = -3
```

---

### Exemple 4 : Simplification de fractions (Avancé)

**Objectif** : Simplifier une fraction en utilisant le PGCD.

**Variables** :

```
pgcd = {{2..5}}
a = {{2..9}}
b = {{2..9!{{a}}}}      ← b différent de a
numerateur = {{eval:{{a}}*{{pgcd}}}}
denominateur = {{eval:{{b}}*{{pgcd}}}}
```

**Énoncé** :

```markdown
Simplifiez la fraction suivante :

$$\frac{ {{numerateur}} }{ {{denominateur}} }$$
```

**Solution** :

```markdown
**Recherche du PGCD** : Le PGCD de {{numerateur}} et {{denominateur}} est {{pgcd}}.

**Simplification** :

$$\frac{ {{numerateur}} }{ {{denominateur}} } = \frac{ {{numerateur}} \div {{pgcd}} }{ {{denominateur}} \div {{pgcd}} } = \frac{ {{a}} }{ {{b}} }$$

**Réponse** : $\frac{ {{a}} }{ {{b}} }$
```

**Mode de distribution** : Par élève

**Résultat pour Claire** (exemple) :

```
Énoncé : Simplifiez 12/18

Solution :
  PGCD de 12 et 18 : 6
  12/18 = (12÷6)/(18÷6) = 2/3
  Réponse : 2/3
```

---

### Exemple 5 : Théorème de Pythagore (Avancé)

**Objectif** : Calculer l'hypoténuse d'un triangle rectangle.

**Variables** :

```
a = {{3..12}}
b = {{3..12}}
c = {{eval:Math.sqrt({{a}}*{{a}} + {{b}}*{{b}})}}
c_arrondi = {{eval:Math.round({{c}}*100)/100}}
```

**Énoncé** :

```markdown
Un triangle rectangle a les côtés suivants :

- $a = {{a}}$ cm
- $b = {{b}}$ cm

Calculez la longueur de l'hypoténuse $c$ (arrondie au centième).
```

**Solution** :

```markdown
**Théorème de Pythagore** : $c^2 = a^2 + b^2$

**Application** :

$$c^2 = {{a}}^2 + {{b}}^2$$

$$c^2 = {{eval:{{a}}*{{a}}}} + {{eval:{{b}}*{{b}}}}$$

$$c^2 = {{eval:{{a}}*{{a}} + {{b}}*{{b}}}}$$

$$c = \sqrt{ {{eval:{{a}}*{{a}} + {{b}}*{{b}}}} }$$

$$c \approx {{c_arrondi}} \text{ cm}$$
```

**Mode de distribution** : Par élève

**Résultat pour David** (exemple) :

```
Énoncé : a = 6 cm, b = 8 cm

Solution :
  c² = 6² + 8²
  c² = 36 + 64
  c² = 100
  c = √100
  c = 10 cm
```

---

## Fonctionnalités avancées

### 1. Variables imbriquées

Vous pouvez utiliser des variables dans les expressions d'autres variables.

**Exemple - Bornes dynamiques** :

```
min = 10
max = 50
x = {{{{min}}-{{max}}}}  ← Utilise les valeurs de min et max
```

**Exemple - Exclusion dynamique** :

```
a = {{1..10}}
b = {{1..10!{{a}}}}  ← b ne peut pas être égal à a
c = {{1..10!{{a}},{{b}}}}  ← c différent de a et b
```

### 2. Expressions complexes dans eval

Vous pouvez combiner plusieurs opérations mathématiques.

**Discriminant d'une équation du second degré** :

```
a = {{1..5}}
b = {{-10..10}}
c = {{-20..20}}
delta = {{eval:({{b}})^2 - 4*{{a}}*{{c}}}}
```

**Moyenne de plusieurs valeurs** :

```
note1 = {{0..20}}
note2 = {{0..20}}
note3 = {{0..20}}
moyenne = {{eval:({{note1}}+{{note2}}+{{note3}})/3}}
moyenne_arrondie = {{eval:Math.round({{moyenne}}*10)/10}}
```

### 3. Formatage des nombres

**Arrondir à N décimales** :

```
valeur = {{1.5..9.99:0.01}}
arrondi_1_dec = {{eval:Math.round({{valeur}}*10)/10}}
arrondi_2_dec = {{eval:Math.round({{valeur}}*100)/100}}
```

**Valeur absolue** :

```
x = {{-50..50}}
valeur_abs = {{eval:Math.abs({{x}})}}
```

**Plancher et plafond** :

```
x = {{1.5..9.99:0.01}}
plancher = {{eval:Math.floor({{x}})}}
plafond = {{eval:Math.ceil({{x}})}}
```

### 4. Intervalles d'exclusion multiples

**Exclure plusieurs plages** :

```
x = {{1..100!10-20,30-40,50}}
```

Génère 1..100 sauf 10-20, 30-40, et 50.

**Exclure autour d'une valeur** :

```
milieu = 50
x = {{1..100!{{eval:{{milieu}}-5}}-{{eval:{{milieu}}+5}}}}
```

Exclut 45-55 si milieu=50.

### 5. Utilisation dans LaTeX

Les variables fonctionnent parfaitement dans les expressions LaTeX.

**Fractions** :

```markdown
$$\frac{ {{numerateur}} }{ {{denominateur}} }$$
```

**Équations** :

```markdown
$${{a}}x^2 + {{b}}x + {{c}} = 0$$
```

**Matrices** :

```markdown
$$
\begin{pmatrix}
{{a}} & {{b}} \\
{{c}} & {{d}}
\end{pmatrix}
$$
```

**Sommes et intégrales** :

```markdown
$$\sum_{i=1}^{ {{n}} } i = \frac{ {{n}}({{n}}+1) }{2}$$
```

---

## Bonnes pratiques

### ✅ Faire

**1. Utiliser des noms de variables descriptifs**

```
✅ longueur, largeur, aire
❌ a, b, c (pour la géométrie)
```

**2. Exclure les cas problématiques**

```
✅ diviseur = {{1..10!0}}     ← Exclut 0
✅ racine = {{1..100}}         ← Évite les racines de négatifs
```

**3. Ordonner les variables logiquement**

```
✅
a = {{1..10}}
b = {{1..10}}
somme = {{eval:{{a}}+{{b}}}}
```

**4. Tester plusieurs générations**

Utilisez "Aperçu avec nouvelles valeurs" pour vérifier que toutes les variantes fonctionnent.

**5. Arrondir les résultats si nécessaire**

```
✅ resultat_arrondi = {{eval:Math.round({{x}}*100)/100}}
```

**6. Ajouter des commentaires dans la solution**

```markdown
## Solution détaillée

**Étape 1** : Identification des données

- Longueur : {{longueur}} cm
- Largeur : {{largeur}} cm

**Étape 2** : Application de la formule
Aire = L × l = {{longueur}} × {{largeur}}

**Étape 3** : Calcul
Aire = {{aire}} cm²
```

### ❌ Éviter

**1. Références circulaires**

```
❌
a = {{b}}
b = {{a}}
→ Erreur de dépendance circulaire
```

**2. Variables non définies**

```
❌
somme = {{eval:{{a}}+{{b}}}}  ← a et b n'existent pas
→ Erreur : variable non définie
```

**3. Divisions par zéro**

```
❌ diviseur = {{-5..5}}  ← Peut être 0 !
✅ diviseur = {{-5..5!0}}  ← Exclut 0
```

**4. Intervalles invalides**

```
❌ x = {{10..5}}  ← min > max
✅ x = {{5..10}}
```

**5. Trop de variables inutiles**

```
❌ Créer 20 variables pour un exercice simple
✅ Utiliser le minimum nécessaire
```

**6. Plages trop larges ou trop petites**

```
❌ x = {{1..1000}}  ← Trop large, difficile à résoudre mentalement
❌ x = {{5..6}}     ← Trop petit, seulement 2 valeurs possibles
✅ x = {{1..20}}    ← Juste équilibré
```

### Conseils pour les modes de distribution

**À la demande** :

- ✅ Utilisez des plages larges (ex : 1-100) pour plus de variété
- ✅ Parfait pour les exercices de drill et de pratique
- ❌ Ne pas utiliser pour les devoirs notés (facilite la triche)

**Par élève** :

- ✅ Utilisez pour les devoirs et évaluations
- ✅ Testez que toutes les valeurs possibles donnent des problèmes résolvables
- ⚠️ Attention aux valeurs extrêmes (ex : division par un très petit nombre)

**Par groupe** :

- ✅ Utilisez pour les exercices de cours
- ✅ Choisissez des valeurs "propres" (évitez les décimales compliquées)
- ✅ Testez la correction au tableau avant le cours

---

## Dépannage

### Erreur : "Dépendance circulaire détectée"

**Cause** : Une variable dépend d'elle-même (directement ou indirectement).

**Exemple problématique** :

```
a = {{b}}
b = {{a}}
```

**Solution** : Réorganisez vos variables pour éliminer les cycles.

**Fix** :

```
a = {{1..10}}
b = {{a}}
```

---

### Erreur : "Variable non définie"

**Cause** : Vous référencez une variable qui n'existe pas ou qui est définie après.

**Exemple problématique** :

```
Variable 1 : resultat = {{eval:{{a}}+{{b}}}}
Variable 2 : a = {{1..10}}
Variable 3 : b = {{1..10}}
```

**Solution** : Définissez les variables dans le bon ordre.

**Fix** :

```
Variable 1 : a = {{1..10}}
Variable 2 : b = {{1..10}}
Variable 3 : resultat = {{eval:{{a}}+{{b}}}}
```

---

### Erreur : "Intervalle invalide"

**Cause** : min >= max dans un intervalle.

**Exemple problématique** :

```
x = {{10..5}}  ← min (10) > max (5)
```

**Solution** : Inversez min et max.

**Fix** :

```
x = {{5..10}}
```

---

### Les valeurs ne changent pas (mode "Par élève")

**Cause** : C'est normal ! En mode "par élève", chaque élève voit toujours les mêmes valeurs.

**Solution** :

- Si vous voulez que l'élève puisse générer de nouvelles valeurs, utilisez le mode **"À la demande"**
- Si vous voulez que chaque élève ait des valeurs différentes mais fixes, c'est correct

---

### L'aperçu montre `{{a}}` au lieu d'un nombre

**Cause** : La variable n'est pas définie ou l'aperçu n'a pas été actualisé.

**Solutions** :

1. Vérifiez que la variable est définie dans la section "Variables"
2. Attendez quelques secondes (l'aperçu se met à jour automatiquement)
3. Sauvegardez et rechargez la page

---

### Résultat de `{{eval:}}` incorrect

**Cause** : Expression mathématique invalide ou références incorrectes.

**Vérifications** :

1. ✅ Toutes les variables référencées existent ?
2. ✅ Les parenthèses sont équilibrées ?
3. ✅ Pas de division par zéro ?
4. ✅ Syntaxe JavaScript valide ? (ex : `Math.sqrt()`, pas `sqrt()`)

**Exemple de debug** :

```
❌ x = {{eval:sqr({{a}})}}           ← Fonction inexistante
✅ x = {{eval:Math.sqrt({{a}})}}     ← Correct

❌ x = {{eval:{{a}}/{{b}}}}          ← b peut être 0
✅ b = {{1..10!0}}                    ← Exclut 0 d'abord
   x = {{eval:{{a}}/{{b}}}}
```

---

### Valeurs trop grandes ou trop petites

**Cause** : Plages mal configurées ou calculs qui explosent.

**Exemple problématique** :

```
a = {{1..100}}
b = {{1..100}}
produit = {{eval:{{a}}*{{b}}}}  ← Peut donner 10000 !
```

**Solution** : Réduisez les plages ou ajoutez des contraintes.

**Fix** :

```
a = {{2..10}}
b = {{2..10}}
produit = {{eval:{{a}}*{{b}}}}  ← Maximum 100
```

---

### L'exclusion ne fonctionne pas

**Cause** : Syntaxe incorrecte ou plage impossible après exclusions.

**Exemple problématique** :

```
❌ x = {{1..5!1-5}}  ← Exclut toutes les valeurs !
```

**Solution** : Vérifiez que des valeurs restent après exclusion.

**Fix** :

```
✅ x = {{1..20!5-10}}  ← Il reste 1-4 et 11-20
```

---

## Migration d'exercices statiques

Vous avez déjà des exercices avec des valeurs fixes ? Voici comment les transformer en exercices paramétrés.

### Exemple de migration

**Avant (exercice statique)** :

```markdown
Énoncé : Calculez l'aire d'un rectangle de 12 cm × 8 cm.

Solution : Aire = 12 × 8 = 96 cm²
```

**Après (exercice paramétré)** :

**Étape 1 : Identifiez les valeurs fixes**

- 12 (longueur)
- 8 (largeur)
- 96 (résultat)

**Étape 2 : Créez des variables**

```
longueur = {{5..15}}
largeur = {{3..12}}
aire = {{eval:{{longueur}}*{{largeur}}}}
```

**Étape 3 : Remplacez dans l'énoncé**

```markdown
Énoncé : Calculez l'aire d'un rectangle de {{longueur}} cm × {{largeur}} cm.

Solution : Aire = {{longueur}} × {{largeur}} = {{aire}} cm²
```

**Résultat** : Vous avez maintenant un exercice qui peut générer des centaines de variantes !

### Checklist de migration

- [ ] Identifier toutes les valeurs numériques dans l'énoncé
- [ ] Créer des variables pour ces valeurs
- [ ] Déterminer des plages raisonnables (pas trop larges, pas trop petites)
- [ ] Remplacer les valeurs par `{{nomVariable}}`
- [ ] Ajouter les calculs avec `{{eval:}}`
- [ ] Choisir le mode de distribution approprié
- [ ] Tester plusieurs générations pour vérifier la cohérence
- [ ] Vérifier que la solution s'affiche correctement

### Cas particuliers

**Migration d'exercices avec contexte narratif** :

Si l'exercice a un contexte (ex : "Marie a 5 pommes..."), vous pouvez :

1. Garder le contexte mais paramétrer les nombres
2. Utiliser des variables pour rendre le contexte dynamique

**Exemple** :

```markdown
Avant : Marie a 5 pommes et achète 3 pommes de plus.

Après : Marie a {{pommes_initiales}} pommes et achète {{pommes_achetees}} pommes de plus.

Variables :
pommes_initiales = {{1..10}}
pommes_achetees = {{1..10}}
total = {{eval:{{pommes_initiales}}+{{pommes_achetees}}}}
```

---

## Voir aussi

- **[Guide de référence rapide](./parameterization-quick-reference.md)** - Tableaux de syntaxe pour consultation rapide
- **[Tutoriel pas-à-pas](./parameterization-tutorial.md)** - 3 exercices guidés du débutant à l'avancé
- **[README des Exercices](./README.md)** - Documentation complète du système d'exercices
- **[Guide de syntaxe Markdown](../../architecture/parameterization-system.md)** - Détails techniques du système de paramétrisation

---

**Version** : 1.1.0
**Dernière mise à jour** : 2025-11-25
**Auteurs** : Équipe UbuMaths
