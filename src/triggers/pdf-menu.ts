import {Menu} from "obsidian";
import {t} from "../i18n";
import TranslationPlugin from "../main";
import {translatePdfSelection} from "../pdf/pdf-selection";
import type {PdfPlusMenuEventData} from "../pdf/pdf-plus-types";

/**
 * Adds a "Translate selection" item to the PDF viewer's right-click menu.
 *
 * Obsidian's core PDF viewer does not expose a context-menu hook to plugins.
 * This relies on PDF++ (obsidian-pdf-plus), which patches the PDF viewer's
 * context menu and, once built, fires a `pdf-menu` workspace event carrying
 * the selected text. If PDF++ is not installed or disabled, this is a silent
 * no-op — no menu item is added.
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
