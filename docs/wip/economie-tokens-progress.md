---
title: Économie de tokens — journal
date: 2026-10-19
status: ménage fait ; reste le tri de la mémoire (projets clos) et une vérification optionnelle
---

# Économie de tokens

## Reprendre ici

_Mis à jour le 2026-10-19, après 8f8e7e2a4._

- **État** : ménage livré (voir journal ci-dessous). Rien en cours, rien de non commité.
- **Prochaine action** : trier l'index mémoire (`~/.claude/projects/-Users-david-Coding-js-ubumaths/memory/MEMORY.md`, 12,8 Ko) — section « Projets — en cours » : demander à David quels projets sont clos, les passer dans `archives.md`.
- **En attente de David** : la liste des projets clos.
- **Optionnel** : vérifier si une skill peut fixer son modèle dans son frontmatter (`model:`) ; si oui, `/reprendre` en Sonnet (jamais `shtam`).
- **Worktree / branche** : aucun — commits de doc directs sur `main`.

## Journal (2026-10-19)

- Constat sur 30 sessions : sessions marathon (jusqu'à 8 compactions), jusqu'à ~140 agents par session, presque tout en Opus.
- Réglages perso (`~/.claude/settings.json`) : plugin Vercel désactivé (CLI `vercel` intacte) ; `effortLevel` global `xhigh` → `medium` ; hook `UserPromptSubmit` `~/.claude/hooks/alerte-contexte.py` (alerte > 150 k tokens ou après compaction ; vérifie qu'un journal `docs/wip/*-progress.md` cité par la session a été modifié pendant elle et commité, sinon exige de l'écrire avant toute autre chose).
- `CLAUDE.md` 26,5 → ~14 Ko, le pourquoi dans [claude-md-pourquoi.md](../pratiques/claude-md-pourquoi.md) (5f839bc5c).
- Modèle des agents selon la tâche, `code-reviewer` en Sonnet (5068505a2) ; revue proportionnée au risque, une fois sur la PR (1ebe2dd2b, 93155f9c5).
- Bloc « Reprendre ici », skill `/reprendre`, un chantier = un nom (546d8d1ac).
- 27 worktrees d'agents mergés supprimés + règle de nettoyage (8f8e7e2a4).
- Index mémoire : 6 doublons de `CLAUDE.md` regroupés (13,4 → 12,8 Ko).
- Sessions actives prévenues : atelier-geometry, modifs-fixes, mathoux, ubumaths-31, fiche-exercices.
