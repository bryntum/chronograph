
//---------------------------------------------------------------------------------------------------------------------
export const SomeMixin1Lambda = mixin(
    [ Base ],
    (base : ClassUnion<typeof Base>) =>

    class SomeMixin1 extends base {
        prop1       : string    = '1'

        method1 (p1 : boolean) : string {
            return this.prop1
        }

        static s1 : number = 1
    }
)

if (DEBUG)
    class SomeMixin1 extends SomeMixin1Lambda.minimalClass {}
else
    const SomeMixin1 = 1

type A = SomeMixin1
//----------------------------------------------------------------------------------------------------------------------
