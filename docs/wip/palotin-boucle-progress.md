# La boucle du Palotin tourne — journal

> Branche `feat/palotin-boucle`, worktree `../ubumaths-wt-palotin`. Démarré le 2026-10-18.
> Conception : [mathoux-conception.md](mathoux-conception.md) § 8.

## Reprendre ici

_Mis à jour le 2026-10-21 : refonte des SVG des Palotins lancée._

- **État** : boucle terminée (#1471, #1475, #1476, #1484, en prod v0.43.0). **Refonte des SVG en cours** : David a choisi le 2026-10-21 le style « affiche de cabaret » (Steinlen) + la pièce héraldique portée sur le vêtement (écusson gironné d'or et de sable pour Giron, pile d'or en plastron pour Pile, cotice d'or en écharpe pour Cotice). Comparatif : https://claude.ai/artifact/Qxf2d25VYn5JiFvLQ1knKg
- **Prochaine action** : animation au repos validée par David (réactions aussi) ; les 18 expressions animées sont en tête du comparatif, en attente de sa validation. Ensuite : worktree + PR qui remplace `static/images/buddies/` (18 SVG) et ajoute les réactions (bond, tressaut, affaissement) dans `BuddyAvatar`, avec le générateur dans `scripts/` ; vérifier « réduire les animations » dans une `<img>`.
- **Règles de dessin (David)** : pas de spirale (gidouille) sur le ventre, réservée au Père Ubu ; traits fins (contours ≈ 1,8 sur 100, réduits de 40 % le 2026-10-21) ; essai « affermi » (tête plus petite, yeux en amande, ombre au lieu des joues roses) écarté par David le 2026-10-21 : on garde la version affiche d'avant ; joyeux, formes pas trop simples ; aucun doigt levé seul au milieu du poing (Cotice tient un livre, Giron fait un 👍 pouce au bord) ; avatar affiché en rond 60 / 80-100 px, garder mains et pièces loin du bord.
- **Pièges en cours** : le forfait de 10 cartes compte aussi les réponses d'Entraînement et de flash (borné par le plafond de 100 pansées/jour). Aucune séance d'élève depuis le 2026-10-18 : la boucle n'a jamais tourné sur de vrais élèves.
- **Worktree / branche** : aucun pour l'instant ; le générateur retenu (`gen.mjs` ; `gen2.mjs` = essai écarté) est dans le scratchpad de la session `palotins`.

## Décisions de David (2026-10-18)

1. Révision espacée : un forfait par séance de révision terminée, une fois par jour (l'effort, pas
   la réussite : les cartes sont auto-évaluées).
2. Constance Royale comptée en semaines : au moins 3 jours de travail dans la semaine.
3. Mots affichés : **Pansées** (l'XP) et **Tour de panse** (le niveau), validés le 2026-10-18.
4. Images : SVG d'abord, remplacées plus tard par des images faites par IA.
5. Forfait de révision précisé après revue (validé le 2026-10-18) : il tombe quand l'élève a révisé
   au moins 10 cartes dans la journée, ou quand il vide un paquet après en avoir révisé au moins 3.

6. Question d'accès n° 2 (2026-10-18) : oui, la PR 3 retire aussi à l'élève le droit de modifier
   directement ses séances de révision (`srs_review_sessions`) ; seul le serveur les écrit.

## Découpage

- **PR 1 (sans migration)** : gain visible en fin de séance, bonus de thème, forfait de révision,
  images SVG, mots du lore, test d'intégration de la boucle.
- **PR 2 (code, sans migration)** : toutes les écritures de `student_buddies` passent par le
  serveur (client service). Elle doit précéder la PR 3 : retirer le droit d'écriture de l'élève
  avant que le code ait cessé de s'en servir casserait le choix du Palotin en prod.
- **PR 3 (migration)** : colonnes de la Constance hebdomadaire (début de semaine, jours travaillés)
  et retrait des policies INSERT/UPDATE de l'élève sur `student_buddies`.
- **PR 4** : code de la Constance hebdomadaire (après `db:migrate` et `db:types`).

**Question d'accès tranchée par David le 2026-10-18** : oui aux deux changements. Personne ne gagne
de lecture (les colonnes nouvelles se lisent comme le reste de la ligne : l'élève, ses profs,
l'admin) ; l'élève perd le droit d'écrire directement sa ligne de Palotin, toutes ses actions
légitimes passant par le serveur. ⚠️ La PR 3 contient des `DROP POLICY` : aucune donnée perdue, mais
c'est un `DROP` → arrêt avant `db:migrate` pour l'expliquer à David.

## Constat de sécurité (2026-10-18, prod, lecture seule)

La policy « Students can update their own buddy » (UPDATE, `student_id = auth.uid()`, sans
`with check` ni restriction de colonnes) laisse un élève modifier lui-même `xp`, `level`,
`current_streak`, `palotin_type`, `change_count` (donc changer de Palotin sans payer les 50
gidouilles). Correction prévue en PR 2.

## Avancement

- [x] PR 1 — revue de code et audit de sécurité passés (aucun bloquant), corrections faites.
      Limite connue : le compte des 10 cartes lit `srs_card_stats.last_review`, que remplissent aussi
      les réponses d'Entraînement et de flash ; un élève qui a fait un Entraînement de 10 questions
      touche le forfait dès sa première carte de révision. Borné par le plafond de 100 pansées par jour.
      Reportés à la PR 2 : course lire-modifier-écrire de `addExploredThemes` (ajout à faire en SQL),
      policy UPDATE « own » de `srs_review_sessions` (`completed_at` remis à vide).
- [x] PR 2 — #1475, écritures au client service, verrou optimiste sur `updated_at`, route
      `api/student/buddy/xp` retirée.
- [x] PR 3 — #1476. Livrée en prod par `deploy:prod` v0.39.0 (2026-10-18, demandé par David), puis
      `db:migrate` le même jour avec l'accord de David sur les `DROP POLICY`. Vérifié en prod : seules
      les policies SELECT restent sur les deux tables ; 57 Palotins et la séance existante intacts ;
      colonnes `constance_*` à leurs valeurs par défaut. `db:types` dans la PR 4.
- [x] PR 4 — #1484, mergée le 2026-10-18, pas encore en prod. Constance Royale hebdomadaire. **Spécification validée par David le 2026-10-18** :
      semaine du lundi au dimanche (jour UTC) ; jour travaillé = jour où l'élève a gagné des pansées
      par le travail (Entraînement, Course, révision, énigme, évaluation) ; semaine tenue au 3e jour
      travaillé ; Constance = semaines tenues d'affilée (`current_streak` / `longest_streak`
      réutilisées, en semaines) ; la semaine en cours ne casse rien avant sa fin ; semaine finie
      sous 3 jours → 0, avec une réplique. Récompenses : +30 le jour où la semaine est tenue ;
      paliers 4 / 8 / 16 semaines → +50 / +100 / +300 hors plafond ; « premier travail du jour » +5
      inchangé ; le bonus quotidien de série (+15) et les paliers 7 / 14 / 30 jours disparaissent.
      Affichage : « Constance Royale : N semaines » et « Cette semaine : x jours sur 3 ».
      Points non spécifiés, validés par David le 2026-10-18 : +30 dans le plafond du jour ; un
      palier remplace les +30 de sa semaine (rien au-delà de 16) ; après une révision, un
      Entraînement le même jour ne reçoit plus le +5 « premier travail du jour ».
      Aussi : anciennes séries en jours remises à 0 sans réplique (toutes à 0 en prod le 2026-10-18,
      rien perdu) ; « x jours sur 3 » plafonné à 3 ; un palier est redonné si la Constance retombe
      puis remonte (comme l'ancien code pour 7 / 14 / 30 jours).
      **Code fait le 2026-10-18, corrigé après revue et audit** : logique pure
      `src/lib/utils/buddy-constance.ts`, `recordWorkedDay` / `resetLostConstance` (une écriture
      sous verrou), bonus `calculateConstanceBonus` (une panne après le crédit ne remonte jamais :
      le forfait de révision n'est pas relâché), layout élève, panneau et widget, répliques
      `streak_lost`, tableau prof sur la Constance affichée (`displayedConstance`),
      `getClassBuddies` (sans appelant) retirée, docs `buddy-palotins.md` et
      `coquille-et-caches.md`, motif du layout ajouté au filtre `nightly-integration.yml`.
