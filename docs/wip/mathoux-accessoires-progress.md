# Mathoux : gidouilles du travail et décorations de panse — journal

> Branches `feat/mathoux-accessoires` (lot A) puis `feat/mathoux-decorations` (lot B), worktree `../ubumaths-wt-mathoux-accessoires`. Démarré le
> 2026-10-24. Suite de [mathoux-sans-gidouille-progress.md](mathoux-sans-gidouille-progress.md) ;
> conception : [mathoux-conception.md § 4, étape 3](mathoux-conception.md).

## Reprendre ici

_Mis à jour le 2026-10-24, après #1704._

- **État** : lot A clos (en prod via migrations ; code au prochain `deploy:prod`). Lot B clos :
  migration #1699 (prod), code #1704 (sur `main`, pas encore en prod). Revue et audit sans bloquant,
  findings corrigés.
- **Prochaine action** : rien d'engagé. Suite possible : colliers (lot suivant, phase 0 à faire :
  règle pour la fraise du grand matou), puis versement du chantier dans `docs/systeme/mathoux.md`.
- **En attente de David** : vérification à l'écran de #1704 (`docs/wip/verifications-manuelles.md`) ;
  dire s'il veut les colliers ou clore le chantier.
- **Pièges en cours** : ids `s1-…` répétés au rendu serveur de plusieurs `MathouAvatar` ;
  `ConsentButton` exige un `Tooltip.Provider` ; la base locale n'a pas d'élève de démo.
- **Worktree / branche** : aucun (worktree supprimé après #1704).

## Constat (2026-10-24)

- Le travail mathématique ne rapporte **aucune** gidouille : Entraînement, révisions, fiches et
  Mathoux ne donnent que l'XP du Palotin (seule exception : +1 pour une erreur de fiche signalée).
- Jeux : 1 gidouille à la première victoire du jour, par jeu (démineur, énigmes, 2048, Mathémo).
- Prix de comparaison : tirage VIP 3, pouvoirs de jeu 5 à 40, changement de Palotin 50.
- Prod : 81 élèves, **aucune** ligne `student_mathoux`, aucun point réussi → rattrapage nul
  aujourd'hui (le mécanisme le fera de lui-même si des Mathoux naissent avant la livraison).
- Hors sujet, noté : achat VIP et changement de Palotin débitent sans ligne `gidouilles_activity` ;
  l'élève peut baisser son propre solde (policy de self-update) sans trace.

## Phase 0 — décisions de David (2026-10-24, recommandations validées)

### Lot A : les gidouilles récompensent le travail

- Une fois par étape franchie, jamais deux : naissance (chaton) **+3**, matou **+5**, grand matou
  **+10**, étoile de classe **+5**. Un Mathou qui s'endort, se réveille ou dont un point change de
  tagage ne repaie rien.
- **+2 par jour** quand le forfait de révision du jour est donné (lié au forfait du Palotin : pas
  de forfait, pas de gidouilles).
- Crédit côté serveur, ligne au journal des récompenses (« Ton Mathou … est devenu matou : +5 »).
  Crédit en échec : le Mathou grandit quand même, versement retenté au calcul suivant, jamais en
  double.
- **Rattrapage** : oui, une fois, annoncé par le Palotin (nul en prod aujourd'hui, voir constat).

### Lot B : décorations de panse

- Catalogue fixé dans le code : **6 décorations**, prix **10 / 20 / 40** (petite gidouille,
  cocarde, médaille de l'Ordre de la Grande Passoire, blason, étoile, cœur — à choisir sur une page
  de dessins ; pas de croissant, réservé au Lunaire).
- Achetée une fois, posable sur n'importe quel Mathou né, une par Mathou ; retrait ou changement
  gratuit. Silhouette : non ; sieste : la garde. Ni échange ni revente.
- Achat atomique côté serveur (solde vérifié, débité, décoration donnée d'un coup).
- **Accès** : l'élève voit les siennes, le prof celles des élèves de ses classes, les autres élèves
  rien. Écriture serveur seule. Export RGPD avec les Mathoux.
- Races à motif de panse, à trancher race par race sur la page de dessins. Penchant : smoking et
  marbré → par-dessus ; arlequin → losanges écartés ; Lunaire → croissant au front ou au cou, ou
  pas de décoration.
- Panse seule en v1. Colliers au lot suivant (règle à trouver pour la fraise du grand matou).
  **Pelages jamais vendus** (identité de la race).

### Lot B : comportements validés (2026-10-24)

- **Dessins** : cœur A (rouge) 10 · étoile B (rouge sur pastille crème) 10 · petite gidouille A
  (spirale noire sur pastille crème) 20 · cocarde A (à rubans) 20 · médaille A (à ruban) 40 ·
  blason A (rouge au chevron d'or) 40. Dessins dans `scripts/mathoux-planches/decorations.test.ts`.
  Smoking, marbré, arlequin : par-dessus ; Lunaire : dans le creux du croissant.
- **Une décoration orne UN SEUL Mathou à la fois** ; la poser ailleurs la déplace, gratuitement ;
  retrait gratuit ; une décoration au plus par Mathou.
- **Où** : achat et pose dans la Chatterie (bouton « Décorer » sur chaque Mathou né, les six
  dessinées sur CE Mathou, prix, « Achetée » / « Portée par … ») ; l'achat pose sur le Mathou
  choisi. **Et** une section « Décorations des Mathoux » dans l'onglet Boutique du Marché
  (`VipCardShopSection` à côté) : vitrine + lien « Décorer mes Mathoux », AUCUN achat là
  (le Marché peut être fermé : `check_marketplace_enabled`, la Chatterie reste la voie d'achat).
- Achat atomique : solde vérifié, débit, décoration donnée, ligne au journal (« Chatterie :
  cocarde achetée », −20). Solde insuffisant → refus, « Il te manque N gidouilles ». Déjà achetée →
  pas de second achat. Double clic → un seul débit. Ni échange ni revente.
- Refus : décoration inconnue, Mathou d'un autre élève ou pas né ; achat réservé aux élèves.
- Sieste : la garde ; silhouette : rien. Vue prof : décorations visibles.
- **Consentement** : comme la boutique VIP, sans consentement l'élève voit mais n'achète pas.
- Deux PR : migration (+ intégration, `db:migrate`, `db:types`), puis le code.

## Historique

- 2026-10-24 — #1685 (migration du lot A) mergée ; `db:migrate` + `db:types`. Revue de code et
  audit de sécurité : aucun bloquant ; corrigés : étoile en double, stade payé jamais en baisse.
- 2026-10-24 — #1689 : revue de code et audit ; David choisit (1b) +2 de révision sans condition
  de Palotin, (2b) plafond des étapes contre les réussites forgées (20 / 24 h glissantes,
  recommandation acceptée : « je te suis ») ; +2 réservé aux élèves.
- 2026-10-24 — audit de la migration du plafond : aucun bloquant. Preuve du verrou `profiles` :
  sans lui (copie de travail, `pg_sleep(0.3)` ajouté pour élargir la course), le test « deux
  versements simultanés » est rouge (36 au lieu de 18) ; vert avec la migration réelle.
- 2026-10-24 — #1689 mergée ; `db:migrate` du plafond, droits vérifiés en prod. Lot A clos.
- 2026-10-24 — lot B : page de dessins publiée (6 décorations en deux versions chacune, prix
  proposés 10 cœur et étoile / 20 gidouille et cocarde / 40 médaille et blason ; options des races
  à motif). Rendus tirés du vrai `MathouAvatar` par `scripts/mathoux-planches/decorations.test.ts`
  (`PLANCHE=1`, sauté sinon).
- 2026-10-24 — choix de David sur la page (lus dans sa base) : cœur A (rouge) 10, étoile B (rouge
  sur pastille crème) 10, petite gidouille A (spirale noire sur pastille crème) 20, cocarde A (à
  rubans) 20, médaille A (à ruban) 40, blason A (rouge au chevron d'or) 40. Races à motif :
  smoking, marbré, arlequin → par-dessus ; Lunaire → dans le creux du croissant (centre
  `waistY - 4 - moon × 0,12`, échelle × 0,9).
- 2026-10-24 — « Où acheter » : j'avais affirmé à tort qu'il n'y avait pas de boutique ; il y a
  l'onglet Boutique de `/dashboard/student/marketplace`. David choisit les deux (Chatterie +
  vitrine Boutique). Comportements de phase 0 validés, consentement compris.
- 2026-10-24 — PR 1 du lot B : migration des décorations. Garanties tenues par la base (clé
  composée « achetée par CET élève », index unique partiel « un seul Mathou ») ; verrou `profiles`
  comme le lot A (double clic = un seul débit, prouvé par deux appels simultanés) ; achats en
  lignes négatives « Chatterie : … », hors plafond (qui ne compte que les positives). Preuve
  rouge : 23/23 échouent sans la migration, 23/23 verts avec ; suites mémoire, étapes, vue prof,
  collection : 74 verts.
- 2026-10-24 — revue (Sonnet) et audit (Opus) de #1699 : aucun bloquant. Corrigés : `search_path`
  des fonctions DEFINER finit par `pg_temp` (garde CI `definer-guard`), rollback complet (catalogue),
  assertion « Élève introuvable » ; tests ajoutés : un achat ne libère pas le plafond, catalogue
  refusé aux clients connectés. Rollback rejoué en local puis migration : 25 + garde verts.
- 2026-10-24 — #1699 mergée (CI verte) ; `db:migrate` depuis le dépôt principal (seule cette
  migration en attente, vérifié au `--dry-run`) ; droits relus en prod ; `db:types` sur la branche
  de la PR 2 (table ajoutée au domaine Mathoux de `generate-db-doc.ts`).
- 2026-10-24 — PR 2 du lot B : code des décorations (catalogue TS + test d'égalité avec la base,
  dessins dans `MathouAvatar`, mémoire, routes, « Décorer », vitrine, vue prof, export RGPD).
  Consentement exigé à l'achat seulement (la pose est gratuite et ne porte que l'acheté). Base
  locale sans élève de démo : vérification à l'écran laissée à David.
- 2026-10-24 — revue (Sonnet) et audit (Opus) de #1704 : aucun bloquant. Corrigés : libellé
  « Retirer … de le Mathou », majuscule du toast, refus (404/409) qui rechargent la page, boutons
  jamais bloqués, décoration sur la carte de fin de séance (schéma Zod du résumé compris), routes
  au registre du client service, limite de 30 achats ou poses par minute. #1704 mergée, CI verte.
