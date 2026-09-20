import {Notice} from "obsidian";
import {t} from "../i18n";
import TranslationPlugin from "../main";
import {startCommandNotice} from "../ui/command-notice";
import {showTranslationPanel} from "../ui/translation-panel";

const PDF_VIEW_TYPE = "pdf";

/**
 * Whether the currently active leaf is Obsidian's built-in PDF viewer.
 */
export function isActivePdfView(plugin: TranslationPlugin): boolean {
	return getActiveViewType(plugin) === PDF_VIEW_TYPE;
}

function getActiveViewType(plugin: TranslationPlugin): string | null {
	// `PDFView` isn't a class Obsidian exports publicly, so it can't be
	// passed to `getActiveViewOfType`. `getMostRecentLeaf()` is the
	// documented replacement for the deprecated `workspace.activeLeaf`.
	const leaf = plugin.app.workspace.getMostRecentLeaf();
	return leaf?.view?.getViewType() ?? null;
}

/**
 * Reads the text currently selected inside the PDF viewer.
 *
 * Obsidian renders PDFs with PDF.js, which lays text out as real DOM
 * `<span>` elements (the "text layer"). That means the browser's native
 * `window.getSelection()` works on it exactly like it would on any web
 * page — no PDF.js/Obsidian-internal APIs are needed to just read the
 * selected string. This is deliberately kept independent from PDF++'s
 * `pdf-menu` event, since that event only fires when its own context menu
 * is opened, not when a command is run from the command palette.
 */
export function getActivePdfSelection(plugin: TranslationPlugin): string {
	if (getActiveViewType(plugin) !== PDF_VIEW_TYPE) {
		return "";
	}

	return activeWindow.getSelection()?.toString().trim() ?? "";
}

/**
 * Runs a translation for text selected in the PDF viewer and shows the
 * result in the shared translation panel. Used by both the PDF context
 * menu (via PDF++) and the "Translate selection" command/editor menu when
 * a PDF is the active view.
 */
export async function translatePdfSelection(plugin: TranslationPlugin, selectedText: string): Promise<void> {
	if (!selectedText) {
		new Notice(t(plugin, "notice.selectText"));
		return;
	}

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
			// Neither the PDF++ menu event nor the command palette give us
			// editor-like coordinates to anchor the panel to, so it falls
			// back to its default positioning.
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
