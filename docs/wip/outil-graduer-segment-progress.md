# Outil `graduer-segment` — journal

## Reprendre ici

_Mis à jour le 2026-11-28, avant la première PR._

- **État** : lot réservé (c825324f80) ; outil 61 vérifié manquant (` ```line ` n'a que `placer:` /
  `representer:`, droites toujours déjà graduées). Phase 0 envoyée à David.
- **Prochaine action** : réponses de David à Q1-Q4 ci-dessous, puis tests rouges.
- **En attente de David** : Q1-Q4 de la phase 0.
- **Pièges en cours** : aucun.
- **Worktree / branche** : `../ubumaths-wt-outil-graduer-segment` · `feat/outil-graduer-segment`.

## Outil 61 — Graduer un segment (6-129)

Source : [outils-manquants.md](outils-manquants.md) n° 61 ; décision de David du 2026-11-25
(chantier `idees-6e-fractions`, Q1, [journal archivé](../archive/wip/idees-6e-fractions/idees-6e-fractions-progress.md)).

### Phase 0 (2026-11-28)

Syntaxe proposée, dans le bloc ` ```line ` existant :

````text
```line
start: 0
end: 2
step: 1
graduer: 3
placer: A=5/3
```
````

- **Nominal** : l'élève voit une droite où seuls 0, 1 et 2 sont marqués. Sous la droite :
  « Parts dans une unité : − 1 + ». Il monte à 3 : chaque unité se coupe en 3 parts égales (traits
  dessinés par l'écran). Puis il touche la droite pour poser A, qui se colle à ses graduations. Il
  pose A sur la 5e graduation → juste.
- **Limite** : `graduer:` sans `placer:` (« Partage chaque unité en 4 parts égales ») ; fraction
  plus grande que 1 (droite jusqu'à 2) ; il pose A avant de graduer → A ne peut aller que sur 0, 1, 2 ;
  il change le nombre de parts après avoir posé A → A est retiré, à reposer.
- **Erreur de l'élève** : 4 parts → « Tu as partagé l'unité en 4 parts ; il en fallait 3. » ;
  A mal placé → « Tu as placé A sur 4/3. » ; la droite juste en vert à côté.
- **Erreur de l'auteur** (refus à l'Atelier) : `graduer: 1` ou plus de 12 ; `placer: 5/4` avec
  `graduer: 3` (pas sur une graduation en tiers) ; `graduer:` avec `points:`, `representer:`,
  échelle `log`.

Questions :

- **Q1** — L'élève choisit le **nombre de parts** (− / +, l'écran trace des parts égales), ou il
  pose **chaque trait au doigt** (jugé avec une marge) ? Recommandation : le nombre de parts ; au
  doigt sur un téléphone, 3 parts égales ne se font pas, et le geste au guide-âne reste au papier.
- **Q2** — 6 parts et A sur la 10e graduation (10/6 = 5/3) : juste ou faux ? Recommandation : les
  graduations fausses (« il en fallait 3 »), A juste.
- **Q3** — Une case pour les graduations, plus une par point (comme `placer:` aujourd'hui) ?
  Recommandation : oui.
- **Q4** — Au PDF, segment unité à sa vraie longueur (`unite: 6 cm`) sans graduations
  intermédiaires, pour le guide-âne : dans cette PR, ou plus tard ? Recommandation : dans cette PR.
