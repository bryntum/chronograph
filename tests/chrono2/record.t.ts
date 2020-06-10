import { Record } from "../../src/chrono2/data/Record.js"

declare const StartTest : any

type Record1 = {
    field1      : string,
    field2      : number
}

StartTest(t => {

    t.it('Newly created record should return `null` on read for all fields', t => {
        const record     = new Record<Record1>()

        t.isStrict(record.get('field1'), null)
        t.isStrict(record.get('field2'), null)
    })


    t.it('Should read your own writes', t => {
        const record     = new Record<Record1>()

        record.set('field1', 'str')
        record.set('field2', 10)

        t.is(record.get('field1'), 'str')
        t.is(record.get('field2'), 10)

        record.set('field1', 'str2')
        record.set('field2', 100)

        record.set('field1', 'str3')
        record.set('field2', 11)

        t.is(record.get('field1'), 'str3')
        t.is(record.get('field2'), 11)
    })


    t.it('Writing `undefined` should be converted to `null`', t => {
        const record     = new Record<Record1>()

        record.set('field1', 'str')
        record.set('field2', 10)

        record.set('field1', undefined)
        record.set('field2', undefined)

        t.isStrict(record.get('field1'), null)
        t.isStrict(record.get('field2'), null)
    })
})
