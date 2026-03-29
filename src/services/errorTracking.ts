/**
 * Lightweight error tracking service.
 *
 * To upgrade to Sentry:
 *   1. npm install @sentry/react
 *   2. Replace the init() and captureException() calls below
 *   3. Add your Sentry DSN to .env as VITE_SENTRY_DSN
 */

interface ErrorEvent {
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  timestamp: string;
  url: string;
}

const errorLog: ErrorEvent[] = [];

export const ErrorTracking = {
  init() {
    // Global unhandled error handler
    window.addEventListener('error', (event) => {
      this.captureException(event.error || new Error(event.message), {
        source: 'window.onerror',
        filename: event.filename,
        lineno: event.lineno,
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
      this.captureException(error, { source: 'unhandledrejection' });
    });

    console.info('[ErrorTracking] Initialized — errors will be logged to console. Upgrade to Sentry for production monitoring.');
  },

  captureException(error: Error, context?: Record<string, unknown>) {
    const event: ErrorEvent = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    errorLog.push(event);
    console.error('[ErrorTracking]', event.message, context || '');

    // Keep log bounded
    if (errorLog.length > 100) errorLog.shift();
  },

  captureMessage(message: string, context?: Record<string, unknown>) {
    this.captureException(new Error(message), context);
  },

  getErrorLog(): ErrorEvent[] {
    return [...errorLog];
  },
};
