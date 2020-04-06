import { ChronoGraph } from "../../src/chrono/Graph.js"
import { CytoscapeWrapper } from "./Cytoscape.js"

declare const window, document : any

const graph : ChronoGraph       = ChronoGraph.new()

const i1        = graph.variableNamed('i1', 0)
const i2        = graph.variableNamed('i2', 10)
const i3        = graph.variableNamed('i3', 0)

const c1        = graph.identifierNamed('c1', function* () {
    return (yield i1) + (yield i2)
})

const c2        = graph.identifierNamed('c2', function* () {
    return (yield c1) + 1
})

const c3        = graph.identifierNamed('c3', function* () {
    return (yield c2) + (yield i3)
})

graph.commit()


window.addEventListener('load', () => {
    const wrapper   = CytoscapeWrapper.new({ graph })

    wrapper.renderTo(document.getElementById('graph'))
})

