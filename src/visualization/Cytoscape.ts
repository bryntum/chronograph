import { ChronoGraph } from "../chrono/Graph.js"
import { Identifier } from "../chrono/Identifier.js"
import { Base } from "../class/BetterMixin.js"
import { EntityIdentifier, FieldIdentifier } from "../replica/Identifier.js"

declare const cytoscape, cytoscapeDagre, cytoscapeKlay, cytoscapeCoseBilkent : any

export type Cytoscape = any
export type CytoscapeId = string

export class CytoscapeWrapper extends Base {
    graph           : ChronoGraph   = undefined
    container       : any           = undefined

    hideNodesWithoutOutgoingEdges : boolean     = true

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
        // cytoscape.use(cytoscapeDagre)
        // cytoscape.use(cytoscapeKlay)
        cytoscape.use(cytoscapeCoseBilkent)

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
            // if (this.hideNodesWithoutOutgoingEdges && quark.getOutgoing().size === 0 && !quark.$outgoingPast) return

            // lazy nodes
            if (this.hideNodesWithoutOutgoingEdges && quark.value === undefined) return

            const cytoId    = ID++

            cytoIds.set(identifier, cytoId)

            const data : any     = { id : cytoId, name : identifier.name }

            if (identifier instanceof FieldIdentifier) {
                const entityIden  = identifier.self.$$

                let entityId  = cytoIds.get(entityIden)

                if (!entityId) {
                    entityId    = ID++

                    cytoIds.set(entityIden, entityId)

                    const cytoNode = cyto.add({ group: 'nodes', data : { id : entityId, name : entityIden.name } })
                }

                data.parent = entityId
            }

            const cytoNode = cyto.add({ group: 'nodes', data : data })
        })

        revision.scope.forEach((sourceQuark, identifier) => {
            sourceQuark.outgoingInTheFutureAndPastCb(revision, (targetQuark) => {
                cyto.add({ group: 'edges', data : { source: cytoIds.get(sourceQuark.identifier), target: cytoIds.get(targetQuark.identifier) } })
            })
        })

        // cyto.layout({ name: 'dagre' }).run()
        cyto.layout({ name: 'klay' }).run()
        // cyto.layout({ name: 'cose-bilkent' }).run()

        return cyto
    }
}


