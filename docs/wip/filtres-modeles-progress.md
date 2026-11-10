# Chantier `filtres-modeles` — filtres plus fins et série dans `/dev/modeles`

## Reprendre ici

_Mis à jour le 2026-11-10, phase 0 validée._

- **État** : phase 0 validée par David ; tests puis code en cours · **Prochaine action** : tests rouges (`src/lib/questions/__tests__/template-review.test.ts`), code, PR · **En attente de David** : rien · **Pièges en cours** : un modèle deux fois dans une série → deux fiches (clé d'affichage ≠ id du modèle) · **Worktree / branche** : `ubumaths-wt-filtres-modeles`, `feat/filtres-modeles`

## Origine

Né du chantier `cours-suites` : David veut voir le rendu des 30 brouillons « Cours : … » dans
`/dev/modeles` et filtrer plus finement, et afficher les modèles d'une série enregistrée.

## Phase 0 (validée par David le 2026-11-10 : « je te suis »)

Retenus : recherche dans le titre, point du programme, série. Écartés pour l'instant : question de
cours, date.

1. **Titre** (`?titre=`) : contient le texte, sans casse ni accents ; vide ou espaces = pas de
   filtre ; plus de 100 caractères → 400. Se combine avec le nœud et les autres filtres ; sans
   nœud, plafond de 80 fiches avec le total annoncé.
2. **Point** (`?point=`) : modèles tagués sur ce code, casse indifférente ; point sans modèle →
   « Aucun modèle sur ce point » ; code absent des points en base → « Point inconnu » ; format
   invalide (pas `XXX-123`) → 400.
3. **Série** (`?serie=`) : sélecteur « titre · niveau », trié niveau puis titre ; modèles dans
   l'ordre de la série avec « × quantité · délai s » ; les autres filtres s'appliquent en plus ;
   un modèle deux fois → deux fiches ; modèle supprimé → « Modèle introuvable » ; la série remplace
   le nœud (gardé dans l'adresse) ; aucune série → pas de sélecteur ; id mal formé → 400 ; série
   disparue → « Cette série n'existe plus ».
4. « Tout effacer » vide aussi les nouveaux filtres. Pas de migration ; `/dev` reste admin.

Séries : seul un professeur en crée (`series_insert_teacher`) ; en prod, 5 séries, un seul
créateur (mono-professeur) → le sélecteur liste toutes les séries.

## Journal

- 2026-11-10 : worktree créé ; phase 0 validée.
