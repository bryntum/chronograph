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
            'chronograph/010_graph.t.js',
            'chronograph/020_performance.t.js'
        ]
    },
    {
        group       : 'graph',

        items       : [
            'graph/010_walkable.t.js',
            'graph/020_node.t.js'
        ]
    }
);
