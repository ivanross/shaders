const path = require('path')
const fs = require('fs-extra')

const rimraf = require('rimraf')
const INPUT_DIR = path.resolve(__dirname, '../../shaders')
const ASSETS_DIR = path.resolve(__dirname, '../public/assets')
const ASSETS_SHADER_DIR = path.resolve(ASSETS_DIR, 'shaders')
const ASSETS_LIST_FILE = path.resolve(ASSETS_DIR, 'list.json')

console.log('🧹 Cleanup ... ')
rimraf.sync(ASSETS_DIR)
fs.mkdirSync(ASSETS_DIR)
fs.mkdirSync(ASSETS_SHADER_DIR)

console.log('🚚 Copying all files')
fs.copySync(INPUT_DIR, ASSETS_SHADER_DIR)

function walk(src) {
  if (fs.lstatSync(src).isFile()) return [src]
  const entries = fs.readdirSync(src)
  return entries.flatMap((entry) => walk(path.resolve(src, entry)))
}

console.log('')
// REMOVE ALL NON glsl files
walk(ASSETS_SHADER_DIR).forEach((file) => {
  if (!file.endsWith('.glsl')) {
    console.log('⚠️ ', path.relative(ASSETS_SHADER_DIR, file), '[SKIP]')
    fs.removeSync(file)
  } else {
    console.log('✅', path.relative(ASSETS_SHADER_DIR, file))
  }
})

// READ ALL REMAINING FILE NAME
const list = walk(ASSETS_SHADER_DIR)
  .map((e) => path.relative(ASSETS_SHADER_DIR, e))
  .map((e) => e.slice(0, e.length - '.glsl'.length))

console.log(`\n✅ Creating ${path.relative(ASSETS_DIR, ASSETS_LIST_FILE)} ...`)
fs.writeFileSync(ASSETS_LIST_FILE, JSON.stringify(list), { encoding: 'utf-8' })
