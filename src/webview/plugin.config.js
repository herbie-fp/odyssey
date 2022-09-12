[
  {
    id: -1,
    name: 'platform',
    tables: [
      'Tables',
      'Actions', 
      'Plugins', 
      'Views', 
      'Tasks' ],
    actions: [ 'get', 'set', 'add', 'remove' ],  // (actions on tables)
    advanced: {
      addConfigHandler: 'init'  // Call this function on the plugin configuration list to change configuration behavior.
      // TODO (export init in platform module)
    }
  },
  {
    id: -1,
    name: 'defaults',  // (Last definition wins.)
    tables: [ 'Pane' ],  // Use Panes for UI-related view info
    views: {  // A map from object type selectors to views
      all_tables: 'TableView',  // Sets up default views.
      all_selections: 'DetailView',
      all_multiselections: 'ComparisonView'
    },
    tasks: [ 'ExploreTask' ]  // TODO figure out what this looks like
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
      target: 'ErrorGraphTask'  // TODO figure out what this looks like
    }]
  }
]