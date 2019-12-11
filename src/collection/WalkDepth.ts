// export enum OnCycleAction {
//     Cancel  = "Cancel",
//     Resume  = "Resume"
// }
//
// export const VISITED_TOPOLOGICALLY      = -1
//
// export type VisitState = {
//     visitedAt       : number,
//     topoLevel       : number
// }
//
// export class WalkDepthState<Element> {
//     visited         : Map<Element, VisitState>      = new Map()
//
//     depth           : number                        = 0
//
//     isCyclic        : boolean                       = false
//
//     elementsByTopoLevel : Map<number, Element[]>    = new Map()
//
//     // dummy property to fix the leading * syntax error (on the next line)
//     semicolon
//
//
//     * walkDepth (iterator : Iterable<Element>) : Iterable<Element> {
//         const visited : Map<Element, VisitState>  = this.visited
//
//         for (const el of iterator) {
//             let visitInfo       = visited.get(el)
//
//             if (visitInfo && visitInfo.visitedAt == VISITED_TOPOLOGICALLY) {
//                 continue
//             }
//
//             if (visitInfo === undefined) {
//                 this.visited.set(el, visitInfo = { visitedAt : this.depth, topoLevel : 0 })
//
//                 this.depth++
//
//                 yield* this.walkDepth(this.next(el))
//
//                 this.depth--
//             }
//
//             if (visitInfo.visitedAt < this.depth) {
//                 if (this.onCycle(el) !== OnCycleAction.Resume) break
//             }
//
//             visitInfo.visitedAt = VISITED_TOPOLOGICALLY
//
//             yield el
//
//             let maxTopoLevel : number    = 0
//
//             for (const nextEl of this.next(el)) {
//                 const nextElVisit   = visited.get(nextEl)
//
//                 if (nextElVisit.topoLevel > maxTopoLevel) maxTopoLevel = nextElVisit.topoLevel
//             }
//
//             const topoLevel = visitInfo.topoLevel = maxTopoLevel + 1
//
//             let elementsAtLevel : Element[]     = this.elementsByTopoLevel.get(topoLevel)
//
//             if (!elementsAtLevel) {
//                 elementsAtLevel     = []
//
//                 this.elementsByTopoLevel.set(topoLevel, elementsAtLevel)
//             }
//
//             elementsAtLevel.push(el)
//         }
//     }
//
//
//     * next (el : Element) : Iterable<Element> {
//         throw new Error("Abstract method called")
//     }
//
//
//     onCycle (el : Element) : OnCycleAction {
//         this.isCyclic   = true
//
//         return OnCycleAction.Cancel
//     }
// }
