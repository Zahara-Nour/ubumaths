# 🔧 Debug Tools

Outils de débogage et de développement disponibles dans l'interface admin.

---

## Accès

Les debug tools sont accessibles via :

```
/dashboard/admin/debug
```

**Permissions** : Admin uniquement

---

## Outils Disponibles

### Database

Visualisation de la structure de la base de données et des relations.

**URL** : `/dashboard/admin/debug/database`

**Fonctionnalités** :

- Vue d'ensemble des tables
- Relations et foreign keys
- Schéma détaillé

### Session

Inspection des données de session utilisateur.

**URL** : `/dashboard/admin/debug/session`

**Fonctionnalités** :

- Données de session Supabase
- Cookies et tokens
- User metadata

### RLS Policies

Visualisation et test des Row Level Security policies.

**URL** : `/dashboard/admin/debug/rls`

**Fonctionnalités** :

- Liste des policies par table
- Test de permissions
- Documentation des règles

### Avatar

Test du système d'avatar et fallback.

**URL** : `/dashboard/admin/debug/avatar`

**Fonctionnalités** :

- Preview des avatars
- Test des fallbacks
- Validation des URLs

### Wheel

Test du système de roue de sélection d'élèves.

**URL** : `/dashboard/admin/debug/wheel`

**Fonctionnalités** :

- Animation de la roue
- Sélection aléatoire
- Configuration visuelle

### QuestionDisplay

Test d'affichage des questions mathématiques.

**URL** : `/dashboard/admin/debug/question-display`

**Fonctionnalités** :

- Rendu des questions
- Preview des corrections
- Test des inputs

### RichTextEditor

Comparaison des deux éditeurs de texte enrichi.

**URL** : `/dashboard/admin/debug/rich-text`

**Fonctionnalités** :

- RichTextEditor (messagerie)
- FormRichTextEditor (formulaires)
- Comparaison des features

### Typst PDF

**Nouveau** : Outil de création de documents PDF avec Typst.

**URL** : `/dashboard/admin/debug/typst-preview`

**Fonctionnalités** :

- Éditeur Typst avec syntaxe highlighting
- Aperçu SVG en temps réel
- Export PDF
- Exemples de syntaxe mathématique

**Cas d'usage** :

- Création de documents mathématiques
- Export de corrections au format PDF
- Test de formules complexes
- Génération de supports de cours

**Bibliothèque** : [typst.ts](https://github.com/Myriad-Dreamin/typst.ts)

**Syntaxe Typst** :

```typst
= Titre principal

== Sous-titre

*gras* _italique_

$ a x^2 + b x + c = 0 $

$ integral_a^b f(x) d x $
```

**Documentation** : [typst.app/docs](https://typst.app/docs/)

### LaTeX PDF

**Nouveau** : Compilateur LaTeX en ligne avec aperçu PDF.

**URL** : `/dashboard/admin/debug/latex-preview`

**Fonctionnalités** :

- Éditeur LaTeX avec auto-redimensionnement
- Compilation serveur via TeXLive.net
- Sélection du moteur (PDFLaTeX, LuaLaTeX, XeLaTeX, LaTeX, ConTeXt)
- Auto-détection du moteur depuis commentaires `%!TEX`
- Aperçu PDF intégré (navigateur natif)
- Export PDF avec téléchargement
- Affichage détaillé des logs de compilation en cas d'erreur
- Exemples de syntaxe mathématique

**Cas d'usage** :

- Création de documents mathématiques complexes
- Export de corrections au format PDF avec mise en page professionnelle
- Test de formules LaTeX avant intégration
- Génération de supports de cours avec packages LaTeX
- Compilation de documents nécessitant des packages spécifiques (TikZ, pgfplots, etc.)

**Moteurs disponibles** :

- **PDFLaTeX** (défaut) : Compilation standard, compatible avec la plupart des packages
- **LuaLaTeX** : Support Unicode natif, scripts Lua, polices système
- **XeLaTeX** : Support Unicode, polices système, fontspec
- **LaTeX** : Compilation classique avec DVI → PDF
- **ConTeXt** : Système de composition alternatif

**Syntaxe LaTeX** :

```latex
\documentclass{article}
\usepackage{amsmath}

\begin{document}

\section{Équations}

Equation inline : $E = mc^2$

Equation centrée :
\[ \int_a^b f(x) \, dx \]

\end{document}
```

**Auto-détection du moteur** :

Ajouter un commentaire en première ligne :

```latex
%!TEX lualatex

\documentclass{article}
% Le moteur LuaLaTeX sera automatiquement sélectionné
```

**Architecture technique** :

- Server-side proxy (`/api/latex/compile`) pour éviter les problèmes CORS
- Communication avec [TeXLive.net](https://texlive.net) pour la compilation
- Détection automatique PDF vs log file via Content-Type
- Affichage d'erreurs détaillées avec log de compilation

**Service** : [TeXLive.net CGI](https://texlive.net)

**Documentation** : [Learn LaTeX](https://www.learnlatex.org/)

---

## Ajout d'un Nouvel Outil

### 1. Créer la page

```
src/routes/(protected)/dashboard/admin/debug/mon-outil/+page.svelte
```

### 2. Ajouter à la navigation

Éditer `src/routes/(protected)/dashboard/admin/debug/+layout.svelte` :

```typescript
const debugPages = [
	// ... autres pages
	{ href: '/dashboard/admin/debug/mon-outil', label: 'Mon Outil' }
];
```

### 3. Structure recommandée

```svelte
<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';

	// État avec Svelte 5 runes
	let data = $state(null);
</script>

<div class="space-y-6">
	<div>
		<h2 class="mb-2 text-2xl font-bold">Titre de l'Outil</h2>
		<p class="text-muted-foreground">Description de l'outil</p>
		<div class="mt-3 flex flex-wrap gap-2">
			<Badge variant="outline">Tag 1</Badge>
			<Badge variant="outline">Tag 2</Badge>
		</div>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Section principale</Card.Title>
			<Card.Description>Description de la section</Card.Description>
		</Card.Header>
		<Card.Content>
			<!-- Contenu -->
		</Card.Content>
	</Card.Root>
</div>
```

### 4. Best Practices

- ✅ Utiliser Svelte 5 runes ($state, $derived, $effect)
- ✅ Composants Shadcn pour l'UI
- ✅ Afficher des exemples et documentation
- ✅ Gérer les états de loading et erreur
- ✅ Ajouter des badges pour catégoriser
- ✅ Fournir des liens vers la doc externe si applicable

---

## Notes Techniques

### CDN vs NPM

Pour les démos d'outils externes (comme Typst), privilégier le chargement CDN :

```typescript
onMount(() => {
	const script = document.createElement('script');
	script.type = 'module';
	script.src = 'https://cdn.jsdelivr.net/npm/...';

	script.addEventListener('load', () => {
		// Initialisation
	});

	document.head.appendChild(script);

	return () => {
		// Cleanup
		script.remove();
	};
});
```

**Avantages** :

- Pas de dépendance npm à maintenir
- Pas d'impact sur le bundle size
- Facile à mettre à jour

### Performance

Les debug tools ne sont accessibles qu'aux admins, donc :

- Pas de contrainte stricte sur le bundle size
- Priorité à la facilité d'utilisation
- Chargement lazy des dépendances lourdes

---

## Voir Aussi

- [Code Style](code-style.md) - Standards de code
- [Svelte 5 Migration](svelte5-migration.md) - Utilisation des runes
- [Features Documentation](../features/) - Documentation des features principales

---

[← Retour au Development](README.md)
