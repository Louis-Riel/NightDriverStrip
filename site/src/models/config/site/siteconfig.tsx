export interface ITypedOption {
	name: string;
	typeName: string;
	value: string|number|boolean;
}

export interface ISiteOptions {
	[key:string]: ITypedOption;
}

export interface IEffectOptions {
	[key:string]: {
		[key:string]:ITypedOption;
	}
}