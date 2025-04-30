import React from "react";
import { ToastContainer, toast } from "react-toastify";
import { ExternalLink } from "lucide-react";

const showErrorToast = (message: string) => {
  const issueTitle = encodeURIComponent(`Bug Report: ${message}`);
  const issueBody = encodeURIComponent(`### Description\n${message}\n\n### Steps to Reproduce\n1. ...\n2. ...\n\n### Expected Behavior\n...\n\n### Screenshots\n\n### Additional Context\n`);

  const githubIssueUrl = `https://github.com/herbie-fp/odyssey/issues/new?title=${issueTitle}&body=${issueBody}`;

  toast.error(
    <div className="flex items-center justify-between gap-2">
      <span>{message}</span>
      <a
        href={githubIssueUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center px-2 py-1 text-sm font-medium text-blue-600 hover:underline"
      >
        <ExternalLink size={16} className="mr-1" />
        Report
      </a>
    </div>,
    {
      position: "bottom-left",
      autoClose: false,
      hideProgressBar: false,
      closeOnClick: false,
      pauseOnHover: true,
      progress: undefined,
    }
  );
};

export { showErrorToast };
