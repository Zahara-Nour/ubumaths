---
couvre:
  - 'src/lib/components/templates/{FiltersHelp,TagsInput,VariableAutocomplete}.svelte'
  - 'src/lib/templates/**'
  - 'src/routes/(protected)/messages/**'
  - 'src/routes/api/{messages,moderation,notifications,warnings}/**'
  - 'src/routes/api/{student,classes,students}/*/warnings/**'
  - 'src/routes/api/student/warnings/**'
  - 'src/lib/components/{moderation,notifications,student-inbox}/**'
  - 'src/lib/components/{AddFriend,FriendRequests,FriendsList,OnlineStatus}.svelte'
  - 'src/lib/stores/{privateMessages,notifications,messageTemplates,mentions,hashtags}.svelte.ts'
  - 'src/lib/server/{notifications,auto-notifications,warnings,student-inbox}.ts'
  - 'src/lib/server/validation/{messages,moderation,notifications,warnings,message-templates}.ts'
  - src/lib/server/message-attachments.ts
  - src/lib/utils/message-attachment-rules.ts
  - 'src/lib/types/{notification,warnings,messageTemplates,student-inbox}.ts'
  - 'src/lib/utils/{notification-formatters,sanitize-notification}.ts'
  - 'src/routes/(protected)/dashboard/{teacher,admin}/{moderation,notifications,message-templates,friendships}/**'
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
  - `inbox/` → `get_user_inbox` ; `sent/`, `unread-count/`, `search/` → `search_private_messages` ;
  - `thread/` → `get_message_details` + `get_message_thread` ;
  - `[id]/` : GET (`get_message_details`, `mark_message_as_read`), PATCH (actions
    `updateStatus`, `moveToFolder`, `toggleRead`, `toggleStar`), DELETE (corbeille côté
    expéditeur `deleted_by_sender`, côté destinataire `message_inbox.deleted`) ;
  - `drafts/`, `drafts/[id]/` → table `message_drafts`.
- Validation : `src/lib/server/validation/messages.ts` (`sendMessageSchema` : sujet 1-200,
  contenu 1-10 000, 100 destinataires max ; `updateMessageSchema` en union discriminée).
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

### Modération et signalements (chat)

La modération porte sur la table `messages` **du chat**, pas sur `private_messages`.

- Pages prof : `src/routes/(protected)/dashboard/teacher/moderation/` — la racine redirige vers
  `avertissements/` ; `gestion/` charge restrictions actives, journal (`moderation_logs`),
  signalements (`get_reports_for_moderation`) et le compteur `get_pending_reports_count`
  (aussi lu par `+layout.server.ts` pour le badge). Lien de menu : `src/lib/config/dashboard-nav.ts`.
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
  `getClassWarnings`, `addWarning`, `addWarningsBulk`, `removeWarningsBulk`.
- API prof (`requireRoles(['teacher','admin'])`) : `src/routes/api/warnings/` (un ajout),
  `warnings/bulk/` (`add_warnings_bulk`), `warnings/remove-bulk/` (`remove_warnings_bulk`,
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
  résumé quotidien par `src/lib/utils/notification-formatters.ts`).
- Envoi manuel : `src/routes/(protected)/dashboard/teacher/notifications/` et
  `dashboard/admin/notifications/` (form actions, `createNotificationSchema`, limite de débit).
- Types : `src/lib/types/notification.ts` ; validation `src/lib/server/validation/notifications.ts`.

### Modèles de messages

- Pages : `src/routes/(protected)/dashboard/teacher/message-templates/` et
  `dashboard/admin/message-templates/` (+ `stats/`), avec `FiltersHelp`, `TagsInput` et
  `VariableAutocomplete` de `src/lib/components/templates/` (`TagsInput` sert aussi à
  `src/routes/(protected)/constructions/conversion/+page.svelte`).
- API : `src/routes/api/messages/templates/` — CRUD, `[id]/approve/` (admin seul),
  `[id]/duplicate/`, `[id]/preview/`, `[id]/versions/`, `favorites/`, `match/`, `stats/`.
- Moteur de variables : `src/lib/templates/` (vérifié le 2026-10-13) — `templateVariables.ts`
  (variables par déclencheur, `VARIABLES_BY_TRIGGER`), `templateEngine.ts` (`renderTemplate`,
  `previewTemplate`, `validateTemplate`, placeholders `{{…}}`), `advancedEngine.ts` (blocs
  `{{#if}}…{{/if}}`, filtres `{{var | filtre}}`, `TEMPLATE_FILTERS`) ; tests dans
  `src/lib/templates/__tests__/`. Types `src/lib/types/messageTemplates.ts` ; validation
  `src/lib/server/validation/message-templates.ts`. Sans rapport avec les modèles de chapitre.

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
  (`late`, `thisWeek`, `later`, `noDeadline`, `doneRecently`). Rien à voir avec les messages.
  Composants `src/lib/components/student-inbox/` ; appelée par
  `src/routes/(protected)/dashboard/+page.server.ts` et `dashboard/student/work/+page.server.ts`.
- `src/lib/stores/mentions.svelte.ts` et `hashtags.svelte.ts` alimentent les extensions
  `@` et `#` de l'éditeur riche (`src/lib/components/rich-text/editor-config.ts`).

## Invariants

### Qui peut écrire à qui (messages privés)

1. **Élève → prof seulement ; prof → élèves seulement ; admin → tout le monde.** Tenu par
   `validate_message_recipients` (migration `20260618093000_option_b_unification_remove_inter_teacher_sharing.sql`),
   appelée dans `send_private_message`. Un élève hors-classe peut écrire au prof (ADR 0002).
   Test : `tests/integration/option-b-messaging.test.ts` (« student -> another student stays
   forbidden »).
2. **On n'envoie qu'en son nom.** `send_private_message` refuse un `p_sender_id` différent de
   `auth.uid()` (hors admin) — `20260902091000_security_rpc_caller_guards.sql`. Même garde sur
   `get_allowed_recipients` et `search_private_messages`.
3. **Un message de groupe** ne part que du prof ou de l'admin, vers une classe active
   (`validate_class_message_recipients`) ; la fonction remplace les destinataires par les élèves
   de la classe. Test : `tests/integration/message-group-recipients.test.ts`.
4. **Un fil ne montre que ses propres messages** : `get_message_thread` filtre sur
   expéditeur ou destinataire (`20260902102000_security_message_thread_filter.sql`, finding
   H12 : la réponse privée d'un élève fuitait vers ses camarades). Test :
   `tests/integration/security-message-thread.test.ts`.
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
  `messages` appelle `check_profanity_simple` (quatre mots, recherche de sous-chaîne) et pose
  `is_flagged` + `flag_reason`. Il **marque**, il ne bloque pas. `ChatMessageList` affiche
  « Ce message a été signalé automatiquement ».
- Aucun filtre sur `private_messages`, ni sur les notifications.
- L'ancien filtre côté serveur (`profanity-filter.ts`, jamais branché) a été retiré le 2026-10-13.

### Ce que voit et fait le prof (ou l'admin)

- Signalements : tous, via `get_reports_for_moderation` (`is_teacher_or_admin()`), triés
  `pending` d'abord.
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
`searchMessagesQuerySchema`, `restrictUserSchema`, `deleteMessageSchema`, `addWarningsBulkSchema`,
`removeWarningsBulkSchema`, `createNotificationSchema`, `markNotificationReadSchema`, schémas de
`message-templates.ts`. `reports/[id]/` porte son schéma en local (`reviewReportSchema`) ;
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
- Validation : `src/lib/server/validation/__tests__/warnings.test.ts`,
  `message-templates.test.ts`, `rewards-messages-notifications.test.ts`.
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

## Écarts connus (constatés le 2026-10-13, non corrigés)

### ⚠️ Safeguarding (élèves mineurs)

- **Un échec de lecture des signalements est muet.** `gestion/+page.server.ts` logue l'erreur
  de `get_reports_for_moderation` et continue (« reports feature might not be set up ») : le
  prof voit une liste vide, sans alerte, alors que des signalements de harcèlement entre
  élèves peuvent attendre.
- **Le marquage automatique n'arrive pas chez le prof.** `is_flagged` n'est lu que par
  `ChatMessageList` ; aucun écran de modération ne liste les messages marqués. Le filtre ne
  connaît que quatre mots. Le commentaire du trigger annonce un contrôle serveur « plus
  sophistiqué » qui n'existe pas.
- **Mentions factices dans l'éditeur riche.** `src/lib/stores/mentions.svelte.ts` propose une
  liste en dur (« Alice Dupont », « Bob Durand »…) ; l'extension `Mention` est active dans
  `editor-config.ts`. Aucune vraie personne, mais des noms inventés offerts à l'autocomplétion.

### Code mort ou sans appelant

- **Messagerie privée sans lien d'entrée** : aucune page hors de `src/routes/(protected)/messages/`
  ne pointe vers `/messages` (grep sur `src/`, hors `skeleton-detector.ts`). Même constat pour
  `dashboard/teacher/notifications`, `dashboard/admin/notifications`,
  `dashboard/{teacher,admin}/message-templates` et `dashboard/admin/friendships`.
- **Modèles de messages jamais utilisés pour envoyer** : `compose/` ne les lit pas ; seul
  `src/lib/stores/messageTemplates.svelte.ts` appelle `/api/messages/templates/match`, et ce
  store n'est importé nulle part.
- Méthodes du store `privateMessages` sans appelant : `moveToFolder`, `loadUnreadCount`,
  `searchMessages` (donc la route `search/` n'a pas d'appelant d'interface).
- `auto-notifications.ts` : 7 fonctions sur 10 sans appelant (`notifyNewAssignment`,
  `notifyNewResource`, `notifyRewardEarned`, `notifyVipCardEarned`, `notifyBadgeUnlocked`,
  `notifyMaintenance`, `notifyFeatureRelease`). `cleanupExpiredNotifications` sans appelant.
- Route d'avertissements sans appelant dans `src/` : `POST /api/warnings` (ajout unitaire,
  seul usage d'`addWarning`).

### Commentaires faux, incohérences

- **Tri des notifications par priorité** : `getUnreadNotifications` trie la colonne texte
  `priority` en ordre décroissant, donc alphabétique : `urgent`, `normal`, puis `important`.
  Le commentaire promet « urgent first » ; `important` passe après `normal`.
- **`NotificationType`** (`src/lib/types/notification.ts`) accepte `warning`, `success`,
  `error`, `system`, que la contrainte `notifications_type_check` refuse.
- `src/routes/api/student/warnings/[periodId]/+server.ts` dit que l'élève ne voit pas ses
  avertissements : `RewardsBlock` les affiche.
- `getClassWarnings` reçoit `teacherId` sans s'en servir ; ses commentaires parlent encore de
  « vérifier la propriété de la classe » (mono-prof : il vérifie seulement qu'elle existe).
- `add_warning` / `add_warnings_bulk` ne vérifient pas que l'élève est membre de la classe.
- `createNotification` (cible `users`) accepte tout élève présent dans `class_members`, quel
  que soit le statut de l'adhésion ; un élève hors-classe ne peut pas être ciblé nommément par
  le prof.
- `send_private_message` laisse le prof écrire à un élève de test ; `get_allowed_recipients`
  les masque de la liste.
- L'en-tête de `student-inbox.ts` parle de « quatre systèmes d'affectation » ; la fonction en
  interroge six sources (Python compte pour trois).
