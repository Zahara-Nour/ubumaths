export const manifest = {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png","fonts/KFOlCnqEu92Fr1MmEU9fBBc4AMP6lQ.woff2","fonts/KFOlCnqEu92Fr1MmEU9fChc4AMP6lbBP.woff2","fonts/KFOlCnqEu92Fr1MmSU5fBBc4AMP6lQ.woff2","fonts/KFOlCnqEu92Fr1MmSU5fChc4AMP6lbBP.woff2","fonts/KFOlCnqEu92Fr1MmWUlfBBc4AMP6lQ.woff2","fonts/KFOlCnqEu92Fr1MmWUlfChc4AMP6lbBP.woff2","fonts/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2","fonts/KFOmCnqEu92Fr1Mu7GxKKTU1Kvnz.woff2","fonts/KaTeX_AMS-Regular.woff2","fonts/KaTeX_Caligraphic-Bold.woff2","fonts/KaTeX_Caligraphic-Regular.woff2","fonts/KaTeX_Fraktur-Bold.woff2","fonts/KaTeX_Fraktur-Regular.woff2","fonts/KaTeX_Main-Bold.woff2","fonts/KaTeX_Main-BoldItalic.woff2","fonts/KaTeX_Main-Italic.woff2","fonts/KaTeX_Main-Regular.woff2","fonts/KaTeX_Math-BoldItalic.woff2","fonts/KaTeX_Math-Italic.woff2","fonts/KaTeX_SansSerif-Bold.woff2","fonts/KaTeX_SansSerif-Italic.woff2","fonts/KaTeX_SansSerif-Regular.woff2","fonts/KaTeX_Script-Regular.woff2","fonts/KaTeX_Size1-Regular.woff2","fonts/KaTeX_Size2-Regular.woff2","fonts/KaTeX_Size3-Regular.woff2","fonts/KaTeX_Size4-Regular.woff2","fonts/KaTeX_Typewriter-Regular.woff2","fonts/L0xuDF4xlVMF-BfR8bXMIhJHg45mwgGEFl0_3vq_ROW-AJi8SJQt.woff","fonts/L0xuDF4xlVMF-BfR8bXMIhJHg45mwgGEFl0_3vq_SuW-AJi8SJQtQ4Y.woff","fonts/WGLegacyEdition.woff2","fonts/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2","fonts/pacifico.woff2","fonts.css","images/.DS_Store","images/good-job-150.png","images/great-150.png","images/keep-on-150.png","images/logo-voltaire.png","images/try-again-150.png","mathlive-fonts.css","mathlive-static.css","site-dark.css","site.css","smui-dark.css","smui.css","sounds/keypress-delete.wav","sounds/keypress-return.wav","sounds/keypress-spacebar.wav","sounds/keypress-standard.wav","sounds/plonk.wav"]),
	mimeTypes: {".png":"image/png",".woff2":"font/woff2",".woff":"font/woff",".css":"text/css",".wav":"audio/wav"},
	_: {
		entry: {"file":"_app/immutable/start-faa39689.js","imports":["_app/immutable/start-faa39689.js","_app/immutable/chunks/index-7b66872c.js","_app/immutable/chunks/singletons-c23c1a95.js","_app/immutable/chunks/preload-helper-aa6bc0ce.js","_app/immutable/chunks/env-public-6aa99648.js"],"stylesheets":[]},
		nodes: [
			() => import('../output/server/nodes/0.js'),
			() => import('../output/server/nodes/1.js'),
			() => import('../output/server/nodes/2.js'),
			() => import('../output/server/nodes/3.js'),
			() => import('../output/server/nodes/4.js'),
			() => import('../output/server/nodes/5.js')
		],
		routes: [
			{
				id: "/(app)",
				pattern: /^\/?$/,
				names: [],
				types: [],
				page: { layouts: [0,2], errors: [1,,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/(app)/automaths",
				pattern: /^\/automaths\/?$/,
				names: [],
				types: [],
				page: { layouts: [0,2], errors: [1,,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/(app)/automaths/assessment",
				pattern: /^\/automaths\/assessment\/?$/,
				names: [],
				types: [],
				page: { layouts: [0,2], errors: [1,,], leaf: 5 },
				endpoint: null
			}
		],
		matchers: async () => {
			
			return {  };
		}
	}
};
