import { MAX_SMI } from "./Helpers.js"

// Leveled LIFO queue

export class LeveledQueue<T extends { level : number }> {
    length          : number            = 0

    levels          : T[][]             = []

    lowestLevel         : T[]           = undefined
    lowestLevelIndex    : number        = MAX_SMI


    refreshLowestLevel () {
        for (let i = this.lowestLevelIndex !== MAX_SMI ? this.lowestLevelIndex : 0; i < this.levels.length; i++) {
            const level     = this.levels[ i ]

            if (level && level.length) {
                this.lowestLevelIndex   = i
                this.lowestLevel        = level

                return
            }
        }

        this.lowestLevelIndex   = MAX_SMI
        this.lowestLevel        = undefined
    }


    pop () : T {
        const lowestLevel       = this.lowestLevel

        if (lowestLevel) {
            if (lowestLevel.length) {
                this.length--
                return lowestLevel.pop()
            }

            this.refreshLowestLevel()

            return this.pop()
        } else {
            return undefined
        }
    }


    push (el : T) {
        const elLevel       = el.level

        if (elLevel === this.lowestLevelIndex) {
            this.lowestLevel.push(el)
        } else {
            let level : T[]     = this.levels[ elLevel ]

            if (!level) {
                // avoid holes in the array
                for (let i = this.levels.length; i < elLevel; i++) this.levels[ i ] = null

                level           = this.levels[ elLevel ] = []
            }

            level.push(el)

            if (elLevel < this.lowestLevelIndex) {
                this.lowestLevelIndex   = elLevel
                this.lowestLevel        = level
            }
        }

        this.length++
    }


    * [Symbol.iterator] () : Iterable<T> {
        for (let i = 0; i < this.levels.length; i++) {
            const level     = this.levels[ i ]

            if (level) yield* level
        }
    }


    clear () {
        this.length             = 0
        this.levels             = []

        this.lowestLevel        = undefined
        this.lowestLevelIndex   = MAX_SMI
    }
}
