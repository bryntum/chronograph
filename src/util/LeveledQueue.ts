import { MAX_SMI } from "./Helpers.js"

// Leveled LIFO queue

export class LeveledQueue<T extends { level : number }> {
    length          : number            = 0

    levels          : T[][]             = []

    lowestLevel     : number            = MAX_SMI


    getLowestLevel () : number {
        for (let i = this.lowestLevel !== MAX_SMI ? this.lowestLevel : 0; i < this.levels.length; i++) {
            if (this.levels[ i ]) return this.lowestLevel = i
        }

        return this.lowestLevel = MAX_SMI
    }


    takeLowestLevel () : T[] {
        for (let i = this.lowestLevel !== MAX_SMI ? this.lowestLevel : 0; i < this.levels.length; i++) {
            const level     = this.levels[ i ]

            if (level) {
                this.length         -= level.length

                this.levels[ i ]    = null

                this.lowestLevel    = i + 1

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
        for (let i = this.lowestLevel !== MAX_SMI ? this.lowestLevel : 0; i < this.levels.length; i++) {
            const level     = this.levels[ i ]

            this.lowestLevel    = i

            if (level && level.length > 0) {
                this.length--

                return level.pop()
            }
        }

        this.lowestLevel   = MAX_SMI
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

        if (elLevel < this.lowestLevel) this.lowestLevel = elLevel
    }


    * [Symbol.iterator] () : Iterable<T> {
        for (let i = 0; i < this.levels.length; i++) {
            const level     = this.levels[ i ]

            if (level) yield* level
        }
    }
}
