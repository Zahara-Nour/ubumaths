---
title: Économie de tokens — journal
date: 2026-10-19
status: premier passage de menage-contexte fait ; projets clos attendent David
---

# Économie de tokens

## Reprendre ici

_Mis à jour le 2026-10-25, après les propositions 7-11 du premier passage de `/menage-contexte`._

- **État** : propositions 1-14 du premier passage appliquées. `MEMORY.md` est remonté à 16,5 Ko entre-temps (sessions des 19-25 octobre).
- **Prochaine action** : trier les projets dont la clôture attend David, puis relancer `/menage-contexte` sur l'index qui a grossi.
- **En attente de David** : quels projets sont clos parmi Mode décimal, Lexique, SEO, Cabinet Noir, Consentement parental, Refonte référentiel, Fiches 1re SPE, vitest 5, Monétisation, navadra.
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
- Propositions 1-6 : index allégé des doublons de `CLAUDE.md` (check-a-jour, workflow git, Prettier, RLS) ; `feedback_git-workflow` (périmé : « ≤ 2 `.md` », `--no-verify`), `reference_rls-echecs-silencieux` et `feedback_prettier-cible-precise` supprimés (contenu dans `CLAUDE.md` et `docs/pratiques/`, piège Prettier versé dans `git-workflow.md` § 1) ; `feedback_typecheck-et-gros-process` 20 → 2,3 Ko ; Refonte des modèles de chapitre archivée.
- Propositions 12-14 : `feedback_migrations-pas-un-frein` et `reference_horodatage-migration-collision` indexés ; « 27 oubliés » sorti de `CLAUDE.md` vers `claude-md-pourquoi.md` § Worktrees.
- 2026-10-25, propositions 7-11 : Atelier archivé (clos d'après David), ligne KaTeX réduite à la règle ; Publication progressive, Dev-env OOM, État des lieux péda archivés. Points ouverts de Publication progressive → issue #1788 (le point de safeguarding `is_class_student` était déjà corrigé le 2026-09-15).
