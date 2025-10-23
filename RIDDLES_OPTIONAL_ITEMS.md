# 🔄 Items Optionnels - Système d'Énigmes

Ce fichier liste les **14 items optionnels** restants pour atteindre 100% de progression (actuellement ~97%).

**Note importante** : Le système est **100% fonctionnel en production** sans ces items. Ce sont des améliorations de confort et qualité, pas des fonctionnalités manquantes critiques.

---

## 📊 Vue d'Ensemble

| Catégorie | Items | Priorité | Estimation |
|-----------|-------|----------|------------|
| 🎨 UX/Design | 3 | Moyenne | ~3 jours |
| ⚡ Performance | 4 | Basse | ~5 jours |
| ♿ Accessibilité | 2 | Moyenne | ~2 jours |
| 🧪 Tests | 5 | Haute | ~1 semaine |
| **Total** | **14** | - | **~3 semaines** |

---

## 🎨 UX/Design (3 items)

### 1. Animations Confettis sur Succès
**Description** : Animation célébration quand énigme réussie
**Librairie** : `canvas-confetti` ou `react-confetti`
**Implémentation** :
- Trigger dans `RiddleCard.svelte` après validation réussie
- Animation canvas overlay temporaire
- Désactivable dans paramètres utilisateur (optionnel)

**Fichiers à modifier** :
- `src/lib/components/riddles/RiddleCard.svelte`
- `src/routes/api/riddles/[id]/submit/+server.ts` (réponse avec flag)

**Estimation** : 1 jour

---

### 2. Sons Feedback Succès/Échec
**Description** : Son court sur succès/échec validation
**Format** : MP3/OGG courts (~1s)
**Implémentation** :
- Audio sprites ou fichiers séparés
- Jouer via `HTMLAudioElement`
- Muet par défaut, activable dans settings
- Respect autoplay policies navigateurs

**Fichiers à créer** :
- `static/sounds/success.mp3`
- `static/sounds/error.mp3`
- `src/lib/utils/sound-player.ts`

**Fichiers à modifier** :
- `src/lib/components/riddles/RiddleCard.svelte`

**Estimation** : 0.5 jour

---

### 3. Loading Skeletons
**Description** : Squelettes au lieu de spinners pour meilleure UX
**Librairie** : `svelte-loading-skeleton` ou custom
**Implémentation** :
- Skeletons pour RiddleCard, leaderboard, stats
- Animations shimmer CSS
- Dimensions fixes pour éviter layout shift

**Composants à créer** :
- `src/lib/components/ui/skeleton/` (ou via shadcn-svelte)
  - `RiddleCardSkeleton.svelte`
  - `LeaderboardSkeleton.svelte`
  - `StatsCardSkeleton.svelte`

**Fichiers à modifier** :
- Toutes pages avec loading states

**Estimation** : 1.5 jour

---

## ⚡ Performance (4 items)

### 4. Cache Redis Énigme du Jour
**Description** : Cache l'énigme du jour pour éviter requête DB à chaque visite
**Stack** : Redis (Upstash ou self-hosted)
**Implémentation** :
- Cache key : `riddle:daily:{date}`
- TTL : 24 heures (expire minuit)
- Invalidation : Sur set/delete énigme du jour
- Fallback DB si cache miss

**Fichiers à créer** :
- `src/lib/server/redis.ts` (client Redis)

**Fichiers à modifier** :
- `src/routes/(protected)/dashboard/student/riddles/+page.server.ts`
- `src/routes/api/riddles/auto-select-daily/+server.ts`
- `src/lib/server/riddle-auto-select.ts`

**Variables env** :
- `REDIS_URL`

**Estimation** : 2 jours

---

### 5. Pagination Liste Énigmes
**Description** : Pagination si >100 énigmes dans liste professeur
**Librairie** : Custom ou `svelte-paginate`
**Implémentation** :
- Pagination backend (SQL LIMIT/OFFSET)
- Composant UI pagination (shadcn-svelte)
- 20 énigmes par page recommandé
- Navigation page précédente/suivante + numéros pages

**Fichiers à créer** :
- Possiblement `src/lib/components/ui/pagination/` (shadcn-svelte)

**Fichiers à modifier** :
- `src/routes/(protected)/dashboard/teacher/riddles/+page.server.ts`
- `src/routes/(protected)/dashboard/teacher/riddles/+page.svelte`

**Estimation** : 1 jour

---

### 6. Lazy Loading Images
**Description** : Images énigmes chargées à la demande (intersection observer)
**Implémentation** :
- Attribut `loading="lazy"` natif
- OU Intersection Observer custom
- Placeholder blur/skeleton pendant chargement
- Fallback si image manquante

**Fichiers à créer** :
- `src/lib/components/ui/LazyImage.svelte` (optionnel)

**Fichiers à modifier** :
- `src/lib/components/riddles/RiddleCard.svelte`
- `src/lib/components/riddles/RiddleOfTheDayCard.svelte`

**Estimation** : 0.5 jour

---

### 7. Debounce Recherche
**Description** : Debounce recherche/filtres pour réduire requêtes DB
**Implémentation** :
- Fonction debounce utilitaire
- Apply sur inputs recherche/filtres
- Délai 300-500ms recommandé
- Indicateur "Recherche en cours..."

**Fichiers à créer** :
- `src/lib/utils/debounce.ts` (si pas déjà existant)

**Fichiers à modifier** :
- `src/routes/(protected)/dashboard/teacher/riddles/+page.svelte` (si recherche ajoutée)
- `src/routes/(protected)/dashboard/student/riddles/history/+page.svelte` (filtres)

**Estimation** : 1 jour

---

## ♿ Accessibilité (2 items)

### 8. ARIA Labels Avancés
**Description** : Descriptions détaillées pour tous composants interactifs
**Guidelines** : WCAG 2.1 Level AA
**Implémentation** :
- `aria-label` sur tous boutons icônes
- `aria-describedby` pour hints contextuels
- `role` appropriés (button, dialog, alert)
- `aria-live` pour toasts/notifications
- `aria-expanded` pour composants pliables

**Fichiers à modifier** :
- Tous composants UI (RiddleCard, RiddleForm, inputs, buttons)
- Navigation (RiddleNav)
- Toasts (toaster)

**Estimation** : 1 jour

---

### 9. Optimisations Screen Reader
**Description** : Navigation optimale pour lecteurs d'écran
**Implémentation** :
- Structure sémantique HTML (nav, main, article, section)
- Skip links ("Aller au contenu")
- Focus management (dialogs, modals)
- Annonces contextuelles (`aria-live="polite"`)
- Textes alternatifs images (`alt`)
- Labels formulaires explicites

**Fichiers à modifier** :
- Layouts principaux (`+layout.svelte`)
- Tous composants interactifs
- Forms (RiddleForm, inputs)

**Estimation** : 1 jour

---

## 🧪 Tests (5 items)

### 10. Tests Unitaires Utilitaires
**Description** : Tests `riddle-validator.ts` et `riddle-badges.ts` avec Vitest
**Framework** : Vitest (déjà configuré)
**Couverture cible** : >80%

**Tests à écrire** :

#### `riddle-validator.test.ts`
- Test validation numérique (avec tolérance)
- Test validation texte (case sensitive/insensitive)
- Test validation QCM (choix unique/multiple)
- Test validation expression mathématique
- Test cas limites (null, undefined, types incorrects)

#### `riddle-badges.test.ts`
- Test calcul badges Perfectionniste (tous tiers)
- Test calcul badges Persévérant
- Test calcul badges Assidu
- Test calcul badges Expert (par genre)
- Test progression (earned vs in-progress)

**Fichiers à créer** :
- `src/lib/utils/riddle-validator.test.ts`
- `src/lib/utils/riddle-badges.test.ts`

**Commande** : `pnpm test:unit`

**Estimation** : 2 jours

---

### 11. Tests Intégration API
**Description** : Tests endpoints submit/auto-select
**Framework** : Vitest + Supertest (ou fetch natif)
**Implémentation** :
- Mock Supabase client
- Test POST `/api/riddles/[id]/submit`
  - Validation automatique réussie
  - Validation automatique échouée
  - Validation manuelle (is_correct: null)
  - Attribution gidouilles
  - Erreurs (énigme inexistante, pas connecté)
- Test POST `/api/riddles/auto-select-daily`
  - Sélection automatique réussie
  - Rotation difficultés
  - Exclusion énigmes récentes
  - Authentification API key

**Fichiers à créer** :
- `src/routes/api/riddles/[id]/submit/+server.test.ts`
- `src/routes/api/riddles/auto-select-daily/+server.test.ts`

**Estimation** : 2 jours

---

### 12. Tests E2E Complets
**Description** : Workflow bout-en-bout avec Playwright
**Framework** : Playwright (déjà configuré)
**Scénarios** :

#### Workflow Professeur
1. Login comme prof
2. Créer énigme avec validation auto
3. Publier énigme
4. Définir comme énigme du jour
5. Vérifier apparition dans interface élève

#### Workflow Élève
1. Login comme élève
2. Voir énigme du jour
3. Tenter avec réponse incorrecte
4. Vérifier toast erreur
5. Tenter avec réponse correcte
6. Vérifier attribution gidouilles
7. Consulter historique
8. Vérifier leaderboard

#### Workflow Validation Manuelle
1. Prof crée énigme sans validation auto
2. Élève soumet réponse libre
3. Prof reçoit notification
4. Prof valide réponse
5. Élève reçoit notification
6. Vérifier attribution gidouilles

**Fichiers à créer** :
- `e2e/riddles/teacher-workflow.spec.ts`
- `e2e/riddles/student-workflow.spec.ts`
- `e2e/riddles/manual-validation.spec.ts`

**Commande** : `pnpm test:e2e`

**Estimation** : 3 jours

---

### 13. Tests RLS Policies
**Description** : Vérification permissions par rôle
**Framework** : Vitest + Supabase client
**Implémentation** :
- Test SELECT riddles (teacher sees own + published, student sees published only)
- Test INSERT riddles (teacher only)
- Test UPDATE riddles (owner only)
- Test DELETE riddles (owner only)
- Test riddle_attempts (student insert own, teacher validate)
- Test riddle_of_the_day (all read, teacher write)

**Fichiers à créer** :
- `tests/rls/riddles.test.ts`

**Setup** :
- Mock users (teacher, student, admin)
- Mock Supabase auth context

**Estimation** : 1 jour

---

### 14. Tests Snapshot Composants
**Description** : Tests snapshot pour détecter régressions UI
**Framework** : Vitest + @testing-library/svelte
**Implémentation** :
- Snapshots RiddleCard (différents états)
- Snapshots RiddleForm
- Snapshots inputs spécialisés
- Snapshots badges
- Snapshots leaderboard/stats

**Fichiers à créer** :
- `src/lib/components/riddles/RiddleCard.test.ts`
- `src/lib/components/riddles/RiddleForm.test.ts`
- `src/lib/components/riddles/inputs/*.test.ts`

**Estimation** : 1 jour

---

## 🎯 Priorisation Recommandée

### 🔥 Haute Priorité (Recommandé pour v1.0 final)
1. **Tests E2E complets** (critique pour confiance déploiement)
2. **Tests unitaires utilitaires** (validation core logic)
3. **ARIA labels avancés** (accessibilité de base)

**Total** : ~1 semaine
**Progression après** : ~99%

### 🟡 Priorité Moyenne (v1.1)
4. **Animations confettis** (engagement élèves)
5. **Cache Redis énigme du jour** (performance si forte charge)
6. **Optimisations screen reader** (accessibilité complète)
7. **Tests intégration API**

**Total** : ~1 semaine supplémentaire
**Progression après** : 100%

### 🔵 Basse Priorité (Nice-to-have)
8. Sons feedback
9. Loading skeletons
10. Pagination liste énigmes
11. Lazy loading images
12. Debounce recherche
13. Tests RLS policies
14. Tests snapshot composants

**Total** : ~1 semaine si tout implémenté

---

## 📦 Installation Dépendances

```bash
# Animations
pnpm add canvas-confetti

# Cache Redis
pnpm add ioredis
# OU
pnpm add @upstash/redis

# Tests (déjà installés normalement)
pnpm add -D @testing-library/svelte vitest playwright

# Loading skeletons (si librairie)
pnpm add svelte-loading-skeleton
# OU utiliser shadcn-svelte skeleton
npx shadcn-svelte@latest add skeleton
```

---

## ✅ Checklist Complétion

### Phase 6 - Items Optionnels

#### 🎨 UX/Design
- [ ] Animations confettis succès
- [ ] Sons feedback succès/échec
- [ ] Loading skeletons

#### ⚡ Performance
- [ ] Cache Redis énigme du jour
- [ ] Pagination liste énigmes
- [ ] Lazy loading images
- [ ] Debounce recherche

#### ♿ Accessibilité
- [ ] ARIA labels avancés
- [ ] Optimisations screen reader

#### 🧪 Tests
- [ ] Tests unitaires utilitaires
- [ ] Tests intégration API
- [ ] Tests E2E complets
- [ ] Tests RLS policies
- [ ] Tests snapshot composants

---

## 📊 Impact sur Progression

| Scénario | Items complétés | Progression |
|----------|----------------|-------------|
| Actuel | 0/14 | ~97% |
| Haute priorité | 3/14 | ~99% |
| Moyenne priorité | 7/14 | 100% |
| Tout complété | 14/14 | 100% (full polish) |

---

## 🚀 Pour Démarrer

### Option 1 : Tests d'abord (Recommandé)
```bash
# 1. Tests E2E
pnpm add -D playwright
npx playwright install
# Créer e2e/riddles/*.spec.ts
pnpm test:e2e

# 2. Tests unitaires
# Créer *.test.ts
pnpm test:unit
```

### Option 2 : UX d'abord
```bash
# 1. Confettis
pnpm add canvas-confetti
# Modifier RiddleCard.svelte

# 2. ARIA
# Audit avec axe DevTools
# Ajouter aria-* attributs
```

### Option 3 : Performance d'abord
```bash
# 1. Cache Redis
pnpm add @upstash/redis
# Créer redis.ts
# Modifier +page.server.ts énigme du jour

# 2. Lazy loading
# Modifier images avec loading="lazy"
```

---

## 📝 Notes Techniques

### Confettis
- Déclencher uniquement 1ère réussite (pas à chaque visite)
- Stocker état dans localStorage ou vérifier attempts
- Désactiver sur mobile si performance faible

### Cache Redis
- Considérer coût (Upstash ~$0.20/100K requests)
- Alternative : Cache in-memory simple si monoserveur
- Monitoring hit rate

### Tests E2E
- Utiliser fixtures Playwright pour seed DB
- Cleanup après chaque test
- Parallel execution avec isolation

### Accessibilité
- Tester avec VoiceOver (Mac), NVDA (Windows), JAWS
- Vérifier navigation clavier uniquement
- Contraste vérifier avec axe DevTools

---

**Version** : 1.0.0
**Date** : Documentation items optionnels
**Statut** : 0/14 complétés (système 100% fonctionnel sans eux)

---

*💡 Ce fichier sert de référence pour les développeurs souhaitant contribuer aux améliorations optionnelles du système.*
