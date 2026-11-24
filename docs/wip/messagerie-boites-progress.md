---
title: Messagerie privée, boîtes réparées (V104, V105) — journal
date: 2026-11-24
status: réparation du serveur faite ; lien dans le menu en attente de David
---

## Reprendre ici

_Mis à jour le 2026-11-24, avant la PR de réparation._

- **État** : `GET /api/messages/inbox` et `/api/messages/sent` réparés (paramètre absent → défaut du schéma ; réponse validée à la forme des RPC, `id` ajouté, sans adresse). Tests de route écrits rouges puis verts (`inbox/__tests__/inbox.test.ts`, `sent/__tests__/sent.test.ts`). Vu à l'écran (`pnpm voir`, iPhone) : boîte du prof (10 messages), envoyés du prof (11), archives, boîte vide de l'élève, ouverture d'un message, 0 erreur de console.
- **Prochaine action** : après merge, barrer V105 et préciser V104 dans `docs/ecarts/registre.md` (reste le lien), mettre à jour le journal `ecarts-a-trier`.
- **En attente de David** : le lien « Messages » dans le menu (décidé le 2026-11-24) : pour tous les élèves dès maintenant, ou après son essai ? Et à quel endroit du menu (emplacement à proposer avec une capture).
- **Pièges en cours** : `pnpm voir --compte eleve` = `eleve01`, dont la boîte est vide dans la base locale ; les RPC ne rendent ni `parent_message_id` ni `thread_root_id` (marque « fil » des listes jamais affichée, noté dans la doc système) ; l'ordre « écarts graves d'abord » est un choix de Claude (David : « je te suis »), pas une décision de David.
- **Worktree / branche** : `ubumaths-wt-messagerie-boites` / `fix/messagerie-boites` ; serveur de dev sur 5177.

---

## Phase 0 (validée par David le 2026-11-24)

- Nominal : élève et prof ouvrent boîte de réception, archives, envoyés (avec destinataires).
- Limite : boîte vide sans erreur ; 50 messages les plus récents.
- Erreur : appel mal formé refusé (400) ; non connecté refusé.
- L'adresse de l'expéditeur ne circule pas. Aucune migration. Règles « qui écrit à qui » inchangées.
