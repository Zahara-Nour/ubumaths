# 🗂️ Gestion des decks

Système de gestion des decks de flashcards.

**Status** : ✅ Implémenté

---

## 🎯 Qu'est-ce qu'un deck ?

Un **deck** est une collection de flashcards organisée par thème.

Exemples :
- "Algèbre - Equations du 1er degré"
- "Géométrie - Théorème de Pythagore"
- "Calcul mental - Tables de multiplication"

---

## 📋 Structure d'un deck

```typescript
interface Deck {
  id: string;
  user_id: string;      // Propriétaire (enseignant)
  title: string;
  description?: string;
  category?: string;
  is_public: boolean;   // Partageable ou privé
  card_count: number;   // Nombre de cartes
  created_at: Date;
  updated_at: Date;
}
```

---

## 👨‍🏫 Workflow Enseignant

### Créer un deck

1. **Accéder à la gestion**
   ```
   Dashboard → Enseignant → Flashcards → Mes Decks
   ```

2. **Nouveau deck**
   - Titre : Nom descriptif
   - Description : Objectifs pédagogiques
   - Catégorie : Classification (optionnel)
   - Visibilité : Public ou privé

3. **Ajouter des cartes**

   **Option 1 : Depuis Question Bank**
   - Parcourir questions existantes
   - Sélectionner questions pertinentes
   - Ajouter au deck

   **Option 2 : Création manuelle**
   - Créer nouvelle carte
   - Recto : Question/Concept
   - Verso : Réponse/Explication
   - Sauvegarder dans deck

### Organiser les decks

- **Renommer** : Modifier titre/description
- **Dupliquer** : Créer copie pour variation
- **Fusionner** : Combiner plusieurs decks
- **Archiver** : Masquer decks obsolètes
- **Supprimer** : Retirer définitivement (confirmation)

### Partager un deck

**Public** :
- Visible par tous élèves
- Accessible dans bibliothèque

**Assigné** :
- Assigner à classes spécifiques
- Notification élèves
- Suivi progression

---

## 🎓 Workflow Élève

### Découvrir des decks

```
Dashboard → Élève → Flashcards → Bibliothèque
```

Sources :
- **Mes decks** : Personnels
- **Assignés** : Par enseignants
- **Publics** : Partagés par tous enseignants

### Démarrer l'étude

1. Choisir un deck
2. Voir cartes à réviser (dues today)
3. Commencer session de révision

### Session de révision

Pour chaque carte :
1. **Voir question** (recto)
2. **Réfléchir** à la réponse
3. **Révéler réponse** (verso)
4. **Auto-évaluer** :
   - ❌ Again (oublié)
   - 😓 Hard (difficile)
   - ✅ Good (correct)
   - 🎉 Easy (facile)

### Statistiques personnelles

- **Progression** : Cartes maîtrisées/total
- **Streak** : Jours consécutifs de révision
- **Temps étude** : Temps total investi
- **Prochaines révisions** : Cartes dues aujourd'hui/demain

---

## 📊 Statistiques deck

### Vue enseignant

Par deck :
- Nombre d'élèves l'utilisant
- Taux de complétion moyen
- Cartes les plus difficiles
- Engagement (révisions/jour)

Par élève :
- Progression dans deck
- Dernière révision
- Cartes en difficulté
- Temps investi

### Vue élève

- Cartes maîtrisées / total
- Nouvelles cartes
- Cartes à réviser aujourd'hui
- Estimation temps révision

---

## 🔄 Synchronisation

### Entre enseignant et élèves

- **Ajout carte** : Nouveau contenu automatiquement disponible
- **Modification** : Corrections répercutées
- **Suppression** : Carte retirée des decks élèves

⚠️ **Progression élève conservée** même si deck modifié.

---

## 📦 Import/Export

### Formats supportés

- **CSV** : Import massif de cartes
- **JSON** : Export deck complet (structure + données)
- **Anki** : Import decks Anki existants (future feature)

### Template CSV

```csv
front,back,category,difficulty
"Qu'est-ce que π ?","Pi est le rapport entre circonférence et diamètre d'un cercle (≈3.14159)","Géométrie","facile"
"Résoudre: 2x + 5 = 13","x = 4","Algèbre","moyen"
```

---

## 💡 Best Practices

### Conception de deck

- **Taille** : 20-50 cartes max (focus sur un thème)
- **Granularité** : Une idée par carte
- **Clarté** : Questions précises, réponses concises
- **Progression** : Du simple au complexe

### Questions efficaces

✅ **BON** :
- "Combien de côtés a un hexagone ?" → "6"
- "Quelle est la formule de l'aire d'un cercle ?" → "πr²"

❌ **MAUVAIS** :
- "Tout ce qu'il faut savoir sur les cercles" (trop large)
- "Expliquer la géométrie" (trop vague)

### Organisation

- **Par niveau** : 6ème, 5ème, 4ème...
- **Par chapitre** : Suivre programme scolaire
- **Par difficulté** : Progression naturelle

---

## 🔗 Ressources

- [Algorithme FSRS](fsrs-algorithm.md)
- [Composants](components.md)
- [Quick Start](SRS_QUICK_START.md)

---

[← Retour SRS & Flashcards](README.md)
