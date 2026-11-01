---
title: Écarts de la doc système — journal du chantier
date: 2026-10-19
status: écarts revérifiés le 2026-10-18 ; tri A (seul) / B (David) fait ; V62 + V65 à corriger
---

# Écarts de la doc système — journal

## Reprendre ici

_Mis à jour le 2026-11-01, après #2067._

- **État** : lot A fini, mergé (pas en prod) : #2062 (L17, L18, L19, L23), #2063 (code mort + commentaires, −4 134 lignes), #2066 (V39, V44, V46, V51, V52), #2064 (V13, L22, V42, V45, L27 + quartique), #2068 (13 tests de stores réactivés), #2067 (L21, L28, L31 ; revue opus sans bloquant ; L28 bis relevé, rien de visible).
- **Prochaine action** : lot 2b dans un nouveau worktree : V32 (solve), V27, V64 (integration).
- **En attente de David** : (1) merger #2061 (audit dépendances, CI verte, remplace #1802 à fermer) et #1850 (SIGPIPE, verte) ; (2) supprimer les ~8 tests RLS `it.skip` « deux profs » devenus sans objet (mono-prof) ; (3) corriger la définition de l'agent `mathast-expert` (« `e`/`i` sont des variables » : faux, ce sont des constantes) ; (4) choix d'écriture : racines approchées en fraction décimale géante (`canonicalForm`), `\sin(x)^2`, `\dfrac{-6}{\pi-9}` ; (5) toujours ouvert depuis le 2026-10-20 : `a(x) = x^2` puis `a = 2` garde une fonction constante (règle #905) — garder ou refuser ? et la liste B d'[ecarts-a-trier.md](ecarts-a-trier.md).
- **Pièges en cours** : GitHub ne déclenche parfois pas « Code Quality » après un push → `gh workflow run quality.yml --ref <branche>` ; `playwright install` peut pendre 15 min en CI → `gh run rerun <id> --failed` ; un `node_modules` de worktree a été trouvé sur svelte 5.57.3 hors lockfile → `pnpm install --frozen-lockfile --force`. L15, L25, V34, V17 laissés au chantier `fusion-moteurs`.
- **Worktree / branche** : `../ubumaths-wt-deps-audit` (`chore/deps-audit-2026-11-01`, #2061).

---

## Historique

- **2026-10-18** — revérification de ~110 écarts ouverts par 4 agents (mathAST, atelier, fiches, serveur/RGPD) ; 14 corrigés depuis, V62 aggravé (dérivée fausse), V65 nouveau. Commit 7846bfae6.
