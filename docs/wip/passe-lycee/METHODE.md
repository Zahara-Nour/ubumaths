# Passe lycée — étape a : passe des points (méthode validée par David le 2026-10-22)

Principes : [ADR 0020 § 7, précisions du 2026-10-17](../../adr/0020-arbre-central-programmes-pointeurs.md).
**Seuls les nouveaux programmes** comptent (décision de David, 2026-10-22) : textes de `docs/ref/programmes/`,
extraits dans `bo/*.txt` (`pdftotext -layout`). Maths expertes : seul texte existant, celui de 2019, reconduit.

Rien n'est modifié par cette étape : elle **propose**, David tranche sur une page à cocher, puis une migration
additive applique.

## Entrées

- `points-lycee.csv` : les 1 105 points actifs du lycée (base locale, empreinte identique à la prod le 2026-10-22) —
  grade, code, ordre, kind, rubrique, exigence, libellé, nœud, listes d'automatismes qui le référencent.
- `tags-prod.txt` : nombre de modèles tagués par point en prod (`code:n`).
- `bo/<programme>.txt` : le texte officiel.
- Scissions déjà faites au collège : `tests/integration/fixtures/scission-points-programme.json`,
  récap `../arbre-notions/c5-scissions-recap.md` (familles à prolonger au lycée).

## Les quatre questions, pour chaque point

1. **Faut-il le couper ?** Deux niveaux :
   - **1a — la ligne du BO réunit plusieurs points.** Le point recopie une puce qui contient en fait plusieurs savoirs
     distincts (objets différents, opérations différentes : « dérivée de xⁿ, de 1/x, de √x », « moyenne et
     médiane »). → **on coupe toujours**, un point par savoir, même si une partie ne s'évalue pas par un modèle.
   - **1b — à l'intérieur d'un même savoir, deux gestes.** « Connaître / démontrer », « calculer / interpréter »,
     « résoudre / mettre en équation »… → on coupe **seulement si au moins une partie est évaluable par un modèle
     de question** (outils actuels ou à venir : grapheur, géométrie…). L'autre partie peut relever du cours. Aucune
     partie évaluable → le point reste entier (c'est une compétence).
2. **Famille.** Une coupe vaut pour tous les points qui expriment le même savoir-faire dans les autres programmes
   (2de → 1re → Tle, 1re spé ↔ Tle compl., voie techno), **et** un point du lycée dont le jumeau du collège a déjà été
   coupé se coupe de la même façon.
3. **Doublon du BO.** Deux points d'un même programme qui disent la même chose → le premier reste, le second est
   archivé. À signaler, David tranche.
4. **Automatismes.** Une partie de ligne d'automatisme sans point → d'abord scinder un point antérieur (avec sa
   famille), sinon point ⚙ dans le programme de la ligne (ex. « interpréter les quartiles », relevé le 2026-10-17).

## Règles de fond

- Le BO est immuable : aucun contenu ajouté, même grain, mots du BO. Pas de point « entraînement ».
- **Une puce large reste un point** (David, 2026-10-22) : non évaluable par des questions, elle relève de
  l'évaluation par compétences mais fait partie du programme. Les puces écartées au seed pour ce motif sont rétablies.
- Le premier libellé garde le code d'origine ; c'est la partie que visent les références existantes (aucune
  référence déplacée). Les autres prennent un code neuf, rangé juste après, même nœud sauf nœud plus juste existant.
- Chaque proposition dit **quel niveau la justifie (1a, 1b, 2, 3 ou 4)**, cite la ligne du BO, et argumente aussi
  les non-coupes douteuses.
