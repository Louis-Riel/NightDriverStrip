import { List, ListItem, ListItemText, Typography, Divider, Box, Skeleton } from "@mui/material";
import { useState, useEffect } from "react";
import { eventManager } from "../../services/eventManager/eventmanager";
import { ChipConfigItem } from "./chipconfigItem";
import { SiteConfigItem } from "./siteconfigItem";
import { INightDriverConfiguration, INightDriverConfigurationSpecs } from '../../models/config/nightdriver/nightdriver';
import { withStyles } from 'tss-react/mui';
import { configStyle } from "./style";
import { IEffectSettings } from '../../models/config/site/siteconfig';

interface IConfigPanelProps {
  classes?: any;
}

export const ConfigPanel = withStyles(({classes}:IConfigPanelProps) => {
  const [chipConfig, setChipConfig] = useState(undefined as unknown as INightDriverConfiguration);
  
  const [siteConfig, setSiteConfig] = useState(undefined as unknown as IEffectSettings);
  const [chipConfigSpec, setChipConfigSpec] = useState(undefined as unknown as INightDriverConfigurationSpecs[]);
  const [service] = useState(eventManager());

  useEffect(()=>{
    const subs = {
      chipConfig: service.getPropertyStore("INightDriverConfiguration")?.subscribe({next:(cfg)=>setChipConfig(cfg as INightDriverConfiguration)}),
      chipConfgSpec: service.getPropertyStore("INightDriverConfigurationSpecs")?.subscribe({next:ccs=>setChipConfigSpec(ccs as INightDriverConfigurationSpecs[])}),
      siteConfig: service.getPropertyStore("IEffectSettings")?.subscribe({next:ccs=>setSiteConfig(ccs as IEffectSettings)}),
    }
    return ()=>{Object.values(subs).forEach(service.unsubscribe)};
  },[service]);

  return (
    <List className={classes.configsection}>
      <ListItem className={classes.configsection}>
        <ListItemText><Typography variant="overline" color="textSecondary">NightDriver</Typography></ListItemText>
        <Divider />
        {chipConfig&&chipConfigSpec?Object.entries(chipConfig).map(entry => <ChipConfigItem 
                                        key={entry[0]}
                                        id={entry[0]}
                                        value={entry[1]}
                                        {...chipConfigSpec.find(cs=>cs.name===entry[0]) as INightDriverConfigurationSpecs}/>):<Box>
                                            <Skeleton variant="text"/>                
                                            <Skeleton variant="text"/>                
                                            <Skeleton variant="text"/>                
                                        </Box>}
      </ListItem>
      <ListItem className={classes.configsection}>
        <ListItemText><Typography variant="overline" color="textSecondary">Site</Typography></ListItemText>
        <Divider />
        {siteConfig?Object.entries(siteConfig).map(entry => <SiteConfigItem 
                                                                key={entry[0]}
                                                                id={entry[0]}
                                                                {...entry[1]}/>):<Box>
                                                                    <Skeleton variant="text"/>                
                                                                    <Skeleton variant="text"/>                
                                                                    <Skeleton variant="text"/>                
                                                                </Box>}
      </ListItem>
    </List>
  );
},configStyle);