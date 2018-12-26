import { Atom, Readable, Writable } from "../chrono/Atom.js";
import { Immutable } from "../chrono/Immutable.js";
import { MinimalNode } from "../graph/Node.js";
import { HasId } from "./HasId.js";
export const ChronoGraphNode = (base) => class ChronoGraphNode extends base {
    nextConfig(value) {
        return Object.assign(super.nextConfig(value), { id: this.id });
    }
    toString() {
        return `[node ${this.id}]`;
    }
};
export const MinimalChronoGraphNode = ChronoGraphNode(HasId(Immutable(Writable(Readable(Atom(MinimalNode))))));
