import { Base } from "../class/BetterMixin.js";
import { EntityIdentifier, FieldIdentifier } from "../replica/Identifier.js";
export class CytoscapeWrapper extends Base {
    constructor() {
        super(...arguments);
        this.graph = undefined;
        this.container = undefined;
        this.hideNodesWithoutOutgoingEdges = true;
        this.ids = new Map();
        this.$cytoscape = undefined;
    }
    get cytoscape() {
        if (this.$cytoscape !== undefined)
            return this.$cytoscape;
        return this.$cytoscape = this.buildCytoScape();
    }
    renderTo(elem) {
        this.container = elem;
        this.cytoscape;
    }
    buildCytoScape() {
        // cytoscape.use(cytoscapeDagre)
        cytoscape.use(cytoscapeKlay);
        // cytoscape.use(cytoscapeCoseBilkent)
        const cyto = cytoscape({
            container: this.container,
            style: [
                {
                    selector: 'node',
                    style: {
                        'label': 'data(name)',
                        'background-color': '#168BFF',
                    }
                },
                {
                    selector: '.parent',
                    style: {
                        'background-color': '#eee',
                    }
                },
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
        });
        const revision = this.graph.baseRevision;
        let ID = 0;
        const cytoIds = new Map();
        revision.scope.forEach((quark, identifier) => {
            // if (this.hideNodesWithoutOutgoingEdges && quark.getOutgoing().size === 0 && !quark.$outgoingPast) return
            // lazy nodes
            if (this.hideNodesWithoutOutgoingEdges && quark.value === undefined)
                return;
            const cytoId = ID++;
            cytoIds.set(identifier, cytoId);
            const data = { group: 'nodes', data: { id: cytoId, name: identifier.name } };
            if (identifier instanceof FieldIdentifier) {
                const entityIden = identifier.self.$$;
                let entityId = cytoIds.get(entityIden);
                if (entityId === undefined) {
                    entityId = ID++;
                    cytoIds.set(entityIden, entityId);
                    const cytoNode = cyto.add({ group: 'nodes', data: { id: entityId, name: entityIden.name }, classes: ['parent'] });
                }
                data.data.parent = entityId;
            }
            if (identifier instanceof EntityIdentifier) {
                data.classes = ['parent'];
            }
            const cytoNode = cyto.add(data);
        });
        revision.scope.forEach((sourceQuark, identifier) => {
            sourceQuark.outgoingInTheFutureAndPastCb(revision, (targetQuark) => {
                cyto.add({ group: 'edges', data: { source: cytoIds.get(sourceQuark.identifier), target: cytoIds.get(targetQuark.identifier) } });
            });
        });
        // cyto.layout({ name: 'dagre' }).run()
        cyto.layout({ name: 'klay' }).run();
        // cyto.layout({ name: 'cose-bilkent' }).run()
        return cyto;
    }
}
