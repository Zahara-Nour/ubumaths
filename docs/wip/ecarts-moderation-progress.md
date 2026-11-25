---
title: Écarts graves de modération et de données d'élèves (T20, T25, T27, puis T21, T22) — journal
date: 2026-11-24
status: PR 1 (T20, T25, T27) mergée (#3115) ; PR 2 (T21, T22) en cours, T21 codé, T22 en attente de la relecture de David
---

## Reprendre ici

_Mis à jour le 2026-11-25 (3), après #3115 (PR 2 en cours d'ouverture)._

- **État** : PR 1 mergée (#3115). PR 2 (T21, T22, C32, correctif du maquillage) : code, tests, revues et doc faits, `origin/main` fusionné ; reste typecheck, PR, CI, merge, `db:migrate`.
- **Prochaine action** : `pnpm check:incremental`, ouvrir la PR, `pnpm check:migrations --pr <n>`, CI, `pnpm pr:merger <n>`, `db:migrate` depuis la branche mergée (les 4 conditions sont réunies ; `migration list --linked` avant : une autre migration en attente → stop), barrer T22 et C32 au registre (preuves à la main), mettre ce bloc à jour.
- **En attente de David** (3 questions, aucune ne bloque la PR) :
  1. « tg » marque aussi « tg x » (ancienne notation de la tangente) : le garder ou le retirer ? (recommandé : retirer). **Sans réponse : il reste dans la liste.**
  2. **L'onglet « Messages marqués » sera vide en prod** : le prof ne lit aucune conversation à deux entre élèves, et en prod les 284 messages du chat sont tous dans 41 conversations à deux entre élèves (7 chats de classe, 0 message). Faut-il que le prof lise les messages marqués des conversations à deux entre ses élèves ? C'est un accès nouveau, donc à David. **T21 n'est pas barré au registre tant que ce n'est pas tranché.**
  3. Un élève peut encore cacher son message marqué en le supprimant par l'API (`soft_delete_message`, que l'appli n'appelle pas) : l'onglet ne montre pas les messages supprimés. Réserver cette fonction au prof et au serveur, ou montrer aussi les messages marqués supprimés ?
- **Pièges en cours** : la pile de test rejoue seule une migration modifiée. Écarts à entrer au registre depuis le dépôt principal : onglet sans lien direct vers la conversation, sans état « traité » ; l'élève réécrit encore `edited_at`, `created_at`, `is_reported` de ses messages et modifie d'anciens messages alors qu'il est restreint ; aucune borne de taille sur `content`. T24 hors lot.
- **Worktree / branche** : `/Users/david/Coding/js/ubumaths-wt-ecarts-moderation` / `fix/ecarts-moderation`.

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
