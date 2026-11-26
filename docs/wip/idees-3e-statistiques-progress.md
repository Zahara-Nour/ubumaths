# Chantier `idees-3e-statistiques`

## Reprendre ici

_Mis à jour le 2026-11-26, après #3209._

- **État** : phase 0 validée (« je te suis » : V1, V2, V3, R et Q1 comme recommandé). #3209 mergée : 5 variations ajoutées à 96992ea8, c2497d96 et 21ebfb57 (réservés, main 7accd349c3), migration de contenu `20261126222711` (test d'intégration vert, `security-auditor` sans finding bloquant), **pas encore appliquée en prod**.
- **Prochaine action** : après l'accord de David sur les copies non suivies, `git pull --rebase` du dépôt principal, `migration list --linked` (aucune autre migration en attente, sinon stop), `pnpm db:migrate`, puis série de relecture des 3 modèles (`scripts/series/creer-serie.ts`) pour `/dev/modeles`.
- **En attente de David** : accord pour supprimer les deux copies non suivies (voir le piège) ; ensuite, la relecture dans `/dev/modeles`.
- **Pièges en cours** : deux copies **non suivies**, `docs/wip/idees-3e-statistiques-progress.md` et `-releve.md`, bloquent le `git pull` du dépôt principal. Leur contenu est déjà sur `main` : le journal est identique à f3422b6752, et le relevé ne diffère que par l'alignement des tableaux. Ne pas les retirer sans l'accord de David.
- **Worktree / branche** : `../ubumaths-wt-idees-3e-statistiques` · `docs/idees-3e-statistiques-reprendre` (journal seul). La PR suivante (publication) se fait dans un nouveau worktree.

## Relevé (2026-11-26)

3 exercices (3S12, 3S14-0, 3S14-1). Nos modèles couvrent déjà toute la rubrique ; il manque des
grands effectifs pour la médiane de 3e, une moyenne arrondie au dixième (4e) et la fréquence lue sur
un diagramme ou pour un regroupement (5e). Question d'accès des migrations à venir : personne ne gagne
d'accès (variations ajoutées à des modèles publiés).

Page à cocher de la phase 0 : https://claude.ai/artifact/JWpuBjpG9vRQDNwHnmfEp1

## Fiches de la phase 0 (copie de la page à cocher)

Chaque variation aura ses `testSpecs` (réponses justes sous plusieurs écritures, erreurs typiques
refusées), trois erreurs prévues par case et un coup de pouce qui ne donne pas la réponse.

### V1 — Médiane d'une série à grands effectifs (2 variations à 96992ea8, 3e)

- **Chez eux** : 3S14-1, score médian de 49 à 2 000 lancers de dé (tableau d'effectifs) ; salaire médian d'une entreprise de 80 à 99 salariés (5 catégories, un dirigeant à plus de 8 000 €).
- **Chez nous** : 96992ea8 n'a que des effectifs de 1 à 9 par valeur. Une case, bloc ` ```effectifs `. Le passage par les effectifs cumulés (rang N/2) devient nécessaire.
- **Point** : 3-056 (inchangé).
- **Variations** : (a) dé à 6 faces lancé N fois, N parmi 50, 100, 200 ou 99, 199, effectifs de 5 à 45 par face ; (b) salaires d'une entreprise : 5 salaires (environ 1 300, 1 500, 1 750, 3 550, 8 500 €), effectif total de 41 à 99. Tirages où la médiane est unique (effectif impair, ou deux valeurs centrales égales), comme v2.
- **Réponse** : la valeur médiane. Erreurs prévues : le rang (N + 1)/2 au lieu de la valeur, la valeur du milieu du tableau (3e colonne), la moyenne (salaires).

### V2 — Moyenne pondérée arrondie au dixième (1 variation à c2497d96, 4e)

- **Chez eux** : 3S14-1, moyenne des notes, des pointures ou des scores « arrondie au dixième ».
- **Chez nous** : c2497d96 ne tire que des moyennes décimales exactes. On ajoute la consigne d'arrondi, petits effectifs (bornes de 4-039).
- **Point** : 4-039 (inchangé).
- **Variations** : pointures d'un club (5 pointures de 35 à 44, effectifs de 1 à 8, total de 10 à 30), moyenne non décimale exacte.
- **Réponse** : moyenne arrondie au dixième. Erreurs prévues : la troncature, la moyenne des valeurs sans les effectifs, la somme des produits ÷ nombre de valeurs (5).

### V3 — Fréquence lue sur un diagramme, et fréquence d'un regroupement (2 variations à 21ebfb57, 5e)

- **Chez eux** : 3S12, parc animalier en diagramme en barres (3 quadrupèdes, 2 à 4 oiseaux) : fréquence d'une espèce, puis des oiseaux, en % arrondi à 0,1 %.
- **Chez nous** : 21ebfb57 donne le total dans le tableau et une catégorie seule. Ici l'élève calcule le total à partir d'un diagramme ` ```barres `, puis regroupe des catégories. Une case `? %`.
- **Point** : 5-134 (inchangé).
- **Variations** : (a) fréquence d'une espèce lue sur le diagramme (6 espèces, effectifs de 2 à 12) ; (b) fréquence des oiseaux (2 ou 3 espèces sur 6). En % arrondi au dixième.
- **Réponse** : 100 × n ÷ N arrondi au dixième. Erreurs prévues : l'effectif n, n ÷ N sans × 100, la troncature (ou, pour b, la fréquence d'une seule espèce d'oiseaux).

### R — Ce que je ne reprends pas

- Étendue (3S14-0, 3S14-1) : 4604b429 couvre notes, températures avec négatifs, tableau et diagramme ; un mois de températures (30 valeurs) déborde sur téléphone.
- Médiane d'effectif pair entre deux valeurs centrales différentes : b2908d52 v2 (4e) l'accepte déjà ; en 3e, 96992ea8 tire des médianes uniques, ce que les bornes permettent (décision c4-3).
- Salaire moyen tiré par le dirigeant : 410c104b (valeur extrême) le fait déjà.
- Lancers de deux dés : rien de plus que V1 côté statistiques.

### Q1 — Pas de point de 3e pour la moyenne ni la fréquence : V2 et V3 vont aux modèles de 4e et de 5e ?

Les bornes mettent la moyenne pondérée en 4e et la fréquence en 5e. Les élèves de 3e ne voient ces
variations que si le prof leur donne ces modèles. Recommandation : oui (pas de niveau 3e ajouté).

## Lot (2026-11-26)

Verdicts : David n'a rien coché sur la page ; il a répondu « je te suis » dans la session, soit toutes
les recommandations (V1, V2, V3 oui ; R comme proposé ; Q1 oui, pas de niveau 3e ajouté).

| Modèle   | Variations ajoutées | Contenu                                                                                                                                                                                                |
| -------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 96992ea8 | 3 et 4              | dé à six faces (effectifs de 7 à 45, N de 42 à 270) ; salaires d'une entreprise (5 salaires, dirigeant compris, 41 à 99 salariés). Médiane unique : aucun cumul égal à N/2.                            |
| c2497d96 | 4                   | pointures d'un club de basket (5 pointures de 35 à 44, effectifs de 1 à 8, total de 10 à 30), moyenne arrondie au dixième, toujours arrondie vers le haut (la troncature diffère ainsi de la réponse). |
| 21ebfb57 | 3 et 4              | parc animalier en diagramme en barres (6 espèces, effectifs de 2 à 12) : fréquence des girafes ; fréquence des oiseaux (flamants, autruches, perroquets), en % arrondi au dixième.                     |

Chaque variation : trois erreurs prévues, un coup de pouce, des specs qui vérifient le message de
chaque erreur prévue (`expectedErrorMessage`). `question:specs` : 19, 14 et 18 specs vertes,
1 500 tirages réussis par modèle.

À signaler à la relecture : sur un dé équilibré, la médiane tombe presque toujours sur 3 ou 4
(10 fois 4, 4 fois 3, 1 fois 2 sur 15 tirages). Sur la page, les oiseaux sont toujours trois espèces
fixes (la fiche disait 2 ou 3).
