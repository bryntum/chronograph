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

    initialize<T extends Base> (props? : Partial<T>) {
        props && Object.assign(this, props)
    }


    static new<T extends typeof Base> (this : T, props? : Partial<InstanceType<T>>) : InstanceType<T> {
        const instance      = new this()

        instance.initialize<InstanceType<T>>(props)

        return instance as InstanceType<T>
    }
}

export type BaseConstructor             = typeof Base


//---------------------------------------------------------------------------------------------------------------------
export type AnyFunction<A = any>        = (...input : any[]) => A
export type AnyConstructor<A = object>  = new (...input : any[]) => A


//---------------------------------------------------------------------------------------------------------------------
export type Mixin<T extends AnyFunction> = InstanceType<ReturnType<T>>

export type MixinConstructor<T extends AnyFunction> =
    T extends AnyFunction<infer M> ? (M extends AnyConstructor<Base> ? M & BaseConstructor : M) : ReturnType<T>


//---------------------------------------------------------------------------------------------------------------------
// very rough typing for a mixin function
export type MixinFunction = (base : AnyConstructor) => AnyConstructor

