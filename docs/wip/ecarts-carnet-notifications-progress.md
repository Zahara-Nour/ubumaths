---
title: Lot d'écarts carnet-notifications
date: 2026-11-28
status: en cours
---

# Lot d'écarts `carnet-notifications`

## Reprendre ici

_Mis à jour le 2026-11-28, après #3333._

- **État** : #3333 mergée ; sa migration est déjà jouée en prod (par le `db:migrate` d'une autre session, vu par `migration list --linked`). Reste L78 : phase 0 écrite ci-dessous (§ L78 — phase 0), rien de codé.
- **Prochaine action** : réponses de David aux questions Q1–Q4 de la phase 0 de L78, puis tests rouges → route webhook → PR.
- **En attente de David** : Q1–Q4 de la phase 0 de L78.
- **Pièges en cours** : `add_warning` sans appelant : sa suppression est une décision à part. Les courriels Brevo de tout le site passent par le même webhook : n'agir que sur les adresses de parents.
- **Worktree / branche** : `../ubumaths-wt-ecarts-carnet-notifications` · `fix/ecarts-carnet-notifications-brevo`.

## Écarts du lot

| Écart | Nature      | Sujet                                                                  | État                        |
| ----- | ----------- | ---------------------------------------------------------------------- | --------------------------- |
| V107  | bug visible | notification « importante » rangée après les « normales »              | corrigé (tri en mémoire)    |
| L78   | bug latent  | adresse de parent invalide restée « confirmée »                        | webhook Brevo, seconde PR   |
| L79   | bug latent  | compteur d'ouvertures qui mélange lien et courriels                    | corrigé (migration)         |
| L80   | bug latent  | avertissement d'exception renvoyé après une panne de base              | corrigé (passage en erreur) |
| L81   | bug latent  | type TypeScript des notifications plus large que la base               | corrigé                     |
| L82   | bug latent  | avertissement posé par le prof dans une classe qui n'est pas la sienne | corrigé (migration)         |
| L83   | bug latent  | notification visant un élève qui a quitté les classes du prof          | corrigé (adhésion active)   |

## Historique

- 2026-11-28 : lot pris, chantier ouvert.
- 2026-11-28 : #3333 mergée (empreinte de la policy des notifications mise à jour dans `anon-preparation.test.ts` après la première CI).
- 2026-11-28 : audit de sécurité : preuves de `add_warnings_bulk`, de l'insertion directe et de l'élève archivé ajoutées ; policy des notifications (L83) dans la migration.
- 2026-11-28 : migration L82 + L79 écrite, preuves vertes ; revue de code sans bloquant.
- 2026-11-28 : V107 (phase 0 validée), L83, L80, L81 corrigés ; L82, L79 attendent la question d'accès ; L78 = webhook Brevo.

## L78 — phase 0 (2026-11-28)

Aujourd'hui : Brevo accepte le courriel, puis la boîte du parent n'existe plus (« rejet définitif »). Personne ne le sait : l'adresse reste « confirmée », les courriels suivants partent dans le vide, le prof croit le parent prévenu.

Comportements proposés :

- **Nominal** : Brevo appelle `POST /api/webhooks/brevo` avec un événement de rejet définitif pour `parent@exemple.test`. Toutes les adresses de parents qui ont cette empreinte (un parent de deux élèves = deux lignes), en attente ou confirmées, passent `invalid`. Le prof lit sur la page du carnet « Adresse rejetée par la messagerie » (déjà affiché) ; la place est libérée (2 adresses actives au plus) ; il peut la ressaisir (remise en attente, déjà codé) ou en saisir une autre.
- **Limite** : adresse inconnue (courriel d'inscription, d'un prof…) → réponse 200, rien ne change. Adresse déjà retirée, refusée ou invalide → rien ne change. Même événement reçu deux fois → même résultat.
- **Erreur** : secret absent ou faux → 401, rien ne change. Corps illisible → 400. Panne de base → 500 (Brevo réessaie).
- **Données** : l'adresse reçue n'est ni stockée ni journalisée ; seule son empreinte sert à chercher.
- **Accès** : aucune migration (le statut `invalid` existe déjà, écriture par le service role). Personne ne lit rien de plus ; un inconnu sans le secret ne peut rien marquer.

Questions :

- **Q1** — quels événements rendent l'adresse invalide ? Reco : `hard_bounce` (boîte inexistante) et `invalid_email` seulement ; pas `soft_bounce` (boîte pleine, passager).
- **Q2** — un parent qui clique « c'est du spam » (`spam`) : on arrête ses courriels comme « Ne plus recevoir » (`emails_stopped_at`) ? Reco : oui.
- **Q3** — secret : Brevo l'envoie dans un en-tête que l'on choisit à la déclaration du webhook (`Authorization: Bearer …`), variable `BREVO_WEBHOOK_SECRET` dans Vercel. Reco : oui.
- **Q4** — le lien actif du parent dont l'adresse est rejetée : on le laisse (il marche toujours s'il l'a gardé) ? Reco : on le laisse.

Gestes de David après le merge : déclarer le webhook dans Brevo (adresse + en-tête), mettre `BREVO_WEBHOOK_SECRET` dans Vercel.
