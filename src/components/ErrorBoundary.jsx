import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // If a chunk failed to load (after a new Vercel deployment), auto-reload ONCE
    if (error && (error.name === 'TypeError' || error.message?.includes('dynamically imported module') || error.message?.includes('Loading chunk'))) {
      const lastReload = sessionStorage.getItem('last_chunk_reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem('last_chunk_reload', now.toString());
        window.location.reload();
        return { hasError: false, error: null };
      }
    }
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-500">Something went wrong</h2>
          <p className="text-gray-400 mb-4 max-w-md">
            The page encountered a temporary display issue.
          </p>
          {this.state.error && (
            <pre className="bg-neutral-900 border border-red-500/30 text-red-400 p-4 rounded-lg text-xs text-left max-w-2xl overflow-auto mb-6 max-h-60 w-full font-mono">
              {this.state.error.toString()}
              {"\n"}
              {this.state.error.stack}
            </pre>
          )}
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
