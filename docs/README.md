# 📚 UbuMaths Documentation

Documentation complète de la plateforme éducative UbuMaths.

**Dernière mise à jour** : 2025-10-29
**Statut** : 🟢 Active Development

---

## 🚀 Démarrage rapide

| Pour...                       | Voir                                            |
| ----------------------------- | ----------------------------------------------- |
| **Démarrer le développement** | [CLAUDE.md](../CLAUDE.md) à la racine           |
| **Documentation Claude Code** | [docs/claude/](claude/README.md) ⭐             |
| **Comprendre l'architecture** | [Architecture](#-architecture)                  |
| **Découvrir les features**    | [Features](#-features-implémentées)             |
| **Contribuer au projet**      | [Guide de contribution](contributing/README.md) |

---

## 🤖 Documentation Claude Code

Documentation détaillée pour Claude Code lors du développement.

| Document                                                   | Description                                    |
| ---------------------------------------------------------- | ---------------------------------------------- |
| [Index Claude Docs](claude/README.md) ⭐                   | Vue d'ensemble documentation Claude            |
| [Architecture](claude/architecture.md)                     | Structure, routing, data fetching, performance |
| [Best Practices](claude/best-practices.md)                 | Svelte 5, TypeScript, anti-patterns            |
| [UI Components](claude/ui-components.md)                   | Shadcn, MySelect, Tailwind                     |
| [Database](claude/database.md)                             | Supabase, migrations, schéma                   |
| [Quality Standards](claude/quality-standards.md) ⭐⭐⭐    | Tests, linting, Zod validation                 |
| [Teacher Cache](claude/teacher-cache.md)                   | Client-side cache dashboard enseignant         |
| [Student Cache](claude/student-cache.md) 🆕                | Client-side cache dashboard étudiant           |
| [Inline Editing Pattern](claude/inline-editing-pattern.md) | Pattern standard pour édition inline           |

---

## 🎯 Features implémentées

### 📝 Système de questions

**Status** : ✅ Production | [Documentation →](features/questions/README.md)

Système complet de banque de questions avec variables, génération aléatoire, 6 types de questions.

- [Architecture technique](features/questions/architecture.md)
- [Système de variables](features/questions/variable-system.md)
- [Guide de syntaxe](features/questions/syntax-guide.md)
- [API REST](features/questions/api.md)

### 📊 Évaluations (Assessments)

**Status** : ✅ Production | [Documentation →](features/assessments/README.md)

Création et gestion d'évaluations par les enseignants, passage par les élèves, correction.

- [Workflow enseignant](features/assessments/teacher-flow.md)
- [Workflow élève](features/assessments/student-flow.md)
- [Système de notation](features/assessments/grading.md)

### 📅 Périodes académiques

**Status** : ✅ Production | [Documentation →](features/academic-periods/README.md) 🆕

Système complet de gestion du calendrier académique : années scolaires, trimestres/semestres, vacances.

- [Guide utilisateur](features/academic-periods/user-guide.md)
- [Référence API](features/academic-periods/api-reference.md)
- [Schéma base de données](features/academic-periods/database.md)
- Auto-assignation des évaluations aux périodes
- Duplication d'années scolaires avec offset de dates
- **2025-10-28** : Implémentation complète avec triggers et RLS

### 🗂️ SRS & Flashcards

**Status** : ✅ Production | [Documentation →](features/srs-flashcards/README.md)

Système de répétition espacée (FSRS) avec flashcards interactives.

- [Algorithme FSRS](features/srs-flashcards/fsrs-algorithm.md)
- [Gestion des decks](features/srs-flashcards/deck-management.md)
- [Composants (FlashCard, QuestionCard, CorrectionCard)](features/srs-flashcards/components.md)
- [Migration v1→v2](features/srs-flashcards/migration-v1-v2.md)

### 🧩 Système d'énigmes

**Status** : ✅ Production | [Documentation →](features/riddles/README.md)

Énigmes quotidiennes avec système de badges et récompenses.

- [Démarrage rapide](features/riddles/quick-start.md)
- [Implémentation](features/riddles/implementation.md)
- [Déploiement](features/riddles/deployment.md)

### 📓 Banque d'exercices

**Status** : ✅ Production | [Documentation →](features/exercises/README.md)

Système de création et gestion d'exercices en markdown avec export LaTeX/PDF.

- Parser markdown avec support LaTeX (✅ Complet)
- Transpiler vers LaTeX (✅ Complet)
- Composants d'édition et affichage (✅ Complet)
- Interface enseignant (✅ Production)
- Import/Export JSON/Markdown (✅ Complet)
- **2025-10-26** : 45 erreurs ESLint corrigées, feature production-ready

### ⚠️ Avertissements

**Status** : ✅ Production | [Documentation →](features/warnings/README.md) 🆕

Système de gestion des avertissements comportementaux pour les élèves.

- [Documentation API](features/warnings/api.md)
- [Historique UI](features/warnings/ui-changelog.md)
- 4 types d'avertissements (C, M, R, T)
- Calcul automatique du score comportemental (note/20)
- Historique par période académique
- Optimistic UI avec debouncing asymétrique
- Cache 3 min TTL avec Event Bus
- **2025-10-29** : UI refactoring (badge + count séparés, "Aucun" fallback)

### 💰 Récompenses (Gidouilles & VIP Cards)

**Status** : ✅ Production | [Documentation →](features/rewards/README.md) 🆕

Système de récompenses gamifié pour motiver les élèves.

- Gidouilles (monnaie virtuelle) avec +/- ajustement
- Cartes VIP (Joker Homework, Extra Time, etc.)
- [Multi-card drawing system](features/vip-card-draw-system.md) (1-10 cards at once) 🆕
- Rarity-weighted distribution (60% common, 25% rare, 12% epic, 3% legendary)
- Configurable probabilities for special events
- Boutique élève pour acheter des cartes
- Distribution en masse par classe
- Optimistic UI avec debouncing (500ms)
- Cache 5 min TTL avec Event Bus
- Batching automatique (10 clics = 1 requête DB)
- **2025-11-04** : Rarity-weighted VIP card drawing system
- **2025-10-29** : Cache architecture séparée + cross-device sync

### 🔄 Synchronisation multi-appareils

**Status** : ✅ Production | [Documentation →](features/cross-device-sync.md) 🆕 ⭐

Synchronisation temps réel entre plusieurs appareils pour les dashboards enseignants.

- **Architecture** : Polling-only (BroadcastChannel supprimé 2025-10-29)
- **Endpoint unifié** : `/api/teacher/dashboard-sync` (50% moins de requêtes)
- Polling toutes les 5 secondes (laptop + projecteur use case)
- Smart behaviors : pause pendant édition, pause si onglet caché
- Intégré avec Redis cache (50ms response, 99% hit rate)
- Pages supportées : Récompenses, Avertissements
- **Simplification** : ~400 lignes de code supprimées
- **2025-10-29** : Refactoring complet vers polling unifié

### 🎮 Navadra (Combat Math)

**Status** : 🔄 En cours | [Documentation →](features/navadra/README.md)

Système de combat mathématique gamifié.

- [Guide d'intégration](features/navadra/integration-guide.md)
- [Guide des assets](features/navadra/assets-guide.md)
- [Phases d'implémentation](features/navadra/implementation-phases.md)

### 💬 Messagerie privée

**Status** : ✅ Production | [Documentation →](features/messaging/README.md)

Système de messagerie enseignant-élève avec templates et pièces jointes.

- [Messagerie privée](features/messaging/private-messaging.md)
- [Templates de messages](features/messaging/message-templates.md)
- [Pièces jointes](features/messaging/attachments.md)

### 🔔 Notifications

**Status** : ✅ Production | [Documentation →](features/notifications/README.md)

Système de notifications avec ciblage et priorités.

### 🐛 Monitoring d'erreurs

**Status** : ✅ Production | [Documentation →](features/error-monitoring/README.md)

Système complet de capture et analyse d'erreurs.

- [Démarrage rapide](features/error-monitoring/quick-start.md)
- [Architecture système](features/error-monitoring/system.md)
- [Dashboard admin](features/error-monitoring/dashboard.md)

### 📄 Templates de messages

**Status** : ✅ Production | [Documentation →](features/templates/README.md)

Templates réutilisables pour la communication.

- [Guide utilisateur admin](features/templates/user-guide-admin.md)
- [Guide utilisateur enseignant](features/templates/user-guide-teacher.md)
- [Démarrage rapide](features/templates/quick-start.md)

### 🔐 Authentification

**Status** : ✅ Production | [Documentation →](features/authentication/README.md)

Système d'authentification avec Google OAuth + email/password.

- [Architecture système](features/authentication/system.md)

---

## 🏗️ Architecture

| Document                                                                 | Description                              |
| ------------------------------------------------------------------------ | ---------------------------------------- |
| [Vue d'ensemble](architecture/README.md)                                 | Architecture générale du projet          |
| [Structure du projet](architecture/project-structure.md)                 | Organisation des dossiers et fichiers    |
| [Schéma base de données](architecture/database-schema.md)                | Tables, relations, RLS policies          |
| [Component Architecture](architecture/components.md) ⭐                  | MySelect, standardisation dropdowns      |
| [Routing](architecture/routing.md)                                       | Routes SvelteKit et organisation         |
| [WebSocket](architecture/websocket.md)                                   | Architecture temps réel                  |
| [Éditeur rich text](architecture/rich-text-editor.md)                    | TipTap + MathLive                        |
| [Performance](architecture/performance.md)                               | Optimisations et best practices          |
| [Teacher Dashboard Cache](architecture/teacher-dashboard-cache.md) (OLD) | ⚠️ Pre-2025-10-29 (BroadcastChannel era) |
| [CSRF Protection](architecture/csrf-protection.md)                       | Protection anti-CSRF                     |

---

## 📖 Guides pratiques

| Guide                                                     | Description                      |
| --------------------------------------------------------- | -------------------------------- |
| [Getting Started](getting-started/README.md) ⭐           | Installation et premiers pas     |
| [Vue d'ensemble](guides/README.md)                        | Index des guides                 |
| [Import d'élèves](guides/student-import.md)               | Workflow d'import CSV            |
| [Déploiement](guides/deployment.md)                       | Déploiement sur Vercel           |
| [Dépannage](guides/troubleshooting.md)                    | Solutions aux problèmes courants |
| [Guide de tests](guides/testing-guide.md)                 | Comment tester l'application     |
| [Composants UI](guides/ui-components.md)                  | Utilisation Shadcn-svelte        |
| [Admin VIP Cards](guides/admin-vip-card-management.md) 🆕 | Gestion des cartes VIP (admin)   |
| [Migration Reports](migrations/README.md) 🆕              | Rapports de migrations clés      |

---

## 🛠️ Développement

| Document                                                       | Description                         |
| -------------------------------------------------------------- | ----------------------------------- |
| [Vue d'ensemble](development/README.md)                        | Process de développement            |
| [Git workflow](development/git-workflow.md)                    | Workflow Git et branches            |
| [Gestion de versions](development/version-management.md)       | Releases et versioning              |
| [Migrations DB](development/database-migrations.md)            | Workflow migrations Supabase        |
| [Style de code](development/code-style.md)                     | Standards et conventions            |
| [Debugging Guide](development/debugging-guide.md) (OLD)        | ⚠️ Pre-2025-10-30 (Redis cache era) |
| [Cache Logging Format](development/cache-logging-format.md) 🆕 | Format logs cache standardisé       |
| [Polling Patterns](development/polling-patterns.md) 🆕         | Guide polling unifié                |
| [Rate Limiting Redis](development/rate-limiting-redis.md) 🆕   | Migration rate limiting Redis       |
| [Type Safety Patterns](development/type-safety-patterns.md) 🆕 | Patterns TypeScript sécurisés       |
| [Migration Svelte 5](development/svelte5-migration.md)         | Guide migration runes               |
| [MySelect Migration](development/myselect-migration.md)        | Guide migration vers MySelect       |

---

## 🧪 Tests

**Status** : ✅ 3,218 tests (99.2% pass rate) | [Documentation →](testing/README.md)

### Tests Unitaires (Vitest)

| Document                                                       | Description                               |
| -------------------------------------------------------------- | ----------------------------------------- |
| [Vue d'ensemble](testing/README.md)                            | Documentation générale des tests          |
| [100% Pass Rate](testing/test-suite-achievement.md) ⭐         | Histoire de l'achievement                 |
| [Infrastructure](testing/test-infrastructure.md) ⭐            | Guide des helpers de test                 |
| [Patterns communs](testing/common-test-patterns.md) ⭐         | Référence rapide des patterns             |
| [Database Trigger Tests](testing/database-trigger-tests.md) ⭐ | Tests des triggers PostgreSQL (139 tests) |
| [Rapport Questions](../TEST_REPORT_QUESTIONS.md)               | Tests feature Questions                   |
| [Rapport Assessments](testing/ASSESSMENT_TEST_REPORT.md)       | Tests feature Assessments                 |
| [Rapport Templates](testing/message-templates-test-report.md)  | Tests templates de messages               |
| [Rapport Riddles](testing/riddles-test-report.md)              | Tests feature Riddles                     |

### Tests E2E (Playwright) 🆕

| Document                                                         | Description                               |
| ---------------------------------------------------------------- | ----------------------------------------- |
| [Testing Overview](development/testing/README.md) ⭐             | Vue d'ensemble de tous les types de tests |
| [E2E Testing Guide](development/testing/e2e-testing-guide.md) ⭐ | Guide complet e2e (283 tests)             |
| [Auth Tests](development/testing/e2e-auth-tests.md)              | Tests authentification & RBAC (95 tests)  |
| [Teacher Tests](development/testing/e2e-teacher-tests.md)        | Tests features enseignant (50 tests)      |
| [Student Tests](development/testing/e2e-student-tests.md)        | Tests features élève (56 tests)           |

---

## 🤝 Contribution

| Document                                                          | Description                        |
| ----------------------------------------------------------------- | ---------------------------------- |
| [Guide de contribution](contributing/README.md)                   | Comment contribuer                 |
| [Guide de documentation](contributing/documentation-guide.md)     | ⭐ Comment écrire la documentation |
| [Implémentation features](contributing/feature-implementation.md) | Process pour nouvelles features    |
| [Checklist code review](contributing/code-review-checklist.md)    | Points à vérifier                  |

---

## 🔧 Troubleshooting

| Document                                                         | Description                            |
| ---------------------------------------------------------------- | -------------------------------------- |
| [Troubleshooting Guide](troubleshooting/README.md) ⭐            | Common issues and solutions            |
| [Environment Loading Fix](troubleshooting/env-loading-fix.md) 🆕 | Technical guide to lazy initialization |

---

## 📦 Archive

Documentation historique et obsolète : [Archive →](archive/README.md)

---

## 🔗 Liens externes

- **Svelte 5** : https://svelte.dev/docs/svelte/overview
- **SvelteKit** : https://kit.svelte.dev/docs
- **Shadcn-svelte** : https://www.shadcn-svelte.com/docs
- **MathLive** : https://cortexjs.io/mathlive/
- **Supabase** : https://supabase.com/docs
- **Tailwind CSS** : https://tailwindcss.com/docs

---

## 📊 Statistiques

- **Features en production** : 13 🆕 (added Rewards system)
- **Features en développement** : 1 (Navadra)
- **Tests** : 3,334 tests (99.3% pass rate)
  - Unit tests: 2,526/2,550 passing (99.1%)
  - E2E tests: 303 ready to run
  - Validation tests: 366/366 passing (100%)
  - Database triggers: 139/139 passing (100%)
- **Code Quality** : 0 errors in production code (853 → 0)
- **Data Fetching** : Direct database queries (no caching layer since 2025-10-30)
  - Strategic database indexes on hot paths
  - Optimistic UI for better perceived performance
  - 97% fewer N+1 queries (244 → 6 per load)
- **Database Tables** : 3 new tables (school_years, academic_periods, school_holidays) 🆕
- **Lignes de documentation** : ~30,000+
- **Dernière mise à jour** : 2025-10-30

---

**Maintenu par** : L'équipe UbuMaths
**Questions** : Consulter la documentation ou contacter l'équipe
