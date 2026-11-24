---
title: Messagerie privée, boîtes réparées (V104, V105) — journal
date: 2026-11-24
status: réparation du serveur faite ; lien dans le menu en attente de David
---

## Reprendre ici

_Mis à jour le 2026-11-24, après #3100._

- **État** : #3100 mergée : `GET /api/messages/inbox` et `/api/messages/sent` réparés (paramètre absent → défaut du schéma ; réponse à la forme des RPC, `id` ajouté, sans adresse ; colonnes nulles tolérées ; décalage borné). Vu à l'écran avant merge (`pnpm voir`, iPhone, base locale) : boîte du prof, envoyés, archives, boîte vide de l'élève, ouverture d'un message. Registre : V105 clos, V104 réduit au lien, T27 ajouté (réponse refusée écrite entière dans les journaux). Pas déployé en prod (aucun `deploy:prod` demandé).
- **Prochaine action** : le lien « Messages » dans le menu (nouvelle PR, nouveau worktree), une fois la réponse de David reçue ; puis archiver ce journal.
- **En attente de David** : lien pour tous les élèves tout de suite, ou après son essai ? Emplacement dans le menu de l'élève et du prof (à proposer avec une capture).
- **Pièges en cours** : `pnpm voir --compte eleve` = `eleve01`, dont la boîte est vide dans la base locale ; les RPC ne rendent ni `parent_message_id` ni `thread_root_id` (marque « fil » des listes jamais affichée, noté dans la doc système) ; `pnpm voir` compte en échec le script de statistiques de Vercel (403, site externe) : ce n'est pas la messagerie.
- **Worktree / branche** : aucun (retirés au merge de #3100).

---

## Phase 0 (validée par David le 2026-11-24)

- Nominal : élève et prof ouvrent boîte de réception, archives, envoyés (avec destinataires).
- Limite : boîte vide sans erreur ; 50 messages les plus récents.
- Erreur : appel mal formé refusé (400) ; non connecté refusé.
- L'adresse de l'expéditeur ne circule pas. Aucune migration. Règles « qui écrit à qui » inchangées.
