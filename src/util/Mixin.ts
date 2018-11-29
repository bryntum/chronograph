//---------------------------------------------------------------------------------------
// One should use Base as a base class, instead of Object
// this is because, when compiled to ES3 (which we use for NodeJS / IE11 compatibility), Object is called as a
// super constructor and returned value from it is used as an instance object
// that instance object will be missing prototype inheritance

// the contract is, that native JS constructor for the class is side-effect free
// all the effects may happen in the `initialize` method below
// for the instantiation with initialization one should use static `new` method
// the motivation for such design is that only in this case the attribute initializers, like
//
//      class {
//          some      : string   = "string"
//      }
// works correctly

export class Base {

    initialize<T extends Base>(props? : Partial<T>) {
        props && Object.assign(this, props)
    }


    static new<T extends typeof Base>(this: T, props? : Partial<InstanceType<T>>) : InstanceType<T> {
        const instance      = new this()

        props && instance.initialize<InstanceType<T>>(props)

        return instance as InstanceType<T>
    }
}

export type AnyFunction         = (...args : any[]) => any
export type AnyFunction1<A>     = <A>(...args : any[]) => any
export type AnyFunction2<A, B>  = <A, B>(...args : any[]) => any


//---------------------------------------------------------------------------------------
export type Constructable<T extends typeof Base> = new (...args : any[]) => InstanceType<T>


export type Mixin<T extends AnyFunction> =
    T extends AnyFunction2<infer A, infer B>
    ?
        InstanceType<ReturnType<AnyFunction2<A, B>>>
    :
        T extends AnyFunction1<infer A>
        ?
            InstanceType<ReturnType<AnyFunction1<A>>>
        :
            InstanceType<ReturnType<T>>

export type Mixin1<A, T extends AnyFunction = AnyFunction> = InstanceType<ReturnType<T>>

