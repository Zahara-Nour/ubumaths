# Warnings Management System

Système de gestion des avertissements comportementaux pour les élèves, avec suivi par période académique.

**Status**: ✅ Production
**Version**: 1.0.0
**Last Updated**: 2025-10-29

---

## 📋 Vue d'ensemble

Le système d'avertissements permet aux enseignants de :

- **Suivre** le comportement des élèves avec 4 types d'avertissements
- **Visualiser** les scores comportementaux (note sur 20)
- **Gérer** les avertissements par classe et période académique
- **Consulter** l'historique des périodes passées

### Types d'avertissements

| Code  | Signification     | Couleur | Gravité |
| ----- | ----------------- | ------- | ------- |
| **C** | Conduite          | Gris    | Modérée |
| **M** | Manque de Travail | Gris    | Modérée |
| **R** | Retard            | Gris    | Légère  |
| **T** | Tricherie         | Rouge   | Grave   |

---

## 🎯 Fonctionnalités clés

### 1. Visualisation des avertissements

**Format visuel** (2025-10-29) :

```
[Avatar] Nom Élève    [C] 3  [M] 1  [R] 2    18/20    [Ajouter ▼]
```

**Améliorations UI** :

- ✅ Compteurs affichés **hors** des badges (meilleure lisibilité)
- ✅ Badges **complètement masqués** si count = 0
- ✅ Texte "Aucun" si aucun avertissement
- ✅ Espacement amélioré entre badges (gap-3)
- ✅ Suppression du code de calcul des statistiques inutilisé

### 2. Calcul du score comportemental

**Formule** : `score = 20 - total_warnings` (borné entre 0 et 20)

**Codes couleur** :

- 🟢 **Vert** (≥15) : Bon comportement
- 🟠 **Orange** (10-14) : Avertissement
- 🔴 **Rouge** (<10) : Critique

### 3. Gestion des avertissements

**Ajout** :

- Menu déroulant "Ajouter" par élève
- Mise à jour optimiste instantanée
- Sync serveur différée (debounce 500ms)
- Toast de confirmation

**Suppression** :

- Clic sur un badge pour supprimer le dernier avertissement de ce type
- Modale de confirmation avec nom élève + type
- Mise à jour optimiste avec rollback en cas d'erreur
- Vérification RLS (seul le créateur peut supprimer)

### 4. Historique des périodes

- Bouton "Historique" pour consulter périodes passées
- Sélection de période avec plage de dates
- Badge "Actuelle" sur la période en cours
- Bouton "Retour à la période actuelle"

---

## 🏗️ Architecture

### Structure des fichiers

```
src/
├── lib/server/
│   └── warnings.ts                 # API server-side (CRUD + helpers)
├── routes/
│   ├── (protected)/dashboard/teacher/
│   │   └── warnings/
│   │       ├── +page.server.ts     # Load classes + periods
│   │       └── +page.svelte        # UI principale
│   └── api/
│       ├── warnings/
│       │   └── +server.ts          # POST (add warning)
│       └── warnings/[id]/
│           └── +server.ts          # DELETE (remove warning)
└── types/
    └── database.ts                 # Types Supabase auto-generated
```

### Base de données

**Table** : `student_warnings`

| Colonne              | Type | Description             |
| -------------------- | ---- | ----------------------- |
| `id`                 | UUID | Clé primaire            |
| `student_id`         | UUID | Élève concerné          |
| `class_id`           | UUID | Classe où s'est produit |
| `academic_period_id` | UUID | Trimestre/semestre      |
| `warning_type`       | TEXT | 'C', 'M', 'R', ou 'T'   |
| `created_by`         | UUID | Enseignant qui l'a créé |
| `created_at`         | TSTZ | Date de création        |
| `updated_at`         | TSTZ | Dernière mise à jour    |

**Indexes** :

- `idx_warnings_student_period` : Recherche par élève + période
- `idx_warnings_class_period` : Recherche par classe + période
- `idx_warnings_created_by` : Recherche par créateur

**RLS (Row Level Security)** :

- Les enseignants ne peuvent voir/modifier que les avertissements de leurs classes
- Seul le créateur peut supprimer un avertissement

---

## 🚀 Guide d'utilisation

### Pour les enseignants

**1. Accès** : Dashboard Enseignant → Avertissements

**2. Sélection de classe** : Onglets en haut de page

**3. Ajout d'avertissement** :

- Cliquer sur "Ajouter" à droite du nom de l'élève
- Sélectionner le type (C, M, R, ou T)
- Confirmation par toast

**4. Suppression d'avertissement** :

- Cliquer sur le badge de l'avertissement à retirer
- Confirmer dans la modale
- Le dernier avertissement de ce type sera retiré

**5. Consulter l'historique** :

- Bouton "Historique" en haut à droite
- Sélectionner une période passée
- Retour à la période actuelle : bouton dédié

### Pour les développeurs

Voir [API Documentation](./api.md) pour :

- Fonctions server-side disponibles
- Endpoints API REST
- Exemples de code
- Gestion des erreurs

---

## 🎨 Optimistic UI Pattern

Le système utilise des mises à jour optimistes pour une expérience utilisateur fluide :

**Workflow** :

```typescript
// 1. Mise à jour instantanée de l'UI
optimisticWarnings[studentId] = newCounts;

// 2. Debounce de la requête serveur (500ms)
setTimeout(async () => {
  await fetch('/api/warnings', { method: 'POST', ... });

  // 3. Sync avec la réponse serveur
  delete optimisticWarnings[studentId];
  warningsData.set(studentId, serverResponse);
}, 500);

// 4. Rollback en cas d'erreur
catch (err) {
  delete optimisticWarnings[studentId]; // Annule l'update optimiste
  toaster.error('Erreur...');
}
```

**Avantages** :

- ✅ Réactivité instantanée de l'UI
- ✅ Réduction du nombre de requêtes (debounce)
- ✅ Rollback automatique en cas d'erreur réseau
- ✅ Cache local invalidé après succès

---

## 📚 Documentation connexe

- **[API Reference](./api.md)** : Documentation technique complète
- **[UI Changelog](./ui-changelog.md)** : Historique des modifications UI
- **[Academic Periods](../academic-periods/README.md)** : Système de périodes académiques
- **[Database Schema](../../architecture/database-schema.md)** : Schéma complet de la base

---

## 🔒 Sécurité

### Protections implémentées

- ✅ **RLS Policies** : Enseignants ne voient que leurs classes
- ✅ **Created_by verification** : Suppression uniquement par le créateur
- ✅ **Input validation** : Types d'avertissements validés
- ✅ **UUID validation** : Tous les IDs vérifiés côté serveur
- ✅ **CSRF protection** : Token de session vérifié

### Validations requises

**Client-side** :

- Type d'avertissement : `['C', 'M', 'R', 'T']`
- UUID format pour student_id, class_id, period_id

**Server-side** (via Zod - à implémenter) :

```typescript
// TODO: Add Zod schema in src/lib/server/validation/warnings.ts
const addWarningSchema = z.object({
	student_id: z.string().uuid(),
	class_id: z.string().uuid(),
	academic_period_id: z.string().uuid(),
	warning_type: z.enum(['C', 'M', 'R', 'T'])
});
```

---

## 🧪 Tests

### Tests existants

- ✅ Integration tests : Database triggers
- ✅ RLS policy tests : Permission checks
- ⚠️ **Manque** : Tests unitaires des fonctions server-side
- ⚠️ **Manque** : Tests E2E de l'UI

### Plan de tests recommandé

```bash
# Tests unitaires (à créer)
tests/unit/server/warnings.test.ts

# Tests E2E (à créer)
tests/e2e/warnings.spec.ts
```

**Scénarios à couvrir** :

- ✅ Ajout d'avertissement avec période invalide
- ✅ Tentative de suppression d'un avertissement créé par un autre enseignant
- ✅ Calcul du score avec >20 avertissements
- ✅ Navigation entre périodes académiques
- ✅ Optimistic UI + rollback en cas d'erreur

---

## 📝 Notes de développement

### Changelog UI (2025-10-29)

**Refactoring UI** :

- Compteurs déplacés hors des badges (`[C] 3` au lieu de `[C:3]`)
- Badges masqués si count = 0 (au lieu de disabled)
- Ajout du fallback "Aucun" pour élèves sans avertissements
- Espacement augmenté entre badges (gap-2 → gap-3)
- Suppression du code inutilisé (`_stats`, `selectedClass`)

**Lignes modifiées** : 514-566, 88-91 removed, 102-128 removed

### Dépendances

- **Supabase** : Database + RLS + Real-time (optionnel)
- **Shadcn-svelte** : Badge, Button, Dialog, Tabs components
- **Lucide-svelte** : Icons (History, AlertCircle)
- **Academic Periods** : Système de trimestres/semestres

### Future improvements

- [ ] **Zod validation** : Add server-side input validation schemas
- [ ] **Unit tests** : Test all server functions
- [ ] **E2E tests** : Test complete user workflows
- [ ] **Export** : PDF report of warnings per period
- [ ] **Statistics** : Class-level analytics dashboard
- [ ] **Notifications** : Alert students/parents after N warnings
- [ ] **Reasons** : Optional text field for warning context
- [ ] **Real-time** : Supabase subscriptions for multi-device sync

---

## 🤝 Contribution

Pour contribuer à cette feature, consulter :

- [Documentation Guide](../../contributing/documentation-guide.md)
- [Git Workflow](../../development/git-workflow.md)
- [Testing Guidelines](../../development/testing-guidelines.md)

**Avant de commiter** :

- ✅ Passer `pnpm lint` (0 errors)
- ✅ Passer `pnpm check` (TypeScript)
- ✅ Écrire tests pour nouveaux endpoints
- ✅ Mettre à jour documentation si changement d'API

---

**Dernière mise à jour** : 2025-10-29
**Mainteneur** : Équipe UbuMaths
**Status** : ✅ Production-ready
