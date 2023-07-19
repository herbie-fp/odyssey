import React, { FC, useEffect } from "react";
const mermaid = require( "mermaid").default;

const DEFAULT_CONFIG = {
  startOnLoad: true,
  // theme: "default",
  securityLevel: "loose",
  // themeCSS: `
  //   g.classGroup rect {
  //     fill: #282a36;
  //     stroke: #6272a4;
  //   } 
  //   g.classGroup text {
  //     fill: #f8f8f2;
  //   }
  //   g.classGroup line {
  //     stroke: #f8f8f2;
  //     stroke-width: 0.5;
  //   }
  //   .classLabel .box {
  //     stroke: #21222c;
  //     stroke-width: 3;
  //     fill: #21222c;
  //     opacity: 1;
  //   }
  //   .classLabel .label {
  //     fill: #f1fa8c;
  //   }
  //   .relation {
  //     stroke: #ff79c6;
  //     stroke-width: 1;
  //   }
  //   #compositionStart, #compositionEnd {
  //     fill: #bd93f9;
  //     stroke: #bd93f9;
  //     stroke-width: 1;
  //   }
  //   #aggregationEnd, #aggregationStart {
  //     fill: #21222c;
  //     stroke: #50fa7b;
  //     stroke-width: 1;
  //   }
  //   #dependencyStart, #dependencyEnd {
  //     fill: #00bcd4;
  //     stroke: #00bcd4;
  //     stroke-width: 1;
  //   } 
  //   #extensionStart, #extensionEnd {
  //     fill: #f8f8f2;
  //     stroke: #f8f8f2;
  //     stroke-width: 1;
  //   }`,
  // fontFamily: "Fira Code"
}

// mermaid.initialize();

export default class Mermaid extends React.Component<{chart: string}, {}> {
  componentDidMount() {
    mermaid.contentLoaded();
  }
  componentDidUpdate(prevProps:any, prevState:any) {
    if (document === null) { return }
    if (prevProps.chart !== this.props.chart) {
      //@ts-ignore
      document
        .getElementById("mermaid-chart")
        .removeAttribute("data-processed");
      mermaid.contentLoaded();
    }
  }

  render() {
    return (
      <div id="mermaid-chart" className="mermaid">
        {this.props.chart}
      </div>
    );
  }
}

// export interface MermaidProps {
//   name?: any;
//   children: any;
// }

// export const Mermaid: FC<MermaidProps> = ({ children }) => {
//   mermaid.initialize(DEFAULT_CONFIG);

//   useEffect(() => {
//     mermaid.contentLoaded();
//   }, [children]);

//   return (
//     <div className="mermaid" style={{ textAlign: 'center' }}>
//       {children}
//     </div>
//   );
// };