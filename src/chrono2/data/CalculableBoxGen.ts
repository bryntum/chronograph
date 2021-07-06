import { serializable } from "typescript-serializable-mixin/index.js"
import { CalculationIterator } from "../../primitives/Calculation.js"
import { AtomState } from "../atom/Atom.js"
import { calculateAtomsQueueGen } from "../calculation/LeveledGen.js"
import { calculateAtomsQueueSync } from "../calculation/LeveledSync.js"
import { CalculationFunction, CalculationMode, CalculationModeGen } from "../CalculationMode.js"
import { EffectHandler, runGeneratorAsyncWithEffect } from "../Effect.js"
import { ChronoGraph, globalGraph } from "../graph/Graph.js"
import { CalculableBoxUnbound } from "./CalculableBox.js"

//---------------------------------------------------------------------------------------------------------------------
@serializable({ id : 'CalculableBoxGenUnbound' })
export class CalculableBoxGenUnbound<V = unknown> extends CalculableBoxUnbound<V> {

    iterator            : CalculationIterator<V>    = undefined

    iterationResult     : IteratorResult<any>       = undefined

    // possibly this needs to be a global (per atom) revision number
    iterationNumber     : number                    = -1

    calculationPromise  : Promise<V>                = undefined


    static new<V> (this : typeof CalculableBoxGenUnbound, config? : Partial<CalculableBoxGenUnbound<V>>) : CalculableBoxGenUnbound<V> {
        return super.new(config) as CalculableBoxGenUnbound<V>
    }


    isCalculationStarted () : boolean {
        return Boolean(this.iterator || this.iterationResult)
    }


    isCalculationCompleted () : boolean {
        return Boolean(this.iterationResult && this.iterationResult.done)
    }


    startCalculation (onEffect : EffectHandler<CalculationModeGen>) : IteratorResult<any> {
        this.beforeCalculation()

        this.iterationNumber        = 0

        const iterator : this[ 'iterator' ] = this.iterator = (this.calculation as CalculationFunction<V, CalculationModeGen>).call(this.context, onEffect)

        return this.iterationResult = iterator.next()
    }


    continueCalculation (value : unknown) : IteratorResult<any> {
        this.iterationNumber++

        return this.iterationResult = this.iterator.next(value)
    }


    resetCalculation (keepProposed : boolean) {
        if (!keepProposed) {
            this.proposedValue          = undefined
            this.proposedArgs           = undefined
        }

        this.iterationResult        = undefined
        this.iterator               = undefined
        this.iterationNumber        = -1
        this.calculationPromise     = undefined
    }


    shouldCalculate () : boolean {
        return true
    }


    doCalculate () {
        const effectHandler = this.graph.effectHandlerSync

        calculateAtomsQueueSync(effectHandler, this.graph.stack, this.graph ? this.graph.currentTransaction : undefined, [ this ], this.level)
    }


    // this method is intentionally not `async` to avoid creation
    // of multiple promises if many reads are issued during the same
    // calculation - we re-use the `calculationPromise` in this case
    // otherwise every call to `readAsync` would create a new promise
    readAsync (graph? : ChronoGraph) : Promise<V> {
        const effectiveGraph    = graph || this.graph
        const activeAtom        = effectiveGraph ? effectiveGraph.activeAtom : undefined
        const self              = this.checkoutSelf()

        if (activeAtom) self.immutableForWrite().addOutgoing(activeAtom.immutable, false)

        if (self.state === AtomState.UpToDate || self.immutable.isTombstone) return Promise.resolve(self.immutable.read())

        if (self.calculationPromise) return self.calculationPromise

        return self.calculationPromise = self.doCalculateAsync()
    }


    async doCalculateAsync () : Promise<V> {
        const effectHandler = this.graph.effectHandlerAsync

        await runGeneratorAsyncWithEffect(
            effectHandler,
            calculateAtomsQueueGen,
            [ effectHandler, this.graph.stack, this.graph ? this.graph.currentTransaction : undefined, [ this ], this.level ],
            null
        )

        return this.immutable.read()
    }
}


@serializable({ id : 'CalculableBoxGen' })
export class CalculableBoxGen<V = unknown> extends CalculableBoxGenUnbound<V> {
    get boundGraph () : ChronoGraph {
        return globalGraph
    }
}
