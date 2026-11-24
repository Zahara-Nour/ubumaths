---
couvre:
  - 'scripts/ecarts/**'
  - 'tests/ecarts/**'
---

# Registre des écarts : `pnpm ecarts`

> Un **écart** est un défaut connu et pas encore corrigé : bug, code mort, commentaire faux,
> décision qui attend. Ils vivent tous dans **un seul fichier**,
> [docs/ecarts/registre.md](../ecarts/registre.md), une ligne par écart, chacune avec sa **preuve
> rejouable**. Décision de David du 2026-11-24 (journal :
> [ecarts-a-trier-progress.md](../wip/ecarts-a-trier-progress.md)).

Ce qui n'y va pas : les vérifications à faire à l'écran
([verifications-manuelles.md](../wip/verifications-manuelles.md)) sont des choses à regarder, pas
des défauts. Une vérification qui échoue produit un écart, qui entre ici.

## Une ligne

```
- V35 · bug visible · mathAST · le i passe devant √3 · preuve : test tests/ecarts/mathast.test.ts › V35 · à faire (décision du 2026-11-03)
```

Six champs séparés par `·` entouré d'espaces (aucun champ ne contient ce séparateur) :

| Champ       | Contenu                                                                    |
| ----------- | -------------------------------------------------------------------------- |
| Identifiant | une lettre et un numéro (`V35`, `L28 bis`) ; jamais réutilisé              |
| Type        | fixé par la lettre, tableau ci-dessous                                     |
| Domaine     | la zone du code ou du produit (`mathAST`, `fiches`, `grapheur`…)           |
| Constat     | ce que voit l'élève ou le prof, en une phrase                              |
| Preuve      | `preuve : …`, une des trois formes ci-dessous                              |
| État        | texte libre : `à faire`, `en attente de David`, `suspendu avec le tuteur`… |

| Lettre | Type                   |
| ------ | ---------------------- |
| V      | bug visible            |
| L      | bug latent             |
| M      | code mort              |
| C      | commentaire périmé     |
| D      | décision produit       |
| T      | RGPD                   |
| E      | vérification à l'écran |

Une ligne close est barrée et datée, jamais effacée :

```
- ~~L9 · bug latent · PDF · … · à faire~~ · clos le 2026-11-25 (preuve verte)
```

## Les trois preuves

Une preuve dit si l'écart est **encore vrai**. Elle est rouge tant qu'il l'est, verte quand il a
disparu.

| Forme                                            | Rejouée | Verte quand                                                        |
| ------------------------------------------------ | ------- | ------------------------------------------------------------------ |
| `preuve : test tests/ecarts/<f>.test.ts [› nom]` | oui     | au moins un test joué, tous verts                                  |
| ``preuve : commande `…` ``                       | oui     | la commande sort en 0 (lancée par `sh` à la racine, 2 min au plus) |
| `preuve : à la main`                             | jamais  | (décision de produit, papier RGPD : fermée à la main)              |

- **Test de preuve** : il affirme le comportement **attendu**, donc il est rouge aujourd'hui. Il
  vit sous `tests/ecarts/`, que seul le projet vitest `ecarts` joue (`vite.config.ts`, présent
  seulement quand `ECARTS_PREUVES=1`) : ni la CI, ni `test:server`, ni `test:changed` ne le voient.
  `› nom` retient les tests dont le nom complet contient ce mot entier (`V3` ne trouve pas `V35`) ;
  sans nom, tout le fichier (`› V35` retient aussi un test nommé « V35 bis »). Un test de preuve est du code : il arrive par une branche et une PR.
  À la correction de l'écart, le test devient un test ordinaire, à côté du code corrigé.
- **Commande** : pour ce qui se lit sans test (`test -f …`). Sortie 126 ou 127, ou commande
  tuée : preuve cassée, pas un rouge. ⚠️ Une négation peut être verte à tort : `! grep -q x f`
  sort en 0 si `f` n'existe plus (grep sort en 2). Toujours affirmer d'abord ce qui doit exister :
  `test -d src/lib && ! grep -rq "<nom>" src/lib`.
- **Preuve cassée** : fichier absent, aucun test de ce nom, fichier qui ne se charge pas, commande
  introuvable. Une ligne n'est **jamais** fermée sur une preuve cassée ; elle sort à part dans le
  bilan, à réparer.

## Commandes

```bash
pnpm ecarts                    # les écarts ouverts, par type
pnpm ecarts rejouer            # rejoue les preuves, affiche le bilan, n'écrit rien
pnpm ecarts rejouer V35 L9     # seulement ceux-là
pnpm ecarts rejouer --barrer   # barre en plus les lignes à preuve verte
pnpm ecarts ajouter V --domaine mathAST --constat "…" --preuve "à la main" [--etat "en attente"]
```

- `ajouter` donne le numéro : le suivant du plus grand jamais donné pour la lettre, lignes closes
  et ligne « Derniers numéros » comprises (les écarts fermés avant le registre n'y ont pas de
  ligne). Ne jamais écrire un numéro à la main. **Ajouter depuis le dépôt principal, après
  `git pull --rebase`**, et commiter aussitôt : deux branches qui ajoutent chacune de leur côté
  donneraient le même numéro (le conflit sur « Derniers numéros » le montre au merge).
- La ligne ajoutée va sous la dernière ligne de la liste ; le reste du fichier ne bouge pas.
- `rejouer --barrer` et `ajouter` modifient le registre sans commiter : c'est un commit de doc,
  direct sur `main`.
- Le bilan a quatre parties : preuves vertes, preuves cassées, toujours ouverts, à la main.
  `rejouer` sort en 0 même avec des preuves rouges ou cassées : c'est le bilan qui le dit.
- Avant de barrer, le registre est relu : une ligne ajoutée pendant le rejeu n'est pas perdue,
  une ligne fermée ou dont la preuve a changé entre-temps n'est pas barrée.
- Registre mal formé (champ manquant, type qui ne va pas avec la lettre, identifiant en double) :
  la commande s'arrête en nommant la ligne. Sorties : 0 fait · 1 registre absent ou mal formé,
  ajout refusé, `rejouer <id>` sur un identifiant inconnu ou déjà clos · 2 usage.

Code : `scripts/ecarts/` (`logique.ts` décide, `index.ts` lance), tests
`scripts/__tests__/ecarts.test.ts`.
