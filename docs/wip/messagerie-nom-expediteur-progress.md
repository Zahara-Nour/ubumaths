---
title: Messagerie — envoi refusé pour un expéditeur sans nom complet — journal
date: 2026-11-26
status: en cours
---

## Reprendre ici

_Mis à jour le 2026-11-26, après #3174 et sa migration jouée en prod._

- **État** : #3174 mergée, **migration `20261126094959` jouée en prod par David** (vérifié en lecture seule : le trigger porte le repli, `search_path` conservé) : l'envoi d'un message remarche pour un élève sans nom complet (V131 clos). Les pannes de la relecture sont au registre : V132 (message à une classe), V133 (« Répondre » s'écrit à soi-même), V134 (noms « Inconnu »), L128 à L130, T37.
- **Prochaine action** : **PR suivante, validée par David le 2026-11-26 (« je suis tes recos »)** : V132, V133 et V134 dans une même PR, nouveau worktree (`ubumaths-wt-messagerie-nom-expediteur-suite`), tests rouges d'abord (envoi à une classe par `send_private_message` avec des élèves sans nom complet ; réponse depuis un fil ouvert par l'élève ; noms rendus par les cinq fonctions de lecture), migration additive, `code-reviewer` + `security-auditor`, rendu vérifié à l'écran (`pnpm voir`, parcours `e2e/verifs/messagerie.spec.ts` avec des comptes sans nom complet). L128 à L130 et T37 restent au registre.
- **Décisions d'accès de David (2026-11-26, mes recommandations suivies)** : le prof voit le prénom et le nom de ses élèves partout dans la messagerie ; l'élève voit le prénom et le nom du prof qui lui écrit ; **un élève qui reçoit un message envoyé à sa classe ne voit PAS le prénom ni le nom des autres destinataires** (afficher « ta classe » ou le nombre de destinataires) : vérifier d'abord ce que sa page affiche aujourd'hui (`get_message_details.recipients`).
- **En attente de David** : rien. **Essai fait en prod le 2026-11-26 (v0.114.0)** : l'envoi marche ; **V134 constaté** (page « Écrire » du prof : certains élèves « Inconnu ») ; **V133 constaté** (élève, « Répondre » depuis un fil : `POST /api/messages/send` → 500, « You do not have permission to send messages to one or more recipients »). Le lien « Messages » du menu (V104, journal `ecarts-a-trier`) attendait cet essai.
- **Pièges en cours** : les comptes des tests ont tous un nom complet, pas ceux de la prod (la fabrique `TestData.profile()` en met un : le vider dans le test) ; la preuve rouge d'une migration se prend avant de créer son fichier ; `pnpm db:migrate` pousse toutes les migrations en attente, il est lancé par David ; V133 est du code d'application : il lui faut un `pnpm deploy:prod`, à la demande de David.
- **Worktree / branche** : aucun (retirés au merge de #3174).

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

## Essai de David en prod après la migration (2026-11-26)

- **L'envoi par un élève passe** : son message est arrivé chez le prof (V131 confirmé corrigé à l'écran).
- **Détail du message côté prof** : « Expéditeur inconnu » à la place du nom de l'élève (V134, attendu), alors que le destinataire (le prof) porte son nom.
- **Page de réponse du prof** (« En réponse à ») : « 1 destinataire sélectionné » et « Destinataire fixe pour la réponse », mais la liste ne montre que trois élèves, tous décochés, et pas l'élève à qui il répond. À regarder dans la PR de V134 : pourquoi trois élèves seulement (le prof en a bien plus), et afficher le destinataire de la réponse par son nom.
- Vus aussi sur ces écrans, à traiter dans la même PR si c'est simple : le rôle affiché en anglais, « (student) », à côté de chaque nom.
