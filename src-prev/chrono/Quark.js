import { Base } from "../class/Mixin.js";
import { MinimalNode } from "../graph/Node.js";
import { Box } from "./Box.js";
import { HasId } from "./HasId.js";
//---------------------------------------------------------------------------------------------------------------------
export class Identifier extends Base {
}
//---------------------------------------------------------------------------------------------------------------------
export class Variable extends Base {
    write(...args) {
        return MinimalQuark.new({
            identifier: this,
            iterator: true,
            iterationResult: { value: args, done: true }
        });
    }
}
//---------------------------------------------------------------------------------------------------------------------
export const Observable = (base) => class Observable extends base {
    observe(calculation, calculationContext) {
        return MinimalQuark.new({
            observable: this,
            calculation: calculation,
            calculationContext: calculationContext
        });
    }
};
export class MinimalObservable extends Observable(Base) {
}
//---------------------------------------------------------------------------------------------------------------------
export const WriteableObservable = (base) => class WriteableObservable extends base {
    write(...args) {
        return MinimalQuark.new({
            observable: this,
            iterator: true,
            iterationResult: { value: args, done: true }
        });
    }
};
//---------------------------------------------------------------------------------------------------------------------
export const Snapshot = (base) => class Snapshot extends base {
};
//---------------------------------------------------------------------------------------------------------------------
export const Quark = (base) => class Quark extends base {
};
//---------------------------------------------------------------------------------------------------------------------
export const Quark = (base) => class Quark extends base {
    observe() {
    }
};
//---------------------------------------------------------------------------------------------------------------------
export const ChronoAtom = (base) => class ChronoAtom extends base {
    get value() {
        const quark = this.current;
        return quark && quark.isCalculationCompleted() ? quark.value : undefined;
    }
    *calculation() {
        throw new Error("Abstract method `calculation` called");
    }
    getCalculationQuark() {
        return MinimalQuark.new({
            graph: this,
            calculation: this.calculation,
            calculationContext: this.calculationContext || this
        });
    }
    onEnterGraph(graph) {
        this.graph = graph;
        delete this.putData;
    }
    propagateSync(context) {
        this.activeTransaction.runSyncWithEffect(context.onEffect);
        this.applyTransaction(this.activeTransaction);
        return PropagationResult.Completed;
    }
    async propagateAsync(context) {
        await this.activeTransaction.runAsyncWithEffect(context.onEffect);
        this.applyTransaction(this.activeTransaction);
        return PropagationResult.Completed;
    }
};
export const isChronoAtom = (value) => Boolean(value && value[isChronoAtomSymbol]);
//---------------------------------------------------------------------------------------------------------------------
export class MinimalChronoAtom extends ChronoAtom(HasId(Box(MinimalNode))) {
}
