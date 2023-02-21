// strore global
import { writable } from 'svelte/store'

export const darkmode = writable(false)
export const touchDevice = writable(false)
export const toMarkup = writable((o) => o)
export const fontSize = writable(16)
export const magnify = writable(1)
export const formatToHtml = writable((o) => o)
export const mathliveReady = writable(false)
export const MathfieldElement = writable(null)
export const virtualKeyboardMode= writable(false)
