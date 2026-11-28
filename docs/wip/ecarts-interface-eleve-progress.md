---
title: Lot d'écarts interface-eleve — journal
date: 2026-11-28
status: en cours
---

# Lot d'écarts `interface-eleve`

## Reprendre ici

_Mis à jour le 2026-11-28, après #3288._

- **État** : PR 1 mergée (#3288) : latents L46, L50, L52, L53, L55, L108, L114 et L42 pour les 4xx ; `modalStack.push` vérifie les props (`P extends object`). L142 inscrit au registre (prénom non échappé dans le mail de bienvenue, trouvé par l'audit, hors lot).
- **Prochaine action** : PR 2 : V73 + V75 (nouveau worktree `../ubumaths-wt-ecarts-interface-eleve-fenetres` depuis `origin/main`) ; puis PR 3 : L42 (500) ; V117 : consignes d'images dans `~/Downloads`, puis rangement quand David les a.
- **En attente de David** : rien ; phase 0 tranchée le 2026-11-28 (§ Décisions). Il génère les 4 images de V117 à partir des consignes que la session dépose dans `~/Downloads`.
- **Pièges en cours** : L42 reste ouvert tant que les 500 ne sont pas faits (ne pas le barrer) · port 5176 souvent pris par une autre session : prendre le suivant libre.
- **Worktree / branche** : aucun (celui de la PR 1 est retiré).

## Décisions de David (2026-11-28, phase 0 validée)

- **V73** : à l'ouverture d'une fenêtre, le clavier y entre, Tab tourne dedans, le reste de la page est inerte pour le lecteur d'écran ; Échap et clic sur le fond ferment comme avant ; à la fermeture, le clavier revient sur le bouton d'ouverture. Plus de fenêtre rendue dans un `<button>`.
- **V75** : un lien est surligné si l'adresse est la sienne ou commence par elle + `/` (« Accueil » : seulement `/`), même règle pour la barre et le tiroir.
- **V117** : la session écrit 4 consignes d'images (style des 45 autres cartes) dans `~/Downloads` ; David génère ; rangement dans le stockage Supabase et mise à jour des chemins = écriture en prod, faite par David.
- **L42, erreurs 500** : message français pour l'utilisateur, détail de la base seulement au journal du serveur ; PR à part (~30 fichiers). Ne pas barrer L42 avant.

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
- PR 2 (worktree `ubumaths-wt-ecarts-interface-eleve-fenetres`) :
  - V75 : `isNavItemActive` (`public-nav-items.ts`), lu par la barre et le tiroir ; preuve du registre réécrite (elle cherchait `startsWith` dans `Sidebar.svelte`, qui n'en a plus besoin).
  - V73 : `ModalStackRenderer` : fond = frère de la fenêtre (plus de `<button>` parent), clavier dans la fenêtre à l'ouverture, Tab qui tourne, frères de la couche `inert` sauf les zones `aria-live` (toasts émis par les fenêtres), clavier rendu à l'élément d'ouverture. En plus : 7 des 12 fenêtres portaient déjà leur `role="dialog"` titré, le conteneur en ajoutait un second → il ne le prend plus que si la fenêtre n'en a pas.
  - Vu à l'écran : article du Shtam (barre surlignée) ; cartes VIP d'un élève fictif (Playwright : clavier dedans après 40 Tab, 3 frères inertes, Échap rend le clavier à la tuile, 0 erreur).
  - Revue (`code-reviewer`) : rien de bloquant ; élément d'ouverture retenu en `$effect.pre` (avant le montage de la fenêtre). V140 inscrit (clavier non rendu à la carte après une fenêtre empilée : la fenêtre d'en dessous est recréée, défaut antérieur).
