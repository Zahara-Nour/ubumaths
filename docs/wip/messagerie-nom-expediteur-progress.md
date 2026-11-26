---
title: Messagerie — envoi refusé pour un expéditeur sans nom complet — journal
date: 2026-11-26
status: en cours
---

## Reprendre ici

_Mis à jour le 2026-11-26, avant la PR._

- **État** : migration écrite (trigger replié sur « prénom nom »), 4 tests vus rouges sans elle puis 26 verts avec ; revues sans finding bloquant ; PR ouverte.
- **Prochaine action** : merge à CI verte, puis `db:migrate` après le merge et `pnpm deploy:prod` seulement si David le demande (la migration seule répare l'envoi : aucun code d'application ne change).
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

« Tu peux vérifier le code des messages, il y a peut-être d'autres problèmes ? » : relecture de toute la messagerie lancée en parallèle résultat ci-dessous.

## Preuves et revues

- **Preuve rouge** : sans la migration, les 4 tests d'insertion du bloc « expéditeur sans nom complet » échouent avec l'erreur de la prod (23502). Les deux tests ajoutés après la revue (nom seul, message modifié) n'ont été joués qu'avec la migration.
- **`code-reviewer`** : rien de bloquant ; rollback complété et test du chemin de mise à jour ajoutés à sa demande. Reste connu : un profil absent laisserait `sender_role` vide (comme avant, improbable).
- **`security-auditor`** : aucun finding bloquant ; la réponse d'accès est confirmée dans le code et en prod (une seule policy de lecture sur l'index : expéditeur et destinataires). Restes à inscrire au registre : `anon` garde des droits de table sur `message_search_index` (bloqués par la RLS) ; le nom indexé est figé à l'envoi ; aucun test n'envoie par `send_private_message` avec un élève authentifié sans nom complet.

## Autres pannes trouvées par la relecture (2026-11-26)

Vérifiées dans le code et en prod pour les trois premières ; découpage et question d'accès du point 3 **posés à David, en attente**.

1. **Message à une classe : échoue toujours.** `get_students_in_class` lit `classes.archived`, colonne qui n'existe pas (confirmé en prod) ; ensuite, une classe sans élève actif ferait encore échouer `send_private_message` (`FOREACH` sur un tableau vide).
2. **« Répondre » depuis un fil écrit à soi-même** : `thread/[id]/+page.svelte` prend l'auteur du premier message du fil ; `[id]/+page.svelte` prend l'expéditeur du message ouvert, même si c'est soi.
3. **Noms « Inconnu »** partout où la lecture prend `full_name` seul : `get_allowed_recipients` (page « Écrire » : tous les élèves « Inconnu (student) »), `get_user_inbox`, `get_user_sent_messages`, `get_message_details`, `get_message_thread`. Question d'accès : un élève doit-il voir les noms des autres destinataires d'un message de classe ?
4. Supprimer un message envoyé l'efface chez le destinataire ; le compteur de non-lus garde un fantôme.
5. Brouillon long : la limite de 10 000 caractères porte sur le HTML.
6. Icône de fil jamais affichée dans la boîte, « Voir le fil » toujours affiché, sujet de 197 caractères ou plus refusé à la réponse.
