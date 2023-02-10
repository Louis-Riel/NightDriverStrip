const DesignerPanel = withStyles(designStyle)(props => {
    const { classes, open, addNotification } = props;
    const [ effects, setEffects ] = useState(undefined);
    const [ effectRequests, setEffectRequests ] = useState(JSON.parse(localStorage.getItem("effects")) || []);
    const [ effectRequest, setEffectRequest ] = useState(undefined);
    const [ effectRequestIdx, setEffectRequestIdx ] = useState(undefined);
    const [ abortControler, setAbortControler ] = useState(undefined);
    const [ nextRefreshDate, setNextRefreshDate] = useState(undefined);
    const [ editing, setEditing ] = useState(false);
    const [ requestRunning, setRequestRunning ] = useState(false);
    const [ pendingInterval, setPendingInterval ] = useState(effects && effects.effectInterval);

    useEffect(() => {
        if (abortControler) {
            abortControler.abort();
        }

        if (open) {
            const aborter = new AbortController();
            setAbortControler(aborter);

            const timer = setTimeout(()=>{
                setNextRefreshDate(Date.now());
            },3000);
    
            chipRequest(`${httpPrefix !== undefined ? httpPrefix : ""}/getEffectList`,{signal:aborter.signal})
                .then(resp => resp.json())
                .then(effects => setEffects(effects))
                .catch(err => addNotification("Error","Service","Get Effect List",err))
                .finally(()=>clearTimeout(timer));
    
            return () => {
                abortControler && abortControler.abort();
                clearTimeout(timer);
            }
        }
    },[open,nextRefreshDate]);

    useEffect(() => {
        localStorage.setItem("effects",JSON.stringify(effectRequests));
        if (effectRequests.length) {
            chipRequest(`${httpPrefix !== undefined ? httpPrefix : ""}/setEffectList`,{
                body:JSON.stringify(effectRequests), 
                method:"POST",
                headers: {
                    'Content-Type': 'application/json'
                },
            }).catch(err => addNotification("Error","Service","Set Effect List",err))
              .finally(()=>setNextRefreshDate(Date.now()));
        }
    },[effectRequests])

    const requestRefresh = () => setTimeout(()=>setNextRefreshDate(Date.now()),50);

    const chipRequest = (url,options,operation) => 
        new Promise((resolve,reject) => 
            fetch(url,options)
                .then(resolve)
                .catch(err => {addNotification("Error",operation,err);reject(err)}));

    const navigateTo = (idx)=>{
        return new Promise((resolve,reject)=>{
            setRequestRunning(true);
            chipRequest(`${httpPrefix !== undefined ? httpPrefix : ""}/setCurrentEffectIndex?`,{method:"POST", body: new URLSearchParams({currentEffectIndex:idx})}, "navigateTo")
                .then(resolve)
                .then(requestRefresh)
                .catch(reject)
                .finally(()=>setRequestRunning(false));    
        });
    }

    const effectEnable = (idx,enable)=>{
        return new Promise((resolve,reject)=>{
            setRequestRunning(true);
            chipRequest(`${httpPrefix !== undefined ? httpPrefix : ""}/${enable?"enable":"disable"}Effect`,{method:"POST", body:new URLSearchParams({effectIndex:idx})},"effectEnable")
                .then(resolve)
                .then(requestRefresh)
                .catch(reject)
                .finally(()=>setRequestRunning(false));    
        });
    }

    const navigate = (up)=>{
        return new Promise((resolve,reject)=>{
            setRequestRunning(true);
            chipRequest(`${httpPrefix !== undefined ? httpPrefix : ""}/${up ? "nextEffect" : "previousEffect"}`,{method:"POST"},"nvigate")
                .then(resolve)
                .then(requestRefresh)
                .catch(reject)
                .finally(()=>setRequestRunning(false));    
        });
    }

    const updateEventInterval = (interval)=>{
        return new Promise((resolve,reject)=>{
            setRequestRunning(true);
            chipRequest(`${httpPrefix !== undefined ? httpPrefix : ""}/settings`,
            {
                method:"POST",
                body: new URLSearchParams({effectInterval:interval})
            },"updateEventInterval").then(resolve)
              .then(requestRefresh)
              .catch(reject)
              .finally(()=>setRequestRunning(false));    
        });
    }

    const displayHeader = ()=>{
        return <Box className={classes.effectsHeaderValue}>
            <Typography variant="little" color="textPrimary">Interval</Typography>:
            <Link href="#" variant="little" color="textSecondary" onClick={() => setEditing(true)}>{effects.effectInterval}</Link>
        </Box>;
    }

    const editingHeader = ()=>{
        return <ClickAwayListener onClickAway={()=>{updateEventInterval(pendingInterval);setEditing(false);}}>
            <Box className={classes.effectsHeaderValue}>
            <TextField label="Interval ms"
                variant="outlined"
                type="number"
                defaultValue={effects.effectInterval}
                onChange={event => setPendingInterval(event.target.value)} />
        </Box></ClickAwayListener>;
    }

    if (!effects && open){
        return <Box>Loading....</Box>;
    }

    return effects && <Box className={`${classes.root} ${!open && classes.hidden}`}>
        <Box className={classes.effectsHeader}>
            {editing ? 
            editingHeader():
            displayHeader()}
            <Countdown 
                label="Time Remaining"
                requestRefresh={requestRefresh}
                millisecondsRemaining={effects.millisecondsRemaining}/>
            <Box>
                {effects.Effects && <IconButton disabled={requestRunning} onClick={()=>navigate(false)}><Icon>skip_previous</Icon></IconButton>}
                {effects.Effects && <IconButton disabled={requestRunning} onClick={()=>navigate(true)}><Icon>skip_next</Icon></IconButton>}
                <IconButton disabled={requestRunning} onClick={()=>setNextRefreshDate(Date.now())}><Icon>refresh</Icon></IconButton>
                <IconButton onClick={()=>{
                    setEffectRequest({});
                    setEffectRequestIdx(undefined);
                }}><Icon>add</Icon></IconButton>
                <EffectBuilder 
                        effectRequest={effectRequest} 
                        setEffectRequest={setEffectRequest}
                        onSave={()=>{
                            if (effectRequestIdx !== undefined) {
                                setEffectRequests(prevVal => prevVal.map((val,idx)=>idx === effectRequestIdx ? effectRequest : val) );
                                setEffectRequestIdx(undefined);
                            } else {
                                setEffectRequests(prevVal => [...prevVal,effectRequest] );
                            }
                            setEffectRequest(undefined);
                        }}
                        onClose={()=>{
                            setEffectRequest(undefined);
                            setEffectRequestIdx(undefined);
                        }}/>
            </Box>
        </Box>
        <Box className={classes.effects}>
            {effects.Effects && effects.Effects.map((effect,idx) => <Effect 
                                                    key={`effect-${idx}`}
                                                    effect={effect} 
                                                    effectIndex={idx}
                                                    launchEditor={()=>{
                                                        setEffectRequest(effectRequests[idx]);
                                                        setEffectRequestIdx(idx);
                                                    }}
                                                    onDelete={()=>setEffectRequests(prevVal=>prevVal.filter((_val,idx2)=>idx !== idx2))}
                                                    navigateTo={navigateTo}
                                                    requestRunning={requestRunning}
                                                    effectEnable={effectEnable}
                                                    effectInterval={effects.effectInterval}
                                                    selected={idx === effects.currentEffect}
                                                    millisecondsRemaining={effects.millisecondsRemaining}/>)}
        </Box>
    </Box>
});