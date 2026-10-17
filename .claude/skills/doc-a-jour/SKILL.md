---
name: doc-a-jour
description: Mettre à jour la doc système que touche un changement de code, dans la même PR. Utiliser quand la garde `pnpm docs:check-a-jour` signale une doc à mettre à jour, avant d'ouvrir une PR qui modifie du code couvert par une doc (en-tête `couvre:` de docs/systeme/ ou docs/pratiques/), ou quand David demande de remettre une doc d'accord avec le code.
---

# Mettre la doc à jour avec le code

Règle de Chiphre : **chaque PR met à jour la doc du code qu'elle change**. La garde
`pnpm docs:check-a-jour --depuis origin/main` la vérifie : elle échoue quand on la lance soi-même, et
n'avertit qu'en CI et au `pre-push` (une sortie à lire, pas un feu vert). Ce skill dit comment le
faire bien. Carte module → doc : [docs/README.md](../../../docs/README.md).

## 1. Trouver les docs concernées

```bash
pnpm docs:check-a-jour --depuis origin/main
```

Elle liste, pour chaque doc, les fichiers modifiés qu'elle couvre (en-tête `couvre:`), puis les
**zones sans doc** que la PR touche (`⛔ Doc d’abord`, voir §5).

## 2. Pour chaque doc : relire ce que le diff change

`git diff origin/main...HEAD -- <fichiers listés>` puis, dans la doc, chercher **chaque passage qui
parle de ce code** : carte du code, modèle, invariants, « comment étendre », tests, écarts connus.

- Comportement changé → réécrire le passage pour qu'il dise le **nouveau** comportement.
- Fichier, fonction, route, table renommés ou supprimés → corriger le renvoi.
- Nouveau fichier ou module → l'ajouter à la carte du code **et** au `couvre:` si le glob ne l'attrape pas.
- Écart connu corrigé par la PR → le retirer de la section « écarts connus ».
- Nouvel écart découvert (code mort, commentaire faux) → l'ajouter, sans le corriger hors périmètre.

## 3. Vérifier, pas affirmer

- Chaque symbole, chemin, commande cité **existe** : `git grep -w`, `git ls-files`.
- Un comportement décrit se **lit dans le code** (ou dans un test), pas dans un ancien journal.
- `pnpm docs:check-refs --strict` et `pnpm docs:check-links` : 0.
- Mettre à jour la ligne « Vérifié contre le code le AAAA-MM-JJ ».

## 4. Quand la doc ne change pas

Si le comportement décrit est **réellement** inchangé (renommage interne, refactor, typage, perf sans
effet visible), ne pas toucher la doc pour la forme : ajouter à un commit de la PR une ligne

```
Doc-inchangée: <raison précise>
```

C'est un choix assumé et visible dans l'historique. « Pas le temps » n'est pas une raison.

## 5. Le code n'a pas encore de doc : la doc d'abord

Règle de David (2026-10-10) : **une PR qui modifie un fichier d'une zone listée dans `trous`
(`scripts/doc-a-jour.config.ts`) écrit d'abord la doc de cette zone**, puis la retire de `trous`.
Les docs naissent là où le code bouge, au moment où quelqu'un le connaît.

- Une doc par zone (la `note` de l'entrée), au gabarit de [docs/README.md](../../../docs/README.md),
  avec son `couvre:`, écrite **à partir du code** et vérifiée comme au §3 ; ajouter sa ligne à la carte.
- Retirer de `trous` toutes les entrées de la zone ; `pnpm docs:check-a-jour --couverture` doit rester à 0.
  Elle échoue aussi sur un trou **périmé** (zone déjà décrite par une doc, ou glob qui ne désigne
  plus rien) : une doc écrite sans retirer son trou ne passe pas le `pre-push`.
- Zone très grosse au regard d'un petit correctif : le dire à David avant d'écrire, il tranche.
  Écrire la partie que la PR touche, et laisser le reste en trou, est une réponse possible
  (2026-10-12, #1152). S'il reporte toute la doc : une ligne `Doc-reportée: <raison>` dans un
  commit de la PR, qui fait taire la garde.
- Un fichier qu'une doc cite seulement dans un index reste dans sa zone sans doc : citer n'est pas
  décrire. Seul `couvre:` compte (la clé `indexe:` a disparu le 2026-10-12).

La garde `--depuis` signale ces zones (`⛔ Doc d’abord`, avec la `note` de chaque zone touchée) ;
avant le 2026-10-12 rien ne les vérifiait, et une PR a touché une zone sans doc sans que personne
le voie.

Fichier hors de toute doc **et** hors `trous` : la garde `--couverture` échoue → l'ajouter au
`couvre:` de la doc qui le décrit (ou, s'il ouvre une zone nouvelle, écrire sa doc).
