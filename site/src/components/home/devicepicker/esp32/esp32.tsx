import { Icon, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { eventManager } from "../../../../services/eventManager/eventmanager";
import { safeJsonParse, ParseResult } from '../../../../utils/jsonparse';
import { INightDriverConfiguration, INightDriverConfigurationSpecs } from '../../../../models/config/nightdriver/nightdriver';
import { IEffects } from "../../../../models/config/nightdriver/effects";
import { IESPState } from "../../../../models/stats/espstate";
import { withStyles } from 'tss-react/mui';
import { esp32Style } from "./style"
import { BehaviorSubject, Observable, catchError, from, map, mergeMap, of, retry, tap, timer } from 'rxjs';

interface IEsp32Props {
    activeHttpPrefix:string, 
    selected:boolean,
    classes?:any
}

export const Esp32 = withStyles(({activeHttpPrefix, selected, classes}:IEsp32Props) => {
    const [config, setConfig] = useState(undefined as unknown as INightDriverConfiguration);
    const [configSpec, setConfigSpec] = useState(undefined as unknown as INightDriverConfigurationSpecs[]);
    const [effects, setEffects ] = useState(undefined as unknown as IEffects);
    const [service] = useState(eventManager());
    const effectListRefresh = new BehaviorSubject(0);
    const statsRefresh = new BehaviorSubject(0);
    const newConfig = new BehaviorSubject(undefined as unknown as INightDriverConfiguration);

    const chipRequest = (url:string,options:RequestInit,operation:string):Promise<Response> =>
        new Promise<Response>((resolve,_reject) => {
            const aborter = new AbortController();
            const timer = setTimeout(() => aborter.abort(), 3000);

            fetch(`${activeHttpPrefix !== "Current Device" ? activeHttpPrefix : ""}${url}`,{...options, signal: aborter.signal })
                .then(resolve)
                .catch((err)=>service.emit("Error",{level:"error",type:options.method ?? "GET",target:operation,notification:err}))
                .finally(()=>clearTimeout(timer));
        });

    function chipJsonRequest<T>(url:string,options:RequestInit,operation:string,retryTime:number,trigger:Observable<any>):Observable<T>{
        return from(trigger).pipe(
            mergeMap(()=>chipRequest(url, options, operation)),
            mergeMap((res:Response) => res.text()),
            map(safeJsonParse<T>()),
            tap((res:ParseResult<T>) =>{throw new Error(res.error as string)}),
            catchError((err)=>{
                service.emit("Error",{level:"error",type:"JSON",target:operation,notification:err.message});
                return undefined as unknown as Observable<any>; //undefined means retry/., 
            }),
            retry({delay:(_err,_retryCount)=>timer(retryTime)})
        );
    }

    const prevSelected = useRef<boolean>(false);
    
    useEffect(() => {
        if (prevSelected.current != selected) {
            prevSelected.current = selected;
            if (selected) {
                let subs = {
                    configSub: chipJsonRequest<INightDriverConfiguration>(`/settings`,{method: "GET"},"Get Chip Setting",3000,of(0))
                                    .subscribe({next: setConfig}),
                    configSpecSub: chipJsonRequest<INightDriverConfigurationSpecs[]>(`/settings/specs`,{method: "GET"},"Get Chip Option Specs",3000,of(0))
                                    .subscribe({next: setConfigSpec}),
                    effectsSub: chipJsonRequest<IEffects>(`/effects`,{method: "GET"},"Get Effects",3000, effectListRefresh)
                                    .subscribe({next: setEffects}),
                    statusSub: chipJsonRequest<IESPState>(`/statistics`,{method: "GET"},"Update Stats",3000, statsRefresh)
                                    .subscribe({next: (effects)=>service.emit("statistics",effects)}),
                    configUpdate: newConfig.subscribe({next:(cfg)=>{
                        if (cfg) {
                            const formData = new FormData();
                            Object.entries(cfg).forEach(entry=>formData.append(entry[0],entry[1]));
                            chipJsonRequest<INightDriverConfiguration>(`/settings`,{method: "POST", body:formData},"Set Chip Config",3000,of(0))
                                .subscribe({next:setConfig});
                        }
                    }}),
                    effectRefresh: service.subscribe("refreshEffectList",effectListRefresh.next),
                    statsRefresh: service.subscribe("refreshStatistics",statsRefresh.next),
                    updateConfig: service.subscribe("SetChipConfig",newConfig.next),
                };

                return () => Object.values(subs).forEach(service.unsubscribe);
            }
        }
    }, [selected]);

    useEffect(() => {
        if (effects&&selected) {
            service.emit("effectList", effects);

            let subs = {
                subscribers: service.subscribe("subscription",sub=>{
                    service.emit("effectList",effects,sub.eventId);}),
                navigate: service.subscribe("navigate", (up)=> 
                    chipRequest(`/${up ? "nextEffect" : "previousEffect"}`,{method:"POST"},"navigate")
                        .then(()=>service.emit("refreshEffectList"))),
                navigateTo: service.subscribe("navigateTo", (index)=>
                    chipRequest(`/currentEffect`,
                        {method:"POST", body: new URLSearchParams({currentEffectIndex:index})},"navigateTo")
                        .then(()=>service.emit("refreshEffectList"))),
                toggleEffect: service.subscribe("toggleEffect", (effect) => 
                    chipRequest(`/${effect.enabled?"disable":"enable"}Effect`,
                        {method:"POST", body:new URLSearchParams({effectIndex:effects.Effects.findIndex(eff=>eff===effect).toString()})},"effectEnable")
                        .then(()=>service.emit("refreshEffectList"))),
            };
    
            return () => Object.values(subs).forEach(service.unsubscribe);
        }
    }, [effects, selected]);

    useEffect(() => {
        if (config&&selected) {
            service.emit("ChipConfig", config);
            const subscribers= service.subscribe("subscription",sub=>{service.emit("ChipConfig",config,sub.eventId)});
            return ()=>service.unsubscribe(subscribers);
        }
    }, [config,selected]);

    useEffect(() => {
        if(configSpec&&selected){
            service.emit("ChipConfigSpec", configSpec);
            const subscribers= service.subscribe("subscription",sub=>{service.emit("ChipConfigSpec",configSpec,sub.eventId)});
            return ()=>service.unsubscribe(subscribers);
        } 
    }, [configSpec,selected]);

    function getDeviceShortName():string {
        const ipAddrPattern = /(https?:\/\/)(([12]?\d{1,2}[.]){3}([12]?\d{1,2})).*/g
        if (activeHttpPrefix === "Current Device") {
            return "Esp32";
        } else {
            const res = ipAddrPattern.exec(activeHttpPrefix);
            return (res && (res[2] !== undefined)) ? res[2].toString():"";
        }
    }

    return <div className={classes.esp32}>
        {config ? <Icon className={classes.neticon}>settings_input_antenna</Icon> : <span/>}
        <Typography className={classes.name}>{getDeviceShortName()}</Typography>
    </div>;
},esp32Style); 
