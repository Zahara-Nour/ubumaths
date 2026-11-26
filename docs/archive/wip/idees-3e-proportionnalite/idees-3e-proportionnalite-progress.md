# Chantier `idees-3e-proportionnalite`

## Reprendre ici

_Mis à jour le 2026-11-26 : rubrique publiée, chantier clos._

- **État** : 10 variations ajoutées (ccb51039 +4, 76f5f143 +4, 8b59ca4b +2 ; #3190, `db:migrate`
  fait, prod vérifiée : 7, 7 et 4 variations). Séries de relecture `407d9009…` (3e) et
  `5aeb1fbc…` (2de, 8b59ca4b n'est pas classé en 3e) (#3192). Relecture validée par David.
  Rubrique « publiée » dans le tableau de répartition, réservations levées, journal et relevé
  archivés.
- **Reste** : rien.

### 2026-11-26 — prod vérifiée, séries, relecture validée

- `db:migrate` lancé par David ; MCP : ccb51039 7 variations, 76f5f143 7, 8b59ca4b 4.
- Deux séries (le script refuse un modèle hors du niveau de la série) : simulation verte, `--publier`
  lancé par David, identifiants commités (#3192).
- David : « je valide les modèles ». Rubrique « publiée », réservations levées, archivage.

## Relevé (2026-11-26)

3 exercices (3P10, 3P10-1, 3P10-2). Points de 3e : 3-036 (ccb51039), 3-063 (76f5f143), 3-068
(290dcf6f), 3-069 (24f7a007). Évolutions répétées et valeur initiale : Seconde (2-377, 2-378).
Question d'accès des migrations à venir : personne ne gagne d'accès (variations ajoutées à des
modèles publiés).

Page à cocher de la phase 0 : https://claude.ai/artifact/PBW2yeJzeVqpg8Fiqcbkya

## Fiches de la phase 0 (copie de la page à cocher)

Chaque variation aura ses `testSpecs` (réponses justes sous plusieurs écritures, erreurs typiques
refusées), trois erreurs prévues par case et un coup de pouce qui ne donne pas la réponse.

### V1 — « De combien de pour cent ? » à partir des deux valeurs (1 variation à ccb51039, 1 à 76f5f143)

- **Chez eux** : 3P10, « exprimer la variation en pourcentage » (prix, effectif, facture, population).
- **Chez nous** : une case `? %`. En 3e, on ne part que du coefficient (v3) ; ici on part des deux valeurs.
- **Point** : 3-036 / 3-063 (inchangés).
- **Variations** : contexte tiré (prix 20 à 300 €, t multiple de 5 jusqu'à 50 ; collège de 400 à 1 200 élèves, t de 2 à 10 ; ville de 10 000 à 90 000 habitants, t de 5 à 30), valeurs choisies pour un résultat entier.
- **Réponse** : t. Erreurs prévues : b − a (variation absolue), b ÷ a (le coefficient), 100 × b ÷ a (112 au lieu de 12).

### V2 — Appliquer une évolution hors des prix, taux non ronds (1 variation à ccb51039, 1 à 76f5f143)

- **Chez eux** : 3P10, « valeur finale » : effectif d'un collège, population, facture, t de 1 à 12.
- **Chez nous** : une case, nombre entier (élèves, habitants) ou décimal (€).
- **Point** : 3-036 / 3-063 (inchangés).
- **Variations** : collège (t de 1 à 11, effectif multiple de 100), ville (t de 5 à 30, multiple de 1 000), facture (t de 1 à 12, 700 à 1 400 €).
- **Réponse** : a × (1 ± t/100). Erreurs prévues : a ± t, a × t/100 (la variation seule), a × 1,t (7 % lu 1,7).

### V3 — Taux à un chiffre et taux au-delà de 100 % (2 variations à ccb51039, 2 à 76f5f143)

- **Chez eux** : 3P10-1, t de 1 à 190, dont 3 %, 17 %, 23 %.
- **Chez nous** : mêmes consignes que v1 et v3 des modèles.
- **Point** : 3-036 / 3-063 (inchangés).
- **Variations** : taux → coefficient (augmentation : t de 1 à 9, ou 110 à 190 ; diminution : t de 1 à 9, ou deux chiffres non multiples de 5) ; coefficient → taux (1,01 à 1,09 et 1,1 à 2,9 ; 0,91 à 0,99 et 0,77, 0,64…).
- **Réponse** : décimal ou t. Erreurs prévues : 1,3 pour + 3 %, 0,3 ou 0,07 pour − 7 % ; 40 pour × 1,04, 1,5 pour × 2,5.

### V4 — Évolution répétée : valeur au bout de n ans (2 variations à 8b59ca4b, Seconde)

- **Chez eux** : 3P10-2, salaire, capital, espèce protégée, population mondiale, n années au même taux.
- **Chez nous** : hors 3e (évolutions successives = Seconde). Deux cases : coefficient global, puis valeur arrondie.
- **Point** : 2-378 (inchangé).
- **Variations** : hausse (salaire ou capital de 1 000 à 2 000 €, t de 1 à 5 %, n de 3 à 6, au centime) ; baisse (population de 300 à 1 300, t de 4 à 16 %, n de 3 à 6, à l'unité).
- **Réponse** : (1 ± t/100)ⁿ, puis la valeur. Erreurs prévues : a × (1 + n t/100) (taux additionnés), a × n × (1 + t/100), (1 + t/100) × n.

### R — Ce que je ne reprends pas

- Valeur initiale (3P10) : 1c443c35 en Seconde (2-377), hors bornes de 3e.
- Pourcentage signé « +23 % » (3P10-1) : n'apporte rien à « l'augmenter de ? % ».
- Questions en trois étapes (3P10-2) : le coup de pouce joue ce rôle.

### Q1 — Les variations V1 à V3 vont sur des modèles aussi de 4e : d'accord ?

ccb51039 et 76f5f143 portent les niveaux 4e et 3e. Les élèves de 4e verront les nouvelles variations.
Le taux d'évolution est travaillé au cycle 4 (BO de Seconde, § information chiffrée) et d727be44 fait
déjà le coefficient à partir des deux prix en 4e. Recommandation : oui.

## 2026-11-26 : lot écrit, migration de contenu

- Export de prod des 3 modèles (`scripts/export-question-templates.ts`) dans
  `scripts/questions/idees-3e-proportionnalite-publies/` ; script
  `docs/wip/questions/idees-3e-proportionnalite-publies.py` (repart de l'origine : 3 / 12, 3 / 11,
  2 / 15 variations / specs).
- ccb51039 et 76f5f143 : v4 « de quel pourcentage ? » (prix, collège, ville), v5 appliquer une
  évolution (collège, ville, facture), v6 taux → coefficient (1 à 9 %, 110 à 190 % ; baisse : 1 à
  9 % et deux chiffres non multiples de 5), v7 coefficient → taux. 8b59ca4b : v3 hausse (salaire
  ou capital, au centime), v4 baisse (espèce protégée, à l'unité), deux cases chacune.
- Écart aux fiches, assumé : l'erreur « 7 % lu 0,7 » ne vaut que pour un taux à un chiffre ; au-delà
  (V2, taux de baisse V3), la troisième erreur prévue devient l'évolution dans le mauvais sens
  (V2), ou le pourcentage non converti (taux de baisse V3, « 77 » pour − 23 %).
- Tirages écartés : − 50 % d'un prix en V1 (l'erreur « valeur finale en % » vaudrait la réponse).
- `question:specs` : 72 / 67 / 31 specs vertes, 1 400 / 1 400 / 800 tirages réussis. Chaque
  réponse fausse des specs déclenche bien son message d'erreur prévue (relevé par
  `runTestSpec`, aucune sans message).
- Essai local : copies en brouillon « (essai local) » et « (essai local, ajouts) » (nouvelles
  variations seules) ; `pnpm voir` de l'aperçu admin : ville « 54 000 habitants », collège,
  facture, salaire et espèce protégée à deux cases, taux et coefficients ; 0 erreur de console.
- `migration-contenu.ts` : +4, +4, +2 variations ; test d'intégration vert ; preuve rouge
  (migration vidée → 5 échecs, tous sur elle), fichier restauré d'une copie.
- #3190 mergée le 2026-11-26 (CI verte). `db:migrate` refusé à la session (écriture en prod) : laissé à David.
