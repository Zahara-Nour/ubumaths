# z-anguleux — le z de Chiphre Math ne ressemble plus au 2

## Reprendre ici

_Mis à jour le 2026-11-12, avant la PR._

- **État** : `tools/chiphre-math/src/angular_z.py` écrit et lancé ; 4 polices web + `ChiphreMath.ttf` régénérées (seul le z change) · **Prochaine action** : vérification visuelle sur `/dev/polices` et dans un PDF, puis PR · **En attente de David** : son avis sur le rendu à l'écran · **Pièges en cours** : `build_typst_math_font.py` réécrit aussi `ShantellSans-*.ttf` (seules les dates changent) : ne pas les commiter · **Worktree / branche** : `../ubumaths-wt-z-anguleux` · `feat/chiphre-math-z-anguleux`

## Décisions (David, 2026-11-12)

- Le z minuscule de Chiphre Math ressemblait trop à un 2 (épaule ronde de Shantell ; ses 3 variantes aussi).
- Comparés en prototypes : z barré, z anguleux, les deux. **Retenu : z anguleux avec tremblé, sans barre.** La barre bouchait le z gras (trait 153).

## Historique

- 2026-11-12 : script `angular_z.py` sur le modèle de `round_x.py` (mêmes 4 polices, mêmes traits 68 / 153, boîte et avance du z de Shantell). Reconstruction Typst vérifiée reproductible depuis `main` avant la modification (seules les dates internes changeaient). Après : `z` seul différent dans chaque woff2 ; `z`, `u1D467`, `u1D433` dans `ChiphreMath.ttf`. Relancer le script redonne les mêmes glyphes.
