import {Menu, Notice, TFile} from "obsidian";
import {t} from "../i18n";
import TranslationPlugin from "../main";
import {openBilingualVirtualView} from "../side-by-side/bilingual-virtual-view";
import {toggleImmersiveTranslation} from "../actions/toggle-immersive-translation";
import {translateCurrentFile} from "../actions/translate-current-file";
import {translateCurrentParagraph} from "../actions/translate-current-paragraph";
import {getActiveMarkdownView, translateSelection} from "../actions/translate-selection";
import {getActivePdfSelection, getSelectionAcrossViews, isActivePdfView, translatePdfSelection} from "../pdf/pdf-selection";
import {showQuickTranslationPanel} from "../ui/quick-translation-panel";

export function registerTranslationRibbon(plugin: TranslationPlugin) {
	const ribbonEl = plugin.addRibbonIcon("languages", t(plugin, "menu.translationTools"), (event: MouseEvent) => {
		updateRibbonState(plugin, ribbonEl);
		const menu = new Menu();
		const activeFile = plugin.app.workspace.getActiveFile();
		const sideBySideContext = getSideBySideContext(plugin, activeFile);
		const immersiveActive = plugin.immersiveManager.isActiveForCurrentFile();

		menu.addItem(item => item
			.setTitle(t(plugin, "command.translateSelection"))
			.setIcon("languages")
			.onClick(() => {
				const markdownView = getActiveMarkdownView(plugin);

				if (markdownView) {
					void translateSelection(plugin, markdownView.editor);
					return;
				}

				if (isActivePdfView(plugin)) {
					void translatePdfSelection(plugin, getActivePdfSelection(plugin));
					return;
				}

				new Notice(t(plugin, "notice.openMarkdownSelection"));
			}));

		menu.addItem(item => item
			.setTitle(t(plugin, "command.translateCurrentParagraph"))
			.setIcon("languages")
			.onClick(() => {
				const markdownView = getActiveMarkdownView(plugin);

				if (!markdownView) {
					new Notice(t(plugin, "notice.openMarkdownSelection"));
					return;
				}

				void translateCurrentParagraph(plugin, markdownView.editor);
			}));

		menu.addItem(item => item
			.setTitle(t(plugin, "menu.quickPanel"))
			.setIcon("search")
			.onClick(() => {
				showQuickTranslationPanel(plugin, {
					initialText: getSelectionAcrossViews(plugin),
				});
			}));

		menu.addItem(item => item
			.setTitle(t(plugin, "command.translateCurrentFile"))
			.setIcon("file-text")
			.onClick(() => {
				void translateCurrentFile(plugin);
			}));

		menu.addSeparator();

		menu.addItem(item => item
			.setTitle(immersiveActive ? t(plugin, "menu.disableImmersive") : t(plugin, "menu.immersive"))
			.setIcon(immersiveActive ? "check" : "scan-text")
			.onClick(() => {
				toggleImmersiveTranslation(plugin);
				updateRibbonState(plugin, ribbonEl);
			}));

		if (!sideBySideContext) {
			menu.addItem(item => item
				.setTitle(t(plugin, "menu.openMarkdownRequired"))
				.setIcon("book-open")
				.setDisabled(true));
		} else {
			menu.addItem(item => item
				.setTitle(t(plugin, "menu.openBilingualReader"))
				.setIcon("book-open")
				.onClick(() => {
					void openBilingualVirtualView(plugin, sideBySideContext.sourceFile, sideBySideContext.targetLanguage);
					window.setTimeout(() => updateRibbonState(plugin, ribbonEl), 250);
				}));
		}

		menu.showAtMouseEvent(event);
	});

	const update = () => updateRibbonState(plugin, ribbonEl);
	plugin.registerEvent(plugin.app.workspace.on("active-leaf-change", update));
	plugin.registerEvent(plugin.app.workspace.on("file-open", update));
	plugin.registerEvent(plugin.app.workspace.on("layout-change", update));
	plugin.app.workspace.onLayoutReady(update);
	update();
}

function getSideBySideContext(plugin: TranslationPlugin, file: TFile | null): {sourceFile: TFile; targetLanguage: string} | null {
	if (!file || file.extension !== "md") {
		return null;
	}
	const sourceFile = plugin.documentTranslationService.getSourceFileForPath(file.path);
	if (sourceFile) {
		return {
			sourceFile,
			targetLanguage: plugin.documentTranslationService.getTargetLanguageForPath(file.path) ?? plugin.settings.targetLanguage,
		};
	}
	return {
		sourceFile: file,
		targetLanguage: plugin.settings.targetLanguage,
	};
}

function updateRibbonState(plugin: TranslationPlugin, ribbonEl: HTMLElement): void {
	const file = plugin.app.workspace.getActiveFile();
	const sideBySideContext = getSideBySideContext(plugin, file);
	const hasActiveMode = plugin.immersiveManager.isActiveForCurrentFile()
		|| (sideBySideContext ? plugin.documentTranslationService.isActive(sideBySideContext.sourceFile.path, sideBySideContext.targetLanguage) : false);
	ribbonEl.toggleClass("selection-translator-ribbon-active", hasActiveMode);
}
