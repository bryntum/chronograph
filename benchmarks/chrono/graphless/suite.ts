import * as massive_incoming from './massive_incoming.js'
import * as massive_outgoing from './massive_outgoing.js'
import * as massive_incoming_and_outgoing from './massive_incoming_and_outgoing.js'
import * as mutating_graph from './mutating_graph.js'
import * as stable_graph from './stable_graph.js'

export const run = async () => {
    await massive_incoming.run()
    await massive_outgoing.run()
    await massive_incoming_and_outgoing.run()
    await mutating_graph.run()
    await stable_graph.run()
}

run()
