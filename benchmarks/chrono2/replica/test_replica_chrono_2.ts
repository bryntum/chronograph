import { Base } from "../../../src/class/Base.js"
import { AnyConstructor, ClassUnion, Mixin, MixinAny } from "../../../src/class/Mixin.js"
import { calculate, Entity, field } from "../../../src/replica2/Entity.js"

//---------------------------------------------------------------------------------------------------------------------
export class Mixin1 extends Mixin(
    [ Entity ], (base : AnyConstructor<Entity, typeof Entity>) => {

    class Mixin1 extends base {
        @field()
        field11         : string        = 'string'

        @calculate('field11')
        calculateField11 () {}

        @field()
        field12         : number        = 0

        @calculate('field12')
        calculateField12 () {}

        @field()
        field13         : boolean       = false

        @calculate('field13')
        calculateField13 () {}

        @field()
        field14         : any[]         = []

        @calculate('field14')
        calculateField14 () {}

        @field()
        field15         : object        = {}

        @calculate('field15')
        calculateField15 () {}
    }

    return Mixin1
}){}

//---------------------------------------------------------------------------------------------------------------------
export class Mixin2 extends Mixin(
    [ Entity ], (base : AnyConstructor<Entity, typeof Entity>) => {

    class Mixin2 extends base {
        @field()
        field21         : string        = 'string'

        @calculate('field21')
        calculateField21 () {}

        @field()
        field22         : number        = 0

        @calculate('field22')
        calculateField22 () {}

        @field()
        field23         : boolean       = false

        @calculate('field23')
        calculateField23 () {}

        @field()
        field24         : any[]         = []

        @calculate('field24')
        calculateField24 () {}

        @field()
        field25         : object        = {}

        @calculate('field25')
        calculateField25 () {}
    }

    return Mixin2
}){}

//---------------------------------------------------------------------------------------------------------------------
export class Mixin3 extends Mixin(
    [ Entity ], (base : AnyConstructor<Entity, typeof Entity>) => {

    class Mixin3 extends base {
        @field()
        field31         : string        = 'string'

        @calculate('field31')
        calculateField31 () {}

        @field()
        field32         : number        = 0

        @calculate('field32')
        calculateField32 () {}

        @field()
        field33         : boolean       = false

        @calculate('field33')
        calculateField33 () {}

        @field()
        field34         : any[]         = []

        @calculate('field34')
        calculateField34 () {}

        @field()
        field35         : object        = {}

        @calculate('field35')
        calculateField35 () {}
    }

    return Mixin3
}){}


//---------------------------------------------------------------------------------------------------------------------
export class Mixin4 extends Mixin(
    [ Entity ], (base : AnyConstructor<Entity, typeof Entity>) => {

    class Mixin4 extends base {
        @field()
        field41         : string        = 'string'

        @calculate('field41')
        calculateField41 () {}

        @field()
        field42         : number        = 0

        @calculate('field42')
        calculateField42 () {}

        @field()
        field43         : boolean       = false

        @calculate('field43')
        calculateField43 () {}

        @field()
        field44         : any[]         = []

        @calculate('field44')
        calculateField44 () {}

        @field()
        field45         : object        = {}

        @calculate('field45')
        calculateField45 () {}
    }

    return Mixin4
}){}


//---------------------------------------------------------------------------------------------------------------------
export class Mixin5 extends Mixin(
    [ Entity ], (base : ClassUnion<typeof Entity>) => {

    class Mixin5 extends base {
        @field()
        field51         : string        = 'string'

        @calculate('field51')
        calculateField51 () {}

        @field()
        field52         : number        = 0

        @calculate('field52')
        calculateField52 () {}

        @field()
        field53         : boolean       = false

        @calculate('field53')
        calculateField53 () {}

        @field()
        field54         : any[]         = []

        @calculate('field54')
        calculateField54 () {}

        @field()
        field55         : object        = {}

        @calculate('field55')
        calculateField55 () {}
    }

    return Mixin5
}){}


//---------------------------------------------------------------------------------------------------------------------
export class TestEntity5 extends MixinAny(
    [ Mixin5, Mixin4, Mixin3, Mixin2, Mixin1, Entity, Base ],
    (base : AnyConstructor<Mixin5 & Mixin4 & Mixin3 & Mixin2 & Mixin1 & Entity & Base, typeof Mixin5 & typeof Mixin4 & typeof Mixin3 & typeof Mixin2 & typeof Mixin1 & typeof Entity & typeof Base>) => base
){}


//---------------------------------------------------------------------------------------------------------------------
export class TestEntity1 extends Mixin(
    [ Mixin1, Entity, Base ],
    (base : AnyConstructor<Mixin1 & Entity & Base, typeof Mixin1 & typeof Entity & typeof Base>) => base
) {}

