declare let Siesta : any

let project : any

if (typeof process !== 'undefined' && typeof require !== 'undefined') {
    Siesta          = require('siesta-lite')

    project         = new Siesta.Project.NodeJS()
} else {
    project         = new Siesta.Project.Browser()
}

project.configure({
    title                   : 'ChronoGraph Test Suite',
    isEcmaModule            : true
})


project.start(
    {
        group       : 'Class',

        items       : [
            'class/020_mixin.t.js',
            'class/030_mixin_caching.t.js'
        ]
    },
    {
        group       : 'Iterator',

        items       : [
            'collection/010_chained_iterator.t.js',
        ]
    },
    {
        group       : 'Graph',

        items       : [
            'graph/010_walkable.t.js',
            'graph/020_node.t.js',
            'graph/030_cycle.t.js'
        ]
    },
    {
        group       : 'ChronoGraph2',

        items       : [
            'chrono2/box.t.js',
            'chrono2/calculable_box_common.t.js',
            'chrono2/calculable_box_gen.t.js',
            'chrono2/calculable_box_sync.t.js',
            'chrono2/calculable_box_async.t.js',
            'chrono2/calculable_box_mixed.t.js',
            'chrono2/calculable_box_proposed_value.t.js',
            'chrono2/calculable_box_lazyness.t.js',
            'chrono2/calculable_box_reading_past.t.js',
            'chrono2/calculable_box_propagation.t.js',
            'chrono2/calculable_box_write_during_calculation.t.js',
            'chrono2/calculable_box_cycle.t.js',
            'chrono2/calculable_box_etalon.t.js',
            'chrono2/graph.t.js',
            'chrono2/graph_commit.t.js',
            'chrono2/graph_auto_commit.t.js',
            'chrono2/graph_reject.t.js',
            'chrono2/graph_undo_redo.t.js',
            'chrono2/graph_branching.t.js',
            'chrono2/graph_garbage_collection.t.js',
            'chrono2/graph_cleanup.t.js',
            'chrono2/record.t.js',
        ]
    },
    {
        group       : 'Schema2',

        items       : [
            'schema2/schema.t.js',
            'schema2/entity_inheritance.t.js',
            'schema2/entity_fields.t.js'
        ]
    },
    {
        group       : 'Replica2',

        items       : [
            'replica2/replica.t.js',
            'replica2/cycle_info.t.js',
            'replica2/reference.t.js',
            'replica2/cycle_dispatcher_example.t.js',
            'replica2/replica_write.t.js'
        ]
    },
    {
        group       : 'Cycle resolver',

        items       : [
            'cycle_resolver/010_memoizing.t.js',
            'cycle_resolver/020_sed.t.js',
            'cycle_resolver/030_sedwu_fixed_duration.t.js',
            'cycle_resolver/040_sedwu_fixed_duration_effort_driven.t.js',
            'cycle_resolver/050_sedwu_fixed_effort.t.js',
            'cycle_resolver/060_sedwu_fixed_units.t.js',
        ]
    },
    {
        group       : 'chrono-userland',

        items       : [
        ]
    },
    {
        group       : 'Visualization',

        items       : [
            // {
            //     pageUrl     : 'pages/cytoscape.html',
            //     url         : 'visualization/010_replica.t.js'
            // }
        ]
    },
    {
        group       : 'Util',

        items       : [
            'util/uniqable.t.js'
        ]
    },
    {
        group       : 'Events',

        items       : [
            'event/events.t.js'
        ]
    }
)
