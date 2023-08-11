import React from 'react';
import './GitHubIssueButton.css';
import { Uri, env } from 'vscode';

const link = Uri.file('https://github.com/herbie-fp/odyssey/issues/new');

const GitHubIssueButton = () => {
  const handleButtonClick = async () => {
    await env.openExternal(link);
  };

  return (
    <button className="github-issue-button" onClick={handleButtonClick}>
      Open GitHub Issue
    </button>
  );
};

export default GitHubIssueButton;