---
title: Écarts graves de modération et de données d'élèves (T20, T25, T27, puis T21, T22) — journal
date: 2026-11-24
status: PR 1 (T20, T25, T27) mergée (#3115) ; PR 2 (T21, T22) en cours, T21 codé, T22 en attente de la relecture de David
---

## Reprendre ici

_Mis à jour le 2026-11-25, après #3115 (PR 2 non ouverte)._

- **État** : PR 1 mergée (#3115). **PR 2 prête, NON ouverte**, branche `fix/ecarts-moderation` (2 commits, poussée, en retard de 15 commits sur `main`). T21 : onglet « Messages marqués » (lecture par la RLS de `messages`, aucune migration). T22 : migration `20261124230639_marquage_messages_liste_de_mots.sql` (liste de ~125 mots, mot entier, sans casse ni accents ni « s » final ; `process_message_content` : commentaire seul, C32). Liste et question d'accès **validées par David le 2026-11-25**. Tests : 8 serveur + 48 intégration verts (18 rouges sans la migration), typecheck 0, `db:types:verifier` vert, vu à l'écran (iPhone). Doc `messagerie-et-moderation.md` mise à jour.
- **Prochaine action** : (1) les deux revues sont reçues (aucun bloquant, voir « Revues de la PR 2 ») : **ne pas les relancer**, sauf sur le correctif du point important s'il entre dans la PR ; (2) selon la réponse de David : corriger dans la migration le maquillage par l'élève (test d'intégration rouge d'abord, client élève authentifié), ajouter le test d'intégration de la borne de T21, traiter l'Unicode décomposé ou noter la limite ; (3) `git merge origin/main` dans le worktree ; (4) `pnpm check:migrations --pr <n>` après ouverture ; (5) barrer T21, T22, C32 au registre (`pnpm ecarts rejouer`, preuves à la main pour T22 et C32 : barrer à la main avec la date) ; (6) ouvrir la PR, CI, `pnpm pr:merger <n>`, puis `db:migrate` depuis la branche mergée (migration additive, rollback en commentaire).
- **En attente de David** : (1) « tg » marque aussi « tg x » (ancienne notation de la tangente) : le garder ou le retirer ? (recommandé : retirer) ; (2) un élève peut aujourd'hui retirer la marque de son message et réécrire le texte que lit le prof : le corriger dans cette PR (recommandé) ou dans une suivante ? Question d'accès en miroir : l'élève ne pourrait plus écrire `is_flagged`, `flag_reason` ni `plain_text` de ses messages.
- **Pièges en cours** : `db:migrate` autonome seulement si les 4 conditions (tests rouges sans la migration : fait ; `security-auditor` sans finding bloquant : à refaire). Écarts à entrer au registre depuis le dépôt principal : onglet sans lien direct vers la conversation, sans état « traité ». Réponses de la page à cocher : aucune enregistrée (David a validé en conversation). T24 hors lot.
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
