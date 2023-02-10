const EffectBuilder = withStyles(effectBuilderStyle)(props => {
    const { classes, effectRequest, setEffectRequest, onSave, onClose } = props;

    const EffectSelect= (effectRequest, setEffectRequest) => {
        return ( 
        <FormControl>
            <InputLabel id="effect_function_label">Effect</InputLabel>
            <Select
                labelId="effect_function_label"
                value={effectRequest.function}
                label="Effect"
                onChange={event => setEffectRequest(prevVal => { return { ...prevVal, "function": event.target.value }; })}
                >
                <MenuItem value=""><em>None</em></MenuItem>
                <MenuItem value="RainbowFillEffect">Rainbow Fill</MenuItem>
                <MenuItem value="LanternEffect">Lantern</MenuItem>
                <MenuItem value="PaletteEffect">Palette</MenuItem>
            </Select>
            <FormHelperText>Effect Name</FormHelperText>
        </FormControl>);
    };

    const EffectParameters= (effectRequest, setEffectRequest) => {
        var params = undefined;
        if (effectRequest.function == "RainbowFillEffect") {
            params = {
                speedDivisor: {type: "float",default: 6.0},
                deltaHue: {type: "int",default: 2},
            }
        }
        if (effectRequest.function == "PaletteEffect") {
            params = {
                palette: {type: "select",default: "OceanColors",values:[
                    "RainbowColors",
                    "CloudColors",
                    "LavaColors",
                    "OceanColors",
                    "ForestColors",
                    "RainbowStripeColors",
                    "PartyColors",
                    "HeatColors",
                    "RainbowGradiant",
                ]},
                speedDivisor: {type: "float",default: 6.0},
                density: {type: "float",default: 1.0},                
                paletteSpeed: {type: "float",default: 1.0}, 
                ledsPerSecond: {type: "float",default: 1.0}, 
                lightSize: {type: "float",default: 1.0}, 
                gapSize: {type: "float",default: 1.0},
                blend: {type: "bool",default: true}, 
                bErase: {type: "bool",default: true},
                brightness: {type: "float",default: 1.0},
                deltaHue: {type: "int",default: 2},
            }
        }
        if (!params) {
            return null;
        }
        return (
        <List className={classes.parameters}>
            {
                Object.entries(params).map(param => 
                <ListItem
                    key={param[0]}>
                    {["int","float","string"].includes(param[1].type) && 
                           <TextField label={param[0]} 
                                      variant="outlined"
                                      type={["int","float"].includes(param[1].type) ? "number" : "text"}
                                      pattern={param[1].type === "int" ? "^[0-9]+$" : (param[1].type === "float" ? "^[0-9]+[.0-9]*$" : ".*")}
                                      defaultValue={effectRequest.params && effectRequest.params[param[0]] || param[1].default}
                                      onChange={event => setEffectRequest(prevVal => { return { ...prevVal, "params": {...prevVal.params, [param[0]]:getValue(event.target.value,param[1].type)} }; })}/>}
                    {["bool"].includes(param[1].type) && 
                            <FormControlLabel
                                label={param[0]} 
                                labelPlacement="top"
                                control={<Checkbox 
                                    label={param[0]}
                                    defaultChecked={effectRequest.params && effectRequest.params[param[0]] || param[1].default}
                                    onChange={event => setEffectRequest(prevVal => { return { ...prevVal, "params": {...prevVal.params, [param[0]]:event.target.checked} }; })}/>} />}
                    {["select"].includes(param[1].type) && 
                            <FormControlLabel
                            label={param[0]} 
                            labelPlacement="top"
                            control={<Select
                                value={effectRequest.params && effectRequest.params[param[0]] || param[1].default}
                                label={param[0]}
                                onChange={event => setEffectRequest(prevVal => { return { ...prevVal, "params": {...prevVal.params, [param[0]]:getValue(event.target.value,param[1].type)} }; })}>
                                {param[1].values.map(val=><MenuItem value={val}>{val}</MenuItem>)}
                            </Select>}/>}
                </ListItem>)
            }
        </List>);
    };

    const getValue = (value,type) => {
        switch (type) {
            case "int":
                return parseInt(value);
            case "float":
                return parseFloat(value);
        
            default:
                return value;
        }
    }

    return effectRequest && <Modal
            open={true}
            onClose={onClose}>
        <Card variant="outlined" className={classes.root}>
            <CardHeader
                avatar={<Avatar aria-label={effectRequest.function}>
                            {effectRequest.function && effectRequest.function[0] || 'E'}
                        </Avatar>}
                title={effectRequest.function || "Effect"}
                subheader={effectRequest.function ? "" : "Select an effect"}
            /> 
            <CardContent className={classes.effectRequest}>
                {EffectSelect(effectRequest, setEffectRequest)}
                {EffectParameters(effectRequest, setEffectRequest)}
            </CardContent>
            <CardActions disableSpacing>
                <IconButton
                    onClick={()=>onSave()}
                    aria-label="show more">
                    <Icon>save</Icon>
                </IconButton>
                <IconButton
                    onClick={()=>onClose()}
                    aria-label="show more">
                    <Icon>cancel</Icon>
                </IconButton>
            </CardActions>
        </Card>
    </Modal>
});
