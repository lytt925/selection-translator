import {Notice, setIcon} from "obsidian";
import {t} from "../i18n";
import type TranslationPlugin from "../main";
import {formatTranslationError} from "../translation/errors";

/**
 * Shared "speak" + "copy" behavior for a translated text block, used by both
 * the floating TranslationPanel and the pinned sidebar result view so the
 * two don't duplicate (and drift on) the same TTS/clipboard logic.
 */
export class TranslationResultControls {
	private isSpeaking = false;
	private speechToken = 0;

	constructor(private readonly plugin: TranslationPlugin) {}

	createTtsButton(container: HTMLElement, getTranslatedText: () => string): HTMLButtonElement {
		const buttonEl = container.createEl("button", {
			cls: "selection-translator-panel-button selection-translator-panel-tts-button",
			attr: {
				"aria-label": t(this.plugin, "panel.readTranslation"),
				type: "button",
			},
		});
		setIcon(buttonEl, "volume-2");
		buttonEl.addEventListener("click", () => {
			void this.toggleSpeech(getTranslatedText(), buttonEl);
		});
		return buttonEl;
	}

	createCopyButton(container: HTMLElement, getTranslatedText: () => string): HTMLButtonElement {
		const buttonEl = container.createEl("button", {
			cls: "selection-translator-panel-button selection-translator-panel-copy-button",
			attr: {
				"aria-label": t(this.plugin, "panel.copyTranslation"),
				type: "button",
			},
		});
		setIcon(buttonEl, "copy");
		buttonEl.addEventListener("click", () => {
			void this.copyTranslation(getTranslatedText());
		});
		return buttonEl;
	}

	async toggleSpeech(translatedText: string, buttonEl: HTMLButtonElement): Promise<void> {
		if (this.isSpeaking) {
			this.stopSpeech();
			this.setSpeechButtonState(buttonEl, false);
			return;
		}

		if (!translatedText.trim()) {
			new Notice(t(this.plugin, "panel.noTranslationToRead"));
			return;
		}
		if (!this.plugin.settings.ttsEnabled) {
			new Notice(t(this.plugin, "panel.enableTts"));
			return;
		}

		const token = ++this.speechToken;
		this.isSpeaking = true;
		this.setSpeechButtonState(buttonEl, true);

		try {
			await this.plugin.ttsService.speak({
				text: translatedText,
				language: this.plugin.settings.targetLanguage,
				voice: this.plugin.settings.ttsVoice,
				rate: this.plugin.settings.ttsRate,
				pitch: this.plugin.settings.ttsPitch,
				volume: this.plugin.settings.ttsVolume,
			});
		} catch (error) {
			if (token === this.speechToken) {
				console.error("Failed to read translation", error);
				new Notice(formatTranslationError(error));
			}
		} finally {
			if (token === this.speechToken) {
				this.isSpeaking = false;
				this.setSpeechButtonState(buttonEl, false);
			}
		}
	}

	stopSpeech(): void {
		if (!this.isSpeaking) {
			return;
		}
		this.speechToken++;
		this.isSpeaking = false;
		this.plugin.ttsService.stop();
	}

	private setSpeechButtonState(buttonEl: HTMLButtonElement, isSpeaking: boolean): void {
		buttonEl.toggleClass("is-active", isSpeaking);
		buttonEl.setAttr("aria-label", isSpeaking ? t(this.plugin, "panel.stopReading") : t(this.plugin, "panel.readTranslation"));
		setIcon(buttonEl, isSpeaking ? "circle-stop" : "volume-2");
	}

	private async copyTranslation(translatedText: string): Promise<void> {
		try {
			await navigator.clipboard.writeText(translatedText);
			new Notice(t(this.plugin, "notice.copiedTranslation"));
		} catch (error) {
			console.error("Failed to copy translation", error);
			new Notice(t(this.plugin, "notice.copyTranslationFailed"));
		}
	}
}
