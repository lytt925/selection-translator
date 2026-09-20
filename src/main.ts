import {Plugin} from "obsidian";
import {DEFAULT_SETTINGS, TranslationPluginSettings, TranslationSettingTab} from "./settings";
import {registerTranslationCommands} from "./triggers/commands";
import {registerEditorMenu} from "./triggers/editor-menu";
import {registerImageContextMenus} from "./triggers/image-context-menu";
import {registerPdfContextMenu} from "./triggers/pdf-menu";
import {registerTranslationRibbon} from "./triggers/ribbon";
import {DefaultDocumentTranslationService, DocumentTranslationService} from "./document/document-translation-service";
import {ImmersiveTranslationManager} from "./immersive/manager";
import {BILINGUAL_VIRTUAL_VIEW_TYPE, BilingualVirtualView} from "./side-by-side/bilingual-virtual-view";
import {closeQuickTranslationPanel} from "./ui/quick-translation-panel";
import {TaskLogManager} from "./ui/task-log-panel";
import {closeTranslationPanel, rememberTranslationPointerPosition} from "./ui/translation-panel";
import {TranslationCache} from "./translation/cache";
import {DefaultPromptService, PromptService} from "./translation/prompt-service";
import {DefaultRequestQueueService, RequestQueueService} from "./translation/request-queue-service";
import {DefaultTranslateService, TranslateService} from "./translation/translate-service";
import {getDefaultProviderConfig, PROVIDER_LABELS} from "./translation/provider-config";
import {TranslationMetricsService} from "./translation/metrics";
import type {TranslationProviderId} from "./translation/types";
import {DefaultTtsService, TtsService, getDefaultTtsConfig} from "./tts/tts-service";

export default class TranslationPlugin extends Plugin {
	settings: TranslationPluginSettings;
	translationCache!: TranslationCache;
	translationMetrics!: TranslationMetricsService;
	requestQueueService!: RequestQueueService;
	promptService!: PromptService;
	translateService!: TranslateService;
	ttsService!: TtsService;
	documentTranslationService!: DocumentTranslationService;
	immersiveManager!: ImmersiveTranslationManager;
	taskLogManager!: TaskLogManager;

	async onload() {
		await this.loadSettings();
		this.translationCache = new TranslationCache(this);
		this.translationMetrics = new TranslationMetricsService();
		this.requestQueueService = new DefaultRequestQueueService({
			rate: this.settings.immersiveQueueRate,
			capacity: this.settings.immersiveQueueCapacity,
			timeoutMs: this.settings.requestTimeout,
			maxRetries: this.settings.maxRetries,
			baseRetryDelayMs: 1000,
		});
		this.promptService = new DefaultPromptService(this);
		this.translateService = new DefaultTranslateService(this, this.promptService);
		this.ttsService = new DefaultTtsService(this);
		this.documentTranslationService = new DefaultDocumentTranslationService(this);
		this.translationCache.cleanExpired();
		this.immersiveManager = new ImmersiveTranslationManager(this);
		this.taskLogManager = new TaskLogManager(this);
		this.immersiveManager.register();
		this.documentTranslationService.register();
		this.registerView(BILINGUAL_VIRTUAL_VIEW_TYPE, leaf => new BilingualVirtualView(leaf, this));
		registerTranslationCommands(this);
		registerEditorMenu(this);
		registerImageContextMenus(this);
		registerPdfContextMenu(this);
		registerTranslationRibbon(this);
		this.registerDomEvent(activeDocument, "pointerdown", rememberTranslationPointerPosition);
		this.addSettingTab(new TranslationSettingTab(this.app, this));
	}

	onunload() {
		this.requestQueueService?.clear();
		this.immersiveManager?.stopAll();
		this.documentTranslationService?.stopAll();
		this.ttsService?.stop();
		this.translationCache?.close();
		this.taskLogManager?.close();
		closeTranslationPanel();
		closeQuickTranslationPanel();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<TranslationPluginSettings>);
		const legacySettings = this.settings as Partial<TranslationPluginSettings> & Record<string, unknown>;
		const provider = (legacySettings as Record<string, unknown>).currentProvider;
		if (!isTranslationProviderId(provider)) {
			this.settings.currentProvider = DEFAULT_SETTINGS.currentProvider;
			this.settings.currentProviderConfig = getDefaultProviderConfig(DEFAULT_SETTINGS.currentProvider);
		}
		this.settings.currentProviderConfig = {
			...getDefaultProviderConfig(this.settings.currentProvider),
			...this.settings.currentProviderConfig,
		};
		this.settings.ttsConfig = {
			...getDefaultTtsConfig(this.settings.ttsProvider),
			...this.settings.ttsConfig,
		};
		this.settings.imageBaseUrl = this.settings.imageBaseUrl || DEFAULT_SETTINGS.imageBaseUrl;
		if (this.settings.imageModel !== "gpt-image-2" && this.settings.imageModel !== "gpt-image-1.5") {
			delete legacySettings.imageModel;
			this.settings.imageModel = DEFAULT_SETTINGS.imageModel;
		}
		this.settings.imageOutputFormat = normalizeImageOutputFormat(this.settings.imageOutputFormat);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

function normalizeImageOutputFormat(value: string): string {
	const normalized = value.trim().toLowerCase();
	return normalized === "jpeg" || normalized === "webp" ? normalized : "png";
}

function isTranslationProviderId(value: unknown): value is TranslationProviderId {
	return typeof value === "string" && value in PROVIDER_LABELS;
}
