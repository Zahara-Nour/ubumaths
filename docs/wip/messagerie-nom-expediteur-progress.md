---
title: Messagerie — envoi refusé pour un expéditeur sans nom complet — journal
date: 2026-11-26
status: en cours
---

## Reprendre ici

_Mis à jour le 2026-11-27, après #3188, code et migration en prod._

- **État** : #3188 mergée (V132 message à une classe, V133 « Répondre », V134 noms « Inconnu » : clos au registre). **Migration `20261126132310` jouée en prod par David le 2026-11-26**, vérifiée en lecture seule (sept fonctions de la messagerie à la nouvelle version, `search_path` et droits en place). **Code en prod depuis la 0.115.0** (2026-11-26, 21 h 23, lancée par une autre session) ; 0.116.0 en ligne le 2026-11-27. Tout le chantier est livré.
- **Prochaine action** : aucune côté code. Quand David a refait son essai en prod (page « Écrire » du prof, « Répondre » depuis un fil côté élève, message à une classe), lui proposer de clore : versement du durable, journal archivé.
- **En attente de David** : son essai en prod, puis son go pour clore.
- **Décisions d'accès de David** : (2026-11-26) le prof voit le prénom et le nom de ses élèves partout dans la messagerie ; l'élève voit ceux du prof qui lui écrit ; un élève qui reçoit un message envoyé à sa classe ne voit pas l'identité des autres destinataires. (2026-11-27, confirmé) il ne voit pas non plus les autres destinataires d'un message envoyé à plusieurs élèves cochés un à un : « et N autres destinataires ».
- **Pièges en cours** : `CREATE OR REPLACE` garde les droits mais pas le `search_path` ; le cliquet des types peut rougir sur un fichier non touché quand des fichiers de test s'ajoutent (vu sur la route du détail d'un échange du marché, typée à la main dans #3188) ; restes au registre : L128 à L135, V135, T37.
- **Worktree / branche** : aucun (retirés au merge de #3188).

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

## PR de V132, V133 et V134 (2026-11-26)

**Migration `20261126132310_messagerie_noms_et_message_de_classe.sql`** (additive, rollback en tête du fichier) :

- `get_students_in_class` lit `classes.is_active` (la colonne `archived` n'existe plus) ; `send_private_message` refuse une classe sans élève actif (code `P0002`) au lieu de tomber sur un tableau vide.
- Nouvelle fonction d'aide `messagerie_nom_affiche` (nom complet, sinon « prénom nom », sinon rien), sans droit pour les rôles clients ; les cinq fonctions de lecture l'utilisent (`get_allowed_recipients`, `get_user_inbox`, `get_user_sent_messages`, `get_message_details`, `get_message_thread`). `get_allowed_recipients` trie par ce nom.
- **Accès retiré** : `get_message_details` ne rend la liste complète des destinataires qu'à l'expéditeur du message et aux comptes prof ou admin ; un élève destinataire n'y lit que sa propre ligne, le nombre de destinataires reste rendu. Avant, tout destinataire recevait identifiant, nom, avatar et rôle des autres (la page les cachait pour un message de classe, pas la réponse du serveur ; pour un message à plusieurs élèves cochés, la page les affichait).

**Code d'application** :

- `src/lib/utils/message-reply.ts` : à qui part la réponse (le dernier qui m'a écrit ; sinon l'unique destinataire de mon message ; sinon personne, et le bouton « Répondre » n'est pas proposé). Utilisé par la page du message et celle du fil ; la route du fil rend les destinataires de chaque message.
- Page « Écrire » : en réponse, le destinataire est affiché seul, par son nom (plus de liste de cases grisées à faire défiler : c'était la « liste de trois élèves » vue par David, une boîte de 12 rem de haut) ; rôle affiché dans les mots du Royaume, plus « (student) ».
- `POST /api/messages/send` : les refus de la base ne sont plus rendus en anglais (403 destinataire non permis, 400 classe sans élève actif, 500 sans le message technique).
- Page du message : « et N autres destinataires » quand la liste est incomplète.

**Preuves** :

- Preuve rouge prise avant le fichier de migration : `tests/integration/messagerie-noms-et-classe.test.ts`, 8 rouges sur 13 (les 5 verts sont les refus « comme avant »), 13 verts avec la migration. Clients connectés, comptes sans nom complet.
- Tests unitaires : `src/lib/utils/message-reply.test.ts`, `send.test.ts` (refus en français), `thread.test.ts` (destinataires).
- Parcours navigateur `e2e/verifs/messagerie.spec.ts`, bloc « comptes sans nom complet » (nom complet vidé le temps du test, comme en prod) : la page « Écrire » nomme chacun ; l'élève répond depuis le fil qu'il a ouvert et le prof lui répond ; le prof écrit à une classe et l'élève ne reçoit que sa propre ligne de destinataire. 5 verts sur 5 (Chromium, serveur de dev de la branche, base locale).
- Vu à l'écran (`pnpm voir /messages/compose --compte prof`) : rôle « (Galopin) » à la place de « (student) », 0 erreur de console. La liste des destinataires passe de 12 à 20 rem de haut.

**Revues** (2026-11-26) :

- `code-reviewer` : corps SQL recopiés sans régression (comparés un à un). Trois points sur la page « Écrire » en réponse, corrigés : la réponse n'est plus bloquée quand le destinataire n'est pas dans la liste des destinataires permis (élève de test, liste non chargée), le serveur décide ; un brouillon rouvert ne remplace plus le destinataire d'une réponse.
- `security-auditor` : aucun finding bloquant. Le retrait de `get_message_details` est étanche (rôle non falsifiable, pas d'autre chemin vers les destinataires) ; droits conservés par `CREATE OR REPLACE` ; la fonction d'aide n'est appelable ni par `anon` ni par `authenticated`.
- **Restes à inscrire au registre après le merge** (antérieurs à la branche, sauf le premier) : la liste des destinataires d'un élève ne filtre pas un compte prof de test ; `send_private_message` ne vérifie pas que l'appelant a envoyé ou reçu le message parent ; un message à une personne peut porter une étiquette de classe ; un message supprimé par son destinataire lui reste lisible par son adresse ; un destinataire en double donne un 500 ; un élève voit « Répondre » sur un message de l'admin alors que l'envoi sera refusé (403 en français).

**CI et merge de #3188** : deux rouges avant le vert, aucun dû à la messagerie. (1) Cliquet des types : le typage de la requête de `src/routes/api/marketplace/trades/[id]/+server.ts` tombait selon l'ordre de vérification des fichiers (rouge avec mes deux nouveaux fichiers de test, vert en en retirant un, n'importe lequel) ; résultat typé à la main (`overrideTypes`), sans effet à l'exécution. (2) Garde `SECURITY DEFINER` : base de test de la CI tombée en cours de route (connexion refusée), verte en local (7 sur 7) et à la relance.
