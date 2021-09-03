import { shaderList } from './fetchStore'

export function fetchShader(src) {
  const [dataSub, loadingSub, errorSub] = shaderList

  return new Promise((resolve, reject) => {
    loadingSub.subscribe((loading) => {
      if (loading) return
      errorSub.subscribe((err) => {
        if (err) {
          return reject(err)
        } else {
          dataSub.subscribe((data) => {
            if (!data.includes(src)) {
              return reject('Not found')
            } else {
              window.fetch(`assets/shaders/${src}.glsl`).then((res) => {
                if (res.status >= 400) {
                  return reject(res)
                } else {
                  return res.text().then(resolve)
                }
              })
            }
          })
        }
      })
    })
  })
}
