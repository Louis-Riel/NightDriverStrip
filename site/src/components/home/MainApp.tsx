import { AppPannel } from "./AppPannel";
import { CssBaseline } from "@mui/material";
import { ThemeSwitcherProvider } from "./ThemeSwitcherProvider";
import { ScreenService } from '../../services/screen/screenmanager';
import { SiteConfigManager } from "../../services/siteconfig/siteconfig";

const screenService = ScreenService();
const siteConfigService = SiteConfigManager();
export function MainApp() {
    return (<ThemeSwitcherProvider>
        <CssBaseline />
        <AppPannel />
    </ThemeSwitcherProvider>);
}