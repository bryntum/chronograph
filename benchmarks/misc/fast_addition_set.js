class FastAdditionSet {
    tempStorage     = []

    internalSet


    add (el) {
        if (this.internalSet) {
            return this.internalSet.add(el)
        }

        this.tempStorage.push(el)
    }


    asSet () {
        if (this.internalSet) return this.internalSet

        return this.internalSet = new Set(this.tempStorage)
    }

}

const regularSet       = new Set()
const fastAdditionSet   = new FastAdditionSet()

for (let i = 0; i < 1000; i++) {
    regularSet.add(i)
}

regularSet.has(18)


for (let i = 0; i < 1000; i++) {
    fastAdditionSet.add(i)
}

fastAdditionSet.asSet().has(18)
