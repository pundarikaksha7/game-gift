type EventName =
  | 'seo_landing_view'
  | 'create_game_clicked'
  | 'example_viewed'
  | 'signup_started'
  | 'signup_completed'
  | 'game_creation_started'
  | 'checkout_started'
  | 'purchase_completed';

let capture: ((name: string, properties?: Record<string, unknown>) => void) | undefined;

export async function initializeAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  const host = import.meta.env.VITE_POSTHOG_HOST;
  if (!key || !host) return;
  const { default: posthog } = await import('posthog-js');
  posthog.init(key, {
    api_host: host,
    autocapture: false,
    capture_pageview: false,
    persistence: 'memory',
    person_profiles: 'identified_only',
  });
  capture = (name, properties) => posthog.capture(name, properties);
}

export function track(name: EventName, properties: Record<string, unknown> = {}) {
  capture?.(name, properties);
}
