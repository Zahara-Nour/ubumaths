# ✍️ Système de notation

Système de notation et correction des évaluations.

**Status** : 📝 Documentation en cours

---

## 🎯 Types de notation

### Auto-correction

Questions corrigées automatiquement par le système :

- **Choix multiples** : Comparaison exacte des sélections
- **Vrai/Faux** : Comparaison booléenne
- **Réponse courte** : Comparaison exacte (insensible à la casse)
- **Réponse mathématique** : Évaluation CAS (Computer Algebra System)

### Correction manuelle

Questions nécessitant intervention enseignant :

- **Réponse longue** : Rédaction, argumentation
- **Upload fichier** : Photo, scan, PDF
- **Questions ouvertes** : Réponses libres

---

## 📊 Barèmes

### Configuration par question

Chaque question a :

- **Points maximum** : Score si réponse correcte
- **Points partiels** : (optionnel) Pour réponses partiellement correctes
- **Pénalité** : (optionnel) Points retirés pour erreur

### Échelles

- **Sur 20** : Système français standard
- **Sur 100** : Pourcentage
- **Custom** : Total personnalisé

**Conversion automatique** entre échelles.

---

## ✅ Correction automatique

### Processus

1. Élève soumet évaluation
2. Système compare réponses avec réponses attendues
3. Attribution points automatique
4. Calcul score total
5. Notification élève (si score immédiat activé)

### Questions mathématiques

Utilisation du Compute Engine (CortexJS) :

```typescript
// Exemple : Vérifier équivalence mathématique
const studentAnswer = '2x + 4';
const correctAnswer = '2(x + 2)';

const result = ce.parse(studentAnswer).isEqual(ce.parse(correctAnswer));
// result = true (équivalent mathématiquement)
```

**Avantages** :

- Accepte formes équivalentes
- Simplifie automatiquement
- Gère fractions, puissances, etc.

---

## ✍️ Correction manuelle

### Interface enseignant

Pour chaque réponse élève :

1. **Afficher** :
   - Question posée
   - Réponse élève
   - Réponse attendue (si existe)
   - Points max

2. **Actions** :
   - Attribuer points (0 à max)
   - Ajouter commentaire
   - Marquer pour révision
   - Passer au suivant

3. **Navigation** :
   - Question par question
   - Élève par élève
   - Filtrer (non corrigés, marqués, etc.)

### Correction par lots

Pour questions identiques :

1. Voir toutes réponses élèves côte à côte
2. Établir grille de notation
3. Corriger rapidement avec cohérence

---

## 📈 Calcul du score

### Score brut

```
Score brut = Σ(points obtenus par question)
Score max = Σ(points max par question)
```

### Score final

Conversion sur échelle souhaitée :

```
Score final = (Score brut / Score max) × Échelle
```

Exemple :

- Score brut : 15/25
- Échelle : 20
- Score final : (15/25) × 20 = 12/20

### Bonus/Malus

Optionnel :

- **Bonus** : Questions extras, rapidité
- **Malus** : Retard, plagiat détecté

---

## 🎨 Feedback

### Commentaires

Types de commentaires :

- **Global** : Sur évaluation entière
- **Par question** : Précision sur erreur
- **Encouragements** : Positifs pour motivation

### Affichage élève

Selon configuration enseignant :

- **Immédiat** : Dès soumission
- **Après date limite** : Tous élèves ont soumis
- **Après correction** : Correction manuelle terminée

**Options** :

- Afficher score seulement
- Afficher score + bonnes réponses
- Afficher score + corrections détaillées

---

## 📊 Statistiques

### Par question

- Taux de réussite
- Score moyen
- Temps moyen
- Distribution des réponses

### Par évaluation

- Score moyen classe
- Médiane
- Écart-type
- Distribution (histogramme)

### Par élève

- Évolution dans le temps
- Comparaison avec moyenne classe
- Points forts/faibles

---

## 💡 Best Practices

### Pour enseignants

- **Clarté** : Critères de notation explicites
- **Cohérence** : Même grille pour tous élèves
- **Feedback constructif** : Expliquer erreurs
- **Rapidité** : Corriger vite pour feedback efficace

### Configuration évaluation

- **Équilibrage** : Points proportionnels à difficulté
- **Variété** : Mélanger types de questions
- **Validation** : Tester soi-même avant assignation

---

## 🔗 Voir aussi

- [Workflow enseignant](teacher-flow.md)
- [Workflow élève](student-flow.md)
- [Question Bank](../questions/README.md)

---

[← Retour aux évaluations](README.md)
