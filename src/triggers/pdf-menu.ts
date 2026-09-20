import {Menu} from "obsidian";
import {t} from "../i18n";
import TranslationPlugin from "../main";
import type {PdfPlusMenuEventData} from "../pdf/pdf-plus-types";
import {startCommandNotice} from "../ui/command-notice";
import {showTranslationPanel} from "../ui/translation-panel";

/**
 * Adds a "Translate selection" item to the PDF viewer's right-click menu.
 *
 * Obsidian's core PDF viewer does not expose a context-menu hook or a way to
 * read the current text selection to plugins. This relies on PDF++
 * (obsidian-pdf-plus), which patches the PDF viewer's context menu and, once
 * built, fires a `pdf-menu` workspace event carrying the selected text. If
 * PDF++ is not installed or disabled, this feature is silently unavailable
 * and nothing is added to the menu.
 */
export function registerPdfContextMenu(plugin: TranslationPlugin): void {
	plugin.registerEvent(
		plugin.app.workspace.on("pdf-menu", (menu: Menu, data: PdfPlusMenuEventData) => {
			const selection = data.selection?.trim();
			if (!selection) {
				return;
			}

			menu.addItem(item => {
				item
					.setTitle(t(plugin, "command.translateSelection"))
					.setIcon("languages")
					.onClick(() => {
						void translatePdfSelection(plugin, selection);
					});
			});
		}),
	);
}

async function translatePdfSelection(plugin: TranslationPlugin, selectedText: string): Promise<void> {
	const notice = startCommandNotice({
		plugin,
		title: t(plugin, "command.translateSelection"),
		message: t(plugin, "quick.translating"),
	});

	try {
		const result = await plugin.translateService.translateWithCache({
			text: selectedText,
			sourceLanguage: plugin.settings.sourceLanguage,
			targetLanguage: plugin.settings.targetLanguage,
			settings: plugin.settings,
		});

		showTranslationPanel(plugin, {
			sourceText: selectedText,
			translatedText: result.text,
			showSourceText: plugin.settings.showSourceText,
			// PDF++ does not give us editor coordinates; the panel falls back
			// to the last known pointer position (the right-click itself).
			anchorPoint: null,
		});
		notice.success(t(plugin, "notice.translationCompleted"));
	} catch (error) {
		console.error("Failed to translate PDF selection", error);
		notice.fail(error, {
			commandName: t(plugin, "command.translateSelection"),
			text: selectedText,
		});
	}
}
