import React from 'react';

const GitHubIssueButton = () => {
  const handleButtonClick = () => {
    //@ts-ignore
    window.vscode.postMessage(JSON.stringify({
      command: 'openLink',
      link: 'https://github.com/herbie-fp/odyssey/issues/new'
    }))
  };

  return (
    <button onClick={handleButtonClick}>
      Open GitHub Issue
    </button>
  );
};

export default GitHubIssueButton;