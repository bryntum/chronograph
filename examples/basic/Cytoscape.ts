import { ChronoGraph } from "../../src/chrono/Graph.js"
import { Identifier } from "../../src/chrono/Identifier.js"
import { Base } from "../../src/class/BetterMixin.js"

declare const cytoscape, cytoscapeDagre : any

export type Cytoscape = any
export type CytoscapeId = string

export class CytoscapeWrapper extends Base {
    graph           : ChronoGraph   = undefined
    container       : any           = undefined

    ids             : Map<Identifier, CytoscapeId>  = new Map()

    $cytoscape      : Cytoscape     = undefined

    get cytoscape () : Cytoscape {
        if (this.$cytoscape !== undefined) return this.$cytoscape

        return this.$cytoscape = this.buildCytoScape()
    }
    
    
    renderTo (elem : any) {
        this.container  = elem
        
        this.cytoscape
    }


    buildCytoScape () : Cytoscape {
        cytoscape.use(cytoscapeDagre)

        const cyto = cytoscape({
            container: this.container,

            style: [
                {
                    selector: 'node',
                    style: {
                        'label': 'data(name)'
                    }
                },

                // {
                //     selector: '.parent',
                //     style: {
                //         'background-color': 'red',
                //         'label': 'data(id)',
                //         'line-color': 'red',
                //     }
                // },

                {
                    selector: 'edge',
                    style: {
                        'curve-style': 'bezier',
                        'width': 3,
                        'line-color': '#ccc',
                        'target-arrow-color': '#ccc',
                        'target-arrow-shape': 'triangle'
                    }
                }
            ]
        })

        const revision  = this.graph.baseRevision

        let ID : number = 0

        const cytoIds = new Map()

        revision.scope.forEach((quark, identifier) => {
            const cytoId = ID++

            const cytoNode = cyto.add({group: 'nodes', data : { id : cytoId, name : identifier.name } })

            cytoIds.set(identifier, cytoId)
        })

        revision.scope.forEach((sourceQuark, identifier) => {
            sourceQuark.outgoingInTheFutureAndPastCb(revision, (targetQuark) => {
                cyto.add({group: 'edges', data : { source: cytoIds.get(sourceQuark.identifier), target: cytoIds.get(targetQuark.identifier) } })
            })
        })

        cyto.layout({ name: 'dagre' }).run()
    }
}


