declare const Siesta : any

const project       = new Siesta.Project.Browser()

project.configure({
    title                   : 'ChronoGraph Test Suite',
    isEcmaModule            : true,

    preload     : [
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
            'chronograph/020_performance.t.js',
            'chronograph/030_behavior.t.js'
        ]
    },
    {
        group       : 'graph',

        items       : [
            'graph/010_walkable.t.js',
            'graph/020_node.t.js'
        ]
    },
    {
        group       : 'schema',

        items       : [
            'schema/010_schema.t.js',
        ]
    }
);
