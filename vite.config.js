import { sveltekit } from '@sveltejs/kit/vite';

const config = {
	plugins: [sveltekit()],
	build: {
		rollupOptions: {
		  // https://rollupjs.org/guide/en/#big-list-of-options
		  external:['tinymathlive']
		}
	  }
};

export default config;
