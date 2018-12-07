declare const Siesta : any

const project       = new Siesta.Harness.Browser()

project.configure({
    title                   : 'ChronoGraph Test Suite',
    isEcmaModule            : true,

    preload     : [
        // '../node_modules/later/later.js'
    ]
});


project.start(
    {
        group       : 'chrono',
        items       : [
            'chrono/010_atom.t.js',
            'chrono/020_immutable.t.js',
            'chrono/030_box.t.js'
        ]
    },
    {
        group       : 'chronograph',

        items       : [
            // 'scheduling/inheritance_from_model.js',
            // 'scheduling/basic.js',
            // 'scheduling/basic_with_calendar.js',
            // 'scheduling/floating.js',
            // 'scheduling/date_interval.js'
        ]
    },
    {
        group       : 'graph',

        items       : [
            'graph/010_walkable.t.js',
            'graph/020_node.t.js',
            'graph/030_graph.t.js',
            'graph/040_performance.t.js'
        ]
    }
);
