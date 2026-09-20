import TranslationPlugin from "../main";
import {openBilingualVirtualView} from "../side-by-side/bilingual-virtual-view";
import {toggleImmersiveTranslation} from "../actions/toggle-immersive-translation";
import {translateCurrentFile} from "../actions/translate-current-file";
import {translateCurrentParagraph, translateCurrentParagraphAndInsertBelow} from "../actions/translate-current-paragraph";
import {getActiveMarkdownView, translateSelection} from "../actions/translate-selection";
import {getActivePdfSelection, isActivePdfView, translatePdfSelection} from "../pdf/pdf-selection";
import {showQuickTranslationPanel} from "../ui/quick-translation-panel";
import {t} from "../i18n";

export function registerTranslationCommands(plugin: TranslationPlugin) {
	plugin.addCommand({
		id: "translate-selection",
		name: t(plugin, "command.translateSelection"),
		checkCallback: (checking: boolean) => {
			const markdownView = getActiveMarkdownView(plugin);

			if (markdownView) {
				if (!checking) {
					void translateSelection(plugin, markdownView.editor);
				}

				return true;
			}

			if (isActivePdfView(plugin)) {
				if (!checking) {
					void translatePdfSelection(plugin, getActivePdfSelection(plugin));
				}

				return true;
			}

			return false;
		},
	});

	plugin.addCommand({
		id: "open-quick-translation-panel",
		name: t(plugin, "command.openQuickPanel"),
		callback: () => {
			const markdownView = getActiveMarkdownView(plugin);
			showQuickTranslationPanel(plugin, {
				initialText: markdownView?.editor.getSelection().trim() ?? "",
			});
		},
	});

	plugin.addCommand({
		id: "translate-current-paragraph",
		name: t(plugin, "command.translateCurrentParagraph"),
		checkCallback: (checking: boolean) => {
			const markdownView = getActiveMarkdownView(plugin);

			if (!markdownView) {
				return false;
			}

			if (!checking) {
				void translateCurrentParagraph(plugin, markdownView.editor);
			}

			return true;
		},
	});

	plugin.addCommand({
		id: "translate-current-paragraph-insert-below",
		name: t(plugin, "command.translateParagraphInsertBelow"),
		checkCallback: (checking: boolean) => {
			const markdownView = getActiveMarkdownView(plugin);

			if (!markdownView) {
				return false;
			}

			if (!checking) {
				void translateCurrentParagraphAndInsertBelow(plugin, markdownView.editor);
			}

			return true;
		},
	});

	plugin.addCommand({
		id: "translate-current-file",
		name: t(plugin, "command.translateCurrentFile"),
		callback: () => {
			void translateCurrentFile(plugin);
		},
	});

	plugin.addCommand({
		id: "toggle-immersive-translation",
		name: t(plugin, "command.toggleImmersive"),
		callback: () => toggleImmersiveTranslation(plugin),
	});

	plugin.addCommand({
		id: "open-bilingual-virtual-view",
		name: t(plugin, "command.openBilingualVirtualView"),
		checkCallback: (checking: boolean) => {
			const markdownView = getActiveMarkdownView(plugin);
			const file = markdownView?.file;
			if (!file) {
				return false;
			}

			if (!checking) {
				const sourceFile = plugin.documentTranslationService.getSourceFileForPath(file.path) ?? file;
				const targetLanguage = plugin.documentTranslationService.getTargetLanguageForPath(file.path) ?? plugin.settings.targetLanguage;
				void openBilingualVirtualView(plugin, sourceFile, targetLanguage);
			}

			return true;
		},
	});
}
