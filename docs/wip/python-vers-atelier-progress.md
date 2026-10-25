---
title: Python → atelier — « Ouvrir dans l'atelier » depuis le playground
date: 2026-10-25
status: PR 1 mergée (#1746), recette de David en attente
---

## Reprendre ici

_Mis à jour le 2026-10-25, après #1746._

- **État** : PR 1 #1746 **mergée** (sur `main`, pas en prod) : « Ouvrir dans l'atelier » depuis `/python`,
  listes et effectifs, boîte aux lettres `localStorage`, revue `code-reviewer` appliquée.
- **Prochaine action** : rien de prévu ; chantier à clore (verser la phase 0 dans `docs/archive/wip/`,
  le durable est déjà dans `docs/systeme/atelier.md` et `docs/systeme/python/`) après la recette de David.
- **En attente de David** : vérifications manuelles (ligne #1746 de `verifications-manuelles.md`).
- **Pièges** : le playground s'exécute dans l'espace GLOBAL de Pyodide (doc `worker.md` corrigée) ;
  limites assumées : morse, `global`, branche non exécutée (valeur d'une exécution précédente).
- **Worktree / branche** : retirés.

---

## Journal

- 2026-10-25 : phase 0 (Q1-Q6, recommandations suivies par David).
- 2026-10-25 : PR 1 — `from-python.ts` (`offerOf`), `python-mailbox.ts`, `openLink` lit
  `?depuis-python=`, helper `_chiphre_atelier_lists` + message `atelier-lists`, `PythonToAtelier.svelte`.
  Tests : `depuis-python.test.ts` (28), `atelier-lists-real.svelte.test.ts` (8, vrai Pyodide).
- 2026-10-25 : revue `code-reviewer` (Sonnet) — refus au menu de ce que l'atelier refuserait à l'arrivée
  (> 20 modalités, mots > 40 caractères, textes lus comme nombres, vides, sans lettre, avec virgule),
  texte long qui faisait rejeter tout le message (`long-text`), effectifs réunis par modalité, garde
  > 1 million d'éléments (`too-long`), `match` / `except*`. Tests : 36 + 10. #1746 mergée, CI verte.

## Vérifications manuelles (David)

1. `/python`, `L = [random.randint(1, 6) for _ in range(20)]` → « Ouvrir dans l'atelier » → nouvel onglet, liste L.
2. `lancers = [random.randint(1, 6) for _ in range(1000)]` → « ses effectifs » → deux colonnes titrées.
3. Une liste refusée (`[True, False]`) : grisée dans le menu, avec sa raison, lue au clavier.
4. Recharger l'onglet de l'atelier : message « déjà été ouverte », ton atelier s'ouvre.
5. « Garder dans mon atelier » : la liste rejoint l'atelier personnel.
