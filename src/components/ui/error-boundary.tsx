import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { ViperButton } from "@/components/ui/viper-button";
import { ViperCard } from "@/components/ui/viper-card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <ViperCard className="max-w-md w-full p-8 text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/10 w-fit">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Oops! Something went wrong
            </h2>
            
            <p className="text-muted-foreground mb-6">
              We hit a snag. Don't worry, your data is safe. Let's get you back on track.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <ViperButton
                variant="outline"
                onClick={this.handleGoHome}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </ViperButton>
              <ViperButton
                onClick={this.handleRetry}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </ViperButton>
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                  Error details
                </summary>
                <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </ViperCard>
        </div>
      );
    }

    return this.props.children;
  }
}
