# Shantell Math — note de reprise

> Reprise du chantier de police mathématique manuscrite à partir de Shantell Sans.
> Rédigée le 2026-10-12 sur le MacBook, pour continuer sur le Mac mini.

## Ce qui est perdu, ce qui ne l'est pas

Les deux sessions Claude Code d'origine (2026-01-20) **n'existent plus** : leurs transcripts ont été purgés au bout de 30 jours (`cleanupPeriodDays`). Seuls leurs titres restaient dans l'index des sessions :

| Session                                | Dossier           | Sujet                                                                                                      |
| -------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------- |
| `b318b991-1c5e-4f2c-a18d-e29714856a27` | `ubumaths-extern` | **Création** — « Est-ce qu'on peut utiliser une font personnalisée avec le mathfield de mathlive ? »       |
| `43a74386-9b13-4bb1-8b64-2a4e0bef1676` | `ubumaths`        | **Bascule KaTeX ↔ Shantell** — les polices KaTeX originales avaient été écrasées par les versions Shantell |

**Tout le travail produit est dans git** (sauf le `venv` Python, à recréer).

## Où est quoi

### Générateur (Python, fontTools)

`tools/chiphre-math/` :

- `PROJECT_BRIEF.md` — objectif et contexte technique (métriques KaTeX, polices à modifier) : **à lire en premier**
- `README.md` — installation et commandes
- `docs/TECHNICAL.md`, `docs/USAGE.md`, `docs/TROUBLESHOOTING.md`
- `CHANGELOG.md` — paramètres retenus : intensité roughen **12**, seed **42**, poids **300** (regular/italic), **700** (bold)
- `src/replace_glyphs.py` (A-Z, a-z, 0-9 pris dans Shantell), `src/roughen_math.py` (effet manuscrit sur ∑ ∫ √…), `src/build_metrics.py`, `src/convert_woff2.py`
- `fonts/input/` (KaTeX + Shantell en TTF) et `fonts/output/` (polices générées)

Recréer l'environnement sur le Mac mini :

```bash
cd tools/chiphre-math
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

### Intégration dans l'app

- `static/fonts/chiphre-math/KaTeX_*.woff2` — jeu Shantell
- `static/fonts/katex-original/` — KaTeX d'origine (restauré après l'écrasement)
- `static/mathlive-fonts-shantell.css` — feuille qui redirige les `@font-face` KaTeX vers Shantell
- `src/lib/utils/mathlive-fonts.ts` — bascule dynamique KaTeX ↔ Shantell
- `src/app.html`, `src/fonts.css`
- `src/routes/(public)/test-font/+page.svelte` — page de démo (https://www.chiph.re/test-font)
- Usage dans le whiteboard (polices des templates) : `src/lib/whiteboard/types/templates.ts`, `src/lib/server/validation/whiteboard-templates.ts`

### Commits de référence

- `82afa51f9` feat(fonts): add ShantellMath handwritten math fonts
- `a172e4e52` docs(chiphre-math): add comprehensive documentation
- `d53bdf0ae` feat(fonts): add dynamic font switching between KaTeX and Shantell
- `c37d9e7a1` perf(fonts): self-host Pacifico and Shantell Sans fonts

## Piège déjà payé

Régénérer les polices **ne doit pas écraser** `static/fonts/KaTeX_*.woff2` : c'est arrivé le 2026-01-20 (le KaTeX d'origine affichait Shantell). Les sorties vont dans `static/fonts/chiphre-math/` ; l'original de référence est dans `static/fonts/katex-original/`.

## Pour démarrer une session sur le Mac mini

> Lis `docs/wip/chiphre-math-reprise.md`, puis `tools/chiphre-math/PROJECT_BRIEF.md` et `docs/TECHNICAL.md`. On reprend le chantier de police Shantell Math : <ce que tu veux faire>.
