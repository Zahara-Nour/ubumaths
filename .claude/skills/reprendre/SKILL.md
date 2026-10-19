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
3. **Sinon, ou si c'est ambigu** → lister les chantiers et **demander à David**, sans rien lire d'autre :
   ```bash
   for f in docs/wip/*-progress.md; do echo "$(git log -1 --format=%cs -- "$f") $(basename "$f" -progress.md) — $(grep -m1 '^status:' "$f" | cut -c9-120)"; done | sort -r | head -15
   ```

## 2. Lire le bloc, et seulement lui

```bash
f=docs/wip/<sujet>-progress.md
sed -n '1,/^---$/p' "$f" | head -8                        # en-tête (status:)
awk '/^## Reprendre ici/{on=1;print;next} on&&/^## /{exit} on' "$f"
```

Pas de bloc « Reprendre ici » (journal antérieur à la règle du 2026-10-19) → lire le journal **une fois**, écrire le bloc en tête (≤ 15 lignes, gabarit dans `CLAUDE.md` § Worktrees), le commiter (dépôt principal : commit de doc direct sur `main` ; worktree : sur sa branche), puis continuer.

## 3. Vérifier que le bloc dit vrai

Trois commandes, pas plus :

```bash
git worktree list | grep -i <sujet>
git status -sb | head -3
gh pr list --search "head:<branche>" --state all -L 3 --json number,state,title
```

Une PR que le bloc dit ouverte est `MERGED` → le bloc est en retard : le signaler et le mettre à jour.

## 4. Rendre compte à David, en 5 lignes

- **Chantier** `<sujet>` · worktree · branche
- **État**
- **Prochaine action** (celle du bloc)
- **En attente de David** (s'il y a lieu : le reposer tel quel)
- Si la session ne porte pas encore ce nom : « Pour la nommer : `/rename <sujet>` »

Puis **toujours** attendre son go, même si le bloc dit qu'une action validée était en cours : la skill tourne en Sonnet (`model: sonnet`) jusqu'au message suivant de David, et le travail reprend ensuite sur le modèle de la session.

Ne lire d'autres sections du journal, ou d'autres docs, que lorsque la prochaine action l'exige.
