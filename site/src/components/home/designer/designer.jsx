const DesignerPanel = withStyles(designStyle)(props => {
    const [chipConfig, setChipConfig] = useState();
    const [service] = useState(eventManager());

    const { classes, open } = props;
    const [ effects, setEffects ] = useState({});
    const [ nextRefreshDate, setNextRefreshDate] = useState();
    const [ editing, setEditing ] = useState(false);
    const [ effectInterval, setEffectInterval ] = useState(effects.effectInterval);
    const [ hoverEffect, setHoverEffect ] = useState(undefined);
    const [ displayMode, setDisplayMode ] = useState( props.displayMode );
    const [ detailMode ] = useState("list");
    const [ progress, setProgress ] = useState(0);
    

    useEffect(() => {
        if (effects.millisecondsRemaining) {
            const timeReference = Date.now()+effects.millisecondsRemaining;
            let timeRemaining = timeReference-Date.now();
            const interval = setInterval(()=>{
                const remaining = timeReference-Date.now();
                if (remaining >= 0) {
                    timeRemaining = remaining;
                    setProgress((1-timeRemaining/effects.effectInterval)*100.0);
                } else {
                    service.emit("refreshEffectList")
                }
            },300);
            return ()=>clearInterval(interval);
        }
    },[effects ? effects.millisecondsRemaining:0]);

    useEffect(() => {
        const subs={
            chipConfig:service.subscribe("ChipConfig",cfg=>{setChipConfig(cfg)}),
            effectsSub:service.subscribe("effectList",effectList=>{setEffects(effectList)}),
            screenSub:service.subscribe("effectList",effectList=>{setEffects(effectList)}),
        };
        
        return ()=>Object.values(subs).forEach(service.unsubscribe);
    }, [service]);

    useEffect(() => {
        if (open) {
            service.emit("refreshEffectList");
            const timer = setTimeout(()=>{
                setNextRefreshDate(Date.now());
            },3000);

            return () => clearTimeout(timer);
        }
    },[open,nextRefreshDate]);

    const displayHeader = ()=>{
        return <Box className={classes.effectsHeaderValue}>
            <Typography variant="little" color="textPrimary">Interval</Typography>:
            <Link href="#" variant="little" color="textSecondary" onClick={() => setEditing(true)}>{effects.effectInterval}</Link>
        </Box>;
    };

    const editingHeader = ()=>{
        return <ClickAwayListener onClickAway={()=>{
                    service.emit("SetChipConfig",{...chipConfig,effectInterval});
                    setEditing(false);
                    setEffects((prev=>{return {...prev,effectInterval}}));
                    setNextRefreshDate(Date.now());
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

    if (!effects && open){
        return <Box>Loading....</Box>;
    }

    return effects.Effects && 
    <Card variant="outlined" className={`${!open ? classes.hidden : displayMode === "detailed" ? classes.shownAll : classes.shownSome}`}>
        <CardHeader 
                action={<IconButton aria-label="Next" onClick={()=>setDisplayMode(displayMode === "detailed" ? "summary":"detailed")}>
                        <Icon>{displayMode === "detailed" ? "expand_less":"expand_more"}</Icon></IconButton>}
                title={<Box>
                            {effects.Effects.length} effects
                            {displayMode==="detailed"?<IconButton aria-label="Previous" onClick={()=>service.emit("navigate",false)}><Icon>skip_previous</Icon></IconButton>:null}
                            {displayMode==="detailed"?<IconButton aria-label="Next" onClick={()=>service.emit("navigate",true)}><Icon>skip_next</Icon></IconButton>:null}
                            {displayMode==="detailed"?<IconButton aria-label="Refresh Effects" onClick={()=>setNextRefreshDate(Date.now())}><Icon>refresh</Icon></IconButton>:null}
                       </Box>} 
                subheader={editing?editingHeader():displayHeader()} />
        <CardContent>
            {effectSection()}
            {footer()}
        </CardContent>
        <LinearProgress className={classes.progress} variant="determinate" aria-label={Math.floor(progress)} value={progress} />
        <CardActions disableSpacing>
            <IconButton aria-label="Previous" onClick={()=>service.emit("navigate",false)}><Icon>skip_previous</Icon></IconButton>
            <IconButton aria-label="Next" onClick={()=>service.emit("navigate",true)}><Icon>skip_next</Icon></IconButton>
            <IconButton aria-label="Refresh Effects" onClick={()=>setNextRefreshDate(Date.now())}><Icon>refresh</Icon></IconButton>
        </CardActions>
    </Card>

    function footer() {
        if (displayMode === "summary")
            return (hoverEffect) ? <Typography variant="tiny">{hoverEffect.name}</Typography> : <Typography variant="tiny">{effects.Effects[effects.currentEffect].name}</Typography>;
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
                {effects.Effects.map((effect, idx) => <Box key={`effect-${idx}`} onMouseEnter={() => { setHoverEffect(effect); } }
                onMouseLeave={() => { setHoverEffect(undefined); } }>
                <Effect
                    effect={effect}
                    displayMode={displayMode}
                    detailMode={detailMode}
                    effectInterval={effects.effectInterval}
                    selected={idx === effects.currentEffect}
                    millisecondsRemaining={effects.millisecondsRemaining} />
            </Box>)}
        </List>
    }

    function tiles() {
        return effects.Effects.map((effect, idx) => <Box key={`effect-${idx}`} onMouseEnter={() => { setHoverEffect(effect); } }
            onMouseLeave={() => { setHoverEffect(undefined); } }>
            <Effect
                effect={effect}
                displayMode={displayMode}
                detailMode={detailMode}
                effectInterval={effects.effectInterval}
                selected={idx === effects.currentEffect}
                millisecondsRemaining={effects.millisecondsRemaining} />
        </Box>);
    }
});