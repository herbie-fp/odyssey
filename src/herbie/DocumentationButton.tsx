export const DocumentationButton = () => {
  const handleButtonClick = () => {
    //@ts-ignore
    window.vscode.postMessage(JSON.stringify({
      command: 'openLink',
      link: 'https://github.com/herbie-fp/odyssey'
    }))
  };

  return (
    <a onClick={handleButtonClick}>
      Documentation
    </a>
  );
};