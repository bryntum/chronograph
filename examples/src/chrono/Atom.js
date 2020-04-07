import { MinimalNode } from "../graph/Node.js";
import { PropagationResult } from "./Graph.js";
import { HasId } from "./HasId.js";
//---------------------------------------------------------------------------------------------------------------------
export const strictEquality = (v1, v2) => v1 === v2;
export const strictEqualityWithDates = (v1, v2) => {
    if ((v1 instanceof Date) && (v2 instanceof Date))
        return v1 - v2 === 0;
    return v1 === v2;
};
//---------------------------------------------------------------------------------------------------------------------
export const ChronoAtom = (base) => class ChronoAtom extends base {
    constructor() {
        super(...arguments);
        this.equality = strictEqualityWithDates;
        this.observedDuringCalculation = [];
    }
    clearUserInput() {
        this.proposedValue = undefined;
        this.proposedArgs = undefined;
    }
    commitValue() {
        const nextStableValue = this.nextStableValue;
        this.nextStableValue = undefined;
        // this assignment may cause side effects (when using delegated storage)
        // so we do it after the `this.nextStableValue` is cleared
        this.value = nextStableValue;
    }
    commitEdges() {
        this.incoming.forEach((from) => this.removeEdgeFrom(from));
        this.observedDuringCalculation.forEach((from) => this.addEdgeFrom(from));
        this.observedDuringCalculation = [];
    }
    reject() {
        this.nextStableValue = undefined;
        this.observedDuringCalculation = [];
    }
    *calculate(proposedValue) {
        if (this.calculation) {
            return yield* this.calculation.call(this.calculationContext || this, proposedValue);
        }
        else
            // identity-like case, translates to user-provided or current value
            return proposedValue !== undefined ? proposedValue : this.value;
    }
    hasValue() {
        return this.hasNextStableValue() || this.hasProposedValue() || this.hasConsistentValue();
    }
    hasStableValue() {
        return this.hasNextStableValue() || this.hasConsistentValue();
    }
    hasNextStableValue() {
        return this.nextStableValue !== undefined;
    }
    hasConsistentValue() {
        return this.value !== undefined;
    }
    hasProposedValue() {
        return this.proposedArgs !== undefined && this.proposedArgs[0] !== undefined;
    }
    get() {
        if (this.hasNextStableValue()) {
            return this.getNextStableValue();
        }
        else if (this.hasProposedValue()) {
            return this.getProposedValue();
        }
        else {
            return this.getConsistentValue();
        }
    }
    put(proposedValue, ...args) {
        this.proposedValue = proposedValue;
        this.proposedArgs = Array.prototype.slice.call(arguments);
        this.graph && this.graph.markAsNeedRecalculation(this);
    }
    getNextStableValue() {
        return this.nextStableValue;
    }
    getConsistentValue() {
        return this.value;
    }
    getProposedValue() {
        return this.proposedValue;
    }
    async set(proposedValue, ...args) {
        const graph = this.graph;
        this.put(proposedValue, ...args);
        return graph ? graph.propagate() : Promise.resolve(PropagationResult.Completed);
    }
    onEnterGraph(graph) {
        this.graph = graph;
    }
    onLeaveGraph(graph) {
        this.graph = undefined;
    }
};
//---------------------------------------------------------------------------------------------------------------------
export class MinimalChronoAtom extends ChronoAtom(HasId(MinimalNode)) {
}
