import { Base } from "../class/Mixin.js";
export const Atom = (base) => class Atom extends base {
    hasValue() {
        return this.hasOwnProperty('value');
    }
};
// //---------------------------------------------------------------------------------------------------------------------
// export const DelegatedStorage = <T extends Constructable<Readable & Writable>>(base : T) =>
//
// class DelegatedStorage extends base {
//     host            : any
//
//     propertyName    : string | symbol
//
//
//     get () : ChronoValue {
//         return this.host[ this.propertyName ]
//     }
//
//
//     set (value : ChronoValue) : this {
//         this.host[ this.propertyName ]  = value
//
//         return this
//     }
//
//
//     hasValue () : boolean {
//         return this.host.hasOwnProperty(this.propertyName)
//     }
// }
//
// export type DelegatedStorage = Mixin<typeof DelegatedStorage>
//---------------------------------------------------------------------------------------------------------------------
export const Readable = (base) => class Readable extends base {
    get() {
        return this.value;
    }
};
//---------------------------------------------------------------------------------------------------------------------
export const Writable = (base) => class Writable extends base {
    set(value) {
        this.value = value;
        return this;
    }
};
//---------------------------------------------------------------------------------------------------------------------
export const Calculable = (base) => {
    class Calculable extends base {
    }
    return Calculable;
};
//---------------------------------------------------------------------------------------------------------------------
export const MinimalRWAtom = Writable(Readable(Atom(Base)));
