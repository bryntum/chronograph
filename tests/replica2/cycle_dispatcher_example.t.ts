// import { Atom } from "../../src/chrono2/atom/Atom.js"
// import { CalculationModeSync } from "../../src/chrono2/CalculationMode.js"
// import { EffectHandler, HasProposedValue, PreviousValueOf, ProposedOrPrevious } from "../../src/chrono2/Effect.js"
// import { Base } from "../../src/class/Base.js"
// import {
//     Formula,
//     CycleDescription,
//     CycleResolution,
//     FormulaId,
//     CalculateProposed,
//     CycleResolutionInput, Variable
// } from "../../src/cycle_resolver/CycleResolver.js"
// import { calculate, Entity, field } from "../../src/replica2/Entity.js"
// import { Replica } from "../../src/replica2/Replica.js"
//
// declare const StartTest : any
//
// //---------------------------------------------------------------------------------------------------------------------
// const StartVar           = Symbol('Start')
// const EndVar             = Symbol('End')
// const DurationVar        = Symbol('Duration')
//
// //---------------------------------------------------------------------------------------------------------------------
// const startFormula       = Formula.new({
//     output      : StartVar,
//     inputs      : new Set([ DurationVar, EndVar ])
// })
//
// const endFormula         = Formula.new({
//     output      : EndVar,
//     inputs      : new Set([ DurationVar, StartVar ])
// })
//
// const durationFormula   = Formula.new({
//     output      : DurationVar,
//     inputs      : new Set([ StartVar, EndVar ])
// })
//
// //---------------------------------------------------------------------------------------------------------------------
// const cycleDescription = CycleDescription.new({
//     variables           : new Set([ StartVar, EndVar, DurationVar ]),
//     formulas            : new Set([ startFormula, endFormula, durationFormula ])
// })
//
//
// const cycleResolution = CycleResolution.new({
//     description                 : cycleDescription,
//     defaultResolutionFormulas   : new Set([ endFormula ])
// })
//
// //---------------------------------------------------------------------------------------------------------------------
// enum Instruction {
//     KeepDuration    = 'KeepDuration',
//     KeepStart       = 'KeepStart',
//     KeepEnd         = 'KeepEnd'
// }
//
//
// //---------------------------------------------------------------------------------------------------------------------
// class CycleDispatcher extends CycleResolutionInput {
//
//     addInstruction (instruction : Instruction) {
//         if (instruction === Instruction.KeepStart) this.addKeepIfPossibleFlag(StartVar)
//         if (instruction === Instruction.KeepEnd) this.addKeepIfPossibleFlag(EndVar)
//         if (instruction === Instruction.KeepDuration) this.addKeepIfPossibleFlag(DurationVar)
//     }
//
//
//     collectInfo (Y : EffectHandler<CalculationModeSync>, atom : Atom, variable : Variable) {
//         if (Y(PreviousValueOf(atom)) != null) this.addPreviousValueFlag(variable)
//
//         if (Y(HasProposedValue(atom))) this.addProposedValueFlag(variable)
//     }
// }
//
// const isNotNumber = (value : any) : boolean => value !== Number(value)
//
// const dispatcherEq     = (v1 : CycleDispatcher, v2 : CycleDispatcher) : boolean => {
//     const resolution1       = v1.resolution
//     const resolution2       = v2.resolution
//
//     return resolution1.get(StartVar) === resolution2.get(StartVar)
//         && resolution1.get(EndVar) === resolution2.get(EndVar)
//         && resolution1.get(DurationVar) === resolution2.get(DurationVar)
// }
//
// const defaultDispatcher = CycleDispatcher.new({ context : cycleResolution })
//
// defaultDispatcher.addPreviousValueFlag(StartVar)
// defaultDispatcher.addPreviousValueFlag(EndVar)
// defaultDispatcher.addPreviousValueFlag(DurationVar)
//
// class Event extends Entity.mix(Base) {
//     @field()
//     start       : number
//
//     @field()
//     end         : number
//
//     @field()
//     duration    : number
//
//     @field({ equality : dispatcherEq })
//     dispatcher  : CycleDispatcher
//
//
//     setStart : (value : number, instruction : Instruction) => any
//     setEnd : (value : number, instruction : Instruction) => any
//     setDuration : (value : number, instruction : Instruction) => any
//
//
//     @calculate('start')
//     calculateStart (Y) : number {
//         const dispatch : CycleDispatcher = this.dispatcher
//
//         const instruction : FormulaId = dispatch.resolution.get(StartVar)
//
//         if (instruction === startFormula.formulaId) {
//             const endValue : number         = this.end
//             const durationValue : number    = this.duration
//
//             if (isNotNumber(endValue) || isNotNumber(durationValue)) return null
//
//             return endValue - durationValue
//         }
//         else if (instruction === CalculateProposed) {
//             return Y(ProposedOrPrevious)
//         }
//     }
//
//
//     @calculate('end')
//     calculateEnd (Y) : number {
//         const dispatch : CycleDispatcher = this.dispatcher
//
//         const instruction : FormulaId = dispatch.resolution.get(EndVar)
//
//         if (instruction === endFormula.formulaId) {
//             const startValue : number       = this.start
//             const durationValue : number    = this.duration
//
//             if (isNotNumber(startValue) || isNotNumber(durationValue)) return null
//
//             return startValue + durationValue
//         }
//         else if (instruction === CalculateProposed) {
//             return Y(ProposedOrPrevious)
//         }
//     }
//
//
//     @calculate('duration')
//     calculateDuration (Y) : number {
//         const dispatch : CycleDispatcher = this.dispatcher
//
//         const instruction : FormulaId = dispatch.resolution.get(DurationVar)
//
//         if (instruction === durationFormula.formulaId) {
//             const startValue : number       = this.start
//             const endValue : number         = this.end
//
//             if (isNotNumber(startValue) || isNotNumber(endValue)) return null
//
//             return endValue - startValue
//         }
//         else if (instruction === CalculateProposed) {
//             return Y(ProposedOrPrevious)
//         }
//     }
//
//
//     @build_proposed('dispatcher')
//     buildProposedDispatcher (me : Identifier, quark : Quark, transaction : Transaction) : CycleDispatcher {
//         return defaultDispatcher
//     }
//
//
//     @calculate('dispatcher')
//     calculateDispatcher (Y : SyncEffectHandler) : CycleDispatcher {
//         const proposedOrPrevious        = Y(ProposedOrPrevious)
//
//         const cycleDispatcher           = CycleDispatcher.new({ context : cycleResolution })
//
//         cycleDispatcher.collectInfo(Y, this.$.start, StartVar)
//         cycleDispatcher.collectInfo(Y, this.$.end, EndVar)
//         cycleDispatcher.collectInfo(Y, this.$.duration, DurationVar)
//
//         //---------------
//         const startProposedArgs         = Y(ProposedArgumentsOf(this.$.start))
//
//         const startInstruction : Instruction = startProposedArgs ? startProposedArgs[ 0 ] : undefined
//
//         if (startInstruction) cycleDispatcher.addInstruction(startInstruction)
//
//         //---------------
//         const endProposedArgs         = Y(ProposedArgumentsOf(this.$.end))
//
//         const endInstruction : Instruction = endProposedArgs ? endProposedArgs[ 0 ] : undefined
//
//         if (endInstruction) cycleDispatcher.addInstruction(endInstruction)
//
//         //---------------
//         const durationProposedArgs    = Y(ProposedArgumentsOf(this.$.duration))
//
//         const durationInstruction : Instruction = durationProposedArgs ? durationProposedArgs[ 0 ] : undefined
//
//         if (durationInstruction) cycleDispatcher.addInstruction(durationInstruction)
//
//         return cycleDispatcher
//     }
// }
//
//
// StartTest(t => {
//
//     let replica : Replica
//     let event : Event
//
//     let var0
//
//     const read = () => [ event.start, event.end, event.duration ]
//
//     t.beforeEach(t => {
//         replica = Replica.new()
//         event   = Event.new()
//
//         var0    = replica.variable(0)
//
//         replica.addEntity(event)
//     })
//
//
//     t.it('Should keep all-null state', async t => {
//         replica.commit()
//
//         t.isDeeply(read(), [ null, null, null ], 'Initial propagation is ok')
//     })
//
//
//     t.it('Should keep partial data - start', async t => {
//         event.start = 10
//
//         replica.commit()
//
//         t.isDeeply(read(), [ 10, null, null ], 'Initial propagation is ok')
//     })
//
//
//     t.it('Should keep partial data - end', async t => {
//         event.end = 10
//
//         replica.commit()
//
//         t.isDeeply(read(), [ null, 10, null ], 'Initial propagation is ok')
//     })
//
//
//     t.it('Should keep partial data - duration', async t => {
//         event.duration = 10
//
//         replica.commit()
//
//         t.isDeeply(read(), [ null, null, 10 ], 'Initial propagation is ok')
//     })
//
//
//     t.it('Should normalize end date', async t => {
//         event.start = 10
//         event.duration = 5
//
//         replica.commit()
//
//         t.isDeeply(read(), [ 10, 15, 5 ], 'Initial propagation is ok')
//     })
//
//
//     t.it('Should normalize duration', async t => {
//         event.start = 10
//         event.end = 15
//
//         replica.commit()
//
//         t.isDeeply(read(), [ 10, 15, 5 ], 'Initial propagation is ok')
//     })
//
//
//     t.it('Should normalize start and recalculate everything after', async t => {
//         const spyDispatcher     = t.spyOn(event.$.dispatcher, 'calculation')
//         const spyStart          = t.spyOn(event.$.start, 'calculation')
//         const spyEnd            = t.spyOn(event.$.end, 'calculation')
//         const spyDuration       = t.spyOn(event.$.duration, 'calculation')
//
//         event.end = 15
//         event.duration = 5
//
//         replica.commit()
//
//         t.isDeeply(read(), [ 10, 15, 5 ], 'Initial propagation is ok')
//
//         // 1st time calculation is done during the propagate - 2nd during read
//         t.expect(spyDispatcher).toHaveBeenCalled(1)
//         t.expect(spyStart).toHaveBeenCalled(1)
//         t.expect(spyEnd).toHaveBeenCalled(1)
//         t.expect(spyDuration).toHaveBeenCalled(1)
//
//         //----------------
//         // tslint:disable-next-line
//         ;[ spyDispatcher, spyStart, spyEnd, spyDuration ].forEach(spy => spy.reset())
//
//         replica.write(var0, 1)
//
//         replica.commit()
//
//         // no calculations during the propagate, as those were already done during the read
//         t.expect(spyDispatcher).toHaveBeenCalled(1)
//         t.expect(spyStart).toHaveBeenCalled(1)
//         t.expect(spyEnd).toHaveBeenCalled(1)
//         t.expect(spyDuration).toHaveBeenCalled(1)
//     })
//
//
//     t.it('Should normalize end date by default', async t => {
//         event.start = 10
//         event.end = 18
//         event.duration = 5
//
//         replica.commit()
//
//         t.isDeeply(read(), [ 10, 15, 5 ], 'Initial propagation is ok')
//     })
//
//
//     t.it('Should not recalculate everything on 2nd propagation', async t => {
//         const spy           = t.spyOn(event.$.dispatcher, 'calculation')
//
//         event.start = 10
//         event.end = 18
//         event.duration = 5
//
//         replica.commit()
//
//         t.isDeeply(read(), [ 10, 15, 5 ], 'Initial propagation is ok')
//
//         t.expect(spy).toHaveBeenCalled(1)
//
//         //----------------
//         spy.reset()
//
//         replica.write(var0, 1)
//
//         replica.commit()
//
//         t.expect(spy).toHaveBeenCalled(0)
//     })
//
//
//     t.it('Should rebuild edges dynamically', async t => {
//         event.start = 10
//         event.duration = 5
//
//         replica.commit()
//
//         t.isDeeply(read(), [ 10, 15, 5 ], 'Initial propagation is ok')
//
//         //-----------------------
//         await event.setDuration(1, Instruction.KeepEnd)
//
//         replica.commit()
//
//         t.isDeeply(read(), [ 14, 15, 1 ], 'Edges rebuilt correctly')
//
//         //-----------------------
//         await event.setDuration(3, Instruction.KeepStart)
//
//         replica.commit()
//
//         t.isDeeply(read(), [ 14, 17, 3 ], 'Edges rebuilt correctly')
//
//         //-----------------------
//         await event.setStart(5, Instruction.KeepDuration)
//
//         replica.commit()
//
//         t.isDeeply(read(), [ 5, 8, 3 ], 'Edges rebuilt correctly')
//     })
// })
