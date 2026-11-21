# Chantier `idees-format` — journal

Mettre en œuvre les idées retenues dans [idees-format-exercices.md](idees-format-exercices.md)
(« Les 5 meilleures idées », « Décisions de David »). Ordre : idée 1, puis 2 à 5, puis revue du lot
« nombres et calculs » de Seconde.

## Reprendre ici

_Mis à jour le 2026-11-21, après #2960._

- **État** : idée 1 terminée (#2954, #2955). Idée 2 terminée : choix des variations dans le
  panier (#2958) et dans l'éditeur d'une série enregistrée (#2960).
- **Prochaine action** : idée 3, les erreurs prévues avec leur message (voir
  [idees-format-exercices.md](idees-format-exercices.md)) : phase 0 à écrire et faire valider.
- **En attente de David** : rien (pas de `deploy:prod` demandé).
- **Pièges en cours** : test d'intégration local bloqué par des données d'une autre session
  (`class_journal_share_tokens`), la CI fait foi ; le worktree `automaths-serie` touche aussi le
  panier.
- **Worktree / branche** : aucun ; à créer pour l'idée 3.

## Idée 1 — phase 0 validée (David, 2026-11-21)

**Q1. Retrouver la question plus tard → choisir la graine** (option A, validée). On n'impose pas
la variation : la variation est le premier tirage de `generateInstance`, on essaie donc les graines
suivantes jusqu'à tomber sur la variation voulue. La graine seule redonne la question partout
(évaluation, erreurs rejouées dans les statistiques, fiches) : ni migration ni colonne.
Défaut compensé (question de David) : l'instance porte `selectedVariationIndex` ; `variationOfSeed`
lit la variation d'une graine sans générer ; un test verrouille l'accord des deux.

**Q2. Pas assez de questions différentes → jamais de répétition** (David : « je n'aime pas l'idée
de remettre les mêmes questions »). Proposition de David : vérifier le nombre quand le prof le
choisit et proposer de l'abaisser. Puis David a suivi mes recommandations (« je suis tes recos ») :
vérification **dans le panier seulement** (pas côté serveur) ; si le modèle a changé après coup, la
ligne est **raccourcie** au moment de jouer la série.

**Q3. Doublon = « b + a »** (validé) : mêmes nombres tirés (variation + variables) **ou** même
énoncé affiché (choix d'un QCM triés). Deux calculs de même réponse (« 12 × 5 », « 15 × 4 ») ne sont
pas un doublon (David). « 2 + 3 » et « 3 + 2 » peuvent sortir tous les deux. Précision
d'implémentation, dite à David : l'empreinte des nombres n'est pas utilisée quand l'énoncé tire
lui-même (`{{carré|rectangle}}`), sinon sa ligne tomberait à une question.

## Idée 2 — phase 0 validée (David, 2026-11-21)

David a suivi mes recommandations sur Q1 à Q4 (« je te suis ») : exemple par variation (A),
panier + éditeur, numéros disparus ignorés (toutes s'il n'en reste aucun), révision espacée sur le
modèle entier.

Mesuré en prod (modèles publiés) : 468 à une variation, 678 à deux, 755 à trois, 473 à quatre,
266 à cinq ou plus (126 au plus). Une variation n'a **pas de nom** aujourd'hui.

Ce qui ne change pas : grâce à l'idée 1, la variation se lit dans la graine. Une évaluation qui
régénère sa copie retrouve donc la bonne question sans rien de plus : ni migration ni colonne. Le
choix s'ajoute à la ligne de série (champ facultatif, absent = toutes les variations), là où elle
vit déjà : série enregistrée, panier, lien partagé, évaluation.

**Comportements**

- Nominal : sur une ligne d'un modèle à plusieurs variations, le prof voit chaque variation avec un
  exemple de question et une case cochée ; il décoche « (ax + b)² − c² », la série ne tire plus que
  dans les autres, réparties à parts égales (idée 1).
- Nominal : un modèle à une seule variation ne montre rien de neuf.
- Limite : « Ce modèle n'a que N questions différentes » (#2955) compte dans les variations cochées
  seulement.
- Limite : toutes cochées = comme aujourd'hui ; le champ n'est pas enregistré.
- Erreur : on ne peut pas tout décocher (la dernière case reste cochée).

**Questions**

- **Q1. Comment le prof reconnaît une variation ?** A (reco) : un exemple de question tiré de
  chaque variation, à côté de sa case. B : l'auteur donne un nom à chaque variation (« forme
  développée », « avec un carré ») ; les 2 200 modèles actuels n'en ont pas, il faudrait un repli.
  C : A tout de suite, un nom facultatif plus tard.
- **Q2. Où le prof choisit-il ?** Reco : dans le panier et dans l'éditeur d'une série enregistrée ;
  le lien partagé et l'évaluation suivent ce qui est choisi.
- **Q3. L'auteur modifie le modèle après coup** (variation retirée ou déplacée). Le choix est
  enregistré par numéro de variation. Reco : un numéro qui n'existe plus est ignoré ; s'il n'en
  reste aucun, la ligne repart sur toutes les variations. Défaut : si l'auteur inverse deux
  variations, la série tire l'autre sans le dire (comme un modèle modifié aujourd'hui).
- **Q4. La révision espacée** (qui reprend les modèles des séries d'un chapitre) tient-elle compte
  du choix ? Reco : non, elle revoit le modèle entier.

## PR 1 — tirage (#2954, mergée le 2026-11-21)

- `src/lib/questions/series-draw.ts` : `variationOfSeed`, `questionFingerprints`,
  `drawLineQuestions` (tours mélangés de variations, 50 essais par variation avant de la dire
  épuisée), `distinctQuestionCount` (graine fixe).
- `series-items.ts` : une graine par **ligne** (plus par question), d'où sortent celles de ses
  questions ; `drawSeriesQuestions` génère et rend l'instance ; `buildSeriesItems` s'appuie dessus.
- `evaluation-attempts.ts` : utilise l'instance du tirage (plus de seconde génération).
- Conséquence : un lien « Mêmes nombres pour tous » envoyé avant la mise en prod donnera d'autres
  questions après (même effet qu'un modèle modifié).
- Tests : `series-draw.test.ts` (18, vrai générateur ; vérifiés rouges sans répartition, sans
  refus des doublons, sans la précaution des tirages dans le texte, sans le tri des choix).
- Relecture (`code-reviewer`, Sonnet) : aucun bloquant. Corrigé : variations épuisées retenues pour
  les lignes suivantes du même modèle (coût), échec de génération journalisé par le logger serveur
  en évaluation. Accepté : une variation presque vidée peut être dite épuisée à tort (~1 %).

## PR 2 — avertissement du panier (2026-11-21)

- `series-draw.ts` : `distinctLimit(template, quantity, generate)` rend N quand la quantité dépasse
  les N questions différentes, sinon `null`. Cache par modèle (`WeakMap`) : modèle épuisé jamais
  recompté, quantité déjà atteinte non plus ; un `+` au-delà relance un compte plus loin.
- `CartQuestionCard` : « Ce modèle n'a que N questions différentes. » (« qu'une question. » pour 1),
  bouton « Passer à N » (`questionCart.updateQuantity`). Icône `CopyX` en `text-warning`.
- Panier seulement (décision Q2) : l'éditeur de série n'avertit pas, le tirage raccourcit.
- Tests : 3 de `distinctLimit` (vérifiés rouges avant l'écriture), 3 de la tuile (rendu, singulier,
  rien quand assez).
- Relecture (`code-reviewer`, Sonnet) : bloquant corrigé, une génération en échec donnait « Passer à
  0 » (le clic retirait la ligne) → échec = pas d'avertissement, rien en cache. Corrigé aussi :
  recherche au moins deux fois plus loin (monter de 1 à 99 recomptait à chaque pas), `role="status"`,
  bouton nommé « Passer à N répétitions ». Laissé : focus perdu après le clic (le bouton disparaît).

## PR 3 — variations choisies : schéma, tirage, panier (#2958, mergée le 2026-11-21)

- `validation/series.ts` : `variations?` sur une ligne (`itemVariationsSchema` : numéros distincts,
  1 à 200, rangés ; absent = toutes). Ni migration ni colonne : la ligne est déjà du JSON.
- `series-draw.ts` : `allowedVariations` (Q3), répartition parmi les variations permises,
  `distinctLimit` compté par choix, `variationExample` (exemple à graine fixe, Q1).
- `series-items.ts` : passe `item.variations` au tirage (évaluation comprise).
- Panier : `setVariations`, choix gardé par une fusion (comme la durée) et par un lien ;
  `VariationPicker` dans la tuile, prof seulement ; l'aperçu montre la 1re variation choisie.
- Révision espacée : rien à faire, elle ne lit que le modèle de la ligne (Q4).
- Tests : 12 de tirage / schéma / panier vérifiés rouges avant le code ; 6 du sélecteur, 2 de la
  tuile.
- Relecture (`code-reviewer` Sonnet + `security-auditor` Opus) : aucun bloquant. Ajouté : test de
  deux lignes d'un même modèle à choix différents. Assumé : une fusion de panier garde le choix de
  la ligne déjà là (comme la durée) ; l'élève qui ouvre un lien restreint ne voit pas le choix ;
  un élève peut fabriquer un lien restreint à la variation facile (série libre, sans enjeu).

## PR 4 — variations choisies dans l'éditeur d'une série (2026-11-21)

- `server/question-template-columns.ts` : colonnes du modèle sans les cas de test, sorties de
  `/api/questions/templates/all` (garde de compilation comprise), partagées avec l'éditeur.
- `series/[id]/edit/+page.server.ts` : modèles publiés de la série lus complets (`mapDbTemplateToForm`)
  au lieu de titre et niveau ; `+page.svelte` : `VariationPicker` sur chaque ligne d'un modèle
  publié, choix écrit dans la copie de travail (absent = toutes, la clé est retirée).
- Tests : `variations.svelte.test.ts` (3, vérifiés rouges avant le code) : choix affiché, rien pour
  un modèle à une variation, décocher enregistre, tout recocher retire le choix.
- Relecture (`code-reviewer`, Sonnet) : aucun bloquant. Corrigé : le sélecteur sur sa propre ligne
  (`w-full`, comme les marques de durée). Mesuré (prod, 2 644 modèles publiés, taille en base) :
  3,3 Ko en moyenne, 17 Ko au 99e centile, 127 Ko au plus → poids accepté (une série a au plus 50
  lignes ; le panier charge déjà tout le catalogue). Laissé : chargeur sans test propre (mêmes
  colonnes et même conversion que le catalogue).
