import { Base } from "../class/Base.js"
import { AnyConstructor, Mixin } from "../class/Mixin.js"


//---------------------------------------------------------------------------------------------------------------------
export interface Managed {
    readonly meta       : MetaClass<ManagedConstructor<this>>
}

export type ManagedConstructor<Instance extends Managed = Managed, Static extends Managed = Managed>  = AnyConstructor<Instance, Static>


export class Property<Type, Name, Konstructor extends ManagedConstructor> extends Base {
    name       : string         = undefined


    apply (target : Konstructor) {
    }


    getInitString (configName : string) : string {
        return `this.${this.name}=${configName}.${this.name};`
    }


    static decorator<T extends typeof Property> (this : T, props? : Partial<InstanceType<T>>, cls? : T) : PropertyDecorator {

        return <Konstructor extends ManagedConstructor>(target : InstanceType<Konstructor>, propertyKey : string) : void => {
            const property  = new (cls || this)()

            property.initialize(props)

            property.name = propertyKey

            target.meta.addProperty(property)
        }
    }
}


export class MetaClass<Konstructor extends ManagedConstructor> extends Base {
    konstructor         : Konstructor                                   = undefined

    properties          : Property<unknown, unknown, Konstructor>[]     = []

    $initializer        : (this : InstanceType<Konstructor>, config? : Partial<InstanceType<Konstructor>>) => any   = undefined


    initialize<T extends MetaClass<Konstructor>> (props? : Partial<T>) {
        super.initialize(props)

        if (!this.konstructor) { throw new Error('Required property `konstructor` missing during instantiation of ' + this) }

        // @ts-ignore
        this.instancePrototype.$meta    = this
    }


    get initializer () : this[ '$initializer' ] {
        if (this.$initializer !== undefined) return this.$initializer

        let body : string = Array.from(new Set(this.properties)).map(property => property.getInitString('config')).join('')

        return this.$initializer = new Function('config', body) as this[ '$initializer' ]
    }


    get superclass () : AnyConstructor<unknown & object, unknown & object> {
        return Object.getPrototypeOf(this.konstructor.prototype).constructor
    }


    get instancePrototype () : InstanceType<Konstructor> {
        return this.konstructor.prototype
    }


    addProperty (property : Property<unknown, unknown, Konstructor>) {
        this.properties.push(property)

        property.apply(this.konstructor)
    }
}

export const MetaClassC = <Konstructor extends ManagedConstructor>(config : Partial<MetaClass<Konstructor>>) : MetaClass<Konstructor> =>
    MetaClass.new(config) as MetaClass<Konstructor>


//---------------------------------------------------------------------------------------------------------------------
export class BaseManaged extends Mixin(
    [],
    (base : AnyConstructor) => {

    class BaseManaged extends base {
        $meta               : any


        constructor (...args : any[]) {
            super(...args)

            this.meta.initializer.call(this)
        }


        get meta () : MetaClass<typeof BaseManaged> {
            // @ts-ignore
            return this.constructor.meta
        }


        static get mixinsForMetaClass () : AnyConstructor[] {
            return [ MetaClass ]
        }


        static get meta () : MetaClass<typeof BaseManaged> {
            const proto         = this.prototype
            if (proto.hasOwnProperty('$meta')) return proto.$meta

            // @ts-ignore
            const metaClass     = Mixin(this.mixinsForMetaClass, base => base)

            // @ts-ignore
            return proto.$meta = metaClass.new({ konstructor : this })
        }
    }

    return BaseManaged
}){}
