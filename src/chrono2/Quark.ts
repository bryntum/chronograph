import { AnyConstructor, Mixin } from "../class/Mixin.js"
import { Uniqable } from "../util/Uniqable.js"
import { Immutable, Owner, OwnerManaged } from "./data/Immutable.js"
import { Node } from "./Node.js"


//---------------------------------------------------------------------------------------------------------------------
export enum QuarkState {
    UpToDate        = 1,
    PossiblyStale   = 2,
    Stale           = 3
}

export class Quark extends Mixin(
    [ Node, Immutable ],
    (base : AnyConstructor<Node & Immutable, typeof Node & typeof Immutable>) =>

    class Quark extends base implements Uniqable {

        state               : QuarkState    = QuarkState.Stale

        // bump the edges type
        $incoming           : Quark[]
        $outgoing           : Quark[]


        // // onBecomeStale () {
        // // }
        // //
        // // onBecomePossiblyStale () {
        // //     this.
        // // }
        // //
        // // onBecomeUpToDate () {
        // // }
        //
        //
        // shouldCompute () : boolean {
        //     let shouldCompute : boolean = false
        //
        //     compactAndForEach(this.incoming, (quark : Quark) => {
        //         if (quark.state === QuarkState.PossiblyStale) shouldCompute = true
        //     })
        //
        //     return shouldCompute
        // }
        //
        //
        // calculate (stack : Quark[]) {
        //     const calculationContext    = this.calculationContext
        //     const calculation           = this.calculation
        //
        //     const prevActive            = globalContext.activeAtom
        //
        //     globalContext.activeAtom    = null
        //
        //     let shouldCompute : boolean = false
        //
        //     compactAndForEach(this.incoming, (quark : Quark) => {
        //         if (quark.state === QuarkState.PossiblyStale) {
        //             quark.calculate(stack)
        //
        //             if (this.state === QuarkState.Stale) shouldCompute = true
        //         }
        //     })
        //
        //     if (shouldCompute) {
        //         this.clearIncoming()
        //
        //         globalContext.activeAtom    = this
        //
        //         let value                   = calculation.call(calculationContext)
        //
        //         if (value === undefined) value = null
        //
        //         if (this.equality(this.readValuePure(), value)) {
        //             this.value              = value
        //
        //             this.state              = QuarkState.UpToDate
        //         } else {
        //
        //         }
        //     } else {
        //         this.state              = QuarkState.UpToDate
        //     }
        //
        //     globalContext.activeAtom    = prevActive
        // }
        //
        //
        // readValuePure () : any {
        //     let box : this = this
        //
        //     while (box) {
        //         if (box.value !== undefined) return box.value
        //
        //         box     = box.previous
        //     }
        //
        //     return null
        // }



        propagatePossiblyStale () {
            const toVisit : Quark[]       = [ this ]

            while (toVisit.length) {
                const el        = toVisit.pop()

                if (el.state === QuarkState.UpToDate) {
                    el.state = QuarkState.PossiblyStale

                    if (el.$outgoing) {
                        const outgoing = el.getOutgoing()

                        for (let i = 0; i < outgoing.length; i++) {
                            if (outgoing[ i ].state === QuarkState.UpToDate) toVisit.push(outgoing[ i ])
                        }
                    }
                }
            }
        }


        propagateStale () {
            if (this.$outgoing) {
                const outgoing = this.getOutgoing()

                for (let i = 0; i < outgoing.length; i++) {
                    outgoing[ i ].state = QuarkState.Stale
                }
            }
        }



        // hasValue () : boolean {
        //     return //this.readValuePure() !== undefined
        // }
        //
        //
        // get equality () : (v1 : any, v2 : any) => boolean {
        //     return //this.owner.meta.equality
        // }
        //
        // get calculation () : CalculationFunction<unknown, CalculationMode> {
        //     return //this.owner.calculation
        // }
        //
        // get calculationContext () : unknown {
        //     return //this.owner.context
        // }
        //
        //
        // //---------------------------
        // owner       : Owner<this>
        //
        // previous    : this | undefined
        //
        // freeze () {
        // }
        //
        // createNext () : this {
        //     return
        // }

    }
){}


//---------------------------------------------------------------------------------------------------------------------
export class Atom extends Mixin(
    [ Owner ],
    (base : AnyConstructor<Owner, typeof Owner>) =>

    class Atom extends base {
    }
){}

