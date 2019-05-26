import { Base } from "../class/Mixin.js";
import { MinimalNode } from "../graph/Node.js";
import { Box } from "./Box.js";
import { ChronoCalculation } from "./Calculation.js";
import { Effect } from "./Effect.js";
//---------------------------------------------------------------------------------------------------------------------
export class CalculationNodePropagation extends Base {
}
//---------------------------------------------------------------------------------------------------------------------
export class CalculationCycle extends Effect {
}
// //---------------------------------------------------------------------------------------------------------------------
// export class InputMarker extends CalculationNode {
//     atom            : ChronoAtom
// }
const isChronoCalculationSymbol = Symbol('isChronoCalculationSymbol');
//---------------------------------------------------------------------------------------------------------------------
export const CalculationNode = (base) => class CalculationNode extends base {
    constructor() {
        super(...arguments);
        // revision                : RevisionNode  = RevisionNode.new()
        // basedOn                 : RevisionNode
        this.isOpened = true;
    }
    [isChronoCalculationSymbol]() { }
    // // `Map` preserves the order of addition, so this data is also ordered
    // proposedData            : Map<CalculationNode, ChronoValue[]>    = new Map()
    // put (...args : this[ 'ArgsT' ]) {
    //     this.addProposedCalculationNode(this, args)
    // }
    addProposedCalculationNode(node, args) {
        this.addEdgeFrom(node, args);
    }
    getProposedDataFor(node) {
        return this.getLabelFrom(node);
    }
    close() {
        this.isOpened = false;
    }
    onEffect(effect) {
    }
    *calculation(...args) {
        this.close();
        const calculationStack = Array.from(this.incoming.keys());
        while (calculationStack.length) {
            const calculationNode = calculationStack[calculationStack.length - 1];
            if (calculationNode.isCalculationCompleted()) {
                calculationStack.pop();
                continue;
            }
            let iterationResult = calculationNode.isCalculationStarted() ? calculationNode.iterationResult : calculationNode.startCalculation();
            do {
                const value = iterationResult.value;
                if (iterationResult.done) {
                    calculationStack.pop();
                    break;
                }
                else if (isCalculationNode(value)) {
                    const requestedCalculationNode = value;
                    calculationNode.addEdgeFrom(requestedCalculationNode);
                    if (!requestedCalculationNode.isCalculationStarted()) {
                        calculationStack.push(requestedCalculationNode);
                        break;
                    }
                    else if (requestedCalculationNode.isCalculationCompleted()) {
                        iterationResult = calculationNode.supplyYieldValue(requestedCalculationNode.value);
                    }
                    else {
                        // yield started, but not completed calculations to outer context
                        iterationResult = calculationNode.supplyYieldValue(yield value);
                    }
                }
                else {
                    // bypass the unrecognized effect to the outer context
                    iterationResult = calculationNode.supplyYieldValue(yield value);
                }
            } while (true);
        }
        return this;
    }
};
export class MinimalCalculationNode extends CalculationNode(ChronoCalculation(Box(MinimalNode))) {
}
//---------------------------------------------------------------------------------------------------------------------
export const isCalculationNode = (value) => Boolean(value && value[isChronoCalculationSymbol]);
