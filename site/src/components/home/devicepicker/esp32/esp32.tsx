import { Icon, Typography } from "@mui/material";
import { useEffect, useRef, useState } from 'react';
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
    const [stats, setStats ] = useState(undefined as unknown as IESPState);
    const [service] = useState(eventManager());
    const effectListRefresh = new BehaviorSubject(0);
    const statsRefresh = new BehaviorSubject(0);
    const [configStore, setConfigStore] = useState(undefined as unknown as BehaviorSubject<INightDriverConfiguration>);
    const [configSpecStore, setConfigSpecStore] = useState(undefined as unknown as BehaviorSubject<INightDriverConfigurationSpecs[]>);
    const [effectsStore, setEffectsStore] = useState(undefined as unknown as BehaviorSubject<IEffects>);
    const [statsStore, setStatsStore] = useState(undefined as unknown as BehaviorSubject<IESPState>);

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
            tap((res:ParseResult<T>) =>{if (res.hasError) throw new Error(res.error as string)}),
            map((res:ParseResult<T>)=>res.parsed as T),
            catchError((err)=>{
                service.emit("Error",{level:"error",type:"JSON",target:operation,notification:err.message});
                return undefined as unknown as Observable<any>; //undefined means retry/., 
            }),
            retry({delay:(_err,_retryCount)=>timer(retryTime)})
        );
    }

    const prevSelected = useRef<boolean>(false);

    useEffect(()=>{
        if (!configStore && (selected &&!prevSelected.current)) {
            setConfigStore(service.setPropertyStore("INightDriverConfiguration", new BehaviorSubject<INightDriverConfiguration>(undefined as unknown as INightDriverConfiguration)));
            setConfigSpecStore(service.setPropertyStore("INightDriverConfigurationSpecs", new BehaviorSubject<INightDriverConfigurationSpecs[]>(undefined as unknown as INightDriverConfigurationSpecs[])));
            setEffectsStore(service.setPropertyStore("IEffects", new BehaviorSubject<IEffects>(undefined as unknown as IEffects)));
            setStatsStore(service.setPropertyStore("IESPState", new BehaviorSubject<IESPState>(undefined as unknown as IESPState)));    
        }
        prevSelected.current=selected;  
    },[service,selected]);

    useEffect(() => {
        if (configSpecStore) {
            prevSelected.current=selected;  
            let subs = {
                configStoreSub: configSpecStore.subscribe({next:(val)=>{
                    if (val === undefined) {
                        chipJsonRequest<INightDriverConfiguration>(`/settings`,{method: "GET"},"Get Chip Option Specs",3000,of(0))
                                .subscribe({next: setConfig})
                    }
                }}),
                configSpecStoreSub: configSpecStore.subscribe({next:(val)=>{
                    if (val === undefined) {
                        chipJsonRequest<INightDriverConfigurationSpecs[]>(`/settings/specs`,{method: "GET"},"Get Chip Option Specs",3000,of(0))
                                .subscribe({next: setConfigSpec})
                    }
                }}),
                effectStoreSub: effectsStore.subscribe({next:(val)=>{
                    if (val === undefined) {
                        chipJsonRequest<IEffects>(`/effects`,{method: "GET"},"Get Effects",3000, effectListRefresh)
                                .subscribe({next: setEffects});
                    }
                }}),
                statStoreSub: statsStore.subscribe({next:(val)=>{
                    if (val === undefined) {
                        chipJsonRequest<IESPState>(`/statistics`,{method: "GET"},"Update Stats",3000, statsRefresh)
                                .subscribe({next: setStats})
                    }
                }}),
            };

            return () => Object.values(subs).forEach(service.unsubscribe);
        }
    }, [configSpecStore]);

    useEffect(() => {
        if (effects&&selected) {
            effectsStore.next(effects);
            let subs = {
                updateConfig: service.subscribe("SetChipConfig", (cfg:INightDriverConfiguration)=> {
                    const formData = new FormData();
                    Object.entries(cfg).forEach(entry=>formData.append(entry[0],entry[1]));
                    chipJsonRequest(`/settings`,{method: "POST", body:formData},"Set Chip Config",3000,of(0))
                        .subscribe({next:cfg=>setConfig(cfg as INightDriverConfiguration)})
                }),
                navigate: service.subscribe("navigate", (up)=> 
                    chipRequest(`/${up ? "nextEffect" : "previousEffect"}`,{method:"POST"},"navigate")
                        .then(()=>effectsStore.next(undefined as unknown as IEffects))),
                navigateTo: service.subscribe("navigateTo", (index)=>
                    chipRequest(`/currentEffect`,
                        {method:"POST", body: new URLSearchParams({currentEffectIndex:index})},"navigateTo")
                        .then(()=>effectsStore.next(undefined as unknown as IEffects))),
                toggleEffect: service.subscribe("toggleEffect", (effect) => 
                    chipRequest(`/${effect.enabled?"disable":"enable"}Effect`,
                        {method:"POST", body:new URLSearchParams({effectIndex:effects.Effects.findIndex(eff=>eff===effect).toString()})},"effectEnable")
                        .then(()=>effectsStore.next(undefined as unknown as IEffects))),
            };
    
            return () => Object.values(subs).forEach(service.unsubscribe);
        }
    }, [effects, selected]);

    useEffect(() => {
        if (stats&&selected) {
            statsStore.next(stats);
        }
    }, [stats, selected]);

    useEffect(() => {
        if (config&&selected) {
            configStore.next(config);
        }
    }, [config, selected]);

    useEffect(() => {
        if (configSpec&&selected) {
            configSpecStore.next(configSpec);
        }
    }, [configSpec, selected]);

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
