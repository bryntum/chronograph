import { Atom } from "../chrono2/atom/Atom.js"
import { BoxUnbound } from "../chrono2/data/Box.js"
import { CalculableBoxUnbound } from "../chrono2/data/CalculableBox.js"
import { CalculableBoxGenUnbound } from "../chrono2/data/CalculableBoxGen.js"
import { AnyConstructor, Mixin } from "../class/Mixin.js"
import { EntityMeta } from "../schema2/EntityMeta.js"
import { Field } from "../schema2/Field.js"
import { Entity } from "./Entity.js"
import { Replica } from "./Replica.js"


//---------------------------------------------------------------------------------------------------------------------
export interface PartOfEntityAtom {
    self        : Entity

    graph       : Replica
}


//---------------------------------------------------------------------------------------------------------------------
/**
 * Mixin, for the identifier that represent a field of the entity. Requires the [[Identifier]] (or its subclass)
 * as a base class. See more about mixins: [[Mixin]]
 */
export class FieldAtom extends Mixin(
    [ Atom ],
    (base : AnyConstructor<Atom, typeof Atom>) =>

class FieldAtom extends base implements PartOfEntityAtom {
    /**
     * Reference to the [[Field]] this identifier represents
     */
    field       : Field             = undefined

    /**
     * Reference to the [[Entity]] this identifier represents
     */
    self        : Entity            = undefined

    graph       : Replica


    toString () : string {
        return `Field atom [${this.name}]`
    }
}){}

export type FieldAtomConstructor  = typeof FieldAtom

export class FieldBox extends FieldAtom.mix(BoxUnbound) {}
export class FieldCalculableBox extends FieldAtom.mix(CalculableBoxUnbound) {}
export class FieldCalculableBoxGen extends FieldAtom.mix(CalculableBoxGenUnbound) {}



//---------------------------------------------------------------------------------------------------------------------
const constFalse    = () => false

/**
 * Mixin, for the identifier that represent an entity as a whole. Requires the [[Atom]] (or its subclass)
 * as a base class. See more about mixins: [[Mixin]]
 */
export class EntityAtom extends Mixin(
    [ Atom ],
    (base : AnyConstructor<Atom, typeof Atom>) =>

class EntityAtom extends base implements PartOfEntityAtom {
    /**
     * [[EntityMeta]] instance of the entity this identifier represents
     */
    entity      : EntityMeta        = undefined

    /**
     * Reference to the [[Entity]] this identifier represents
     */
    self        : Entity            = undefined

    graph       : Replica


    // entity atom is considered changed if the field atoms has changed
    // this just means if it's calculation method has been called, it should always
    // assign a new value
    $equality       : (v1 : unknown, v2 : unknown) => boolean   = constFalse


    toString () : string {
        return `Entity atom [${ this.self }]`
    }
}){}


export class EntityBox extends EntityAtom.mix(BoxUnbound) {}
