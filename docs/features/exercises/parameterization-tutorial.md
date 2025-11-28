# Tutoriel : Creer votre premier exercice parametre

Guide pas a pas pour creer un exercice avec variables aleatoires.

**Duree estimee** : 15 minutes
**Niveau** : Debutant
**Prerequis** : Compte enseignant UbuMaths

---

## Objectif

A la fin de ce tutoriel, vous aurez cree un exercice parametre simple :
"Calculez l'aire d'un rectangle de longueur L cm et largeur l cm"

avec des valeurs aleatoires differentes pour chaque eleve.

---

## Etape 1 : Acceder a la page des exercices

1. Connectez-vous a votre compte enseignant
2. Dans le menu principal, cliquez sur **"Exercices"**
3. Cliquez sur le bouton **"Nouvel exercice"** (en haut a droite)

**Ce que vous voyez** :

- Un formulaire de creation d'exercice
- Des champs : Titre, Description, Difficulte, Tags
- Une section "Variables" (vide pour le moment)
- Une zone d'edition Markdown pour l'enonce
- Une zone d'edition Markdown pour la solution

---

## Etape 2 : Remplir les informations de base

**Remplissez les champs suivants** :

| Champ           | Valeur                                                    |
| --------------- | --------------------------------------------------------- |
| **Titre**       | Aire d'un rectangle                                       |
| **Description** | Calcul de l'aire d'un rectangle avec dimensions variables |
| **Difficulte**  | 1 (Facile)                                                |
| **Tags**        | geometrie, aire, rectangle                                |

**Laissez l'enonce et la solution vides pour le moment** - nous y reviendrons a l'etape 5.

---

## Etape 3 : Ajouter les variables

Nous allons creer 3 variables :

1. `longueur` : dimension aleatoire de 5 a 15 cm
2. `largeur` : dimension aleatoire de 3 a 10 cm
3. `aire` : calcul automatique (longueur × largeur)

### Variable 1 : longueur

1. Cliquez sur **"Ajouter une variable"**
2. Remplissez :
   - **Nom** : `longueur`
   - **Expression** : `{{5..15}}`
3. Cliquez sur **"Valider"** ou appuyez sur Entree

**Explication** :

- `{{5..15}}` genere un entier aleatoire entre 5 et 15
- Cette variable s'appellera `longueur` dans votre enonce

### Variable 2 : largeur

1. Cliquez a nouveau sur **"Ajouter une variable"**
2. Remplissez :
   - **Nom** : `largeur`
   - **Expression** : `{{3..10}}`
3. Cliquez sur **"Valider"**

**Explication** :

- `{{3..10}}` genere un entier aleatoire entre 3 et 10
- Valeurs independantes de `longueur`

### Variable 3 : aire

1. Cliquez sur **"Ajouter une variable"**
2. Remplissez :
   - **Nom** : `aire`
   - **Expression** : `{{eval:{{longueur}}*{{largeur}}}}`
3. Cliquez sur **"Valider"**

**Explication** :

- `{{eval:...}}` evalue une expression mathematique
- `{{longueur}}*{{largeur}}` multiplie les deux variables precedentes
- Le resultat est stocke dans `aire`

**Important** : Les variables dans `{{eval:...}}` doivent etre entourees de `{{}}` !

**Recapitulatif de vos variables** :

| Ordre | Nom      | Expression                          | Valeur exemple |
| ----- | -------- | ----------------------------------- | -------------- |
| 1     | longueur | `{{5..15}}`                         | 12             |
| 2     | largeur  | `{{3..10}}`                         | 7              |
| 3     | aire     | `{{eval:{{longueur}}*{{largeur}}}}` | 84             |

---

## Etape 4 : Choisir le mode de distribution

En bas du formulaire, selectionnez le **Mode de distribution** :

**Choisissez "Par eleve"**

**Pourquoi ?**

- Chaque eleve recevra des valeurs uniques
- Les valeurs seront coherentes (un eleve voit toujours les memes valeurs)
- Ideal pour les devoirs notes

**Autres options** :

- "A la demande" : Pour la pratique libre (valeurs changent a chaque clic)
- "Par groupe" : Pour le travail collaboratif (memes valeurs pour tout le groupe)

---

## Etape 5 : Rediger l'enonce

Dans la zone **"Enonce"**, ecrivez :

```markdown
# Aire d'un rectangle

Un rectangle a les dimensions suivantes :

- Longueur : {{longueur}} cm
- Largeur : {{largeur}} cm

**Question** : Calculez l'aire de ce rectangle.

**Rappel** : $A = longueur \times largeur$
```

**Points importants** :

- Les variables sont referencees avec `{{nomVariable}}`
- Les formules LaTeX sont entourees de `$...$`
- Le Markdown est supporte (titres `#`, listes `-`, etc.)

**Ce que l'eleve verra** (exemple) :

> # Aire d'un rectangle
>
> Un rectangle a les dimensions suivantes :
>
> - Longueur : 12 cm
> - Largeur : 7 cm
>
> **Question** : Calculez l'aire de ce rectangle.
>
> **Rappel** : A = longueur × largeur

---

## Etape 6 : Rediger la solution

Dans la zone **"Solution"**, ecrivez :

```markdown
# Solution

Pour calculer l'aire d'un rectangle, on utilise la formule :

$$A = longueur \times largeur$$

## Application numerique

Avec :

- $longueur = {{longueur}}$ cm
- $largeur = {{largeur}}$ cm

On obtient :

$$A = {{longueur}} \times {{largeur}} = {{aire}} \text{ cm}^2$$

**Reponse** : L'aire du rectangle est **{{aire}} cm²**.
```

**Points importants** :

- La variable `{{aire}}` est automatiquement calculee
- `$$...$$` cree un bloc mathematique centre
- Les valeurs sont remplacees automatiquement

**Ce que l'eleve verra** (exemple) :

> # Solution
>
> Pour calculer l'aire d'un rectangle, on utilise la formule :
>
> A = longueur × largeur
>
> ## Application numerique
>
> Avec :
>
> - longueur = 12 cm
> - largeur = 7 cm
>
> On obtient :
>
> A = 12 × 7 = 84 cm²
>
> **Reponse** : L'aire du rectangle est **84 cm²**.

---

## Etape 7 : Previsualiser l'exercice

Avant de sauvegarder, testez votre exercice :

1. Cliquez sur **"Apercu"** (ou le bouton d'oeil)
2. Vous voyez une instance generee avec des valeurs aleatoires
3. Verifiez que :
   - Les variables sont correctement remplacees
   - Les calculs sont justes
   - Les formules LaTeX s'affichent correctement
4. Cliquez sur **"Regenerer"** pour voir d'autres instances

**Que verifier** :

- [ ] Les valeurs de longueur sont entre 5 et 15
- [ ] Les valeurs de largeur sont entre 3 et 10
- [ ] Le calcul de l'aire est correct (longueur × largeur)
- [ ] Les formules mathematiques s'affichent bien
- [ ] Le texte est clair et comprehensible

---

## Etape 8 : Sauvegarder l'exercice

1. Si l'apercu est satisfaisant, cliquez sur **"Enregistrer"**
2. L'exercice est ajoute a votre banque d'exercices
3. Il est pret a etre assigne aux eleves !

**Confirmation** :

- Vous verrez un message "Exercice enregistre avec succes"
- L'exercice apparait dans votre liste d'exercices
- Vous pouvez le modifier, le dupliquer, ou le supprimer a tout moment

---

## Etape 9 : Assigner aux eleves (optionnel)

Pour utiliser cet exercice avec vos eleves :

1. Allez dans **"Devoirs"** ou **"Evaluations"**
2. Creez un nouveau devoir
3. Selectionnez votre exercice "Aire d'un rectangle"
4. Assignez-le a une classe ou groupe d'eleves

**Resultat** :

- Chaque eleve recevra une version unique de l'exercice
- Eleve A : Rectangle 12 cm × 7 cm (aire 84 cm²)
- Eleve B : Rectangle 9 cm × 5 cm (aire 45 cm²)
- Eleve C : Rectangle 14 cm × 8 cm (aire 112 cm²)
- Etc.

---

## Exercice complet (recapitulatif)

Voici votre exercice termine :

### Informations de base

- **Titre** : Aire d'un rectangle
- **Description** : Calcul de l'aire d'un rectangle avec dimensions variables
- **Difficulte** : 1
- **Tags** : geometrie, aire, rectangle
- **Mode de distribution** : Par eleve

### Variables

| Nom      | Expression                          |
| -------- | ----------------------------------- |
| longueur | `{{5..15}}`                         |
| largeur  | `{{3..10}}`                         |
| aire     | `{{eval:{{longueur}}*{{largeur}}}}` |

### Enonce

```markdown
# Aire d'un rectangle

Un rectangle a les dimensions suivantes :

- Longueur : {{longueur}} cm
- Largeur : {{largeur}} cm

**Question** : Calculez l'aire de ce rectangle.

**Rappel** : $A = longueur \times largeur$
```

### Solution

```markdown
# Solution

Pour calculer l'aire d'un rectangle, on utilise la formule :

$$A = longueur \times largeur$$

## Application numerique

Avec :

- $longueur = {{longueur}}$ cm
- $largeur = {{largeur}}$ cm

On obtient :

$$A = {{longueur}} \times {{largeur}} = {{aire}} \text{ cm}^2$$

**Reponse** : L'aire du rectangle est **{{aire}} cm²**.
```

---

## Prochaines etapes

Maintenant que vous avez cree votre premier exercice parametre, vous pouvez :

### 1. Creer des variantes

**Triangle** :

```
Variables :
- base: {{5..15}}
- hauteur: {{3..10}}
- aire: {{eval:{{base}}*{{hauteur}}/2}}

Enonce : Triangle de base {{base}} cm et hauteur {{hauteur}} cm
```

**Cercle** :

```
Variables :
- rayon: {{1..10}}
- aire: {{eval:3.14*{{rayon}}^2}}

Enonce : Cercle de rayon {{rayon}} cm
```

### 2. Ajouter de la complexite

**Exclusions** :

```
Variables :
- diviseur: {{1..10!0}}  # Exclut 0 pour eviter division par zero
```

**Decimales** :

```
Variables :
- prix: {{10.5-99.99:0.01}}  # Prix avec centimes
```

**Expressions avancees** :

```
Variables :
- a: {{1..5}}
- b: {{-10..10}}
- discriminant: {{eval:{{b}}^2-4*{{a}}*{{c}}}}
```

### 3. Explorer les autres modes

**A la demande** : Pour la pratique libre

```
Mode : A la demande
→ Chaque clic sur "Nouveau probleme" genere de nouvelles valeurs
```

**Par groupe** : Pour le travail collaboratif

```
Mode : Par groupe
→ Tous les eleves d'un groupe voient les memes valeurs
```

---

## Ressources supplementaires

- [Guide complet de parameterisation](./parameterization-guide.md)
- [Reference rapide](./parameterization-quick-reference.md)
- [Exemples avances](./parameterization-guide.md#exemples-complets)
- [Depannage](./parameterization-guide.md#depannage)

---

## FAQ

### Puis-je modifier un exercice apres l'avoir sauvegarde ?

Oui ! Cliquez sur l'exercice dans votre liste, puis sur "Modifier". Toutes les modifications seront appliquees aux futures instances.

### Les eleves voient-ils les variables ?

Non, les eleves voient uniquement les valeurs resolues. Les `{{...}}` sont remplaces automatiquement.

### Combien de variables puis-je creer ?

Il n'y a pas de limite stricte, mais nous recommandons 5-10 variables maximum pour la clarte.

### Puis-je utiliser les memes variables dans plusieurs exercices ?

Les variables sont specifiques a chaque exercice. Vous pouvez copier/coller les definitions entre exercices.

### Que se passe-t-il si je change le mode de distribution ?

Le changement s'applique aux futures assignations. Les devoirs deja assignes conservent leur mode.

---

**Felicitations !** Vous savez maintenant creer des exercices parametres.

**Astuce** : Commencez simple et ajoutez de la complexite progressivement. Testez toujours dans l'apercu avant de sauvegarder.
