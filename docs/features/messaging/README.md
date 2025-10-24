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

---

## 📚 Documentation

- [Messagerie privée](private-messaging.md) - Système complet
- [Templates de messages](message-templates.md) - Créer et gérer des templates
- [Pièces jointes](attachments.md) - Upload et gestion de fichiers

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
