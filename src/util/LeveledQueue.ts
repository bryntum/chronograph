import { MAX_SMI } from "./Helpers.js"

// Leveled LIFO queue

export class LeveledQueue<T extends { level : number }> {
    length          : number            = 0

    levels          : T[][]             = []

    lowestLevelIndex : number           = MAX_SMI


    getLowestLevelIndex () : number {
        for (let i = this.lowestLevelIndex !== MAX_SMI ? this.lowestLevelIndex : 0; i < this.levels.length; i++) {
            const level     = this.levels[ i ]

            if (level && level.length > 0) return this.lowestLevelIndex = i
        }

        return this.lowestLevelIndex = MAX_SMI
    }


    takeLowestLevel () : T[] {
        for (let i = this.lowestLevelIndex !== MAX_SMI ? this.lowestLevelIndex : 0; i < this.levels.length; i++) {
            const level     = this.levels[ i ]

            if (level) {
                this.length         -= level.length

                this.levels[ i ]    = null

                this.lowestLevelIndex    = i + 1

                return level
            }
        }
    }


    lowestLevel () : T[] {
        for (let i = this.lowestLevelIndex !== MAX_SMI ? this.lowestLevelIndex : 0; i < this.levels.length; i++) {
            const level     = this.levels[ i ]

            if (level && level.length) {
                this.lowestLevelIndex    = i

                return level
            }
        }
    }


    // resetCachedPosition () {
    //     this.lowestLevel               = MAX_SMI
    // }


    // last () {
    //     for (let i = this.lowestLevel !== MAX_SMI ? this.lowestLevel : 0; i < this.levels.length; i++) {
    //         const level     = this.levels[ i ]
    //
    //         if (level && level.length > 0) {
    //             this.lowestLevel   = i
    //
    //             return level[ level.length - 1 ]
    //         }
    //     }
    // }


    pop () : T {
        for (let i = this.lowestLevelIndex !== MAX_SMI ? this.lowestLevelIndex : 0; i < this.levels.length; i++) {
            const level     = this.levels[ i ]

            this.lowestLevelIndex    = i

            if (level && level.length > 0) {
                this.length--

                return level.pop()
            }
        }

        this.lowestLevelIndex   = MAX_SMI
    }


    push (el : T) {
        const elLevel       = el.level

        let level : T[]     = this.levels[ elLevel ]

        if (!level) {
            // avoid holes in the array
            for (let i = this.levels.length; i < elLevel; i++) this.levels[ i ] = null

            level           = this.levels[ elLevel ] = []
        }

        level.push(el)

        this.length++

        if (elLevel < this.lowestLevelIndex) this.lowestLevelIndex = elLevel
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
        this.lowestLevelIndex   = MAX_SMI
    }
}
