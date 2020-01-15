import { Base } from "../class/BetterMixin.js"
import { Identifier, throwUnknownIdentifier } from "./Identifier.js"
import { Quark, TombStone } from "./Quark.js"
import { Transaction } from "./Transaction.js"


export type Scope = Map<Identifier, Quark>


//---------------------------------------------------------------------------------------------------------------------
export type RevisionClock   = number

let CLOCK : RevisionClock = 0

export class Revision extends Base {
    createdAt               : RevisionClock = CLOCK++

    name                    : string    = 'revision-' + this.createdAt

    previous                : Revision  = undefined

    scope                   : Scope     = new Map()

    reachableCount          : number    = 0
    referenceCount          : number    = 0

    selfDependent           : Set<Identifier>   = new Set()


    getLatestEntryFor (identifier : Identifier) : Quark {
        let revision : Revision = this

        while (revision) {
            const entry = revision.scope.get(identifier)

            if (entry) return entry

            revision    = revision.previous
        }

        return null
    }


    hasIdentifier (identifier : Identifier) : boolean {
        const latestEntry   = this.getLatestEntryFor(identifier)

        return Boolean(latestEntry && latestEntry.getValue() !== TombStone)
    }


    * previousAxis () : Generator<Revision> {
        let revision : Revision = this

        while (revision) {
            yield revision

            revision    = revision.previous
        }
    }


    readIfExists (identifier : Identifier) : any {
        const latestEntry   = this.getLatestEntryFor(identifier)

        if (!latestEntry) return undefined

        const value         = latestEntry.getValue()

        return value !== TombStone ? (value !== undefined ? value : this.read(identifier)) : undefined
    }


    readIfExistsAsync<T> (identifier : Identifier<T>) : Promise<T> {
        const latestEntry   = this.getLatestEntryFor(identifier)

        if (!latestEntry) return undefined

        const value         = latestEntry.getValue()

        return value !== TombStone ? (value !== undefined ? value : this.readAsync(identifier)) : undefined
    }


    get<T> (identifier : Identifier<T>) : T | Promise<T> {
        const latestEntry   = this.getLatestEntryFor(identifier)

        // && DEBUG?
        if (!latestEntry) throwUnknownIdentifier(identifier)

        const value         = latestEntry.getValue()

        // && DEBUG?
        if (value === TombStone) throwUnknownIdentifier(identifier)

        if (value !== undefined) {
            return value
        } else {
            return this.calculateLazyQuarkEntry(latestEntry)
        }
    }


    read<T> (identifier : Identifier<T>) : T {
        const latestEntry   = this.getLatestEntryFor(identifier)

        // && DEBUG?
        if (!latestEntry) throwUnknownIdentifier(identifier)

        const value         = latestEntry.getValue()

        // && DEBUG?
        if (value === TombStone) throwUnknownIdentifier(identifier)

        if (value !== undefined) {
            return value
        } else {
            return this.calculateLazyQuarkEntry(latestEntry)
        }
    }


    readAsync<T> (identifier : Identifier<T>) : Promise<T> {
        const latestEntry   = this.getLatestEntryFor(identifier)

        // && DEBUG?
        if (!latestEntry) throwUnknownIdentifier(identifier)

        const value         = latestEntry.getValue()

        // && DEBUG?
        if (value === TombStone) throwUnknownIdentifier(identifier)

        if (value !== undefined) {
            return value
        } else {
            return this.calculateLazyQuarkEntryAsync(latestEntry)
        }
    }


    calculateLazyQuarkEntry (entry : Quark) : any {
        // if (!entry.identifier.sync) throw new Error("Can not calculate value of the asynchronous identifier synchronously")

        const transaction   = Transaction.new({ baseRevision : this, candidate : this })

        transaction.entries.set(entry.identifier, entry)
        transaction.stackGen.push(entry)
        entry.forceCalculation()

        transaction.commit()

        return entry.getValue()
    }


    async calculateLazyQuarkEntryAsync (entry : Quark) : Promise<any> {
        const transaction   = Transaction.new({ baseRevision : this, candidate : this })

        transaction.entries.set(entry.identifier, entry)
        transaction.stackGen.push(entry)
        entry.forceCalculation()

        await transaction.commitAsync()

        return entry.getValue()
    }


    mergePrevious () {
    }


    mergeNext () {
    }

}
