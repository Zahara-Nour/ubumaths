/**
 * Styles de MathLive pour le document : les `@font-face` des polices KaTeX et
 * les classes `ML__*` du rendu statique (`convertLatexToMarkup`).
 *
 * À importer (`import '$lib/utils/mathlive-styles';`) dans tout composant qui
 * rend des maths (`<math-field>`, `convertLatexToMarkup`) : Vite rattache alors
 * ce CSS au chunk du composant, haché et immuable. Avant (octobre 2026), deux
 * copies figées dans `static/` étaient chargées en CSS bloquante sur TOUTES les
 * pages, maths ou non, et dataient de MathLive 0.107.1.
 *
 * Les polices restent indispensables dans le document : `<math-field>` vérifie
 * au montage que les familles KaTeX y sont déclarées (`document.fonts`) ; sinon
 * il les cherche dans `fontsDirectory`, relatif à son chunk, donc introuvable.
 *
 * `font-display:"swap"` (guillemets, invalide) est corrigé à la construction
 * par le plugin `mathliveFontDisplay` de `vite.config.ts`.
 */
import 'mathlive/static.css';
