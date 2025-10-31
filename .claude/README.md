# .claude/

Configuration et instructions pour Claude Code.

---

## 📁 Contenu

### config.md
Instructions permanentes pour tous les agents Claude Code travaillant sur UbuMaths.

**Contient:**
- 4 règles critiques (Zod, MySelect, Svelte 5, no `any`)
- Standards de qualité (0 errors, tests requis)
- Structure de documentation (two-level system)
- Workflow database (Supabase migrations)
- Pre-commit checklist
- Guidelines pour chaque type d'agent

**Usage:**
- Moi (Claude Code) : Lu automatiquement via contexte
- Agents : Doivent lire ce fichier au démarrage
- Contributeurs : Référence pour standards du projet

---

## 🎯 Purpose

Ce répertoire garantit que **tous les agents Claude Code** respectent les mêmes standards et suivent la même structure de documentation, peu importe qui développe ou quelle session.

### Problème résolu

**Avant `.claude/config.md`:**
- ❌ Agents dépendent du prompt manuel qu'on leur donne
- ❌ Risque d'oublier des instructions importantes
- ❌ Standards non documentés formellement
- ❌ Chaque agent peut avoir des comportements différents

**Après `.claude/config.md`:**
- ✅ Instructions permanentes accessibles à tous
- ✅ Standards formellement documentés
- ✅ Comportement cohérent entre agents
- ✅ Référence unique pour tous

---

## 🔄 Workflow

### Pour moi (Claude Code - session actuelle)

1. Je lis `CLAUDE.md` automatiquement (via contexte `claudeMd`)
2. `CLAUDE.md` pointe vers `docs/claude/` et `.claude/config.md`
3. Je suis automatiquement les standards

### Pour les agents (documentation-writer, etc.)

**Au lancement de l'agent:**
```markdown
Prompt: "Before starting, read `.claude/config.md` for project standards..."
```

**L'agent doit:**
1. Lire `.claude/config.md`
2. Suivre les 4 règles critiques
3. Respecter la structure de documentation
4. Utiliser le pre-commit checklist

### Pour les contributeurs externes

Lire `.claude/config.md` pour comprendre :
- Les standards du projet
- Comment structurer la documentation
- Les règles critiques à ne jamais violer
- Le workflow de développement

---

## 📝 Quand mettre à jour config.md

**✅ Mettre à jour quand:**
- Nouvelle règle critique ajoutée au projet
- Changement majeur dans la structure de documentation
- Nouveau workflow important (migrations, tests, etc.)
- Standards de qualité modifiés

**❌ Ne PAS mettre à jour pour:**
- Détails d'implémentation spécifiques → `docs/claude/`
- Documentation de feature → `docs/features/`
- Guides utilisateur → `docs/guides/`
- Changements temporaires ou expérimentaux

---

## 🔗 Related Documentation

- **Quick-start** : [/CLAUDE.md](../CLAUDE.md)
- **Detailed docs** : [/docs/claude/](../docs/claude/README.md)
- **Documentation guide** : [/docs/contributing/documentation-guide.md](../docs/contributing/documentation-guide.md)

---

**Maintenu par** : L'équipe UbuMaths
**Dernière mise à jour** : 2025-10-31
