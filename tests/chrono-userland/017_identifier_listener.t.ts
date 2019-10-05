import { ProposedOrCurrent } from "../../src/chrono/Effect.js"
import { CalculatedValueSync, Identifier } from "../../src/chrono/Identifier.js"
import { Quark } from "../../src/chrono/Quark.js"
import { SyncEffectHandler, Transaction } from "../../src/chrono/Transaction.js"
import { Base } from "../../src/class/Mixin.js"
import { CalculationSync, Context } from "../../src/primitives/Calculation.js"

declare const StartTest : any

let logicalClock : number = 0

class ListenerLogEntry extends Base {
    clock               : number    = logicalClock++

    identifier          : Identifier

    previousValue       : any

    proposedValue       : any
    proposedArgs        : any[]
}


class SourceIdentifier extends CalculatedValueSync {
    listeners           : Set<ListenerIdentifier>


    write (me : this, transaction : Transaction, proposedValue : this[ 'ValueT' ], ...args : this[ 'ArgsT' ]) {
        me.constructor.prototype.write.call(this, me, transaction, proposedValue)

        const quark     = transaction.acquireQuark(me)

        if (this.listeners) {
            for (const listener of me.listeners) {
                listener.log(transaction, ListenerLogEntry.new({
                    identifier      : quark.identifier,

                    previousValue   : transaction.baseRevision.readIfExists(quark.identifier),
                    proposedValue   : proposedValue,

                    proposedArgs    : args.length ? args : undefined
                }))
            }
        }
    }
}


class ListenerIdentifier extends CalculatedValueSync {
    sourceIdentifiers   : Set<SourceIdentifier>

    OwnValueT   : any
    ValueT      : [ this[ 'OwnValueT' ], ListenerLogEntry[] ]

    quarkClass  : typeof ListenerQuark  = ListenerQuark


    equality (v1 : [ this[ 'OwnValueT' ], ListenerLogEntry[] ], v2 : [ this[ 'OwnValueT' ], ListenerLogEntry[] ]) : boolean {
        return

        // return dispatcherValueEq(v1, v2)
    }


    calculation (YIELD : SyncEffectHandler) : this[ 'ValueT' ] {
        const proposed : this[ 'ValueT' ]   = YIELD(ProposedOrCurrent)

        const value     = {
            0 : 'some_calculated_own_value',
            get '1' () {
                if ('anywhere_in_user_land')
                    throw new Error('Can not use log entries from the listener')
                else
                    // in the chronograph internal code context
                    return proposed[ 1 ]
            }
        }

        return value as this[ 'ValueT' ]
    }


    write (me : this, transaction : Transaction, proposedValue : this[ 'ValueT' ], ...args : this[ 'ArgsT' ]) {
        if (proposedValue[ 1 ] != null) throw new Error('Can not write to log entries of the listener identifier')

        const quark         = transaction.acquireQuark(this)

        quark.ownProposedValue  = proposedValue[ 0 ]
    }


    writeOwn (transaction : Transaction, quark : InstanceType<this[ 'quarkClass' ]>, proposedValue : this[ 'OwnValueT' ], ...args : this[ 'ArgsT' ]) {
        quark.ownProposedValue  = proposedValue
    }


    log (transaction : Transaction, entry : ListenerLogEntry) {
        const quark         = transaction.acquireQuark(this)

        quark.logEntries.push(entry)
    }


    buildProposedValue (me : this, transaction : Transaction) : this[ 'ValueT' ] {
        const quark     = transaction.acquireQuark(me)

        const ownValue : this[ 'OwnValueT' ] = quark.ownProposedValue

        // iterate through `sourceIdentifiers` and fill missing `logEntries`

        return [ ownValue,  quark.logEntries ]
    }
}


class ListenerQuark extends Quark(CalculationSync(Set)) {
    logEntries          : ListenerLogEntry[]    = []

    ownProposedValue    : any
}


StartTest(t => {
})
