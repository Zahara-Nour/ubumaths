# Lot messagerie : 25 points (32 blocs après découpage)

| verdict      | nombre |
| ------------ | -----: |
| VRAI         |     27 |
| CORRIGÉ      |      0 |
| FAUX         |      2 |
| PAS UN ÉCART |      3 |
| NON VÉRIFIÉ  |      0 |
| DOUBLON      |      0 |

Aucun point du lot n'est au registre (`docs/ecarts/registre.md` relu le 2026-11-24 : seuls E58 à E60 touchent les modèles de message, par la page, pas par le code mort du point 437).

## Points

### messagerie-et-moderation.md:411 [V] — VRAI

- **Point** : boîte de réception en panne, 400 (`folderId` nul refusé par le schéma).
- **Vu** : `src/lib/stores/privateMessages.svelte.ts:147-153` appelle `/api/messages/inbox?status=inbox` (ni `folderId`, ni `limit`, ni `offset`) ; `src/routes/api/messages/inbox/+server.ts:22-27` passe `url.searchParams.get(...)`, donc `null` pour chaque paramètre absent ; `src/lib/server/validation/messages.ts:211-216` : `folderId: z.string().uuid().optional()` refuse `null`, et `limit: z.coerce.number().int().positive()` transforme `null` en 0 et le refuse (le `.default(50)` ne joue que sur `undefined`). Sonde vitest jetable (fichier retiré) : `INBOX [["folderId"],"…chaîne de caractères attendu, null reçu"],[["limit"],"Trop petit : nombre doit être >0"]` → 400 **certain**, quelles que soient les données. Deux causes, pas une : corriger `folderId` seul laisse le 400 de `limit`. Même panne pour `/messages/archived` (`archived/+page.svelte:29`, `loadInbox('archived')`). Panne suivante derrière : même avec des paramètres valides, `get_user_inbox` (dernière définition : `supabase/migrations/20260902091000_security_rpc_caller_guards.sql:141`, seul `search_path` retouché par `20261003210000_rpc_lot4_hygiene.sql:709`) rend `message_id`, `content` jsonb, `sent_at`, sans `id`, `sender_email`, `created_at` : `messageResponseSchema` (`messages.ts:55-67`) échoue et `validateResponse` (`src/lib/server/validation/response-utils.ts`) lève un 500 dès qu'il y a un message (liste vide : 200).
- **Test existant** : aucun ne la couvre. `src/lib/server/validation/__tests__/rewards-messages-notifications.test.ts:715+` passe `{}` (valeurs `undefined`), jamais les `null` que donne la route : test vert trompeur. `src/routes/api/messages/__tests__/api-routes.test.ts:356+` appelle un Supabase simulé, pas la route.
- **Registre** : V · messagerie · la boîte de réception (et les archives) d'un élève comme du prof ne s'ouvre jamais, « Impossible de charger la boîte de réception » · preuve : test à écrire, appeler le `GET` de `api/messages/inbox` avec l'URL exacte du store (`?status=inbox`) et un client simulé qui rend une ligne au format de `get_user_inbox` → 200 et un message.

### messagerie-et-moderation.md:413 (a) [V] — VRAI

- **Point** : envoyés, 400 sans `limit`.
- **Vu** : `privateMessages.svelte.ts:174` appelle `/api/messages/sent` sans paramètre ; `src/routes/api/messages/sent/+server.ts:22-25` passe `null` ; sonde : `SENT [["limit"],"Trop petit : nombre doit être >0"]` → 400 certain.
- **Registre** : V · messagerie · la page des messages envoyés ne s'ouvre jamais · preuve : test à écrire, appeler le `GET` de `api/messages/sent` sans paramètre avec un client simulé qui rend une ligne au format de `get_user_sent_messages` → 200 et un message (couvre a et b).

### messagerie-et-moderation.md:413 (b) [V] — VRAI

- **Point** : avec `limit`, 500 (réponse de `get_user_sent_messages` hors `messageResponseSchema`).
- **Vu** : sonde `SENT2 {"limit":50,"offset":0}` (la requête passe). `get_user_sent_messages`, dernière définition `20260902091000_security_rpc_caller_guards.sql:190` (`20261003210000:711` ne touche que `search_path`), rend `message_id, subject, content jsonb, plain_text, sent_at, is_group_message, recipient_count, has_attachments, recipients` : ni `id`, ni `sender_id`, ni `sender_name`, ni `sender_email`, ni `created_at`, et `content` n'est pas une chaîne → 500 dès qu'un message envoyé existe (200 sur liste vide). Certain à la lecture.
- **Registre** : même ligne que (a).

### messagerie-et-moderation.md:427 [V] — VRAI

- **Point** : mentions factices offertes à l'autocomplétion de l'éditeur riche.
- **Vu** : `src/lib/stores/mentions.svelte.ts:23-26` (`mockUsers`, « Alice Dupont », « Bob Durand »…) ; `src/lib/extensions/mention-extension.ts:22,220` appelle `searchUsers` ; `src/lib/components/rich-text/editor-config.ts:170` `Mention.configure({})` dans la liste des extensions.
- **Registre** : V · éditeur riche · taper « @ » dans l'éditeur propose des personnes inventées (« Alice Dupont », « Bob Durand ») · preuve : commande `test -d src/lib && ! grep -rq "Alice Dupont" src/lib` (exit 1 aujourd'hui).

### messagerie-et-moderation.md:450 [V] — VRAI

- **Point** : tri des notifications par priorité alphabétique (`urgent`, `normal`, `important`).
- **Vu** : `src/lib/server/notifications.ts:336` `.order('priority', { ascending: false })` ; colonne `text` (`20260616220000_baseline_schema.sql:27722`, contrainte `notifications_priority_check` l. 27737, aucune migration plus récente) ; commentaires « urgent first » `notifications.ts:249`, `src/lib/stores/notifications.svelte.ts:204`.
- **Registre** : V · notifications · une notification « importante » passe après les « normales » dans la liste et le bandeau · preuve : commande `f=src/lib/server/notifications.ts; test -f "$f" && ! grep -q "order(.priority., { ascending: false })" "$f"` (exit 1 aujourd'hui).

### messagerie-et-moderation.md:419 [T] — VRAI

- **Point** : l'échec de lecture des signalements est muet, le prof voit une liste vide.
- **Vu** : `src/routes/(protected)/dashboard/teacher/moderation/gestion/+page.server.ts:87-90` : `logger.error` puis « Don't throw, just log - reports feature might not be set up » ; le retour (l. ~156) donne `reports: (reportsResult.data ?? [])`, aucun drapeau d'erreur ; même chose pour le compteur `get_pending_reports_count` (l. 92-95, `pendingReportsCount: … ?? 0`). Restrictions et journaux, eux, lèvent un 500.
- **Registre** : T · modération · si la lecture des signalements échoue, le prof voit « aucun signalement » au lieu d'une alerte, alors que des signalements d'élèves peuvent attendre · preuve : commande `f="src/routes/(protected)/dashboard/teacher/moderation/gestion/+page.server.ts"; test -f "$f" && ! grep -q "reports feature might not be set up" "$f"` (exit 1 aujourd'hui ; mieux : test à écrire, `load` avec `get_reports_for_moderation` en erreur → erreur levée ou drapeau d'échec rendu à la page).

### messagerie-et-moderation.md:423 (a) [T] — VRAI

- **Point** : le marquage automatique (`is_flagged`) n'arrive sur aucun écran de modération.
- **Vu** : dans `src/`, `is_flagged` n'est lu que par `src/lib/stores/chat.svelte.ts` et `src/lib/components/chat/ChatMessageList.svelte:303` ; aucune occurrence sous `src/routes/(protected)/dashboard/{teacher,admin}/moderation` ni `src/lib/components/moderation`. Côté SQL, seuls `20260616220000_baseline_schema.sql`, `20260616250000_trim_message_plain_text.sql` et `20261014110000_lecture_seule_garde_base.sql:176` (liste des colonnes modifiables) nomment la colonne : aucune fonction de modération ne la lit.
- **Registre** : T · modération · un message marqué automatiquement comme grossier n'apparaît sur aucun écran du prof, il ne le voit qu'en tombant dessus dans le chat · preuve : commande `d="src/routes/(protected)/dashboard/teacher/moderation"; test -d "$d" && grep -rq "is_flagged" "$d"` (exit 1 aujourd'hui).

### messagerie-et-moderation.md:423 (b) [T] — VRAI

- **Point** : le filtre ne connaît que quatre mots.
- **Vu** : `check_profanity_simple`, seule définition `20260616220000_baseline_schema.sql:4167` : `ARRAY['merde', 'putain', 'connard', 'salope']` (`20261001170000_anon_retrait_droits_herites.sql` ne fait que retirer des droits).
- **Registre** : T · modération · le marquage automatique ne repère que quatre gros mots, aucune insulte ni menace au-delà · preuve : à la main (décision du contenu de la liste, à poser avec (a)).

### messagerie-et-moderation.md:423 (c) [C] — VRAI

- **Point** : le commentaire du trigger annonce un contrôle serveur « plus sophistiqué » qui n'existe pas.
- **Vu** : `process_message_content`, dernière définition `supabase/migrations/20260616250000_trim_message_plain_text.sql:30` : « basic check, server-side will do more sophisticated checking » ; aucun autre contrôle dans `src/` (grep `profan` / `flag_reason` hors anti-fraude : rien).
- **Registre** : C · modération · le code promet un contrôle des gros mots côté serveur qui n'existe pas · preuve : à la main (commentaire dans une migration déjà jouée : se corrige par la prochaine redéfinition de la fonction).

### carnet-de-liaison.md:156 [L] — VRAI

- **Point** : rejets définitifs Brevo signalés après l'envoi : l'adresse n'est pas marquée `invalid` (pas de webhook).
- **Vu** : aucune route de webhook sous `src/routes/api` (grep `webhook`, `brevo` : seuls des envois) ; plus largement, **rien n'écrit jamais l'état `invalid`** : `src/lib/server/carnet/envois.ts:410-418` ne fait que le lire pour le remettre en `pending`, et aucune migration ne l'écrit (contrainte seulement, `20261116204753_carnet_adresse_retiree.sql:36`). Les échecs immédiats sont journalisés (`courriels.ts:135-141`, ligne passée `failed`), pas l'adresse.
- **Registre** : L · carnet de liaison · une adresse de parent qui n'existe plus reste « confirmée » et reçoit des courriels perdus, le prof n'en sait rien · preuve : test à écrire, un rejet définitif reçu de Brevo fait passer l'adresse en `invalid`.

### carnet-de-liaison.md:158 [L] — VRAI

- **Point** : `access_count` du lien compte aussi les ouvertures par le jeton d'un courriel.
- **Vu** : `get_carnet_by_token`, dernière définition `20261116215952_carnet_courriels_exception.sql:369-402` : `carnet_contact_by_token` accepte lien ou jeton, puis `update parent_carnet_links set access_count = access_count + 1` pour le contact. Aucun écran ne lit ce compteur pour le carnet (grep `access_count` dans `src/` : seulement les liens de partage d'exercices, de journal, de cours) → sans effet visible aujourd'hui.
- **Registre** : L · carnet de liaison · le nombre d'ouvertures d'un lien de parent mélange le lien et les courriels (lu par aucun écran) · preuve : test à écrire (intégration), ouvrir le carnet par le jeton d'un courriel ne change pas `access_count` du lien.

### carnet-de-liaison.md:162 [L] — VRAI

- **Point** : épisodes non marqués après un envoi réussi (erreur de base) : repartent une semaine plus tard.
- **Vu** : `src/lib/server/carnet/courriels.ts:244-256` : après l'envoi, `update … notified_at` vérifié par `.select('id')`, mais en cas d'échec seulement `logger.error('[parent_exception_episodes] épisodes non marqués', …)` ; le plan suivant (`carnet_exception_plan`, plafond `6 days 12 hours`, `20261116215952:…`) les reprend.
- **Registre** : L · carnet de liaison · une panne de base juste après un courriel d'exception fait renvoyer le même avertissement au parent la semaine suivante · preuve : test à écrire, marquage des épisodes en échec → l'épisode n'est pas reproposé (ou l'échec est remonté au rapport du passage).

### messagerie-et-moderation.md:453 [L] — VRAI

- **Point** : `NotificationType` accepte `warning/success/error/system`, refusés par la contrainte.
- **Vu** : `src/lib/types/notification.ts:14-15` ; contrainte `notifications_type_check` (`baseline_schema.sql`, seule définition) : `info, alert, announcement, reminder`. Aucun écrivain actuel n'utilise les quatre valeurs en trop (le formulaire passe par `notificationTypeFormSchema`, `src/lib/server/validation/notifications.ts:37`, qui est juste).
- **Registre** : L · notifications · le type TypeScript des notifications permet d'en créer quatre sortes que la base refuse · preuve : commande `f=src/lib/types/notification.ts; test -f "$f" && ! grep -qE "'(warning|success|error|system)'" "$f"` (exit 1 aujourd'hui).

### messagerie-et-moderation.md:459 [L] — VRAI

- **Point** : `add_warning` / `add_warnings_bulk` ne vérifient pas que l'élève est membre de la classe.
- **Vu** : seule définition des deux : `20260616220000_baseline_schema.sql` (`20261003210000_rpc_lot4_hygiene.sql:622-623` ne change que `search_path`). Contrôles : `is_class_teacher(p_class_id)`, type, plafond 20 ; aucun `class_members`. `SECURITY DEFINER` : la RLS de `student_warnings` ne joue pas. Côté TS, `src/lib/server/warnings.ts` et `src/routes/api/warnings/{,bulk/}+server.ts` ne vérifient rien non plus.
- **Registre** : L · avertissements · le prof peut poser un avertissement à un élève dans une classe où il n'est pas · preuve : test à écrire (intégration), `add_warning` sur un élève non membre de la classe → refus.

### messagerie-et-moderation.md:460 (a) [L] — VRAI

- **Point** : `createNotification` accepte tout élève de `class_members`, quel que soit le statut.
- **Vu** : `src/lib/server/notifications.ts:104-127` : `.from('class_members').select('student_id')` sans filtre `status` ; un ancien élève (adhésion archivée) reste ciblable.
- **Registre** : L · notifications · le prof peut viser nommément un élève qui a quitté ses classes · preuve : test à écrire, `createNotification` (cible `users`) sur un élève dont la seule adhésion est archivée → refus.

### messagerie-et-moderation.md:460 (b) [D] — VRAI

- **Point** : un élève hors-classe ne peut pas être ciblé nommément.
- **Vu** : même contrôle (`notifications.ts:117-126`) : un élève sans aucune ligne `class_members` → « Ciblage réservé aux élèves du professeur ».
- **Question à David** : un élève qui travaille avec toi sans être dans une classe (hors-classe) ne peut pas recevoir une notification à son nom ; par exemple tu veux prévenir un seul élève hors-classe qu'un devoir l'attend, l'appli refuse. Réponses : (1) l'autoriser (tout élève du prof, en classe ou hors-classe) ; (2) garder le refus (notification nominative = élèves en classe seulement).

### messagerie-et-moderation.md:463 [L] — VRAI

- **Point** : `send_private_message` laisse le prof écrire à un élève de test ; `get_allowed_recipients` les masque.
- **Vu** : `get_allowed_recipients`, dernière définition `20260902091000_security_rpc_caller_guards.sql:377` (filtre `coalesce(p.is_test, false) = false`, l. ~407) ; `send_private_message` (même migration, l. 29) délègue à `validate_message_recipients`, dernière définition `20260618093000_option_b_unification_remove_inter_teacher_sharing.sql:65`, qui ne vérifie que `role = 'student'`, sans `is_test`.
- **Registre** : L · messagerie · le prof peut envoyer un message privé à un élève de test que la liste des destinataires ne propose pas · preuve : test à écrire (intégration), `send_private_message` du prof vers un élève `is_test` → refus.

### carnet-de-liaison.md:159 [D] — VRAI

- **Point** : plafond d'un courriel par semaine par adresse et par élève.
- **Vu** : `carnet_exception_plan`, dernière définition `20261116215952_carnet_courriels_exception.sql` : le plafond (`n.contact_id = pc.id and n.created_at > now() - interval '6 days 12 hours'`) se compte par contact, et un contact = une adresse pour un élève.
- **Question à David** : un parent qui a deux enfants inscrits peut recevoir deux courriels d'alerte le même jour, un par enfant. Exemple : l'aîné a une évaluation non faite, la cadette est inactive depuis 10 jours, le parent reçoit deux courriels lundi. Réponses : (1) c'est bien ainsi (un courriel par enfant, plus clair) ; (2) regrouper en un seul courriel par adresse et par semaine, qui parle des deux enfants ; (3) garder deux courriels mais pas le même jour.

### carnet-de-liaison.md:166 (a) [D] — VRAI

- **Point** : changement de classe en cours d'année : tout repart, le parent ne voit plus les semaines d'avant.
- **Vu** : `carnet_payload`, dernière définition `20261117222600_carnet_regularite_depuis_la_rentree.sql` : `min(cm.joined_at)` sur les adhésions **actives** ; les semaines ne s'affichent qu'à partir de `greatest(v_first_day, v_joined)` et les évaluations échues qu'à partir de `v_joined`. L'ancienne classe (adhésion archivée) n'est plus comptée.
- **Question à David** : un élève qui change de classe en février fait repartir son carnet de zéro : son parent ne voit plus septembre à janvier. Réponses : (1) c'est voulu (le carnet suit la classe actuelle) ; (2) garder l'historique depuis la rentrée tant que l'élève reste dans une de tes classes.

### carnet-de-liaison.md:166 (b) [D] — FAUX

- **Point** : élève retiré puis remis dans sa classe (« un retrait efface l'adhésion ») : tout repart.
- **Vu** : le retrait archive l'adhésion au lieu de l'effacer (`src/routes/api/admin/remove-from-class/+server.ts:38-43`, `status: 'archived'`) et la remise la réactive (`src/routes/api/admin/add-to-class/+server.ts:47-51`) ; le trigger (`20260915160000_class_member_left_at.sql:105-133`) ne touche que `left_at`, pas `joined_at`. Aucun `delete` de `class_members` dans `src/`. Le carnet reprend donc à l'ancienne date d'arrivée : la doc (l. 166-167) est périmée sur cette moitié.

### carnet-de-liaison.md:170 [D] — PAS UN ÉCART

- **Point** : l'effacement des 90 jours efface aussi les adresses « Je ne suis pas le parent » et retirées, leur empreinte ne bloque plus une ressaisie.
- **Vu** : `carnet_erase_orphan_contacts` (`20261116215952_carnet_courriels_exception.sql`) efface la ligne entière, tous états confondus. Décision déjà prise et écrite : ADR 0040, amendement du 2026-11-16 (Q35) : « une adresse "Je ne suis pas le parent" effacée ainsi peut être ressaisie ».

### carnet-de-liaison.md:172 [D] — PAS UN ÉCART

- **Point** : `parent_notifications` effacé au bout d'un an (Q42).
- **Vu** : `carnet_erase_old_notifications`, `20261117134539_carnet_effacement_journal_courriels.sql` (`created_at < now() - interval '1 year'`). Décision de David du 2026-11-17 (Q42, `docs/systeme/conformite/rgpd.md:514`, politique v1.4, registre T9).

### messagerie-et-moderation.md:433 [D] — VRAI

- **Point** : messagerie privée sans lien d'entrée ; idem notifications prof/admin, modèles de messages, amitiés admin.
- **Vu** : grep des chemins `/messages`, `/dashboard/{teacher,admin}/notifications`, `/dashboard/{teacher,admin}/message-templates` dans `src/` hors de leurs propres dossiers : seuls `src/lib/utils/skeleton-detector.ts` et un commentaire (`MobileNavDrawer.svelte:53`, `demo/editeur`). `/dashboard/admin/friendships` n'apparaît que dans `dashboard/admin/+layout.server.ts:34` (préfixes autorisés au prof), pas comme lien.
- **Question à David** : ces pages existent mais aucun bouton n'y mène : la messagerie privée (en panne de toute façon, points 411 et 413), les pages de notifications du prof et de l'admin, les modèles de messages (déjà à retirer, E58), la page des amitiés. Exemple : un élève ne peut écrire au prof qu'en tapant l'adresse `/messages` à la main. Réponses : (1) réparer la messagerie et ajouter un lien dans le menu ; (2) retirer ces pages ; (3) les laisser cachées telles quelles.

### messagerie-et-moderation.md:437 [M] — VRAI

- **Point** : modèles de messages jamais utilisés pour envoyer.
- **Vu** : `src/routes/(protected)/messages/compose/` ne contient aucun « templates » ; seul `src/lib/stores/messageTemplates.svelte.ts:137` appelle `/api/messages/templates/match`, et ce store n'est importé nulle part (grep `stores/messageTemplates` : rien). Lié à E58 à E60 (retrait de la page décidé), sans en être un doublon.
- **Registre** : M · modèles de message · le store des modèles et la route de correspondance n'ont aucun appelant · preuve : commande `f=src/lib/stores/messageTemplates.svelte.ts; ! test -f "$f" || grep -rq "stores/messageTemplates" src/routes src/lib/components` (exit 1 aujourd'hui).

### messagerie-et-moderation.md:440 (a) [M] — VRAI

- **Point** : `moveToFolder` du store `privateMessages` sans appelant.
- **Vu** : grep `\.moveToFolder(` dans `src/` hors tests : rien.
- **Registre** : M · messagerie · deux méthodes du store de la messagerie (`moveToFolder`, `searchMessages`) et donc la route de recherche n'ont aucun appelant · preuve : commande `f=src/lib/stores/privateMessages.svelte.ts; test -f "$f" && ! grep -qE "async (moveToFolder|searchMessages)\(" "$f"` (exit 1 aujourd'hui) ; couvre (a) et (c).

### messagerie-et-moderation.md:440 (b) [M] — FAUX

- **Point** : `loadUnreadCount` sans appelant.
- **Vu** : appelée par le store lui-même, `privateMessages.svelte.ts:265` (dans `loadMessage`) et `:358` (dans `toggleRead`), et `toggleRead` est appelée par `messages/[id]/+page.svelte:80` et `messages/archived/+page.svelte:104`. Pas de code mort.

### messagerie-et-moderation.md:440 (c) [M] — VRAI

- **Point** : `searchMessages` sans appelant (donc la route `search/` sans appelant d'interface).
- **Vu** : grep `\.searchMessages(` : rien ; `/api/messages/search` n'est appelée que par `privateMessages.svelte.ts:479`, dans cette méthode.
- **Registre** : même ligne que (a).

### messagerie-et-moderation.md:442 [M] — VRAI

- **Point** : `auto-notifications.ts`, 7 fonctions sur 10 sans appelant ; `cleanupExpiredNotifications` sans appelant.
- **Vu** : comptage des appels hors du fichier et hors tests : `notifyNewAssignment`, `notifyNewResource`, `notifyRewardEarned`, `notifyVipCardEarned`, `notifyBadgeUnlocked`, `notifyMaintenance`, `notifyFeatureRelease` = 0 ; `notifyNewAssessment`, `notifyErrorReportValidated`, `notifyErrorReportRejected` = 2 chacune. `cleanupExpiredNotifications` (`src/lib/server/notifications.ts:819`) : aucun appelant.
- **Registre** : M · notifications · sept notifications automatiques et le nettoyage des notifications expirées ne sont jamais appelés · preuve : commande `f=src/lib/server/auto-notifications.ts; test -f "$f" && ! grep -qE "export async function (notifyNewAssignment|notifyNewResource|notifyRewardEarned|notifyVipCardEarned|notifyBadgeUnlocked|notifyMaintenance|notifyFeatureRelease)\(" "$f" && ! grep -q "export async function cleanupExpiredNotifications" src/lib/server/notifications.ts` (exit 1 aujourd'hui).

### messagerie-et-moderation.md:445 [M] — VRAI

- **Point** : `POST /api/warnings` sans appelant.
- **Vu** : appels `fetch` vers `/api/warnings…` dans `src/` : seulement `/api/warnings/bulk` (`StudentQuickActionsTable.svelte:449`, `moderation/avertissements/+page.svelte:270`) et `/api/warnings/remove-bulk`. `addWarning` n'est importée que par `src/routes/api/warnings/+server.ts:25`.
- **Registre** : M · avertissements · la route d'ajout d'un seul avertissement n'est appelée par aucun écran · preuve : commande `f=src/routes/api/warnings/+server.ts; ! test -f "$f" || ! grep -q "export const POST" "$f"` (exit 1 aujourd'hui).

### messagerie-et-moderation.md:455 [C] — VRAI

- **Point** : commentaire de `api/student/warnings/[periodId]` périmé.
- **Vu** : `src/routes/api/student/warnings/[periodId]/+server.ts:17-18` « Currently students cannot view their own warnings in the UI » ; or `src/lib/components/RewardsBlock.svelte:53` lit `studentCache.getWarningsSync(periodId)` et affiche la tuile d'avertissements, et `RewardsBlock` est importé par `src/routes/(protected)/dashboard/StudentDashboard.svelte`.
- **Registre** : C · avertissements · le code dit que l'élève ne voit pas ses avertissements alors que son tableau de bord les affiche · preuve : commande `f="src/routes/api/student/warnings/[periodId]/+server.ts"; test -f "$f" && ! grep -q "students cannot view their own warnings" "$f"` (exit 1 aujourd'hui).

### messagerie-et-moderation.md:457 [C] — VRAI

- **Point** : `getClassWarnings` : `teacherId` inutilisé, commentaires périmés.
- **Vu** : `src/lib/server/warnings.ts:173-179` : `teacherId` dans le type, absent de la déstructuration ; jsdoc l. 154 et 159 (« verifies teacher ownership », « for RLS verification »), messages l. 190-196 (« verifying class ownership », « Teacher does not own class ») alors que le code ne vérifie que l'existence de la classe (l. 181-187).
- **Registre** : C · avertissements · le code prétend vérifier que la classe appartient au prof, il vérifie seulement qu'elle existe · preuve : commande `f=src/lib/server/warnings.ts; test -f "$f" && ! grep -q "Teacher does not own class" "$f"` (exit 1 aujourd'hui).

### messagerie-et-moderation.md:465 [C] — PAS UN ÉCART

- **Point** : en-tête de `student-inbox.ts`, « quatre systèmes » pour six sources.
- **Vu** : `src/lib/server/student-inbox.ts:7` « the four assignment systems (assessments, exercises a l'unite, worksheets, python) » : la liste est juste au niveau des systèmes ; Python y regroupe trois tables (`python_exercise_assignments` l. 575, `python_notebook_assignments` l. 664, `python_file_assignments` l. 735). Le commentaire nomme ce qu'il compte ; au plus une précision « (Python : exercices, carnets, fichiers) ».

## Vu en passant

- L'état `invalid` d'une adresse de parent n'est écrit nulle part (ni `src/`, ni migration) : la branche `case 'invalid'` de `src/lib/server/carnet/envois.ts:410` ne peut jamais servir aujourd'hui (voir carnet:156).
- Le test `inboxMessagesQuerySchema` « should use default values » (`rewards-messages-notifications.test.ts:733`) passe `{}` alors que la route passe des `null` : il affirme un comportement que la route n'obtient jamais (cause de la panne 411 non vue).
- `get_pending_reports_count` en échec rend aussi un compteur 0 muet (`moderation/gestion/+page.server.ts:92-95`), à traiter avec 419.
