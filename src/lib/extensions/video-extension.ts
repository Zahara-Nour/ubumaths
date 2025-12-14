/**
 * Custom Video Extension for TipTap
 * ==================================
 *
 * Provides support for video content with:
 * - HTML5 video elements
 * - YouTube embeds (via youtube-nocookie.com for privacy)
 * - sizeClass: 'inline' | 'small' | 'medium' | 'large' | 'full'
 * - widthPercent: 0-100
 * - alignment: 'left' | 'center' | 'right'
 * - Video controls: controls, autoplay, loop, muted
 *
 * @module extensions/video-extension
 */

import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Size class to CSS width mapping
 */
const SIZE_CLASS_STYLES: Record<string, { width: string; maxWidth: string }> = {
	inline: { width: '1.5em', maxWidth: '1.5em' },
	small: { width: '25%', maxWidth: '300px' },
	medium: { width: '50%', maxWidth: '600px' },
	large: { width: '75%', maxWidth: '900px' },
	full: { width: '100%', maxWidth: '1200px' }
};

/**
 * Build wrapper styles for video sizing and alignment
 */
function getVideoWrapperStyles(
	sizeClass: string | null,
	widthPercent: number | null,
	alignment: string | null
): string {
	const styles: string[] = ['margin-top: 0.5rem', 'margin-bottom: 0.5rem'];

	// Determine wrapper width from size class or width percent
	if (sizeClass && SIZE_CLASS_STYLES[sizeClass]) {
		styles.push(`width: ${SIZE_CLASS_STYLES[sizeClass].width}`);
		styles.push(`max-width: ${SIZE_CLASS_STYLES[sizeClass].maxWidth}`);
	} else if (widthPercent !== null && widthPercent !== undefined) {
		styles.push(`width: ${widthPercent}%`);
	} else {
		// Default: fit content, max 100%
		styles.push('width: fit-content', 'max-width: 100%');
	}

	// Alignment via margins
	if (alignment === 'center') {
		styles.push('margin-left: auto', 'margin-right: auto');
	} else if (alignment === 'right') {
		styles.push('margin-left: auto', 'margin-right: 0');
	} else {
		// left or default
		styles.push('margin-left: 0', 'margin-right: auto');
	}

	return styles.join('; ');
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		video: {
			/**
			 * Insert a video
			 */
			insertVideo: (attrs: {
				src: string;
				alt?: string;
				provider?: 'html5' | 'youtube';
				videoId?: string;
				sizeClass?: 'inline' | 'small' | 'medium' | 'large' | 'full';
				widthPercent?: number;
				alignment?: 'left' | 'center' | 'right';
				controls?: boolean;
				autoplay?: boolean;
				loop?: boolean;
				muted?: boolean;
			}) => ReturnType;
		};
	}
}

/**
 * Custom Video extension for TipTap
 *
 * IMPORTANT: We access node.attrs directly in renderHTML because
 * HTMLAttributes contains transformed attribute names (data-*),
 * not the raw attribute values.
 */
export const Video = Node.create({
	name: 'video',

	group: 'block',

	atom: true,

	addAttributes() {
		return {
			src: {
				default: null,
				parseHTML: (element) => {
					// For video element, get from source child or src attribute
					if (element.tagName === 'VIDEO') {
						const source = element.querySelector('source');
						return source?.getAttribute('src') || element.getAttribute('src');
					}
					// For iframe (YouTube), get from src
					if (element.tagName === 'IFRAME') {
						return element.getAttribute('src');
					}
					// For wrapper div, look for video or iframe inside
					const video = element.querySelector('video');
					if (video) {
						const source = video.querySelector('source');
						return source?.getAttribute('src') || video.getAttribute('src');
					}
					const iframe = element.querySelector('iframe');
					if (iframe) {
						return iframe.getAttribute('src');
					}
					return element.getAttribute('data-src');
				},
				renderHTML: () => ({})
			},
			alt: {
				default: null,
				parseHTML: (element) => element.getAttribute('data-alt'),
				renderHTML: () => ({})
			},
			provider: {
				default: 'html5',
				parseHTML: (element) => element.getAttribute('data-provider') || 'html5',
				renderHTML: () => ({})
			},
			videoId: {
				default: null,
				parseHTML: (element) => element.getAttribute('data-video-id'),
				renderHTML: () => ({})
			},
			sizeClass: {
				default: null,
				parseHTML: (element) => element.getAttribute('data-size-class'),
				renderHTML: () => ({})
			},
			widthPercent: {
				default: null,
				parseHTML: (element) => {
					const val = element.getAttribute('data-width-percent');
					return val ? parseInt(val, 10) : null;
				},
				renderHTML: () => ({})
			},
			alignment: {
				default: null,
				parseHTML: (element) => element.getAttribute('data-alignment'),
				renderHTML: () => ({})
			},
			controls: {
				default: true,
				parseHTML: (element) => {
					const val = element.getAttribute('data-controls');
					// If attribute not present, default to true
					return val === null ? true : val === 'true';
				},
				renderHTML: () => ({})
			},
			autoplay: {
				default: false,
				parseHTML: (element) => element.getAttribute('data-autoplay') === 'true',
				renderHTML: () => ({})
			},
			loop: {
				default: false,
				parseHTML: (element) => element.getAttribute('data-loop') === 'true',
				renderHTML: () => ({})
			},
			muted: {
				default: false,
				parseHTML: (element) => element.getAttribute('data-muted') === 'true',
				renderHTML: () => ({})
			}
		};
	},

	parseHTML() {
		return [
			// Wrapper div with data-video marker
			{
				tag: 'div[data-video]'
			},
			// HTML5 video element
			{
				tag: 'video'
			},
			// YouTube iframe
			{
				tag: 'iframe[data-youtube]'
			}
		];
	},

	renderHTML({ node }) {
		// Access raw attribute values from node.attrs
		const src = node.attrs.src as string | null;
		const alt = node.attrs.alt as string | null;
		const provider = node.attrs.provider as 'html5' | 'youtube';
		const videoId = node.attrs.videoId as string | null;
		const sizeClass = node.attrs.sizeClass as string | null;
		const widthPercent = node.attrs.widthPercent as number | null;
		const alignment = node.attrs.alignment as string | null;
		const controls = node.attrs.controls as boolean;
		const autoplay = node.attrs.autoplay as boolean;
		const loop = node.attrs.loop as boolean;
		const muted = node.attrs.muted as boolean;

		// Build wrapper styles
		const wrapperStyles = getVideoWrapperStyles(sizeClass, widthPercent, alignment);

		// Common data attributes for persistence
		const dataAttrs: Record<string, unknown> = {
			'data-video': '',
			'data-src': src || undefined,
			'data-alt': alt || undefined,
			'data-provider': provider,
			'data-video-id': videoId || undefined,
			'data-size-class': sizeClass || undefined,
			'data-width-percent': widthPercent ?? undefined,
			'data-alignment': alignment || undefined,
			'data-controls': String(controls),
			'data-autoplay': String(autoplay),
			'data-loop': String(loop),
			'data-muted': String(muted)
		};

		// YouTube embed
		if (provider === 'youtube' && videoId) {
			// Build YouTube URL with parameters
			const params = new URLSearchParams();
			if (autoplay) params.set('autoplay', '1');
			if (loop) {
				params.set('loop', '1');
				params.set('playlist', videoId); // Required for loop to work
			}
			if (muted) params.set('mute', '1');
			if (!controls) params.set('controls', '0');

			const paramString = params.toString();
			const youtubeUrl = `https://www.youtube-nocookie.com/embed/${videoId}${paramString ? '?' + paramString : ''}`;

			const iframeElement: [string, Record<string, unknown>] = [
				'iframe',
				{
					src: youtubeUrl,
					'data-youtube': '',
					title: alt || 'YouTube video',
					frameborder: '0',
					allow: 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
					allowfullscreen: 'true',
					style: 'width: 100%; aspect-ratio: 16/9; display: block;',
					class: 'rounded-md'
				}
			];

			return [
				'div',
				mergeAttributes(
					{
						class: 'video-wrapper',
						style: wrapperStyles
					},
					dataAttrs
				),
				iframeElement
			];
		}

		// HTML5 video
		const videoStyles = 'width: 100%; height: auto; display: block;';

		// Build video attributes
		const videoAttrs: Record<string, unknown> = {
			style: videoStyles,
			class: 'rounded-md'
		};

		// Add boolean attributes only if true
		if (controls) videoAttrs.controls = 'true';
		if (autoplay) videoAttrs.autoplay = 'true';
		if (loop) videoAttrs.loop = 'true';
		if (muted) videoAttrs.muted = 'true';

		// Video element with source child
		const videoElement: (
			| string
			| Record<string, unknown>
			| (string | Record<string, unknown>)[]
		)[] = ['video', videoAttrs];

		if (src) {
			videoElement.push(['source', { src, type: 'video/mp4' }]);
		}

		return [
			'div',
			mergeAttributes(
				{
					class: 'video-wrapper',
					style: wrapperStyles
				},
				dataAttrs
			),
			videoElement
		];
	},

	addCommands() {
		return {
			insertVideo:
				(attrs) =>
				({ commands }) => {
					return commands.insertContent({
						type: this.name,
						attrs
					});
				}
		};
	}
});

export default Video;
