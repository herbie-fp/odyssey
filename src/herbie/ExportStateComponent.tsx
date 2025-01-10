import { useState } from 'react';
import Modal from 'react-modal';
import * as HerbieContext from './HerbieContext';

type exportStateProps = {
  specPage: boolean
}

/**
 * State export button that opens modal with "copy state" as JSON option
 */
function ExportStateComponent(props: exportStateProps) {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [importState, setImportState] = useState<string>("");

  // Global variables to be exported with 
  const [spec, setSpec] = HerbieContext.useGlobal(HerbieContext.SpecContext);

  const stateToJson = (e: React.FormEvent) => {
    e.preventDefault(); 
    e.stopPropagation(); 

    const state = {
      SpecContext: {
        expression: spec.expression,
        fpCore: spec.fpcore,
        id: spec.id
      }
      // TODO: add more states
    }

    navigator.clipboard.writeText(JSON.stringify(state)); 

    setIsModalOpen(false);
  }

  const jsonToState = (e: React.FormEvent) => {
    e.preventDefault(); 
    e.stopPropagation(); 

    const jsonState = JSON.parse(importState);
    // TODO: Really have error handling here to make sure all fields of
    // jsonState exist as expected

    setSpec(jsonState.SpecContext);
    // TODO: setting more states (including others needed for initial basic page launch)

    setIsModalOpen(false);
  }

  const customStyles = {
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)'
    },
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'var(--background-color)'
    },
  };

  // Export page
  if (props.specPage) {
    return (
      <div className="importExport">
        <a onClick={() => setIsModalOpen(true)} style={{ color: "var(--background-color)", fontFamily: "Ruda" }}>Import</a>
        <Modal 
          isOpen={isModalOpen}
          onRequestClose={() => setIsModalOpen(false)}
          contentLabel="State Export Modal"
          style={customStyles}
          ariaHideApp={false}
        >
          <form onSubmit={jsonToState}>
            <label>Import analysis state: </label>
            <input type='text' placeholder={"paste state here"} value={importState} onChange={(e) => setImportState(e.target.value)} /> <br></br>
            <button type="submit">import</button>
          </form>
        </Modal>
      </div>
    );
  } else {
    return (
      <div className="importExport">
        <a onClick={() => setIsModalOpen(true)} style={{ color: "var(--background-color)", fontFamily: "Ruda" }}>Export</a>
        <Modal 
          isOpen={isModalOpen}
          onRequestClose={() => setIsModalOpen(false)}
          contentLabel="State Export Modal"
          style={customStyles}
          ariaHideApp={false}
        >
          <form onSubmit={stateToJson}>
            <label>Copy current analysis state: </label>
            <button type="submit">Copy</button>
          </form>
        </Modal>
      </div>
    );
  }
}

export { ExportStateComponent };