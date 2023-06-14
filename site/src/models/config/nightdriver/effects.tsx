import { IEffectOption } from "../site/siteconfig";

export interface IEffect {
	name: string;
	enabled: boolean;
	core: boolean;
}

export interface IEffects {
	currentEffect: number;
	millisecondsRemaining: number;
	effectInterval: number;
	Effects: IEffect[];
}

export interface IFullEffect extends IEffect {
	options: IEffectOptions;
} 

export interface IEffectOptions {
	[key:string]: IEffectOption;
}

export interface ISiteEffectOptions {
	[key:string]: IEffectOptions
}