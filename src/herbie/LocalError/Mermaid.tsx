import React from "react";
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
  themeVariables: {
    "fontSize": '10px'
  }
}

mermaid.initialize(DEFAULT_CONFIG);

export default class Mermaid extends React.Component<{ chart: string }, { id: string }> {
  constructor(props: any) {
    super(props)
    this.state = {
      id: "mermaid-chart" + Math.random()
    }
  }
  componentDidMount() {
    mermaid.contentLoaded();
  }
  componentDidUpdate(prevProps: any, prevState: any) {
    if (document === null) { return }
    if (prevProps.chart !== this.props.chart) {
      //@ts-ignore
      document
        .getElementById(this.state.id)
        .removeAttribute("data-processed");
      mermaid.contentLoaded();
    }
  }

  render() {
    return (
      <div id={this.state.id} className="mermaid" >
        {this.props.chart}
      </div>
    );
  }
}