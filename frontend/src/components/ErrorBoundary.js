import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true,
      errorId: Date.now().toString()
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // You can also log the error to an error reporting service here
    this.logErrorToService(error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  logErrorToService = (error, errorInfo) => {
    // In a production app, you'd send this to a service like Sentry, LogRocket, etc.
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorId: this.state.errorId
    };
    
    // For now, just log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Report ${this.state.errorId}`);
      console.error('Error:', errorReport);
      console.groupEnd();
    }
    
    // In production, you might send to an error tracking service:
    // errorTrackingService.captureException(errorReport);
  };

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null 
    });
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900 mb-2">
                Oops! Something went wrong
              </CardTitle>
              <p className="text-gray-600">
                We're sorry, but something unexpected happened. Our team has been notified.
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={this.handleRetry} className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={this.handleRefresh} className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Refresh Page
                </Button>
                <Button variant="outline" onClick={this.handleGoHome} className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
              </div>
              
              {/* Error ID for support */}
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  Error ID: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{this.state.errorId}</code>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Please include this ID when contacting support
                </p>
              </div>
              
              {/* Development Error Details */}
              {isDevelopment && this.state.error && (
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    🔧 Development Error Details (Click to expand)
                  </summary>
                  <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="font-medium text-red-800 mb-2">Error Message:</h4>
                    <pre className="text-sm text-red-700 whitespace-pre-wrap mb-4">
                      {this.state.error.message}
                    </pre>
                    
                    <h4 className="font-medium text-red-800 mb-2">Component Stack:</h4>
                    <pre className="text-xs text-red-600 whitespace-pre-wrap bg-red-100 p-2 rounded overflow-auto max-h-40">
                      {this.state.errorInfo?.componentStack}
                    </pre>
                    
                    <h4 className="font-medium text-red-800 mb-2 mt-4">Error Stack:</h4>
                    <pre className="text-xs text-red-600 whitespace-pre-wrap bg-red-100 p-2 rounded overflow-auto max-h-40">
                      {this.state.error.stack}
                    </pre>
                  </div>
                </details>
              )}
              
              {/* Help Text */}
              <div className="text-center text-sm text-gray-500">
                <p>If this problem persists, please try:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Clearing your browser cache</li>
                  <li>Checking your internet connection</li>
                  <li>Contacting support if the issue continues</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;