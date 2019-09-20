import { NOT_VISITED, VisitInfo } from "../graph/WalkDepth.js"
import { MAX_SMI } from "../util/Helpers.js"
import { Identifier } from "./Identifier.js"
import { Quark } from "./Quark.js"
import { QuarkTransition } from "./QuarkTransition.js"


//---------------------------------------------------------------------------------------------------------------------
export class QuarkEntry extends Set<QuarkEntry> implements VisitInfo {

    static new<T extends typeof QuarkEntry> (this : T, props? : Partial<InstanceType<T>>) : InstanceType<T> {
        const instance = new this()

        Object.assign(instance, props)

        return instance as InstanceType<T>
    }


    identifier      : Identifier

    quark           : InstanceType<this[ 'identifier' ][ 'quarkClass']>
    transition      : QuarkTransition

    previous        : QuarkEntry

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
        this.previous       = undefined
        this.transition     = undefined

        if (includingQuark) this.quark = undefined
    }


    getTransition () : QuarkTransition {
        if (this.transition) return this.transition

        return this.transition = this.identifier.transitionClass.new({
            identifier: this.identifier
            // current         : this,
            // previous        : null,
            //
            // edgesFlow       : 0,
            //
            // visitedAt       : -1,
            // visitedTopologically : false
        })
    }


    getQuark () : Quark {
        if (this.quark) return this.quark

        return this.quark = this.identifier.quarkClass.new({identifier: this.identifier}) as InstanceType<this[ 'identifier' ][ 'quarkClass']>
    }


    get outgoing () : Set<QuarkEntry> {
        return this
    }


    getOutgoing () : Set<QuarkEntry> {
        return this
    }


    get value () : any {
        return this.quark ? this.quark.value : undefined
    }


    hasValue () : boolean {
        return Boolean(this.quark && this.quark.hasValue())
    }
}
