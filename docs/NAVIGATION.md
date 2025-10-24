# 🧭 Guide de navigation

Guide rapide pour trouver la documentation dont vous avez besoin.

---

## 🔍 Recherche par besoin

### "Je veux comprendre comment fonctionne..."

| Besoin | Documentation |
|--------|---------------|
| Le système de questions | [features/questions/](features/questions/) |
| Les évaluations | [features/assessments/](features/assessments/) |
| Les flashcards/SRS | [features/srs-flashcards/](features/srs-flashcards/) |
| La géométrie dynamique | [features/geometry/](features/geometry/) |
| Le monitoring d'erreurs | [features/error-monitoring/](features/error-monitoring/) |
| La base de données | [architecture/database-schema.md](architecture/database-schema.md) |
| L'architecture générale | [architecture/](architecture/) |

### "Je veux faire..."

| Tâche | Documentation |
|-------|---------------|
| Créer une nouvelle feature | [contributing/feature-implementation.md](contributing/feature-implementation.md) |
| Écrire de la documentation | [contributing/documentation-guide.md](contributing/documentation-guide.md) ⭐ |
| Faire une release | [development/version-management.md](development/version-management.md) |
| Créer une migration DB | [development/database-migrations.md](development/database-migrations.md) |
| Importer des élèves | [guides/student-import.md](guides/student-import.md) |
| Débugger un problème | [guides/troubleshooting.md](guides/troubleshooting.md) |

### "J'ai un problème avec..."

| Problème | Documentation |
|----------|---------------|
| Svelte 5 / runes | [development/svelte5-migration.md](development/svelte5-migration.md) |
| Git workflow | [development/git-workflow.md](development/git-workflow.md) |
| UI components | [CLAUDE.md](../CLAUDE.md#ui-components-shadcn-svelte) |
| Performance | [architecture/performance.md](architecture/performance.md) |
| WebSocket | [architecture/websocket.md](architecture/websocket.md) |

---

## 📱 Par rôle

### Développeurs

**Commencer par** :
1. [CLAUDE.md](../CLAUDE.md) (racine) - Guide essentiel
2. [architecture/](architecture/) - Architecture technique
3. [development/](development/) - Process de dev

**Features** :
- Toutes les docs dans [features/](features/)

### Contributeurs

**Commencer par** :
1. [contributing/README.md](contributing/README.md)
2. [contributing/documentation-guide.md](contributing/documentation-guide.md) ⭐

### Utilisateurs finaux

**Pour enseignants** :
- [Assessments](features/assessments/)
- [Questions](features/questions/)
- [SRS/Flashcards](features/srs-flashcards/)
- [Messagerie](features/messaging/)

**Pour admins** :
- [Error Monitoring](features/error-monitoring/)
- [Notifications](features/notifications/)
- [Templates](features/templates/)

---

## 🗺️ Structure complète

```
docs/
├── README.md                    # Master index (start here!)
├── NAVIGATION.md               # Ce fichier
│
├── features/                   # Documentation par feature
│   ├── questions/              # Système de questions
│   ├── assessments/            # Évaluations
│   ├── srs-flashcards/         # Flashcards + SRS
│   ├── riddles/                # Énigmes
│   ├── geometry/               # Géométrie dynamique
│   ├── navadra/                # Jeu mathématique
│   ├── messaging/              # Messagerie privée
│   ├── notifications/          # Notifications
│   ├── error-monitoring/       # Monitoring erreurs
│   ├── templates/              # Templates messages
│   └── authentication/         # Authentification
│
├── architecture/               # Architecture technique
│   ├── database-schema.md      # Schéma DB complet
│   ├── websocket.md            # Temps réel
│   ├── rich-text-editor.md     # TipTap + MathLive
│   └── performance.md          # Optimisations
│
├── guides/                     # Guides pratiques
│   ├── student-import.md       # Import CSV élèves
│   └── troubleshooting.md      # Dépannage
│
├── development/                # Process développement
│   ├── git-workflow.md         # Workflow Git
│   ├── version-management.md   # Releases
│   ├── database-migrations.md  # Migrations DB
│   └── svelte5-migration.md    # Migration Svelte 5
│
├── contributing/               # Guide contribution
│   ├── README.md               # Vue d'ensemble
│   └── documentation-guide.md  # ⭐ Guide doc
│
└── archive/                    # Historique
    ├── sessions/               # Sessions dev
    └── deprecated/             # Features obsolètes
```

---

## 💡 Astuces

### Recherche rapide

1. **Ctrl+F / Cmd+F** dans le master index [README.md](README.md)
2. Chercher dans ce fichier (NAVIGATION.md)
3. Parcourir [features/README.md](features/README.md) pour les features

### Liens relatifs

Tous les liens dans la documentation sont **relatifs** :
- ✅ `[Doc](../other/doc.md)` - Fonctionne partout
- ❌ `[Doc](/docs/other/doc.md)` - Peut casser

### Status des docs

- ✅ **Complete** : Documentation à jour et complète
- 🔄 **In Progress** : En cours de rédaction
- 📝 **Planned** : Planifié mais pas commencé

---

## 🆘 Besoin d'aide ?

Si vous ne trouvez pas ce que vous cherchez :

1. Chercher dans [README.md](README.md) (master index)
2. Chercher dans ce fichier (NAVIGATION.md)
3. Consulter [contributing/documentation-guide.md](contributing/documentation-guide.md)
4. Ouvrir une issue GitHub

---

[← Retour au master index](README.md)
