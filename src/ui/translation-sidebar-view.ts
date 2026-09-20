import {ItemView, WorkspaceLeaf} from "obsidian";
import {t} from "../i18n";
import type TranslationPlugin from "../main";
import {TranslationResultControls} from "./translation-result-controls";

export const TRANSLATION_SIDEBAR_VIEW_TYPE = "selection-translator-sidebar";

export interface SidebarTranslationOptions {
	sourceText: string;
	translatedText: string;
	showSourceText: boolean;
}

/**
 * Pinned, replace-on-update translation result view for the right sidebar.
 * This is the sidebar counterpart to the floating TranslationPanel: same
 * "original + translation" layout and the same copy/read-aloud actions, but
 * docked instead of popping up near the cursor, and with no drag/pin/
 * auto-close behavior since a sidebar leaf is already "pinned" by nature.
 */
export class TranslationSidebarView extends ItemView {
	private readonly controls: TranslationResultControls;
	private bodyEl!: HTMLElement;
	private latest: SidebarTranslationOptions | null = null;

	constructor(leaf: WorkspaceLeaf, private readonly plugin: TranslationPlugin) {
		super(leaf);
		this.controls = new TranslationResultControls(plugin);
	}

	getViewType(): string {
		return TRANSLATION_SIDEBAR_VIEW_TYPE;
	}

	getDisplayText(): string {
		return t(this.plugin, "panel.translation");
	}

	getIcon(): string {
		return "languages";
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1] ?? this.containerEl;
		container.empty();
		container.addClass("selection-translator-sidebar-view");
		this.bodyEl = container.createDiv({cls: "selection-translator-panel-body"});
		this.renderEmptyState();
	}

	async onClose(): Promise<void> {
		this.controls.stopSpeech();
	}

	update(options: SidebarTranslationOptions): void {
		this.latest = options;
		this.controls.stopSpeech();
		this.render(options);
	}

	private render(options: SidebarTranslationOptions): void {
		this.bodyEl.empty();

		if (options.showSourceText) {
			this.createSection(t(this.plugin, "panel.original"), options.sourceText);
		}

		this.createTranslationSection(options.translatedText);
	}

	private renderEmptyState(): void {
		this.bodyEl.empty();
		this.bodyEl.createDiv({
			cls: "selection-translator-sidebar-empty",
			text: t(this.plugin, "panel.sidebarEmptyState"),
		});
	}

	private createSection(label: string, text: string): void {
		const sectionEl = this.bodyEl.createDiv({cls: "selection-translator-panel-section"});
		const headerEl = sectionEl.createDiv({cls: "selection-translator-panel-section-header"});
		headerEl.createDiv({cls: "selection-translator-panel-label", text: label});
		sectionEl.createDiv({cls: "selection-translator-panel-text", text});
	}

	private createTranslationSection(translatedText: string): void {
		const sectionEl = this.bodyEl.createDiv({cls: "selection-translator-panel-section"});
		const headerEl = sectionEl.createDiv({cls: "selection-translator-panel-section-header"});
		headerEl.createDiv({cls: "selection-translator-panel-label", text: t(this.plugin, "panel.translation")});

		const actionsEl = headerEl.createDiv({cls: "selection-translator-panel-section-actions"});
		this.controls.createTtsButton(actionsEl, () => this.latest?.translatedText ?? translatedText);
		this.controls.createCopyButton(actionsEl, () => this.latest?.translatedText ?? translatedText);

		sectionEl.createDiv({cls: "selection-translator-panel-text", text: translatedText});
	}
}

/**
 * Opens (if needed) the sidebar translation view in the right leaf and
 * updates it with the given translation. Reuses an existing sidebar leaf
 * instead of creating a new one each time.
 */
export async function showSidebarTranslation(plugin: TranslationPlugin, options: SidebarTranslationOptions): Promise<void> {
	const {workspace} = plugin.app;
	const existing = workspace.getLeavesOfType(TRANSLATION_SIDEBAR_VIEW_TYPE)[0];
	const leaf = existing ?? workspace.getRightLeaf(false);

	if (!leaf) {
		return;
	}

	if (!existing) {
		await leaf.setViewState({type: TRANSLATION_SIDEBAR_VIEW_TYPE, active: true});
	}

	void workspace.revealLeaf(leaf);

	const view = leaf.view;
	if (view instanceof TranslationSidebarView) {
		view.update(options);
	}
}
