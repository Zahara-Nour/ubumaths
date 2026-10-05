# Écrire un article du Shtam

Charte (voix, qui parodier, rien du Collège) : Compendium §IX « Le Shtam » (`docs/Chiphres/lore-pataphysique.md`).

## Le fichier

Un article = `src/lib/server/shtam/articles/<slug>.md`. Le nom du fichier est l'adresse : `/shtam/<slug>` (kebab-case, sans accents).

```markdown
---
title: Bedonstan — un triangle rectangle porte plainte
date: 2026-10-05
author: cotice
lede: Une ou deux phrases de chapeau, formules ubumark permises (~\pi~).
---

Corps de l'article, en ubumark (voix de la Rédaction).

## Le vrai du faux

Le fait mathématique réel (voix de l'Académie). Section obligatoire et unique.
```

- `author` : `cotice` (rédacteur en chef), `giron`, `pile`, `merdranpo`.
- `date` : jour de parution, heure de Paris. **Daté dans le futur = invisible jusqu'à ce jour-là** (parution programmée, sans redéploiement).
- `draft: true` : jamais visible.
- Le titre est du texte brut (pas de `~…~`) : écrire π, ², √ en Unicode.
- Un titre ou un chapeau qui contient « : » ou « # » se met **entre guillemets simples** (`title: 'Exclusif : le Czar parle'`, apostrophe doublée : `'l''hypoténuse'`). Sinon YAML lit une clé ou un commentaire ; le test le signale.

## Les formules

Notation ubumark : `~\pi~` (grec **avec** antislash), `~q*2~` (produit affiché ×), décimales en `$3{,}14$`. Pièges : `docs/ref/notation-unites.md`.

Les articles sont **exclus de prettier** (`.prettierignore`) : il échappait `~q*2~` en `~q\*2~`, ce qui casse la formule.

## Vérifier

```bash
pnpm test:server src/lib/server/shtam      # en-tête, vrai du faux, formules sans erreur rouge
pnpm check:ubumark src/lib/server/shtam/articles
```

Un article mal formé fait échouer la CI, jamais la production.

## Réserve d'idées

Sujets pas encore écrits (2026-10-05). Un sujet écrit sort de la liste.

| Province    | Titre (piste)                                                                                                              | Ressort comique                                                   | Vrai du faux                                       | Niveau     |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------- | ---------- |
| Nombrilie   | Un nombre premier se plaint de solitude : seul 1 et lui-même le divisent, et 1 ne l'appelle jamais                         | Courrier des lecteurs, détresse affective d'un nombre             | Définition, infinité des premiers (Euclide)        | 6ᵉ-3ᵉ      |
| Nombrilie   | Mère Ubu découvre les intérêts composés : sa tirelire doit dépasser le Trésor du Royaume « avant la fin du siècle »        | Panique du Cabinet, Père Ubu veut emprunter à sa femme            | Suites géométriques, croissance exponentielle      | 1re        |
| Nombrilie   | Un ordinateur à 8 bits compte les gidouilles de Mère Ubu : à 256, il repasse à 0                                           | La fortune s'évanouit à minuit, Mère Ubu fait arrêter la machine  | Dépassement d'entier, binaire                      | 2nde (SNT) |
| Bedonstan   | Un triangle à trois angles droits retrouvé au pôle Nord, Achras exige son rapatriement                                     | Le triangle « en situation irrégulière » au regard d'Euclide      | Géométrie sphérique : somme des angles > 180°      | 3ᵉ-1re     |
| Bedonstan   | Thalès mesure la pyramide de Mère Ubu avec son ombre, elle lui facture l'ombre                                             | Mère Ubu taxe l'ombre au mètre                                    | Théorème de Thalès, proportionnalité               | 4ᵉ-3ᵉ      |
| Bedonstan   | Le cercle de Lobatchevsk accusé de tourner en rond : « je n'ai aucun coin où me cacher »                                   | Procès d'un cercle ; Didon et sa peau de bœuf citées comme témoin | À périmètre donné, le disque a la plus grande aire | 5ᵉ-2nde    |
| Yoyolande   | Le Czar promet un grain de blé sur la 1re case de l'échiquier, deux sur la 2e… le Royaume entier est ruiné                 | Mère Ubu accepte le marché sans lire, puis comprend à la case 20  | ~2^64-1~ grains, puissances de 2                   | 4ᵉ-2nde    |
| Yoyolande   | Une asymptote s'approche de sa courbe depuis 1898 sans jamais la toucher : « je prends mon temps »                         | Feuilleton sentimental au ralenti                                 | Asymptote, limite                                  | 1re-Tle    |
| Yoyolande   | Le Cabinet des Phynances remplace toutes ses multiplications par des additions, grâce au logarithme                        | Les comptables sont réduits de moitié, la paie aussi              | ~ln(ab)=ln(a)+ln(b)~, tables de Neper              | Tle        |
| Pifométrie  | Sondage : 100 % des Polonais interrogés déclarent répondre volontiers aux sondages                                         | L'Institut se félicite d'un résultat « sans appel »               | Biais d'échantillonnage                            | 2nde       |
| Pifométrie  | Les ventes de glaces et les noyades augmentent ensemble, Bordure fait interdire les glaces                                 | Bordure, logique martiale ; les noyades continuent                | Corrélation n'est pas causalité (l'été)            | 2nde-1re   |
| Pifométrie  | Jeu des trois portes au Grand Marché : Mère Ubu change toujours de porte, et gagne deux fois sur trois                     | Le public crie au trucage                                         | Probabilités conditionnelles                       | 1re        |
| Glitchistan | Tri à bulles : ranger les Palotins par taille prend trois jours, Merdranpo reste coincé au milieu                          | Reportage dans la cour de la caserne                              | Algorithme de tri, nombre de comparaisons          | 2nde (SNT) |
| Patatovie   | « Tous les Polonais sont phynanciers » : Bordure arrête tous les non-phynanciers pour vérifier qu'ils ne sont pas Polonais | Rafle logique, la prison déborde de chats et de chaises           | Contraposée                                        | 2nde       |
| Patatovie   | Un Palotin pousse le premier domino, le Royaume entier tombe : la Garde cherche le responsable du domino suivant           | Enquête qui remonte la chaîne à l'infini                          | Raisonnement par récurrence                        | Tle        |
| Patatovie   | Achille n'a toujours pas rattrapé la tortue, Bordure ordonne l'assaut                                                      | Bulletin militaire ; la tortue négocie sa reddition               | Zénon, ~1/2+1/4+1/8+…=1~                           | 1re-Tle    |
