# SRS (Spaced Repetition System) - État d'Implémentation

**Date** : 2025-10-22
**Status** : Phase 1 - Backend Core (40% complété)

---

## ✅ Complété

### 1. Architecture & Types (100%)

**Fichiers créés** :
- `src/lib/srs/types.ts` - Interfaces TypeScript complètes (600+ lignes)
  - Deck, Card, CardStats, ReviewSession, DeckAssignment
  - API request/response types
  - Database types (Db*)

### 2. Algorithme FSRS (100%)

**Fichiers créés** :
- `src/lib/srs/config.ts` - Configuration FSRS-6 (paramètres, profils rétention)
- `src/lib/srs/fsrs.ts` - Classe FSRS complète (algorithme DSR)
  - Méthodes : initCard, reviewCard, calculateRetrievability, isDue
  - Formules FSRS-6 implémentées

### 3. Base de Données (100%)

**Migration créée** :
- `supabase/migrations/080_create_srs_tables.sql` (650+ lignes)
  - 5 tables : srs_decks, srs_cards, srs_card_stats, srs_review_sessions, srs_deck_assignments
  - Indexes optimisés
  - RLS policies (élève, prof)
  - Helper functions : get_due_cards_for_deck, get_deck_stats
  - Triggers : auto-update updated_at

### 4. Générateur d'Instances (100%)

**Fichier créé** :
- `src/lib/srs/generator.ts` - Génération instances SRS
  - generateSRSInstance() : Seed aléatoire pour variété
  - validateTemplateForSRS() : Validation templates

---

## 🚧 En Cours / À Faire

### 5. API Backend (0%)

**À créer** :

```
src/routes/api/srs/
├── decks/
│   ├── +server.ts              # GET (list), POST (create)
│   ├── [id]/+server.ts         # GET, PUT, DELETE
│   └── [id]/assign/+server.ts  # POST (assign to students/class)
├── cards/
│   ├── +server.ts              # GET (list), POST (add to deck)
│   └── [id]/+server.ts         # GET, PUT, DELETE
├── review/
│   ├── due/+server.ts          # GET cards due
│   └── submit/+server.ts       # POST review + update FSRS
└── stats/
    └── +server.ts              # GET user stats
```

**Endpoints clés** :

**Decks API** :
- `GET /api/srs/decks` - Liste decks user (with stats via get_deck_stats)
- `POST /api/srs/decks` - Create deck
- `GET /api/srs/decks/[id]` - Get deck
- `PUT /api/srs/decks/[id]` - Update deck (non-assigned only)
- `DELETE /api/srs/decks/[id]` - Delete deck (non-assigned only)
- `POST /api/srs/decks/[id]/assign` - Assign to students/class (creates copies)

**Cards API** :
- `GET /api/srs/cards?deck_id=X` - Liste cards in deck
- `POST /api/srs/cards` - Add card to deck
- `DELETE /api/srs/cards/[id]` - Remove card (non-assigned deck only)

**Review API** :
- `GET /api/srs/review/due?deck_id=X` - Get due cards (uses get_due_cards_for_deck)
- `POST /api/srs/review/submit` - Submit review result
  - Body: { cardId, grade, timeSpent }
  - Génère instance (if template)
  - Update FSRS stats
  - Return: updated stats, next review date

### 6. Frontend Élève (0%)

**Pages à créer** :

```
src/routes/(protected)/dashboard/revisions/
├── +page.svelte                # Liste decks + compteurs
├── +page.server.ts             # Load decks + stats
├── decks/
│   ├── create/+page.svelte     # Créer deck personnel
│   ├── [id]/+page.svelte       # Voir deck (liste cartes)
│   ├── [id]/edit/+page.svelte  # Éditer deck (non-assigned)
│   └── [id]/study/+page.svelte # Session révision
└── cards/
    └── create/+page.svelte     # Créer carte custom
```

**Composants à créer** :

```
src/lib/components/srs/
├── DeckCard.svelte             # Card display deck (name, due count, progress)
├── DeckList.svelte             # Grid de DeckCards
├── DeckSelector.svelte         # Sélection templates depuis banque
├── ReviewSession.svelte        # Orchestrateur session révision
├── FSRSButtons.svelte          # 4 boutons (Again/Hard/Good/Easy)
├── ReviewStats.svelte          # Stats fin session
├── CustomCardEditor.svelte     # Éditeur front/back (FormRichTextEditor)
└── CardProgress.svelte         # Barre progression carte (stability, next review)
```

### 7. Frontend Professeur (0%)

**Pages à créer** :

```
src/routes/(protected)/dashboard/teacher/decks/
├── +page.svelte                # Liste decks templates
├── create/+page.svelte         # Créer deck depuis banque
└── [id]/assign/+page.svelte    # Assigner deck à classe/élèves
```

### 8. Import/Export (Phase 2)

**À implémenter** :
- `POST /api/srs/decks/import` - Import JSON
- `GET /api/srs/decks/[id]/export` - Export JSON

**Format JSON** :
```json
{
  "deck_name": "Algèbre 6ème",
  "config": { "desiredRetention": 0.9 },
  "cards": [
    {
      "type": "template",
      "template_id": "uuid-123",
      "title": "Addition fractions"
    },
    {
      "type": "custom",
      "front": [{"type": "text", "content": "Q?"}],
      "back": [{"type": "text", "content": "R!"}]
    }
  ]
}
```

### 9. Documentation (0%)

**À créer** :
- `SRS_SYSTEM_DOCUMENTATION.md` - Architecture complète
- `SRS_API_REFERENCE.md` - Documentation API
- `SRS_USER_GUIDE.md` - Guide utilisateur
- `SRS_TEACHER_GUIDE.md` - Guide professeur

---

## 📐 Architecture Technique

### Types de Cartes

**Template-based** :
- Stocke template_id
- Génère nouvelle instance avec seed aléatoire à chaque révision
- Stats globales par (user_id, template_id)

**Custom** :
- Stocke front_content + back_content (JSONB ContentField[])
- Contenu statique (pas de régénération)
- Stats par (user_id, card_id)

### Statistiques FSRS

**Globales par utilisateur** :
- Si même template dans 2 decks → stats partagées
- Permet apprentissage progressif même si carte apparaît plusieurs fois

**Métadonnées trackées** :
- Difficulty (1-10)
- Stability (jours)
- State (new/learning/review/relearning)
- Last review, Next review
- Review history (JSONB array)

### Workflow Attribution Professeur

1. Prof crée deck template (from banque)
2. Prof assigne à classe/élèves
3. **Système crée COPIE** du deck pour chaque élève
   - Deck copié : is_assigned=true (lecture seule)
   - Cards copiées (références templates préservées)
4. Élève voit deck dans sa liste (non modifiable)
5. Élève révise → Stats FSRS créées/updatées

### Session de Révision

**Workflow** :
1. GET /api/srs/review/due?deck_id=X
2. Frontend affiche cartes dues (FlashCard)
3. User répond, clique grade button
4. POST /api/srs/review/submit { cardId, grade, timeSpent }
5. Backend :
   - Si template : Génère nouvelle instance (seed aléatoire)
   - Update FSRS stats (reviewCard)
   - Retourne next review date
6. Frontend affiche carte suivante

---

## 🎯 Prochaines Étapes

### Priorité 1 : API Backend
1. Créer API decks (CRUD + assign)
2. Créer API cards (CRUD)
3. Créer API review (due + submit)

### Priorité 2 : Frontend Élève
1. Page liste decks avec compteurs
2. Page session révision (FlashCard + FSRS buttons)
3. Composants réutilisables

### Priorité 3 : Frontend Prof
1. Page création deck depuis banque
2. Page attribution classe/élèves

### Priorité 4 : Features Avancées
1. Cartes custom (front/back rich text)
2. Import/Export JSON
3. Analytics dashboard

---

## 📝 Notes Techniques

### Réutilisation Composants Existants

**FlashCard.svelte** :
- Déjà implémenté, parfait pour affichage questions
- Utilisable en mode read-only (interactive=false)
- Flip 3D pour voir correction

**FormRichTextEditor.svelte** :
- Pour cartes custom (front/back)
- Déjà supporte LaTeX, rich text, images

**MathDisplay.svelte** :
- Rendu LaTeX dans cartes

### Intégration Question Bank

**Templates compatibles** :
- Tous types supportés (numerical, algebraic, QCM, etc.)
- Must be published (status='published')
- Must have variations

**Validation** :
- validateTemplateForSRS() vérifie compatibilité
- Test génération instance avant ajout

### Performance

**Indexes** :
- next_review index → queries due cards rapides
- user_id + card_reference → stats lookup rapide
- deck_id → liste cartes rapide

**Functions SQL** :
- get_due_cards_for_deck : Optimisé avec LEFT JOIN
- get_deck_stats : Compte cartes par state

---

## 🐛 Problèmes Connus / À Résoudre

Aucun pour l'instant (backend core non testé).

---

## ✅ Checklist Phase 1 MVP

- [x] Types TypeScript
- [x] Classe FSRS
- [x] Migration BDD
- [x] Générateur instances
- [ ] API decks
- [ ] API cards
- [ ] API review
- [ ] API assign
- [ ] Page liste decks élève
- [ ] Page session révision
- [ ] Composants SRS
- [ ] Page création deck prof
- [ ] Page attribution deck
- [ ] Documentation

**Progression** : 4/14 tâches (29%)

---

**Dernière mise à jour** : 2025-10-22
**Auteur** : Claude Code
