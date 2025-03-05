import React from "react";
import { ToastContainer, toast } from "react-toastify";
import { Copy } from "lucide-react";

const showErrorToast = (message: string) => {
  toast.error(
    <div>
      <span>{message}</span>
      <button onClick={() => navigator.clipboard.writeText(message)}>
        <Copy size={16} /> Copy
      </button>
    </div>,
    {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    }
  );
};

const ErrorToast = () => {
  return (
    <div>
      <button onClick={() => showErrorToast("Something went wrong!")}>Show Error</button>
      <ToastContainer />
    </div>
  );
};

export default ErrorToast;
export { showErrorToast };
