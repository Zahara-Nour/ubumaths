# Plan de Test SRS - Système de Révision Espacée

## 🎯 Objectif

Tester le système SRS complet depuis la création de deck jusqu'à la révision, en vérifiant toutes les fonctionnalités et l'algorithme FSRS-6.

---

## ⚙️ Pré-requis

### 1. Migration de la base de données

```bash
pnpm db:migrate
```

**Vérification** : Connectez-vous à Supabase Dashboard et vérifiez que les 5 tables SRS existent :
- ✅ `srs_decks`
- ✅ `srs_cards`
- ✅ `srs_card_stats`
- ✅ `srs_review_sessions`
- ✅ `srs_deck_assignments`

### 2. Comptes de test

Vous aurez besoin de :
- **1 compte professeur** (role = 'teacher')
- **1 compte élève** (role = 'student')

---

## 📋 Test 1 : Création de Deck (Professeur)

### 1.1 Navigation

1. Connectez-vous en tant que **professeur**
2. Allez sur `/dashboard`
3. Vérifiez la présence de la section "Decks SRS (Révision Espacée)"
4. Cliquez sur "Gérer les decks"
5. Vous devriez arriver sur `/dashboard/teacher/srs/decks`

**Résultat attendu** :
- ✅ Page affichée sans erreur
- ✅ Liste vide de decks ou decks existants
- ✅ Bouton "Nouveau deck" visible
- ✅ Tabs : Tous / Officiels / Personnels

### 1.2 Création d'un deck vide

1. Cliquez sur "Nouveau deck"
2. Remplissez :
   - **Nom** : "Test Équations du second degré"
   - **Description** : "Deck de test pour les équations du second degré"
   - **Type** : Personnel
   - **Profil de rétention** : Équilibré (90%)
3. NE PAS ajouter de cartes
4. Cliquez sur "Créer le deck"

**Résultat attendu** :
- ✅ Toast de succès "Deck créé avec succès"
- ✅ Redirection vers `/dashboard/teacher/srs/decks`
- ✅ Deck visible dans la liste
- ✅ Stats : 0 carte, 0 à réviser

### 1.3 Ajout de cartes personnalisées

1. Dans la liste des decks, cliquez sur ⋮ (menu) du deck créé
2. Cliquez sur "Modifier"
3. Vous devriez être sur `/dashboard/teacher/srs/decks/[id]/edit`
4. Cliquez sur "Carte personnalisée"
5. **Recto** : Tapez "Quelle est la formule du discriminant ?"
6. **Verso** : Tapez "$\Delta = b^2 - 4ac$"
7. Cliquez sur "Enregistrer"
8. Répétez 3 fois pour avoir **3 cartes au total** :
   - Carte 1 : "Discriminant ?" → "$\Delta = b^2 - 4ac$"
   - Carte 2 : "Résoudre $ax^2 + bx + c = 0$" → "Formule : $x = \frac{-b \pm \sqrt{\Delta}}{2a}$"
   - Carte 3 : "Si $\Delta > 0$ ?" → "2 solutions réelles distinctes"

**Résultat attendu** :
- ✅ Chaque carte ajoutée apparaît dans la liste
- ✅ Badge "Personnalisée" sur chaque carte
- ✅ Compteur de cartes mis à jour (3 cartes)
- ✅ Bouton "Enregistrer les modifications" actif

9. Cliquez sur "Enregistrer les modifications"

**Résultat attendu** :
- ✅ Toast de succès
- ✅ Retour à la liste des decks
- ✅ Deck montre "3 cartes"

---

## 📋 Test 2 : Attribution de Deck (Professeur)

### 2.1 Attribuer à un élève

1. Sur `/dashboard/teacher/srs/decks`
2. Cliquez sur ⋮ du deck créé
3. Cliquez sur "Attribuer"
4. Vous devriez voir une modal/page d'attribution
5. Sélectionnez l'onglet "Élèves"
6. Recherchez et sélectionnez votre élève de test
7. Cliquez sur "Attribuer le deck"

**Résultat attendu** :
- ✅ Toast de succès "Deck attribué avec succès"
- ✅ Badge "Attribué" sur le deck dans la liste
- ✅ Icône 🔒 pour indiquer lecture seule
- ✅ Menu ⋮ ne permet plus "Modifier" ni "Supprimer"

### 2.2 Vérification RLS (Read-only)

1. Essayez de cliquer sur ⋮ du deck attribué
2. Vérifiez que "Modifier" et "Supprimer" sont absents

**Résultat attendu** :
- ✅ Seule l'option "Attribuer" est disponible
- ✅ Deck marqué comme lecture seule

---

## 📋 Test 3 : Création de Deck Personnel (Élève)

### 3.1 Navigation élève

1. **Déconnectez-vous** du compte professeur
2. Connectez-vous en tant qu'**élève**
3. Allez sur `/dashboard`
4. Vérifiez la section "Révisions Espacées (SRS)"
5. Cliquez sur "Voir mes decks"
6. Vous devriez arriver sur `/dashboard/revisions`

**Résultat attendu** :
- ✅ Page affichée sans erreur
- ✅ Deck attribué par le prof visible (badge "Attribué", icône 🔒)
- ✅ Bouton "Nouveau deck" visible

### 3.2 Créer un deck personnel

1. Cliquez sur "Nouveau deck"
2. Vous devriez être sur `/dashboard/revisions/create`
3. Remplissez :
   - **Nom** : "Mes formules de physique"
   - **Description** : "Deck personnel pour la physique"
   - **Intensité** : Équilibré (90%)
4. Cliquez sur "Ajouter une carte"
5. **Recto** : "Vitesse moyenne ?"
6. **Verso** : "$v = \frac{d}{t}$"
7. Cliquez sur "Enregistrer"
8. Ajoutez 2 cartes supplémentaires
9. Cliquez sur "Créer le deck"

**Résultat attendu** :
- ✅ Toast de succès
- ✅ Redirection vers `/dashboard/revisions`
- ✅ Deck personnel visible
- ✅ Badge "Personnel" ou pas de badge "Attribué"
- ✅ Icône ✏️ (modifiable)

---

## 📋 Test 4 : Révision avec FSRS (Élève)

### 4.1 Démarrer une session de révision

1. Sur `/dashboard/revisions`
2. Cliquez sur le deck **attribué par le professeur** (3 cartes d'équations)
3. Vous devriez être sur `/dashboard/revisions/decks/[id]/study`

**Résultat attendu** :
- ✅ Interface de révision affichée
- ✅ Barre de progression : "Carte 1 sur 3"
- ✅ Carte affichée (recto) : "Quelle est la formule du discriminant ?"
- ✅ Bouton flip visible (icône ↻)

### 4.2 Réviser la première carte

1. Lisez le recto : "Quelle est la formule du discriminant ?"
2. Réfléchissez à la réponse
3. Cliquez sur le bouton **Flip** (↻)

**Résultat attendu** :
- ✅ Animation de flip 3D
- ✅ Verso affiché : "$\Delta = b^2 - 4ac$"
- ✅ 4 boutons de notation apparaissent :
  - 1️⃣ Encore
  - 2️⃣ Difficile
  - 3️⃣ Bien
  - 4️⃣ Facile

4. Cliquez sur "3 - Bien"

**Résultat attendu** :
- ✅ Transition vers la carte 2
- ✅ Barre de progression : "Carte 2 sur 3"
- ✅ Compteur "2 restantes"

### 4.3 Test des raccourcis clavier

1. Sur la carte 2, cliquez sur Flip
2. Appuyez sur la touche **4** (Facile)

**Résultat attendu** :
- ✅ Carte suivante affichée (carte 3)
- ✅ Raccourci clavier fonctionne

### 4.4 Compléter la session

1. Continuez et notez la dernière carte
2. Une fois toutes les cartes revues

**Résultat attendu** :
- ✅ Page de résumé de session affichée
- ✅ Statistiques visibles :
  - Cartes revues : 3
  - Temps de révision : X secondes
  - Répartition des notes (combien de 1, 2, 3, 4)
- ✅ Bouton "Retour aux decks"

### 4.5 Vérification de l'algorithme FSRS

1. Retournez sur `/dashboard/revisions`
2. Vérifiez le deck révisé

**Résultat attendu** :
- ✅ "À réviser : 0" (toutes les cartes ont été revues)
- ✅ "Cartes maîtrisées" ou "En apprentissage" : 3
- ✅ Prochaine révision : dans X minutes/heures (selon les notes données)

---

## 📋 Test 5 : Système de Rétention FSRS-6

### 5.1 États des cartes

Vérifiez dans la base de données (table `srs_card_stats`) :

```sql
SELECT
  card_reference,
  state,
  difficulty,
  stability,
  due_date
FROM srs_card_stats
WHERE user_id = 'VOTRE_USER_ID'
ORDER BY due_date;
```

**Résultat attendu** :
- ✅ Cartes notées "Encore" → `state = 'relearning'` ou `state = 'learning'`
- ✅ Cartes notées "Difficile" → `stability` faible (< 1 jour)
- ✅ Cartes notées "Bien" → `stability` moyenne (1-3 jours)
- ✅ Cartes notées "Facile" → `stability` haute (> 3 jours)
- ✅ `due_date` calculée en fonction de la stabilité

### 5.2 Test de révision répétée

1. **Simuler le temps** : Modifiez manuellement les `due_date` dans la DB pour les remettre à `NOW()`
2. Retournez sur le deck et relancez une révision
3. Notez différemment les cartes (ex: "Encore" cette fois)

**Résultat attendu** :
- ✅ Carte notée "Encore" → `stability` diminue
- ✅ Carte notée "Facile" → `stability` augmente
- ✅ Algorithme FSRS adapte les intervalles

---

## 📋 Test 6 : Cas Limites

### 6.1 Deck sans cartes

1. Créez un deck vide (0 cartes)
2. Essayez de le réviser

**Résultat attendu** :
- ✅ Message "Aucune carte à réviser"
- ✅ Pas de crash

### 6.2 Edition de deck attribué (Professeur)

1. Reconnectez-vous en tant que **professeur**
2. Essayez de modifier le deck attribué

**Résultat attendu** :
- ✅ Erreur 403 "Cannot edit assigned deck"
- ✅ Ou option "Modifier" désactivée/absente

### 6.3 Suppression de deck attribué

1. Essayez de supprimer le deck attribué

**Résultat attendu** :
- ✅ Option "Supprimer" absente du menu
- ✅ Ou erreur si tentative directe

### 6.4 LaTeX dans les cartes

1. Créez une carte avec du LaTeX complexe :
   - Recto : "Intégrale de $e^x$ ?"
   - Verso : "$\int e^x \, dx = e^x + C$"
2. Révisez la carte

**Résultat attendu** :
- ✅ LaTeX rendu correctement avec MathLive
- ✅ Formules affichées proprement

---

## 📋 Test 7 : Statistiques et Dashboard

### 7.1 Dashboard élève

1. Allez sur `/dashboard` (élève)
2. Section SRS

**Résultat attendu** :
- ✅ Total decks : 2 (1 attribué + 1 personnel)
- ✅ À réviser : X cartes (selon les due_date)
- ✅ Cartes maîtrisées : X

### 7.2 Dashboard professeur

1. Connectez-vous en tant que **professeur**
2. Allez sur `/dashboard`
3. Section SRS Decks

**Résultat attendu** :
- ✅ Nombre de decks créés : 1
- ✅ Lien "Gérer les decks" fonctionnel

---

## 📋 Test 8 : Performances et Expérience

### 8.1 Fluidité de l'interface

- ✅ Animation de flip fluide (pas de lag)
- ✅ Transitions entre cartes instantanées
- ✅ Pas de flash/reload de page

### 8.2 Responsive design

Testez sur :
- 💻 Desktop (1920x1080)
- 📱 Mobile (375x667)
- 📱 Tablet (768x1024)

**Résultat attendu** :
- ✅ Interface adaptée à toutes les tailles
- ✅ Boutons accessibles
- ✅ Cartes lisibles

---

## 🐛 Liste de Vérification des Bugs Potentiels

### Base de données

- [ ] Migration s'exécute sans erreur
- [ ] RLS policies fonctionnent correctement
- [ ] CASCADE deletions fonctionnent

### API

- [ ] POST `/api/srs/decks` crée un deck
- [ ] POST `/api/srs/cards` crée une carte
- [ ] POST `/api/srs/review/submit` enregistre une révision
- [ ] GET `/api/srs/review/due?deck_id=X` retourne les cartes dues

### Composants

- [ ] `CustomFlashCard` affiche correctement le contenu
- [ ] `FSRSButtons` répond aux clicks et au clavier
- [ ] `ReviewSession` gère l'état correctement
- [ ] `TemplateSelector` (si intégré) fonctionne

### FSRS Algorithm

- [ ] `state` initial = 'new' pour nouvelles cartes
- [ ] `stability` et `difficulty` calculés correctement
- [ ] `due_date` calculée avec l'intervalle correct
- [ ] `retrievability` décroît avec le temps

---

## ✅ Checklist Finale

### Fonctionnalités Core

- [ ] Créer un deck (professeur)
- [ ] Ajouter des cartes personnalisées
- [ ] Attribuer un deck à un élève
- [ ] Élève peut voir les decks attribués
- [ ] Élève peut créer un deck personnel
- [ ] Réviser avec l'algorithme FSRS
- [ ] Raccourcis clavier (1-4) fonctionnent
- [ ] Statistiques mises à jour après révision

### Protection et Sécurité

- [ ] RLS empêche accès non autorisé
- [ ] Decks attribués en lecture seule
- [ ] Impossible de modifier/supprimer deck attribué
- [ ] Élève ne peut modifier que ses decks personnels

### Algorithme FSRS

- [ ] Cartes neuves → `state='new'`
- [ ] Après révision → `state='learning'` ou `state='review'`
- [ ] Carte oubliée → `state='relearning'`
- [ ] Intervalles croissent avec bonnes réponses
- [ ] Intervalles diminuent avec mauvaises réponses

### UX/UI

- [ ] Toasts de confirmation/erreur
- [ ] Animations fluides
- [ ] LaTeX rendu correctement
- [ ] Responsive design
- [ ] Navigation intuitive

---

## 📝 Rapport de Test

À remplir après les tests :

**Date** : __________
**Testeur** : __________

### Résumé

| Catégorie | Tests Réussis | Tests Échoués | Bugs Trouvés |
|-----------|---------------|---------------|--------------|
| Création deck | __ / __ | __ / __ | __ |
| Attribution | __ / __ | __ / __ | __ |
| Révision | __ / __ | __ / __ | __ |
| FSRS Algorithm | __ / __ | __ / __ | __ |
| UI/UX | __ / __ | __ / __ | __ |

### Bugs Identifiés

1. **[Critique/Majeur/Mineur]** - Description du bug
   - **Étapes de reproduction** :
   - **Comportement attendu** :
   - **Comportement observé** :

### Recommandations

-

---

## 🚀 Phase 2 (Fonctionnalités futures)

À tester une fois implémentées :

- [ ] Import/Export JSON de decks
- [ ] Sélection visuelle de templates depuis la banque
- [ ] Statistiques professeur (progression élèves)
- [ ] Tags pour organiser les cartes
- [ ] Mode hors-ligne (PWA)
- [ ] Notifications de révision
- [ ] Gamification (streaks, badges)

---

**Bonne chance avec les tests ! 🎯**
