import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createSystem } from './system.mjs'

const node = process.execPath

describe('createSystem', () => {
  it('is rooted at the repository by default', () => {
    const sys = createSystem()

    expect(sys.exists('pnpm-workspace.yaml')).toBe(true)
    expect(sys.nodeVersion).toBe(process.versions.node)
  })

  it('runs commands and reports success, failure and missing binaries', () => {
    const sys = createSystem()

    expect(sys.run(node, ['-e', 'process.exit(0)'])).toBe(true)
    expect(sys.run(node, ['-e', 'process.exit(3)'])).toBe(false)
    expect(sys.run('tripsalesagent-no-such-binary', [])).toBe(false)
  })

  it('captures stdout of successful commands only', () => {
    const sys = createSystem()

    expect(sys.capture(node, ['-e', 'process.stdout.write("hi")'])).toBe('hi')
    expect(sys.capture(node, ['-e', 'process.exit(1)'])).toBeUndefined()
    expect(sys.capture('tripsalesagent-no-such-binary', [])).toBeUndefined()
  })

  it('reads and copies files inside its root without overwriting', () => {
    const root = mkdtempSync(join(tmpdir(), 'setup-'))
    writeFileSync(join(root, 'a'), 'A')
    writeFileSync(join(root, 'b'), 'B')
    const sys = createSystem(root)

    sys.copy('a', 'c')
    expect(sys.read('c')).toBe('A')
    expect(() => sys.copy('a', 'b')).toThrow(/EEXIST/)
    expect(readFileSync(join(root, 'b'), 'utf8')).toBe('B')
  })

  it('writes log lines to its output', () => {
    let written = ''
    const sys = createSystem(tmpdir(), { write: (text: string) => (written += text) })

    sys.log('hello')
    expect(written).toBe('hello\n')
  })
})
