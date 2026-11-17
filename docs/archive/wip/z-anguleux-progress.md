# z-anguleux — le z de Chiphre Math ne ressemble plus au 2

## Reprendre ici

_Mis à jour le 2026-11-12, après #2596 (mergée) — chantier clos._

- **État** : z à coins livré (#2596) : `angular_z.py`, 4 polices web, `ChiphreMath.ttf`, `?v=2026-11-12` ; doc durable dans `docs/systeme/fiches-et-pdf.md` et `tools/chiphre-math/CHANGELOG.md` (1.22.0) · **Prochaine action** : aucune · **En attente de David** : vérification manuelle en prod après `deploy:prod` (`docs/wip/verifications-manuelles.md`) · **Pièges en cours** : `build_typst_math_font.py` réécrit aussi `ShantellSans-*.ttf` (dates seules) : ne pas les commiter · **Worktree / branche** : supprimés

## Décisions (David, 2026-11-12)

- Le z minuscule de Chiphre Math ressemblait trop à un 2 (épaule ronde de Shantell ; ses 3 variantes aussi).
- Comparés en prototypes : z barré, z anguleux, les deux. **Retenu : z anguleux avec tremblé, sans barre.** La barre bouchait le z gras (trait 153).

## Historique

- 2026-11-12 : script `angular_z.py` sur le modèle de `round_x.py` (mêmes 4 polices, mêmes traits 68 / 153, boîte et avance du z de Shantell). Reconstruction Typst vérifiée reproductible depuis `main` avant la modification (seules les dates internes changeaient). Après : `z` seul différent dans chaque woff2 ; `z`, `u1D467`, `u1D433` dans `ChiphreMath.ttf`. Relancer le script redonne les mêmes glyphes.
- 2026-11-12 : PR #2596 mergée. CI : garde doc (fiches-et-pdf.md couvre correction-fonts.ts) corrigée ; garde SECURITY DEFINER relancée (port 54322 occupé sur le runner, sans lien).
