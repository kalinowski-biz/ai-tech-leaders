import { spawnSync } from 'node:child_process'
import { constants, copyFileSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url))

/**
 * The side effects `runSetup` needs, rooted at the repository. Commands run
 * without a shell; a missing binary counts as a failed command.
 *
 * @param {string} [root]
 * @param {{ write(text: string): unknown }} [out]
 */
export function createSystem(root = REPO_ROOT, out = process.stdout) {
  return {
    nodeVersion: process.versions.node,
    /** Runs a command with inherited stdio; true when it exits 0. */
    run: (command, args) => spawnSync(command, args, { cwd: root, stdio: 'inherit' }).status === 0,
    /** Runs a command quietly; its stdout when it exits 0, otherwise undefined. */
    capture: (command, args) => {
      const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', stdio: 'pipe' })
      return result.status === 0 ? result.stdout : undefined
    },
    exists: (file) => existsSync(join(root, file)),
    read: (file) => readFileSync(join(root, file), 'utf8'),
    /** Copies a file, never overwriting an existing target. */
    copy: (from, to) => copyFileSync(join(root, from), join(root, to), constants.COPYFILE_EXCL),
    log: (line) => out.write(`${line}\n`),
  }
}
