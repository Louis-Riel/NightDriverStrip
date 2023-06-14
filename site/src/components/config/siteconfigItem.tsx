import { ListItem, FormControlLabel, Typography, Checkbox, ClickAwayListener, ListItemText, TextField, ListItemButton, Skeleton } from "@mui/material";
import { useState, useEffect } from "react";
import { eventManager } from "../../services/eventManager/eventmanager";
import { IEffectSettings } from "../../models/config/site/siteconfig";

interface ISiteConfigItemProps { 
    name:string;
    value:string|number|boolean;
    typeName:string;
    id:string;
}

export function SiteConfigItem({ name, value, typeName, id }:ISiteConfigItemProps){
    const [ service ] = useState(eventManager());
    const [ siteConfig, setSiteConfig] = useState(undefined as unknown as IEffectSettings);
  
    const [ editing, setEditing] = useState(false);
    const [ configValue, setConfigValue] = useState(value);
    const getConfigValue = (value, dataType) => {
        switch (dataType) {
            case "PositiveBigInteger":
            case "int":
                return parseInt(value);
            case "float":
                return parseFloat(value);
            default:
                return value;
        }
    };
    useEffect(()=>{

        !editing && service.getPropertyStore("IEffectSettings")?.next({...siteConfig,[name]:configValue})
        service.emit("SetSiteConfigItem",{value:configValue, id})},[configValue,editing]);

    useEffect(()=>{
        const subs = {
          siteConfig: service.getPropertyStore("IEffectSettings")?.subscribe({next:ccs=>setSiteConfig(ccs as IEffectSettings)}),
        }
        return ()=>{Object.values(subs).forEach(service.unsubscribe)};
      },[service]);
    
    if (typeName === undefined) {
        return <Skeleton/>;
    }
    if (typeName.toLowerCase() === "boolean") {
        return <ListItemButton  onClick={_evt=>setEditing(false)}>
            <FormControlLabel
                sx={{ marginLeft: "0px" }}
                label={<Typography variant="caption">{name}</Typography>} 
                labelPlacement="start"
                control={<Checkbox 
                    defaultChecked={value as boolean}
                    onChange={event => setConfigValue(event.target.checked)}/>} />
        </ListItemButton>;
    }

    return <ClickAwayListener onClickAway={()=>{value !== getConfigValue(configValue,typeName) && setEditing(false)}}>
                <ListItemButton onClick={_evt=>!editing && setEditing(!editing)}>
                    {!editing && <ListItemText
                        primary={name}
                        secondary={value.toString()}/>}
                    {editing && <TextField label={name} 
                                        variant="outlined"
                                        type={["int","float","PositiveBigInteger"].includes(typeName) ? "number" : "text"}
                                        defaultValue={value}
                                        onChange={event => setConfigValue(getConfigValue(event.target.value,typeName)) } />}
                </ListItemButton>
            </ClickAwayListener>;
}
