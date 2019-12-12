// No exports from this module

//---------------------------------------------------------------------------------------------------------------------
type FilterFlags<Base, Condition> = {
    [Key in keyof Base] : Base[Key] extends Condition ? Key : never
}

type AllowedNames<Base, Condition> = FilterFlags<Base, Condition>[ keyof Base ]

export type OnlyPropertiesOfType<Base, Type> = Pick<Base, AllowedNames<Base, Type>>


//---------------------------------------------------------------------------------------------------------------------
type ReplaceTypeOfProperty<Type, Property extends keyof Type, NewPropertyType> =
    NewPropertyType extends Type[ Property ] ? Omit<Type, Property> & { [ P in Property ] : NewPropertyType } : never
