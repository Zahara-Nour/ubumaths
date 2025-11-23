# 🎯 Features Documentation

Documentation de toutes les fonctionnalités implémentées dans UbuMaths.

---

## Features en production

### [📝 Questions](questions/README.md)

Système de banque de questions avec variables et génération aléatoire.
**Status** : ✅ Production

### [📊 Assessments](assessments/README.md)

Création et gestion d'évaluations par les enseignants.
**Status** : ✅ Production

### [🗂️ SRS & Flashcards](srs-flashcards/README.md)

Système de répétition espacée (FSRS) avec flashcards.
**Status** : ✅ Production

### [🧩 Riddles](riddles/README.md)

Système d'énigmes quotidiennes avec badges.
**Status** : ✅ Production

### [💬 Messaging](messaging/README.md)

Messagerie privée enseignant-élève.
**Status** : ✅ Production

### [🔔 Notifications](notifications/README.md)

Système de notifications avec ciblage.
**Status** : ✅ Production

### [🐛 Error Monitoring](error-monitoring/README.md)

Monitoring d'erreurs complet.
**Status** : ✅ Production

### [📄 Templates](templates/README.md)

Templates de messages réutilisables.
**Status** : ✅ Production

### [🔐 Authentication](authentication/README.md)

Authentification Google OAuth + email/password.
**Status** : ✅ Production

### [📓 Exercises](exercises/README.md)

Banque d'exercices en markdown avec export LaTeX/PDF.
**Status** : ✅ Production

### [📋 Worksheets](worksheets.md)

Feuilles d'exercices, evaluations et examens avec systeme de variantes et generation PDF.
**Status** : ✅ Production

**Guides disponibles** :

- [Documentation complete](worksheets.md) - Vue d'ensemble et workflows
- [Systeme de variantes](worksheet-variants.md) - Generation de variantes par eleve
- [Architecture PDF](../architecture/worksheet-pdf-generation.md) - Generation Typst/PDF

### [⚠️ Warnings](warnings/README.md)

Gestion des avertissements comportementaux par période académique.
**Status** : ✅ Production

### [🛡️ Chat Moderation](chat-moderation.md)

Système de modération de chat pour enseignants et admins.
**Status** : ✅ Production

### [🎴 VIP Card System](VIP_CARDS_INDEX.md)

Système complet de cartes VIP avec échange, tirage, activation et interface visuelle.
**Status** : ✅ Production

**Guides disponibles** :

- [Index complet](VIP_CARDS_INDEX.md) - Navigation de toute la documentation
- [Guide UI](vip-card-ui-guide.md) - Interface de sélection visuelle (utilisateurs)
- [Système d'échange](vip-card-exchange-system.md) - Échange et conversion de cartes
- [Système de tirage](vip-card-draw-system.md) - Tirage de cartes avec distribution
- [Système d'activation](vip-card-activation.md) - Activation et approbation

---

## Features en développement

### [🎮 Navadra](navadra/README.md)

Système de combat mathématique gamifié.
**Status** : 🔄 En développement

---

## Organisation

Chaque feature suit cette structure :

```
feature-name/
├── README.md           # Vue d'ensemble + quick start
├── architecture.md     # Architecture technique
├── user-guide.md       # Guide utilisateur
├── api.md             # Documentation API (si applicable)
└── testing.md         # Tests et validation (si applicable)
```

---

[← Retour à l'index principal](../README.md)
