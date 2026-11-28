# Outil `graduer-segment` — journal

## Reprendre ici

_Mis à jour le 2026-11-28, après #3293._

- **État** : lot clos. Outil 61 livré (#3293), journal archivé.
- **Prochaine action** : aucune.
- **En attente de David** : avis sur les choix faits sans lui (§ Implémentation).
- **Worktree / branche** : retirés.

## Outil 61 — Graduer un segment (6-129)

Source : [outils-manquants.md](../../wip/outils-manquants.md) n° 61 ; décision de David du 2026-11-25
(chantier `idees-6e-fractions`, Q1, [journal archivé](idees-6e-fractions/idees-6e-fractions-progress.md)).

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

**Décision de David (2026-11-28)** : « je valide tes recos ». Q1 nombre de parts (− / +) ; Q2
graduations fausses, point juste à sa valeur (10/6 = 5/3) ; Q3 une case pour les graduations plus
une par point ; Q4 `unite: 6 cm` au PDF dans cette PR.

### Implémentation (2026-11-28)

- `graduer: d` (2 à 12) et `unite: 6 cm` dans ` ```line ` ; calcul pur `utils/number-line-graduer.ts`,
  écran `NumberLineGraduer.svelte` (réutilise `NumberLinePlacer`). Doc : `docs/systeme/ubumark.md`
  « Droite à graduer ».
- Choix faits en cours de route (à montrer à David) : élève resté à 1 part → « Tu n'as pas partagé
  l'unité ; il fallait la partager en 3 parts. » ; case des parts vide tant que − / + n'est pas
  touché (Valider grisé) ; boutons nommés « Une part de plus / de moins » ; refus en plus :
  `zoom:`, `unite:` sur `log`, plus de 500 graduations à 12 parts.
- Revue opus : `unite:` débordait d'une colonne de fiche (droite jamais réduite) → réduite
  seulement si la colonne est trop étroite ; borne des 500 graduations comptée à 12 parts ; test
  du geste sur l'énoncé masqué ajouté.
- Rendu vu : `/aide-ecriture/blocs/droite-graduee`, WebKit iPhone : 0-1-2 seuls, 3 parts tracées,
  A posé sur 5/3, passer à 4 parts retire A.
