import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-red-500/30 rounded-lg p-8 max-w-md w-full text-center shadow-2xl">
                        <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">System Error Detected</h2>
                        <p className="text-slate-400 mb-6">
                            The application encountered an unexpected error.
                        </p>
                        <div className="bg-slate-950 p-4 rounded text-left mb-6 overflow-auto max-h-32 border border-slate-800">
                            <code className="text-red-400 text-sm font-mono">{this.state.error?.toString()}</code>
                        </div>
                        <button
                            onClick={this.handleReload}
                            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
