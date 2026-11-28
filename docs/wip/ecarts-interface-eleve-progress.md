---
title: Lot d'écarts interface-eleve — journal
date: 2026-11-28
status: en cours
---

# Lot d'écarts `interface-eleve`

## Reprendre ici

_Mis à jour le 2026-11-28, avant la première PR._

- **État** : latents corrigés et commités sur la branche (pas poussés, typecheck rouge) : L46, L50, L52, L53, L55, L108, L114, et L42 pour les messages 4xx.
- **Prochaine action** : corriger le typecheck de `src/lib/utils/vip-card-modals.ts` (l. 107, 157, 215, 277 : `Component<Props>` refusé par `ModalEntry.component`, typer comme `push` le fait), puis `pnpm check:incremental`, revue `code-reviewer`, PR ; ensuite les visibles après la réponse de David.
- **En attente de David** : phase 0 de V73 (fenêtres), V75 (surlignage du Shtam), V117 (images des 4 cartes Mathémo), et les erreurs 500 de L42.
- **Pièges en cours** : `ecarts-coquille.svelte.test.ts` est partagé avec L41 (`interface-prof`) et L43 (`cache`) : seul le test L52 y change.
- **Worktree / branche** : `../ubumaths-wt-ecarts-interface-eleve`, `fix/ecarts-interface-eleve`.

## Historique

- 2026-11-28 : lot réservé (`docs/wip/ecarts-lots.md`), worktree ouvert.
- 2026-11-28 : 11 preuves rejouées, toutes rouges (écarts vrais).
- L46 : une seule liste de liens, `src/lib/navigation/public-nav-items.ts`, lue par la barre et le tiroir.
- L52, L53 : la roue tourne `spinDuration` secondes ; angle d'arrêt tiré par `wheel-landing.ts`, loin des frontières de l'angle FINAL (l'ancien code ignorait aussi l'angle de départ).
- L50 : `popTo` appelle `onReturn` des modales retirées, comme `pop` ; `push` générique, sans `any` (les props sont maintenant vérifiées contre le composant).
- L55 : le courriel lit l'adresse de `#lib/seo/site.ts`.
- L108 : la clé du Pomodoro entre dans les données de travail effacées au changement de compte (`work-data.ts`) ; preuve du registre réécrite (elle supposait un renommage de clé).
- L114 : `formatRounded` passe par `roundNumber` (28,75 → 28,8).
- L42 : 17 messages 4xx traduits (15 fichiers, dont `moderation` et `chat`, lots libres). Les 500 qui recopient le message anglais de la base : question à David.
- V117 : vérifié en prod (lecture seule) : les 4 cartes pointent vers `/images/vip-cards/mathemo-*.webp`, absent ; les 45 autres sont dans le stockage Supabase.
