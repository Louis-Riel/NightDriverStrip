import { eventManager } from "../eventManager/eventmanager";
import { BehaviorSubject, Observable, Subject, catchError, from, map, mergeMap, of, retry, tap, timer } from 'rxjs';
import { IEffects } from '../../models/config/nightdriver/effects';
import { IESPState } from "../../models/stats/espstate";
import { safeJsonParse, ParseResult } from "../../utils/jsonparse";
import { INightDriverConfiguration, INightDriverConfigurationSpecs } from '../../models/config/nightdriver/nightdriver';
import { httpPrefix } from "../../espaddr";

export interface IEsp32Service {
    configStores:Map<string,Observable<any>>,
    refresh:(store:string)=>void,
    update:(store:string,value:any)=>void,
    navigate:(up:boolean)=>void,
    navigateTo:(index:number)=>void,
    toggleEffect:(index:number,state:boolean)=>void,
}

interface ITriggerableUrlStore {
    store: BehaviorSubject<any>,
    trigger:Subject<Date>,
    url: string,
    options:RequestInit,
    operation:string
}

const service = eventManager();
const activeHttpPrefix:string= httpPrefix;

function chipRequest(url:string,options:RequestInit,operation:string):Promise<Response> {
    return new Promise<Response>((resolve,_reject) => {
        const aborter = new AbortController();
        const timer = setTimeout(() => aborter.abort(), 3000);

        fetch(`${activeHttpPrefix !== "Current Device" ? activeHttpPrefix : ""}${url}`,{...options, signal: aborter.signal })
            .then(resolve)
            .catch((err)=>service.emit("Error",{level:"error",type:options.method ?? "GET",target:operation,notification:err}))
            .finally(()=>clearTimeout(timer));
    })
};

function chipJsonRequest<T>(url:string,options:RequestInit,operation:string,retryTime:number,trigger:Observable<any>): Observable<T>{
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


function getDeviceShortName():string {
    const ipAddrPattern = /(https?:\/\/)(([12]?\d{1,2}[.]){3}([12]?\d{1,2})).*/g
    if (activeHttpPrefix === "Current Device") {
        return "Esp32";
    } else {
        const res = ipAddrPattern.exec(activeHttpPrefix);
        return (res && (res[2] !== undefined)) ? res[2].toString():"";
    }
}

const storeUpdates= new Map<string,()=>void>();
let lastConfig = "";

const configStores = Array.from(new Map<string,ITriggerableUrlStore>([
    ["INightDriverConfiguration",{
        store: new BehaviorSubject<INightDriverConfiguration>(undefined as unknown as INightDriverConfiguration),
        trigger: new Subject<Date>(),
        url: "/settings",
        options: {method: "GET"},
        operation: "Get Chip Options"
    } as ITriggerableUrlStore],
    ["INightDriverConfigurationSpecs",{
        store: new BehaviorSubject<INightDriverConfigurationSpecs[]>(undefined as unknown as INightDriverConfigurationSpecs[]),
        trigger: new Subject<Date>(),
        url: "/settings/specs",
        options: {method: "GET"},
        operation: "Get Chip Option Specs"
    } as ITriggerableUrlStore],
    ["IEffects",{
        store: new BehaviorSubject<IEffects>(undefined as unknown as IEffects),
        trigger: new Subject<Date>(),
        url: "/effects",
        options: {method: "GET"},
        operation: "Get Effects"
    } as ITriggerableUrlStore],
    ["IESPState",{
        store: new BehaviorSubject<IESPState>(undefined as unknown as IESPState),
        trigger: new Subject<Date>(),
        url: "/statistics",
        options: {method: "GET"},
        operation: "Get Chip Statistics"
    } as ITriggerableUrlStore],
]).entries()).reduce((stores,store)=>{
    const storeName = store[0];
    const theStore = store[1];
    stores.set(storeName,service.setPropertyStore(storeName, theStore.store));
    storeUpdates.set(storeName,()=>{theStore.trigger.next(new Date())});

    switch (storeName) {
        case "INightDriverConfiguration":
            theStore.store.subscribe({next:(val:INightDriverConfiguration)=>{
                if ((val !== undefined) && 
                    (JSON.stringify(val) != lastConfig)) {
                    lastConfig = JSON.stringify(val);
                    const formData = new FormData();
                    Object.entries(val).forEach(entry=>formData.append(entry[0],entry[1]));
                    chipJsonRequest<INightDriverConfiguration>(`/settings`,{method: "POST", body:formData},"Set Chip Config",3000,of(0))
                                    .subscribe({next: theStore.store.next});
                }
            }});
        default:
            chipJsonRequest<any>(store[1].url,store[1].options,store[1].operation,3000,theStore.trigger)
                .subscribe({next: (val)=>theStore.store.next(val)});
            theStore.trigger.next(new Date());
            break;
    }
    return stores;
},new Map<string,BehaviorSubject<any>>());

export const Esp32Service = (storeNames:string[]):IEsp32Service => {

    return {
        configStores:new Map<string,Observable<any>>(Array.from(configStores.entries())
                                                          .filter(entry=>storeNames.includes(entry[0]))
                                                          .map(entry=>[entry[0],entry[1].asObservable()])),
        refresh: function (storeName: string):void  {
            if (storeNames.includes(storeName)) {
                storeUpdates.has(storeName)&&(storeUpdates.get(storeName)as ()=>void)();
            }
        },
        update: function (storeName: string,value:any): void {
            if (storeNames.includes(storeName)) {
                const theStore = configStores.get(storeName) as BehaviorSubject<INightDriverConfiguration>;
                switch (storeName) {
                    case "INightDriverConfiguration":
                    case "SiteSettings":
                            theStore.next(value);                       
                        break;

                    default:
                        break;
                }
            }
        },
        navigate:(up:boolean)=>{chipRequest(`/${up ? "nextEffect" : "previousEffect"}`,{method:"POST"},"navigate")
                                    .then(storeUpdates.get("IEffects")as ()=>void)
                                    .catch(console.error)},
        navigateTo:(index:number)=>{chipRequest(`/currentEffect`,
                        {method:"POST", body: new URLSearchParams({currentEffectIndex:`${index}`})},"navigateTo")
                                    .then(storeUpdates.get("IEffects")as ()=>void)
                                    .catch(console.error)},
        toggleEffect:(index:number,state:boolean)=>{chipRequest(`/${state?"disable":"enable"}Effect`,
                        {method:"POST", body:new URLSearchParams({effectIndex:`${index}`})},"effectEnable")
                                    .then(storeUpdates.get("IEffects")as ()=>void)
                                    .catch(console.error)},    
    };
}; 
