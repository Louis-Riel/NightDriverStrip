export interface IEffectOption {
	name: string;
	typeName: string;
	value: string|number|boolean;
}

export interface IEffectSettings {
	[key:string]: IEffectOption;
}