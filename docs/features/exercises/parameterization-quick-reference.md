# Parameterisation des Exercices - Reference Rapide

Guide rapide pour la syntaxe de parameterisation des exercices.

**Version** : 2.0.0
**Date** : 2025-10-27

---

## Syntaxe de base

| Syntaxe            | Description           | Exemple                        |
| ------------------ | --------------------- | ------------------------------ |
| `{{nom}}`          | Reference de variable | `{{a}}`, `{{rayon}}`           |
| `{{min-max}}`      | Entier aleatoire      | `{{1-10}}`, `{{-5-5}}`         |
| `{{min-max:pas}}`  | Decimal aleatoire     | `{{0-1:0.1}}`, `{{10-20:0.5}}` |
| `{{eval:expr}}`    | Evaluation            | `{{eval:{{a}}+{{b}}}}`         |
| `{{min-max!excl}}` | Avec exclusions       | `{{1-10!5}}`, `{{1-20!{{a}}}}` |
| `$formule$`        | LaTeX inline          | `${{a}}x + {{b}}$`             |
| `$$formule$$`      | LaTeX bloc            | `$$\frac{{{a}}}{{{b}}}$$`      |

---

## Exemples rapides

### Entiers aleatoires

```
{{1-10}}           → 7
{{-5-5}}           → -2
{{100-999}}        → 456
{{0-100:10}}       → 0, 10, 20, ..., 100
```

### Decimaux

```
{{0-1:0.1}}        → 0.7
{{10.5-20.5:0.5}}  → 15.5
{{0-10:0.01}}      → 7.23
```

### Exclusions

```
{{1-10!5}}         → 1-10 sauf 5
{{1-20!5,7}}       → 1-20 sauf 5 et 7
{{1-50!10-20}}     → 1-50 sauf 10-20
{{1-10!{{a}}}}     → 1-10 sauf valeur de a
```

### Evaluations

```
{{eval:{{a}}+{{b}}}}        → Somme
{{eval:{{a}}*{{b}}}}        → Produit
{{eval:{{a}}^2}}            → Carre
{{eval:sqrt({{a}})}}        → Racine carree
{{eval:({{a}}+{{b}})/2}}    → Moyenne
```

---

## Modes de distribution

| Mode             | Icone            | Comportement                    | Usage                |
| ---------------- | ---------------- | ------------------------------- | -------------------- |
| **A la demande** | Bouton regenerer | Nouvelles valeurs a chaque fois | Pratique libre       |
| **Par eleve**    | Utilisateur      | Valeurs uniques par eleve       | Devoirs notes        |
| **Par groupe**   | Groupe           | Memes valeurs pour le groupe    | Travail collaboratif |

---

## Pattern courants

### Addition simple

```
Variables :
- a: {{1-20}}
- b: {{1-20}}
- somme: {{eval:{{a}}+{{b}}}}

Enonce : Calculez {{a}} + {{b}}
Solution : {{a}} + {{b}} = {{somme}}
```

### Geometrie (rectangle)

```
Variables :
- longueur: {{5-15}}
- largeur: {{3-10}}
- aire: {{eval:{{longueur}}*{{largeur}}}}

Enonce : Rectangle de {{longueur}} cm × {{largeur}} cm
Solution : Aire = {{aire}} cm²
```

### Equation simple

```
Variables :
- a: {{2-10}}
- b: {{1-20}}
- x: {{eval:{{b}}/{{a}}}}

Enonce : Resolvez ${{a}}x = {{b}}$
Solution : $x = {{x}}$
```

### Fraction simplifiable

```
Variables :
- pgcd: {{2-5}}
- a: {{2-9}}
- b: {{2-9!{{a}}}}
- num: {{eval:{{a}}*{{pgcd}}}}
- den: {{eval:{{b}}*{{pgcd}}}}

Enonce : Simplifiez $\frac{{{num}}}{{{den}}}$
Solution : $\frac{{{a}}}{{{b}}}$
```

---

## Erreurs courantes

### ❌ Variables sans accolades dans eval

```
❌ {{eval:a+b}}
✅ {{eval:{{a}}+{{b}}}}
```

### ❌ Reference circulaire

```
❌ a: {{b}}
   b: {{a}}

✅ a: {{1-10}}
   b: {{a}}
```

### ❌ Variable non definie

```
❌ Variables : a
   Enonce : {{a}} + {{b}}  # b non defini

✅ Variables : a, b
   Enonce : {{a}} + {{b}}
```

### ❌ LaTeX mal ferme

```
❌ ${{a}x + {{b} = 0$
✅ ${{a}}x + {{b}} = 0$
```

---

## Ordre de resolution

Les variables sont resolues **dans l'ordre de declaration** :

```
1. Generer aleatoire
2. Remplacer references
3. Evaluer expressions
```

**Exemple** :

```
Variables :
1. a = {{1-10}}              # Etape 1 : Genere 7
2. b = {{a}}                 # Etape 2 : Reference → 7
3. somme = {{eval:a+b}}      # Etape 3 : Evalue → 14
```

**Important** : Une variable ne peut referencer que les variables definies **avant** elle !

---

## Operateurs eval

| Operateur      | Syntaxe     | Exemple                     |
| -------------- | ----------- | --------------------------- |
| Addition       | `+`         | `{{eval:{{a}}+{{b}}}}`      |
| Soustraction   | `-`         | `{{eval:{{a}}-{{b}}}}`      |
| Multiplication | `*`         | `{{eval:{{a}}*{{b}}}}`      |
| Division       | `/`         | `{{eval:{{a}}/{{b}}}}`      |
| Puissance      | `^`         | `{{eval:{{a}}^2}}`          |
| Racine carree  | `sqrt(...)` | `{{eval:sqrt({{a}})}}`      |
| Valeur absolue | `abs(...)`  | `{{eval:abs({{a}}-{{b}})}}` |
| Parentheses    | `(...)`     | `{{eval:({{a}}+{{b}})/2}}`  |

---

## Astuces rapides

### 1. Eviter la division par zero

```
✅ diviseur: {{1-10!0}}      # Exclut 0
✅ diviseur: {{2-10}}         # Commence a 2
```

### 2. Valeurs differentes

```
✅ a: {{1-10}}
   b: {{1-10!{{a}}}}         # b different de a
```

### 3. Plages adaptees

```
CM1 : {{1-10}}               # Petits nombres
College : {{10-100}}         # Nombres moyens
Lycee : {{-50-50}}           # Nombres relatifs
```

### 4. Calculs intermediaires

```
Variables :
1. base: {{5-15}}            # Donnee
2. hauteur: {{3-10}}         # Donnee
3. aire: {{eval:base*hauteur/2}}  # Calcul intermediaire
```

### 5. Tests avant publication

1. Utiliser l'apercu
2. Verifier plusieurs instances
3. Tester les cas limites
4. Valider les calculs

---

## Depannage rapide

| Probleme                | Solution                                                  |
| ----------------------- | --------------------------------------------------------- |
| "Dependance circulaire" | Reordonnez les variables                                  |
| "Variable non trouvee"  | Verifiez que toutes les variables referencees existent    |
| "Expression invalide"   | Verifiez la syntaxe de `{{eval:...}}`                     |
| Valeurs ne changent pas | Normal en mode "Par eleve"                                |
| LaTeX ne s'affiche pas  | Verifiez les accolades : `{{var}}` et delimiteurs `$...$` |

---

## Pour aller plus loin

- [Guide complet de parameterisation](./parameterization-guide.md)
- [Documentation des exercices](./README.md)
- [Guide technique](./parameterization-types-guide.md)

---

**Astuce** : Gardez cette page sous la main lors de la creation d'exercices !
