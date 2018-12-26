import { Calculable } from "../chrono/Atom.js";
import { MutationData } from "../chrono/MutationData.js";
import { MinimalBox } from "./Box.js";
import { MinimalChronoGraphNode } from "./Node.js";
//---------------------------------------------------------------------------------------------------------------------
export const ChronoMutationBox = (base) => class ChronoMutationBox extends base {
    constructor() {
        super(...arguments);
        this.timesCalculated = 0;
    }
    addEdges() {
        this.mapInput(this.input, (box) => box.addEdgeTo(this));
        this.output.map((box) => this.addEdgeTo(box));
    }
    removeEdges() {
        this.mapInput(this.input, (box) => box.removeEdgeTo(this));
        this.output.map((box) => this.removeEdgeTo(box));
    }
    calculate() {
        const input = this.mapInput(this.input, box => box.get());
        const result = Array.isArray(input) ? this.calculation.apply(this, input) : this.calculation(input);
        this.timesCalculated++;
        return this.output.map(box => {
            box.set(result);
            return box.value;
        });
    }
    needsRecalculation(graph) {
        if (this.timesCalculated === 0)
            return true;
        let someIsDirty = false;
        this.mapInput(this.input, (box) => {
            if (graph.hasDirectNode(box.value)) {
                someIsDirty = true;
            }
        });
        return someIsDirty;
    }
};
export const MinimalChronoMutationBox = ChronoMutationBox(MutationData(Calculable(MinimalBox)));
//---------------------------------------------------------------------------------------------------------------------
export const ChronoBehavior = (base) => class ChronoBehavior extends base {
    constructor() {
        super(...arguments);
        this.edgesStorage = 'inputs';
        this.inputs = new Set();
        this.timesCalculated = 0;
    }
    calculate() {
        const input = this.mapInput(this.input, box => box.get());
        const result = Array.isArray(input) ? this.calculation.apply(this, input) : this.calculation(input);
        this.timesCalculated++;
        return result;
    }
    needsRecalculation(graph) {
        if (this.timesCalculated === 0)
            return true;
        let someIsDirty = false;
        this.mapInput(this.input, (box) => {
            if (graph.hasDirectNode(box.value)) {
                someIsDirty = true;
            }
        });
        return someIsDirty;
    }
    addEdges() {
        this.mapInput(this.input, (node) => {
            node.toBehavior.add(this);
            this.inputs.add(node);
        });
    }
    getIncoming() {
        return this.input;
    }
    forEachIncoming(context, func) {
        this.input.forEach(func);
    }
    getOutgoing() {
        return [];
    }
    forEachOutgoing(context, func) {
    }
};
export const MinimalChronoBehavior = ChronoBehavior(Calculable(MutationData(MinimalChronoGraphNode)));
