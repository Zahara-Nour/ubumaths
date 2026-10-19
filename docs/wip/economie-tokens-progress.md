---
title: Économie de tokens — journal
date: 2026-10-19
status: ménage fait ; reste le tri de la mémoire (projets clos) et une vérification optionnelle
---

# Économie de tokens

## Reprendre ici

_Mis à jour le 2026-10-19, après la skill `menage-contexte`._

- **État** : `/reprendre` tourne en Sonnet et attend toujours le go (#1527). Skill `/menage-contexte` créée : `CLAUDE.md` + mémoire traités ensemble (doublons croisés), plafonds 15 Ko / 10 Ko, Sonnet, propose puis applique ce que David valide.
- **Prochaine action** : premier passage de `/menage-contexte` (il couvre le tri des projets clos de `MEMORY.md`, 12,8 Ko).
- **En attente de David** : son go pour ce passage, puis ses choix dans la liste proposée.
- **Worktree / branche** : aucun — commits de doc directs sur `main`.

## Journal (2026-10-19)

- Constat sur 30 sessions : sessions marathon (jusqu'à 8 compactions), jusqu'à ~140 agents par session, presque tout en Opus.
- Réglages perso (`~/.claude/settings.json`) : plugin Vercel désactivé (CLI `vercel` intacte) ; `effortLevel` global `xhigh` → `medium` ; hook `UserPromptSubmit` `~/.claude/hooks/alerte-contexte.py` (alerte > 150 k tokens ou après compaction ; vérifie qu'un journal `docs/wip/*-progress.md` cité par la session a été modifié pendant elle et commité, sinon exige de l'écrire avant toute autre chose).
- `CLAUDE.md` 26,5 → ~14 Ko, le pourquoi dans [claude-md-pourquoi.md](../pratiques/claude-md-pourquoi.md) (5f839bc5c).
- Modèle des agents selon la tâche, `code-reviewer` en Sonnet (5068505a2) ; revue proportionnée au risque, une fois sur la PR (1ebe2dd2b, 93155f9c5).
- Bloc « Reprendre ici », skill `/reprendre`, un chantier = un nom (546d8d1ac).
- 27 worktrees d'agents mergés supprimés + règle de nettoyage (8f8e7e2a4).
- Index mémoire : 6 doublons de `CLAUDE.md` regroupés (13,4 → 12,8 Ko).
- Hooks de garde (même script `alerte-contexte.py`, argument `stop` / `end`) : `Stop` refuse que Claude rende la main dans une session longue qui a commité sans journal à jour et commité (une fois : `stop_hook_active`) ; `SessionEnd` notifie (macOS) une fermeture sans journal → `claude --resume`. Testés sur 7 cas. Skill `/fin` écartée : « mets le journal à jour » suffit.
- Sessions actives prévenues : atelier-geometry, modifs-fixes, mathoux, ubumaths-31, fiche-exercices.
