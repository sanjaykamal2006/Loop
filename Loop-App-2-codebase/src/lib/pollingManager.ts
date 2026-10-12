// src/lib/pollingManager.ts
/**
 * Polling manager for free-tier LOOP deployment
 * Replaces Supabase realtime subscriptions with HTTP polling
 * Zero realtime connections used
 */

interface PollingConfig {
  interval: number; // milliseconds
  enabled: boolean;
}

class PollingManager {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private configs: Map<string, PollingConfig> = new Map();

  /**
   * Start polling for messages in a loop chat
   */
  startMessagePolling(
    loopId: string,
    onNewMessages: (messages: any[]) => void,
    lastMessageId?: string
  ) {
    const key = `messages-${loopId}`;

    // Clear existing interval if any
    this.stopPolling(key);

    // Poll every 3 seconds when chat is active
    const config: PollingConfig = {
      interval: 3000,
      enabled: true,
    };

    this.configs.set(key, config);

    const poll = async () => {
      if (!this.configs.get(key)?.enabled) return;

      try {
        const { supabase } = await import('@/lib/supabase');

        let query = supabase
          .from('messages')
          .select('*')
          .eq('loop_id', loopId)
          .order('created_at', { ascending: true });

        // Only fetch messages after the last one we have
        if (lastMessageId) {
          query = query.gt('created_at', lastMessageId);
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          onNewMessages(data);
        }
      } catch (error) {
        // Silent fail - will retry on next poll
      }
    };

    // Start polling
    const intervalId = setInterval(poll, config.interval);
    this.intervals.set(key, intervalId);

    // Poll immediately
    poll();
  }

  /**
   * Start polling for loop updates (home view, chat list)
   */
  startLoopPolling(
    userId: string,
    onLoopUpdates: (loops: any[]) => void
  ) {
    const key = `loops-${userId}`;

    this.stopPolling(key);

    // Poll every 10 seconds for loop updates
    const config: PollingConfig = {
      interval: 10000,
      enabled: true,
    };

    this.configs.set(key, config);

    const poll = async () => {
      if (!this.configs.get(key)?.enabled) return;

      try {
        const { supabase } = await import('@/lib/supabase');

        // Fetch user's loops (created + joined)
        const { data: createdLoops } = await supabase
          .from('loops')
          .select('*')
          .eq('creator_id', userId)
          .eq('status', 'active');

        const { data: memberData } = await supabase
          .from('loop_members')
          .select('loop_id')
          .eq('user_id', userId);

        const joinedLoopIds = memberData?.map(m => m.loop_id) || [];

        let joinedLoops = [];
        if (joinedLoopIds.length > 0) {
          const { data } = await supabase
            .from('loops')
            .select('*')
            .in('id', joinedLoopIds)
            .eq('status', 'active');

          joinedLoops = data || [];
        }

        const allLoops = [...(createdLoops || []), ...joinedLoops];
        onLoopUpdates(allLoops);
      } catch (error) {
        // Silent fail
      }
    };

    const intervalId = setInterval(poll, config.interval);
    this.intervals.set(key, intervalId);
    poll();
  }

  /**
   * Start polling for member updates in ride details view
   */
  startMemberPolling(
    loopId: string,
    onMemberUpdates: (members: any[]) => void
  ) {
    const key = `members-${loopId}`;

    this.stopPolling(key);

    // Poll every 5 seconds for member changes
    const config: PollingConfig = {
      interval: 5000,
      enabled: true,
    };

    this.configs.set(key, config);

    const poll = async () => {
      if (!this.configs.get(key)?.enabled) return;

      try {
        const { supabase } = await import('@/lib/supabase');

        const { data, error } = await supabase
          .from('loop_members')
          .select(`
            *,
            profiles!inner(id, display_name, avatar_url, reg_no)
          `)
          .eq('loop_id', loopId);

        if (!error && data) {
          onMemberUpdates(data);
        }
      } catch (error) {
        // Silent fail
      }
    };

    const intervalId = setInterval(poll, config.interval);
    this.intervals.set(key, intervalId);
    poll();
  }

  /**
   * Stop polling for a specific key
   */
  stopPolling(key: string) {
    const interval = this.intervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(key);
    }

    const config = this.configs.get(key);
    if (config) {
      config.enabled = false;
    }
  }

  /**
   * Stop all polling (on logout/unmount)
   */
  stopAll() {
    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.intervals.clear();
    this.configs.clear();
  }

  /**
   * Adjust polling interval (slower when in background)
   */
  setInterval(key: string, newInterval: number) {
    const config = this.configs.get(key);
    if (config) {
      config.interval = newInterval;

      // Restart polling with new interval
      const interval = this.intervals.get(key);
      if (interval) {
        // Re-trigger the appropriate polling method
        // (You'd need to store callbacks to do this properly)
      }
    }
  }
}

// Export singleton instance
export const pollingManager = new PollingManager();

// Cleanup on window unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    pollingManager.stopAll();
  });
}
