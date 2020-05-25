//---------------------------------------------------------------------------------------------------------------------
/**
 * This is a base class, providing the type-safe static constructor [[new]]. This is very convenient when using
 * [[Mixin|mixins]], as mixins can not have types in the constructors.
 */
export class Base {

    /**
     * This method applies its 1st argument (if any) to the current instance using `Object.assign()`.
     *
     * Supposed to be overridden in the subclasses to customize the instance creation process.
     *
     * @param props
     */
    initialize<T extends Base> (props? : Partial<T>) {
        props && Object.assign(this, props)
    }


    /**
     * This is a type-safe static constructor method, accepting a single argument, with the object, corresponding to the
     * class properties. It will generate a compilation error, if unknown property is provided.
     *
     * For example:
     *
     * ```ts
     * class MyClass extends Base {
     *     prop     : string
     * }
     *
     * const instance : MyClass = MyClass.new({ prop : 'prop', wrong : 11 })
     * ```
     *
     * will produce:
     *
     * ```plaintext
     * TS2345: Argument of type '{ prop: string; wrong: number; }' is not assignable to parameter of type 'Partial<MyClass>'.   
     * Object literal may only specify known properties, and 'wrong' does not exist in type 'Partial<MyClass>'
     * ```
     *
     * The only thing this constructor does is create an instance and call the [[initialize]] method on it, forwarding
     * the first argument. The customization of instance is supposed to be performed in that method.
     *
     * @param props
     */
    static new<T extends typeof Base> (this : T, props? : Partial<InstanceType<T>>) : InstanceType<T> {
        const instance      = new this()

        instance.initialize<InstanceType<T>>(props)

        return instance as InstanceType<T>
    }
}



