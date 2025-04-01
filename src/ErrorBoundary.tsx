import { Component, ReactNode } from "react";
import { showErrorToast } from "./ErrorToast";

//TODO : Convert to modern React

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
        window.addEventListener("error", (event) => {
            console.log('caught error', event)
            showErrorToast(event.message)
            //vscode.postMessage(JSON.stringify({ command: 'error', error: event.error?.toString ? event.error.toString() : (JSON.stringify(event.error) + '\\n' + 'Message:' + event.message) }))
        }, { once: true })
        // window.addEventListener("unhandledrejection", (event) => {
        //     console.log('caught unhandledrejection', event)
        //     showErrorToast(JSON.stringify(event))
        //     //vscode.postMessage(JSON.stringify({ command: 'error', error: event.reason.stack }))
        // })
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
