export class LeveledStack<T extends { level : number }> {
    length          : number            = 0

    levels          : T[][]             = []

    // currentLevel    : T[]


    last () {
        for (let i = 0; i < this.levels.length; i++) {
            const level     = this.levels[ i ]

            if (level && level.length > 0) {
                return level[ level.length - 1 ]
            }
        }
    }


    pop () {
        for (let i = 0; i < this.levels.length; i++) {
            const level     = this.levels[ i ]

            if (level && level.length > 0) {
                level.pop()
                this.length--
                break
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

        // this.currentLevel   = level

        this.length++
    }
}
