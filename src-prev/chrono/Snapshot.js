import { MinimalGraph } from "../graph/Graph.js";
import { cycleInfo, OnCycleAction, WalkForwardContext } from "../graph/Walkable.js";
import { MinimalChronoAtom } from "./Atom.js";
import { CancelPropagationEffect, Effect, EffectResolutionResult, GraphCycleDetectedEffect, RestartPropagationEffect } from "./Effect.js";
//---------------------------------------------------------------------------------------------------------------------
export var PropagationResult;
(function (PropagationResult) {
    PropagationResult[PropagationResult["Canceled"] = 0] = "Canceled";
    PropagationResult[PropagationResult["Completed"] = 1] = "Completed";
    PropagationResult[PropagationResult["Passed"] = 2] = "Passed";
})(PropagationResult || (PropagationResult = {}));
//---------------------------------------------------------------------------------------------------------------------
export const ChronoGraph = (base) => class ChronoGraph extends base {
    constructor() {
        // revision            : ChronoRevision
        super(...arguments);
        this.nodesMap = new Map();
        this.needRecalculationAtoms = new Set();
        this.stableAtoms = new Set();
        // temp workaround to mark changed initial atoms as "need recalculation"
        this.initialAtoms = [];
        this.isPropagating = false;
        this.propagateCompletedListeners = [];
    }
    // processingQueue         : ChronoAtom[]          = []
    // startReadObservation () {
    //     this.isObservingRead++
    // }
    //
    //
    // stopReadObservation () : ChronoAtom[] {
    //     this.isObservingRead--
    //
    //     const res       = this.readObservationState
    //
    //     this.readObservationState   = []
    //
    //     return res
    // }
    // nextRevision () {
    //     return this.revision
    // }
    // onReadObserved (atom : ChronoAtom) {
    //     this.readObservationState.push(atom)
    // }
    //
    //
    // onWriteObserved (atom : ChronoAtom) {
    // }
    isAtomNeedRecalculation(atom) {
        return this.needRecalculationAtoms.has(atom);
    }
    markAsNeedRecalculation(atom) {
        this.needRecalculationAtoms.add(atom);
    }
    markProcessed(atom) {
        this.needRecalculationAtoms.delete(atom);
    }
    markStable(atom) {
        this.stableAtoms.add(atom);
    }
    isAtomStable(atom) {
        return this.stableAtoms.has(atom);
    }
    // processNext (atom : ChronoAtom) {
    //     this.processingQueue.push(atom)
    // }
    commit() {
        this.needRecalculationAtoms.forEach(atom => atom.clearUserInput());
        this.needRecalculationAtoms.clear();
        this.changedAtoms.forEach(atom => atom.commitValue());
        // the edges might have changed, even the atom value itself did not
        // because of that, we commit the edges for all recalculated atoms (stable atoms)
        this.stableAtoms.forEach(atom => atom.commitEdges());
        this.stableAtoms.clear();
        // temp workaround
        this.initialAtoms.forEach((initialAtom) => {
            initialAtom.outgoing.forEach((atom) => {
                // same entity
                if (initialAtom.self === atom.self) {
                    const field = atom.field;
                    if (field && field.continuationOf && field.continuationOf === initialAtom.field) {
                        // do nothing for the "final" atom
                        return;
                    }
                }
                this.markAsNeedRecalculation(atom);
            });
        });
        this.initialAtoms = [];
    }
    reject() {
        this.rejectPartialProgress();
        this.needRecalculationAtoms.forEach(atom => atom.clearUserInput());
        this.needRecalculationAtoms.clear();
    }
    rejectPartialProgress() {
        this.touchedAtoms.forEach((_, atom) => atom.reject());
        this.stableAtoms.clear();
    }
    getOrCreateAtom(id, cls = MinimalChronoAtom) {
        const existing = this.nodesMap.get(id);
        if (existing)
            return existing;
        return this.addNode(cls.new({ id: id }));
    }
    addNode(node) {
        const res = super.addNode(node);
        this.nodesMap.set(node.id, node);
        this.markAsNeedRecalculation(node);
        node.onEnterGraph(this);
        return res;
    }
    removeNode(node) {
        node.outgoing.forEach((toNode) => this.markAsNeedRecalculation(toNode));
        const res = super.removeNode(node);
        this.nodesMap.delete(node.id);
        this.needRecalculationAtoms.delete(node);
        // we probably don't need this line, since `stableAtoms` are internal state of the propagation process
        this.stableAtoms.delete(node);
        node.onLeaveGraph(this);
        return res;
    }
    startAtomCalculation(sourceAtom) {
        const iterator = sourceAtom.calculate(sourceAtom.proposedValue);
        let iteratorValue = iterator.next();
        const value = iteratorValue.value;
        if (value instanceof Effect) {
            return { effect: value, continuation: { iterator: iterator } };
        }
        else if (iteratorValue.done) {
            return { value };
        }
        else {
            return { continuation: { atom: value, iterator: iterator } };
        }
    }
    continueAtomCalculation(sourceAtom, continuation, maybeDirtyAtoms) {
        const me = this, iterator = continuation.iterator;
        let incomingAtom = continuation.atom;
        do {
            let iteratorValue;
            if (incomingAtom) {
                sourceAtom.observedDuringCalculation.push(incomingAtom);
                // Cycle condition
                // ideally should be removed (same as while condition)
                if (maybeDirtyAtoms.has(incomingAtom) && !this.isAtomStable(incomingAtom)) {
                    let cycle;
                    me.walkDepth(WalkForwardContext.new({
                        forEachNext: function (atom, func) {
                            if (atom === me) {
                                me.needRecalculationAtoms.forEach(func);
                            }
                            else {
                                atom.observedDuringCalculation.forEach(func);
                            }
                        },
                        onCycle: (node, stack) => {
                            // NOTE: After onCycle call walkDepth instantly returns
                            cycle = cycleInfo(stack);
                            return OnCycleAction.Cancel;
                        }
                    }));
                    iteratorValue = { value: GraphCycleDetectedEffect.new({ cycle }), done: true };
                }
                else {
                    iteratorValue = iterator.next(incomingAtom.hasNextStableValue() ? incomingAtom.getNextStableValue() : incomingAtom.getConsistentValue());
                }
            }
            else {
                iteratorValue = iterator.next();
            }
            const value = iteratorValue.value;
            if (value instanceof Effect) {
                return { effect: value, continuation: { iterator: iterator } };
            }
            if (iteratorValue.done) {
                return { value };
            }
            // TODO should ignore non-final non-atom values
            incomingAtom = value;
        } while (!maybeDirtyAtoms.has(incomingAtom) || this.isAtomStable(incomingAtom));
        return { continuation: { iterator, atom: incomingAtom } };
    }
    *propagateSingle() {
        const toCalculate = [];
        const maybeDirty = new Set();
        const me = this;
        let cycle = null;
        this.walkDepth(WalkForwardContext.new({
            forEachNext: function (atom, func) {
                if (atom === me) {
                    me.needRecalculationAtoms.forEach(func);
                }
                else {
                    WalkForwardContext.prototype.forEachNext.call(this, atom, func);
                }
            },
            onNode: (atom) => {
                // console.log(`Visiting ${node}`)
            },
            onCycle: (node, stack) => {
                // NOTE: After onCycle call walkDepth instantly returns
                cycle = cycleInfo(stack);
                return OnCycleAction.Cancel;
            },
            onTopologicalNode: (atom) => {
                if (atom === this)
                    return;
                maybeDirty.add(atom);
                toCalculate.push(atom);
            }
        }));
        if (cycle) {
            return GraphCycleDetectedEffect.new({ cycle });
        }
        let depth;
        const conts = this.touchedAtoms = new Map();
        const visitedAt = new Map();
        const changedAtoms = this.changedAtoms = [];
        while (depth = toCalculate.length) {
            const sourceAtom = toCalculate[depth - 1];
            if (this.isAtomStable(sourceAtom) || !maybeDirty.has(sourceAtom)) {
                toCalculate.pop();
                continue;
            }
            const visitedAtDepth = visitedAt.get(sourceAtom);
            let calcRes;
            // node has been already visited
            if (visitedAtDepth != null) {
                const cont = conts.get(sourceAtom);
                calcRes = this.continueAtomCalculation(sourceAtom, cont, maybeDirty);
            }
            else {
                visitedAt.set(sourceAtom, depth);
                calcRes = this.startAtomCalculation(sourceAtom);
            }
            if (calcRes.effect) {
                yield calcRes.effect;
            }
            if (calcRes.continuation) {
                conts.set(sourceAtom, calcRes.continuation);
                const atom = calcRes.continuation.atom;
                if (atom) {
                    // this line is necessary for cycles visualization to work correctly, strictly it is not needed,
                    // because in non-cycle scenario "observedDuringCalculation" is filled in the `continueAtomCalculation`
                    sourceAtom.observedDuringCalculation.push(atom);
                    toCalculate.push(atom);
                }
            }
            else {
                // this makes sure that _all_ atoms, for which the calculation has started
                // are "collected" in the `conts` Map
                // then, during reject, we'll iterate over this map
                conts.set(sourceAtom, null);
                const consistentValue = calcRes.value;
                if (!sourceAtom.equality(consistentValue, sourceAtom.getConsistentValue())) {
                    changedAtoms.push(sourceAtom);
                    sourceAtom.nextStableValue = consistentValue;
                }
                this.markStable(sourceAtom);
                toCalculate.pop();
            }
        }
        return { success: true };
    }
    async onEffect(effect) {
        if (effect instanceof CancelPropagationEffect) {
            return EffectResolutionResult.Cancel;
        }
        if (effect instanceof RestartPropagationEffect) {
            return EffectResolutionResult.Restart;
        }
        if (effect instanceof GraphCycleDetectedEffect) {
            throw new Error('Graph cycle detected');
        }
        return EffectResolutionResult.Resume;
    }
    waitForPropagateCompleted() {
        if (!this.isPropagating)
            return Promise.resolve(null);
        return new Promise(resolve => {
            this.propagateCompletedListeners.push(resolve);
        });
    }
    async propagate(onEffect, dryRun = false) {
        if (this.isPropagating)
            throw new Error("Can not nest calls to `propagate`, use `waitForPropagateCompleted`");
        let needToRestart, result;
        this.isPropagating = true;
        do {
            needToRestart = false;
            const propagationIterator = this.propagateSingle();
            let iteratorValue;
            do {
                iteratorValue = propagationIterator.next();
                const value = iteratorValue.value;
                if (value instanceof Effect) {
                    let resolutionResult;
                    if (onEffect) {
                        resolutionResult = await onEffect(value);
                    }
                    else {
                        resolutionResult = await this.onEffect(value);
                    }
                    if (resolutionResult === EffectResolutionResult.Cancel) {
                        // Escape hatch to get next consistent atom value before rejection
                        if (typeof dryRun === 'function') {
                            dryRun();
                        }
                        // POST-PROPAGATE sequence, TODO refactor
                        this.reject();
                        this.isPropagating = false;
                        await this.propagationCompletedHook();
                        this.onPropagationCompleted(PropagationResult.Canceled);
                        return PropagationResult.Canceled;
                    }
                    else if (resolutionResult === EffectResolutionResult.Restart) {
                        this.rejectPartialProgress();
                        needToRestart = true;
                        break;
                    }
                }
            } while (!iteratorValue.done);
        } while (needToRestart);
        if (dryRun) {
            // Escape hatch to get next consistent atom value before rejection
            if (typeof dryRun === 'function') {
                dryRun();
            }
            // POST-PROPAGATE sequence, TODO refactor
            this.reject();
            this.isPropagating = false;
            await this.propagationCompletedHook();
            this.onPropagationCompleted(PropagationResult.Completed); // Shouldn't it be PropagationResult.Passed?
            result = PropagationResult.Passed;
        }
        else {
            // POST-PROPAGATE sequence, TODO refactor
            this.commit();
            this.isPropagating = false;
            await this.propagationCompletedHook();
            this.onPropagationCompleted(PropagationResult.Completed);
            result = PropagationResult.Completed;
        }
        return result;
    }
    async tryPropagateWithNodes(onEffect, nodes, hatchFn) {
        if (nodes && nodes.length) {
            nodes = nodes.filter(n => n.graph !== this);
            if (nodes.length) {
                this.addNodes(nodes);
            }
        }
        const result = await this.propagate(onEffect, hatchFn || true);
        if (nodes && nodes.length) {
            nodes && this.removeNodes(nodes);
        }
        return result;
    }
    async propagationCompletedHook() {
    }
    onPropagationCompleted(result) {
        this.propagateCompletedListeners.forEach(listener => listener(result));
        this.propagateCompletedListeners = [];
    }
    // used for debugging, when exception is thrown in the middle of the propagate and edges are not yet committed
    commitAllEdges() {
        this.nodes.forEach(atom => atom.commitEdges());
    }
    toDotOnCycleException() {
        this.commitAllEdges();
        return this.toDot();
    }
    toDot() {
        let dot = [
            'digraph ChronoGraph {',
            'splines=spline'
        ];
        const arrAtoms = Array.from(this.nodesMap.entries());
        // Group atoms into subgraphs by label
        //
        // atom.self.id    - entity
        // atom.field.name -
        const namedAtomsByGroup = arrAtoms.reduce((map, [atomId, atom]) => {
            let [group, label] = String(atomId).split('/');
            // @ts-ignore
            const { id, name } = atom.self || {}, { field } = atom;
            group = name || id || group;
            label = field && field.name || label;
            if (!map.has(group)) {
                map.set(group, new Set([[label || '', atom]]));
            }
            else {
                map.get(group).add([label, atom]);
            }
            return map;
        }, new Map());
        // Generate subgraphs
        dot = Array.from(namedAtomsByGroup.entries()).reduce((dot, [group, namedAtoms], index) => {
            dot.push(`subgraph cluster_${index} {`);
            dot.push(`label="${group}"`);
            dot = Array.from(namedAtoms.values()).reduce((dot, [name, atom]) => {
                let value;
                if (atom.newRefs && atom.oldRefs) {
                    const collection = atom.get();
                    value = `Set(${collection && collection.size || 0})`;
                }
                else {
                    value = atom.get();
                }
                if (value instanceof Date) {
                    value = [value.getFullYear(), '.', value.getMonth() + 1, '.', value.getDate(), ' ', value.getHours() + ':' + value.getMinutes()].join('');
                }
                else if (Array.isArray(value)) {
                    value = `Array(${value.length})`;
                }
                let color = (!this.isAtomNeedRecalculation(atom) || this.isAtomStable(atom)) ? 'darkgreen' : 'red';
                dot.push(`"${atom.id}" [label="${name}=${value}\", fontcolor="${color}"]`);
                return dot;
            }, dot);
            dot.push('}');
            return dot;
        }, dot);
        let cycle = {};
        // Cycle detection
        this.walkDepth(WalkForwardContext.new({
            onCycle: (_node, stack) => {
                const ci = cycleInfo(stack);
                cycle = ci.reduce(([cycle, prevNode], curNode) => {
                    if (prevNode) {
                        cycle[prevNode.id] = curNode.id;
                    }
                    return [cycle, curNode];
                }, [cycle, null])[0];
                return OnCycleAction.Cancel;
            }
        }));
        // Generate edges
        dot = arrAtoms.reduce((dot, [fromId, fromAtom]) => {
            const outgoingEdges = fromAtom.outgoing;
            Array.from(outgoingEdges).reduce((dot, toAtom) => {
                //let edgeLabel = this.getEdgeLabel(fromId, atom.id)
                const edgeLabel = '';
                let color = (!this.isAtomNeedRecalculation(fromAtom) || this.isAtomStable(fromAtom)) ? 'darkgreen' : 'red';
                let penwidth = (cycle[fromId] == toAtom.id) ? 5 : 1;
                dot.push(`"${fromId}" -> "${toAtom.id}" [label="${edgeLabel}", color="${color}", penwidth=${penwidth}]`);
                return dot;
            }, dot);
            return dot;
        }, dot);
        dot.push('}');
        return dot.join('\n');
    }
};
export class MinimalChronoGraph extends ChronoGraph(MinimalGraph) {
}
