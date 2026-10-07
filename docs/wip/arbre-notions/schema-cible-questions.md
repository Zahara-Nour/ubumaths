# Schéma cible ADR 0020 — questions pour la phase 0

> Créé le 2026-10-07, à l'issue du tour complet des programmes (136 notions,
> 537 sous-notions). Ce document recueille les **questions à trancher par David** avant
> d'écrire la spécification du schéma cible (phase 0 TDD : comportements en français,
> validés, PUIS tests, PUIS SQL). Il consigne aussi les acquis déjà tranchés, pour que la
> spec ne les re-discute pas.

## Acquis (tranchés, la spec les applique sans question)

- **Un point = un nœud** de l'arbre (notion ou sous-notion, jamais une branche), rattachement
  obligatoire ; une puce du BO qui couvre deux nœuds se scinde en deux points (règle de
  scission, pratiquée dans les onze docs d'écarts).
- **Le point porte son grade** (aujourd'hui porté par le thème).
- **`curriculum_point_automatismes(point_id, grade)`** (en prod depuis le 2026-08-30, vide)
  porte les listes d'automatismes, avec la **contrainte de parcours** (précision de David du
  2026-10-07) : le point référencé appartient aux années précédentes du parcours du grade ou
  au même programme — jamais à une voie parallèle (`1_GEN` ↛ `1_SPE`).
- **⚠️ Terminologie — pas de « régime automatisme »** : la valeur `automatisme` de
  l'ex-`knowledge_type` a été **supprimée le 2026-08-30**
  (`20260830080000_regime_acquisition_et_listes_automatismes.sql`) précisément parce qu'elle
  confondait la mesure et la provenance. Un contenu neuf né d'une rubrique Automatismes
  (ex. l'indice de base 100, Tle techno) = un **point ordinaire, auto-référencé dans la
  liste d'automatismes de son propre grade** ; son régime d'acquisition reste un choix de
  prof. Les régimes existants suffisent : **`fluence`** (≥ 5 réussites ET ≥ 3 sur les 5
  dernières) et **`diversite`** (≥ 2 modèles distincts ET aucun échec sur les 3 dernières),
  appliqués par `update_student_point_state` → `student_point_state`.
- **Attributs reconduits tels quels** : `name`, `code`, `kind` (connaissance / savoir_faire /
  demonstration), `exigence` (attendu / approfondissement), `regime_acquisition`
  (fluence / diversite, défaut diversite), `display_order` (ordre du BO), `archived_at`
  (un point de programme réformé s'archive, ne se supprime pas — les acquisitions d'élèves
  y tiennent).
- **Premier seed : la 6e d'avril 2025** (décision R5 = B), depuis le doc d'écarts cycle 3
  validé ; les seeds existants (2de, 1re/Tle spé, Tle comp., Expertes — vérifiés conformes
  aux textes 2026) continuent de servir le site pendant la transition.
- **Le `level` des questions = gradation intra-point** (décision David, ADR 0020) ; un
  modèle est _classé_ sous un nœud (filtre) et _tagué_ par des points (programme) — les
  deux liens coexistent.
- **Accès à l'arbre** (déjà tranché) : lecture anon, écriture admin.

## Questions à trancher (phase 0)

1. **Sort de `rang`** — l'échelle descriptive 1-4 par objectif, « geste central » de la
   refonte d'août (`20260829100000`), avec du code vivant (`has_scale`, `rang_max` dans la
   progression élève) mais **jamais remplie : 0 point sur 1 007**. **Reco : ABANDON** —
   jamais servi ; accroché à l'_objectif_, structure que l'ADR 0020 dissout ; doublon
   conceptuel avec le `level` intra-point, plus récent et mieux placé. Le retrait (colonne
   - code à échelle) relève du volet destructif, plus tard ; la cible ne le reconduit pas.
2. **La rubrique BO** — pour afficher un programme dans l'ordre du texte officiel
   (« Analyse > Trigonométrie ») : conserver `themes/objectives` comme simple sommaire
   d'affichage, ou un champ `rubrique` sur le point (et retirer les deux tables à terme,
   volet destructif) ?
3. **Un `kind` `algorithme` ?** Les BO ont partout des « Exemples d'algorithme », la voie
   techno des « Situations algorithmiques » qui sont des attendus ; aujourd'hui ces points
   sont des `savoir_faire`. Un type dédié permettrait de filtrer les fiches Python/tableur.
   (Reco : oui.)
4. **Héritage des listes d'automatismes** — « la liste de 2de doit être entretenue en
   1re » : dupliquer les références par grade, ou coder une règle de parcours une fois ?
5. **Où vivent les parcours** (qui succède à qui : 2de → 1re spé / 1re ens. sci. /
   1re techno → …) — c'est la donnée qui permet de VÉRIFIER la contrainte de parcours des
   références ; table ou configuration ?
6. **La question d'accès, formellement** : qui pourra lire quoi qu'il ne lisait pas avant ?
   (Proposition : nœuds, points et références lisibles par tous, anonymes compris — contenu
   public des programmes officiels ; écriture admin. Rien d'élève dans ces tables.)
7. **Le régime au reseed** : tout est aujourd'hui à `diversite` par défaut (« choix de
   prof », disent les seeds). Passer certains points en `fluence` au moment des reseeds —
   par exemple les contenus nés d'une rubrique Automatismes ? (Reco : à décider point par
   point au seed, défaut conservé.)
