import {Schema} from "../../src/schema/Schema.js";

declare const StartTest : any

StartTest(t => {

    t.it('Minimal Schema', t => {
        const schema        = Schema.new({ name : "Basic schema" })

        const entity1       = schema.createEntity('Entity1')

        entity1.createField('field11')
        entity1.createField('field12')

        const entity2       = schema.createEntity('Entity2')

        entity2.createField('field21')
        entity2.createField('field22')





    })

})
