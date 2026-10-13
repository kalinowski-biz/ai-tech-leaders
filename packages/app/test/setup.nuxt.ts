import { afterEach } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'

// Components mounted in one test (and their window listeners, teleports) never leak into the next.
enableAutoUnmount(afterEach)
