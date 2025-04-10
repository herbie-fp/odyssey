import { ReactNode, useEffect } from "react";
import { showErrorToast } from "./ErrorToast";

const ErrorBoundary = ({ children }: { children: ReactNode }) => {
    useEffect(() => {
        let lastErrorTime = 0;
        const debounceMs = 50; 

        const handleError = (event: ErrorEvent) => {
            const now = Date.now();

            if (now - lastErrorTime > debounceMs) {
                console.log('caught error', event);
                showErrorToast(event.message);
                lastErrorTime = now;
            }
        };

        window.addEventListener("error", handleError);
        return () => window.removeEventListener("error", handleError);
    }, []);

    return <>{children}</>;
};

export default ErrorBoundary;
