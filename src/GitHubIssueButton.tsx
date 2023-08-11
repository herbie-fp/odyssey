import React from 'react';

const link = 'https://github.com/herbie-fp/odyssey/issues/new';

const GitHubIssueButton = () => {
  const handleButtonClick = () => {
    window.open(link, '_blank');
  };

  return (
    <button onClick={handleButtonClick}>
      Open GitHub Issue
    </button>
  );
};

export default GitHubIssueButton;