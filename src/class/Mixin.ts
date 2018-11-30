//---------------------------------------------------------------------------------------------------------------------
/*

    One should use Base as a base class, instead of Object
    this is because, when compiled to ES3 (which we use for NodeJS / IE11 compatibility), Object is called as a
    super constructor and returned value from it is used as an instance object
    that instance object will be missing prototype inheritance

    the contract is, that native JS constructor for the class is side-effect free
    all the effects may happen in the `initialize` method below
    for the instantiation with initialization one should use static `new` method
    the motivation for such design is that only in this case the attribute initializers, like

         class {
             some      : string   = "string"
         }
    works correctly
*/
export class Base {

    initialize<T extends Base>(props? : Partial<T>) {
        props && Object.assign(this, props)
    }


    static new<T extends typeof Base>(this: T, props? : Partial<InstanceType<T>>) : InstanceType<T> {
        const instance      = new this()

        props && instance.initialize<InstanceType<T>>(props)

        return instance as InstanceType<T>
    }


    class<T extends typeof Base>() : T {
        return this.constructor as T
    }
}

//---------------------------------------------------------------------------------------------------------------------

export type AnyConstructor          = new (...input: any[]) => any
export type AnyConstructor1<A>      = new (...input: any[]) => A


export type AnyFunction             = (...input: any[]) => any
export type AnyFunction1<A>         = (...input: any[]) => A


//---------------------------------------------------------------------------------------------------------------------
export type Constructable<T extends any> = new (...args : any[]) => T


//---------------------------------------------------------------------------------------------------------------------
export type Mixin<T extends AnyFunction> = InstanceType<ReturnType<T>>



/*

When you feel frivolous and want to have some useful distraction please feel free to encode your favorite
mixin typization scheme below, or another crazy experiment

*/
//----------------            go wild here              ------------------
class ChronoNumber extends Number {
    constructor (number : number) {
        super(number)

        return Number(number)
    }
}

