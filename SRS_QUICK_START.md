# Guide de Démarrage Rapide - Système SRS

## 🚀 Mise en route

### 1. Push la migration database

```bash
pnpm db:migrate
```

**Important** : Cette commande va créer les 5 tables SRS dans votre base de données Supabase.

### 2. Vérifier la migration

Connectez-vous à votre dashboard Supabase et vérifiez que les tables suivantes ont été créées :

- `srs_decks`
- `srs_cards`
- `srs_card_stats`
- `srs_review_sessions`
- `srs_deck_assignments`

---

## 👨‍🏫 Pour les Professeurs

### Créer votre premier deck

1. **Accéder à la gestion des decks**
   - Depuis le dashboard : cliquez sur "Gérer les decks" dans la section "Decks SRS"
   - Ou allez directement à `/dashboard/teacher/srs/decks`

2. **Créer un nouveau deck**
   - Cliquez sur "Nouveau deck"
   - Remplissez les informations :
     - **Nom** : Ex. "Équations du second degré"
     - **Description** : Décrivez le contenu
     - **Type** : Officiel (depuis la banque) ou Personnel
     - **Profil de rétention** : Équilibré (90%) recommandé

3. **Ajouter des cartes**

   **Option A - Cartes personnalisées** :
   - Cliquez sur "Carte personnalisée"
   - Remplissez le recto (question/concept)
   - Remplissez le verso (réponse/explication)
   - Utilisez l'éditeur rich-text pour le formatage et LaTeX
   - Cliquez sur "Enregistrer"

   **Option B - Templates de la banque** :
   - Cliquez sur "Depuis la banque" (TODO: à implémenter)
   - Sélectionnez les templates publiés
   - Confirmer

4. **Sauvegarder le deck**
   - Cliquez sur "Créer le deck"

### Attribuer le deck à vos élèves

1. **Depuis la liste des decks**, cliquez sur les 3 points (⋮) du deck
2. Cliquez sur "Attribuer"
3. **Sélectionnez les cibles** :
   - Onglet "Élèves" : sélectionnez individuellement
   - Onglet "Classes" : attribuez à toute une classe
4. Cliquez sur "Attribuer le deck"

**Résultat** : Chaque élève reçoit une copie personnelle du deck (marquée "Attribué" et en lecture seule).

### Modifier un deck existant

⚠️ **Attention** : Seuls les decks NON attribués peuvent être modifiés.

1. Depuis la liste, cliquez sur ⋮ puis "Modifier"
2. Modifiez les informations
3. Ajoutez/supprimez des cartes
4. Sauvegardez

---

## 👨‍🎓 Pour les Élèves

### Accéder à vos decks

1. **Depuis le dashboard** : cliquez sur "Voir mes decks" dans la section SRS
2. Ou allez à `/dashboard/revisions`

Vous verrez :

- **Decks attribués** : envoyés par vos professeurs (🔒 lecture seule)
- **Decks personnels** : créés par vous-même (✏️ modifiables)

### Créer un deck personnel

1. Sur `/dashboard/revisions`, cliquez sur "Nouveau deck"
2. Remplissez :
   - **Nom** : Ex. "Mes formules de physique"
   - **Description** : Optionnel
   - **Intensité** : Équilibré (90%) recommandé
3. Ajoutez des cartes personnalisées
4. Cliquez sur "Créer le deck"

### Réviser avec le système FSRS

1. **Cliquez sur un deck** avec des cartes à réviser
2. Vous serez redirigé vers `/dashboard/revisions/decks/[id]/study`

**Interface de révision** :

```
┌────────────────────────────────────┐
│  Carte 1 sur 10 - 9 restantes      │
│  ▓▓░░░░░░░░ 10%                     │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│  Question                           │
│  ────────────────────────────       │
│                                     │
│  Résoudre : 2x² + 5x - 3 = 0       │
│                                     │
│  [Bouton Flip] ↻                   │
└────────────────────────────────────┘
```

3. **Lisez la question** (recto de la carte)
4. **Réfléchissez à la réponse**
5. **Cliquez sur le bouton flip** (↻) pour voir la correction
6. **Évaluez votre réponse** avec les 4 boutons :

   ```
   ┌────────┬────────┬────────┬────────┐
   │ Encore │Difficile│  Bien  │ Facile │
   │   1    │   2    │   3    │   4    │
   └────────┴────────┴────────┴────────┘
   ```

   - **1 (Encore)** : Mauvaise réponse → Revoir bientôt
   - **2 (Difficile)** : Correct mais difficile → Intervalle court
   - **3 (Bien)** : Bonne réponse → Intervalle standard
   - **4 (Facile)** : Réponse parfaite → Intervalle long

7. **Raccourcis clavier** : Appuyez sur 1, 2, 3 ou 4 pour noter rapidement

8. **Continuez** jusqu'à réviser toutes les cartes dues

9. **Résumé de session** : À la fin, consultez vos statistiques

---

## 🎯 Comprendre l'algorithme FSRS

### Comment ça marche ?

Le système FSRS-6 optimise automatiquement vos révisions :

1. **Cartes neuves** : Vous les verrez fréquemment au début
2. **Si vous répondez bien** : L'intervalle augmente progressivement
3. **Si vous oubliez** : La carte revient plus tôt

### Les 4 états d'une carte

| État              | Description                 | Couleur |
| ----------------- | --------------------------- | ------- |
| 🆕 **New**        | Jamais vue                  | Bleu    |
| 📚 **Learning**   | En apprentissage (< 24h)    | Orange  |
| ✅ **Review**     | En révision normale         | Vert    |
| 🔄 **Relearning** | Oubliée, en réapprentissage | Rouge   |

### Profils de rétention

| Profil        | Rétention | Révisions  | Recommandé pour        |
| ------------- | --------- | ---------- | ---------------------- |
| Détendu       | 80%       | Moins      | Révision occasionnelle |
| **Équilibré** | **90%**   | **Modéré** | **Usage général** ⭐   |
| Élevé         | 95%       | Plus       | Examens importants     |
| Expert        | 97%       | Beaucoup   | Maîtrise maximale      |

---

## 📊 Statistiques et Suivi

### Pour les élèves

Dans `/dashboard/revisions` :

- **Total decks** : Nombre de decks disponibles
- **À réviser** : Cartes dues aujourd'hui
- **Cartes maîtrisées** : Cartes en état "Review"

Dans chaque deck :

- **Total cartes**
- **Cartes à réviser**
- **Nouvelles cartes**
- **En apprentissage**

### Pour les professeurs

Dans `/dashboard/teacher/srs/decks` :

- Vue d'ensemble de tous vos decks
- Statistiques par deck
- Nombre de decks attribués

**TODO (Phase 2)** : Statistiques de progression des élèves

---

## 🔧 Résolution de problèmes

### Erreur : "Deck not found"

- Vérifiez que vous êtes propriétaire du deck
- Si attribué, vérifiez que vous êtes l'élève destinataire

### Les cartes ne s'affichent pas

- Vérifiez que le deck contient des cartes
- Rechargez la page

### Impossible de modifier un deck

- Les decks attribués sont en lecture seule
- Seul le créateur peut modifier avant attribution

### Migration échoue

- Vérifiez votre connexion Supabase
- Vérifiez que les tables n'existent pas déjà
- Consultez les logs d'erreur

---

## 🎓 Bonnes Pratiques

### Pour créer de bonnes cartes

✅ **DO** :

- Une idée par carte
- Questions claires et précises
- Réponses concises
- Utilisez LaTeX pour les formules mathématiques
- Ajoutez des exemples dans la correction

❌ **DON'T** :

- Cartes trop longues
- Multiples concepts par carte
- Questions ambiguës
- Réponses trop vagues

### Pour réviser efficacement

✅ **DO** :

- Révisez TOUS LES JOURS (même 5-10 min)
- Soyez honnête avec vos notes (1-4)
- Révisez dans un endroit calme
- Utilisez les raccourcis clavier (1-4)

❌ **DON'T** :

- Sauter des jours de révision
- Toujours noter "Facile" (4)
- Réviser trop vite sans réfléchir
- Accumuler trop de cartes en retard

### Nombre de cartes recommandé

| Par deck | Par jour (nouveau) |
| -------- | ------------------ |
| 20-50    | 5-10               |
| 50-100   | 10-20              |
| 100-200  | 15-30              |

⚠️ **Attention** : Plus vous ajoutez de cartes, plus vous aurez de révisions quotidiennes !

---

## 🚀 Fonctionnalités Avancées (Phase 2)

**À venir** :

- [ ] Import/Export de decks (JSON)
- [ ] Sélection visuelle de templates
- [ ] Statistiques professeurs (progression élèves)
- [ ] Tags pour organiser les cartes
- [ ] Mode hors-ligne (PWA)
- [ ] Notifications de révision
- [ ] Gamification (streaks, badges)

---

## 📚 Ressources

- **Documentation complète** : `SRS_SYSTEM_DOCUMENTATION.md`
- **Algorithme FSRS** : https://github.com/open-spaced-repetition/fsrs4anki
- **Support** : Contact votre administrateur

---

**Bonne révision ! 🎯**
