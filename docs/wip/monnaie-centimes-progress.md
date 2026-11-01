---
status: phase 0
---

# Chantier « monnaie-centimes » : des centimes et les billets de 200 / 500 € dans ` ```monnaie `

> Ouvert le 2026-11-01 depuis [questions-ce1](questions-ce1-progress.md) § 12. Il sert à faire le lot monnaie du CE1
> (054, 055, 056, 057, 086), puis le CE2 (054, 080). Bloc d'origine : [monnaie](../archive/wip/monnaie-progress.md),
> doc durable : [ubumark.md](../systeme/ubumark.md) (§ « Pièces et billets », « Monnaie à construire »).

## Reprendre ici

_Mis à jour le 2026-11-01, à l'ouverture._

- **État** : phase 0 écrite (§ 2, § 3), rien n'est codé.
- **Prochaine action** : David valide la phase 0 → tests rouges → code → PR.
- **En attente de David** : les questions du § 3.
- **Pièges en cours** : les modèles du CP (`construire: 35`, `montant: 48`) ne doivent pas bouger, ni leur réponse
  `35` ; la scène est commune avec ` ```collection ` (ses tests doivent rester verts).
- **Worktree / branche** : `../ubumaths-wt-monnaie-centimes` (`feat/monnaie-centimes`).

## 1. Ce qui manque (relevé du code le 2026-11-01)

- `monnaie-parser.ts` refuse `50c` (« centimes pas encore disponibles ») dans `pièces:`, `montant:`, `construire:`,
  `réserve:`, et refuse les billets de 200 / 500 € (« pas encore disponible »).
- Les valeurs sont des **euros entiers** partout : nœud (`MonnaieSet`), scène (`MONNAIE_VIEW.coin` : 1 et 2 € ;
  `noteWidth` : 5 à 100 €), construction (`buildValue`, `buildAnswer` → `"35"`, `fewestCoupures` par euro), PDF.
- Plafonds du CP : 100 € par ensemble, `construire:` de 1 à 100 €, 30 objets. Le CE1 va jusqu'à **1 000 €**
  (décision c2-1).

Ce que demandent les points (bornes `cycle2.json`) : « valeur en euros et centimes avec un nombre final de centimes
< 100, ou écriture à virgule » (054-057, 086) ; « 12 € > 60 centimes » (054) ; « pas de pièce de 1 € (pièces de 10,
20, 50 c) » (056).

## 2. Comportements attendus (phase 0)

### Nominal

1. `pièces: 2 1 50c 20c 5c` dessine des pièces de 50, 20 et 5 centimes, avec « 50 c » écrit dessus. Les six pièces
   de centimes existent : 1, 2, 5, 10, 20, 50 c. `billets: 200 500` dessine des billets de 200 et 500 €.
2. `montant: 3,45` (ou `montant: 3 € 45 c`) choisit les coupures : 2 € + 1 € + 20 c + 20 c + 5 c.
3. `construire: 3,45` : l'élève pose des coupures de la réserve ; la somme posée est jugée en centimes exacts
   (20 c + 20 c + 5 c = 45 c, jamais 0,449999). `réserve: 2 1 50c 20c 10c 5c`.
4. Réponse de la case d'un bloc à construire : **`3,45`** (virgule, deux chiffres après) ; un montant entier reste
   **`35`**, comme aujourd'hui → les modèles du CP ne changent pas.
5. Correction : « Tu as posé 3 € et 45 c. » ; somme entière : « Tu as posé 32 €. » (inchangé) ; que des centimes :
   « Tu as posé 85 c. ».
6. 056 « pas de pièce de 1 € » : `réserve: 50c 20c 10c` suffit (rien de neuf).
7. PDF : mêmes pièces, même écriture, à la même échelle que l'écran (scène partagée).

### Limites

8. `montant: 0,85` → que des pièces de centimes ; `construire: 0,05` accepté (plus petite somme : 1 c).
9. `montant: 17,00` vaut `montant: 17` (pas de pièce de centimes dessinée).
10. Plafond porté à **1 000 €** par ensemble et pour `construire:`, toujours **30 objets** au plus (avec 30 objets et
    des centimes, `construire: 3,99` doit encore se faire : 2 € + 1 € + 50 + 20 + 20 + 5 + 2 + 2 c = 8 objets).
11. Un ensemble de comparaison (054) peut mêler euros et centimes : « 12 € » contre « 60 c » se dessinent à la même
    échelle.
12. Nom accessible : toujours « Pièces et billets », jamais le total ; bouton « Ajouter une pièce de 50 centimes ».

### Erreurs (message situé, pour l'auteur)

13. `montant: 3,456` → « trois chiffres après la virgule : 2 au plus (centimes) ».
14. `pièces: 3c` → « pièce de 3 c : n'existe pas (1, 2, 5, 10, 20, 50 c) » ; `billets: 50c` → « 50 c est une pièce ».
15. `construire: 3,45` avec `réserve: 2 1` → « 3,45 € ne se fait pas avec la réserve 1, 2 € » (règle déjà en place,
    étendue aux centimes).
16. Au-delà de 1 000 € ou de 30 objets : messages actuels, nouveaux plafonds.

## 3. Questions à David

1. **Taille des pièces de centimes.** Les vraies ne suivent pas leur valeur (50 c plus grosse que 1 €). Aujourd'hui,
   règle du bloc : « plus la valeur est grande, plus c'est grand ». Recommandation : **garder la règle** (1 c la plus
   petite … 2 € la plus grande) et distinguer les familles par la **couleur** : cuivre pour 1, 2, 5 c ; doré pour 10,
   20, 50 c ; les euros comme aujourd'hui. Une seule couleur d'accent ailleurs, comme le reste du bloc.
2. **Écriture d'un montant dans le bloc** : `3,45` seul, ou aussi `3 € 45 c` et `345c` ? Recommandation : les trois
   (l'auteur écrit comme dans l'énoncé), lus en centimes.
3. **Réponse de la case** : `3,45` (virgule) ou `3 € 45 c` ? Recommandation : `3,45`, qui garde `35` pour les entiers ;
   seule la correction dit « 3 € et 45 c ».
4. **Correction en écriture à virgule ?** Les points 054-057 acceptent les deux écritures, 058 (écriture à virgule) est
   en période 3. Recommandation : « 3 € et 45 c » partout (plus tôt dans l'année), sans réglage par modèle.
5. **Réserve par défaut** d'un `construire:` à centimes (sans `réserve:`) : aujourd'hui 50, 20, 10, 5, 2, 1 €.
   Recommandation : si la somme a des centimes, ajouter d'office 50, 20, 10, 5, 2, 1 c ; sinon la réserve d'aujourd'hui
   (rien ne change au CP).
6. **Hors chantier** : « rendre la monnaie » (086) se fait avec ce qui existe — l'énoncé dit ce qu'on paie et avec
   quoi, l'élève construit la monnaie rendue. Les ajouts successifs du CE2 (080) viendront plus tard. D'accord ?

**Question d'accès** : aucune — ni base, ni règle ; le bloc est rendu côté client.

**Revue prévue** : `code-reviewer` en `model: opus` (correction des réponses : la somme posée est jugée).

## Journal

- 2026-11-01 : chantier ouvert (worktree, branche), relevé du code, phase 0 écrite.
