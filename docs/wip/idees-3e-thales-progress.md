# Chantier `idees-3e-thales`

## Reprendre ici

_Mis à jour le 2026-11-27, gros lot écrit (PR 1)._

- **État** : lot écrit sur `feat/idees-3e-thales` (§ Lot) : 4 variations de modèles publiés,
  2 corrigées (Q1), 3 modèles neufs, migration de la notion « Agrandissement et réduction » et
  migration de contenu. Specs vertes, essai en base locale, rendu vu dans Chrome.
  · **Prochaine action** : PR 1, merge, `db:migrate` (notion + contenu), puis David crée les
  brouillons en prod ; PR 2 = ids + migration de rangement ; relecture dans `/dev/modeles`
  · **En attente de David** : `create-questions --publier` en prod après le merge de la PR 1
  · **Pièges en cours** : la migration de rangement exige la notion EN PROD (lue par le script)
  · **Worktree / branche** : `../ubumaths-wt-idees-3e-thales`, `feat/idees-3e-thales` (l'ancienne
  branche distante `docs/idees-3e-thales` reste à supprimer).

## Phase 0 (2026-11-27)

Page à cocher de la phase 0 : https://claude.ai/artifact/Gdn231kS4AFMy74j7JJgTc (collection `verdicts`).

Rubrique « Théorème de Thalès » de 3e, 10 exercices (3G20 à 3G24-2). Nos modèles : f55d07b0
« Calculer une longueur avec Thalès » (3-060), 034e6b74 « Écrire l'égalité de Thalès » (3-059),
16478dab « Reconnaître une configuration de Thalès » (3-022), tous trois sous « Théorème de Thalès >
calcul de longueurs » ; 37c13d51 « Réciproque et contraposée de Thalès » (3-055), sous
« réciproque ».

Bornes : emboîtés et papillon seulement. Cinq exercices sont **hors programme** :
l'agrandissement et la réduction (3G22, 3G22-1), absents du BO de cycle 4, et les triangles
semblables et égaux (3G23, 3G24-1, 3G24-2), que les bornes excluent (« aucun point ne doit les
générer »).

Question d'accès de la migration : **personne** ne gagne de lecture (on range et on tague des
modèles de questions, et on ajoute des variations à des modèles publiés).

Chaque variation aura ses `testSpecs`, trois erreurs prévues par case saisie et un coup de pouce
sans la réponse.

## Décisions de David (2026-11-27)

Réponse dans la conversation (la page à cocher est restée vide) : « je valide tes recos, en
gardant les modèles qui seraient hors programme, comme d'habitude ».

- V1, V2, N1 : oui. R : rien.
- H1 : oui, sans point. Q2 : nœud neuf « Géométrie > Agrandissement et réduction » (notion sans
  sous-notion), créé par une migration à part, avant la migration de rangement.
- H2 : **gardé** (« en gardant les modèles hors programme »), alors que je recommandais non. Je
  le lis comme un modèle sans point sous « Géométrie > Triangles semblables » (nœud existant,
  vide). Je n'en reprends que les longueurs (3G24-2) et les côtés homologues (3G24-1), pas les
  triangles égaux sur quadrillage (3G23) : fiche à compléter si David le veut.
- Q1 : oui. v1 et v2 de 37c13d51 passent au choix à quatre réponses. L'ordre d'origine des
  choix garde 0 = parallèles (réciproque) et 1 = pas parallèles (contraposée) : les réponses
  déjà données (indices d'origine) gardent leur sens.
- Q3 : oui, plus tard (entrée dans `outils-manquants.md`).

## Fiches de la phase 0 (copie de la page à cocher)

### V1 — Côté du grand triangle en papillon (2 variations de f55d07b0, 3-060)

- **Chez eux** (3G20) : papillon par défaut ; on calcule MN et CB, et CB est un côté du grand
  triangle qu'on obtient depuis le petit.
- **Chez nous** : f55d07b0 ne calcule un côté du grand triangle qu'en emboîtés (v4). On ajoute le
  papillon, une case par question (notre règle), avec la figure du modèle.
- **Variations** : v6 papillon, on donne AM, AB, MN, on calcule BC = MN × AB ÷ AM ; v7 papillon,
  on donne AM, AB, AN, on calcule AC = AN × AB ÷ AM. Mêmes plages que v3 (AB de 4 à 12, AM de 2 à
  11, MN ou AN de 2 à 10), résultat au centième au plus.
- **Erreurs prévues** : le rapport inversé (MN × AM ÷ AB), la différence ajoutée (MN + AB − AM),
  la division oubliée (MN × AB).

### V2 — Réciproque : longueurs à calculer d'abord (2 variations de 37c13d51, 3-055)

- **Chez eux** (3G21, niveau 2) : on donne AB, AC, BM, CN ; il faut d'abord calculer AM et AN
  (soustraction en emboîtés, addition en papillon), puis comparer les rapports.
- **Chez nous** : 37c13d51 donne toujours AM et AN. On ajoute l'étape de calcul.
- **Variations** : v3 emboîtés (A, M, B dans cet ordre) : AB, MB, AC, NC donnés ; v4 papillon (M,
  A, B dans cet ordre) : MB, AB, NC, AC donnés, AM = MB − AB. Une fois sur deux, les rapports
  diffèrent (AN faussé de 0,1 à 0,3, comme v1).
- **Réponse** : pas de Oui / Non qui laisse une chance sur deux (fait vérifié du § 5 de
  `couvrir-un-niveau.md`). Choix à quatre réponses : « parallèles, d'après la réciproque du
  théorème de Thalès », « pas parallèles, d'après la contraposée », « parallèles, d'après le
  théorème de Thalès », « pas parallèles, d'après la réciproque ». Le BO demande de connaître la
  réciproque **et** la contraposée : le choix juge les deux. Voir Q1 pour v1 et v2.

### N1 — Résoudre un problème avec Thalès (modèle neuf, 3-060)

- **Chez eux** (3G20-1) : problèmes en deux temps. Le parallélisme se déduit (deux perpendiculaires
  à une même droite), ou la longueur cherchée demande une soustraction après Thalès.
- **Chez nous** : rien. Nos énoncés donnent le parallélisme, et la longueur cherchée sort
  directement de l'égalité. Modèle neuf sous « calcul de longueurs », niveau suivant ceux de la
  sous-notion, une case, figure codée (angles droits).
- **Variations** : v1 triangles rectangles imbriqués : A, E, D alignés, A, B, C alignés, (EB) et
  (DC) perpendiculaires à (AD) ; AE, AD, EB donnés ; DC = EB × AD ÷ AE. v2 rectangle ABCD,
  M sur [AB], N sur [AD], (MN) parallèle à (BD) ; AB, BC, AM donnés ; ND = BC − AM × BC ÷ AB (AD =
  BC, propriété du rectangle). v3 emboîtés : AM, AN, NC donnés, BC inutile ; MB = AM × (AN + NC) ÷
  AN − AM. Longueurs entières de 2 à 12, résultat au dixième au plus.
- **Erreurs prévues** : la longueur intermédiaire donnée à la place (AN au lieu de ND, AB au lieu
  de MB), le rapport inversé, la différence ajoutée.

### R — Ce que je ne reprends pas

- 3G20-2 (écrire la double égalité) : 034e6b74 la fait choisir. Leur saisie de texte est notée en
  Q3.
- 3G20DNB0 (sujet de brevet) : chaque étape a déjà son modèle ; la rubrique « Sujets de brevet »
  (3Z1) se fait en dernier.

### H1 — Agrandissement et réduction : aires et volumes (hors programme, sans point)

- **Chez eux** (3G22-1, 3G22) : rapport k ; aire de l'image (k²), volume de l'image (k³), k depuis
  deux longueurs ; aire ou volume de départ. Sections de pyramide et de cône (3G22).
- **Hors programme** : l'agrandissement est absent du BO de cycle 4 (`outils-manquants.md` § 2) ;
  les sections de 3e se limitent au pavé, au cylindre et à la boule (3-020).
- **Ma recommandation** : oui, rangé **sans point**, comme en Seconde et pour l'arithmétique de 3e.
  4 variations tirées de 3G22-1 : aire de l'image, volume de l'image, k depuis deux longueurs, aire
  de départ. k = n/10 (n de 2 à 30, n ≠ 10), résultats exacts. Pas de section de pyramide ou de
  cône (3G22) : trop loin du programme. Nœud : voir Q2.
- **Erreurs prévues** : k au lieu de k² (ou k³), k² pour un volume, la multiplication au lieu de
  la division (aire de départ).

### H2 — Triangles semblables, triangles égaux (hors programme)

- **Chez eux** (3G23, 3G24-1, 3G24-2) : homologues, semblables ou non, longueurs dans des
  triangles semblables ; où placer M pour que deux triangles soient égaux.
- **Ma recommandation** : **non**. Les bornes excluent les triangles semblables en toutes lettres
  (« aucun point ne doit les générer »), et le calcul de longueurs proportionnelles est déjà
  couvert par Thalès. Le nœud « Géométrie > Triangles semblables » existe en base, vide.

### Questions

- **Q1** : passer aussi v1 et v2 de 37c13d51 (aujourd'hui Oui / Non) au choix à quatre réponses de
  V2 ? Je recommande **oui** : même règle, et le modèle garde une seule forme.
- **Q2** (si H1 oui) : où ranger H1 ? Je recommande un **nœud neuf** « Géométrie > Agrandissement
  et réduction », sans sous-notion. L'autre choix : « Grandeurs et mesures > Volumes ».
- **Q3** : noter dans `outils-manquants.md` une case « égalité de rapports de longueurs »,
  jugée à l'ordre des lettres, à l'ordre des rapports et à l'inversion près (3G20-2 : écrire
  l'égalité au lieu de la choisir) ? Je recommande **oui, plus tard**.

## Lot (2026-11-27)

Scripts : `docs/wip/questions/idees-3e-thales-publies.py` (repart de l'export de prod commité,
fbdc2a782a) et `docs/wip/questions/idees-3e-thales-neufs.py` ; outils communs
`idees_3e_thales_outils.py`. Décisions d'écriture en tête de chaque script.

- **f55d07b0** (V1) : v5 BC et v6 AC en papillon, trois erreurs prévues chacune (rapport
  renversé, même différence ajoutée, division oubliée), coup de pouce.
- **37c13d51** (V2, Q1) : v0 et v1 passent au choix à quatre réponses mélangées (indices d'origine
  0 et 1 inchangés), corrigé « pourquoi pas le théorème », coup de pouce ; v2 emboîtés et v3
  papillon avec MB et NC donnés.
- **N1** « Résoudre un problème avec Thalès » (3-060, niveau 2) : triangles rectangles imbriqués,
  rectangle et diagonale (ND), MB à déduire de AB.
- **H1** « Agrandissement et réduction : aires et volumes » (sans point, notion neuve) : k², k³,
  k depuis deux longueurs (deux erreurs prévues seulement), aire de départ.
- **H2** « Triangles semblables : côtés homologues et longueurs » (sans point) : deux longueurs,
  côté homologue (choix de trois côtés).
- **Notion neuve** (migration 20261127110709) : nom anglais « Enlargement and reduction »,
  Mathou « Maquette » (non relu par David, validé par défaut comme les autres). Gardes mises à
  jour : copie figée de l'arbre, `later-migrations.ts`, test des noms anglais, compte des Mathoux.
- **Migration de contenu** 20261127111236 (générée), fixture rejouée verte.
- Outil manquant n° 68 (Q3) noté sur main.

Vérifications : `question:specs` vert sur les 5 fichiers (tirages 300 à 900), `sonde-figures`
0 problème, `create-questions` en simulation, lot publié en base locale (ids restaurés), rendu des
figures N1 et du choix de 37c13d51 vu dans Chrome. Tests d'intégration : arbre des notions rouge
sans la migration de la notion, vert avec ; 8 suites de l'arbre vertes ; contenu publié vert.
