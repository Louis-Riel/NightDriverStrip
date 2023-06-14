import { eventManager } from "../eventManager/eventmanager";
import { BehaviorSubject } from 'rxjs';
import { IEffectSettings } from '../../models/config/site/siteconfig';

const service = eventManager();
const defaultConfig={
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
} as IEffectSettings;
const siteOptionsStore:BehaviorSubject<IEffectSettings> = service.setPropertyStore("IEffectSettings",new BehaviorSubject<IEffectSettings>(window.sessionStorage.getItem("config")?JSON.parse(window.sessionStorage.getItem("config")??"") : defaultConfig));
const suby = siteOptionsStore.subscribe({next:(cfg:IEffectSettings)=>{
    if (cfg && (JSON.stringify(cfg) !== JSON.stringify(siteOptionsStore.value))) {
        Object.entries(cfg).forEach(entry=>siteOptionsStore.value[entry[0]] = entry[1])
        window.sessionStorage.setItem("config",JSON.stringify(siteOptionsStore.value));
        siteOptionsStore.next(siteOptionsStore.value);
    }
}});

export const SiteConfigManager = () => {
    return siteOptionsStore;
};
