import type {TranslationPromptProfile, TranslationProviderConfig, TranslationProviderId} from "../translation/types";
import type {PluginLanguageSetting} from "../i18n";
import type {TtsConfig, TtsProviderId} from "../tts/tts-service";

export interface TranslationCacheSettingEntry {
	key: string;
	text: string;
	createdAt: number;
}

export interface DocumentTranslationLinkSettingEntry {
	sourcePath: string;
	translatedPath: string;
	targetLanguage: string;
	provider: string;
	promptUseCase: "translated-file";
	sourceHash: string;
	generatedBodyHash: string;
	updatedAt: string;
}

export interface TranslationPluginSettings {
	sourceLanguage: string;
	targetLanguage: string;
	showSourceText: boolean;
	useSidebarResultPanel: boolean;
	pluginLanguage: PluginLanguageSetting;

	currentProvider: TranslationProviderId;
	currentProviderConfig: TranslationProviderConfig;
	requestTimeout: number;
	maxRetries: number;

	ttsEnabled: boolean;
	ttsProvider: TtsProviderId;
	ttsConfig: TtsConfig;
	ttsVoice: string;
	ttsRate: number;
	ttsPitch: number;
	ttsVolume: number;

	translationPromptId: string | null;
	translationPromptProfiles: TranslationPromptProfile[];

	enableCache: boolean;
	reuseSameTextCache: boolean;
	cacheByTargetLanguage: boolean;
	cacheByProvider: boolean;
	cacheLimit: number;
	cacheMaxAgeDays: number;
	autoCleanCache: boolean;
	translationCache: TranslationCacheSettingEntry[];
	documentTranslationLinks: DocumentTranslationLinkSettingEntry[];

	enableImmersiveTranslation: boolean;
	immersiveMode: string;
	immersiveStyle: string;
	immersiveQueueRate: number;
	immersiveQueueCapacity: number;
	immersiveCustomCss: string;

	hideApiKeys: boolean;

	enableImageTools: boolean;
	imageApiKey: string;
	imageBaseUrl: string;
	imageModel: string;
	imageTranslationPrompt: string;
	imageOutputFormat: string;
}

export type BooleanKey = {[K in keyof TranslationPluginSettings]: TranslationPluginSettings[K] extends boolean ? K : never}[keyof TranslationPluginSettings];
export type StringKey = {[K in keyof TranslationPluginSettings]: TranslationPluginSettings[K] extends string ? (K extends "currentProvider" | "ttsProvider" ? never : K) : never}[keyof TranslationPluginSettings];
export type NumberKey = {[K in keyof TranslationPluginSettings]: TranslationPluginSettings[K] extends number ? K : never}[keyof TranslationPluginSettings];
