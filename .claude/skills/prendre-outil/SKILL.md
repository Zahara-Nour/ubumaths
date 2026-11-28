---
name: prendre-outil
description: Prendre un lot d'outils manquants (docs/wip/outils-lots.md), le réserver s'il ne l'est pas, ouvrir son chantier et le mener outil par outil (phase 0, tests, PR). Utiliser quand David tape /prendre-outil, « prends un lot d'outils », « prends le lot <nom> », ou quand `pnpm outils lancer` ouvre la session.
---

# Prendre un lot d'outils manquants

But : plusieurs sessions finissent en parallèle les outils « À faire » de
[`docs/wip/outils-manquants.md`](../../../docs/wip/outils-manquants.md), **sans prendre le même lot ni
toucher le même module**. [`docs/wip/outils-lots.md`](../../../docs/wip/outils-lots.md) fait foi :
lots, ordre, qui a pris quoi, règles. Le lire **en entier** avant tout (il est court).

Argument : `/prendre-outil <lot>` (lancé par `pnpm outils lancer`, ou David choisit) ou
`/prendre-outil` (la skill choisit).

## 1. Réservation

Depuis le dépôt principal : `cd /Users/david/Coding/js/ubumaths && git pull --rebase`, puis lire
la ligne du lot dans `docs/wip/outils-lots.md`.

- « Pris par » = `outil-<lot> (date)` : **déjà réservé** (par `pnpm outils lancer`, ou par cette
  session avant un `/clear`) → passer à l'étape 2.
- Vide : `pnpm outils reserver <lot>` (sans argument : `pnpm outils lancer --essai` montre le lot
  que le script prendrait, puis `pnpm outils reserver <ce lot>`). Refus du script → le dire à
  David et s'arrêter, ne pas en prendre un autre à sa place.
- Pris par une autre session ou `fait` → le dire à David et s'arrêter.

La réservation n'existe que **poussée** : ne rien commencer avant.

## 2. Ouvrir le chantier

- Sujet `outil-<lot>` · worktree `../ubumaths-wt-outil-<lot>` · branche `feat/outil-<lot>`. Si
  `pnpm outils lancer` a ouvert la session, le worktree existe déjà (dépendances installées) ;
  sinon le créer comme dit `CLAUDE.md` § Worktrees.
- Journal `docs/wip/outil-<lot>-progress.md`, avec son bloc « Reprendre ici », commité au premier
  commit de la branche.
- Lire dans `outils-manquants.md` § 1 les lignes des outils du lot, et elles seules, puis le
  journal cité dans « Où c'est écrit » (la décision de David y est souvent).

Premier message à David, en cinq lignes : lot pris · ses outils (numéros) · worktree et branche ·
par quel outil la session commence · « Pour nommer la session : `/rename outil-<lot>` » (inutile si
la session a été lancée par le script, elle porte déjà ce nom).

## 3. Mener un outil

Les outils d'un lot se font **dans l'ordre de la colonne « Outils »**, **une PR par outil**.

1. **Vérifier que l'outil manque encore** dans le code (une ligne peut être périmée) : s'il existe,
   le dire, passer sa ligne au § 4 « Livré » et prendre le suivant.
2. **Phase 0** : comportements en français, mots simples, un exemple d'élève (nominal, limite,
   erreur), la syntaxe d'auteur proposée s'il y en a une ; puis `pnpm prevenir question` et
   **attendre la réponse de David**. Rien de codé avant.
3. Tests rouges → code → verts ; Definition of Done de `CLAUDE.md` (rendu vérifié à l'écran par la
   session, doc à jour dans la même PR, revue selon le risque).
4. PR → `pnpm pr:merger <n>`. Après le merge : ligne de l'outil passée au § 4 « Livré »
   d'`outils-manquants.md` avec la PR (commit doc direct sur `main`, `-- <ses fichiers>`), bloc
   « Reprendre ici » à jour, puis « Bon moment pour `/clear`. Pour reprendre :
   **`/reprendre outil-<lot>`** ».

**Les modèles de questions qui se servent de l'outil ne font pas partie du lot.** Un outil qui
touche le module d'un autre lot en cours : l'écrire dans « Notes » d'`outils-lots.md` et le dire à
David avant d'y toucher.

## 4. Clore le lot

Quand tous ses outils sont livrés, ou explicitement laissés (dire lesquels et pourquoi dans
« Notes ») :

1. écrire `fait (#PR, AAAA-MM-JJ)` dans « Pris par » et mettre à jour la ligne `status:` ;
2. archiver le journal dans `docs/archive/wip/` ;
3. commit de doc direct sur `main`, `-- <ses fichiers>`, poussé ;
4. dire à David : « Lot `<lot>` fini. Bon moment pour `/clear`, puis `pnpm outils lancer` pour le
   suivant. »

Une session qui s'arrête avant la fin du lot ne libère pas la réservation : journal à jour, le lot
se reprend par `/reprendre outil-<lot>`. Lot abandonné pour de bon → vider « Pris par » et écrire
dans « Notes » ce qui a été fait.
