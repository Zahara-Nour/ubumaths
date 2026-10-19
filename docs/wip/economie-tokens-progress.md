---
title: Économie de tokens — journal
date: 2026-10-19
status: premier passage de menage-contexte en cours ; propositions 7-14 et projets clos attendent David
---

# Économie de tokens

## Reprendre ici

_Mis à jour le 2026-10-19, pendant le premier passage de `/menage-contexte`._

- **État** : passage en cours. Faits : Générateur PDF et Core Web Vitals archivés ; issue #1529 (`template_id`) ; relevé CWV en commentaire de #1078 ; plancher du retour arrière Vercel (v0.39.0) dans `git-workflow.md` § 9 ; propositions 1-6 appliquées (`MEMORY.md` 12 500 → 11 890 o).
- **Prochaine action** : appliquer ce que David valide parmi 7-11 (raccourcir Atelier et KaTeX ; archiver Publication progressive, Dev-env OOM, État des lieux péda), 12-13 (indexer `feedback_migrations-pas-un-frein`, `reference_horodatage-migration-collision`), 14 (« 27 oubliés » → `claude-md-pourquoi.md`).
- **En attente de David** : son choix sur 7-14 ; quels projets sont clos parmi Mode décimal, Lexique, SEO, Cabinet Noir, Consentement parental, Refonte référentiel, Fiches 1re SPE, vitest 5, Monétisation, navadra.
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
