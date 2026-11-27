---
title: Écarts — tests de preuve du lot coquille — journal
date: 2026-11-27
status: clos
---

## Reprendre ici

_Mis à jour le 2026-11-27 : chantier clos, journal archivé._

- **État** : clos. #3226 mergée ; les 7 preuves (L41, L43, L44, L45, L46, L49, L52) sont au registre, rouges au rejeu du 2026-11-27.
- **Prochaine action** : aucune. La suite (autres lots de tests de preuve) est dans `ecarts-a-trier`.
- **En attente de David** : L49, question portée par `ecarts-a-trier` (remise à zéro de la Constance pendant la lecture : voulue ou non).
- **Worktree / branche** : aucun (retirés au merge de #3226).

---

## Preuves inscrites au registre

- L44 : `test tests/ecarts/coquille.test.ts › L44`
- L49 : `test tests/ecarts/coquille.test.ts › L49`
- L41, L43, L45, L52 (X = l'identifiant) : commande `f=src/lib/components/__tests__/ecarts-coquille.svelte.test.ts; test -f "$f" && ! grep -q "écart X" "$f"`
- L46 : commande `s=src/lib/components/Sidebar.svelte; h=src/lib/components/Header.svelte; test -f "$s" && test -f "$h" && ! { grep -q "href: '/atelier'" "$s" && grep -q "href: '/atelier'" "$h"; }` (les deux listes sont identiques aujourd'hui : un test qui les compare serait vert à tort ; l'écart est qu'il y en a deux).

## Ce qui a été vérifié

- `tests/ecarts/coquille.test.ts` : 3 rouges (L44 élève, L44 prof, L49), 3 témoins verts.
- Fichier navigateur : 4 témoins verts, 4 `it.fails` ; joués sans `.fails` sur une copie, les 4 échouent sur leur affirmation (`'exercise'` au lieu de `'worksheet'`, profil au lieu de `null`, `['6e A']` seule, `'4s'` au lieu de `'2s'`).
- La proposition du tri pour L44 (« `fetchedAt` égal ou postérieur à l'appel ») lisait un champ privé : remplacée par ce que voit l'écran (le gain se lit encore 2 minutes après).
