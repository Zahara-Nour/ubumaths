---
title: Écarts graves de modération et de données d'élèves (T20, T25, T27, puis T21, T22) — journal
date: 2026-11-24
status: PR 1 (T20, T25, T27) prête, push en échec ; PR 2 (T21, T22) à faire
---

## Reprendre ici

_Mis à jour le 2026-11-24, PR 1 prête mais non poussée._

- **État** : PR 1 (T20, T25, T27) commitée sur la branche, revues `code-reviewer` + `security-auditor` faites et corrigées, rendu vu à l'écran, `origin/main` mergé dedans. **Le push a échoué** (`git@github.com: Permission denied (publickey)`, alors que le `fetch` venait de passer) : rien n'est sur GitHub, aucune PR ouverte. Chantier parent : [ecarts-a-trier](ecarts-a-trier-progress.md).
- **Prochaine action** : quand David a rétabli l'accès SSH : `git push -u origin fix/ecarts-moderation`, ouvrir la PR, CI verte → `pnpm pr:merger <n>` (aucune migration) ; puis, sur `main` : barrer T20, T25, T27 au registre (la preuve de T25 grepe « storage » dans les deux routes : la remplacer par le grep de `deleteBugReportWithScreenshot` avant `pnpm ecarts rejouer --barrer`), entrer les quatre écarts listés au § « Revues de la PR 1 », mettre à jour le bloc d'`ecarts-a-trier`. Ensuite **PR 2** : T21 (onglet « Messages marqués », option a : seulement les conversations que le prof peut déjà ouvrir) et T22 (liste de mots proposée sur une page à cocher, relue par David, puis migration).
- **En attente de David** : l'accès SSH à GitHub (push refusé) ; PR 2 : relecture de la liste de mots (page à cocher à lui envoyer).
- **Pièges en cours** : T24 hors lot (suspendu avec le tuteur, D21) ; le faux client `createWriteVerdictSupabase` rend `EMPTY` à `maybeSingle` si la table ne donne que `awaited` ; un `catch` large du lot avale un import manquant (« Erreur inattendue ») ; pour voir l'alerte de T20 à l'écran, forcer `reportsLoadFailed: true` le temps de la capture puis restaurer.
- **Worktree / branche** : `ubumaths-wt-ecarts-moderation` · `fix/ecarts-moderation`.

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
