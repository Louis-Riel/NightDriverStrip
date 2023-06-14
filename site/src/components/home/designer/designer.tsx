import { Box, Typography, ClickAwayListener, TextField, Card, CardHeader, IconButton, Icon, CardContent, LinearProgress, CardActions, List, Button, Skeleton } from "@mui/material";
import { useState, useEffect } from "react";
import { eventManager } from "../../../services/eventManager/eventmanager";
import { Effect } from "./effect/effect";
import { IEffect, IEffects } from '../../../models/config/nightdriver/effects';
import { INightDriverConfiguration } from '../../../models/config/nightdriver/nightdriver';
import { withStyles } from 'tss-react/mui';
import { designerStyle } from "./style";
import { Esp32Service } from "../../../services/esp32/esp32";

interface IDesignerPanelProps {
    open: boolean;
    displayMode: string;
    classes?: any;
}

export const DesignerPanel = withStyles((props:IDesignerPanelProps) => {
    const { classes } = props;

    const [espService] = useState(Esp32Service(["INightDriverConfiguration","IEffects"]));
    const [chipConfig, setChipConfig] = useState(undefined as unknown as INightDriverConfiguration);
    const [ effects, setEffects ] = useState(undefined as unknown as IEffects);

    const [ effectInterval, setEffectInterval ] = useState(0);
    const [ effectTimeRemaining, setEffectTimeRemaining ] = useState(0);

    const [ nextRefreshDate, setNextRefreshDate] = useState(0);
    const [ editing, setEditing ] = useState(false);
    const [ hoverEffect, setHoverEffect ] = useState(undefined as unknown as IEffect);
    const [ displayMode, setDisplayMode ] = useState( props.displayMode );
    
    const [ detailMode ] = useState("list");
    const [ progress, setProgress ] = useState(0);
    

    useEffect(() => {
        if (effectTimeRemaining) {
            const timeReference = Date.now()+effectTimeRemaining;
            let timeRemaining = timeReference-Date.now();
            const timers = {
                    effectList: setInterval(()=>{
                    const remaining = timeReference-Date.now();
                    if (remaining >= 0) {
                        timeRemaining = remaining;
                        setProgress((1-timeRemaining/effects.effectInterval)*100.0);
                    }
                },300),
            };
            return ()=>Object.values(timers).forEach(clearInterval);
        }
    },[effectTimeRemaining]);

    useEffect(()=>{
        const subs = {
            chipConfig: espService.configStores.get("INightDriverConfiguration")?.subscribe({next:setChipConfig}),
            effects: espService.configStores.get("IEffects")?.subscribe({next:(ret)=>{
                if (ret) {
                    const effectList = ret as IEffects;
                    setEffects(effectList);
                    setEffectInterval(effectList.effectInterval);
                    setEffectTimeRemaining(effectList.millisecondsRemaining);
                }
            }}),
        }
        return ()=>Object.values(subs).forEach(sub=>sub?.unsubscribe());
    },[espService]);

    useEffect(() => {
        if (props.open) {
            const nextTick = effectTimeRemaining < 100 ? (effectTimeRemaining ? 300 : 3000) : (effectTimeRemaining+500) * 0.75;
            const timer = setTimeout(()=>{
                espService.refresh("IEffects");
                if (nextTick + nextRefreshDate <= Date.now()) {
                    setNextRefreshDate(Date.now());                    
                }
            },nextTick);

            return () => clearTimeout(timer);
        }
    },[props.open,nextRefreshDate,effectTimeRemaining,espService]);

    const displayHeader = ()=>{
        return effects?<Box className={classes.effectsHeaderValue}>
            <Typography variant="caption" color="textPrimary">Interval</Typography>:
            <Button color="secondary" onClick={() => setEditing(true)}>{effects.effectInterval}</Button>
        </Box>:<Skeleton variant="text" width={200}/>;
    };

    const editingHeader = ()=>{
        return <ClickAwayListener onClickAway={()=>{
                    espService.update("INightDriverConfiguration",{...chipConfig,effectInterval});
                    espService.refresh("INightDriverConfiguration");
                    setEditing(false);
                    }}>
                    <Box className={classes.effectsHeaderValue}>
                        <TextField label="Interval ms"
                            variant="outlined"
                            type="number"
                            defaultValue={effects.effectInterval}
                            onChange={event => setEffectInterval(parseInt(event.target.value))} />
                    </Box>
                </ClickAwayListener>;
    };

    if (!props.open){
        return <></>;
    }

    return <Card variant="outlined" className={displayMode === "detailed" ? classes.shownAll : classes.shownSome}>
        <CardHeader 
                action={effects?<IconButton aria-label="Next" onClick={()=>setDisplayMode(displayMode === "detailed" ? "summary":"detailed")}>
                        <Icon>{displayMode === "detailed" ? "expand_less":"expand_more"}</Icon></IconButton>:<Skeleton variant="circular" width={20} />}
                title={effects?.Effects?<Box>
                            {effects.Effects.length} effects
                            {displayMode==="detailed"?<IconButton aria-label="Previous" onClick={()=>espService.navigate(false)}><Icon>skip_previous</Icon></IconButton>:<></>}
                            {displayMode==="detailed"?<IconButton aria-label="Next" onClick={()=>espService.navigate(true)}><Icon>skip_next</Icon></IconButton>:<></>}
                            {displayMode==="detailed"?<IconButton aria-label="Refresh Effects" onClick={()=>espService.refresh("IEffects")}><Icon>refresh</Icon></IconButton>:<></>}
                       </Box>:<Box sx={{display:"flex", columnGap:1}}>
                            {[28,30,27].map(width => <Skeleton key={width} variant="circular" width={width}/>)}
                       </Box>} 
                subheader={editing?editingHeader():displayHeader()} />
        <CardContent sx={{padding:0}}>
            {effectSection()}
            {footer()}
        </CardContent>
        <LinearProgress className={classes.progress} variant="determinate" aria-label={`${Math.floor(progress)}%`} value={progress} />
        <CardActions disableSpacing>{effects?<Box>
            <IconButton aria-label="Previous" onClick={()=>espService.navigate(false)}><Icon>skip_previous</Icon></IconButton>
            <IconButton aria-label="Next" onClick={()=>espService.navigate(true)}><Icon>skip_next</Icon></IconButton>
            <IconButton aria-label="Refresh Effects" onClick={()=>espService.refresh("IEffects")}><Icon>refresh</Icon></IconButton>
        </Box>:<Box sx={{display:"flex", columnGap:1}}>
            <Skeleton variant="circular" width={20}/>
            <Skeleton variant="circular" width={20}/>
            <Skeleton variant="circular" width={20}/>
        </Box>}</CardActions>
    </Card>

    function footer() {
        if (displayMode === "summary")
            return (hoverEffect) ? 
                        <Typography variant="caption">{hoverEffect.name}</Typography> : 
                        <Typography variant="caption">{effects.Effects[effects.currentEffect].name}</Typography>;
    }

    function effectSection() {
        switch (detailMode) {
            case "tile":
                return tiles();
            case "list":
                return list();
            default:
                return <Typography>Site error, invalid detail mode:{detailMode}</Typography>
        }
    }

    function list() {
        return <List className={displayMode === "summary" ? classes.summaryEffects : classes.effects}>
                {effects?effects.Effects.map((effect, idx) => <Box 
                    key={`effect-${idx}`} 
                    onMouseEnter={() => { setHoverEffect(effect); } }
                    onMouseLeave={() => { setHoverEffect(undefined as unknown as IEffect); } }>
                <Effect
                    displayMode={displayMode}
                    index={idx}
                    effects={effects}
                    detailMode={detailMode}
                    effectInterval={effects.effectInterval}
                    selected={idx === effects.currentEffect}
                    millisecondsRemaining={effects.millisecondsRemaining} />
            </Box>):<Box sx={{padding:0}}>{[1,2,3,4].map(item=><Skeleton key={item} sx={{height:80}} />)}</Box>}
        </List>
    }

    function tiles() {
        return effects?effects.Effects.map((effect, idx) => <Box key={`effect-${idx}`} onMouseEnter={() => { setHoverEffect(effect); } }
            onMouseLeave={() => { setHoverEffect(undefined as unknown as IEffect); } }>
            <Effect
                displayMode={displayMode}
                detailMode={detailMode}
                key={idx}
                index={idx}
                effectInterval={effects.effectInterval}
                selected={idx === effects.currentEffect}
                millisecondsRemaining={effects.millisecondsRemaining} 
                effects={effects} />
        </Box>):<Skeleton/>;
    }
}, designerStyle);