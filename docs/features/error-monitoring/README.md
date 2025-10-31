# 🐛 Error Monitoring System

Système complet de monitoring et d'analyse d'erreurs pour UbuMaths.

**Status** : ✅ Production
**Version** : 1.0.0
**Dernière mise à jour** : 2025-10-23

---

## 🚀 Quick Start

### Accès rapide

- **Dashboard admin** : `/dashboard/admin/errors`
- **Page de test** : `/dashboard/admin/errors/test`

### Démarrage rapide (5 min)

Voir [quick-start.md](quick-start.md)

---

## 📖 Vue d'ensemble

Le système de monitoring d'erreurs capture automatiquement toutes les erreurs client et serveur, les déduplique, et permet une analyse centralisée dans un dashboard admin.

### Fonctionnalités clés

- ✅ Capture automatique (client + serveur)
- ✅ Déduplication intelligente
- ✅ Dashboard admin avec filtres
- ✅ Notifications pour erreurs critiques
- ✅ Protection de la vie privée (données élèves sanitizées)
- ✅ Service role bypass pour logging
- ✅ Statistiques et tendances

---

## 🏗️ Architecture

Le système utilise deux tables principales :

1. **`error_logs`** : Stocke chaque occurrence d'erreur
2. **`error_occurrences`** : Déduplique et agrège les erreurs similaires

### Flux de capture

```
Error occurs → Logger capture → Hash calculation →
Deduplication check → Insert/Update → Dashboard display
```

Pour plus de détails, voir [system.md](system.md)

---

## 🗺️ Roadmap

### Implemented ✅

- ✅ Global error capture (client + server)
- ✅ Error deduplication by hash
- ✅ Occurrence counting
- ✅ Stack trace analysis
- ✅ Context capture (URL, user agent, user info)
- ✅ Admin dashboard with filtering
- ✅ Error resolution tracking
- ✅ Database storage with indexes

### In Progress 🔄

- 🔄 Email notifications for critical errors
- 🔄 Error grouping by similarity
- 🔄 Performance impact monitoring

### Planned 📝

- 📝 Automated error assignment to developers
- 📝 Integration with external monitoring (Sentry, Rollbar)
- 📝 Error trends and analytics
- 📝 Source map support for minified code
- 📝 Error replay (session recording)
- 📝 Automated error categorization (AI-powered)

---

## 📚 Documentation

- [Quick Start (5 min)](quick-start.md) - Démarrage rapide
- [Architecture complète](system.md) - Documentation détaillée (70+ pages)
- [Dashboard admin](dashboard.md) - Utilisation du dashboard (à créer)

---

## 🔗 Liens connexes

- [Database Schema](../../architecture/database-schema.md) - Tables `error_logs` et `error_occurrences`
- [Notifications](../notifications/README.md) - Système de notifications pour alertes critiques

---

## 📊 Métriques

- **Erreurs capturées** : Toutes les erreurs JS/TS client + erreurs serveur
- **Déduplication** : Basée sur hash (message + stack + contexte)
- **Rétention** : Configurable (actuellement : indéfinie)

---

[← Retour aux features](../README.md)
