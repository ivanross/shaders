import { shaderListStore } from '../stores'
import { read, until } from './store.js'

const fail = (value) => Promise.reject(value)

export async function fetchShader(src) {
  const [data, loading, errorSub] = shaderListStore

  await until(loading, false)

  const error = await read(errorSub)
  if (error) return fail({ status: 404, error: 'Oops... something went wrong 😥' })

  const list = await read(data)
  if (!list.includes(src)) return fail({ status: 404, error: `Shader <i>${src}</i> not found` })

  const res = await window.fetch(`/assets/shaders/${src}.glsl`)
  if (res.status === 404) return fail({ status: 404, error: `Shader <i>${src}</i> not found` })
  if (res.status >= 400) return fail({ status: res.status, error: res.statusText })

  return await res.text()
}
