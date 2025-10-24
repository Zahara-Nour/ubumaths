# Instructions pour Claude Code : Application de chat avec mathématiques

## Objectif

Créer une application de chat permettant aux utilisateurs d'envoyer des messages avec du texte enrichi et des formules mathématiques éditables, en utilisant **Svelte 5**, **TipTap** et **MathLive**.

## Stack technique

- **Framework**: Svelte 5 avec Vite
- **Éditeur de texte riche**: TipTap (basé sur ProseMirror)
- **Rendu mathématique**: MathLive
- **Styling**: Tailwind CSS

## Architecture de l'application

### Structure des fichiers

```
mon-chat-math/
├── src/
│   ├── lib/
│   │   ├── extensions/
│   │   │   └── math-extension.js       # Extensions TipTap pour les maths
│   │   ├── components/
│   │   │   ├── ChatEditor.svelte       # Éditeur de messages
│   │   │   ├── ChatMessage.svelte      # Affichage d'un message
│   │   │   └── ChatWindow.svelte       # Fenêtre de chat complète
│   ├── App.svelte                      # Application principale
│   ├── main.js
│   └── app.css
├── package.json
├── vite.config.js
├── tailwind.config.js
└── index.html
```

## Étapes de développement

### 1. Initialisation du projet

Créer un nouveau projet Svelte 5 avec Vite :

```bash
npm create vite@latest mon-chat-math -- --template svelte
cd mon-chat-math
npm install
```

### 2. Installation des dépendances

```bash
npm install @tiptap/core @tiptap/starter-kit mathlive
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 3. Configuration de Tailwind CSS

**tailwind.config.js** :

```javascript
export default {
	content: ['./index.html', './src/**/*.{svelte,js,ts,jsx,tsx}'],
	theme: {
		extend: {}
	},
	plugins: [require('@tailwindcss/typography')]
};
```

N'oublie pas d'installer le plugin typography :

```bash
npm install -D @tailwindcss/typography
```

**src/app.css** :

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 4. Créer l'extension mathématique

**src/lib/extensions/math-extension.js** :

Créer deux extensions TipTap personnalisées :

- `MathInline` : pour les formules en ligne (inline)
- `MathBlock` : pour les formules en bloc (display mode)

Caractéristiques importantes :

- Utiliser `Node.create()` de TipTap
- Attribut `latex` pour stocker la formule LaTeX
- `addNodeView()` pour créer un élément `<math-field>` de MathLive
- Gérer les événements `input` pour mettre à jour le contenu
- Mode lecture seule quand l'éditeur n'est pas éditable

**Code complet de l'extension** :

```javascript
// src/lib/extensions/math-extension.js
import { Node, mergeAttributes } from '@tiptap/core';

export const MathInline = Node.create({
	name: 'mathInline',
	group: 'inline',
	inline: true,
	atom: true,

	addAttributes() {
		return {
			latex: {
				default: ''
			}
		};
	},

	parseHTML() {
		return [{ tag: 'span[data-math-inline]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['span', mergeAttributes({ 'data-math-inline': '' }, HTMLAttributes)];
	},

	addNodeView() {
		return ({ node, editor, getPos }) => {
			const dom = document.createElement('span');
			dom.classList.add('math-inline-wrapper');

			const mathfield = document.createElement('math-field');
			mathfield.value = node.attrs.latex;
			mathfield.style.display = 'inline-block';
			mathfield.style.fontSize = 'inherit';

			if (!editor.isEditable) {
				mathfield.readOnly = true;
			}

			mathfield.addEventListener('input', (e) => {
				const pos = getPos();
				editor.commands.updateAttributes('mathInline', {
					latex: e.target.value
				});
			});

			dom.appendChild(mathfield);
			return { dom };
		};
	},

	addCommands() {
		return {
			insertMathInline:
				(latex = '') =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						attrs: { latex }
					});
				}
		};
	}
});

export const MathBlock = Node.create({
	name: 'mathBlock',
	group: 'block',
	atom: true,

	addAttributes() {
		return {
			latex: {
				default: ''
			}
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-math-block]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['div', mergeAttributes({ 'data-math-block': '' }, HTMLAttributes)];
	},

	addNodeView() {
		return ({ node, editor, getPos }) => {
			const dom = document.createElement('div');
			dom.classList.add('math-block-wrapper');

			const mathfield = document.createElement('math-field');
			mathfield.value = node.attrs.latex;
			mathfield.style.display = 'block';
			mathfield.style.fontSize = '1.2em';
			mathfield.style.textAlign = 'center';
			mathfield.style.padding = '1rem';

			if (!editor.isEditable) {
				mathfield.readOnly = true;
			}

			mathfield.addEventListener('input', (e) => {
				const pos = getPos();
				editor.commands.updateAttributes('mathBlock', {
					latex: e.target.value
				});
			});

			dom.appendChild(mathfield);
			return { dom };
		};
	},

	addCommands() {
		return {
			insertMathBlock:
				(latex = '') =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						attrs: { latex }
					});
				}
		};
	}
});
```

### 5. Créer le composant ChatEditor

**src/lib/components/ChatEditor.svelte** :

Fonctionnalités :

- Éditeur TipTap avec StarterKit et extensions mathématiques
- Toolbar avec boutons : Gras, Italique, Insertion de formules
- Menu déroulant avec formules courantes :
  - Fraction : `\frac{a}{b}`
  - Racine carrée : `\sqrt{x}`
  - Puissance : `x^{n}`
  - Intégrale : `\int_{a}^{b} f(x) dx`
  - Somme : `\sum_{i=1}^{n} x_i`
  - Limite : `\lim_{x \to \infty} f(x)`
- Boutons "Effacer" et "Envoyer"
- Props : `onSend` (callback pour envoyer le message)
- Utiliser les runes Svelte 5 : `$state`, `$props`, `$effect`

### 6. Créer le composant ChatMessage

**src/lib/components/ChatMessage.svelte** :

Fonctionnalités :

- Afficher un message avec son auteur
- Créer un éditeur TipTap en lecture seule pour le contenu
- Styling avec avatar, bulle de message
- Props : `message` (objet avec `id`, `author`, `content`, `timestamp`)

**Code complet du composant** :

```svelte
<script>
	import { onMount } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import { MathInline, MathBlock } from '../extensions/math-extension.js';
	import 'mathlive';

	let { message } = $props();

	let messageElement = $state(null);
	let editor = $state(null);

	onMount(() => {
		editor = new Editor({
			element: messageElement,
			extensions: [StarterKit, MathInline, MathBlock],
			content: message.content,
			editable: false,
			editorProps: {
				attributes: {
					class: 'prose prose-sm max-w-none'
				}
			}
		});

		return () => editor?.destroy();
	});

	function formatTime(date) {
		if (!date) return '';
		const d = new Date(date);
		return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
	}
</script>

<div class="mb-4 flex gap-3">
	<!-- Avatar -->
	<div class="flex-shrink-0">
		<div
			class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 font-semibold text-white"
		>
			{message.author[0].toUpperCase()}
		</div>
	</div>

	<!-- Message content -->
	<div class="min-w-0 flex-1">
		<div class="mb-1 flex items-baseline gap-2">
			<span class="font-semibold text-gray-900">{message.author}</span>
			{#if message.timestamp}
				<span class="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
			{/if}
		</div>

		<div class="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
			<div bind:this={messageElement}></div>
		</div>
	</div>
</div>
```

### 7. Créer la fenêtre de chat complète

**src/lib/components/ChatWindow.svelte** :

Fonctionnalités :

- Liste des messages avec scroll automatique vers le bas
- Intégration de ChatEditor
- Gestion de l'état des messages (array)
- Fonction pour ajouter un nouveau message
- Design responsive avec Tailwind

**Code complet du composant** :

```svelte
<script>
	import { tick } from 'svelte';
	import ChatMessage from './ChatMessage.svelte';
	import ChatEditor from './ChatEditor.svelte';

	let { initialMessages = [] } = $props();

	let messages = $state(initialMessages);
	let messagesContainer = $state(null);

	async function handleSendMessage(content) {
		const newMessage = {
			id: messages.length + 1,
			author: 'Vous',
			content: content,
			timestamp: new Date()
		};

		messages = [...messages, newMessage];

		// Scroll vers le bas après l'ajout du message
		await tick();
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}
</script>

<div class="mx-auto flex h-screen max-w-5xl flex-col p-4">
	<div class="mb-4">
		<h1 class="text-3xl font-bold text-gray-900">Chat Mathématiques</h1>
		<p class="mt-1 text-gray-600">Échangez avec des formules mathématiques éditables</p>
	</div>

	<!-- Zone des messages -->
	<div bind:this={messagesContainer} class="mb-4 flex-1 overflow-y-auto rounded-lg bg-gray-50 p-4">
		{#if messages.length === 0}
			<div class="py-12 text-center text-gray-500">
				<p class="text-lg">Aucun message pour le moment</p>
				<p class="mt-2 text-sm">Envoyez votre premier message avec des formules mathématiques !</p>
			</div>
		{:else}
			{#each messages as message (message.id)}
				<ChatMessage {message} />
			{/each}
		{/if}
	</div>

	<!-- Zone de composition -->
	<div class="rounded-lg bg-white shadow-lg">
		<ChatEditor onSend={handleSendMessage} />
	</div>

	<div class="mt-3 text-center text-sm text-gray-600">
		<p>💡 Utilisez le bouton "ƒ(x) Formule" pour insérer des mathématiques</p>
	</div>
</div>
```

### 8. Application principale

**src/App.svelte** :

- Importer ChatWindow
- Ajouter un titre
- Messages de démonstration initiaux avec des formules mathématiques
- Layout centré et responsive

**Code complet de l'application** :

```svelte
<script>
	import ChatWindow from './lib/components/ChatWindow.svelte';

	const demoMessages = [
		{
			id: 1,
			author: 'Alice',
			timestamp: new Date('2025-10-14T10:30:00'),
			content: {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: 'Salut ! Pour résoudre cette équation du second degré, on utilise : '
							},
							{
								type: 'mathInline',
								attrs: { latex: '\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}' }
							}
						]
					}
				]
			}
		},
		{
			id: 2,
			author: 'Bob',
			timestamp: new Date('2025-10-14T10:32:00'),
			content: {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [{ type: 'text', text: 'Excellent ! Et voici une intégrale célèbre :' }]
					},
					{
						type: 'mathBlock',
						attrs: {
							latex: '\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}'
						}
					}
				]
			}
		},
		{
			id: 3,
			author: 'Charlie',
			timestamp: new Date('2025-10-14T10:35:00'),
			content: {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [
							{ type: 'text', text: 'Pour le théorème de Pythagore, on a simplement : ' },
							{
								type: 'mathInline',
								attrs: { latex: 'a^2 + b^2 = c^2' }
							},
							{ type: 'text', text: ' 🎯' }
						]
					}
				]
			}
		}
	];
</script>

<ChatWindow initialMessages={demoMessages} />
```

### 9. Configuration finale

#### **src/main.js** :

```javascript
import './app.css';
import App from './App.svelte';

const app = new App({
	target: document.getElementById('app')
});

export default app;
```

#### **src/app.css** :

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Styles globaux pour MathLive */
:global(math-field) {
	border: 1px solid #e5e7eb;
	border-radius: 4px;
	padding: 4px 8px;
	margin: 0 4px;
	background: #f9fafb;
	transition: all 0.2s;
}

:global(math-field:hover) {
	border-color: #3b82f6;
}

:global(math-field:focus) {
	outline: 2px solid #3b82f6;
	outline-offset: 2px;
	background: white;
}

:global(.math-block-wrapper math-field) {
	width: 100%;
	border: 2px dashed #d1d5db;
	margin: 1rem 0;
	padding: 1rem;
	text-align: center;
	font-size: 1.2em;
}

:global(.ProseMirror) {
	min-height: 100px;
}

:global(.ProseMirror:focus) {
	outline: none;
}

/* Scrollbar personnalisée */
:global(*::-webkit-scrollbar) {
	width: 8px;
	height: 8px;
}

:global(*::-webkit-scrollbar-track) {
	background: #f1f1f1;
}

:global(*::-webkit-scrollbar-thumb) {
	background: #888;
	border-radius: 4px;
}

:global(*::-webkit-scrollbar-thumb:hover) {
	background: #555;
}
```

#### **index.html** :

```html
<!doctype html>
<html lang="fr">
	<head>
		<meta charset="UTF-8" />
		<link rel="icon" type="image/svg+xml" href="/vite.svg" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Chat Mathématiques</title>
	</head>
	<body class="bg-gray-100">
		<div id="app"></div>
		<script type="module" src="/src/main.js"></script>
	</body>
</html>
```

#### **vite.config.js** :

```javascript
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [svelte()]
});
```

#### **svelte.config.js** :

```javascript
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
	preprocess: vitePreprocess()
};
```

## Fonctionnalités à implémenter

### Priorité 1 (Core)

- ✅ Affichage des messages
- ✅ Éditeur de texte riche (gras, italique)
- ✅ Insertion de formules mathématiques inline
- ✅ Insertion de formules mathématiques en bloc
- ✅ Édition des formules mathématiques
- ✅ Envoi de messages

### Priorité 2 (Amélioration UX)

- Auto-scroll vers le bas quand nouveau message
- Timestamp sur chaque message
- Indicateur "en train d'écrire"
- Raccourcis clavier (Ctrl+B pour gras, etc.)
- Placeholder dans l'éditeur

### Priorité 3 (Fonctionnalités avancées)

- Sauvegarde des messages dans localStorage
- Export des messages en Markdown + LaTeX
- Recherche dans l'historique
- Support des images
- Mode sombre

## Points d'attention importants

### 1. Svelte 5 - Utiliser les runes

```javascript
// ✅ Correct
let count = $state(0);
let { message } = $props();

// ❌ Incorrect (Svelte 4)
let count = 0;
export let message;
```

### 2. TipTap - Destruction de l'éditeur

Toujours détruire l'éditeur dans `onMount` :

```javascript
onMount(() => {
	editor = new Editor({
		/* ... */
	});

	return () => {
		editor?.destroy();
	};
});
```

### 3. MathLive - Mode lecture seule

Pour les messages affichés, mettre `readOnly: true` sur le MathField :

```javascript
if (!editor.isEditable) {
	mathfield.readOnly = true;
}
```

### 4. Format de stockage

Les messages sont stockés au format JSON de TipTap :

```json
{
	"type": "doc",
	"content": [
		{
			"type": "paragraph",
			"content": [
				{ "type": "text", "text": "Voici une formule : " },
				{
					"type": "mathInline",
					"attrs": { "latex": "\\frac{a}{b}" }
				}
			]
		}
	]
}
```

## Commandes pour démarrer

```bash
# Installation
npm install

# Développement
npm run dev

# Build pour production
npm run build

# Prévisualisation du build
npm run preview
```

## Exemple de messages de démonstration

Créer quelques messages initiaux pour tester :

```javascript
const demoMessages = [
	{
		id: 1,
		author: 'Alice',
		timestamp: new Date('2025-10-14T10:30:00'),
		content: {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{
							type: 'text',
							text: 'Salut ! Pour résoudre cette équation du second degré, on utilise : '
						},
						{
							type: 'mathInline',
							attrs: { latex: '\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}' }
						}
					]
				}
			]
		}
	},
	{
		id: 2,
		author: 'Bob',
		timestamp: new Date('2025-10-14T10:32:00'),
		content: {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'Excellent ! Et voici une intégrale célèbre :' }]
				},
				{
					type: 'mathBlock',
					attrs: {
						latex: '\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}'
					}
				}
			]
		}
	},
	{
		id: 3,
		author: 'Charlie',
		timestamp: new Date('2025-10-14T10:35:00'),
		content: {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Pour le théorème de Pythagore, on a simplement : ' },
						{
							type: 'mathInline',
							attrs: { latex: 'a^2 + b^2 = c^2' }
						},
						{ type: 'text', text: ' 🎯' }
					]
				}
			]
		}
	}
];
```

## Ressources

- **TipTap Documentation** : https://tiptap.dev/docs/editor/introduction
- **MathLive Documentation** : https://cortexjs.io/mathlive/
- **Svelte 5 Runes** : https://svelte-5-preview.vercel.app/docs/runes
- **Tailwind CSS** : https://tailwindcss.com/docs

## Résultat attendu

L'application devrait permettre :

1. ✅ D'afficher une liste de messages avec texte et formules mathématiques
2. ✅ D'écrire un nouveau message avec l'éditeur riche
3. ✅ D'insérer des formules mathématiques inline et en bloc
4. ✅ D'éditer les formules directement dans l'éditeur
5. ✅ D'envoyer le message qui s'ajoute à la liste
6. ✅ Une interface moderne et responsive

Bonne chance ! 🚀
