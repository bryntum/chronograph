import { MAX_SMI } from "./Helpers.js"

// Leveled LIFO queue

export class LeveledQueue<T extends { level : number }> {
    length          : number            = 0

    levels          : T[][]             = []

    currentLevel    : number            = MAX_SMI


    takeLowestLevel () {
        for (let i = 0; i < this.levels.length; i++) {
            const level     = this.levels[ i ]

            if (level) {
                this.length         -= level.length

                this.levels[ i ]    = null

                return level
            }
        }
    }


    resetCachedPosition () {
        this.currentLevel               = MAX_SMI
    }


    last () {
        for (let i = this.currentLevel !== MAX_SMI ? this.currentLevel : 0; i < this.levels.length; i++) {
            const level     = this.levels[ i ]

            if (level && level.length > 0) {
                this.currentLevel   = i

                return level[ level.length - 1 ]
            }
        }
    }


    pop () : T {
        for (let i = this.currentLevel !== MAX_SMI ? this.currentLevel : 0; i < this.levels.length; i++) {
            const level     = this.levels[ i ]

            if (level && level.length > 0) {
                this.length--

                return level.pop()
            }
        }
    }


    push (el : T) {
        const elLevel       = el.level

        let level : T[]     = this.levels[ elLevel ]

        if (!level) {
            level           = this.levels[ elLevel ] = []
        }

        level.push(el)

        this.length++

        if (elLevel < this.currentLevel) this.currentLevel = elLevel
    }
}
