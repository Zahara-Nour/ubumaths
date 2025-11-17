# Migration Reports

Documentation des migrations importantes du projet UbuMaths.

---

## 📋 Migrations

### [TinyMath Questions Migration - Phase 1](./tinymath-phase1-migration.md)

**Date** : November 2025
**Description** : Migration of 472 mathematical questions from TinyMath format to UbuMaths v2 question templates.

**Changes** :

- Centralized hash function for tracking
- Enhanced logging and validation
- 100% migration success with reconciliation
- Ready for Phase 2 (images), Phase 3, Phase 4

**Status** : ✅ Complete | **Next** : Phase 2

---

### [Academic Periods Migration](./MIGRATION_REPORT_ACADEMIC_PERIODS.md)

**Date** : 2025-10
**Description** : Ajout du système de périodes académiques avec clôture automatique et gestion des devoirs.

**Changes** :

- Nouvelle table `academic_periods`
- Migrations de données existantes
- Clôture automatique des périodes
- Gestion des devoirs par période

---

### Redis to Database Migration

**Date** : 2025-10-30
**Description** : Remplacement de Redis par des solutions database-native pour simplifier l'architecture.

**Changes** :

- ✅ Rate limiting : Redis → Supabase `rate_limits` table
- ✅ Suppression de dépendances Redis
- ✅ Architecture simplifiée (no external cache)
- ✅ Always fresh data

**Documentation historique** : [docs/archive/redis-era/](../archive/redis-era/)

---

## 🔗 Related Documentation

- [Database Schema](../architecture/database-schema.md) - Schema actuel complet
- [Database Migrations Guide](../development/database-migrations.md) - Comment créer des migrations
- [Git Workflow](../development/git-workflow.md) - Workflow pour commits de migration

---

**Navigation** : [← Back to Main Docs](../README.md)
