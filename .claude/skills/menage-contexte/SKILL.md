---
name: menage-contexte
description: Faire le ménage dans CLAUDE.md et dans la mémoire (MEMORY.md, archives.md, fichiers de mémoire) en même temps, pour repérer aussi les doublons entre les deux. Utiliser quand David tape /menage-contexte, demande de « faire le ménage » dans CLAUDE.md ou la mémoire, d'alléger le contexte, ou de trier les projets clos de l'index mémoire.
model: sonnet
---

# Ménage de CLAUDE.md et de la mémoire

But : réduire ce qui est chargé à chaque session **sans perdre une règle ni une leçon**. Les deux fichiers sont toujours traités **ensemble** : c'est le seul moyen de voir les doublons entre eux.

**La skill repère et propose ; David tranche ; on n'applique que ce qu'il a validé.** Elle ne décide jamais seule qu'un projet est clos, qu'une règle est en trop ou qu'une mémoire est fausse.

| Fichier | Plafond | Où il vit | Livraison |
| --- | --- | --- | --- |
| `CLAUDE.md` | 15 Ko | dépôt | commit de doc direct sur `main` |
| `MEMORY.md` | 10 Ko | `~/.claude/projects/-Users-david-Coding-js-ubumaths/memory/` | aucun commit (hors dépôt) |
| `archives.md` + fichiers de mémoire | — | même dossier | aucun commit |

## 1. Mesurer et repérer (mécanique)

Depuis le dépôt principal :

```bash
M=~/.claude/projects/-Users-david-Coding-js-ubumaths/memory
echo "== tailles (plafonds : CLAUDE.md 15 Ko, MEMORY.md 10 Ko)"; wc -c CLAUDE.md "$M/MEMORY.md" "$M/archives.md"; ls "$M" | wc -l
echo "== liens morts de l'index"; grep -ohE '\]\([^)]+\.md\)' "$M/MEMORY.md" "$M/archives.md" | sed -E 's/^\]\(([^)]+)\)$/\1/' | sort -u | while read -r f; do [ -f "$M/$f" ] || echo "$f"; done
echo "== mémoires non indexées"; for f in "$M"/*.md; do b=$(basename "$f"); case $b in MEMORY.md|archives.md) continue;; esac; grep -qF "($b)" "$M/MEMORY.md" "$M/archives.md" || echo "$b"; done
echo "== projets marqués clos dans l'index"; grep -nE '✅|CLOS|FAIT|livré|terminé' "$M/MEMORY.md"
echo "== chemins cités disparus"; grep -oE '`(src|scripts|docs|supabase|tests|data)/[^` ]+`' "$M"/*.md CLAUDE.md | sed -E 's/`//g; s/[:#][^/]*$//' | grep -vE '[<*{]' | sort -u | while IFS= read -r l; do p=${l#*:}; [ -e "$p" ] || echo "$l"; done
echo "== liens morts de CLAUDE.md"; grep -oE '\]\([^)]+\)' CLAUDE.md | sed -E 's/^\]\(([^)#]*).*$/\1/' | grep -v '^http' | sort -u | while read -r p; do [ -z "$p" ] || [ -e "$p" ] || echo "$p"; done
echo "== scripts pnpm cités absents de package.json"; grep -ohE 'pnpm [a-z][a-z0-9:-]*' CLAUDE.md "$M/MEMORY.md" | awk '{print $2}' | sort -u | grep -vE '^(install|exec|add|dlx|run|format)$' | while read -r s; do node -e "process.exit(require('./package.json').scripts['$s']?0:1)" || echo "$s"; done
```

Un chemin disparu n'est pas forcément une erreur : un journal `docs/wip/` archivé, un fichier renommé. Le noter pour l'étape 2, sans conclure.

## 2. Lire et croiser (jugement)

Lire **en entier** `CLAUDE.md` et `MEMORY.md` (c'est ce qui est chargé à chaque session), puis `archives.md`. Ne lire un fichier de mémoire que quand une ligne de l'index l'exige.

Chercher, dans cet ordre :

1. **Doublons entre les deux** — une ligne de l'index dont la règle est déjà dans `CLAUDE.md` → la passer dans la section « Archives » de `MEMORY.md` (le détail reste dans son fichier). Dans l'autre sens : un paragraphe de `CLAUDE.md` qui répète une doc de `docs/pratiques/` → garder la règle en une ligne + le lien.
2. **Projets clos** de « Projets — en cours » → `archives.md` (« clos, la leçon qui reste »), en gardant la leçon en quelques mots.
3. **Explications dans `CLAUDE.md`** (mesures, incidents, dates) → vers [claude-md-pourquoi.md](../../../docs/pratiques/claude-md-pourquoi.md) ; la règle reste.
4. **Doublons dans la mémoire** — deux fichiers qui disent la même chose → fusion.
5. **Mémoires périmées** — un symbole, un fichier, un script qui n'existe plus (étape 1) → vérifier dans le code avant de proposer quoi que ce soit.
6. **Mémoires non indexées** → les indexer, les fusionner, ou proposer de les retirer.
7. **Mémoires de chantier qui portent un état** (lots faits, PR en cours, « prochaine étape », décompte) — dans le fichier ou dans sa ligne d'index → proposer de les réduire à l'existence du chantier, au chemin de son journal `docs/wip/` (qui fait foi) et aux pièges ou décisions durables. Une copie de l'état vieillit à chaque lot et contredit le journal (`project_questions-1spe.md`, 2026-11-01).

## 3. Proposer, sans rien toucher

Une liste numérotée, groupée par fichier, une ligne par proposition :

```
N. [archiver | fusionner | raccourcir | déplacer | supprimer] <quoi> — <pourquoi, en une phrase> — gain ≈ X o
```

Finir sur le gain total estimé et les questions ouvertes (« ce projet est-il clos ? »). **Plus de ~15 propositions** → page à cocher (Artifact) plutôt qu'une liste dans le terminal.

Puis **attendre la réponse de David** (« 1, 3, 5 oui ; 2 non »). La skill tourne en Sonnet pour ce tour seulement : l'application se fait au tour suivant, sur le modèle de la session.

## 4. Appliquer ce qui est validé, et seulement ça

- **Jamais** supprimer un fichier de mémoire sans un « oui » explicite sur **ce** fichier ; une fusion garde le fichier cible et retire l'autre seulement s'il est validé.
- **Jamais** retirer une règle de `CLAUDE.md` : on la raccourcit, on déplace son détail ou son pourquoi, on fusionne deux formulations.
- Index : une ligne par entrée, détail dans le fichier ; mettre à jour les liens `[[nom]]` et `(fichier.md)` qui visaient un fichier fusionné.
- `CLAUDE.md` et `claude-md-pourquoi.md` : commit de doc **direct sur `main`** (`docs(claude-md): …`), `git pull --rebase` avant, push aussitôt, `git status -sb` propre à la fin.
- Relancer les commandes de l'étape 1, puis rendre compte : **tailles avant → après**, propositions appliquées, propositions écartées.
