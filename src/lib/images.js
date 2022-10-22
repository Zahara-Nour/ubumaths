import { supabaseClient } from '$lib/supabaseClients'
import { getLogger } from '$lib/utils'
let { info, fail, warn } = getLogger('images', 'info')
import {browser} from '$app/environment'


export async function fetchImage(name) {
	let base64

	if (browser) {
		 base64 = sessionStorage.getItem(name)
		
		if (!base64) {
			info('fetching image', name)
			const { data: blob, error } = await supabaseClient.storage
				.from('public/mental')
				.download(name)

			if (error) {
				fail('error', error)
				return Promise.reject('error', error)
			} else {
				return new Promise(function (resolve, reject) {
					let reader = new FileReader()

					reader.onload = () => {
						try {
							sessionStorage.setItem(name, reader.result)
						} catch (error) {
							warn('error', error)
						}
						info('image loaded', name)
						return resolve(reader.result)
					}
					reader.onerror = (error) => reject('Error: ', error)
					reader.readAsDataURL(blob)
				})
			}
		}
	}
	else {
		console.log('fetch called on server')
	}

	return Promise.resolve(base64)
}
