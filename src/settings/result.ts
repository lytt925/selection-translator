import {getImmersiveModeOptions, getImmersiveStyleOptions} from "./defaults";
import type {TranslationSettingTab} from "./tab";

export function displayResultSettings(tab: TranslationSettingTab, el: HTMLElement): void {
	const locale = tab.plugin.settings.pluginLanguage;

	tab.heading(el, tab.t("settings.result.heading"));

	tab.subheading(el, tab.t("settings.result.floating.heading"));
	tab.toggle(el, tab.t("settings.result.showSource.name"), tab.t("settings.result.showSource.desc"), "showSourceText");
	tab.toggle(el, tab.t("settings.result.sidebarPanel.name"), tab.t("settings.result.sidebarPanel.desc"), "useSidebarResultPanel");

	tab.subheading(el, tab.t("settings.result.reading.heading"));
	tab.toggle(el, tab.t("settings.result.immersive.name"), tab.t("settings.result.immersive.desc"), "enableImmersiveTranslation");
	tab.dropdown(el, tab.t("settings.result.immersiveMode.name"), tab.t("settings.result.immersiveMode.desc"), "immersiveMode", getImmersiveModeOptions(locale));
	tab.dropdown(el, tab.t("settings.result.immersiveStyle.name"), tab.t("settings.result.immersiveStyle.desc"), "immersiveStyle", getImmersiveStyleOptions(locale));
}
