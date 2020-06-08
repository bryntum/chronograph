import { AnyConstructor, Mixin } from "../../class/Mixin.js"
import { globalContext } from "../GlobalContext.js"
import { Quark, QuarkState } from "../Quark.js"
import { CombinedOwnerAndImmutable } from "./Immutable.js"


//---------------------------------------------------------------------------------------------------------------------
export class BoxImmutable extends Mixin(
    [ Quark ],
    (base : AnyConstructor<Quark, typeof Quark>) =>

    class BoxImmutable extends base {

        //region ChronoBox's own interface
        value               : unknown                 = undefined


        hasValue () : boolean {
            return this.readValuePure() !== undefined
        }


        hasOwnValue () : boolean {
            return this.value !== undefined
        }


        read () : unknown {
            if (globalContext.activeQuark) this.addOutgoing(globalContext.activeQuark)

            return this.readValuePure()
        }


        readValuePure () : unknown {
            let box : this = this

            while (box) {
                if (box.value !== undefined) return box.value

                box     = box.previous
            }

            return null
        }


        write (value : unknown) {
            if (this.frozen) {
                const next = this.createNext()

                this.owner.setCurrent(next)

                next.writeToUnfrozen(value)
            } else {
                this.writeToUnfrozen(value)
            }
        }


        writeToUnfrozen (value : unknown) {
            if (value === undefined) value = null

            if (value === this.value) return

            this.value  = value
            this.state  = QuarkState.UpToDate

            this.propagatePossiblyStale()
            this.propagateStale()
        }
    }
){}


//---------------------------------------------------------------------------------------------------------------------
export class Box extends Mixin(
    [ BoxImmutable, CombinedOwnerAndImmutable ],
    (base : AnyConstructor<BoxImmutable & CombinedOwnerAndImmutable, typeof BoxImmutable & typeof CombinedOwnerAndImmutable>) =>

    class BoxImmutable extends base {
        immutable       : BoxImmutable

        static immutableCls : AnyConstructor<BoxImmutable, typeof BoxImmutable> = BoxImmutable


        read () : any {
            if (this.immutable === this) return super.read()

            return this.immutable.read()
        }


        write (value : unknown) {
            if (this.immutable === this) return super.write(value)

            return this.immutable.write(value)
        }
    }
){}
