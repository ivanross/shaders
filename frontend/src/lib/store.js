import { writable } from 'svelte/store'

export function fetchStore(url, handleResponse) {
  const loading = writable(false)
  const error = writable(false)
  const data = writable(null)

  async function get() {
    loading.set(true)
    error.set(false)
    try {
      const response = await fetch(url)
      data.set(await handleResponse(response))
    } catch (e) {
      error.set(e)
    }
    loading.set(false)
  }

  get()

  return [data, loading, error, get]
}

export const until = (readable, valueOrCondition) => {
  const condition =
    typeof valueOrCondition === 'function'
      ? valueOrCondition
      : (value) => value === valueOrCondition

  return new Promise((resolve) => {
    readable.subscribe((value) => {
      if (condition(value)) resolve(value)
    })
  })
}

export const read = (readable) => {
  return new Promise((resolve) => {
    readable.subscribe((value) => {
      return resolve(value)
    })
  })
}
