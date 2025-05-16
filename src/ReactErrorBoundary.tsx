import React, { ReactNode, ErrorInfo } from "react";

interface ReactErrorBoundaryProps {
  children: ReactNode;
}

interface ReactErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ReactErrorBoundary extends React.Component<
  ReactErrorBoundaryProps,
  ReactErrorBoundaryState
> {
  constructor(props: ReactErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ReactErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}

export default ReactErrorBoundary;
