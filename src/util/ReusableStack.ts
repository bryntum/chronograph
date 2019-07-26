// experiment, rationale is that for big datasets we allocate huge arrays (~100k elements)
// several times. In theory it would less the workload if we reuse the already allocated array
// in practice no noticeable speed up, probably the code is bound by something else

export class ReusableStack<T = any> {
    length      : number        = 0
    storage     : T[]           = []


    constructor (storage? : T[]) {
        if (storage) {
            this.storage    = storage
            this.length       = storage.length
        }
    }


    at (index : number) : T {
        return this.storage[ index ]
    }


    push (value : T) {
        const storage       = this.storage

        if (this.length === storage.length) {
            storage.push(value)

            this.length   = storage.length
        }
        else if (this.length < storage.length) {
            storage[ this.length ]    = value

            this.length++
        }
    }


    pop () : T {
        if (this.length === 0) return undefined

        const storage       = this.storage

        const result        = storage[ this.length - 1 ]

        this.length--

        return result
    }


    clear () {
        this.length           = 0
    }
}
