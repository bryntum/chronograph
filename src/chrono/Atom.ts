import { AnyConstructor, Mixin } from "../class/Mixin.js"
import { MinimalNode, Node } from "../graph/Node.js"
import { lazyBuild } from "../util/Helper.js"
import { Box } from "./Box.js"
import { ChronoCalculation, ChronoIterator, ChronoValue } from "./Calculation.js"
import { Effect, InputMarker, NotChanged } from "./Effect.js"
import { ChronoGraphI, PropagationResult, RevisionNode } from "./Graph.js"
import { HasId } from "./HasId.js"

//---------------------------------------------------------------------------------------------------------------------
export const Quark = <T extends AnyConstructor<Node & ChronoCalculation>>(base : T) =>

class Quark extends base {
    NodeT               : Quark

    revision            : RevisionNode

    YieldT              : NotChanged | InputMarker | ChronoAtomI | Effect

    atom                : ChronoAtomI
}

export type Quark = Mixin<typeof Quark>
export interface QuarkI extends Mixin<typeof Quark> {
    NodeT               : Quark
}

export class MinimalQuark extends Quark(ChronoCalculation(Box(MinimalNode))) {
    NodeT               : Quark
}


//---------------------------------------------------------------------------------------------------------------------
export const strictEquality     = (v1, v2) => v1 === v2

export const strictEqualityWithDates = (v1, v2) => {
    if ((v1 instanceof Date) && (v2 instanceof Date)) return <any>v1 - <any>v2 === 0

    return v1 === v2
}

const isChronoAtomSymbol = Symbol('isChronoAtomSymbol')


//---------------------------------------------------------------------------------------------------------------------
export const ChronoAtom = <T extends AnyConstructor<HasId & Node & Box>>(base : T) =>

class ChronoAtom extends base {
    [isChronoAtomSymbol] () {}

    LabelT              : any
    NodeT               : Quark

    // // isPure              : boolean       = true
    // // isSync              : boolean       = true

    putData             : ChronoValue[]

    graph               : ChronoGraphI

    equality            : (v1, v2) => boolean       = strictEqualityWithDates

    calculationContext  : any

    quarks              : Quark[]                   = []

    // // quarks                  : Map<Revision, Quark>      = new Map()
    // //
    // // cachedCurrentQuark      : Quark
    // // cachedCurrentRevision   : Revision
    // //
    // //
    // // getCurrentQuark () : Quark {
    // //     if (this.snapshot.revision === this.cachedCurrentRevision) return this.cachedCurrentQuark
    // //
    // //     this.cachedCurrentRevision = this.snapshot.revision
    // //
    // //     return this.cachedCurrentQuark = this.quarks.get(this.cachedCurrentRevision)
    // // }


    getCurrentQuark () : Quark {
        const length    = this.quarks.length

        return length ? this.quarks[ length - 1 ] : undefined
    }


    get value () : this[ 'ValueT' ] {
        const quark     = this.getCurrentQuark()

        return quark ? quark.value : undefined
    }

    set value (value : this[ 'ValueT' ]) {
        this.put(value)
    }


    // backward-compat alias, primary interface if "value" property
    get () : this[ 'ValueT' ] {
        return this.value
    }

    put (...args : any[]) {
        if (this.graph) {
            this.graph.activeTransaction.markAsNeedRecalculation(this, args)
        } else {
            this.putData        = args
        }
    }

    // backward-compat, TODO remove
    async set (proposedValue : ChronoValue, ...args) : Promise<PropagationResult> {
        const graph             = this.graph

        this.put(proposedValue, ...args)

        return graph ? graph.propagateAsync() : Promise.resolve(PropagationResult.Completed)
    }


    get input () : InputMarker {
        return lazyBuild(this, 'input', InputMarker.new({ atom : this }))
    }


    * calculation () : ChronoIterator<this[ 'ValueT' ]> {
        const input     = yield this.input

        if (input !== undefined) return input[ 0 ]

        return NotChanged
    }


    get incoming () : Map<this[ 'NodeT' ], this[ 'LabelT' ]> {
        const currentQuark = this.getCurrentQuark()

        return currentQuark ? currentQuark.incoming : new Map()
    }

    get outgoing () : Map<this[ 'NodeT' ], this[ 'LabelT' ]> {
        const currentQuark = this.getCurrentQuark()

        return currentQuark ? currentQuark.outgoing : new Map()
    }


    set incoming (value) {
    }

    set outgoing (value) {
    }


    getCalculationQuark () : Quark {
        return MinimalQuark.new({
            atom                : this,

            calculation           : this.calculation,
            calculationContext  : this.calculationContext || this
        })
    }


    onEnterGraph (graph : ChronoGraphI) {
        this.graph      = graph

        delete this.putData
    }

    onLeaveGraph (graph : ChronoGraphI) {
        this.graph      = undefined
    }
}

export type ChronoAtom = Mixin<typeof ChronoAtom>
export interface ChronoAtomI extends Mixin<typeof ChronoAtom> {
    NodeT       : Quark
}


export const isChronoAtom = (value : any) : value is ChronoAtom => Boolean(value && value[ isChronoAtomSymbol ])

//---------------------------------------------------------------------------------------------------------------------
export class MinimalChronoAtom extends ChronoAtom(HasId(Box(MinimalNode))) {
    NodeT           : Quark
    LabelT          : any
}
