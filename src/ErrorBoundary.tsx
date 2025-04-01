import { ReactNode, useEffect } from "react";
import { showErrorToast } from "./ErrorToast";

const ErrorBoundary = ({ children }: { children: ReactNode }) => {
    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            console.log('caught error', event);
            showErrorToast(event.message);
        };

        window.addEventListener("error", handleError);
        return () => window.removeEventListener("error", handleError);
    }, []);

    return <>{children}</>;
};

export default ErrorBoundary;
