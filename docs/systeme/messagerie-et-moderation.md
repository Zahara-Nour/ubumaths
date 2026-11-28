---
couvre:
  - src/lib/components/templates/TagsInput.svelte
  - 'src/routes/(protected)/messages/**'
  - 'src/routes/api/{messages,moderation,notifications,warnings}/**'
  - 'src/routes/api/{student,classes,students}/*/warnings/**'
  - 'src/routes/api/student/warnings/**'
  - 'src/lib/components/{moderation,notifications,student-inbox}/**'
  - 'src/lib/components/{AddFriend,FriendRequests,FriendsList,OnlineStatus}.svelte'
  - 'src/lib/stores/{privateMessages,notifications,hashtags}.svelte.ts'
  - 'src/lib/server/{notifications,auto-notifications,warnings,student-inbox}.ts'
  - 'src/lib/server/validation/{messages,moderation,notifications,warnings}.ts'
  - src/lib/server/message-attachments.ts
  - src/lib/utils/message-attachment-rules.ts
  - src/lib/utils/message-reply.ts
  - 'src/lib/types/{notification,warnings,student-inbox}.ts'
  - 'src/lib/utils/{notification-formatters,sanitize-notification}.ts'
  - src/lib/navigation/goto-notification.ts
  - 'src/routes/(protected)/dashboard/{teacher,admin}/{moderation,notifications,friendships}/**'
  - 'src/routes/(protected)/dashboard/notifications/**'
---

# Messagerie, modération, notifications, avertissements, amitiés

> Décrit ce qui relie les personnes entre elles hors du chat : messages privés élève ↔ prof,
> modération du chat (signalements, restrictions, suppression), notifications, avertissements
> de comportement, amitiés, modèles de messages, et la « boîte de travail » de l'élève.
> Le chat temps réel et la présence des amis sont décrits par [realtime.md](realtime.md) (non
> recopié ici). Rôles et garde d'accès : [auth.md](auth.md). Tables : [base-de-donnees.md](base-de-donnees.md)
> et [base-de-donnees-tables.md](base-de-donnees-tables.md). Mode lecture seule (consentement
> parental) : [conformite/consentement-parental.md](conformite/consentement-parental.md).
> Nettoyage HTML partagé : [editeur-riche.md](editeur-riche.md). Caches du tableau de bord
> (avertissements compris) : [coquille-et-caches.md](coquille-et-caches.md). Vocabulaire :
> [CONTEXT.md](../../CONTEXT.md).
> Vérifié contre le code le 2026-10-13 (commit `4f3eb2b3e`) ; notifications de signalement de fiche le 2026-10-14.

## À quoi ça sert

Les élèves sont **mineurs** (RGPD). Le modèle est mono-professeur ([CONTEXT.md](../../CONTEXT.md),
section « Les personnes et les frontières ») : un seul **professeur**, un **admin**, des
**élèves**. L'**école** est la frontière sociale et de safeguarding : un élève n'entre en
relation qu'avec des élèves de son école. La **classe** n'est qu'un dossier d'organisation.

Cette zone couvre cinq choses :

- **Messages privés** : un courrier (boîte de réception, envoyés, brouillons, archivés, fils).
  Seulement entre un élève et le prof. Deux élèves ne s'écrivent **que** par le chat
  ([realtime.md](realtime.md)).
- **Modération** : le prof traite les signalements du chat, restreint un élève, supprime un
  message du chat.
- **Notifications** : messages descendants (prof ou admin vers des élèves), et notifications
  « système » écrites par le serveur.
- **Avertissements** : quatre types (C Comportement, M Matériel, R Retard, T Travail), comptés
  par période scolaire ; note = 20 − total.
- **Amitiés** : demandes entre élèves de la même école ; une amitié acceptée ouvre le profil de
  l'autre et le chat à deux.

## Carte du code

### Messages privés

- Pages : `src/routes/(protected)/messages/` — `inbox/`, `sent/`, `drafts/`, `compose/`,
  `archived/`, `[id]/`, `thread/[id]/`. `+page.ts` redirige vers `/messages/inbox`. Le menu
  vit dans `+layout.svelte` (deux listes de liens, élève et prof).
- Store : `src/lib/stores/privateMessages.svelte.ts` (`privateMessages`). Il n'appelle que les
  routes `/api/messages/*`, jamais la base directement.
- API : `src/routes/api/messages/` —
  - `send/` → RPC `send_private_message` (après `requireConsent(profile, 'send_message')`) ;
  - `recipients/` → RPC `get_allowed_recipients` (+ `get_teacher_classes_for_messaging` pour le prof) ;
  - `inbox/` → `get_user_inbox` (boîte de réception et archives, selon `status`) ; `sent/` →
    `get_user_sent_messages` ; `unread-count/`. La route de recherche, sans appelant, est retirée
    (M41, 2026-11-28) ; la RPC `search_private_messages` reste en base. Un
    paramètre absent prend le défaut du schéma (50 messages, depuis le premier, tous dossiers).
    La réponse suit la forme de la RPC, `id` en plus (copie de `message_id`) : `inboxMessagesResponseSchema`
    et `sentMessagesResponseSchema`, sans adresse de courriel. Ni l'une ni l'autre ne rend
    `parent_message_id` / `thread_root_id` : la marque « fil » des listes ne s'affiche donc pas ;
  - `thread/` → `get_message_details` + `get_message_thread` ; chaque message y porte ses
    destinataires (identifiant et nom), pour « Répondre » ;
  - `[id]/` : GET (`get_message_details`, `mark_message_as_read`), PATCH (actions
    `updateStatus`, `moveToFolder`, `toggleRead`, `toggleStar`), DELETE (corbeille côté
    expéditeur `deleted_by_sender`, côté destinataire `message_inbox.deleted`) ;
  - `drafts/`, `drafts/[id]/` → table `message_drafts`.
- Validation : `src/lib/server/validation/messages.ts` (`sendMessageSchema` : sujet 1-200,
  100 destinataires max ; `updateMessageSchema` en union discriminée). Le **contenu** d'un envoi
  est le document de l'éditeur riche (`{ type: 'doc', content: [...] }`, le jsonb de
  `send_private_message`), jamais une chaîne : `messageDocumentProblem` le refuse s'il n'a pas
  cette forme (« Message illisible », 20 niveaux d'emboîtement au plus), s'il dépasse 10 000
  caractères de texte (« Message trop long »), 100 000 caractères une fois écrit en JSON
  (« Message trop lourd »), ou
  s'il ne montre rien (« Le message est vide » ; une formule seule compte). Tests :
  `src/routes/api/messages/send/__tests__/send.test.ts` (le corps exact de la page) et le
  parcours `e2e/verifs/messagerie.spec.ts` (l'élève écrit, le prof répond, l'élève lit ; un
  brouillon repris part sans y toucher). La page n'envoie jamais le HTML d'un brouillon :
  `RichTextEditor` rend le document dès qu'il pose un contenu venu de `htmlValue`
  (`syncJsonFromHtml`).
- Tables : `private_messages` (le message), `message_inbox` (une ligne par destinataire :
  lu, étoilé, dossier, statut).

#### Pièces jointes

Décision de David (2026-10-13) : un élève envoie par exemple le scan de son cahier au prof.
Jusque-là, le bucket n'existait pas en prod et toute pièce jointe échouait en silence.

- **Règles** (`src/lib/utils/message-attachment-rules.ts`, communes au navigateur et au
  serveur) : images JPEG, PNG, WebP, HEIC et PDF ; 10 Mo ; 3 par message. Le bucket
  `message-attachments` applique les mêmes limites (migration `20261016101300`).
- **Bucket privé, sans policy de storage** : seul le client service y dépose et en signe les
  liens. L'accès est décidé par `src/lib/server/message-attachments.ts` avec le client de
  l'utilisateur, donc sa RLS :
  - **envoi** — `POST /api/messages/[id]/attachments` : l'utilisateur est l'expéditeur du message,
    moins de 3 pièces jointes **et** moins de 3 fichiers déjà déposés dans le dossier du message, consentement `send_message` ; le serveur choisit le chemin (`messages/<message>/<uuid>-<nom>`) et
    rend un lien d'envoi à usage unique. Le navigateur dépose le fichier directement dans le
    storage (Vercel refuse les corps de plus de 4,5 Mo), puis enregistre la ligne
    `message_attachments_v2`, dont la policy d'insertion exige ce rangement ;
  - **lecture** — `GET /api/messages/attachments/[attachmentId]` : la RLS de
    `message_attachments_v2` rend la ligne (expéditeur, destinataire qui n'a pas supprimé le
    message, admin), **et** un chemin de la forme exacte du serveur (`isServerAttachmentPath`), puis redirection (`no-store`, sans Referer) vers un lien signé d'une heure ; sinon 404. La ligne est écrite par le navigateur : sans ce contrôle, `%2e%2e` ou `\` dans le chemin sortaient du message, voire du bucket (audit de #1256). La policy d'insertion exige la même forme (`20261016101400`).
- **Aucun lien public** : `public_url` n'est plus écrit ni lu.
- **Fin de vie** : la suppression du compte de l'élève retire ses fichiers
  ([conformite/rgpd.md](conformite/rgpd.md)) ; la purge des messages et le retrait d'une pièce
  jointe effacent la ligne, et le cron du dimanche retire les fichiers restés sans ligne
  (`list_orphan_message_attachment_files`).
- **Limite connue** : le type d'un fichier est celui que déclare le navigateur (le bucket le
  vérifie, pas le contenu). Le fichier est servi avec ce type et en téléchargement : un faux PDF
  ne s'exécute pas.

Tests : `tests/integration/messagerie-pieces-jointes.test.ts` (bucket, policies),
`tests/integration/messagerie-pieces-jointes-liens.test.ts` (envoi et lecture de bout en bout),
`src/routes/api/messages/__tests__/attachments.test.ts` (routes).

#### Index de recherche et nom de l'expéditeur

Chaque message inséré ou modifié passe par le trigger `update_message_search_index`, qui écrit
une ligne de `message_search_index` (sujet, texte, nom et rôle de l'expéditeur). La colonne
`sender_name` est obligatoire, alors que `profiles.full_name` ne l'est pas : **en prod, presque
tous les élèves ont un nom complet vide** (prénom et nom remplis). Depuis la migration
`20261126094959`, le trigger prend le nom complet, sinon « prénom nom », sinon `Sans nom` ;
avant, l'envoi d'un message par un de ces élèves rendait 500 (V131). Le nom est figé à l'envoi.
Seul ce trigger (SECURITY DEFINER) écrit dans la table : `anon` n'y a aucun droit, `authenticated`
seulement SELECT (`20261128161241`, T37).

Tests : `tests/integration/database/messaging-triggers.test.ts`, bloc « expéditeur sans nom
complet ». La fabrique de profils de test donne un nom complet à tout le monde : un test de
messagerie qui doit ressembler à la prod le vide lui-même.

#### Noms affichés

Les fonctions de lecture (`get_allowed_recipients`, `get_user_inbox`, `get_user_sent_messages`,
`get_message_details`, `get_message_thread`) rendent le nom par `messagerie_nom_affiche` : nom
complet, sinon « prénom nom », sinon rien (la page écrit alors « Inconnu »). Cette fonction
d'aide n'est appelable ni par `anon` ni par `authenticated`. `get_allowed_recipients` garde le
nom de colonne `full_name` et trie par ce nom (migration `20261126132310`, V134). Le rôle
s'affiche par `messageRoleLabel` (`src/lib/utils/message-reply.ts`), jamais par son nom technique.

#### Répondre

`replyRecipientId` (`src/lib/utils/message-reply.ts`) choisit le destinataire d'une réponse,
depuis un message ouvert comme depuis un fil : le dernier qui m'a écrit ; sinon l'unique
destinataire de mon message ; sinon personne, et les pages ne proposent pas « Répondre » (V133 :
avant, l'élève qui avait ouvert un fil s'écrivait à lui-même). Elle reçoit aussi mon rôle
(`page.data.profile.role`) et ne propose qu'un compte à qui je peux écrire, selon la règle de
`validate_message_recipients` : l'élève ne répond pas à un message de l'admin (V135). Un rôle
inconnu ne retire rien. La page d'écriture affiche alors ce seul destinataire, sans liste ; le
serveur décide : un élève de test est refusé (L84), même s'il a écrit au prof, qui voit alors
« Répondre » mais reçoit un refus ; une réponse à un message ni envoyé ni reçu est refusée par
« Vous ne pouvez pas répondre à ce message. » (L127, L131). Les refus de la base ne sont jamais
rendus tels quels par `send/` : 403 (destinataire non permis), 400 (classe sans élève actif,
code `P0002`), 500 sans le message technique. Tests : `src/lib/utils/message-reply.test.ts`,
`send.test.ts`, bloc « comptes sans nom complet » de `e2e/verifs/messagerie.spec.ts`.

### Modération et signalements (chat)

La modération porte sur la table `messages` **du chat**, pas sur `private_messages`.

- Pages prof : `src/routes/(protected)/dashboard/teacher/moderation/` — la racine redirige vers
  `avertissements/` ; `gestion/` charge restrictions actives, journal (`moderation_logs`),
  signalements (`get_reports_for_moderation`) et le compteur `get_pending_reports_count`
  (aussi lu par `+layout.server.ts` pour le badge). Lien de menu : `src/lib/config/dashboard-nav.ts`.
  Une lecture des signalements en échec ne ressemble pas à « aucun signalement » : `load` rend
  `reportsLoadFailed` et la page affiche une alerte à la place de la liste ; un compteur
  illisible vaut `null` (pastille « ? », nommée « Nombre de signalements inconnu », et une
  alerte), jamais 0. Restrictions et journal en échec
  lèvent un 500.
- Composants : `src/lib/components/moderation/` — `MessageReportsTable` → `ReviewReportDialog`
  (→ `RestrictUserDialog`) ; `ActiveRestrictionsTable`, `ModerationLogsTable` ;
  `DeleteMessageDialog` et `RestrictedUserBanner` servent dans le chat (`ChatMessageList`,
  `ChatWindow`).
- API : `src/routes/api/moderation/` —
  - `reports/[id]/` (PUT) → RPC `review_report` (statut `reviewed` / `dismissed` / `actioned`,
    option de suppression du message) ;
  - `restrict-user/` (POST) → insert `user_restrictions` (`mute` / `timeout` / `ban`, portée
    `global` ou `conversation`) puis `log_moderation_action` ;
  - `unrestrict-user/` (POST) → delete `user_restrictions` ; un prof ne lève que ses propres
    restrictions, l'admin toutes ;
  - `messages/[id]/` (DELETE) → `messages.deleted_at` posé par le client service, après
    contrôle ; `messages/[id]/context/` → `get_message_context_for_moderation`.
- Le signalement lui-même part du chat : `src/routes/api/chat/reports/+server.ts` → RPC
  `report_message` (motifs `spam`, `harassment`, `inappropriate`, `other`).
- Validation : `src/lib/server/validation/moderation.ts` (motif 5-500 caractères ; portée
  `global` ⇔ `scopeId` nul).

### Avertissements

- Page prof : `src/routes/(protected)/dashboard/teacher/moderation/avertissements/+page.svelte`
  (l'ancienne adresse `/dashboard/teacher/warnings` est redirigée par `src/hooks.server.ts`).
- Serveur : `src/lib/server/warnings.ts` — `getCurrentAcademicPeriod`, `getActiveSchoolYear`,
  `getSchoolYearPeriods` (lus aussi par `dashboard/teacher/+layout.server.ts`),
  `getClassWarnings`, `addWarningsBulk`, `removeWarningsBulk`.
- API prof (`requireRoles(['teacher','admin'])`) : `src/routes/api/warnings/bulk/`
  (`add_warnings_bulk`, un ajout ou plusieurs), `warnings/remove-bulk/` (`remove_warnings_bulk`,
  contexte `teacher` ou `vip_card`), `classes/[classId]/warnings/` (lecture par classe).
- API élève : `src/routes/api/student/warnings/[periodId]/` — ses avertissements de la période.
  Affichés par `src/lib/components/RewardsBlock.svelte` (tableau de bord élève).
- Types : `src/lib/types/warnings.ts` (`WarningType`, `WARNING_TYPE_LABELS`) ; validation
  `src/lib/server/validation/warnings.ts` (1 à 20 types par geste).

### Notifications

- Serveur : `src/lib/server/notifications.ts` — `createNotification` (prof/admin, client du
  compte), `insertSystemNotification` (seul chemin des notifications système, client service),
  `createSystemNotification`, `getUnreadNotifications`, `getUnreadCount`, `markAsRead`,
  `markAllAsRead`, `deleteNotification` (masquage), `getCreatedNotifications`,
  `notifyAdminsOfPendingUser`, `notifyAdminsOfNewBugReport`.
- Notifications automatiques : `src/lib/server/auto-notifications.ts`. Trois fonctions ont un
  appelant : `notifyNewAssessment` (affectation d'une évaluation) et
  `notifyErrorReportValidated` / `notifyErrorReportRejected` (signalements d'erreur de fiche :
  numéro de l'exercice dans la copie de l'élève, ou aucun numéro s'il est inconnu, et lien
  « Voir l'exercice » vers `/dashboard/student/worksheets/<affectation>#exercice-<id>`, voir
  [fiches-et-pdf.md](fiches-et-pdf.md)).
  Le marché écrit les siennes via `src/lib/server/marketplace/notifications.ts`.
- API : `src/routes/api/notifications/` — `unread/`, `unread-count/`, `mark-read/`,
  `mark-all-read/`. Store `src/lib/stores/notifications.svelte.ts` (`notificationStore`) ;
  le temps réel passe par `notificationsRealtime` ([realtime.md](realtime.md)).
- Affichage : `src/lib/components/notifications/NotificationBanner.svelte` et
  `NotificationDropdown.svelte` (montés par `src/routes/(protected)/dashboard/+layout.svelte`) ;
  page `src/routes/(protected)/dashboard/notifications/+page.svelte` (message rendu par
  `{@html}` après `sanitizeNotificationHtml` de `src/lib/utils/sanitize-notification.ts`,
  résumé quotidien par `src/lib/utils/notification-formatters.ts`). Le clic sur une
  notification suit son `action_url` par `gotoNotification`
  (`src/lib/navigation/goto-notification.ts`) : `goto`, et chargement complet de la page si
  SvelteKit refuse l'adresse (route renommée depuis l'envoi, la page ou la 404 s'affiche) ;
  seuls les chemins du site (`/…`, jamais `//…`) sont suivis.
- Envoi manuel : `src/routes/(protected)/dashboard/teacher/notifications/` et
  `dashboard/admin/notifications/` (form actions, `createNotificationSchema`, limite de débit).
- Types : `src/lib/types/notification.ts` ; validation `src/lib/server/validation/notifications.ts`.

### Modèles de messages

- **Plus aucun code** : les modèles de message ne servaient à aucun envoi (la page d'écriture
  d'un message ne les lit pas). La page du prof a été retirée le 2026-11-25 (écarts E58 à E60),
  puis le reste le 2026-11-26 : pages admin (`dashboard/admin/message-templates/`), routes
  `api/messages/templates/`, store, moteur de variables (`templateEngine`, `advancedEngine`, `templateVariables`), composants
  `FiltersHelp` et `VariableAutocomplete`, types et validation.
- **Plus rien en base** : la table `message_templates`, ses quatre tables liées (versions,
  usages, journal, favoris) et leurs huit fonctions ont été supprimées par
  `20261126224009_suppression_modeles_de_message.sql` (écart M60 ; 0 ligne en prod le
  2026-11-26). La suppression de compte (`delete_user_account`) n'efface donc plus rien dans
  `template_audit_log`. Garde : `tests/integration/suppression-modeles-de-message.test.ts`.
- `TagsInput` (`src/lib/components/templates/`) sert à
  `src/routes/(protected)/constructions/conversion/+page.svelte`. Sans rapport avec les modèles
  de chapitre.

### Amitiés

- Composants : `src/lib/components/AddFriend.svelte`, `FriendRequests.svelte`,
  `FriendsList.svelte`, `OnlineStatus.svelte`. Ils passent tous par `friendsManager`
  (`src/lib/stores/friends.svelte.ts`, décrit par [realtime.md](realtime.md)) ; la page est
  `src/routes/(protected)/dashboard/friends/`.
- Outil de modération : `src/routes/(protected)/dashboard/admin/friendships/` (liste et
  suppression d'une amitié). Ouvert au prof sans élévation (`TEACHER_ALLOWED_PREFIXES` de
  `src/routes/(protected)/dashboard/admin/+layout.server.ts`).

### Hors sujet malgré le nom

- `src/lib/server/student-inbox.ts` (`getStudentWorkInbox`) est la **boîte de travail** de
  l'élève : évaluations, exercices, fiches et Python à faire, rangés en cinq sections
  (`late`, `thisWeek`, `later`, `noDeadline`, `doneRecently`). Une affectation d'exercice
  `public` n'y figure pas (elle n'ouvre rien, cf. [exercices.md](exercices.md)). Rien à voir avec les messages.
  Composants `src/lib/components/student-inbox/` ; appelée par
  `src/routes/(protected)/dashboard/+page.server.ts` et `dashboard/student/work/+page.server.ts`.
- `src/lib/stores/hashtags.svelte.ts` alimente l'extension `#` de l'éditeur riche
  (`src/lib/components/rich-text/editor-config.ts`). Taper `@` n'y propose personne : la liste
  n'avait que des personnes inventées (V106, retirée le 2026-11-28) ; le nœud `mention` affiche
  seulement les mentions déjà écrites.

## Invariants

### Qui peut écrire à qui (messages privés)

1. **Élève → prof seulement ; prof → élèves seulement ; admin → tout le monde.** Tenu par
   `validate_message_recipients` (migration `20260618093000_option_b_unification_remove_inter_teacher_sharing.sql`),
   appelée dans `send_private_message`. Le prof n'écrit pas à un élève de test, que sa liste ne
   propose pas non plus (`20261128161241`, L84). Un destinataire en double ne compte qu'une fois
   (même migration et `sendMessageSchema`, L134). Hors envoi à une classe, le message ne porte ni
   `is_group_message` ni `class_id` (L132). Un élève hors-classe peut écrire au prof (ADR 0002).
   Test : `tests/integration/option-b-messaging.test.ts` (« student -> another student stays
   forbidden »).
2. **On n'envoie qu'en son nom.** `send_private_message` refuse un `p_sender_id` différent de
   `auth.uid()` (hors admin) — `20260902091000_security_rpc_caller_guards.sql`. Même garde sur
   `get_allowed_recipients` et `search_private_messages`. **On ne répond qu'à un message qu'on a
   envoyé ou reçu** : un autre `p_parent_message_id` est refusé en `42501` (`20261128161241`,
   L127 / L131 ; avant, une réponse s'accrochait au fil d'un autre). Tests :
   `tests/integration/messagerie-ecarts-lot.test.ts`.
3. **Un message de groupe** ne part que du prof ou de l'admin, vers une classe active
   (`validate_class_message_recipients`) ; la fonction remplace les destinataires par les élèves
   de la classe (`get_students_in_class` : membres actifs d'une classe active). Une classe sans
   élève actif est refusée, aucun message n'est créé (`20261126132310`, V132). Tests :
   `tests/integration/message-group-recipients.test.ts`,
   `tests/integration/messagerie-noms-et-classe.test.ts`.
4. **Un fil ne montre que ses propres messages** : `get_message_thread` filtre sur
   expéditeur ou destinataire (`20260902102000_security_message_thread_filter.sql`, finding
   H12 : la réponse privée d'un élève fuitait vers ses camarades). Test :
   `tests/integration/security-message-thread.test.ts`. Un message que son destinataire a
   supprimé (`message_inbox.deleted`) ne lui est plus ouvert, ni par `get_message_details` ni
   dans le fil ; l'expéditeur garde son exemplaire (`20261128161241`, L133).
   4 bis. **Un élève ne lit pas l'identité des autres destinataires** (décision de David,
   2026-11-26) : `get_message_details` ne rend la liste complète des destinataires qu'à
   l'expéditeur du message et aux comptes prof ou admin ; tout autre destinataire n'y lit que sa
   propre ligne, avec le nombre de destinataires (`20261126132310`). La page écrit « et N autres
   destinataires ». Test : `tests/integration/messagerie-noms-et-classe.test.ts`.
5. **On n'agit que sur sa boîte** : `update_message_status`, `move_message_to_folder`,
   `toggle_message_star`, `mark_message_as_read` refusent un autre `p_user_id`
   (`20261003190000_rpc_lot3_compte_autrui.sql`).
6. **Élève en lecture seule** : le trigger `guard_read_only_author_trg` refuse l'INSERT dans
   `private_messages` (et dans `messages` du chat) quand l'auteur n'a pas l'accès complet
   (`20261014110000_lecture_seule_garde_base.sql`). Test :
   `tests/integration/lecture-seule-garde-base.test.ts`.
7. **Un message envoyé ne se réécrit plus** (décision de David, 2026-10-13) : `anon` et
   `authenticated` n'ont plus le droit UPDATE sur `private_messages`, sauf la colonne
   `deleted_by_sender` (« retirer de mes envoyés »). La policy « Senders can edit their
   messages » reste le filtre « mes messages » ; une autre colonne est refusée en `42501`
   (`20261016101500_messages_prives_non_modifiables.sql`). Test :
   `tests/integration/messages-prives-non-modifiables.test.ts`.
8. **Une ligne de boîte de réception ne se détourne pas** (décision de David, 2026-10-13) :
   sur `message_inbox`, le destinataire ne change que ses marques. En direct, seulement `read_at`
   et `deleted` ; statut, dossier et étoile passent par `update_message_status`,
   `move_message_to_folder` et `toggle_message_star`. Changer `message_id` aurait ouvert la
   lecture du message d'un autre, la policy SELECT de `private_messages` passant par
   `message_inbox` (`20261016101600_boite_reception_non_detournable.sql`). Test :
   `tests/integration/boite-reception-non-detournable.test.ts`.

### Frontière d'école

- **Amitié** : la policy d'INSERT de `friendships` exige `same_school(addressee_id)` et
  `status = 'pending'` ; le trigger `friendships_freeze_parties` interdit de réécrire
  `requester_id` / `addressee_id` (`20260915480000_amities_non_forgeables.sql`). On ne se
  déclare donc pas ami tout seul, ni avec un élève d'une autre école. Test :
  `tests/integration/amities-non-forgeables.test.ts`.
- Prof et admin lisent et suppriment toutes les amitiés (`is_teacher_or_admin()`,
  `20260915560000_suppression_amities_admin.sql`).
- Les messages privés ne touchent pas la frontière : un élève n'écrit qu'au prof.

### Grossièretés

- Le seul filtre actif est en base, sur le **chat** : le trigger `process_message_content` de
  `messages` appelle `check_profanity_simple` et pose `is_flagged` + `flag_reason`. Il **marque**,
  il ne bloque pas. `ChatMessageList` affiche « Ce message a été signalé automatiquement ».
- La liste (migration `20261124230639`, relue par David le 2026-11-25) compte environ 125 mots et
  expressions : gros mots, propos sexistes ou sexuels, racistes, homophobes, moqueries sur le
  physique ou le handicap, menaces et incitations à se faire du mal. Le mot est cherché **en
  entier**, sans tenir compte des majuscules, des accents, de la ponctuation ni d'un « s » final :
  « con » marque « t'es trop CON », pas « content ». Changer la liste = une migration qui
  redéfinit la fonction. Un accent saisi en deux caractères, une lettre de pleine chasse ou un
  caractère invisible glissé dans le mot ne le cachent pas (forme NFKD, puis retrait des accents
  et des caractères invisibles). Limites : une faute voulue (« c0nnard », « meeerde ») ou une
  lettre d'un autre alphabet qui ressemble à la nôtre passe ; les messages envoyés avant la migration ne sont pas relus.
- **La marque ne se maquille pas.** Le trigger joue à l'envoi et sur **tout** `UPDATE` de
  `messages`. `plain_text` est toujours recalculé depuis `content`, pour tout le monde. Un élève
  n'écrit ni `is_flagged` ni `flag_reason` : à l'envoi elles viennent de la détection ; ensuite
  une marque posée reste (ses valeurs sont écrasées, sans erreur). Prof, admin
  et serveur (pas d'utilisateur connecté) écrivent la marque à la main. La détection ne rejoue
  que si le contenu change, donc seulement quand le serveur réécrit un message : retirer une
  marque à la main tient. Test : `tests/integration/messages-marque-non-maquillable.test.ts`.
- **Un message envoyé ne se réécrit pas.** Aucun compte connecté (élève, prof, admin) ne change
  le contenu, le texte (`plain_text`), la date d'envoi, la date de modification ni l'auteur d'un
  message du chat : le trigger `guard_message_reecriture_trg` refuse (`42501`, « Un message
  envoye ne se reecrit pas »). Décision de David du 2026-11-25, comme pour les messages privés ;
  l'application n'a pas de bouton « modifier ». Sans lui, un élève remplaçait l'insulte de son
  message marqué par un texte propre, que le prof lisait à la place dans l'onglet « Messages
  marqués », ou antidatait le message pour le sortir de l'onglet ; le prof pouvait réécrire le
  message d'un élève du chat de sa classe. C'est une **liste blanche** : un compte connecté ne
  change que `deleted_at` (supprimer), `is_reported` (signaler, et un signalement posé ne se
  retire pas), `is_flagged` et `flag_reason` (la marque, règle ci-dessus) ; une colonne ajoutée
  plus tard est refusée tant qu'elle n'est pas dans la liste. Renvoyer une valeur identique
  n'est pas une réécriture. Le serveur (pas d'utilisateur connecté) garde la main.
  Test : `tests/integration/messages-chat-non-reecrits.test.ts`.
- **Un compte connecté ne choisit pas la date de son message.** À l'envoi, le trigger
  `guard_message_envoi_trg` force la date d'envoi à maintenant et vide la date de modification
  et la date de suppression, sans erreur : le message part. Sans lui, un élève envoyait par
  l'API un message daté d'il y a quatre ans (hors de l'onglet du prof, effacé par la purge de
  conservation) ou de 2099 (en tête de l'onglet pour toujours). L'application n'envoie aucune
  de ces dates. Le serveur garde la main. Même fichier de tests, § « à l'envoi ».
- **Un message trop lourd ne part pas.** Le chat écrit directement dans `messages`, sans borne
  côté site ; le trigger `guard_message_taille_trg` refuse à l'envoi, pour un compte connecté,
  un contenu de plus de 200 000 caractères (JSON écrit par la base), erreur `22001` « message
  trop long », que le store du chat dit à l'élève (toast « Message trop long »). Borne à
  l'envoi seulement, pas une contrainte CHECK : trois messages de janvier 2026, plus lourds
  (images rangées dans le message avant les pièces jointes), restent et se suppriment toujours.
  Test : `tests/integration/messages-taille-a-l-envoi.test.ts` (écart L124).
- **Un message ne change pas de conversation.** Aucun compte connecté (élève, prof, admin) ne
  modifie `conversation_id` d'un message : le trigger `guard_message_conversation_trg` refuse
  (`42501`). Sans lui, un élève sortait son message marqué de l'onglet du prof en le déplaçant
  vers une conversation avec un adulte. Le serveur (pas d'utilisateur connecté) garde la main.
  Test : `tests/integration/messages-conversation-non-modifiable.test.ts`.
- **Une participation ne change pas de conversation.** Aucun compte connecté (élève, prof, admin)
  ne modifie `conversation_id` d'une ligne de `conversation_participants` : le trigger
  `guard_participation_conversation_trg` refuse (`42501`). Sans lui, un élève qui connaissait
  l'identifiant d'une conversation entre deux autres élèves y déplaçait sa participation et en
  lisait les messages. Archiver, mettre en sourdine et marquer comme lu restent possibles. Le
  serveur (pas d'utilisateur connecté) garde la main.
  Test : `tests/integration/participation-conversation-non-modifiable.test.ts`.
- Aucun filtre sur `private_messages`, ni sur les notifications.
- L'ancien filtre côté serveur (`profanity-filter.ts`, jamais branché) a été retiré le 2026-10-13.

### Ce que voit et fait le prof (ou l'admin)

- Signalements : tous, via `get_reports_for_moderation` (`is_teacher_or_admin()`), triés
  `pending` d'abord.
- Messages marqués automatiquement : onglet « Messages marqués » de `gestion/`
  (`FlaggedMessagesList.svelte`), 100 plus récents, lecture seule, **prof seulement** : l'admin
  reçoit un 403 du layout de `dashboard/teacher/moderation/` (gardé par David le 2026-11-25 ; la
  branche de lecture admin, morte, est retirée, M59). Lecture (`loadFlaggedMessages` dans
  `+page.server.ts`) :
  - fonction `get_flagged_messages_for_teacher` (`SECURITY DEFINER`, réservée au rôle
    `teacher` : élève, admin et visiteur refusés en `42501`). Décision de David du 2026-11-25.
    Elle rend les messages `is_flagged`, **et eux seuls**, de ses conversations, des chats de
    groupe et des **conversations à deux entre deux élèves** (en classe ou hors-classe) : texte,
    date, raison, nom de l'auteur ; jamais les messages non marqués de la conversation ni le nom
    de l'autre élève. Elle rend aussi les messages marqués **supprimés**, texte compris, avec
    `deleted_by_moderation` (une suppression tracée dans `moderation_logs`) : l'onglet écrit
    « supprimé par la modération » quand elle est tracée, « supprimé » seul sinon. Faux ne veut
    pas dire « par l'élève » : `review_report` (suppression depuis un signalement) et
    `soft_delete_message` ne tracent rien, et il n'y a pas de colonne `deleted_by`. Une conversation à deux où l'un
    des deux n'est pas un élève reste fermée. Un élève qui **quitte** la conversation (possible
    par l'API) ne cache pas son message : une conversation non groupe à moins de deux
    participants reste lue si l'auteur du message est un élève et qu'aucun participant restant
    n'est autre chose qu'un élève. Aucune policy n'est touchée : la lecture directe de
    `messages` par le prof ne rend toujours ni ces conversations ni les messages supprimés (la
    policy SELECT nomme les conversations à deux, mais lit `conversation_participants` sous la
    RLS du prof, qui n'y voit que les siennes). Test :
    `tests/integration/messages-marques-prof.test.ts`.

  Une lecture en échec rend `flaggedMessagesLoadFailed` et une alerte, jamais « aucun message ».
  Pas de lien direct vers la conversation, pas d'état « traité ».

- Restrictions : la page `gestion/` ne liste que celles qu'**il** a posées (`restricted_by`).
  Un prof ne restreint qu'un élève (contrôle de rôle dans `restrict-user/`).
- **Une restriction bloque l'écriture dans le chat** : la policy « Users can send messages to
  their conversations » de `messages` refuse l'INSERT si une restriction `global` ou de la
  conversation n'a pas expiré. Les trois types (`mute`, `timeout`, `ban`) ont le même effet
  en base. `ChatWindow` lit la restriction pour afficher `RestrictedUserBanner`.
- Suppression d'un message du chat : admin partout ; prof si participant, ou dans une
  conversation à deux **élèves** ; et seulement un message écrit par un élève. Chaque geste
  est tracé par `log_moderation_action` (`moderation_logs`).
- Messages privés : la policy « Teachers can view messages for moderation » laisse le prof lire
  tout message impliquant un élève (`can_moderate_message`) ; l'admin lit tout.
- Avertissements : seuls prof et admin écrivent (RPC SECURITY DEFINER gardées par
  `is_class_teacher`, 20 avertissements actifs au plus par élève, classe et période). L'élève
  ne lit que les siens, non supprimés (policy « Students can view their own active warnings »).

### Notifications

- **Notification système = serveur seul.** Policy d'INSERT système réservée à `service_role`
  (`20261001140000_notifications_systeme_reservees_au_serveur.sql`) ; `insertSystemNotification`
  impose `is_system = true` et `created_by = null`. Test :
  `tests/integration/notifications-systeme-serveur.test.ts`.
- **Notification d'un compte = à son nom, figée après envoi** (seul `deleted_at` bouge) :
  trigger `guard_notification_authorship_trg` (`20261001220000_securite_points_mineurs.sql`, Q77).
- **Un prof ne cible que des classes ou des élèves inscrits**, jamais `all` ni `role`
  (`createNotification`).
- **Élève archivé** : ne voit plus les notifications de la classe quittée
  (`20260912200000_archived_members_lose_class_notifications.sql`, test
  `tests/integration/archived-member-class-notifications.test.ts`).
- **Vocabulaire des cibles** : `all`, `role`, `classes`, `users` — contrainte
  `notifications_target_type_check` ; test `tests/integration/notification-target-vocabulary.test.ts`.

### Nettoyage HTML

- Toute notification passe par `sanitizeNotificationHtml` (`src/lib/server/sanitization.ts`)
  avant l'écriture, et de nouveau côté client avant `{@html}`. Configuration partagée
  `NOTIFICATION_SANITIZE_CONFIG` (voir [editeur-riche.md](editeur-riche.md)).
- `notifications.ts` importe `sanitization.ts` **à l'écriture seulement** (`sanitizeMessage`) :
  il tire jsdom (~650 modules), et `hooks.server.ts` importe `notifications` via
  `errorMonitoring`. Test : `notifications-chargement-paresseux.test.ts`.
- `auto-notifications.ts` échappe (`escapeHtml`) les textes saisis avant de les insérer dans
  le gabarit.
- Bannière et menu déroulant n'affichent que `title` et `action_label` en texte, sans `{@html}`.

### RLS et écritures vérifiées

- `deleteNotification` masque par le client service et vérifie qu'**une** ligne a bougé
  (`.select('id')`). Même chose pour `DELETE /api/moderation/messages/[id]` et l'action
  `deleteFriendship` de `admin/friendships` (commentaire « `.select()` n'est pas décoratif »).
- `restrict-user/` fait `.insert(...).select().single()`.
- `unrestrict-user/` (`.delete().select('id')`, 403 sur zéro ligne), `DELETE /api/messages/[id]`
  (403 côté expéditeur, 404 sans entrée de boîte de réception) et l'action `toggleRead` de
  `PATCH /api/messages/[id]` (404 sans entrée, 403 sinon) vérifient les lignes rendues.
- `reports/[id]/` lit le signalement avant la RPC `review_report` (qui rend `void` et ne compte
  pas les lignes) : un identifiant inconnu rend 404.

### Zod

Toutes les entrées passent par un schéma : `sendMessageSchema`, `updateMessageSchema`,
`restrictUserSchema`, `deleteMessageSchema`, `addWarningsBulkSchema`,
`removeWarningsBulkSchema`, `createNotificationSchema`, `markNotificationReadSchema`. `reports/[id]/` porte son schéma en local (`reviewReportSchema`) ;
`messages/[id]/context/` borne `count` à la main (1 à 50).

## Comment étendre

- **Nouvelle notification automatique** : une fonction dans `src/lib/server/auto-notifications.ts`
  qui appelle `createSystemNotification` ; échapper tout texte venu d'un utilisateur ; choisir
  `type` dans les quatre valeurs que la base accepte (`info`, `alert`, `announcement`, `reminder`).
- **Nouveau geste de modération** : route sous `src/routes/api/moderation/`, contrôle de rôle,
  schéma dans `validation/moderation.ts`, `.select()` après l'écriture, puis
  `log_moderation_action`. Une nouvelle valeur d'action doit exister dans la contrainte de
  `moderation_logs` (le code de `unrestrict-user/` le rappelle).
- **Toute relation nouvelle entre deux élèves** : bornée par `same_school()` en base
  (ADR 0002), avec un test d'intégration qui échoue sans la garde.
- **Nouveau type d'avertissement** : contrainte SQL, RPC, `WarningType`, `WARNING_TYPE_LABELS`
  et `warningTypeSchema` ensemble.

## Tests

- Routes : `src/routes/api/messages/__tests__/api-routes.test.ts`,
  `src/routes/api/messages/thread/__tests__/thread.test.ts`,
  `src/routes/api/moderation/messages/__tests__/messages-delete.test.ts`,
  `src/routes/api/moderation/restrict-user/__tests__/restrict-user.test.ts`,
  `src/routes/api/moderation/unrestrict-user/__tests__/unrestrict-user.test.ts`.
- Écritures vérifiées (zéro ligne touchée n'annonce pas un succès) :
  `src/routes/api/messages/[id]/__tests__/write-verdict.test.ts`,
  `src/routes/api/moderation/unrestrict-user/__tests__/write-verdict.test.ts`,
  `src/routes/api/moderation/reports/[id]/__tests__/write-verdict.test.ts` (signalement inconnu → 404).
- Serveur : `src/lib/server/__tests__/delete-notification.test.ts`,
  `notifications-pagination.test.ts`, `notifications-pagination-logic.test.ts`,
  `system-notifications.test.ts`, `student-inbox.test.ts` (même dossier).
- Routes : `src/routes/api/messages/inbox/__tests__/inbox.test.ts`,
  `sent/__tests__/sent.test.ts`, `thread/__tests__/thread.test.ts` (le `GET` appelé avec l'adresse
  de la page et des lignes à la forme réelle des RPC).
- Validation : `src/lib/server/validation/__tests__/warnings.test.ts`,
  `rewards-messages-notifications.test.ts`.
- Client : `src/lib/stores/__tests__/notifications.test.ts`,
  `src/lib/utils/__tests__/sanitize-notification.test.ts`,
  `src/lib/components/student-inbox/__tests__/`,
  `src/routes/(protected)/messages/inbox/__tests__/inbox-theme.svelte.test.ts`.
- Intégration (Supabase local) : `tests/integration/option-b-messaging.test.ts`,
  `messages-prives-non-modifiables.test.ts`,
  `boite-reception-non-detournable.test.ts`,
  `message-group-recipients.test.ts`, `security-message-thread.test.ts`,
  `amities-non-forgeables.test.ts`, `notifications-systeme-serveur.test.ts`,
  `securite-points-mineurs.test.ts`, `archived-member-class-notifications.test.ts`,
  `notification-target-vocabulary.test.ts`, `lecture-seule-garde-base.test.ts`,
  `database/messaging-triggers.test.ts` (tous sous `tests/integration/`).
- **Aucun test d'intégration** ne vise `message_reports`, ni le comportement de
  `student_warnings` ou `user_restrictions` (seulement nommées dans
  `tests/integration/anon-option-b.test.ts`).

## Décisions

- [ADR 0002](../adr/0002-mono-professeur-ecole-frontiere-sociale.md) — mono-professeur, école =
  frontière sociale ; un élève hors-classe fait tout avec le prof (messagerie, modération).
- [ADR 0003](../adr/0003-donnees-hebergees-en-ue.md) — données hébergées en UE.
- Décisions consignées en tête de migration : messagerie option B (`20260618093000`), gardes
  d'appelant (`20260902091000`, `20261003190000`), fil filtré (`20260902102000`), amitiés non
  forgeables et suppression par l'admin (`20260915480000`, `20260915560000`), notifications
  système au serveur (`20261001140000`), Q77 (`20261001220000`), lecture seule gardée par la
  base (`20261014110000`, décision de David du 2026-10-10).

## Écarts connus

Les écarts de cette zone sont au [registre des écarts](../ecarts/registre.md) : `pnpm ecarts`. Un écart s'écrit là-bas, jamais ici.

### À savoir (voulu)

- L'en-tête de `student-inbox.ts` parle de « quatre systèmes d'affectation » (évaluations,
  exercices à l'unité, fiches, Python) : la liste est exacte au niveau des systèmes. Python en
  regroupe trois tables, donc la fonction interroge six sources.

### Points non vérifiés

- Aucune page ne pointe vers `dashboard/teacher/notifications`, `dashboard/admin/notifications` ni
  `dashboard/admin/friendships` (grep sur `src/` du 2026-10-13, jamais revérifié depuis).
