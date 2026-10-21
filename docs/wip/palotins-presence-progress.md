# Palotin : présence notée partout, retour fêté au tableau de bord — journal

> Branche `feat/palotins-presence`, worktree `../ubumaths-wt-palotins-presence`. Démarré le 2026-10-21.
> Suite de [palotins-absence-progress.md](palotins-absence-progress.md) (#1584, #1588 : « tu m'as manqué » après 21 jours).

## Reprendre ici

_Mis à jour le 2026-10-21, au démarrage._

- **État** : phase 0 validée par David ; PR 1 (donnée : colonne `welcome_back_on`) en cours.
- **Prochaine action** : test d'intégration rouge sans la migration → migration locale → vert → `security-auditor` → PR 1 → merge → `db:migrate` → `db:types` → PR 2 (code).
- **En attente de David** : rien.
- **Pièges en cours** : la remise à zéro de la Constance reste dans le `load` du layout élève (un survol sans clic n'y fait perdre que la réplique, accepté).
- **Worktree / branche** : `../ubumaths-wt-palotins-presence` · `feat/palotins-presence`.

## Le problème (2026-10-21)

Le passage n'était noté que par le `load` du layout `/dashboard/student/*` :

1. **Préchargement au survol** (`app.html`, barre latérale du tableau de bord en `hover`) : survoler
   « Mes cours » sans cliquer enregistrait le passage et consommait le « tu m'as manqué » pour de bon.
2. **Élève qui travaille par un lien** (cours partagé, Automaths…) sans repasser par
   `/dashboard/student` : compté absent, il recevait un « tu m'as manqué » à tort.

## Décisions de David (2026-10-21)

1. **Présence = toute page vue** par un élève connecté (chargement de page ou navigation interne,
   préchargement compris), **hors `/api/*`** (un onglet ouvert qui interroge seul ne doit pas compter).
   Rôle élève seulement.
2. **Retour fêté au plus 7 jours** après le retour ; au-delà, oublié sans rien dire.
3. **Question d'accès** : personne de plus. Colonne dans `student_last_visits` (serveur seul) ; le
   navigateur ne reçoit que « retour à fêter oui/non ».

## Conception

- **Présence** : `userProfileHandle` (`src/hooks.server.ts`), élève, hors `/api/*`, au plus une
  fois par jour (cookie du jour lié à l'élève : deux élèves sur un même poste au collège).
  `record_student_visit` inchangée ; si l'écart ≥ 21 jours (`isLongAbsence`), le serveur écrit
  `welcome_back_on = aujourd'hui`.
- **Bulle** : le `load` du layout élève LIT `welcome_back_on` (aucune écriture : préchargement sans
  effet) → `longAbsence` vrai si le retour date de 7 jours au plus. Le widget, après avoir montré
  la bulle, l'acquitte (`POST`, efface `welcome_back_on`).
- **Export RGPD** (`/api/account/export`) : ajouter `welcome_back_on` à côté de `dernier_passage`.

## Découpage

- **PR 1 (donnée)** : migration `20261021230000_palotin_retour_a_feter.sql` (ADD COLUMN), test
  d'intégration `tests/integration/palotin-retour-a-feter.test.ts`.
- **PR 2 (code)**, après `db:migrate` + `db:types` : présence dans le hook, lecture au layout,
  route d'acquittement, widget, export RGPD, doc `docs/systeme/buddy-palotins.md`.
  Revue : `code-reviewer` + `security-auditor` (hook sur toutes les requêtes, données d'élèves).

## Historique

- 2026-10-21 : phase 0 validée ; worktree créé ; migration et test d'intégration écrits.
