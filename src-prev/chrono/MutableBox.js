import { MinimalRWAtom } from "../chrono/Atom.js";
import { MinimalImmutable } from "./Immutable.js";
import { Reference } from "./Reference.js";
//---------------------------------------------------------------------------------------------------------------------
export const MutableBox = (base) => {
    class MutableBox extends base {
        constructor() {
            super(...arguments);
            this.cls = MinimalImmutable;
        }
        initialize() {
            super.initialize(...arguments);
            if (this.hasOwnProperty('value$')) {
                this.set(this.value$);
                delete this.value$;
            }
        }
        get() {
            return this.hasValue() ? this.value.get() : undefined;
        }
        set(value) {
            if (this.hasValue()) {
                const referencedNode = this.value;
                if (referencedNode.hasValue()) {
                    const nextNode = referencedNode.next(value);
                    return super.set(nextNode);
                }
                else {
                    referencedNode.set(value);
                    return this;
                }
            }
            else {
                return super.set(this.initialAtom(value));
            }
        }
        isDirty() {
            return false;
        }
        markDirty() {
            return this.bump();
        }
        bump() {
            if (this.hasValue()) {
                const referencedNode = this.value;
                if (referencedNode.hasValue()) {
                    const nextNode = referencedNode.next(undefined);
                    return super.set(nextNode);
                }
                else {
                    return this;
                }
            }
            else {
                return super.set(this.initialAtom(undefined));
            }
        }
        getPrevious() {
            if (this.hasValue()) {
                return this.value.previous;
            }
            else {
                return undefined;
            }
        }
        initialAtomConfig(value) {
            return value !== undefined ? {
                value: value
            } : {};
        }
        initialAtom(value) {
            const cls = this.cls;
            return cls.new(this.initialAtomConfig(value));
        }
    }
    return MutableBox;
};
export const MinimalMutableBox = MutableBox(Reference(MinimalRWAtom));
