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
    <a onClick={handleButtonClick} style={{
      color: "var(--background-color)", fontFamily: "Ruda"
    }}>
      Issues
    </a>
  );
};

export default GitHubIssueButton;