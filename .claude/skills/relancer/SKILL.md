---
name: relancer
description: Préparer un /clear sans rien perdre — journal du chantier à jour et commité, travail commité et poussé, serveurs et tâches de fond arrêtés — puis donner à David les deux commandes à taper (/clear, /reprendre <sujet>). Utiliser quand David tape /relancer, demande de « préparer le /clear », de « relancer la session », ou quand une garde de session longue l'exige.
model: sonnet
---

# Relancer une session

But : que `/clear` puis `/reprendre <sujet>` repartent **exactement** d'ici. Tout ce qui n'est
ni commité ni écrit dans le bloc « Reprendre ici » est perdu au `/clear`.

Je ne peux pas taper `/clear` ni `/reprendre` moi-même (commandes de l'interface, pas des outils) :
je prépare tout, puis je donne les deux lignes à David.

## 1. Le chantier de la session

Le `<sujet>` = celui du journal `docs/wip/<sujet>-progress.md` sur lequel **cette session** a
travaillé (cité dans ses commandes, ou nommé par `/reprendre` en début de session). Argument donné
(`/relancer questions-cm2`) → celui-là. Doute, ou plusieurs chantiers → demander, ne rien deviner.

Exemplaire du journal à mettre à jour : celui du worktree s'il existe (chantier en cours sur sa
branche), sinon celui de `main` — même règle que `reprendre` :

```bash
wt=$(git worktree list | awk -v s="ubumaths-wt-<sujet>" '$1 ~ s"$" {print $1}')
f=${wt:-.}/docs/wip/<sujet>-progress.md
```

## 2. Le travail : commité, poussé, rien d'orphelin

Dans cet ordre, en montrant la sortie de chaque commande :

1. **Worktree** (s'il existe) : `git -C "$wt" status -sb`. Fichiers modifiés ou non suivis **de
   ce chantier** → les commiter sur sa branche (jamais `rm`, jamais `git add -A`) ; commits non
   poussés → `git -C "$wt" push`.
2. **PR** : `gh pr list --search "head:<branche>" --state all -L 3 --json number,state,title`.
   Une PR ouverte reste ouverte : son numéro et l'état de sa CI vont dans le bloc. Une PR
   `MERGED` dont le worktree existe encore → nettoyage (`CLAUDE.md` § Worktrees) avant de continuer.
3. **Dépôt principal** : `git status -sb` et `git log origin/main..main --format='%h %an %s'`.
   - mes fichiers modifiés (doc) → commit direct sur `main` (test « docs pur » de `CLAUDE.md`) ;
   - commits en avance **d'une autre session** → ne pas les pousser à sa place : attendre qu'elle
     pousse (boucle `until` en arrière-plan sur `git fetch`), puis pousser les miens.
4. **Ce qui tourne** : serveurs lancés par la session (`lsof -iTCP -sTCP:LISTEN -P | grep -E
   ':51(7[6-9]|8[0-9])'`, kill ciblé sur **mes** ports seulement, jamais 5173 ni
   `pnpm kill:servers`) ; tâches de fond encore utiles (surveillance de CI) → les nommer dans le
   bloc, elles meurent avec la session.

Une étape impossible (push refusé, hook en échec, conflit) → **stop**, le dire à David, ne pas
proposer le `/clear`.

## 3. Le bloc « Reprendre ici »

Le relire, puis le réécrire s'il ment, au gabarit de `CLAUDE.md` § Worktrees (≤ 15 lignes) :

- `_Mis à jour le AAAA-MM-JJ, après #NNNN …_` — date du jour, dernière PR **vérifiée** (`gh`) ;
- **État** : ce qui est fait et vérifié (merges, ce qui est en prod / en base, ids utiles) ;
- **Prochaine action** : la toute prochaine, assez précise pour être faite sans relire l'historique ;
- **En attente de David** : chaque commande ou décision qu'il doit donner, telle quelle ;
- **Pièges en cours** : ceux découverts dans cette session et encore vrais ;
- **Worktree / branche** : chemin et branche, ou « aucun ».

Vérifier : **un seul** titre `## Reprendre ici` (un doublon s'est déjà glissé), aucun numéro de PR
deviné, rien de la conversation qui ne soit dans le bloc ou dans l'historique dessous.

Commiter le journal là où il vit (`git -C "$wt"` sur la branche, ou commit direct sur `main`),
pousser, et lire la sortie du commit (commitlint refuse en silence un sujet en majuscule).

## 4. Contrôle final, puis la main à David

```bash
git status -sb | head -3                 # dépôt principal : propre (hors fichiers d'autres sessions, à nommer)
git log origin/main..main --oneline      # vide
[ -n "$wt" ] && git -C "$wt" status -sb | head -3
```

Puis, en 3 lignes au plus :

- ce qui a été commité / poussé / arrêté ;
- les lignes à taper, **exactement** :

  ```
  /clear
  /reprendre <sujet>
  ```

- si la session ne porte pas le nom du chantier après le `/clear` : `/rename <sujet>`.
