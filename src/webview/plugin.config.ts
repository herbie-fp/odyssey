export default [
  {
    id: -1,
    name: 'platform',
    tables: [
      // 'API'
      'Plugins',
      'Tables',
      'Selections',
      'Rules',
      'Actions',
      'Views', 
      'Tasks' ],
    actions: ['create'],
    rules: [
      {
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
        table: 'Views',
        fn: 'getPluginViews'
      },
      {
        selector: 'Plugins',
        table: 'Actions',
        fn: 'getPluginActions'
      }
    ],
    advanced: {
      addConfigHandler: 'init'  // Call this function on the plugin configuration list to change configuration behavior.
      // TODO (export init in platform module)
    }
  },
  {
    id: -1,
    name: 'defaults',  // (Last definition wins.)
    tables: [ 'Pane' ],  // Use Panes for UI-related view info
    views: [{
        type: 'table',
        //keys: 'all',
        fn: 'TableView'
      }, {
        type: 'selection',
        //keys: 'all',
        fn: 'DetailView'
      }, {
        type: 'multiselection',
        //keys: 'all',
        fn: 'ComparisonView'
      }],
    tasks: [ 'ExploreTask' ]  // TODO show all tables + allow opening panes like the general interaction model sketch
  },
  {
    id: 1, 
    name: 'herbie', 
    tasks: [{
      // **for now**, just attach views to the tables directly (not reusable)
      tables: [{  // special configuration variable for defining tables with views
          name: 'Spec',
          view: {
            table: 'SpecTableView',    // TODO grab the first related analysis as a visual?
            select: 'SpecDetailView'
          }
        }, 
        'Sample', 
        { name: 'Expression',
          view: {
            table: 'ExpressionTableView',
            select: 'ExpressionDetailView',
            compare: 'ExpressionComparisonView'
          }
        }, 'Analysis'],
      target: 'ErrorGraphTask'  // TODO different structure--focus on entering + visualizing expressions
    }]
  }
]