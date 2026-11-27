---
title: Écarts — tests de preuve du lot coquille — journal
date: 2026-11-27
status: en cours
---

## Reprendre ici

_Mis à jour le 2026-11-27, à l'ouverture de la PR._

- **État** : les 7 écarts du lot coquille encore « à la main » faute de test ont leur preuve. Sous Node, `tests/ecarts/coquille.test.ts` : L44 (mise à jour optimiste, caches élève et prof), L49 (présence du Palotin qui écrit). Au navigateur, en `it.fails` avec marqueur, `src/lib/components/__tests__/ecarts-coquille.svelte.test.ts` : L41 (filtres de la recherche), L43 (profil périmé), L45 (layout du prof après une action), L52 (durée de la roue). L46 (deux listes de liens) : commande, sans test.
- **Prochaine action** : après le merge, sur `main` (commit de doc) : remplacer dans `docs/ecarts/registre.md` la preuve « à la main » des 7 lignes par celles de la section « Preuves à inscrire » ci-dessous, `pnpm ecarts rejouer L41 L43 L44 L45 L46 L49 L52` (7 rouges attendus), mettre à jour le bloc d'`ecarts-a-trier-progress.md` (dont la phrase périmée sur V104), archiver ce journal.
- **En attente de David** : L49, à dire : l'en-tête de `buddy-presence.ts` présente la remise à zéro pendant la lecture comme reprise du layout (chantier `palotins`) ; si elle est voulue, la ligne se ferme « pas un écart » au lieu d'être corrigée.
- **Pièges en cours** : `› L44` retient aussi les témoins (verts) : la preuve n'est verte que si tous le sont ; un `it.fails` se vérifie sans `.fails` sur une copie avant de commiter.
- **Worktree / branche** : `ubumaths-wt-ecarts-preuves-coquille` · `test/ecarts-preuves-coquille`.

---

## Preuves à inscrire au registre (après le merge)

- L44 : `test tests/ecarts/coquille.test.ts › L44`
- L49 : `test tests/ecarts/coquille.test.ts › L49`
- L41, L43, L45, L52 (X = l'identifiant) : commande `f=src/lib/components/__tests__/ecarts-coquille.svelte.test.ts; test -f "$f" && ! grep -q "écart X" "$f"`
- L46 : commande `s=src/lib/components/Sidebar.svelte; h=src/lib/components/Header.svelte; test -f "$s" && test -f "$h" && ! { grep -q "href: '/atelier'" "$s" && grep -q "href: '/atelier'" "$h"; }` (les deux listes sont identiques aujourd'hui : un test qui les compare serait vert à tort ; l'écart est qu'il y en a deux).

## Ce qui a été vérifié

- `tests/ecarts/coquille.test.ts` : 3 rouges (L44 élève, L44 prof, L49), 3 témoins verts.
- Fichier navigateur : 4 témoins verts, 4 `it.fails` ; joués sans `.fails` sur une copie, les 4 échouent sur leur affirmation (`'exercise'` au lieu de `'worksheet'`, profil au lieu de `null`, `['6e A']` seule, `'4s'` au lieu de `'2s'`).
- La proposition du tri pour L44 (« `fetchedAt` égal ou postérieur à l'appel ») lisait un champ privé : remplacée par ce que voit l'écran (le gain se lit encore 2 minutes après).
