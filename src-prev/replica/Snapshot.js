import { Base } from "../class/Mixin.js";
//---------------------------------------------------------------------------------------------------------------------
export const History = (base) => class History extends base {
};
//---------------------------------------------------------------------------------------------------------------------
export const Mutation = (base) => class Mutation extends base {
    constructor() {
        super(...arguments);
        this.isOpened = true;
    }
    close() {
        this.isOpened = false;
    }
    apply(to) {
        if (!this.isOpened)
            this.close();
    }
    unapply(from) {
        if (this.isOpened)
            throw new Error("Invalid state");
    }
};
//---------------------------------------------------------------------------------------------------------------------
export const Snapshot = (base) => class Snapshot extends base {
    clone() {
        const Self = this.constructor;
        return Self.new({
            basedOn: this,
            history: this.history,
            attachedTo: this.attachedTo
        });
    }
};
//---------------------------------------------------------------------------------------------------------------------
export const ChronoQuark = (base) => class ChronoQuark extends base {
};
//---------------------------------------------------------------------------------------------------------------------
export const Propagation = (base) => class Propagation extends base {
    constructor() {
        super(...arguments);
        this.nodesAdded = new Set();
        this.nodesRemoved = new Set();
        this.nodesChanged = new Map();
    }
};
//---------------------------------------------------------------------------------------------------------------------
class Stream extends Base {
    put(value) {
    }
}
