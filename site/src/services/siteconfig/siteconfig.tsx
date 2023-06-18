import { eventManager } from "../eventManager/eventmanager";
import { BehaviorSubject } from 'rxjs';
import { IEffectOptions, ISiteOptions } from '../../models/config/site/siteconfig';

const service = eventManager();
const defaultConfig:ISiteOptions={
    statsRefreshRate: {
        name: "Refresh rate",
        typeName: "int",
        value: 3
    },
    statsAnimateChange: {
        name: "Animate chart",
        typeName: "boolean",
        value: false
    },
    maxSamples: {
        name: "Chart points",
        typeName: "int",
        value: 50
    },
    UIMode: {
        name: "UI Mode",
        typeName: "string",
        value: "dark"
    }
};

export enum StoreName {
    "siteconfig",
    "effectconfig"
}

const stores = {
    siteOptionsStore: service.setPropertyStore("SiteSettings",new BehaviorSubject<ISiteOptions>(window.sessionStorage.getItem("siteconfig")?JSON.parse(window.sessionStorage.getItem("siteconfig")??"{}") : defaultConfig)),
    effectOptionsStore: service.setPropertyStore("EffectSettings",new BehaviorSubject<IEffectOptions>(window.sessionStorage.getItem("effectconfig")?JSON.parse(window.sessionStorage.getItem("effectconfig")??"{}") : {}))
};
const subs = {
    siteconfig:stores.siteOptionsStore.subscribe({next:(cfg:ISiteOptions)=>window.sessionStorage.setItem("siteconfig",JSON.stringify(cfg))}),
    effectconfig:stores.effectOptionsStore.subscribe({next:(cfg:IEffectOptions)=>window.sessionStorage.setItem("effectconfig",JSON.stringify(cfg))})
};

export const SiteConfigManager = () => {
    return stores.siteOptionsStore;
};

export const EffectConfigManager = () => {
    return stores.effectOptionsStore;
};