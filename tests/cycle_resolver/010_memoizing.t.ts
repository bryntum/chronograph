import { CalculateProposed, CycleResolution, CycleResolutionInput, Formula, CycleDescription } from "../../src/cycle_resolver/CycleResolver.js"

declare const StartTest : any

StartTest(t => {

    const StartDate         = Symbol('StartDate')
    const EndDate           = Symbol('EndDate')
    const Duration          = Symbol('Duration')

    const startDateFormula  = Formula.new({
        output      : StartDate,
        inputs      : new Set([ Duration, EndDate ])
    })

    const endDateFormula    = Formula.new({
        output      : EndDate,
        inputs      : new Set([ Duration, StartDate ])
    })

    const durationFormula   = Formula.new({
        output      : Duration,
        inputs      : new Set([ StartDate, EndDate ])
    })


    const description       = CycleDescription.new({
        variables           : new Set([ StartDate, EndDate, Duration ]),
        formulas            : new Set([ startDateFormula, endDateFormula, durationFormula ])
    })

    const resolutionContext = CycleResolution.new({
        description                 : description,
        defaultResolutionFormulas   : new Set([ endDateFormula ])
    })

    let input

    t.beforeEach(t => {
        input               = CycleResolutionInput.new({ context : resolutionContext })
    })


    t.it('Should only calculate the resolution once', t => {
        const spy           = t.spyOn(resolutionContext, 'buildResolution')

        const resolution1   = resolutionContext.resolve(input)

        t.expect(spy).toHaveBeenCalled(1)

        t.isDeeply(
            resolution1,
            new Map([
                [ StartDate, CalculateProposed ],
                [ EndDate, CalculateProposed ],
                [ Duration, CalculateProposed ]
            ])
        )

        //-------------------------
        spy.reset()

        const resolution2   = resolutionContext.resolve(input)

        t.expect(spy).toHaveBeenCalled(0)

        t.isStrict(resolution1, resolution2, "Cached resolution used")

        //-------------------------
        spy.reset()

        const input2        = CycleResolutionInput.new({ context : resolutionContext })

        input2.addProposedValueFlag(StartDate)
        input2.addProposedValueFlag(EndDate)

        const resolution3   = resolutionContext.resolve(input2)

        t.expect(spy).toHaveBeenCalled(1)
    })
})
