---
title: Messagerie — envoi refusé pour un expéditeur sans nom complet — journal
date: 2026-11-26
status: en cours
---

## Reprendre ici

_Mis à jour le 2026-11-26, avant la PR._

- **État** : cause trouvée, tests écrits, migration à écrire après la preuve rouge.
- **Prochaine action** : preuve rouge, migration, revues (`code-reviewer` + `security-auditor`), PR, puis `db:migrate` après le merge et `pnpm deploy:prod` seulement si David le demande (la migration seule répare l'envoi : aucun code d'application ne change).
- **En attente de David** : rien pour la migration (question d'accès tranchée le 2026-11-26) ; son essai de la messagerie reprend une fois la migration jouée en prod.
- **Pièges en cours** : la preuve rouge se prend **avant** de créer le fichier de migration (la pile de test joue les migrations de la branche) ; les comptes des tests ont tous un nom complet, pas ceux de la prod.
- **Worktree / branche** : `ubumaths-wt-messagerie-nom-expediteur` / `fix/messagerie-nom-expediteur`.

## Le constat (essai de David en prod, v0.113.0)

`POST /api/messages/send` rend 500 : `null value in column "sender_name" of relation "message_search_index" violates not-null constraint`.

À chaque message inséré, le trigger `update_message_search_index` écrit une ligne dans l'index de recherche, avec le nom de l'expéditeur lu dans `profiles.full_name`. La colonne `sender_name` de l'index est obligatoire, `full_name` ne l'est pas.

Mesure en prod le 2026-11-26 (comptages seuls) : `full_name` est vide pour 77 élèves sur 82 et pour l'admin ; tous ont un prénom. Le prof a un nom complet. Les 3 messages en base ont leur ligne d'index.

Les tests ne l'ont pas vu : la fabrique de profils de test et les comptes du parcours navigateur donnent un nom complet à tout le monde.

## Décision

- **Question d'accès** (posée et tranchée par David le 2026-11-26) : personne ne lit rien de nouveau. Le nom écrit dans l'index est celui de l'expéditeur ; seuls les destinataires du message le lisent, par la recherche.
- **Repli validé** : nom complet s'il existe, sinon « prénom nom », sinon un texte fixe non vide.

## Suite demandée par David

« Tu peux vérifier le code des messages, il y a peut-être d'autres problèmes ? » : relecture de toute la messagerie lancée en parallèle (résultat à consigner ci-dessous).
