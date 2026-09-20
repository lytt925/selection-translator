import {App, Notice, setIcon} from "obsidian";
import {t} from "../i18n";
import TranslationPlugin from "../main";
import {getTargetLanguageOptions} from "../settings/defaults";
import {formatTranslationError} from "../translation/errors";
import {isHTMLElement} from "./dom";

interface QuickTranslationPanelOptions {
	initialText: string;
}

let currentQuickPanel: QuickTranslationPanel | null = null;
const QUICK_PANEL_MARGIN = 8;

export function showQuickTranslationPanel(plugin: TranslationPlugin, options: QuickTranslationPanelOptions): void {
	if (!currentQuickPanel) {
		currentQuickPanel = new QuickTranslationPanel(plugin.app, plugin, () => {
			currentQuickPanel = null;
		});
	}

	currentQuickPanel.open(options);
}

export function closeQuickTranslationPanel(): void {
	currentQuickPanel?.close();
}

class QuickTranslationPanel {
	private readonly rootEl: HTMLElement;
	private readonly headerEl: HTMLElement;
	private readonly inputEl: HTMLTextAreaElement;
	private readonly clearInputButtonEl: HTMLButtonElement;
	private readonly targetLanguageEl: HTMLSelectElement;
	private readonly resultEl: HTMLElement;
	private readonly resultTextEl: HTMLElement;
	private readonly copyButtonEl: HTMLButtonElement;
	private readonly translateButtonEl: HTMLButtonElement;
	private readonly onClose: () => void;
	private translatedText = "";
	private dragStartX = 0;
	private dragStartY = 0;
	private dragStartLeft = 0;
	private dragStartTop = 0;

	constructor(app: App, private readonly plugin: TranslationPlugin, onClose: () => void) {
		this.onClose = onClose;
		this.rootEl = app.workspace.containerEl.createDiv({
			cls: "selection-translator-quick-panel",
		});

		// Add ARIA attributes for accessibility
		this.rootEl.setAttribute("role", "dialog");
		this.rootEl.setAttribute("aria-modal", "true");
		this.rootEl.setAttribute("aria-label", t(this.plugin, "quick.title"));

		this.headerEl = this.rootEl.createDiv({
			cls: "selection-translator-quick-panel-header",
		});

		const titleEl = this.headerEl.createDiv({
			cls: "selection-translator-panel-title",
			text: t(this.plugin, "quick.title"),
		});
		titleEl.id = "selection-translator-quick-panel-title";
		this.rootEl.setAttribute("aria-labelledby", "selection-translator-quick-panel-title");

		const closeButtonEl = this.headerEl.createEl("button", {
			cls: "selection-translator-panel-button",
			attr: {
				"aria-label": t(this.plugin, "quick.close"),
				type: "button",
			},
		});
		setIcon(closeButtonEl, "x");
		closeButtonEl.addEventListener("click", () => this.close());

		this.headerEl.addEventListener("pointerdown", this.handlePointerDown);

		const bodyEl = this.rootEl.createDiv({
			cls: "selection-translator-quick-panel-body",
		});

		const inputWrapEl = bodyEl.createDiv({
			cls: "selection-translator-quick-panel-input-wrap",
		});
		this.inputEl = inputWrapEl.createEl("textarea", {
			cls: "selection-translator-quick-panel-input",
			attr: {
				placeholder: t(this.plugin, "quick.placeholder"),
			},
		});
		this.clearInputButtonEl = inputWrapEl.createEl("button", {
			cls: "selection-translator-panel-button selection-translator-quick-panel-clear-button",
			attr: {
				"aria-label": t(this.plugin, "quick.clear"),
				type: "button",
			},
		});
		setIcon(this.clearInputButtonEl, "x");
		this.clearInputButtonEl.addEventListener("click", () => this.clearInput());
		this.inputEl.addEventListener("input", this.handleInput);

		const controlsEl = bodyEl.createDiv({
			cls: "selection-translator-quick-panel-controls",
		});
		this.targetLanguageEl = controlsEl.createEl("select", {
			cls: "selection-translator-quick-panel-select",
		});
		this.refreshTargetLanguages();

		this.translateButtonEl = controlsEl.createEl("button", {
			cls: "mod-cta",
			text: t(this.plugin, "quick.translate"),
			attr: {
				type: "button",
			},
		});
		this.translateButtonEl.addEventListener("click", () => {
			void this.translate();
		});

		this.resultEl = bodyEl.createDiv({
			cls: "selection-translator-quick-panel-result",
		});
		const resultHeaderEl = this.resultEl.createDiv({
			cls: "selection-translator-quick-panel-result-header",
		});
		resultHeaderEl.createDiv({
			cls: "selection-translator-panel-label",
			text: t(this.plugin, "panel.translation"),
		});
		const resultActionsEl = resultHeaderEl.createDiv({
			cls: "selection-translator-panel-section-actions",
		});

		this.copyButtonEl = resultActionsEl.createEl("button", {
			cls: "selection-translator-panel-button selection-translator-panel-copy-button",
			attr: {
				"aria-label": t(this.plugin, "panel.copyTranslation"),
				type: "button",
			},
		});
		setIcon(this.copyButtonEl, "copy");
		this.copyButtonEl.addEventListener("click", () => {
			void this.copyTranslation();
		});

		this.resultTextEl = this.resultEl.createDiv({
			cls: "selection-translator-quick-panel-result-text",
		});
		this.setResult("");
		this.registerKeyboardNavigation();
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

	open(options: QuickTranslationPanelOptions): void {
		this.inputEl.value = options.initialText;
		this.refreshTargetLanguages();
		this.setResult("");
		this.updateClearInputButton();
		this.inputEl.focus();
		this.inputEl.select();
	}

	private async translate(): Promise<void> {
		const text = this.inputEl.value.trim();

		if (!text) {
			new Notice(t(this.plugin, "quick.empty"));
			return;
		}

		this.translateButtonEl.disabled = true;
		this.setResult(t(this.plugin, "quick.translating"), false);

		try {
			const targetLanguage = this.targetLanguageEl.value;
			const result = await this.plugin.translateService.translateWithCache({
				text,
				sourceLanguage: this.plugin.settings.sourceLanguage,
				targetLanguage,
				settings: {
					...this.plugin.settings,
					targetLanguage,
				},
			});

			this.setResult(result.text);

		} catch (error) {
			console.error("Failed to translate quick panel text", error);
			const message = formatTranslationError(error);
			this.setResult(message, false);
			new Notice(message);
		} finally {
			this.translateButtonEl.disabled = false;
		}
	}

	private clearInput(): void {
		this.inputEl.value = "";
		this.setResult("");
		this.updateClearInputButton();
		this.inputEl.focus();
	}

	private handleInput = (): void => {
		this.updateClearInputButton();
	};

	private updateClearInputButton(): void {
		this.clearInputButtonEl.disabled = !this.inputEl.value;
	}

	private refreshTargetLanguages(): void {
		const options = getTargetLanguageOptions(this.plugin.settings.currentProvider, this.plugin.settings.pluginLanguage);
		this.targetLanguageEl.empty();
		for (const [value, label] of Object.entries(options)) {
			this.targetLanguageEl.createEl("option", {
				text: label,
				value,
			});
		}
		this.targetLanguageEl.value = this.plugin.settings.targetLanguage in options
			? this.plugin.settings.targetLanguage
			: Object.keys(options)[0] ?? this.plugin.settings.targetLanguage;
	}

	private setResult(text: string, canAct = Boolean(text.trim())): void {
		this.translatedText = canAct ? text : "";
		this.resultTextEl.setText(text);
		this.copyButtonEl.disabled = !this.translatedText;
	}

	private async copyTranslation(): Promise<void> {
		if (!this.translatedText) {
			return;
		}

		try {
			await navigator.clipboard.writeText(this.translatedText);
			new Notice(t(this.plugin, "notice.copiedTranslation"));
		} catch (error) {
			console.error("Failed to copy quick translation", error);
			new Notice(t(this.plugin, "notice.copyTranslationFailed"));
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

		this.rootEl.addClass("is-dragging");
		this.rootEl.addClass("has-custom-position");
		this.rootEl.setCssProps({
			"--selection-translator-quick-panel-left": `${rect.left}px`,
			"--selection-translator-quick-panel-top": `${rect.top}px`,
		});

		window.addEventListener("pointermove", this.handlePointerMove);
		window.addEventListener("pointerup", this.handlePointerUp, {once: true});
		event.preventDefault();
	};

	private handlePointerMove = (event: PointerEvent): void => {
		const rect = this.rootEl.getBoundingClientRect();
		const nextLeft = this.dragStartLeft + event.clientX - this.dragStartX;
		const nextTop = this.dragStartTop + event.clientY - this.dragStartY;
		const left = clamp(nextLeft, QUICK_PANEL_MARGIN, window.innerWidth - rect.width - QUICK_PANEL_MARGIN);
		const top = clamp(nextTop, QUICK_PANEL_MARGIN, window.innerHeight - rect.height - QUICK_PANEL_MARGIN);

		this.rootEl.setCssProps({
			"--selection-translator-quick-panel-left": `${left}px`,
			"--selection-translator-quick-panel-top": `${top}px`,
		});
	};

	private handlePointerUp = (): void => {
		this.rootEl.removeClass("is-dragging");
		window.removeEventListener("pointermove", this.handlePointerMove);
	};

	private isControlTarget(target: EventTarget | null): boolean {
		return isHTMLElement(target) && Boolean(target.closest("button, textarea, select"));
	}

	close(): void {
		this.handlePointerUp();

		// Remove all event listeners to prevent memory leaks
		this.rootEl.removeEventListener("keydown", this.handleKeyDown);
		this.headerEl.removeEventListener("pointerdown", this.handlePointerDown);
		this.inputEl.removeEventListener("input", this.handleInput);

		this.rootEl.remove();
		this.onClose();
	}
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), Math.max(min, max));
}
