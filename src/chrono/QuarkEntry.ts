import { Base } from "../class/Mixin.js"
import { NOT_VISITED, VisitInfo } from "../graph/WalkDepth.js"
import { CalculationGen, CalculationSync } from "../primitives/Calculation.js"
import { MAX_SMI } from "../util/Helpers.js"
import { Identifier } from "./Identifier.js"
import { Quark } from "./Quark.js"
import { QuarkTransition } from "./QuarkTransition.js"


//---------------------------------------------------------------------------------------------------------------------
export class QuarkEntry extends QuarkTransition(CalculationSync(Set)) implements VisitInfo, Quark {

    static new<T extends typeof QuarkEntry> (this : T, props? : Partial<InstanceType<T>>) : InstanceType<T> {
        const instance = new this()

        Object.assign(instance, props)

        return instance as InstanceType<T>
    }

    identifier      : Identifier        = null

    // quark state
    value                   : any       = undefined
    proposedValue           : any       = undefined
    usedProposedOrCurrent   : boolean   = false
    // eof quark state

    previous        : QuarkEntry        = null
    origin          : QuarkEntry        = null

    // used by the listeners facility which is under question
    // sameAsPrevious          : boolean = false

    // placing these initial values to the prototype makes the `benchmark_sync` slower - from ~630ms to ~830
    edgesFlow       : number = 0
    visitedAt       : number = NOT_VISITED
    visitEpoch      : number = 0


    get level () : number {
        return this.identifier.level
    }


    forceCalculation () {
        this.edgesFlow = MAX_SMI
    }


    cleanup (includingQuark : boolean) {
        this.previous           = null
        this.iterationResult    = null
        // this.iterator           = null

        if (includingQuark) this.origin = null
    }


    // transition      : QuarkTransition

    get transition () : QuarkTransition {
        return this
    }
    // set transition (value : QuarkTransition) {
    // }


    getTransition () : QuarkTransition {
        return this
    }


    hasTransition () : boolean {
        return Boolean(this.iterationResult)
    }


    getQuark () : Quark {
        if (this.origin) return this.origin

        return this.origin = this
    }


    get outgoing () : Set<QuarkEntry> {
        return this
    }


    getOutgoing () : Set<QuarkEntry> {
        return this
    }


    getValue () : any {
        return this.origin ? this.origin.value : undefined
    }


    hasValue () : boolean {
        return Boolean(this.origin && this.origin.value !== undefined)
    }
}
