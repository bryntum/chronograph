import { Entity as EntityData } from "../schema/Schema.js";
import { EntityBox, FieldBox } from "./FieldBox.js";
//---------------------------------------------------------------------------------------------------------------------
export const Entity = (base) => {
    class Entity extends base {
        initialize(...args) {
            const fields = {};
            this.$entity.fields.forEach((field, name) => {
                const fieldBox = fields[name] = FieldBox.new({ field: field, self: this });
                const value = this[name];
                Object.defineProperty(this, name, {
                    get: () => fieldBox.get(),
                    set: (value) => fieldBox.set(value)
                });
                if (value !== undefined)
                    fieldBox.set(value);
            });
            this.fields = fields;
            this.selfBox = EntityBox.new({ entity: this.$entity, self: this });
            this.mutate = {};
            for (let name in this.mutationsOutputResolvers) {
                this.mutate[name] = (() => {
                    const graph = this.getGraph();
                    const output = this.mutationsOutputResolvers[name](this);
                    return graph.compute(output, this[name]);
                });
            }
            super.initialize(...args);
        }
        getGraph() {
            return this.selfBox.graph;
        }
        forEachField(func) {
            const fields = this.fields;
            for (let name in fields) {
                func.call(this, fields[name], name);
            }
        }
        joinGraph(graph) {
            this.forEachField(field => field.joinGraph(graph));
            this.selfBox.joinGraph(graph);
            this.computeBehavior().forEach(behavior => graph.addBehavior(behavior));
        }
        computeBehavior() {
            return [];
        }
        unjoinGraph() {
            if (this.selfBox.graph) {
                this.forEachField(field => field.unjoinGraph());
                this.selfBox.unjoinGraph();
            }
        }
        propagate() {
            // this.selfBox.propagate()
        }
        static addPrimaryKey(key) {
            return this.getEntity().addPrimaryKey(key);
        }
        static addForeignKey(key) {
            return this.getEntity().addForeignKey(key);
        }
        static getField(name) {
            return this.getEntity().getField(name);
        }
        static getEntity() {
            return this.prototype.$entity;
        }
    }
    return Entity;
};
//---------------------------------------------------------------------------------------------------------------------
// `target` will be a prototype of the class with Entity mixin
export const field = function (target, propertyKey) {
    let entity = target.$entity;
    if (!entity)
        entity = target.$entity = EntityData.new();
    entity.createField(propertyKey);
};
export const property = field;
export const mutate = function (resolver) {
    // `target` will be a prototype of the class with Entity mixin
    return function (target, propertyKey, descriptor) {
        let mutations = target.mutationsOutputResolvers;
        if (!mutations)
            mutations = target.mutationsOutputResolvers = {};
        mutations[propertyKey] = resolver;
        // const calculation           = target[ propertyKey ]
        //
        // target[ propertyKey ]       = function () {
        //     const graph     = this.getGraph()
        //     const output    = resolver(this)
        //
        //     return graph.compute(output, calculation)
        // }
    };
};
