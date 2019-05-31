const lazyBuild = (target, property, value) => {
    Object.defineProperty(target, property, { value })

    return value
}


const lazyBuild2 = (target, storage, builder) => {
    if (target[ storage ] !== undefined) return target[ storage ]

    return target[ storage ] = builder()
}


const lazyBuild3 = (target, storage, builder) => {
    if (target.hasOwnProperty(storage)) return target[ storage ]

    return target[ storage ] = builder()
}



class Benchmark {

    buildLazyProp () {
        return 1
    }


    getLazyPropertyTripleEqual () {
        if (this.lazyProp !== undefined) return this.lazyProp

        return this.lazyProp = this.buildLazyProp()
    }


    getLazyPropertyHasOwn () {
        if (this.lazyProp2 !== undefined) return this.lazyProp2

        return this.lazyProp2 = this.buildLazyProp()
    }


    get lazyProperty () {
        return lazyBuild(this, 'lazyProperty', 1)
    }


    get lazyProperty2 () {
        return lazyBuild2(this, '$lazyProperty2', () => 1)
    }


    get lazyProperty3 () {
        return lazyBuild3(this, '$lazyProperty3', () => 1)
    }
}


const instances = [ ...new Array(10000) ].map((value, index) => new Test())


instances.reduce((sum, instance) => sum += instance.lazyProperty + instance.lazyProperty + instance.lazyProperty + instance.lazyProperty + instance.lazyProperty + instance.lazyProperty)

instances.reduce((sum, instance) => sum += instance.lazyProperty2 + instance.lazyProperty2 + instance.lazyProperty2 + instance.lazyProperty2 + instance.lazyProperty2 + instance.lazyProperty2)

instances.reduce((sum, instance) => sum += instance.getLazyProperty() + instance.getLazyProperty() + instance.getLazyProperty() + instance.getLazyProperty() + instance.getLazyProperty() + instance.getLazyProperty())
