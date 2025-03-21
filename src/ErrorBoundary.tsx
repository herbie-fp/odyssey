import { Component, ReactNode } from "react";
import { showErrorToast } from "./ErrorToast";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        showErrorToast(error.message || 'An unexpected error occurred.');
        console.error('Caught by ErrorBoundary:', error);
    }

    render() {
        if (this.state.hasError) {
            return null; 
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
