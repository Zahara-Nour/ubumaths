---
title: Écarts graves de modération et de données d'élèves (T20, T25, T27, puis T21, T22) — journal
date: 2026-11-24
status: PR 1 (T20, T25, T27) mergée (#3115) ; PR 2 (T21, T22) en cours, T21 codé, T22 en attente de la relecture de David
---

## Reprendre ici

_Mis à jour le 2026-11-24, après #3115 (PR 2 en cours, non ouverte)._

- **État** : PR 1 mergée (#3115). **PR 2 en cours sur `fix/ecarts-moderation`** : T21 codé et commité (onglet « Messages marqués » de `/dashboard/teacher/moderation/gestion`, lecture par la RLS de `messages`, aucune migration), tests verts, typecheck à 0, vu à l'écran (`pnpm voir`, iPhone, compte prof). T22 : page à cocher envoyée à David (https://claude.ai/artifact/T1AgYjEHmeV8jGhcmzFiPo, réponses dans `relecture/reponses`, à lire avec `ArtifactData`). Chantier parent : [ecarts-a-trier](ecarts-a-trier-progress.md).
- **Prochaine action** : quand David a relu la liste ET répondu à la question d'accès, écrire T22 (migration additive : `check_profanity_simple` redéfinie, mot entier, sans majuscules ni accents ni pluriel ; tests d'intégration rouges d'abord dans `tests/integration/database/chat-triggers.test.ts`), puis revue `code-reviewer` + `security-auditor`, une seule PR pour T21 + T22, barrer T21 et T22 au registre.
- **En attente de David** : (1) relecture de la liste de mots sur la page à cocher ; (2) question d'accès de la migration T22 : personne ne lit rien de nouveau, mais davantage de messages porteront la mention « signalé automatiquement » (vue de tous dans la conversation) et arriveront dans l'onglet du prof : d'accord ?
- **Pièges en cours** : T24 hors lot ; la PR n'est PAS ouverte (une seule revue, un seul push) ; `pnpm voir` ne clique pas : pour voir l'onglet, mettre `value="flagged"` le temps de la capture ; pas de lien direct vers une conversation du chat (l'onglet renvoie à `/dashboard/chat`) ; pas d'état « traité » pour un message marqué (liste des 100 plus récents).
- **Worktree / branche** : `ubumaths-wt-ecarts-moderation` / `fix/ecarts-moderation`.

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
