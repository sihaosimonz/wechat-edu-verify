/**
 * Bot adapter registry. Provides a uniform interface for inviting a user to a group
 * via a bot on Discord, Telegram, or WeCom. This implementation stubs out the
 * functionality and always fails. To enable auto‑admission, implement the
 * adapters in the respective files and update the registry accordingly.
 */

export interface BotInviteResult {
  ok: boolean;
  detail?: string;
}

export interface BotConfig {
  platform: string;
  token: string;
  botId: string;
  [key: string]: any;
}

/**
 * Generic invite function used by the group join route. In this stub implementation
 * it always returns a failure. In production this would delegate to the platform
 * specific adapter.
 */
export async function inviteViaBot(groupId: string, userId: string): Promise<BotInviteResult> {
  // TODO: implement Discord, Telegram, and WeCom adapters.
  return { ok: false, detail: 'Bot integration not configured' };
}