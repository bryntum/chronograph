declare const Siesta : any

const project       = new Siesta.Project.Browser()

project.configure({
    title                   : 'ChronoGraph Test Suite',
    isEcmaModule            : true
})


project.start(
    {
        group       : 'chrono',

        items       : [
            'chrono/010_graph.t.js',
            'chrono/020_performance.t.js',
            'chrono/030_behavior.t.js',
            'chrono/040_effects.t.js'
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
        group       : 'replica',

        items       : [
            'replica/010_replica.t.js',
            'replica/020_relation.t.js',
            'replica/030_relation_tree.t.js',
            'replica/040_fields_leak.t.js'
        ]
    },
    {
        group       : 'schema',

        items       : [
            'schema/010_schema.t.js',
        ]
    }
)
