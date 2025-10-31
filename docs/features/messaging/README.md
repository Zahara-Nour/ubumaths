# 💬 Système de messagerie

Système de messagerie privée entre enseignants et élèves avec templates et pièces jointes.

**Status** : ✅ Production
**Version** : 1.0.0
**Dernière mise à jour** : 2025-10-22

---

## 🚀 Quick Start

### Accès

- **Enseignants** : `/dashboard/teacher/messages`
- **Élèves** : `/dashboard/student/messages`

### Fonctionnalités principales

- ✅ Messagerie privée enseignant ↔ élève
- ✅ Threads de conversation
- ✅ Templates de messages réutilisables
- ✅ Éditeur rich text (TipTap + MathLive)
- ✅ Pièces jointes (max 5MB)
- ✅ Read receipts (accusés de réception)
- ✅ Notifications en temps réel

---

## 📖 Vue d'ensemble

Le système de messagerie permet aux enseignants de communiquer individuellement avec leurs élèves, avec support pour le texte enrichi, les formules mathématiques, et les fichiers.

### Architecture

```
Enseignant → Rédige message → Template (optionnel) →
Rich text editor → Pièce jointe (optionnelle) →
Envoi → Notification élève → Réponse → Thread
```

### Polling des Messages Non Lus

**🆕 2025-10-28** : Système de polling unifié pour optimiser les performances.

Le compteur de messages non lus est maintenant géré par le **polling unifié** (`activityStore`), qui combine les notifications et les messages en une seule requête HTTP.

**Avantages**:

- ✅ **50% moins de requêtes** (partagé avec les notifications)
- ✅ **Exécution parallèle** des requêtes base de données
- ✅ **Rétrocompatible** : `privateMessages.unreadCount` fonctionne toujours

**Architecture technique**:

```typescript
// Le polling démarre dans dashboard/+layout.svelte
activityStore.startPolling(30000); // Toutes les 30 secondes

// activityStore appelle /api/activity/unread-counts
// → Retourne { notifications: 5, messages: 3 }
// → Met à jour privateMessages.unreadCount automatiquement
```

**Pour développeurs** : Voir [Polling Patterns Guide](../../development/polling-patterns.md) pour plus de détails.

---

## 📚 Documentation

- [Messagerie privée](private-messaging.md) - Système complet
- [Templates de messages](message-templates.md) - Créer et gérer des templates
- [Pièces jointes](attachments.md) - Upload et gestion de fichiers

---

## 🗺️ Roadmap

### Implemented ✅

- ✅ Private messaging between teacher and student
- ✅ Rich text editor (TipTap + MathLive)
- ✅ Message templates system
- ✅ Attachment support (images, PDFs)
- ✅ Read/unread status tracking
- ✅ Real-time notifications
- ✅ Message threading

### In Progress 🔄

- 🔄 Group messaging (class broadcasts)
- 🔄 Message search functionality
- 🔄 Message archiving

### Planned 📝

- 📝 Voice messages
- 📝 Video messages
- 📝 Message reactions (emoji)
- 📝 Message scheduling
- 📝 Auto-responses
- 📝 Translation support

---

## 🎯 Cas d'usage

### Pour les enseignants

- Envoyer des feedbacks personnalisés
- Rappels individuels pour devoirs
- Questions privées sur un cours
- Templates pour messages fréquents

### Pour les élèves

- Poser des questions privées
- Demander de l'aide sur un exercice
- Répondre aux feedbacks

---

## 🔗 Liens connexes

- [Templates système](../templates/README.md) - Templates pré-définis
- [Notifications](../notifications/README.md) - Alertes de nouveaux messages
- [Rich Text Editor](../../architecture/rich-text-editor.md) - Éditeur TipTap + MathLive

---

[← Retour aux features](../README.md)
