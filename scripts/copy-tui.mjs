import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const src = path.join(root, 'src', 'tui.tsx')
const dist = path.join(root, 'dist', 'tui.tsx')

await fs.mkdir(path.dirname(dist), { recursive: true })
await fs.copyFile(src, dist)
