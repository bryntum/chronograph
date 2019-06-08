const Mixin1 = (base) =>
class extends base {
    constructor () {
        super()

        this.a1 = []

        this.b1 = 11

        this.c1 = new Set()
    }


    initialize () {
        super.initialize()

        this.a1 = []

        this.b1 = 11

        this.c1 = new Set()
    }
}


const initialize1 = function () {
    this.a1 = []

    this.b1 = 11

    this.c1 = new Set()
}



const Mixin2 = (base) =>
class extends base {
    constructor () {
        super()

        this.a2 = []

        this.b2 = 11

        this.c2 = new Map()
    }


    initialize () {
        super.initialize()

        this.a2 = []

        this.b2 = 11

        this.c2 = new Map()
    }
}

const initialize2 = function () {
    this.a2 = []

    this.b2 = 11

    this.c2 = new Map()
}



const Mixin3 = (base) =>
class extends base {
    constructor () {
        super()

        this.a3 = {}

        this.b3 = 'asda'

        this.c3 = false
    }

    initialize () {
        super.initialize()

        this.a3 = {}

        this.b3 = 'asda'

        this.c3 = false
    }
}

const initialize3 = function () {
    this.a3 = {}

    this.b3 = 'asda'

    this.c3 = false
}



const Mixin4 = (base) =>
class extends base {
    constructor () {
        super()

        this.a4 = {}

        this.b4 = 'asda'

        this.c4 = false
    }

    initialize () {
        super.initialize()

        this.a4 = {}

        this.b4 = 'asda'

        this.c4 = false
    }
}


const initialize4 = function () {
    this.a4 = {}

    this.b4 = 'asda'

    this.c4 = false
}



const Mixin5 = (base) =>
class extends base {
    constructor () {
        super()

        this.a5 = {}

        this.b5 = 'asda'

        this.c5 = false
    }

    initialize () {
        super.initialize()

        this.a5 = {}

        this.b5 = 'asda'

        this.c5 = false
    }
}

const initialize5 = function () {
    this.a5 = {}

    this.b5 = 'asda'

    this.c5 = false
}


const Mixin6 = (base) =>
class extends base {
    constructor () {
        super()

        this.a6 = {}

        this.b6 = 'asda'

        this.c6 = false
    }

    initialize () {
        super.initialize()

        this.a6 = {}

        this.b6 = 'asda'

        this.c6 = false
    }
}

const initialize6 = function () {
    this.a6 = {}

    this.b6 = 'asda'

    this.c6 = false
}



class Base {
    initialize () {
    }
}

const cls = Mixin6(Mixin5(Mixin4(Mixin3(Mixin2(Mixin1(Base))))))

const count         = 10000
const instances     = []


// ;[ 'a1', 'b1', 'c1', 'a2', 'b2', 'c2', 'a3', 'b3', 'c3' ].forEach(prop => cls.prototype[ prop ] = null)


for (let i = 0; i < count; i++) instances.push(new cls())


for (let i = 0; i < count; i++) {
    const instance  = Object.create(cls.prototype)

    instance.initialize()

    instances.push(instance)
}


for (let i = 0; i < count; i++) {
    const instance  = {}

    initialize1.call(instance)
    initialize2.call(instance)
    initialize3.call(instance)
    initialize4.call(instance)
    initialize5.call(instance)
    initialize6.call(instance)

    instances.push(instance)
}
