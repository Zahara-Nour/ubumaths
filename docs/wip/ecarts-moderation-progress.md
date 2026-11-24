---
title: Écarts graves de modération et de données d'élèves (T20, T25, T27, puis T21, T22) — journal
date: 2026-11-24
status: PR 1 (T20, T25, T27) en cours ; PR 2 (T21, T22) à faire
---

## Reprendre ici

_Mis à jour le 2026-11-24, avant la PR 1._

- **État** : PR 1 écrite (T20, T25, T27), tests verts ; chantier parent : [ecarts-a-trier](ecarts-a-trier-progress.md).
- **Prochaine action** : merger la PR 1, barrer T20, T25, T27 au registre (la preuve de T25 grepe « storage » dans les deux routes : la remplacer par le grep de `deleteBugReportWithScreenshot` avant de barrer) ; puis **PR 2** : T21 (onglet « Messages marqués », option a) et T22 (liste de mots proposée sur une page à cocher, relue par David, puis migration).
- **En attente de David** : rien pour la PR 1 ; PR 2 : relecture de la liste de mots (page à cocher à lui envoyer).
- **Pièges en cours** : T24 hors lot (suspendu avec le tuteur, D21) ; le faux client `createWriteVerdictSupabase` rend `EMPTY` à `maybeSingle` si la table ne donne que `awaited`.
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
