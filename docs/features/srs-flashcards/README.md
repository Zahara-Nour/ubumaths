# 📚 Index de Documentation - Système SRS

Bienvenue dans la documentation du système de révision espacée (SRS) d'UbuMaths !

---

## 🚀 Démarrage Rapide

**Vous êtes nouveau ?** Commencez ici :

1. **[Guide de Démarrage Rapide](SRS_QUICK_START.md)** 📖
   - Guide utilisateur complet
   - Workflow professeur et élève
   - Pas-à-pas avec captures d'écran
   - Bonnes pratiques

2. **[Plan de Test](SRS_TEST_PLAN.md)** ✅
   - Tests bout-en-bout
   - Checklist de validation
   - Cas limites
   - Rapport de test

3. **[Résumé d'Implémentation](SRS_IMPLEMENTATION_SUMMARY.md)** 🎯
   - Vue d'ensemble technique
   - Fichiers créés
   - Fonctionnalités complètes
   - Prochaines étapes

---

## 📖 Documentation par Audience

### 👨‍🏫 Pour les Professeurs

**Comment créer et gérer des decks**

1. [Guide de Démarrage - Section Professeur](SRS_QUICK_START.md#-pour-les-professeurs)
   - Créer votre premier deck
   - Ajouter des cartes
   - Attribuer aux élèves
   - Modifier un deck existant

2. [Documentation Technique - Workflow Professeur](SRS_SYSTEM_DOCUMENTATION.md#workflow-teacher-creates-deck)
   - Architecture détaillée
   - Flux de données
   - API endpoints

### 👨‍🎓 Pour les Élèves

**Comment réviser efficacement**

1. [Guide de Démarrage - Section Élève](SRS_QUICK_START.md#-pour-les-élèves)
   - Accéder à vos decks
   - Créer un deck personnel
   - Réviser avec FSRS
   - Comprendre l'algorithme

2. [Bonnes Pratiques de Révision](SRS_QUICK_START.md#-bonnes-pratiques)
   - Créer de bonnes cartes
   - Réviser efficacement
   - Nombre de cartes recommandé

### 🔧 Pour les Développeurs

**Architecture et implémentation technique**

1. [Documentation Système Complète](SRS_SYSTEM_DOCUMENTATION.md)
   - Architecture base de données
   - Algorithme FSRS-6 détaillé
   - API Reference complète
   - Diagrammes de flux

2. [Résumé d'Implémentation](SRS_IMPLEMENTATION_SUMMARY.md)
   - Fichiers créés
   - Composants Svelte
   - Types TypeScript
   - Métriques de code

3. [Plan de Test](SRS_TEST_PLAN.md)
   - Tests unitaires par fonctionnalité
   - Tests d'intégration
   - Validation FSRS

---

## 🗂️ Documentation par Sujet

### Base de Données

**Migration SQL** : [`supabase/migrations/080_create_srs_tables.sql`](supabase/migrations/080_create_srs_tables.sql)

**Tables** :

- `srs_decks` - Decks de révision
- `srs_cards` - Cartes individuelles
- `srs_card_stats` - Statistiques FSRS globales
- `srs_review_sessions` - Historique des sessions
- `srs_deck_assignments` - Attributions deck → élèves/classes

**Documentation** : [Architecture DB dans SRS_SYSTEM_DOCUMENTATION.md](SRS_SYSTEM_DOCUMENTATION.md#database-schema)

### Algorithme FSRS-6

**Fichiers** :

- `src/lib/srs/fsrs-algorithm.ts` - Implémentation
- `src/lib/srs/fsrs-types.ts` - Types
- `src/lib/srs/config.ts` - Configuration

**Documentation** : [FSRS Algorithm dans SRS_SYSTEM_DOCUMENTATION.md](SRS_SYSTEM_DOCUMENTATION.md#fsrs-6-algorithm)

**Explication utilisateur** : [Comprendre FSRS dans SRS_QUICK_START.md](SRS_QUICK_START.md#-comprendre-lalgorithme-fsrs)

### API Routes

**Endpoints disponibles** :

- **Decks** : GET/POST/PUT/DELETE `/api/srs/decks`
- **Cartes** : GET/POST/DELETE `/api/srs/cards`
- **Révision** : GET `/api/srs/review/due`, POST `/api/srs/review/submit`
- **Attribution** : POST `/api/srs/assign`, GET `/api/srs/assignments`

**Documentation** : [API Reference dans SRS_SYSTEM_DOCUMENTATION.md](SRS_SYSTEM_DOCUMENTATION.md#api-routes)

### Composants UI

**Composants créés** :

- `ReviewSession.svelte` - Interface de révision complète
- `CustomFlashCard.svelte` - Carte personnalisée avec flip
- `FSRSButtons.svelte` - Boutons de notation (1-4)
- `CustomCardEditor.svelte` - Éditeur de carte
- `TemplateSelector.svelte` - Sélecteur de templates (Phase 2)
- `DeckStatsCard.svelte` - Statistiques de deck

**Documentation** : [Components dans SRS_IMPLEMENTATION_SUMMARY.md](SRS_IMPLEMENTATION_SUMMARY.md#4-composants-svelte)

### Pages et Routes

**Pages Professeur** :

- `/dashboard/teacher/srs/decks` - Liste des decks
- `/dashboard/teacher/srs/decks/create` - Créer un deck
- `/dashboard/teacher/srs/decks/[id]/edit` - Modifier un deck
- `/dashboard/teacher/srs/decks/[id]/assign` - Attribuer un deck

**Pages Élève** :

- `/dashboard/revisions` - Liste des decks (attribués + personnels)
- `/dashboard/revisions/create` - Créer un deck personnel
- `/dashboard/revisions/decks/[id]/study` - Interface de révision

**Documentation** : [Pages dans SRS_IMPLEMENTATION_SUMMARY.md](SRS_IMPLEMENTATION_SUMMARY.md#5-pages-et-routes)

---

## 🔍 Recherche Rapide

### Je veux...

| Besoin                        | Document                                                | Section                        |
| ----------------------------- | ------------------------------------------------------- | ------------------------------ |
| Créer mon premier deck        | [Quick Start](SRS_QUICK_START.md)                       | Pour les Professeurs           |
| Réviser mes cartes            | [Quick Start](SRS_QUICK_START.md)                       | Pour les Élèves                |
| Comprendre l'algorithme FSRS  | [Quick Start](SRS_QUICK_START.md)                       | Comprendre l'algorithme FSRS   |
| Tester le système             | [Test Plan](SRS_TEST_PLAN.md)                           | Tous les tests                 |
| Voir l'architecture technique | [System Doc](SRS_SYSTEM_DOCUMENTATION.md)               | Database Schema + Architecture |
| Ajouter une fonctionnalité    | [Implementation Summary](SRS_IMPLEMENTATION_SUMMARY.md) | Phase 2                        |
| Debugger un problème          | [Quick Start](SRS_QUICK_START.md)                       | Résolution de problèmes        |
| Voir les fichiers créés       | [Implementation Summary](SRS_IMPLEMENTATION_SUMMARY.md) | Métriques                      |

---

## ✅ Checklist d'Installation

Avant d'utiliser le système SRS :

- [ ] Lire [SRS_QUICK_START.md](SRS_QUICK_START.md)
- [ ] Exécuter `pnpm db:migrate`
- [ ] Vérifier les 5 tables dans Supabase Dashboard
- [ ] Créer un compte professeur et un compte élève de test
- [ ] Suivre [SRS_TEST_PLAN.md](SRS_TEST_PLAN.md) pour validation

---

## 🎯 Fonctionnalités Principales

### ✅ Implémenté (Phase 1)

- [x] Création de decks (professeur)
- [x] Ajout de cartes personnalisées
- [x] Attribution deck → élèves/classes
- [x] Révision avec FSRS-6
- [x] Algorithme adaptatif (Difficulty, Stability, Retrievability)
- [x] États de carte (new, learning, review, relearning)
- [x] Raccourcis clavier (1-4)
- [x] Stats globales partagées
- [x] Protection lecture seule (decks attribués)
- [x] Support LaTeX (MathLive)
- [x] Animation flip 3D
- [x] Dashboard professeur
- [x] Dashboard élève
- [x] Decks personnels pour élèves

### 🚧 Phase 2 (À venir)

- [ ] Sélection visuelle de templates depuis banque
- [ ] Import/Export JSON de decks
- [ ] Statistiques professeur (progression élèves)
- [ ] Tags et organisation avancée
- [ ] Mode hors-ligne (PWA)
- [ ] Notifications de révision
- [ ] Gamification (streaks, badges)

---

## 🆘 Support et Dépannage

### Problèmes courants

**"Deck not found"**
→ [Résolution de problèmes dans Quick Start](SRS_QUICK_START.md#-résolution-de-problèmes)

**Les cartes ne s'affichent pas**
→ Vérifiez que le deck contient des cartes et rechargez la page

**Impossible de modifier un deck**
→ Les decks attribués sont en lecture seule par design

**Migration échoue**
→ Vérifiez votre connexion Supabase et que les tables n'existent pas déjà

### Où signaler un bug ?

1. Vérifiez d'abord [SRS_QUICK_START.md - Résolution de problèmes](SRS_QUICK_START.md#-résolution-de-problèmes)
2. Consultez [SRS_TEST_PLAN.md](SRS_TEST_PLAN.md) pour valider votre test
3. Si le bug persiste, documentez :
   - Étapes de reproduction
   - Comportement attendu vs observé
   - Captures d'écran si possible

---

## 📊 Statistiques du Projet

- **Fichiers créés** : ~36 fichiers
- **Lignes de code** : ~8800 (code + documentation)
- **Tables DB** : 5 tables
- **API Endpoints** : 12 routes
- **Composants UI** : 6 composants Svelte
- **Pages** : 8 pages (professeur + élève)
- **Documentation** : 4 guides complets

---

## 🎓 Ressources Externes

### FSRS Algorithm

- **Repository officiel** : [open-spaced-repetition/fsrs4anki](https://github.com/open-spaced-repetition/fsrs4anki)
- **Paper scientifique** : [FSRS: A Modern Spaced Repetition Algorithm](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm)
- **Wiki** : [FSRS Wiki](https://github.com/open-spaced-repetition/fsrs4anki/wiki)

### Spaced Repetition

- **SuperMemo** : [SM-2 Algorithm](https://www.supermemo.com/en/archives1990-2015/english/ol/sm2)
- **Anki** : [Anki Manual - Studying](https://docs.ankiweb.net/studying.html)

---

## 🗺️ Plan de la Documentation

```
SRS Documentation/
│
├── SRS_INDEX.md (vous êtes ici)
│   └── Navigation et recherche rapide
│
├── SRS_QUICK_START.md
│   ├── Guide utilisateur complet
│   ├── Workflow professeur
│   ├── Workflow élève
│   └── Bonnes pratiques
│
├── SRS_TEST_PLAN.md
│   ├── Tests bout-en-bout
│   ├── Checklist de validation
│   └── Rapport de test
│
├── SRS_IMPLEMENTATION_SUMMARY.md
│   ├── Vue d'ensemble technique
│   ├── Fichiers créés
│   └── Métriques
│
└── SRS_SYSTEM_DOCUMENTATION.md
    ├── Architecture complète
    ├── Database schema
    ├── Algorithme FSRS-6 détaillé
    └── API Reference
```

---

## 🚀 Prochaines Étapes

**Pour démarrer immédiatement** :

1. ✅ Lisez [SRS_QUICK_START.md](SRS_QUICK_START.md)
2. ✅ Exécutez `pnpm db:migrate`
3. ✅ Suivez [SRS_TEST_PLAN.md](SRS_TEST_PLAN.md)
4. ✅ Créez votre premier deck !

**Pour contribuer** :

1. Lisez [SRS_SYSTEM_DOCUMENTATION.md](SRS_SYSTEM_DOCUMENTATION.md)
2. Consultez [SRS_IMPLEMENTATION_SUMMARY.md](SRS_IMPLEMENTATION_SUMMARY.md)
3. Vérifiez Phase 2 pour les fonctionnalités à venir

---

**Dernière mise à jour** : 2025-10-22

**Statut du projet** : ✅ Phase 1 complète - Prêt pour les tests

**Bon apprentissage avec le SRS ! 🎯**
