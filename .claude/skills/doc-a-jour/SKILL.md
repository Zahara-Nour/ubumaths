---
name: doc-a-jour
description: Mettre à jour la doc système que touche un changement de code, dans la même PR. Utiliser quand la garde `pnpm docs:check-a-jour` signale une doc à mettre à jour, avant d'ouvrir une PR qui modifie du code couvert par une doc (en-tête `couvre:` de docs/systeme/ ou docs/pratiques/), ou quand David demande de remettre une doc d'accord avec le code.
---

# Mettre la doc à jour avec le code

Règle de Chiphre : **chaque PR met à jour la doc du code qu'elle change**. La garde
`pnpm docs:check-a-jour --depuis origin/main` (CI et `pre-push`) l'exige ; ce skill dit comment le
faire bien. Carte module → doc : [docs/README.md](../../../docs/README.md).

## 1. Trouver les docs concernées

```bash
pnpm docs:check-a-jour --depuis origin/main
```

Elle liste, pour chaque doc, les fichiers modifiés qu'elle couvre (en-tête `couvre:`).

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

## 5. Le code n'a pas encore de doc

Le fichier est dans `trous` de `scripts/doc-a-jour.config.ts` : rien à faire pour cette PR, mais le
signaler à David si le changement est important. Fichier hors de toute doc et hors `trous` : la garde
`--couverture` échoue → l'ajouter au `couvre:` de la doc qui le décrit, ou à `trous` avec une note.
