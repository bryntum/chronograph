export type RevisionId      = number

let ID : number = 1

export const revisionId = () : RevisionId => ID++

