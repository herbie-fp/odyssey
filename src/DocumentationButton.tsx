export const DocumentationButton = () => {
  const handleButtonClick = () => {
    //@ts-ignore
    window.vscode.postMessage(JSON.stringify({
      command: 'openLink',
      link: 'https://github.com/herbie-fp/odyssey'
    }))
  };

  return (
    <button onClick={handleButtonClick}>
      Documentation
    </button>
  );
};