import React from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Copy } from "lucide-react";

const showErrorToast = (message: string) => {
  toast.error(
    <div className="flex items-center justify-between">
      <span>{message}</span>
      <button
        onClick={() => navigator.clipboard.writeText(message)}
        className="ml-4 flex items-center px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
      >
        <Copy size={16} className="mr-1" /> Copy
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
      <button 
        onClick={() => showErrorToast("Something went wrong!")}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Show Error
      </button>
      <ToastContainer />
    </div>
  );
};

export default ErrorToast;
export { showErrorToast };
