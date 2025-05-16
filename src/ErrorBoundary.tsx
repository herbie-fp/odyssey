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
        window.addEventListener("unhandledrejection", event => {
            showErrorToast(event.reason?.message || "Unhandled Promise rejection");
            console.log("unhandled rejection", event.reason);
        });        
        return () => window.removeEventListener("error", handleError);
    }, []);

    return <>{children}</>;
};

export default ErrorBoundary;
