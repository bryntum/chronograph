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
            'chrono2/calculable_box_propagation.t.js',
            'chrono2/calculable_box_write_during_calculation.t.js',
            'chrono2/calculable_box_cycle.t.js',
            'chrono2/graph.t.js',
            'chrono2/graph_commit.t.js',
            'chrono2/graph_auto_commit.t.js',
            'chrono2/graph_reject.t.js',
            'chrono2/graph_undo_redo.t.js',
            'chrono2/graph_branching.t.js',
            'chrono2/graph_garbage_collection.t.js',
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
        ]
    },
    {
        group       : 'ChronoGraph',

        items       : [
            'chrono/010_identifier_variable.t.js',
            'chrono/011_lazy_identifier.t.js',
            'chrono/012_impure_calculated_value.t.js',
            'chrono/013_sync_calculation.t.js',
            'chrono/013_async_calculation.t.js',
            'chrono/015_listeners.t.js',
            'chrono/016_recursion.t.js',
            'chrono/017_identifier_listener.t.js',
            'chrono/020_graph_branching.t.js',
            'chrono/030_propagation.t.js',
            'chrono/030_propagation_2.t.js',
            'chrono/030_transaction_reject.t.js',
            'chrono/030_iteration.t.js',
            'chrono/031_garbage_collection.t.js',
            'chrono/032_propagation_options.t.js',
            'chrono/032_commit_async.t.js',
            'chrono/033_cycle_info.t.js',
            'chrono/040_add_remove.t.js',
            'chrono/050_undo_redo.t.js',
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
        group       : 'Replica',

        items       : [
            'replica/001_entity.t.js',
            'replica/002_fields.t.js',
            'replica/010_replica.t.js',
            'replica/020_reference.t.js',
            'replica/025_tree_node.t.js',
            'replica/030_cycle_dispatcher_example.t.js',
            'replica/033_cycle_info.t.js',
            'replica/040_calculate_only.t.js'
        ]
    },
    {
        group       : 'Schema',

        items       : [
            'schema/010_schema.t.js',
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
