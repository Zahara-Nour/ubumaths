# Chantier lecture-grandeurs — des parseurs de mathAST cohérents avec le BIPM

## Reprendre ici

_Mis à jour le 2026-10-20, fin de la première session._

- **État** : phase 0, rien de codé. Corpus `docs/wip/lecture-grandeurs-corpus.md` (familles A-K + N « Nombres »). Pages à cocher : grandeurs https://claude.ai/artifact/HWJeifzvw6rL9ar72KuRHf (80 fiches, 13 répondues : A1-A9, B1-B4) ; espaces/virgule/`;` https://claude.ai/artifact/PEBUAFgGR8BFL5Aw4vvwib (37 fiches, 0 répondue). Base `reponses/<id>` (choix ok/ko/wait + commentaire) : relire avec `ArtifactData`.
- **Décidé par David** : règle « l'unité multiplie tout le terme de nombres, signe unaire compris » ; `1/2[m]` = (1/2) m ; `2*3[m]` = (2×3) m ; `10^3[m]` = (10³) m ; le parseur LIT, la forme (espaces) est jugée par le validateur des questions ; espaces entre chiffres ignorés (`12 500` = 12500) ; `x 2` refusé ; `.5[m]` refusé.
- **Question de fond ouverte (à trancher AVANT la 2e page)** : le parseur maison est la langue INTERNE du moteur (point décimal, virgule séparatrice : `toCustom` écrit `1.5`, `max(2,3)` ; `;` inconnu ; `3,14` toléré hors fonction/matrice). Le français (virgule décimale, `;`) est traduit À L'ENTRÉE : atelier (`atelier/decimal-comma.ts`, règle de David du 2026-10-09) et LaTeX (`mathAST/decimal-comma.ts`). La 2e page (Q-A : `;` séparateur dans le parseur maison) supposait à tort de changer la langue interne. Prochaine action : inventorier QUI écrit directement en syntaxe maison (`{{eval}}` des modèles, `toCustom`, atelier après traduction, tests), puis faire trancher David : langue interne au point + français à l'entrée, ou parseur maison en français.
- **Pièges** : distinguer parseur maison / parseur LaTeX / atelier (couche qui réécrit puis appelle l'un des deux) ; défauts constatés : `{2[h]}{30[min]}` = 1 h², `π[m]` refusé, `pi` lu p×i, `x;y` lu x×«;»×y, `1/2[m]` = 0,5 m⁻¹, messages d'erreur en anglais, atelier `12 500` → « écris le nombre devant (500x) ».
- **Worktree / branche** : aucun. Sondes non suivies dans `../ubumaths-wt-correction-cases-unite/src/lib/questions/units/__tests__/tmp/` (worktree de la PR 2 bis mise de côté).

## Historique

### 2026-10-20 — ouverture

- Né de la PR 2 bis de `correction-cases-unite` : `1/2[m]` est lu 1/(2[m]) = 0,5 m⁻¹ par les deux parseurs,
  alors que `\frac{1}{2}\unit{m}` vaut 0,5 m et que l'atelier lit `1/2 m` = (1/2) m.
- Brochure SI téléchargée et relue (§3, §5.2, §5.4.1-5.4.7).
- Règle proposée : l'unité multiplie tout le terme de nombres qui la précède (règle de l'atelier,
  décisions des 2026-10-11 et 2026-10-18).
