---
name: reprendre
description: Reprendre un chantier après un /clear ou dans une nouvelle session, en ne lisant que son bloc « Reprendre ici ». Utiliser quand David tape /reprendre, « reprends le chantier X », « reprends » ou « on en était où ? ».
model: sonnet
---

# Reprendre un chantier

But : repartir d'une session vide **sans relire tout le journal**. On lit le bloc « Reprendre ici » du journal, rien d'autre au départ.

## 1. Trouver le chantier

Le nom du chantier = le `<sujet>` de `docs/wip/<sujet>-progress.md` = celui du worktree `ubumaths-wt-<sujet>`.

1. **Argument donné** (`/reprendre atelier-geometrie`) → `docs/wip/<argument>-progress.md`. Pas de fichier exact → chercher un nom proche (`ls docs/wip/*-progress.md`) ; un seul candidat → le prendre en le disant.
2. **Sans argument, dans un worktree** (`pwd` = `…/ubumaths-wt-<sujet>`) → `docs/wip/<sujet>-progress.md` ; à défaut, d'après le nom de la branche (`git branch --show-current`, partie après `type/`).
3. **Sinon, ou si c'est ambigu** → lister les chantiers (dépôt principal ET worktrees : un chantier neuf n'a son journal que sur sa branche) et **demander à David**, sans rien lire d'autre :
   ```bash
   git worktree list --porcelain | sed -n 's/^worktree //p' | while read -r d; do ls "$d/docs/wip" 2>/dev/null | grep -- '-progress\.md$' | while read -r n; do echo "$(git -C "$d" log -1 --format=%cs -- "docs/wip/$n") ${n%-progress.md}"; done; done | sort -r | awk '!vu[$2]++' | head -15
   ```

**Quel exemplaire du journal lire : le plus récent, jamais le premier trouvé.** Un chantier a souvent **plusieurs worktrees** (une PR = un worktree : `ubumaths-wt-<sujet>`, `ubumaths-wt-<sujet>-<suite>`…) et chacun a sa copie du journal, plus celle de `main`. Elles divergent : le bloc écrit avant un `/clear` vit dans le worktree où la session travaillait, pas forcément celui qui porte le nom exact (2026-11-22 : bloc lu dans `ubumaths-wt-idees-format`, après #2987, alors que le bon était dans `ubumaths-wt-idees-format-revue-2de` — déploiement demandé par David oublié). Donc lister **toutes** les copies, la plus récente en tête :

```bash
s=<sujet>; for d in "$PWD" $(git worktree list --porcelain | sed -n 's/^worktree //p' | grep -E "/ubumaths-wt-$s(-[^/]*)?$"); do f="$d/docs/wip/$s-progress.md"; [ -f "$f" ] || continue; t=$(git -C "$d" log -1 --format=%ct -- "docs/wip/$s-progress.md"); [ -n "$(git -C "$d" status --porcelain -- "docs/wip/$s-progress.md")" ] && t=$(stat -f %m "$f"); echo "$t $(date -r "${t:-0}" '+%F %R') $f | $(grep -m1 '^_Mis à jour' "$f")"; done | sort -rn | cut -d' ' -f2-
```

- `f` = la **première ligne** (copie modifiée non commitée : sa date de fichier compte) ; `wt` = son worktree (vide si c'est le dépôt principal).
- Plusieurs copies → **dire à David laquelle est lue**, et si une autre a un « Mis à jour » plus récent ou différent, le signaler au lieu de choisir en silence.

## 2. Lire le bloc, et seulement lui

```bash
# f = l'exemplaire choisi à l'étape 1 (worktree d'abord)
sed -n '1,/^---$/p' "$f" | head -8                        # en-tête (status:)
awk '/^## Reprendre ici/{on=1;print;next} on&&/^## /{exit} on' "$f"
```

Pas de bloc « Reprendre ici » (journal antérieur à la règle du 2026-10-19) → lire le journal **une fois**, écrire le bloc en tête (≤ 15 lignes, gabarit dans `CLAUDE.md` § Worktrees), le commiter là où il a été lu (dépôt principal : commit de doc direct sur `main` ; worktree : sur sa branche, `git -C "$wt"`), puis continuer.

## 3. Vérifier que le bloc dit vrai

Trois commandes, pas plus :

```bash
git worktree list | grep -i <sujet>
git -C "${wt:-.}" status -sb | head -3                   # le worktree, pas le dépôt principal
gh pr list --search "head:<branche>" --state all -L 3 --json number,state,title
```

Une PR que le bloc dit ouverte est `MERGED` → le bloc est en retard : le signaler et le mettre à jour.

⛔ **Bloc contredit par l'état réel = mauvais exemplaire probable, s'arrêter.** Il annonce « aucun worktree » alors qu'il y en a, nomme un worktree absent, ou s'arrête avant une PR du chantier déjà mergée (`git log origin/main`) → refaire la liste des copies ci-dessus et chercher le bloc plus récent ; à défaut, le dire à David. **Ne jamais reconstruire soi-même la prochaine action** : un bloc écrit avant un `/clear` porte souvent une consigne de David (déploiement, explication) qu'aucune déduction ne retrouve.

## 4. Rendre compte à David, en 5 lignes

- **Chantier** `<sujet>` · worktree · branche · **exemplaire du journal lu** (le travail se fait dans le worktree, par chemins absolus : le shell revient au dépôt principal après chaque commande)
- **État**
- **Prochaine action** (celle du bloc)
- **En attente de David** (s'il y a lieu : le reposer tel quel)
- Si la session ne porte pas encore ce nom : « Pour la nommer : `/rename <sujet>` »

Puis **toujours** attendre son go, même si le bloc dit qu'une action validée était en cours : la skill tourne en Sonnet (`model: sonnet`) jusqu'au message suivant de David, et le travail reprend ensuite sur le modèle de la session.

Ne lire d'autres sections du journal, ou d'autres docs, que lorsque la prochaine action l'exige.
