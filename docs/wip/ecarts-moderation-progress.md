---
title: Écarts graves de modération et de données d'élèves (T20, T25, T27, puis T21, T22) — journal
date: 2026-11-24
status: cinq PR mergées (#3115, #3125, #3132, #3140, #3143), migrations en prod ; T33 à ouvrir par une phase 0
---

## Reprendre ici

_Mis à jour le 2026-11-25 (13), après #3143 et sa migration en prod._

- **État** : cinq PR mergées : #3115 (T20, T25, T27), #3125 (T22, C32, marque non maquillable), #3132 (T21), #3140 (T31 : un message ne change pas de conversation), **#3143 (T32 : une participation ne change pas de conversation)**. Registre : T31 et T32 barrés, T33 et M59 ouverts. En prod : toutes les migrations jusqu'à `20261125114503` (T32, jouée par David le 2026-11-25, trigger `guard_participation_conversation_trg` vérifié en lecture). Rien n'est déployé (`deploy:prod` sur demande de David).
- **Prochaine action** : **T33**, dans une session neuve, en commençant par une phase 0 (où garder le texte d'origine, combien de temps, qui le lit, ce que voit le prof). Tranché par David : le texte d'origine d'un message marqué que l'élève réécrit est gardé pour le prof.
- **En attente de David** : rien.
- **Pièges en cours** : T30 (déjà au registre) couvre la date d'envoi réécrite ; ma sonde du 2026-11-25 n'a modifié aucune ligne en changeant `created_at`, à reprouver avant d'y toucher. Un élève ne supprime pas son message par un UPDATE direct de `deleted_at` (RLS). La mention de l'onglet est « supprimé par la modération » ou « supprimé » seul, jamais « par l'élève ». Page de modération : lancer le dossier de tests entier. Écriture en prod = toujours David. Remarque du `security-auditor` sur #3143, non prouvée : le motif « policy UPDATE sans liste de colonnes » peut exister sur d'autres tables d'élèves.
- **Worktree / branche** : aucun (retirés par `pnpm pr:merger`).

---

## Phase 0, validée par David le 2026-11-24 (« ok » sur les recommandations)

- **T20** : lecture des signalements en échec → bandeau d'alerte à la place de la liste, le reste de la page marche ; compteur illisible → pas de 0 (rien), une alerte.
- **T25** : suppression d'un rapport de bug (seul ou en lot) → capture effacée du stockage d'abord, puis la ligne ; capture impossible à effacer → rien n'est supprimé, l'admin le lit.
- **T27** : réponse refusée par sa validation → le journal garde les champs fautifs, jamais le contenu.
- **T21** : option a, le prof ne voit que les messages marqués des conversations qu'il peut déjà ouvrir (aucun accès nouveau).
- **T22** : option a, liste proposée sur une page à cocher, relue par David.
- **T24** : hors lot (suspendu avec le tuteur, D21).

## Mesures en prod (lecture seule, 2026-11-24)

- Bucket `bug-report-screenshots` : 0 capture, 0 orpheline, 0 rapport avec capture → aucune purge à faire.
- Policies du bucket (absentes des migrations, présentes en prod) : « Admins can manage bug report screenshots » (`ALL`, `is_admin()`) → l'admin peut effacer avec son client, pas de migration pour T25.

## PR 1

- T20 : `gestion/+page.server.ts` rend `reportsLoadFailed` et `pendingReportsCount: number | null` ; `+layout.server.ts` idem pour le badge ; alerte dans `gestion/+page.svelte`.
- T25 : `deleteBugReportWithScreenshot` (`src/lib/server/bug-report-screenshots.ts`), appelée par `DELETE /api/bug-reports/[reportId]` et le lot.
- T27 : `validateResponse` ne journalise plus `data`.
- Reste connu : les policies storage du bucket ne sont dans aucune migration (la pile locale ne les a donc pas).

## Revues de la PR 1 (2026-11-24)

- `security-auditor` : `screenshot_path` est écrit par l'auteur tant que son rapport est en attente ; sans contrôle, un élève y mettait le chemin de la capture d'un autre et l'admin l'effaçait en supprimant le rapport. Corrigé : `isOwnScreenshotPath` (`<auteur>/<rapport>/<fichier>`, sans `..`), chemin non conforme = rien n'est effacé du stockage, la ligne part, le journal le dit. Tests : quatre chemins forgés.
- `code-reviewer` : `remove` qui rend une liste vide sans erreur (stockage qui refuse en silence). Choix : avertissement au journal, la ligne part quand même (pour l'admin, liste vide = fichier déjà absent). Lecture du rapport en erreur : test ajouté.
- **Écarts à entrer au registre après le merge** : (1) les policies du bucket `bug-report-screenshots` ne sont dans aucune migration (pile locale, pile de test et projet recréé sans policy admin : la capture resterait orpheline en silence) ; (2) l'auteur peut écrire `screenshot_path` et les autres colonnes de son rapport en attente par l'API de la base ; (3) le `remove` de `[reportId]/screenshot/+server.ts` ne regarde pas la liste rendue ; (4) compteur de signalements illisible : le badge du menu de modération disparaît sans rien dire hors de l'onglet Signalements.
- Vu à l'écran (`pnpm voir`, iPhone, compte prof, base locale) : page nominale (1 signalement, badge) et alerte de lecture en échec (échec forcé le temps de la capture). Déjà là avant la PR, non touché : le titre du bandeau « Moderation » sans accents, les onglets qui se chevauchent sur iPhone.

## PR 2 (2026-11-24)

- T21 : `gestion/+page.server.ts` lit `messages` (`is_flagged = true`, 100 plus récents) avec le client du prof, rend `flaggedMessages`, `flaggedMessagesLoadFailed` ; `FlaggedMessagesList.svelte` (lecture seule) ; onglets en 2 × 2 sur iPhone. Tests : `gestion/__tests__/messages-marques.test.ts` (rouges avant le code).
- T22 : liste proposée en six catégories (gros mots, sexiste et sexuel, raciste, homophobe, physique et handicap, menaces), environ 150 entrées dont une vingtaine proposées écartées pour fausses alertes.

## Revues de la PR 2 (2026-11-25)

- `code-reviewer` : aucun bloquant, aucun important. Fonction SQL jouée sur la pile de test (majuscules accentuées, ponctuation, vide, NULL, 100 000 caractères en moins de 10 ms), embeds PostgREST et droits conservés vérifiés. Trois mineurs :
  1. un texte en Unicode décomposé (lettre + accent combinant) ou avec un caractère de largeur nulle échappe au filtre (contournement volontaire) ; correctif possible : `normalize(…, NFD)` puis retrait des accents combinants, ou limite notée dans la migration ;
  2. fausses alertes possibles en maths : « tg » (`tg x`, ancienne tangente), « traînée », « mongol » (liste validée par David : à lui signaler, pas à changer seul) ;
  3. T21 n'a pas de test d'intégration prouvant que la RLS borne la liste (prof + message marqué dans un privé hors classe → non rendu).
- Hors diff, soupçon du `code-reviewer` confirmé par l'audit (ci-dessous) : un élève peut retirer la marque de son propre message.
- `security-auditor` : **aucun finding bloquant**. Accès T21 : rien de nouveau (policy SELECT de `messages`, dernière définition `20260620090000` l. 3372, `TO authenticated` par `20261001130000`) ; rendu échappé, journaux sans contenu ; migration saine (droits conservés : `authenticated`, `service_role`, ni `anon` ni PUBLIC ; 2 Mo en moins de 200 ms ; ne PAS retirer EXECUTE à `authenticated`, le trigger appelle la fonction avec les droits de l'auteur).
  - **Important, antérieur à la branche mais rendu utile par T21** : un élève peut, par l'API de la base, faire `UPDATE messages SET is_flagged = false, flag_reason = null, plain_text = 'bonjour'` sur son propre message (policies UPDATE sans borne de colonnes, trigger seulement sur `UPDATE OF content`, baseline l. 35394). Rejoué sur la pile de test en rôle élève, transaction annulée : `t|ta gueule` → `f|bonjour`. Le message sort de l'onglet du prof, ou y reste avec un faux texte, alors que le chat montre toujours le vrai contenu. Correctif proposé : trigger sur tout `UPDATE`, `plain_text` toujours recalculé, et pour qui n'est ni prof ni admin `NEW.is_flagged := OLD.is_flagged OR <détection>` avec `flag_reason` conservé ; ou `REVOKE UPDATE` puis `GRANT UPDATE (colonnes)`.
  - Mineurs : pas de test d'intégration de la borne de T21 ; fausses alertes de la liste (« tg », « traînée », « mongol », « macaque », « chienne », « boudin »).

## Correctif du maquillage (2026-11-25)

- Décision de David : corriger dans la PR 2. Question d'accès en miroir posée et acceptée : l'élève n'écrit plus `is_flagged`, `flag_reason` ni `plain_text` de ses messages.
- Migration `20261124230639` modifiée en place (pas encore en prod) : `process_message_content` joue sur tout `UPDATE` ; `plain_text` toujours recalculé ; détection rejouée à l'envoi et quand le contenu change ; hors prof, admin et serveur, la marque vient de la détection et une marque posée reste. `check_profanity_simple` : forme NFKD, accents et caractères invisibles retirés.
- Test `tests/integration/messages-marque-non-maquillable.test.ts` : 10 rouges avec l'ancienne migration (7 sur le maquillage, 3 sur les invisibles dans `chat-triggers.test.ts`), verts avec. Borne de T21 testée : chat de classe rendu, conversation à deux entre élèves non rendue (en classe comme hors classe).
- Deux attendus de mon premier jet étaient faux et ont été retirés : la suppression par le client de l'élève ou du prof est refusée par la RLS (connu, la route passe par le client service) ; le prof ne lit pas une conversation à deux entre élèves de sa classe.
- `code-reviewer` : aucun bloquant ; deux importants sur les tests (UPDATE d'élève sans vérification qu'il atteint la ligne ; cas « lecture seule + `plain_text` »), corrigés ; mineurs corrigés (marques de sens d'écriture, contre-exemples non marqués).
- `security-auditor` : **aucun finding bloquant ni important sur le correctif**. Essais sans résultat : upsert, contenu non TipTap, changement de conversation, DELETE puis ré-INSERT, jeton sans `sub`, `anon`, autre élève, fonctions SECURITY DEFINER (`report_message`, `review_report`, `soft_delete_message`). Rollback jugé juste. Antérieur au commit : question 3 du bloc ci-dessus, et les écarts à entrer au registre.
- Mesure en prod (lecture seule) : `conversations` à deux : 41, toutes entre deux élèves, 284 messages, 0 marqué ; chats de groupe : 7, 0 message.

## PR 3 : messages marqués des conversations à deux, supprimés compris (2026-11-25)

- **Question d'accès tranchée par David le 2026-11-25** (« Je te suis » sur les deux recommandations) : (1) élèves hors-classe **compris** ; (2) le prof lit le **texte** d'un message marqué supprimé. Annoncé avec la question : rien ne change pour l'admin ni pour les élèves.
- Migration `20261125063042` (additive) : fonction `get_flagged_messages_for_teacher(p_limit)`, `SECURITY DEFINER`, réservée au rôle `teacher` (élève, admin, service et visiteur refusés). Rend les messages `is_flagged` de ses conversations, des chats de groupe et des conversations à deux entre deux élèves, supprimés compris. Aucune policy touchée. Rollback en commentaire.
- Page : le prof passe par la fonction ; l'admin garde la lecture par la RLS (accès inchangés). Texte d'introduction de l'onglet selon le rôle.
- **Constat** : dans l'appli, l'élève n'a aucun bouton pour supprimer son message (`canDeleteMessage` : prof et admin seulement). La mention décidée (« supprimé par l'élève ») aurait été fausse presque toujours. La fonction rend `deleted_by_moderation` (suppression tracée dans `moderation_logs`) ; l'onglet écrit « supprimé par la modération » quand c'est tracé, « supprimé » seul sinon (`review_report` et `soft_delete_message` suppriment sans trace, pas de colonne `deleted_by`).
- **Constat** : l'admin reçoit « 403 Accès refusé » sur `/dashboard/teacher/moderation/gestion` (vu à l'écran avec le compte admin local). Il ne voit donc pas l'onglet du tout ; la branche « admin » du `load` (lecture par la RLS, inchangée) n'est atteinte par aucun écran. La question « l'admin voit-il la même chose que le prof ? » ne se pose pas tant que la page lui est fermée.
- Tests : `tests/integration/messages-marques-prof.test.ts`, 11 rouges sur 12 sans la migration (le 12e est la non-régression de la lecture directe) ; 16 verts avec, après les ajouts de la revue (conversation à trois ou à un, auteur sans compte, bornes de la limite, tri). Test de page réécrit (prof par la fonction, admin par la RLS), 10 verts.
- `code-reviewer` : aucun bloquant. Important : « supprimé par l'élève » non prouvé (corrigé, ci-dessus). Mineurs corrigés : commentaire orphelin, cas de tests manquants.
- `security-auditor` : **aucun finding bloquant** ; l'accès suit la décision, personne d'autre que le prof n'obtient rien. Vérifié : droits réels de la fonction, `search_path`, limite bornée, policies voisines (un élève n'ajoute pas de participant, ne passe pas une conversation en groupe, ne fabrique pas la mention « modération »), rendu échappé, journaux sans texte.
  - **Important, à trancher par David avant d'ouvrir la PR** : un élève peut quitter une conversation à deux par l'API (policy « Users can leave conversations »). La conversation n'a plus qu'un participant, et ses messages marqués sortent de l'onglet (rejoué sur la pile de test : 1 ligne avant, 0 après). Ce n'est pas un accès en trop, c'est une insulte qui se cache. Correctif proposé : ne plus exiger « exactement deux participants », mais « conversation non groupe, auteur élève, aucun participant qui ne soit pas un élève ». C'est une question d'accès : le prof lirait aussi le message marqué d'une conversation à deux dont un élève est parti.
  - Mineur, pour mémoire : un élève qui modifie son message garde la marque mais le texte lu par le prof est recalculé (relève de T30).
- Rendu vérifié à l'écran (iPhone, WebKit, compte prof local, trois messages fictifs retirés ensuite) : le message marqué, le message supprimé (« Message supprimé »), le message supprimé par la modération, et pas le message non marqué de la même conversation. `pnpm voir` : 0 erreur de console.
- **Élève parti, tranché par David le 2026-11-25 (« je te suis » sur le oui)** : le prof lit aussi le message marqué d'une conversation à deux dont un élève est parti. Règle : conversation non groupe, aucun participant restant qui ne soit pas un élève, et soit deux participants (auteur élève ou sans compte), soit moins de deux et auteur élève. Limite acceptée, écrite dans la migration : si un adulte quitte une conversation avec un élève, le message marqué de l'élève devient lisible par le prof, jamais ceux de l'adulte. Tests : 20 verts, dont le départ par l'API avec le client de l'élève.
- Ré-audit `security-auditor` du delta : **aucun bloquant**. Conversation à 0 participant créée par un élève : il ne peut ni y écrire ni y déplacer un message. Resserrement repris : la branche « deux participants » exige un auteur élève ou sans compte.
  - **À inscrire au registre après le merge (ancien, hors PR)** : un élève à accès complet peut changer `conversation_id` de son propre message (policy « Users can edit their own messages », `guard_read_only_actor` ne le bloque que pour les comptes en lecture seule) et le déplacer vers une conversation avec un adulte : la marque reste, le prof ne le voit plus. Rejoué sur la pile de test. Correctif proposé : refuser le changement de `conversation_id` hors prof et admin (question d'accès en miroir pour David).
- **Merge (#3132)** : CI rouge au premier passage (« Server Tests, shard 1/4 » : `lecture-en-echec.test.ts`, test voisin de la même page, ne connaissait pas la nouvelle fonction dans son décor ; je n'avais lancé qu'un des deux fichiers). Corrigé, CI verte, mergée. Migration non jouée en prod : deux migrations d'autres sessions en attente.

## PR 4 : un message ne change pas de conversation, écart T31 (2026-11-25)

- **Décisions de David (« go » sur les trois recommandations, 2026-11-25)** : (1) les migrations en attente partent ensemble en prod ; (2) T31 fermé : personne ne déplace un message par l'API (élève, prof, admin), le serveur garde la main ; (3) le 403 de l'admin sur la page de modération du prof reste tel quel, la branche « admin » du chargement de cette page est du code mort, à retirer à l'occasion.
- **Mise en prod des migrations** : `migration list --linked` montrait quatre migrations mergées en attente (`20261125063042` modération, `20261125064801` et `20261125065639` idees-1re-trigo, `20261125072915` idees-3e-trigonometrie, arrivée entre-temps). `db push --dry-run` refuse sans `--include-all` (deux migrations plus récentes déjà en prod), cas écrit dans la doc. `pnpm db:migrate --include-all` m'a été refusé par le garde-fou des écritures en prod : notification envoyée à David, qui la lance lui-même (`! pnpm db:migrate --include-all`).
- **Migration `20261125093026_message_conversation_non_modifiable.sql`** : trigger `guard_message_conversation_trg` BEFORE UPDATE sur `messages`, clause `WHEN (OLD.conversation_id IS DISTINCT FROM NEW.conversation_id)`, refus `42501` (« Un message ne change pas de conversation », sans accent) dès qu'un utilisateur est connecté. Additive, rollback en commentaire, aucune policy touchée. Fonction non `SECURITY DEFINER` : pas d'entrée dans la liste du garde-fou.
- **Tests** : `tests/integration/messages-conversation-non-modifiable.test.ts`, 8 tests ; **rouges sans la migration** (les trois déplacements de l'élève passaient). Constat en écrivant les tests : un élève ne supprime pas son message par un UPDATE direct de `deleted_at` (refus de la RLS, la ligne modifiée n'est plus lisible par lui) ; cas retiré du fichier.
- **Revues** : `code-reviewer` rien d'important (cas de l'admin ajouté, commentaire de la migration précisé) ; `security-auditor` **aucun finding bloquant**, trois constats hors périmètre à inscrire au registre :
  1. **`created_at` modifiable par l'auteur** (policy « Users can edit their own messages », sans liste de colonnes) : un élève qui antidate son message marqué le fait passer derrière la limite de l'onglet du prof, et la purge de conservation du dimanche l'efface pour de bon ;
  2. **texte réécrit** : l'élève remplace l'insulte par un texte propre, la marque reste mais le prof lit le texte propre, l'ancien texte n'est gardé nulle part ;
  3. **`conversation_participants.conversation_id` modifiable** (policy « Users can update their own participation », sans liste de colonnes) : un élève qui connaît l'identifiant d'une conversation peut y déplacer sa participation et en lire les messages. **Affirmé par l'auditeur à la lecture des policies, pas encore prouvé par un test.**
- **Sonde du 2026-11-25 (pile de test, fichier jetable retiré)** : constat 3 **prouvé** : un élève déplace sa participation vers une conversation entre deux autres élèves et lit leur message. Constat 1 non reproduit : l'UPDATE de `created_at` par l'élève n'a rendu aucune ligne (T30, déjà au registre, dit le contraire : à reprouver). Registre : T32 (participation), T33 (texte réécrit), M59 (branche admin morte).
- **Merge (#3140)** : CI verte au premier passage, mergée par `pnpm pr:merger`. Les quatre migrations précédentes ont été jouées par David ; les journaux `idees-1re-trigo` et `idees-3e-trigonometrie` sont prévenus. `20261125093026` reste à jouer.

## PR 5 : une participation ne change pas de conversation, écart T32 (2026-11-25)

- **Décision de David (2026-11-25, « je te suis »)** : personne ne change la conversation d'une participation par l'API (élève, prof, admin), le serveur garde la main.
- **Migration `20261125114503_participation_conversation_non_modifiable.sql`** : trigger `guard_participation_conversation_trg` BEFORE UPDATE sur `conversation_participants`, clause `WHEN (OLD.conversation_id IS DISTINCT FROM NEW.conversation_id)`, refus `42501` (« Une participation ne change pas de conversation », sans accent) dès qu'un utilisateur est connecté. Même forme que T31. Additive, rollback en commentaire, aucune policy touchée. Fonction non `SECURITY DEFINER`. `database.ts` inchangé (`pnpm db:types:verifier` vert).
- **Tests** : `tests/integration/participation-conversation-non-modifiable.test.ts`, 8 tests ; **rouges sans la migration** (l'élève, le prof et l'admin déplaçaient leur participation). Non-régression : archive, sourdine, `mark_conversation_read`, même conversation renvoyée, client service.
- **Revues** : `code-reviewer` rien de bloquant ni d'important, deux points mineurs corrigés (commentaire de la migration, test qui dépendait de l'ordre). `security-auditor` **aucun finding bloquant** : pas de contournement par une autre colonne, par DELETE puis INSERT (un élève ne s'insère pas lui-même : deux policies INSERT, service et prof créateur d'un groupe), par une fonction `SECURITY DEFINER` (`create_1on1_chat`, `mark_conversation_read`, `sync_class_chat_membership`, `create_class_chat_room` lues), ni par `anon`. Remarque hors diff, plausible, non prouvée : le motif « policy UPDATE sans liste de colonnes » peut exister sur d'autres tables d'élèves.
- **Doc** : `docs/systeme/messagerie-et-moderation.md`, ligne ajoutée sous celle de T31.
- **Merge (#3143)** : CI verte au premier passage, mergée par `pnpm pr:merger`. `20261125114503` reste à jouer en prod (David).
- **Migration en prod** : `20261125114503` jouée par David le 2026-11-25 ; trigger actif, fonction non `SECURITY DEFINER`, `search_path` fixé (lecture seule).
