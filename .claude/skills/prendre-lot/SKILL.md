---
name: prendre-lot
description: Choisir et réserver un lot d'écarts du registre à traiter dans cette session (docs/wip/ecarts-lots.md), puis ouvrir son chantier. Utiliser quand David tape /prendre-lot, « prends un lot », « prends le lot X », « choisis un lot d'écarts » ou lance une session de plus sur les écarts restants.
---

# Prendre un lot d'écarts

But : plusieurs sessions traitent en parallèle les écarts « à faire » du registre, **sans jamais prendre le même lot ni toucher les mêmes fichiers**. Le fichier [`docs/wip/ecarts-lots.md`](../../../docs/wip/ecarts-lots.md) fait foi : lots, qui a pris quoi, règles. Le lire **en entier** avant tout (il est court).

Argument : `/prendre-lot` (la skill choisit) ou `/prendre-lot <nom>` (David choisit).

## 1. Lire l'état des lots

Toujours depuis le dépôt principal, à jour :

```bash
cd /Users/david/Coding/js/ubumaths && git pull --rebase && git status -sb | head -3
```

Pull refusé → s'arrêter et le dire à David (règle de `CLAUDE.md`), ne rien réserver.

La colonne « Pris par » de chaque lot dit son état :

| « Pris par »          | État     |
| --------------------- | -------- |
| vide                  | libre    |
| `<session> (date)`    | en cours |
| `fait (#PR, date)`    | fini     |

## 2. Choisir

Compter les lots **en cours**. Puis, dans l'ordre :

1. **Quatre lots en cours ou plus → ne rien prendre.** Le dire à David avec la liste des lots en cours, et s'arrêter.
2. **David a nommé un lot** : le prendre s'il est libre. S'il est en cours ou fini, le dire et s'arrêter (ne pas en choisir un autre à sa place). S'il enfreint une règle ci-dessous, le dire et attendre sa réponse.
3. **Sinon, le premier lot libre dans l'ordre du fichier** (de haut en bas, tableau après tableau), en sautant :
   - un lot **mathAST** si un autre lot mathAST est en cours (un seul à la fois) ;
   - **`formatdate`** tant qu'un autre lot est en cours ou libre (seul, en dernier) ;
   - un lot dont la colonne « Notes » dit qu'il attend quelque chose.
4. Aucun lot prenable → le dire à David (ce qui reste, et pourquoi c'est bloqué) et s'arrêter.

Ne pas demander à David de confirmer le choix : la réservation ci-dessous est un commit de doc, et il peut la défaire d'un mot.

## 3. Réserver, avant tout travail

Écrire dans la colonne « Pris par » du lot : `ecarts-<lot> (AAAA-MM-JJ)`. Mettre à jour la ligne `status:` de l'en-tête (lots en cours). Puis :

```bash
pnpm format docs/wip/ecarts-lots.md
git commit -m "docs(wip): ecarts-lots, lot <lot> pris" -- docs/wip/ecarts-lots.md
git push
```

**Push refusé = une autre session a réservé en même temps.** `git pull --rebase`, relire le fichier : si le lot est maintenant pris par une autre, retirer sa propre réservation et reprendre à l'étape 2. Conflit sur le fichier → le résoudre en gardant la réservation de l'autre session.

La réservation n'existe que **poussée** : ne rien commencer avant.

## 4. Ouvrir le chantier

- Sujet : `ecarts-<lot>` · worktree `../ubumaths-wt-ecarts-<lot>` · branche `fix/ecarts-<lot>` (`chore/…` pour un lot de code mort ou de commentaires) · journal `docs/wip/ecarts-<lot>-progress.md`, avec son bloc « Reprendre ici », commité au premier commit.
- **Ne pas réécrire le bloc « Reprendre ici » d'`ecarts-a-trier`** : il est commun à toutes les sessions.
- Lire au registre les lignes du lot, et elles seules : `grep -E "^- (V125|L74|…) · " docs/ecarts/registre.md`.
- Lire [registre-des-ecarts.md](../../../docs/pratiques/registre-des-ecarts.md) si la session ne l'a pas encore lu.

Premier message à David, en cinq lignes : lot pris · ses écarts (numéros et nombre) · worktree et branche · par quoi la session commence · « Pour nommer la session : `/rename ecarts-<lot>` ».

## 5. Travailler le lot

Les règles de `docs/wip/ecarts-lots.md` s'appliquent ; les trois qui s'oublient :

- **Vérifier chaque écart avant de le corriger** : une ligne peut être périmée, déjà corrigée ou fausse → la clore au registre en le disant, sans code.
- **Lot « sans décision »** : aucune question à David. **Autres lots** : chaque bug visible commence par sa phase 0 (comportements en français, mots simples, un exemple ; attendre la réponse).
- **Pas de chasse aux cas voisins.** On corrige l'écart inscrit. Les sondes servent à vérifier que le correctif ne casse rien, pas à trouver de nouveaux écarts : un cas voisin n'entre au registre que s'il vient d'un cas réel d'élève ou de prof (décision de David, 2026-11-27).
- Un écart qui touche les fichiers d'un autre lot **en cours** : l'écrire dans la colonne « Notes » et le laisser pour la fin du lot.

## 6. Clore le lot

Quand tous ses écarts sont corrigés, clos ou explicitement laissés (dire lesquels et pourquoi dans « Notes ») :

1. barrer les lignes au registre (ou laisser la tâche de nuit barrer les preuves vertes) ;
2. écrire `fait (#PR, AAAA-MM-JJ)` dans « Pris par » ;
3. archiver le journal dans `docs/archive/wip/` ;
4. commit de doc direct sur `main`, `-- <ses fichiers>`, poussé ;
5. dire à David : « Lot `<lot>` fini. Bon moment pour `/clear`, puis `/prendre-lot` pour le suivant. »

Une session qui s'arrête **avant** la fin du lot ne libère pas la réservation : elle met son journal à jour, et le lot se reprend par `/reprendre ecarts-<lot>`. Lot abandonné pour de bon → vider « Pris par » et écrire dans « Notes » ce qui a été fait.
