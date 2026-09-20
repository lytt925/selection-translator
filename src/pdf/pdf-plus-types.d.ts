import type {EventRef, Menu} from "obsidian";

/**
 * PDF++ (obsidian-pdf-plus) triggers this custom workspace event after it
 * finishes building its own context menu for the PDF viewer. It is not part
 * of Obsidian's core API — it only exists when PDF++ is installed and
 * enabled. See:
 * https://github.com/RyotaUshio/obsidian-pdf-plus/wiki/For-developers
 */
declare module "obsidian" {
	interface Workspace {
		on(
			name: "pdf-menu",
			callback: (menu: Menu, data: PdfPlusMenuEventData) => void,
		): EventRef;
	}
}

export interface PdfPlusMenuEventData {
	/** 1-based page number the context menu was opened on. */
	pageNumber: number;
	/** The currently selected text in the PDF viewer, if any. */
	selection: string;
	/** The annotation under the cursor, if the menu was opened on one. */
	annot?: unknown;
}
