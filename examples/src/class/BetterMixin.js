import { CI, MI } from "../collection/Iterator.js";
//---------------------------------------------------------------------------------------------------------------------
const MixinInstanceOfProperty = Symbol('MixinIdentity');
const MixinStateProperty = Symbol('MixinStateProperty');
//---------------------------------------------------------------------------------------------------------------------
class MixinWalkDepthState {
    constructor() {
        this.sourceEl = undefined;
        this.$elementsByTopoLevel = undefined;
        this.$topoLevels = undefined;
        this.linearizedByTopoLevelsSource = MI(this.linearizedByTopoLevels());
    }
    static new(props) {
        const me = new this();
        props && Object.assign(me, props);
        return me;
    }
    get topoLevels() {
        if (this.$topoLevels !== undefined)
            return this.$topoLevels;
        return this.$topoLevels = this.buildTopoLevels();
    }
    buildTopoLevels() {
        return Array.from(this.elementsByTopoLevel.keys()).sort((level1, level2) => level1 - level2);
    }
    get elementsByTopoLevel() {
        if (this.$elementsByTopoLevel !== undefined)
            return this.$elementsByTopoLevel;
        return this.$elementsByTopoLevel = this.buildElementsByTopoLevel();
    }
    getOrCreateLevel(map, topoLevel) {
        let elementsAtLevel = map.get(topoLevel);
        if (!elementsAtLevel) {
            elementsAtLevel = [];
            map.set(topoLevel, elementsAtLevel);
        }
        return elementsAtLevel;
    }
    buildElementsByTopoLevel() {
        let maxTopoLevel = 0;
        const map = CI(this.sourceEl.requirements)
            .map(mixin => mixin.walkDepthState.elementsByTopoLevel)
            .concat()
            .reduce((elementsByTopoLevel, [topoLevel, mixins]) => {
            if (topoLevel > maxTopoLevel)
                maxTopoLevel = topoLevel;
            this.getOrCreateLevel(elementsByTopoLevel, topoLevel).push(mixins);
            return elementsByTopoLevel;
        }, new Map());
        this.getOrCreateLevel(map, maxTopoLevel + 1).push([this.sourceEl]);
        return CI(map).map(([level, elements]) => {
            return [level, CI(elements).concat().uniqueOnly().sort((mixin1, mixin2) => mixin1.id - mixin2.id)];
        }).toMap();
    }
    *linearizedByTopoLevels() {
        yield* CI(this.topoLevels).map(level => this.elementsByTopoLevel.get(level)).concat();
    }
}
// Note: 65535 mixins only, because of the hashing function implementation (String.fromCharCode)
let MIXIN_ID = 1;
//---------------------------------------------------------------------------------------------------------------------
export const identity = a => class extends a {
};
// export type IdentityMixin<Base extends object>         = < T extends AnyConstructor<Base>>(base : T) => T
//
// export const IdentityMixin             = <Base extends object>() : IdentityMixin<Base> => identity
//---------------------------------------------------------------------------------------------------------------------
class ZeroBaseClass {
}
//---------------------------------------------------------------------------------------------------------------------
class MixinState {
    constructor() {
        this.id = MIXIN_ID++;
        this.requirements = [];
        this.baseClass = ZeroBaseClass;
        this.identitySymbol = undefined;
        this.mixinLambda = identity;
        this.walkDepthState = MixinWalkDepthState.new({ sourceEl: this });
        // private $hash               : MixinHash             = ''
        this.$minimalClass = undefined;
        this.name = '';
    }
    static new(props) {
        const me = new this();
        props && Object.assign(me, props);
        //------------------
        const mixinLambda = me.mixinLambda;
        const symbol = me.identitySymbol = Symbol(mixinLambda.name);
        const mixinLambdaWrapper = Object.assign(function (base) {
            const extendedClass = mixinLambda(base);
            extendedClass.prototype[symbol] = true;
            return extendedClass;
        }, {
            [MixinInstanceOfProperty]: symbol,
            [MixinStateProperty]: me
        });
        Object.defineProperty(mixinLambdaWrapper, Symbol.hasInstance, { value: isInstanceOfStatic });
        me.mixinLambda = mixinLambdaWrapper;
        return me;
    }
    get minimalClass() {
        if (this.$minimalClass !== undefined)
            return this.$minimalClass;
        return this.$minimalClass = this.buildMinimalClass();
    }
    // get hash () : MixinHash {
    //     if (this.$hash !== '') return this.$hash
    //
    //     return this.$hash = this.buildHash()
    // }
    // buildHash () : MixinHash {
    //     return String.fromCharCode(...this.walkDepthState.linearizedByTopoLevelsSource.map(mixin => mixin.id))
    // }
    getBaseClassMixinId(baseClass) {
        const constructor = this.constructor;
        const mixinId = constructor.baseClassesIds.get(baseClass);
        if (mixinId !== undefined)
            return mixinId;
        const newId = MIXIN_ID++;
        constructor.baseClassesIds.set(baseClass, newId);
        return newId;
    }
    buildMinimalClass() {
        const constructor = this.constructor;
        let baseCls = this.baseClass;
        const minimalClassConstructor = this.walkDepthState.linearizedByTopoLevelsSource.reduce((acc, mixin) => {
            const { cls, hash } = acc;
            const nextHash = hash + String.fromCharCode(mixin.id);
            let wrapperCls = constructor.minimalClassesByLinearHash.get(nextHash);
            if (!wrapperCls) {
                wrapperCls = mixin.mixinLambda(cls);
                mixin.name = wrapperCls.name;
                constructor.minimalClassesByLinearHash.set(nextHash, wrapperCls);
            }
            acc.cls = wrapperCls;
            acc.hash = nextHash;
            return acc;
        }, { cls: baseCls, hash: String.fromCharCode(this.getBaseClassMixinId(baseCls)) }).cls;
        const minimalClass = Object.assign(minimalClassConstructor, {
            [MixinInstanceOfProperty]: this.identitySymbol,
            [MixinStateProperty]: this,
            mix: this.mixinLambda,
            derive: (base) => Mixin([minimalClass, base], base => class extends base {
            }),
            $: this,
            toString: this.toString.bind(this)
        });
        Object.defineProperty(minimalClass, Symbol.hasInstance, { value: isInstanceOfStatic });
        return minimalClass;
    }
    toString() {
        return this.walkDepthState.linearizedByTopoLevelsSource.reduce((acc, mixin) => `${mixin.name}(${acc})`, this.baseClass.name);
    }
}
MixinState.minimalClassesByLinearHash = new Map();
MixinState.baseClassesIds = new Map();
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
    initialize(props) {
        props && Object.assign(this, props);
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
    static new(props) {
        const instance = new this();
        instance.initialize(props);
        return instance;
    }
}
//---------------------------------------------------------------------------------------------------------------------
const mixin = (required, mixinLambda) => {
    let ownBaseClass;
    if (required.length > 0) {
        const lastRequirement = required[required.length - 1];
        // absence of `[ MixinStateProperty ]` indicates its a regular class and not a mixin class
        // avoid assigning ZeroBaseClass - it will be applied as default at the end
        if (!lastRequirement[MixinStateProperty] && lastRequirement !== ZeroBaseClass)
            ownBaseClass = lastRequirement;
    }
    let baseClassFromRequirements;
    const requirements = [];
    required.forEach((requirement, index) => {
        const mixinState = requirement[MixinStateProperty];
        if (mixinState !== undefined) {
            const currentBaseClass = mixinState.baseClass;
            // ignore ZeroBaseClass - since those are compatible with any other base class
            if (currentBaseClass !== ZeroBaseClass) {
                if (ownBaseClass) {
                    if (currentBaseClass !== ownBaseClass) {
                        // all base classes from the requirements should match or be a superclass of our "own" base class (listed in our requirements)
                        if (!currentBaseClass.prototype.isPrototypeOf(ownBaseClass.prototype))
                            throw new Error("Base class mismatch");
                    }
                }
                else {
                    if (baseClassFromRequirements) {
                        // already found a base class from requirements earlier
                        if (baseClassFromRequirements !== currentBaseClass) {
                            const currentIsSub = currentBaseClass.prototype.isPrototypeOf(baseClassFromRequirements.prototype);
                            const currentIsSuper = baseClassFromRequirements.prototype.isPrototypeOf(currentBaseClass.prototype);
                            if (!currentIsSub && !currentIsSuper)
                                throw new Error("Base class mismatch");
                            baseClassFromRequirements = currentIsSuper ? currentBaseClass : baseClassFromRequirements;
                        }
                    }
                    else
                        // first base class from requirements
                        baseClassFromRequirements = currentBaseClass;
                }
            }
            requirements.push(mixinState);
        }
        else {
            if (index !== required.length - 1)
                throw new Error("Base class should be provided as the last element of the requirements array");
        }
    });
    //------------------
    const mixinState = MixinState.new({ requirements, mixinLambda: mixinLambda, baseClass: ownBaseClass || baseClassFromRequirements || ZeroBaseClass });
    return mixinState.minimalClass;
};
//---------------------------------------------------------------------------------------------------------------------
// this function works both with default mixin class and mixin application function
// it supplied internally as [Symbol.hasInstance] for the default mixin class and mixin application function
const isInstanceOfStatic = function (instance) {
    return Boolean(instance && instance[this[MixinInstanceOfProperty]]);
};
//---------------------------------------------------------------------------------------------------------------------
/**
 * This is the `instanceof` analog for the classes created with [[Mixin]] helper. It also provides [typeguard](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards).
 *
 * There's no strict need to use it, as the native `instanceof` is also supported for the mixins created with the [[Mixin]] helper and also provides
 * typeguarding.
 *
 * @param instance Any value, normally an instance of the mixin class
 * @param func The constructor function of the class, created with [[Mixin]]
 */
export const isInstanceOf = (instance, func) => {
    return Boolean(instance && instance[func[MixinInstanceOfProperty]]);
};
//---------------------------------------------------------------------------------------
/**
 * This function allows you to create mixin classes. Mixin classes solves the well-known problem with "classical" single-class inheritance,
 * in which class hierarchy must form a tree. When using mixins, class hierarchy becomes an arbitrary acyclic graph.
 *
 * Another view on mixins is that, if "classical" class is a point (a vertice of the graph), mixin class is an arrow between the points
 * (an edge in the graph, or rather, a description of the edge).
 *
 * Some background information about the mixin pattern can be found [here](https://mariusschulz.com/blog/typescript-2-2-mixin-classes)
 * and [here](https://www.bryntum.com/blog/the-mixin-pattern-in-typescript-all-you-need-to-know/).
 *
 * The pattern, being described here, is the evolution of the previous work, and main advantage is that it solves the compilation error
 * for circular references.
 *
 * Mixin definition. Requirements
 * ------------------------------
 *
 * The pattern looks like:
 *
 *     class Mixin1 extends Mixin(
 *         [],
 *         (base : AnyConstructor) =>
 *
 *         class Mixin1 extends base {
 *             prop1        : string
 *             method1 () : string {
 *                 return this.prop1
 *             }
 *             static static1 : number
 *         }
 *     ){}
 *
 * The core of the definition above is the mixin lambda - a function which receives a base class as its argument and returns a class,
 * extending the base class with additional properties.
 *
 * The example above creates a mixin `Mixin1` which has no requirements. Requirements are the other mixins,
 * which needs to be included in the base class of this mixin.
 *
 * There's also a special type of the requirement,
 * called "base class requirement". It is optional and can only appear as the last argument of the requirements
 * array. It does not have to be a mixin, created with the `Mixin` function, but can be any JS class. This requirement
 * specifies, that the base class of this mixin should be a subclass of the given class (or that class itself).
 *
 * The requirements of the mixin needs to be listed 3 times:
 * - as an array of constructor functions, in the 1st argument of the `Mixin` function
 * - as an instance type intersection, in the 1st type argument for the [[AnyConstructor]] type
 * - as an static type intersection, in the 2nd type argument for the [[AnyConstructor]] type
 *
 * For example, `Mixin2` requires `Mixin1`:
 *
 *     class Mixin2 extends Mixin(
 *         [ Mixin1 ],
 *         (base : AnyConstructor<Mixin1, typeof Mixin1>) =>
 *
 *         class Mixin2 extends base {
 *         }
 *     ){}
 *
 * And `Mixin3` requires both `Mixin1` and `Mixin2` (even that its redundant, since `Mixin2` already requires `Mixin1`,
 * but suppose we don't know the implementation details of the `Mixin2`):
 *
 *     class Mixin3 extends Mixin(
 *         [ Mixin1, Mixin2 ],
 *         (base : AnyConstructor<Mixin1 & Mixin2, typeof Mixin1 & typeof Mixin2>) =>
 *
 *         class Mixin3 extends base {
 *         }
 *     ){}
 *
 * Now, `Mixin4` requires `Mixin3`, plus, it requires the base class to be `SomeBaseClass`:
 *
 *     class SomeBaseClass {}
 *
 *     class Mixin4 extends Mixin(
 *         [ Mixin3, SomeBaseClass ],
 *         (base : AnyConstructor<
 *             Mixin3 & SomeBaseClass, typeof Mixin3 & typeof SomeBaseClass
 *         >) =>
 *
 *         class Mixin4 extends base {
 *         }
 *     ){}
 *
 * As already briefly mentioned, the requirements are "scanned" deep and included only once. Also all minimal classes are cached -
 * for example the creation of the Mixin3 will reuse the minimal class of the Mixin2 instead of creating a new intermediate class.
 * This means that all edges of the mixin dependencies graph are created only once (up to the base class).
 *
 * Requirements can not form cycles - that will generate both compilation error and run-time stack overflow.
 *
 * The typing for the `Mixin` function will provide a compilation error, if the requirements don't match, e.g. some requirement is
 * listed in the array, but missed in the types. This protects you from trivial mistakes. However, the typing is done up to 10 requirements only.
 * If you need more than 10 requirements for the mixin, use the [[MixinAny]] function, which is an exact analog of `Mixin`, but without
 * this type-level protection for requirements mismatch.
 *
 * It is possible to simplify the type of the `base` argument a bit, by using the [[ClassUnion]] helper. However, it seems in certain edge cases
 * it may lead to compilation errors. If your scenarios are not so complex you should give it a try. Using the [[ClassUnion]] helper, the
 * `Mixin3` can be defined as:
 *
 *     class Mixin3 extends Mixin(
 *         [ Mixin1, Mixin2 ],
 *         (base : ClassUnion<typeof Mixin1, typeof Mixin2>) =>
 *
 *         class Mixin3 extends base {
 *         }
 *     ){}
 *
 * Note, that due to this [issue](https://github.com/Microsoft/TypeScript/issues/7342), if you use decorators in your mixin class,
 * the declaration needs to be slightly more verbose (can not use compact notation for the arrow functions):
 *
 *     class Mixin2 extends Mixin(
 *         [ Mixin1 ],
 *         (base : AnyConstructor<Mixin1, typeof Mixin1>) => {
 *             class Mixin2 extends base {
 *                 @decorator
 *                 prop2 : string
 *             }
 *             return Mixin2
 *         }
 *     ){}
 *
 * As you noticed, the repeating listing of the requirements is somewhat verbose. Suggestions how the pattern can be improved
 * are [very welcomed](mailto:nickolay8@gmail.com).
 *
 * Mixin instantiation. Mixin constructor. `instanceof`
 * --------------------------------
 *
 * You can instantiate any mixin class just by using its constructor:
 *
 *     const instance1 = new Mixin1()
 *     const instance2 = new Mixin2()
 *
 * As explained in details [here](https://mariusschulz.com/blog/typescript-2-2-mixin-classes), mixin constructor should accept variable number of arguments
 * with the `any` type. This is simply because the mixin is supposed to be applicable to any other base class, which may have its own type
 * of the constructor arguments.
 *
 *     class Mixin2 extends Mixin(
 *         [ Mixin1 ],
 *         (base : AnyConstructor<Mixin1, typeof Mixin1>) => {
 *             class Mixin2 extends base {
 *                 prop2 : string
 *
 *                 constructor (...args: any[]) {
 *                     super(...args)
 *                     this.prop2 = ''
 *                 }
 *             }
 *             return Mixin2
 *         }
 *     ){}
 *
 * In other words, its not possible to provide any type-safety for mixin instantiation using regular class constructor.
 *
 * However, if we change the way we create class instances a little, we can get the type-safety back. For that,
 * we need to use a "uniform" class constructor - a constructor which has the same form for all classes. The [[Base]] class
 * provides such constructor as its static [[Base.new|new]] method. The usage of `Base` class is not required - you can use
 * any other base class.
 *
 * The `instanceof` operator works as expected for instances of the mixin classes. It also takes into account all the requirements.
 * For example:
 *
 *     const instance2 = new Mixin2()
 *
 *     const isMixin2 = instance2 instanceof Mixin2 // true
 *     const isMixin1 = instance2 instanceof Mixin1 // true, since Mixin2 requires Mixin1
 *
 * See also [[isInstanceOf]].
 *
 * "Manual" class derivation
 * --------------------------------
 *
 * You have defined a mixin using the `Mixin` function. Now you want to apply it to some base class to get the "specific" class to be able
 * to instantiate it. As described above - you don't have to, you can instantiate it directly.
 *
 * Sometimes however, you still want to derive the class "manually". For that, you can use static methods `mix` and `derive`, available
 * on all mixins.
 *
 * The `mix` method provides a direct access to the mixin lambda. It does not take requirements into account - that's the implementor's responsibility.
 * The `derive` method is something like "accumulated" mixin lambda - mixin lambda with all requirements.
 *
 * Both `mix` and `derive` provide the reasonably typed outcome.
 *
 *     class Mixin1 extends Mixin(
 *         [],
 *         (base : AnyConstructor) =>
 *
 *         class Mixin1 extends base {
 *             prop1        : string
 *         }
 *     ){}
 *
 *     class Mixin2 extends Mixin(
 *         [ Mixin1 ],
 *         (base : AnyConstructor<Mixin1, typeof Mixin1>) =>
 *
 *         class Mixin2 extends base {
 *             prop2        : string
 *         }
 *     ){}
 *
 *     const ManualMixin1 = Mixin1.mix(Object)
 *     const ManualMixin2 = Mixin2.mix(Mixin1.mix(Object))
 *
 *     const AnotherManualMixin1 = Mixin1.derive(Object)
 *     const AnotherManualMixin2 = Mixin2.derive(Object)
 *
 * Generics
 * --------
 *
 * Using generics with mixins is tricky because TypeScript does not have higher-kinded types and type inference for generics. Still some form
 * of generic arguments is possible, using the interface merging trick.
 *
 * Here's the pattern:
 *
 * ```ts
 * class Duplicator<Element> extends Mixin(
 *     [],
 *     (base : AnyConstructor) =>
 *
 *     class Duplicator extends base {
 *         Element                 : any
 *
 *         duplicate (value : this[ 'Element' ]) : this[ 'Element' ][] {
 *             return [ value, value ]
 *         }
 *     }
 * ){}
 *
 * interface Duplicator<Element> {
 *     Element : Element
 * }
 *
 * const dup = new Duplicator<boolean>()
 *
 * dup.duplicate('foo') // TS2345: Argument of type '"foo"' is not assignable to parameter of type 'boolean'.
 * ```
 *
 * In the example above, we've defined a generic argument `Element` for the outer mixin class, but in fact, that argument is not used anywhere in the
 * nested class definition in the mixin lambda. Instead, in the nested class, we define a property `Element`, which plays the role of the
 * generic argument.
 *
 * Mixin class methods then can refer to the generic type as `this[ 'Element' ]`.
 *
 * The generic arguments of the outer and nested classes are tied together in the additional interface declaration, which, by TypeScript rules
 * is merged together with the class definition. In this declaration, we specify that property `Element` has type of the `Element` generic argument.
 *
 * Limitations
 * ---------
 *
 * The most important limitation we found (which affect the old pattern as well) is the compilation error, which will be issued for
 * the private/protected methods, when compiling with declarations emitting (*.d.ts files generation).
 *
 * This is a [well-known problem](https://github.com/microsoft/TypeScript/issues/35822) in the TypeScript world – the *.d.ts files do not represent
 * the internal data structures of the TypeScript compiler well. Instead they use some simplified syntax, optimized for human editing.
 * This is why the compiler may generate false positives in the incremental compilation mode – it uses *.d.ts files internally.
 *
 * This can be a show-stopper for the people that use declaration files (usually for publishing). Keep in mind though, that you can always
 * publish actual TypeScript sources along with the generated JavaScript files, instead of publishing JavaScript + declarations files.
 *
 */
export const Mixin = mixin;
/**
 * This is an exact analog of the [[Mixin]] function, but without type-level protection for requirements mismatch.
 * It supports unlimited number of requirements.
 */
export const MixinAny = mixin;
