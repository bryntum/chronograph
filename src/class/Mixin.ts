import { AnyFunction } from "typescript-mixin-class"

export * from 'typescript-mixin-class'
export { MixinCustom as Mixin } from 'typescript-mixin-class'

export type MixinType<T extends AnyFunction> = InstanceType<ReturnType<T>>
