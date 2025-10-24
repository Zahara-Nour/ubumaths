# 🧠 Algorithme FSRS

Free Spaced Repetition Scheduler - Algorithme de répétition espacée.

**Status** : ✅ Implémenté

---

## 🎯 Vue d'ensemble

FSRS est un algorithme moderne de répétition espacée qui optimise la rétention à long terme en planifiant les révisions au moment optimal.

**Référence** : [FSRS GitHub](https://github.com/open-spaced-repetition/fsrs4anki)

---

## 📐 Principes

### Spaced Repetition

Réviser :
- Fréquemment au début (nouvelle carte)
- De moins en moins souvent (carte maîtrisée)
- Juste avant d'oublier (timing optimal)

### Courbe d'oubli

Basé sur recherches d'Ebbinghaus :
- Oubli rapide après apprentissage
- Réactivation renforce mémoire
- Intervalles croissants optimisent rétention

---

## 🔢 Variables FSRS

### État de la carte

Chaque carte stocke :

```typescript
{
  stability: number;    // Stabilité mémoire (jours)
  difficulty: number;   // Difficulté (0.0-10.0)
  elapsed_days: number; // Jours depuis dernière révision
  scheduled_days: number; // Intervalle planifié
  reps: number;         // Nombre total de révisions
  lapses: number;       // Nombre d'oublis
  state: 'new' | 'learning' | 'review' | 'relearning';
  last_review: Date;
  due: Date;           // Prochaine révision due
}
```

### Paramètres d'optimisation

17 paramètres ajustables (defaults optimisés) :

```typescript
const DEFAULT_PARAMS = [
  0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94,
  2.18, 0.05, 0.34, 1.26, 0.29, 2.61
];
```

---

## 🎲 Réponses possibles

### 4 boutons de révision

1. **Again** (Encore) - ❌ Oublié
   - Réinitialise intervalle
   - Augmente difficulté
   - Retour phase apprentissage

2. **Hard** (Difficile) - 😓 Difficile
   - Intervalle court
   - Augmente légèrement difficulté

3. **Good** (Bon) - ✅ Correct
   - Intervalle optimal FSRS
   - Maintient difficulté

4. **Easy** (Facile) - 🎉 Facile
   - Intervalle long
   - Diminue difficulté

---

## 📅 Calcul des intervalles

### Formule simplifiée

```
Nouvel intervalle = Stabilité × (Retrievability_target) ^ (1/Decay)
```

Où :
- **Stabilité** : Durée avant oubli (50% retrievability)
- **Retrievability_target** : Taux de rétention souhaité (90%)
- **Decay** : Vitesse d'oubli (dépend de difficulté)

### Exemple concret

Carte avec stabilité 10 jours :

| Réponse | Nouvelle stabilité | Prochain intervalle |
|---------|-------------------|---------------------|
| Again   | 2 jours           | 1 jour              |
| Hard    | 7 jours           | 3 jours             |
| Good    | 25 jours          | 10 jours            |
| Easy    | 50 jours          | 20 jours            |

---

## 🔄 États de carte

### 1. New (Nouvelle)

Première fois vue :
- `stability` = initial (1 jour)
- `difficulty` = moyenne (5.0)
- Révisions fréquentes

### 2. Learning (Apprentissage)

En phase d'apprentissage :
- Intervalles courts (minutes/heures)
- Graduellement espacés
- Passe en "Review" après succès

### 3. Review (Révision)

Carte maîtrisée :
- Intervalles longs (jours/mois)
- Stabilité élevée
- Moins de révisions

### 4. Relearning (Réapprentissage)

Après oubli (Again) :
- Retour intervalles courts
- Reconstruction mémoire
- Retour "Review" après succès

---

## 📊 Optimisation

### Ajustement automatique

FSRS s'adapte à l'élève :
- Historique révisions
- Taux de succès
- Pattern d'oublis

### Difficulty tracking

La difficulté évolue :
- Augmente si échecs répétés
- Diminue si succès constants
- Reflète facilité subjective

---

## 💻 Implémentation UbuMaths

### Structure DB

```sql
CREATE TABLE srs_cards (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  question_id UUID REFERENCES questions(id),

  -- FSRS state
  state TEXT NOT NULL,
  stability REAL NOT NULL,
  difficulty REAL NOT NULL,
  elapsed_days INTEGER DEFAULT 0,
  scheduled_days INTEGER DEFAULT 0,
  reps INTEGER DEFAULT 0,
  lapses INTEGER DEFAULT 0,

  -- Dates
  last_review TIMESTAMPTZ,
  due TIMESTAMPTZ NOT NULL
);
```

### API de révision

```typescript
// src/lib/utils/srs/fsrs.ts
import { fsrs, Rating } from 'ts-fsrs';

const f = fsrs();

export function scheduleCard(
  card: FSRSCard,
  rating: 'again' | 'hard' | 'good' | 'easy'
): FSRSCard {
  const ratingMap = {
    again: Rating.Again,
    hard: Rating.Hard,
    good: Rating.Good,
    easy: Rating.Easy
  };

  const scheduling = f.repeat(card, now());
  const newCard = scheduling[ratingMap[rating]].card;

  return newCard;
}
```

---

## 📈 Avantages FSRS

Comparé à SM-2 (Anki classique) :

- ✅ **Plus précis** : Modèle mathématique sophistiqué
- ✅ **Adaptatif** : S'ajuste à chaque élève
- ✅ **Optimisé** : Maximise rétention long terme
- ✅ **Flexible** : 4 choix de réponse vs 3
- ✅ **Open source** : Algorithme transparent

---

## 🔗 Ressources

- [FSRS Documentation](https://github.com/open-spaced-repetition/fsrs4anki/wiki)
- [ts-fsrs Library](https://github.com/open-spaced-repetition/ts-fsrs)
- [Research Paper](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-FSRS-Algorithm)

---

## 🔗 Voir aussi

- [SRS System](README.md)
- [Deck Management](deck-management.md)
- [Components](components.md)

---

[← Retour SRS & Flashcards](README.md)
