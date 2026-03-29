import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ErrorTracking } from '../services/errorTracking';

interface Props {
  children: React.ReactNode;
  viewName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ViewErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    ErrorTracking.captureException(error, {
      view: this.props.viewName,
      componentStack: errorInfo?.componentStack,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <div className="max-w-md w-full text-center">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5 ring-1 ring-red-100">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {this.props.viewName ? `${this.props.viewName} failed to load` : 'Something went wrong'}
            </h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              An unexpected error occurred. Try again, or contact support if the problem persists.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="text-xs text-left bg-slate-100 text-red-600 p-3 rounded-xl mb-6 overflow-auto max-h-32 ring-1 ring-slate-200">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-slate-900/20"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ViewErrorBoundary;
