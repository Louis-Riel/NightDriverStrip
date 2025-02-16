import { Typography, ListItem, Paper, Box, Checkbox, CircularProgress, IconButton, Icon, Dialog, DialogTitle, DialogContent, DialogContentText, TextField, DialogActions, Button, Card, CardHeader, Avatar, CardContent, Skeleton } from "@mui/material";
import { useState, useEffect, useMemo } from "react";
import { withStyles } from "tss-react/mui";
import { IEffects, IEffect } from '../../../../models/config/nightdriver/effects';
import { effectStyle } from "./style";
import { Esp32Service } from "../../../../services/esp32/esp32";
import { ITypedOption, IEffectOptions } from '../../../../models/config/site/siteconfig';
import { EffectConfigManager } from "../../../../services/siteconfig/siteconfig";

interface IEffectProps {
    index: number;
    effects: IEffects;
    effectInterval:number;
    millisecondsRemaining: number;
    selected: boolean;
    displayMode: string;
    detailMode: string;
    classes?:any;
}

interface IFullEffect extends IEffect {
    options: {[key:string]: ITypedOption},
}

export const Effect = withStyles(({ effectInterval, millisecondsRemaining, selected, displayMode, detailMode, index, effects, classes }:IEffectProps)=>{
    const [espService] = useState(Esp32Service(["IEffects","IESPState"]));
    const [effectOptionStore] = useState(EffectConfigManager());

    const [ progress, setProgress ] = useState(0);
    const [ effectSettings, setEffectSettings] = useState(undefined as unknown as IEffectOptions);
    const [ dopen, setDOpen ] = useState(false);
    
    const effect = useMemo(()=>effects.Effects[index],[index,...effects.Effects])
    
    const defaultConfig={ 
        "Effect Image":{
            name: "Effect Image",
            typeName: "url",
            value: "./favicon.ico"
        } as ITypedOption};

    useEffect(()=>{effectOptionStore.subscribe({next:setEffectSettings})},[effectOptionStore]);

    const getEffectName = () => {
        let dups = effects.Effects.map((eff,idx)=>{return{idx,match:eff.name === effects.Effects[index].name}})
                                  .filter(matches=>matches.match);
        if (dups.length > 1) {
            return `${effect.name}_${dups.findIndex(match=>match.idx === index)+1}`
        }
        return effect.name;
    };

    const fullEffect:IFullEffect = useMemo(()=>{
        const effectName = getEffectName();
        if (effectSettings) {
            return (effectSettings[effectName]) ? {...effect,options:effectSettings[effectName]} as IFullEffect : 
            {...effect,options:defaultConfig} as IFullEffect;
        } else {
            return {...effect} as IFullEffect;
        }
    },[index,...effects.Effects,effectSettings]);

    const [options, setOptions] = useState(fullEffect.options);

    useEffect(() => {
        if (millisecondsRemaining && selected) {
            const timeReference = Date.now()+millisecondsRemaining;
            let timeRemaining = timeReference-Date.now();
            const interval = setInterval(()=>{
                const remaining = timeReference-Date.now();
                if (remaining >= 0) {
                    timeRemaining = remaining;
                    setProgress((timeRemaining/effectInterval)*100.0);
                }
            },300);
            return ()=>clearInterval(interval);
        }
        if (!selected) {
            setProgress(99);
        }
    },[millisecondsRemaining,selected]);

    if (!fullEffect) {
        return <Typography><Skeleton/></Typography>
    }

    switch (displayMode) {
        case "summary":
            return summary();
        case "detailed":
            return detailed();
    
        default:
            return <Typography>Site error, invalid display mode {displayMode}</Typography>;
    }

    function detailed() {
        switch (detailMode) {
            case "list":
                return detailedList();
            case "tile":
                return detailedTile();
            default:
                return <Typography>Site error, invalid {detailMode}</Typography>;
        }
    }

    function detailedList() {
        return <ListItem className={`${classes.effectline} ${effect.enabled ? "" : classes.disabled}`}>
            <Paper className={classes.effectline}>
                <Box className={`${selected ? classes.activelightbar : classes.lightbar}`}></Box>
                {fullEffect.options?getEffectOptionDialog():<></>}
                {selected?<Box className={classes.line}>
                    <Box className={classes.effectName}>
                        <Checkbox checked={fullEffect.enabled} onChange={(event)=>espService.toggleEffect(index,!event.target.checked)} />
                        {fullEffect.options?<img alt="Effect Tile" style={{height: 60}} src={fullEffect.options["Effect Image"].value as string}/>:<Skeleton/>}
                    </Box>
                    <Typography>{fullEffect.name}</Typography>
                    <Box>
                        <CircularProgress aria-label={`${Math.floor(progress)}%`} variant="determinate" value={progress} color="primary" />
                    </Box>
                </Box>:<Box className={classes.line}>
                    <Box  className={classes.effectDetail}>
                        <Checkbox checked={fullEffect.enabled} onChange={(event)=>espService.toggleEffect(index,!event.target.checked)} />
                        <Box className={classes.effectName}>
                            {fullEffect.options?<img alt="Effect Tile" style={{height: 60}} src={fullEffect.options["Effect Image"].value as string}/>:<Skeleton/>}
                            <Typography>{fullEffect.name}</Typography>
                            <IconButton aria-label="Effect Setting" onClick={()=>setDOpen(true)}><Icon>settings</Icon></IconButton>
                        </Box>
                    </Box>
                    <Box className={classes.listButtons}>
                        {!selected && fullEffect.enabled && <IconButton aria-label="Select Effect" color="secondary" onClick={() => espService.navigateTo(index)}><Icon>play_circle_outline</Icon></IconButton>}
                        {selected && <CircularProgress aria-label={`${Math.floor(progress)}`} variant="determinate" value={progress} color="primary" />}
                    </Box>
                </Box>}
            </Paper>
        </ListItem>
    }

    function getEffectOptionDialog() {
        const save = () => {
            effectOptionStore.next({...effectOptionStore.value, [getEffectName()]:options});
            setDOpen(false);
        };
        return (
              <Dialog open={dopen} onClose={()=>setDOpen(false)} fullWidth>
                <DialogTitle>{fullEffect.name} Options</DialogTitle>
                <DialogContent>
                  <DialogContentText>
                    Display Options 
                  </DialogContentText>
                  {Object.entries(fullEffect.options).map(entry=>
                    <TextField
                        autoFocus
                        margin="dense"
                        id={entry[0]}
                        key={entry[0]}
                        label={entry[0]}
                        type={entry[1].typeName}
                        defaultValue={entry[1].value}
                        fullWidth
                        variant="standard"
                        onChange={evt=>setOptions(prev=>{return{...prev,[entry[0]]:{...entry[1],value:evt.target.value}}})}
                    />)}
                </DialogContent>
                <DialogActions>
                  <Button onClick={()=>setDOpen(false)}>Cancel</Button>
                  <Button onClick={save}>Save</Button>
                </DialogActions>
              </Dialog>
          );      
    }

    function detailedTile() {
        return <Card variant="outlined">
            <CardHeader
                avatar={<Avatar aria-label={fullEffect.name}>
                    {fullEffect.name[0]}
                </Avatar>}
                title={fullEffect.name}
                subheader={fullEffect.enabled ? (selected ? "Active" : "") : "Disabled"}
                className={classes.cardheader}/>
            <CardContent className={classes.cardcontent}>
                {selected &&
                    <div className={classes.circularProgress}>
                        <CircularProgress aria-label={`${Math.floor(progress)}$`} variant="determinate" value={progress} color="primary" />
                        <Typography className={classes.circularProgressText} color="textSecondary" variant="caption">{Math.floor(progress)}</Typography>
                    </div>}
                {!selected && <IconButton aria-label="Toggle Effect" color="secondary" onClick={() => espService.toggleEffect(index,!fullEffect.enabled)}>{<Icon>{fullEffect.enabled ? "block" : "add_alarm"}</Icon>}</IconButton>}
                {!selected && fullEffect.enabled && <IconButton aria-label="Select Effect" color="secondary" onClick={() => espService.navigateTo(index)}><Icon>play_circle_outline</Icon></IconButton>}
            </CardContent>
        </Card>;
    }

    function summary() {
        return <div className={`${classes.dot} ${selected ? classes.selected : classes.waiting}`}
                    onClick={() => espService.navigateTo(index)} />;
    }
}, effectStyle);