---
title: Python → atelier — « Ouvrir dans l'atelier » depuis le playground
date: 2026-10-25
status: phase 0 validée, PR 1 codée (revue en cours)
---

## Reprendre ici

_Mis à jour le 2026-10-25, PR 1 codée, avant revue._

- **État** : PR 1 codée et testée (worker, menu du playground, boîte aux lettres, `/atelier?depuis-python=`),
  doc système à jour ; revue `code-reviewer` en cours.
- **Prochaine action** : appliquer la revue, pousser, PR, CI, merge.
- **En attente de David** : essayer le parcours en vrai (serveur de la branche : port 5180) ;
  vérifications manuelles ci-dessous.
- **Pièges en cours** : le playground s'exécute dans l'espace GLOBAL de Pyodide (pas de namespace
  éphémère, doc `worker.md` corrigée) → seules les listes affectées par l'exécution en cours sont proposées.
- **Worktree / branche** : `ubumaths-wt-python-vers-atelier` · `feat/python-vers-atelier`.

---

## Journal

- 2026-10-25 : phase 0 (Q1-Q6, recommandations suivies par David).
- 2026-10-25 : PR 1 — `from-python.ts` (`offerOf`), `python-mailbox.ts`, `openLink` lit
  `?depuis-python=`, helper `_chiphre_atelier_lists` + message `atelier-lists`, `PythonToAtelier.svelte`.
  Tests : `depuis-python.test.ts` (28), `atelier-lists-real.svelte.test.ts` (8, vrai Pyodide).

## Vérifications manuelles (David)

1. `/python`, `L = [random.randint(1, 6) for _ in range(20)]` → « Ouvrir dans l'atelier » → nouvel onglet, liste L.
2. `lancers = [random.randint(1, 6) for _ in range(1000)]` → « ses effectifs » → deux colonnes titrées.
3. Une liste refusée (`[True, False]`) : grisée dans le menu, avec sa raison, lue au clavier.
4. Recharger l'onglet de l'atelier : message « déjà été ouverte », ton atelier s'ouvre.
5. « Garder dans mon atelier » : la liste rejoint l'atelier personnel.
