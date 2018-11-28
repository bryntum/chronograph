import {Base} from "../util/Mixin.js";

//-----------------------------------------------------------------------------
import {ChronoId} from "./ChronoId.js";

type ChronoNamespace    = string


export abstract class ChronoNamespaceReference extends Base {
    abstract resolve () : ChronoNamespace
}

export class ChronoUnresolvedNamespaceReference extends ChronoNamespaceReference {
    thunk           : () => ChronoNamespaceReference

    resolve () : ChronoNamespace {
        return this.thunk().resolve()
    }
}

export class ChronoDirectNamespaceReference extends ChronoNamespaceReference {
    ns              : string

    resolve () : ChronoNamespace {
        return this.ns
    }
}

export class ChronoInnerNamespaceReference extends ChronoNamespaceReference {
    nsRef           : ChronoNamespaceReference
    namespace       : string

    resolve () : ChronoNamespace {
        return `${this.nsRef.resolve()}/${this.namespace}`
    }
}

export class ChronoOuterNamespaceReference extends ChronoNamespaceReference {
    nsRef           : ChronoNamespaceReference
    namespace       : string

    resolve () : ChronoNamespace {
        return `${this.namespace}/${this.nsRef.resolve()}`
    }
}



export abstract class ChronoAtomReference extends Base {
    abstract resolve () : ChronoId
}


export class ChronoUnresolvedAtomReference extends ChronoAtomReference {
    thunk           : () => ChronoAtomReference

    resolve () : ChronoId {
        return this.thunk().resolve()
    }
}

export class ChronoDirectAtomReference extends ChronoAtomReference {
    id              : ChronoId

    resolve () : ChronoId {
        return this.id
    }
}

export class ChronoNamespacedAtomReference extends ChronoAtomReference {
    ns              : ChronoNamespaceReference
    id              : ChronoId

    resolve () : ChronoId {
        return `${this.ns.resolve()}/${this.id}`
    }
}

