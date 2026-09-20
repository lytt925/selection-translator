import {setIcon} from "obsidian";
import {t} from "../i18n";
import type TranslationPlugin from "../main";
import {isHTMLElement} from "./dom";
import {showSidebarTranslation} from "./translation-sidebar-view";
import {TranslationResultControls} from "./translation-result-controls";

export interface PanelAnchorPoint {
	x: number;
	y: number;
}

export interface TranslationPanelOptions {
	sourceText: string;
	translatedText: string;
	showSourceText: boolean;
	anchorPoint?: PanelAnchorPoint | null;
}

let currentPanel: TranslationPanel | null = null;
let lastPointerPosition: {x: number; y: number} | null = null;

const PANEL_MARGIN = 8;
const PANEL_POINTER_OFFSET = 16;

export function rememberTranslationPointerPosition(event: PointerEvent): void {
	lastPointerPosition = {
		x: event.clientX,
		y: event.clientY,
	};
}

export function showTranslationPanel(plugin: TranslationPlugin, options: TranslationPanelOptions): void {
	if (plugin.settings.useSidebarResultPanel) {
		void showSidebarTranslation(plugin, {
			sourceText: options.sourceText,
			translatedText: options.translatedText,
			showSourceText: options.showSourceText,
		});
		return;
	}

	if (!currentPanel) {
		currentPanel = new TranslationPanel(plugin, () => {
			currentPanel = null;
		});
	}

	currentPanel.update(options);
}

export function closeTranslationPanel(): void {
	currentPanel?.close();
}

class TranslationPanel {
	private readonly rootEl: HTMLElement;
	private readonly bodyEl: HTMLElement;
	private readonly pinButtonEl: HTMLButtonElement;
	private readonly headerEl: HTMLElement;
	private readonly onClose: () => void;
	private readonly controls: TranslationResultControls;
	private isPinned = false;
	private hasRendered = false;
	private dragStartX = 0;
	private dragStartY = 0;
	private dragStartLeft = 0;
	private dragStartTop = 0;
	private hasCustomPosition = false;

	constructor(private readonly plugin: TranslationPlugin, onClose: () => void) {
		this.onClose = onClose;
		this.controls = new TranslationResultControls(plugin);
		this.rootEl = plugin.app.workspace.containerEl.createDiv({
			cls: "selection-translator-panel",
		});

		// Add ARIA attributes for accessibility
		this.rootEl.setAttribute("role", "dialog");
		this.rootEl.setAttribute("aria-modal", "true");
		this.rootEl.setAttribute("aria-label", t(this.plugin, "panel.translation"));

		this.headerEl = this.rootEl.createDiv({
			cls: "selection-translator-panel-header",
		});

		const titleEl = this.headerEl.createDiv({
			cls: "selection-translator-panel-title",
			text: t(this.plugin, "panel.translation"),
		});
		titleEl.id = "selection-translator-panel-title";
		this.rootEl.setAttribute("aria-labelledby", "selection-translator-panel-title");

		const controlsEl = this.headerEl.createDiv({
			cls: "selection-translator-panel-controls",
		});

		this.pinButtonEl = controlsEl.createEl("button", {
			cls: "selection-translator-panel-button",
			attr: {
				"aria-label": t(this.plugin, "panel.pin"),
				"aria-pressed": "false",
				type: "button",
			},
		});
		setIcon(this.pinButtonEl, "pin");
		this.pinButtonEl.addEventListener("click", () => this.togglePinned());

		const closeButtonEl = controlsEl.createEl("button", {
			cls: "selection-translator-panel-button",
			attr: {
				"aria-label": t(this.plugin, "panel.close"),
				type: "button",
			},
		});
		setIcon(closeButtonEl, "x");
		closeButtonEl.addEventListener("click", () => this.close());

		this.bodyEl = this.rootEl.createDiv({
			cls: "selection-translator-panel-body",
		});
		this.headerEl.addEventListener("pointerdown", this.handlePointerDown);
		this.registerExternalClick();
		this.registerKeyboardNavigation();
	}

	update(options: TranslationPanelOptions): void {
		this.controls.stopSpeech();
		this.bodyEl.empty();

		if (options.showSourceText) {
			this.createSection(t(this.plugin, "panel.original"), options.sourceText);
		}

		this.createTranslationSection(options.translatedText);

		if (!this.isPinned || !this.hasRendered) {
			this.positionNearAnchor(options.anchorPoint ?? lastPointerPosition);
		}

		this.hasRendered = true;
		this.clampToViewport();
	}

	private createSection(label: string, text: string): void {
		const sectionEl = this.bodyEl.createDiv({
			cls: "selection-translator-panel-section",
		});
		const headerEl = sectionEl.createDiv({
			cls: "selection-translator-panel-section-header",
		});
		headerEl.createDiv({
			cls: "selection-translator-panel-label",
			text: label,
		});

		sectionEl.createDiv({
			cls: "selection-translator-panel-text",
			text,
		});
	}

	private createTranslationSection(translatedText: string): void {
		const sectionEl = this.bodyEl.createDiv({
			cls: "selection-translator-panel-section",
		});
		const headerEl = sectionEl.createDiv({
			cls: "selection-translator-panel-section-header",
		});
		headerEl.createDiv({
			cls: "selection-translator-panel-label",
			text: t(this.plugin, "panel.translation"),
		});

		const actionsEl = headerEl.createDiv({
			cls: "selection-translator-panel-section-actions",
		});

		this.controls.createTtsButton(actionsEl, () => translatedText);
		this.controls.createCopyButton(actionsEl, () => translatedText);

		sectionEl.createDiv({
			cls: "selection-translator-panel-text",
			text: translatedText,
		});
	}

	private togglePinned(): void {
		this.isPinned = !this.isPinned;
		this.rootEl.toggleClass("is-pinned", this.isPinned);
		this.pinButtonEl.toggleClass("is-active", this.isPinned);
		this.pinButtonEl.setAttr("aria-pressed", String(this.isPinned));
		this.pinButtonEl.setAttr("aria-label", this.isPinned ? t(this.plugin, "panel.unpin") : t(this.plugin, "panel.pin"));

		if (this.isPinned) {
			this.unregisterExternalClick();
		} else {
			this.registerExternalClick();
		}
	}

	private handlePointerDown = (event: PointerEvent): void => {
		if (event.button !== 0 || this.isControlTarget(event.target)) {
			return;
		}

		const rect = this.rootEl.getBoundingClientRect();
		this.dragStartX = event.clientX;
		this.dragStartY = event.clientY;
		this.dragStartLeft = rect.left;
		this.dragStartTop = rect.top;

		this.hasCustomPosition = true;
		this.rootEl.addClass("is-dragging");
		this.rootEl.addClass("has-custom-position");
		this.rootEl.setCssProps({
			"--selection-translator-panel-left": `${rect.left}px`,
			"--selection-translator-panel-top": `${rect.top}px`,
		});

		window.addEventListener("pointermove", this.handlePointerMove);
		window.addEventListener("pointerup", this.handlePointerUp, {once: true});
		event.preventDefault();
	};

	private handlePointerMove = (event: PointerEvent): void => {
		const rect = this.rootEl.getBoundingClientRect();
		const nextLeft = this.dragStartLeft + event.clientX - this.dragStartX;
		const nextTop = this.dragStartTop + event.clientY - this.dragStartY;
		const left = this.clamp(nextLeft, PANEL_MARGIN, window.innerWidth - rect.width - PANEL_MARGIN);
		const top = this.clamp(nextTop, PANEL_MARGIN, window.innerHeight - rect.height - PANEL_MARGIN);

		this.rootEl.setCssProps({
			"--selection-translator-panel-left": `${left}px`,
			"--selection-translator-panel-top": `${top}px`,
		});
	};

	private handlePointerUp = (): void => {
		this.rootEl.removeClass("is-dragging");
		window.removeEventListener("pointermove", this.handlePointerMove);
	};

	private handleExternalPointerDown = (event: PointerEvent): void => {
		if (this.isPinned || this.rootEl.contains(event.target as Node | null)) {
			return;
		}

		this.close();
	};

	private isControlTarget(target: EventTarget | null): boolean {
		return isHTMLElement(target) && Boolean(target.closest(".selection-translator-panel-controls"));
	}

	private registerExternalClick(): void {
		window.addEventListener("pointerdown", this.handleExternalPointerDown, true);
	}

	private unregisterExternalClick(): void {
		window.removeEventListener("pointerdown", this.handleExternalPointerDown, true);
	}

	private registerKeyboardNavigation(): void {
		this.rootEl.addEventListener("keydown", this.handleKeyDown);
	}

	private handleKeyDown = (event: KeyboardEvent): void => {
		// ESC to close panel
		if (event.key === "Escape") {
			this.close();
			event.preventDefault();
			event.stopPropagation();
		}
	};

	private clampToViewport(): void {
		const rect = this.rootEl.getBoundingClientRect();

		if (!this.hasCustomPosition) {
			return;
		}

		const left = this.clamp(rect.left, PANEL_MARGIN, window.innerWidth - rect.width - PANEL_MARGIN);
		const top = this.clamp(rect.top, PANEL_MARGIN, window.innerHeight - rect.height - PANEL_MARGIN);
		this.rootEl.setCssProps({
			"--selection-translator-panel-left": `${left}px`,
			"--selection-translator-panel-top": `${top}px`,
		});
	}

	private positionNearAnchor(anchorPoint: PanelAnchorPoint | null): void {
		if (!anchorPoint) {
			return;
		}

		const rect = this.rootEl.getBoundingClientRect();
		const left = this.clamp(
			anchorPoint.x + PANEL_POINTER_OFFSET,
			PANEL_MARGIN,
			window.innerWidth - rect.width - PANEL_MARGIN,
		);
		const top = this.clamp(
			anchorPoint.y + PANEL_POINTER_OFFSET,
			PANEL_MARGIN,
			window.innerHeight - rect.height - PANEL_MARGIN,
		);

		this.hasCustomPosition = true;
		this.rootEl.addClass("has-custom-position");
		this.rootEl.setCssProps({
			"--selection-translator-panel-left": `${left}px`,
			"--selection-translator-panel-top": `${top}px`,
		});
	}

	private clamp(value: number, min: number, max: number): number {
		return Math.min(Math.max(value, min), Math.max(min, max));
	}

	close(): void {
		this.controls.stopSpeech();
		this.handlePointerUp();
		this.unregisterExternalClick();

		// Remove all event listeners to prevent memory leaks
		this.rootEl.removeEventListener("keydown", this.handleKeyDown);
		this.headerEl.removeEventListener("pointerdown", this.handlePointerDown);

		this.rootEl.remove();
		this.onClose();
	}
}
