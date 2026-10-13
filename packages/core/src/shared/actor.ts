export const ROLES = ['AGENT', 'OFFICE'] as const
export type Role = (typeof ROLES)[number]

/**
 * Who performs a use case. Resolved from the session at the edge (Nitro
 * handler) and passed to services explicitly; services enforce ownership with
 * it (an agent only ever sees records with its own `agentId`).
 */
export interface Actor {
  userId: string
  role: Role
  /** Set for role `AGENT`, `null` for office users. */
  agentId: string | null
}
