export default [
  {
    id: -1,
    name: 'platform',
    tables: [
      // 'API'
      'Logs',  // maybe we don't need this table, just ActionLog?
      'Plugins',
      'Tables',
      'Selections',
      'Rules',
      'Actions',
      'ActionLogs'
    ],
    actions: ['create', 'select', 'multiselect'],
    rules: [
      {
        name: 'Set up tables',
        selector: 'Plugins',
        table: 'Tables',
        fn: 'getPluginTables'
      },
      {
        selector: 'Plugins',
        table: 'Rules',
        fn: 'getPluginRules'
      },
      {
        selector: 'Plugins',
        table: 'Actions',
        fn: 'getPluginActions'
      }
    ],
    advanced: {
      addConfigHandler: 'init'
    }
  },
  {
    name: 'ui',
    tables: [
      'Views',
      'Panes',
      'Pages'
    ],
    actions: ['show'],
    rules: [
      {
        selector: 'platform.Plugins',
        table: 'Views',
        fn: 'getPluginViews'
      },
      {
        selector: 'platform.Plugins',
        table: 'Pages',
        fn: 'getPluginPages'
      },
      { // NOTE. Under the hood, Rules + Views are quite similar,
        // and Panes could be generated using Rules without losing information.
        //
        // However, we need special treatment for Views.
        // Most basically, when an object is shown, we don't want to generate
        // panes for every matching View.
        //
        // This special treatment could be accomplished with additional rule
        // attributes, though. For example, by marking rules as "mutex" and
        // adding precedence information, only one matching rule would fire.
        //
        // Nonetheless, reifying Views seems important and practical.
        // (The above strategy could be used to make Views/Pages into a kind of
        // syntactic sugar so the actual representation can be treated uniformly
        // as just tables and rules?)
        selector: 'isShowAction',
        table: 'Panes',
        fn: 'getPane'  // Must route object to correct view
      }
    ],
    advanced: {
      addConfigHandler: 'initUI'
    }
  },
  {
    id: -1,
    name: 'default',
    // rules: [   // example of uniform treatment
    //   {
    //     selector: 'platform.Tables',
    //     table: 'Panes',
    //     fn: 'TableView'
    //   },
    //   {
    //     selector: 'isShowAction',
    //     table: 'Panes',
    //     fn: 'DetailView'
    //   },
    //     selector: 'isShowOnMultiselection',
    //     table: 'Panes',
    //     fn: 'TableView'
    // ],
    rules: [  // TODO scope to explore page
      {
        selector: 'platform.Tables',
        table: 'ui.Panes',
        fn: 'getTableViewPane'
      },
      {
        selector: 'isShowAction',
        table: 'ui.Panes',
        fn: 'getPane'
      }
    ],
    views: [{  // earlier views have higher priority (& later plugins have higher priority)
        selector: 'platform.Tables',
        fn: 'TableView'
      }, {
        selector: 'isMultiSelection',
        fn: 'ComparisonView'
      }, {
        selector: 'isSelection',  // basically matches anything
        fn: 'DetailView'
      }],
    pages: [{
      fn: 'ExplorePage',
      // rules that only run when the page is selected would go here, but 
      // there are none
    }]
  },
  {
    name: 'demo',
    tables: ['Specs', 'Expressions', 'Analyses'],
    //action: ['runFoo'],
    rules: [
      {
        selector: 'Expressions',
        table: 'Analyses',
        fn: 'analyzeExpression'
      },
      {
        selector: 'Specs',
        table: 'Expressions',
        fn: 'addNaiveExpression'
      },
      // {
      //   selector: 'Specs',
      //   table: 'platform.Selections',
      //   fn: 'selectNaiveExpression'
      // },
    ],
    // rules: [
    //   {
    //     selector: 'Foos',
    //     table: 'Bars',
    //     fn: 'convertFoosToBars'
    //   },
    //   {
    //     selector: 'runFooAction',
    //     table: 'Bars',
    //     fn: 'runFoo'
    //   }
    // ],
    pages: [{
      fn: 'mainPage'
    }],
    views: [
      {
        selector: 'Expressions',
        fn: 'ExpressionView'
      }
    ]
  },
  {
    id: 1, 
    name: 'herbie', 
    views: [],
    // tasks: [{
    //   // **for now**, just attach views to the tables directly (not reusable)
    //   tables: [{  // special configuration variable for defining tables with views
    //       name: 'Spec',
    //       view: {
    //         table: 'SpecTableView',    // TODO grab the first related analysis as a visual?
    //         select: 'SpecDetailView'
    //       }
    //     }, 
    //     'Sample', 
    //     { name: 'Expression',
    //       view: {
    //         table: 'ExpressionTableView',
    //         select: 'ExpressionDetailView',
    //         compare: 'ExpressionComparisonView'
    //       }
    //     }, 'Analysis'],
    //   target: 'ErrorGraphTask'  // TODO different structure--focus on entering + visualizing expressions
    // }]
  }
]