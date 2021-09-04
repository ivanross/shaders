import { fetchStore } from './lib/store'

export const shaderListStore = fetchStore('/assets/list.json', (res) => res.json())
