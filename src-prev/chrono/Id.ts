//---------------------------------------------------------------------------------------------------------------------
export type ChronoId        = string | number

let ATOM_ID : number = 1

export const chronoId = () : ChronoId => 'chrono' + <ChronoId>(ATOM_ID++ as unknown)


// //---------------------------------------------------------------------------------------------------------------------
// export type ChronoNamespace = string
//
// export function namespacedId (ns : ChronoNamespace, id : ChronoId) : ChronoId
// export function namespacedId (ns : ChronoNamespace) : ChronoId
// export function namespacedId (...args : any[]) : ChronoId {
//     const [ ns, id ] = args
//
//     if (args.length === 1) {
//
//         return `/${ns}/${chronoId()}`
//
//     } else if (args.length === 2) {
//
//         return `/${ns}/${id}`
//
//     } else
//         throw new Error("Invalid call signature")
// }
//


