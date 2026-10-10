# Analyse economique des cartes VIP

> Derniere mise a jour : 2026-03-11

## Vue d'ensemble

L'economie des cartes VIP repose sur les **gidouilles**, monnaie virtuelle gagnee principalement via le minesweeper. Les eleves depensent leurs gidouilles pour acheter des cartes VIP dans la boutique ou pour payer des tirages aleatoires.

---

## 1. Sources de revenus (gidouilles)

### 1.1 Minesweeper (source principale)

**Systeme actuel : limite journaliere (depuis 2026-01-01)**

Le systeme calcule une recompense theorique, mais n'attribue que **1g maximum par jour** (premiere victoire du jour). Les victoires suivantes rapportent 0g mais le `theoretical_reward` est enregistre pour le bonus hebdomadaire.

```
theoretical_reward = base x time_mult x (1 - hint_penalty)
Bornes : max(0.30, min(8.00, resultat))
actual_reward = 1g si premiere victoire du jour, 0g sinon
```

**Recompenses de base par difficulte :**

| Difficulte   | Base | Temps de ref. | Min theorique | Typique | Max theorique |
| ------------ | ---- | ------------- | ------------- | ------- | ------------- |
| Beginner     | 1.0g | 3 min         | 0.52g         | 1.0g    | 1.3g          |
| Intermediate | 3.0g | 10 min        | 1.56g         | 3.0g    | 3.9g          |
| Expert       | 6.0g | 20 min        | 3.12g         | 6.0g    | 7.8g          |

_Note : les valeurs theoriques ci-dessus servent au calcul du `week_best_reward`, mais la recompense reelle est toujours 0 ou 1g._

**Multiplicateur de temps** (continu, affecte le theoretical_reward) :

```
time_mult = 1.3 - 0.5 x min(1, temps_partie / temps_reference)
```

- Instantane : x1.30
- Mi-temps : x1.05
- Temps de reference : x0.80
- Au-dela : x0.80 (plancher)

**Penalites d'indices** (progressives, cumulatives, affectent le theoretical_reward) :

| Nb indices | Indices gidouilles (cout plein) | Indices VIP (cout reduit) |
| ---------- | ------------------------------- | ------------------------- |
| 1          | -10%                            | -5%                       |
| 2          | -22%                            | -11%                      |
| 3          | -35%                            | -17%                      |

Penalite totale plafonnee a 50%.

**Limite journaliere (partagee entre tous les jeux) :**

| Victoire du jour | Recompense reelle |
| ---------------- | ----------------- |
| 1ere             | 1g                |
| 2e et suivantes  | 0g                |

Le cap de 1g/jour est **partage entre minesweeper et enigmes** via `record_game_reward()`. Si un eleve gagne une enigme en premier, son minesweeper du jour rapporte 0g (et vice versa).

### 1.2 Enigmes

Meme systeme de cap journalier que le minesweeper. La recompense theorique est calculee mais seule la 1ere victoire du jour (tous jeux confondus) rapporte 1g.

**Recompense theorique** : `difficulte x multiplicateur`

| Difficulte | 1er essai | 2eme essai | 3e+ essai |
| ---------- | --------- | ---------- | --------- |
| 1          | 3g        | 2g         | 1g        |
| 2          | 6g        | 4g         | 2g        |
| 3          | 9g        | 6g         | 3g        |

_La recompense theorique sert au calcul du bonus hebdomadaire (meilleur jeu)._

### 1.3 Bonus hebdomadaire sans avertissement

- **Montant** : 1g/semaine
- **Condition** : aucun avertissement actif (non supprime) pendant la semaine scolaire
- **Execution** : cron automatique le 6e jour de la semaine scolaire, apres-midi
- **Code** : `run_weekly_rewards()` dans `20260104160000_pg_cron_weekly_rewards.sql`

### 1.4 Bonus hebdomadaire meilleur jeu

Source de revenu significative souvent negligee.

- **Montant** : egal au **meilleur `theoretical_reward`** de la semaine precedente
- **Plage** : 0.30g (beginner lent avec indices) a 7.80g (expert rapide sans indices), voire 9g (enigme diff 3 au 1er essai)
- **Condition** : avoir joue au moins 1 partie gagnee dans la semaine
- **Execution** : cron automatique le 6e jour de la semaine scolaire (meme timing que le bonus sans avertissement)
- **Code** : `award_weekly_best_bonuses()` dans `20260101200000_daily_weekly_reward_limits.sql`

**Impact** : un eleve jouant expert rapidement gagne ~8g de bonus hebdo en plus de ses gains journaliers. C'est potentiellement la plus grosse source reguliere de revenus.

### 1.5 Sources discretionnaires (prof)

| Source                    | Montant        | Condition                        |
| ------------------------- | -------------- | -------------------------------- |
| Recompense individuelle   | -1000 a +1000g | Action manuelle du prof          |
| Recompense classe entiere | -1000 a +1000g | Action manuelle du prof          |
| Roue de la fortune (prof) | defaut 10g     | Prof fait tourner la roue        |
| Tournoi podium            | defaut 10/5/3g | Tournoi finalise par le createur |
| Carte Sheikh (activation) | +50g           | Carte approuvee par le prof      |

_Les montants prof sont valides par Zod (-1000 a +1000). Le solde ne peut pas descendre sous 0._

### 1.6 Sources inactives ou speciales

| Source                   | Montant   | Statut                               |
| ------------------------ | --------- | ------------------------------------ |
| Defis quotidiens         | 5/3/2g    | **Supprimes** (migration 2026-01-02) |
| Victoire combat (legacy) | (xp/10)+5 | Systeme Navadra, pas d'audit trail   |
| Achievements             | variable  | **BUG : jamais credites** (voir 6.3) |
| Marketplace              | variable  | Transfert uniquement (zero-sum)      |

### 1.7 Estimation du revenu hebdomadaire

Le revenu depend du cap 1g/jour (partage minesweeper+enigmes), du bonus sans avertissement, et du bonus meilleur jeu.

| Profil eleve    | Jeux (1g/jour) | Bonus sans avert. | Bonus meilleur jeu | Total estime    |
| --------------- | -------------- | ----------------- | ------------------ | --------------- |
| Peu actif (3j)  | ~3g            | 1g                | ~1g (beginner)     | ~5g/semaine     |
| Actif (5j)      | ~5g            | 1g                | ~3g (intermediate) | ~9g/semaine     |
| Tres actif (7j) | ~7g            | 1g                | ~6-8g (expert)     | ~14-16g/semaine |

_Sans compter les sources discretionnaires (prof, tournois)._

---

## 2. Catalogue des cartes et prix

> **Source** : base de donnees de production (`vip_card_templates`), interrogee le 2026-03-11.
> Les migrations SQL ne refletent PAS l'etat reel — les raretes et prix ont ete modifies directement en prod.

### 2.1 Cartes Common (7 actives, prix moyen 6.4g)

| ID               | Nom                   | Prix | Action  | Categorie |
| ---------------- | --------------------- | ---- | ------- | --------- |
| bougeotte        | Bougeotte             | 5g   | passive | privilege |
| minesweeper-hint | Indice Demineur (1)   | 5g   | hint    | power     |
| lalalalala       | Lalalalala            | 5g   | passive | privilege |
| batman           | Batman and Robin      | 5g   | passive | power     |
| fame             | Voltaire's got talent | 5g   | passive | social    |
| tranquilou       | Tranquilou            | 10g  | passive | privilege |
| mathemagie       | Mathemagie            | 10g  | passive | power     |

_Desactivees : candy (5g), captain (5g)_

### 2.2 Cartes Rare (10 actives, prix moyen 11.8g)

| ID                 | Nom                 | Prix | Action            | Categorie |
| ------------------ | ------------------- | ---- | ----------------- | --------- |
| minesweeper-undo   | Seconde Chance      | 3g   | undo              | power     |
| throne             | Game of throne      | 5g   | passive           | privilege |
| minesweeper-hint-2 | Indice Demineur (2) | 8g   | hint              | power     |
| bonus              | Bonus               | 10g  | passive (+1)      | bonus     |
| memoire            | Trou de memoire     | 10g  | passive           | power     |
| minesweeper-freeze | Gel Temporaire      | 12g  | gel timer 60s     | power     |
| soldes             | Soldes              | 15g  | tire 2 cartes     | bonus     |
| super-bougeotte    | Super Bougeotte     | 15g  | passive           | privilege |
| help               | Help !              | 15g  | passive           | power     |
| ecrabouilleur      | Ecrabouilleur       | 25g  | supprime 1 avert. | power     |

_Desactivee : team (15g)_

### 2.3 Cartes Epic (6 actives, prix moyen 27.0g)

| ID                      | Nom                 | Prix | Action         | Categorie |
| ----------------------- | ------------------- | ---- | -------------- | --------- |
| minesweeper-hint-3      | Indice Demineur (3) | 12g  | hint           | power     |
| super-soldes            | Super Soldes        | 25g  | tire 3 cartes  | bonus     |
| minesweeper-chronostase | Chronostase         | 25g  | gel timer 120s | power     |
| jeu                     | Jeu                 | 30g  | passive        | privilege |
| super-bonus             | Super Bonus         | 30g  | passive (+2)   | bonus     |
| alchimie                | Alchimie            | 40g  | echange 3 -> 1 | power     |

### 2.4 Cartes Legendary (7 actives, prix moyen 62.9g)

| ID          | Nom                | Prix | Achetable | Action                    |
| ----------- | ------------------ | ---- | --------- | ------------------------- |
| inventeur   | Inventeur          | 20g  | oui       | passive                   |
| mega-soldes | Mega Soldes        | 30g  | oui       | tire 4 cartes             |
| coup-double | Coup Double        | 50g  | oui       | passive (x2 note)         |
| mega-bonus  | Mega Bonus         | 60g  | oui       | passive (+3)              |
| choix       | Libre choix        | 80g  | oui       | choisit 1 carte           |
| fortune     | Roue de la Fortune | 80g  | oui       | echange 5 -> 5 aleatoires |
| Sheikh      | Sheikh - Sheikha   | 120g | **non**   | +50 gidouilles            |

### 2.5 Limites de possession

- **Toutes les cartes** : max 5 exemplaires par eleve
- **Minesweeper undo** : max 10 exemplaires

### 2.6 Principes de tarification

Le prix reflete la **valeur/puissance** de la carte. La rarete determine la **probabilite de tirage** (60/25/12/3%).

- **Common (5-10g)** : privileges simples, consommables basiques — accessibles en < 1 semaine
- **Rare (3-25g)** : bonus academiques legers, consommables ameliores — 1-3 semaines
- **Epic (12-40g)** : bonus academiques forts, consommables puissants — 1.5-4.5 semaines
- **Legendary (20-120g)** : cartes a fort impact (x2 note, +3 points, choix libre) — 2-9+ semaines

Les cartes draw (Soldes, Super Soldes, Mega Soldes) sont tarifees pour un ratio **~x1.5** entre cout et valeur esperee (ni trop rentable, ni desavantageux).

---

## 3. Temps d'acces par prix et profil

### 3.1 Vue par tranche de prix

| Tranche | Exemples                                                                           | ~5g/sem  | ~9g/sem | ~15g/sem |
| ------- | ---------------------------------------------------------------------------------- | -------- | ------- | -------- |
| 3-5g    | undo, bougeotte, hint-1, lalala, batman, fame, throne                              | 1.0 sem  | 0.6 sem | 0.3 sem  |
| 8-12g   | hint-2, bonus, memoire, freeze, hint-3                                             | 2.0 sem  | 1.1 sem | 0.7 sem  |
| 15g     | soldes, super-bougeotte, help                                                      | 3.0 sem  | 1.7 sem | 1.0 sem  |
| 20-30g  | inventeur, chronostase, super-soldes, jeu, super-bonus, mega-soldes, ecrabouilleur | 5.0 sem  | 2.8 sem | 1.7 sem  |
| 40-50g  | alchimie, coup-double                                                              | 9.0 sem  | 5.0 sem | 3.0 sem  |
| 60-80g  | mega-bonus, choix, fortune                                                         | 14.0 sem | 7.8 sem | 4.7 sem  |
| 120g    | Sheikh (**non achetable**)                                                         | -        | -       | -        |

### 3.2 Collection complete

| Rarete    | Nb cartes   | Prix total   |
| --------- | ----------- | ------------ |
| Common    | 7           | 45g          |
| Rare      | 10          | 118g         |
| Epic      | 6           | 162g         |
| Legendary | 6 (+Sheikh) | 320g (+120g) |
| **Total** | **30**      | **765g**     |

| Profil           | Semaines pour tout acheter |
| ---------------- | -------------------------- |
| Peu actif (5g)   | ~153 semaines              |
| Actif (9g)       | ~85 semaines               |
| Tres actif (15g) | ~51 semaines               |

### 3.3 Analyse de coherence des prix

- **Prix correle a la puissance** : les cartes a fort impact academique (coup-double, mega-bonus, choix) sont les plus cheres
- **Common accessibles** : toutes les common a 5-10g, achetables en < 1 semaine meme pour un peu actif
- **Legendary = investissement long terme** : 20-80g, de 2 a 9 semaines pour un actif
- **Ratios draw equilibres** : x1.4-1.6 (ni trop rentable, ni desavantageux)
- **Ratio pouvoir d'achat entre profils** : x3 (15g vs 5g/sem), amplifie par le bonus hebdo meilleur jeu

---

## 4. Systeme de tirage aleatoire

### 4.1 Probabilites par defaut

| Rarete    | Probabilite | Plage (1-100) |
| --------- | ----------- | ------------- |
| Common    | 60%         | 1-60          |
| Rare      | 25%         | 61-85         |
| Epic      | 12%         | 86-97         |
| Legendary | 3%          | 98-100        |

### 4.2 Valeur esperee d'un tirage

| Rarete    | Nb cartes | Prix moyen | Proba | Contribution |
| --------- | --------- | ---------- | ----- | ------------ |
| Common    | 7         | 6.4g       | 60%   | 3.9g         |
| Rare      | 10        | 11.8g      | 25%   | 3.0g         |
| Epic      | 6         | 27.0g      | 12%   | 3.2g         |
| Legendary | 7         | 62.9g      | 3%    | 1.9g         |
| **Total** |           |            |       | **11.9g**    |

### 4.3 Rentabilite des cartes de tirage

| Carte        | Rarete    | Cout | Nb tirages | Valeur esperee | Ratio |
| ------------ | --------- | ---- | ---------- | -------------- | ----- |
| Soldes       | rare      | 15g  | 2          | 23.9g          | x1.6  |
| Super Soldes | epic      | 25g  | 3          | 35.8g          | x1.4  |
| Mega Soldes  | legendary | 30g  | 4          | 47.7g          | x1.6  |

Les ratios ~x1.5 sont equilibres : les cartes draw restent rentables (incitation a les utiliser) sans etre des exploits economiques. La valeur esperee est theorique — les cartes passives n'ont pas de valeur marchande directe, et la limite de possession (5 max) reduit la valeur reelle quand l'eleve possede deja beaucoup de cartes.

---

## 5. Cartes d'echange et leur economie

### 5.1 Alchimie (50g)

- **Cout total** : 50g + 3 cartes sacrifiees
- **Resultat** : 1 carte bonus au choix
- **Cas d'usage** : cibler une carte specifique impossible a obtenir autrement
- **Rentabilite** : negative en valeur brute, justifiee uniquement par le ciblage

### 5.2 Fortune (80g)

- **Cout total** : 80g + 5 cartes sacrifiees
- **Resultat** : 5 cartes aleatoires
- **Valeur esperee des 5 tirages** : ~60g (5 x 11.9g)
- **Rentabilite** : gambling pur, cout net ~80g + 5 cartes pour ~60g de valeur esperee — generalement deficitaire

### 5.3 Sheikh (120g, non achetable)

- **Obtention** : tirage (3% legendary), cadeau prof, echange
- **Effet** : +50g a l'activation
- **ROI si achetable** : 50/120 = 42% de retour (perte nette de 70g)
- **Protection** : marque `is_purchasable = false` pour eviter la boucle achat -> activation -> profit

---

## 6. Mecanismes d'equilibre

### 6.1 Anti-inflation

| Mecanisme             | Effet                                                 |
| --------------------- | ----------------------------------------------------- |
| Cap 1g/jour (partage) | Maximum 7g/semaine via jeux (minesweeper+enigmes)     |
| Sheikh non achetable  | Empeche la boucle achat -> +50g                       |
| Limite de possession  | 5 max par carte, evite la thesaurisation              |
| Penalite indices      | Reduit le theoretical_reward (et donc le bonus hebdo) |
| Trade limit           | Max 10 echanges/jour au marketplace                   |

### 6.2 Money sinks (destruction de gidouilles)

| Sink            | Gidouilles detruites  |
| --------------- | --------------------- |
| Achat de cartes | 3-80g par achat       |
| Tirage prof     | 3g par tirage         |
| Hint 1 (achat)  | 5g par hint           |
| Hint 2 (achat)  | 8g par hint           |
| Hint 3 (achat)  | 12g par hint          |
| Undo (achat)    | 3g par seconde chance |

### 6.3 Facteurs de risque identifies

| Risque                      | Severite    | Detail                                                                                              |
| --------------------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| Bonus hebdo meilleur jeu    | **Haute**   | Un expert rapide gagne ~8g/sem de bonus, inflationiste                                              |
| Achievements non credites   | **Moyenne** | `student_achievements.gidouilles_awarded` rempli mais `profiles.gidouilles` jamais mis a jour — BUG |
| Cartes draw equilibrees     | Resolu      | Ratio x1.4-1.6 (etait x3.9-5.9 avant reevaluation)                                                  |
| Combat legacy sans audit    | Moyenne     | `award_gidouilles_on_victory()` ne log pas dans `gidouilles_history`                                |
| Pas de sink passif          | Faible      | Pas d'expiration, taxe ou cout de maintenance                                                       |
| Ecart de richesse           | Faible      | Bonus hebdo meilleur jeu amplifie l'ecart (expert vs beginner)                                      |
| Max non verifie au tirage   | Faible      | Un eleve peut depasser le max de 5 via tirage (non bloque)                                          |
| Prix correle a la puissance | Resolu      | Reevaluation : common 5-10g, rare 3-25g, epic 12-40g, legendary 20-120g                             |

---

## 7. Simulation : parcours type d'un eleve

_Base : eleve actif (~9g/semaine incluant bonus meilleur jeu)_

### Semaines 1-2 : Decouverte

- Gains cumules : ~18g
- Achats possibles : 2-3 cartes common
- Premiere carte des la 1ere semaine

### Semaines 3-4 : Premiere rare

- Gains cumules : ~36g
- Achat d'une carte rare (15g) + 1-2 commons
- Motivation : objectif atteint rapidement

### Semaines 5-8 : Objectif epic

- Gains cumules : ~72g
- Epargne possible pour une epic (40g)
- Ou strategie tirage : acheter des Soldes pour tenter des cartes superieures

### Semaines 9-12 : Accumulation

- Gains cumules : ~108g
- Fortune (80g) accessible
- Collection diversifiee

### Au-dela de 12 semaines

- Surplus de gidouilles si pas de depenses
- Risque de desinteret sans nouveaux objectifs

---

## 8. Simulation Monte Carlo (10 000 parcours, 36 semaines)

> Script : `scripts/simulate-vip-economy.ts`
> Lancer : `npx tsx scripts/simulate-vip-economy.ts`

### 8.1 Comparaison des strategies (profil actif)

> **Attention :** Les resultats ci-dessous datent d'avant le cap a 1g/jour, la suppression des defis quotidiens, et la decouverte du bonus hebdo meilleur jeu. La simulation utilisait ~8g/sem ; le revenu reel est ~9g/sem (actif) ou ~15g/sem (tres actif). Les tendances relatives entre strategies restent valides.

| Strategie      | Uniques (moy) | Total cartes | Gidouilles restantes | Collection complete |
| -------------- | ------------- | ------------ | -------------------- | ------------------- |
| Soldes only    | 17.3 / 30     | 47.8         | 133.2g               | 0%                  |
| Cheapest first | 3.2 / 30      | 286.5        | 0.7g                 | 0%                  |
| Save for rare  | 1.0 / 30      | 36.0         | 252.1g               | 0%                  |
| **Balanced**   | **24.5 / 30** | 34.9         | 19.9g                | ~0%                 |
| Random buy     | 19.2 / 30     | 48.7         | 10.4g                | 0%                  |

**Constats :**

- **Balanced domine** pour la diversite de collection (24.5 uniques vs 17.3 pour Soldes only)
- "Soldes only" genere beaucoup de cartes en volume mais avec des doublons massifs, et laisse 133g non depensees (n'achete QUE des cartes draw)
- "Cheapest first" achete 286 cartes mais seulement 3 types differents (spam de hints a 1g)
- Aucune strategie ne permet de completer la collection en 36 semaines (30 cartes, certaines uniquement par tirage)

### 8.2 Impact du profil d'activite

| Profil     | Rev/sem | Uniques | Collection complete |
| ---------- | ------- | ------- | ------------------- |
| Peu actif  | ~4g     | 18.1    | 0%                  |
| Actif      | ~8g     | 24.6    | ~0%                 |
| Tres actif | ~13g    | 28.3    | 5%                  |

Seuls les eleves tres actifs ont une chance (5%) de completer la collection sur l'annee.

### 8.3 Progression hebdomadaire (balanced, medium)

```
S01  ████              3.7 uniques
S04  █████████          9.2 uniques
S08  █████████████      13.1 uniques
S12  ███████████████    15.3 uniques
S16  █████████████████  17.4 uniques
S20  ████████████████████  19.5 uniques
S24  ██████████████████████  21.5 uniques
S28  ███████████████████████  22.8 uniques
S32  ████████████████████████  23.7 uniques
S36  █████████████████████████  24.5 uniques
```

La progression ralentit fortement apres la semaine 20 (effet de saturation : les tirages donnent des doublons).

### 8.4 Valeur reelle des tirages (100k simulations)

| Tirage            | Cout | Valeur moy | Mediane | P10  | P90   | Ratio |
| ----------------- | ---- | ---------- | ------- | ---- | ----- | ----- |
| 1 tirage (ref)    | -    | 14.7g      | 8.0g    | 5.0g | 40.0g | -     |
| Soldes (x2)       | 8g   | 29.4g      | 20.0g   | 10g  | 55g   | x3.7  |
| Super Soldes (x3) | 10g  | 44.3g      | 33.0g   | 15g  | 90g   | x4.4  |
| Mega Soldes (x4)  | 20g  | 59.0g      | 50.0g   | 23g  | 110g  | x2.9  |

**Super Soldes est la carte la plus rentable** (ratio x4.4). Mais cette rentabilite est theorique : les cartes tirees ne sont pas revendables et la valeur reelle depend de l'usage en classe.

### 8.5 Distribution de richesse (balanced, medium)

| Percentile | Gidouilles restantes | Cartes uniques |
| ---------- | -------------------- | -------------- |
| P10        | 4.1g                 | 23 / 30        |
| P25        | 10.0g                | 24 / 30        |
| P50        | 20.3g                | 24 / 30        |
| P75        | 30.2g                | 25 / 30        |
| P90        | 36.0g                | 26 / 30        |

Ecart P90/P10 en cartes totales : **x1.2** — l'economie est remarquablement egalitaire entre eleves d'un meme profil d'activite.

### 8.6 Conclusions de la simulation

1. **Les cartes draw sont puissantes mais ne dominent pas** — la strategie "tout en Soldes" donne plus de volume mais moins de diversite que "Balanced"
2. **La collection complete est quasi-impossible** — 30 cartes avec des legendary a 3% de tirage, c'est un objectif de tres long terme
3. **L'economie est bien calibree** — surplus median de ~20g, ni trop ni trop peu
4. **Faible ecart de richesse** entre eleves d'un meme profil (ratio x1.2)
5. **Le vrai goulot d'etranglement** : les cartes epic/legendary non achetees directement, uniquement accessibles par tirage aleatoire a faible probabilite

---

## 9. Indicateurs cles

| Metrique                       | Valeur                           |
| ------------------------------ | -------------------------------- |
| Max jeux/jour                  | 1g (partage minesweeper+enigmes) |
| Bonus hebdo sans avertissement | 1g                               |
| Bonus hebdo meilleur jeu       | 0.3-8g (selon difficulte/perf)   |
| Revenu median hebdomadaire     | ~9g (actif) / ~5g (peu actif)    |
| Nb total de cartes actives     | 30 (7C + 10R + 6E + 7L)          |
| Prix moyen par rarete          | C:6.4g R:11.8g E:27.0g L:62.9g   |
| Valeur esperee d'un tirage     | 11.9g                            |
| Collection complete (prix)     | 765g (~85 sem a 9g/sem)          |
| Sheikh (non achetable)         | 120g, +50g a l'activation        |
| Ratio draw                     | x1.4-1.6 (equilibre)             |

---

## Fichiers de reference

| Fichier                                                                       | Contenu                                                                            |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **DB prod `vip_card_templates`**                                              | **Source de verite** pour cartes, prix et raretes                                  |
| `supabase/migrations/*_vip_card_templates*`                                   | Definition initiale (NE REFLETE PAS l'etat actuel)                                 |
| `supabase/migrations/20260101200000_daily_weekly_reward_limits.sql`           | `record_game_reward()`, `award_weekly_best_bonuses()`, `weekly_best_rewards` table |
| `supabase/migrations/20260101200001_minesweeper_daily_limit.sql`              | `complete_minesweeper_game()` avec cap 1g/jour                                     |
| `supabase/migrations/20260101200002_riddles_daily_limit.sql`                  | `submit_riddle_attempt()` / `validate_riddle_attempt()` avec cap partage           |
| `supabase/migrations/20260104150000_pg_cron_weekly_best_bonuses.sql`          | Cron bonus hebdo meilleur jeu                                                      |
| `supabase/migrations/20260104160000_pg_cron_weekly_rewards.sql`               | Cron bonus hebdo sans avertissement                                                |
| `supabase/migrations/20260102120000_add_minesweeper_tournaments.sql`          | Tournois et podium rewards                                                         |
| `supabase/migrations/20251121000000_create_universal_achievements_system.sql` | Achievements (gidouilles non creditees - BUG)                                      |
| `supabase/migrations/057_add_game_triggers_and_functions.sql`                 | Combat victory rewards (legacy)                                                    |
| `src/lib/server/vip-cards/`                                                   | Logique serveur cartes VIP                                                         |
| `src/routes/api/vip-cards/`                                                   | Endpoints API                                                                      |
| `src/routes/api/teacher/rewards/`                                             | Recompenses manuelles prof (student + class)                                       |
| `scripts/simulate-vip-economy.ts`                                             | Simulation Monte Carlo (obsolete - a mettre a jour)                                |
