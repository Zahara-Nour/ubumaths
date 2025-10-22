# 📚 Documentation Index - Question Components

Index complet de toute la documentation liée aux composants de questions.

---

## 🎯 Documentation Question Components

### 📖 FlashCard Component (v2.0)

| Fichier                                                                     | Description                                 | Cible          |
| --------------------------------------------------------------------------- | ------------------------------------------- | -------------- |
| [**FLASHCARD_README.md**](FLASHCARD_README.md)                             | 🏠 Hub central - Commencez ici !            | Tous           |
| [**FLASHCARD_COMPONENT.md**](FLASHCARD_COMPONENT.md)                       | 📘 Documentation technique complète         | Développeurs   |
| [**FLASHCARD_MIGRATION_GUIDE.md**](FLASHCARD_MIGRATION_GUIDE.md)           | 🔄 Guide de migration v1 → v2               | Développeurs   |
| [**FLASHCARD_CHANGELOG.md**](FLASHCARD_CHANGELOG.md)                       | 📝 Historique des versions                  | Tous           |
| [**FLASHCARD_RELEASE_NOTES.md**](FLASHCARD_RELEASE_NOTES.md)               | 📢 Notes de version 2.0                     | Tous           |

### 📖 QuestionCard Component (v1.0) 🆕

| Fichier                                                                     | Description                                 | Cible          |
| --------------------------------------------------------------------------- | ------------------------------------------- | -------------- |
| [**QUESTION_CARD_COMPONENT.md**](QUESTION_CARD_COMPONENT.md)               | 📘 Documentation technique complète         | Développeurs   |
| [**QUESTION_CARD_CHANGELOG.md**](QUESTION_CARD_CHANGELOG.md)               | 📝 Changelog version 1.0                    | Tous           |

### 📖 CorrectionCard Component (v1.1) 🆕

| Fichier                                                                     | Description                                 | Cible          |
| --------------------------------------------------------------------------- | ------------------------------------------- | -------------- |
| [**CORRECTION_CARD_COMPONENT.md**](CORRECTION_CARD_COMPONENT.md)           | 📘 Documentation technique complète         | Développeurs   |
| [**CORRECTION_CARD_CHANGELOG.md**](CORRECTION_CARD_CHANGELOG.md)           | 📝 Changelog version 1.0-1.1                | Tous           |

---

## 🗃️ Documentation archivée (v1.0)

| Fichier                                                                     | Description                                 | Statut         |
| --------------------------------------------------------------------------- | ------------------------------------------- | -------------- |
| [**QUESTION_DISPLAY_COMPONENT_OLD.md**](QUESTION_DISPLAY_COMPONENT_OLD.md) | 📦 Ancienne doc QuestionDisplay (référence) | Obsolète       |

---

## 🧪 Documentation liée

### Tests et Features

| Fichier                                                                     | Description                                 | Composants utilisés          |
| --------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------- |
| [**TEST_FEATURE_DOCUMENTATION.md**](TEST_FEATURE_DOCUMENTATION.md)         | Documentation système de tests              | ✅ QuestionCard + CorrectionCard |
| [**QUESTIONS_CODE_ORGANIZATION.md**](QUESTIONS_CODE_ORGANIZATION.md)       | Organisation du code questions              | ✅ Contexte                  |
| [**QUESTIONS_UI_COMPLETE.md**](QUESTIONS_UI_COMPLETE.md)                   | UI questions complète                       | ✅ Contexte                  |
| [**QUESTIONS_UI_TESTING.md**](QUESTIONS_UI_TESTING.md)                     | Tests UI questions                          | ✅ Contexte                  |

### Debug et Maintenance

| Fichier                                                                     | Description                                 | Statut         |
| --------------------------------------------------------------------------- | ------------------------------------------- | -------------- |
| [**QUESTION_DISPLAY_DEBUG.md**](QUESTION_DISPLAY_DEBUG.md)                 | Documentation page de debug                 | ⚠️ À mettre à jour |
| [**QUESTION_DISPLAY_DEBUG_FIXES.md**](QUESTION_DISPLAY_DEBUG_FIXES.md)     | Fixes de debug                              | ⚠️ À mettre à jour |

---

## 🗺️ Guide de navigation

### Je veux...

#### **Créer un test/examen (sans feedback immédiat)**
→ Utilisez **QuestionCard** : [**QUESTION_CARD_COMPONENT.md**](QUESTION_CARD_COMPONENT.md)

#### **Afficher les corrections après un test**
→ Utilisez **CorrectionCard** : [**CORRECTION_CARD_COMPONENT.md**](CORRECTION_CARD_COMPONENT.md)

#### **Créer un outil d'étude (avec feedback et correction)**
→ Utilisez **FlashCard** : [**FLASHCARD_README.md**](FLASHCARD_README.md)

#### **Comprendre la différence entre les 3 composants**
→ Voir tableau comparatif dans [**TEST_FEATURE_DOCUMENTATION.md**](TEST_FEATURE_DOCUMENTATION.md)

#### **Utiliser FlashCard dans mon code**
→ Consultez [**FLASHCARD_COMPONENT.md**](FLASHCARD_COMPONENT.md) section "Usage Examples"

#### **Utiliser QuestionCard dans mon code**
→ Consultez [**QUESTION_CARD_COMPONENT.md**](QUESTION_CARD_COMPONENT.md) section "Usage Examples"

#### **Migrer depuis QuestionDisplay (v1.0)**
→ Suivez [**FLASHCARD_MIGRATION_GUIDE.md**](FLASHCARD_MIGRATION_GUIDE.md)

#### **Comprendre les changements récents**
→ Lisez [**FLASHCARD_CHANGELOG.md**](FLASHCARD_CHANGELOG.md) ou [**QUESTION_CARD_CHANGELOG.md**](QUESTION_CARD_CHANGELOG.md)

#### **Débugger un problème**
→ Section Troubleshooting dans [**FLASHCARD_COMPONENT.md**](FLASHCARD_COMPONENT.md) ou [**QUESTION_CARD_COMPONENT.md**](QUESTION_CARD_COMPONENT.md)

#### **Comprendre l'intégration avec les tests**
→ Consultez [**TEST_FEATURE_DOCUMENTATION.md**](TEST_FEATURE_DOCUMENTATION.md)

---

## 📂 Structure des fichiers

```
ubumaths/
├── FLASHCARD_README.md                 # 🏠 Hub FlashCard
├── FLASHCARD_COMPONENT.md              # 📘 Doc FlashCard complète
├── FLASHCARD_MIGRATION_GUIDE.md        # 🔄 Guide migration v1→v2
├── FLASHCARD_CHANGELOG.md              # 📝 Changelog FlashCard
├── FLASHCARD_RELEASE_NOTES.md          # 📢 Release notes v2.0
│
├── QUESTION_CARD_COMPONENT.md          # 📘 Doc QuestionCard complète 🆕
├── QUESTION_CARD_CHANGELOG.md          # 📝 Changelog QuestionCard 🆕
│
├── CORRECTION_CARD_COMPONENT.md        # 📘 Doc CorrectionCard complète 🆕
├── CORRECTION_CARD_CHANGELOG.md        # 📝 Changelog CorrectionCard 🆕
│
├── DOCS_INDEX.md                       # 📚 Ce fichier
├── TEST_FEATURE_DOCUMENTATION.md       # 🧪 Tests (utilise QuestionCard + CorrectionCard)
│
├── QUESTION_DISPLAY_COMPONENT_OLD.md   # 📦 Archive v1.0
├── QUESTIONS_CODE_ORGANIZATION.md      # 🗂️ Organisation
├── QUESTIONS_UI_COMPLETE.md            # 🎨 UI
├── QUESTIONS_UI_TESTING.md             # 🧪 Tests UI
│
└── src/
    └── lib/
        └── components/
            └── questions/
                ├── FlashCard.svelte       # 💎 Composant étude/révision
                ├── QuestionCard.svelte    # 💎 Composant tests/examens 🆕
                └── CorrectionCard.svelte  # 💎 Composant corrections post-test 🆕
```

---

## 🎓 Parcours d'apprentissage recommandé

### Niveau 1 : Découverte (5 min)

1. 📖 [FLASHCARD_README.md](FLASHCARD_README.md) - Vue d'ensemble
2. 📢 [FLASHCARD_RELEASE_NOTES.md](FLASHCARD_RELEASE_NOTES.md) - Qu'est-ce qui a changé ?

### Niveau 2 : Utilisation (15 min)

1. 📘 [FLASHCARD_COMPONENT.md](FLASHCARD_COMPONENT.md) - Section "Usage Examples"
2. 🧪 Tester sur `/demo/question-display-demo`
3. 📘 [FLASHCARD_COMPONENT.md](FLASHCARD_COMPONENT.md) - Section "Props"

### Niveau 3 : Migration (20 min)

1. 🔄 [FLASHCARD_MIGRATION_GUIDE.md](FLASHCARD_MIGRATION_GUIDE.md) - Lire entièrement
2. 🔄 Appliquer la checklist de migration
3. 🧪 Tester sur `/dashboard/admin/debug/question-display`

### Niveau 4 : Maîtrise (30+ min)

1. 📘 [FLASHCARD_COMPONENT.md](FLASHCARD_COMPONENT.md) - Lire entièrement
2. 📝 [FLASHCARD_CHANGELOG.md](FLASHCARD_CHANGELOG.md) - Comprendre l'historique
3. 🧪 [TEST_FEATURE_DOCUMENTATION.md](TEST_FEATURE_DOCUMENTATION.md) - Intégration
4. 💎 Lire le code source de `FlashCard.svelte`

---

## 🔗 Liens rapides

### Pages de test

- **Demo publique** : http://localhost:5173/demo/question-display-demo
- **Debug admin** : http://localhost:5173/dashboard/admin/debug/question-display

### Code source

- **Composant** : `src/lib/components/questions/FlashCard.svelte`
- **Types** : `src/lib/types/question-display.ts`
- **Validation** : `src/lib/utils/answer-validator.ts`

### Documentation externe

- **Svelte 5** : https://svelte.dev/docs/svelte/overview
- **Shadcn-svelte** : https://www.shadcn-svelte.com/docs
- **MathLive** : https://cortexjs.io/mathlive/

---

## 📊 Statistiques documentation

- **Fichiers FlashCard** : 5 fichiers principaux
- **Fichiers QuestionCard** : 2 fichiers principaux 🆕
- **Fichiers CorrectionCard** : 2 fichiers principaux 🆕
- **Fichiers liés** : 6 fichiers connexes
- **Pages totales** : ~3800+ lignes de documentation
- **Dernière mise à jour** : 2025-10-21

---

## 🆚 Quel composant choisir ? - Décision rapide

### Utilisez **QuestionCard** si :
- ✅ Vous construisez un test/examen **en cours**
- ✅ Le feedback doit être différé (affiché à la fin)
- ✅ Pas besoin de flip/correction dans le composant
- ✅ Vous préférez une API simple

### Utilisez **CorrectionCard** si :
- ✅ Vous affichez des corrections **après** un test
- ✅ Besoin de flip 3D (réponses → correction détaillée)
- ✅ Comparaison réponse user vs correcte
- ✅ Énoncé collapsible pour référence
- ✅ Lecture seule (pas d'input)

### Utilisez **FlashCard** si :
- ✅ Vous construisez un outil d'étude/révision **interactif**
- ✅ Le feedback doit être immédiat
- ✅ Besoin de flip vers la correction pendant l'apprentissage
- ✅ Tentatives multiples autorisées

**Documentation détaillée** : [TEST_FEATURE_DOCUMENTATION.md](TEST_FEATURE_DOCUMENTATION.md)

---

## 🤝 Contribuer à la documentation

Pour améliorer la documentation :

1. Identifiez la section concernée dans cet index
2. Modifiez le fichier approprié
3. Mettez à jour cet index si nécessaire
4. Testez les exemples de code

---

**Maintenu par** : Claude Code
**Dernière mise à jour** : 2025-10-21
**Version** : 2.2 (ajout QuestionCard + CorrectionCard)
