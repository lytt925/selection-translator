import {normalizeLocale, t, type PluginLocale} from "../i18n";
import {getDefaultProviderConfig, PROVIDER_KINDS} from "../translation/provider-config";
import type {TranslationProviderId} from "../translation/types";
import {getDefaultTtsConfig} from "../tts/tts-service";
import type {TranslationPluginSettings} from "./types";

export const DEFAULT_SETTINGS: TranslationPluginSettings = {
	sourceLanguage: "auto",
	targetLanguage: "zh-CN",
	showSourceText: true,
	useSidebarResultPanel: false,
	pluginLanguage: "auto",

	currentProvider: "openai",
	currentProviderConfig: getDefaultProviderConfig("openai"),
	requestTimeout: 15000,
	maxRetries: 3,

	ttsEnabled: false,
	ttsProvider: "web-speech",
	ttsConfig: getDefaultTtsConfig("web-speech"),
	ttsVoice: "",
	ttsRate: 1,
	ttsPitch: 1,
	ttsVolume: 1,

	translationPromptId: null,
	translationPromptProfiles: [],

	enableCache: true,
	reuseSameTextCache: true,
	cacheByTargetLanguage: true,
	cacheByProvider: true,
	cacheLimit: 300,
	cacheMaxAgeDays: 30,
	autoCleanCache: true,
	translationCache: [],
	documentTranslationLinks: [],

	enableImmersiveTranslation: false,
	immersiveMode: "bilingual",
	immersiveStyle: "weakened",
	immersiveQueueRate: 3,
	immersiveQueueCapacity: 3,
	immersiveCustomCss: "",

	hideApiKeys: true,

	enableImageTools: false,
	imageApiKey: "",
	imageBaseUrl: "https://api.openai.com/v1",
	imageModel: "gpt-image-1.5",
	imageTranslationPrompt: "Translate all visible text in the image into the target language. Preserve the original layout, colors, typography, visual style, and overall composition as much as possible.",
	imageOutputFormat: "png",
};

const TARGET_LANGUAGE_KEYS = [
	"zh-CN",
	"zh-TW",
	"en",
	"ja",
	"ko",
	"fr",
	"de",
	"es",
	"pt",
	"it",
	"ru",
	"nl",
	"pl",
	"sv",
	"ar",
	"th",
	"vi",
	"hi",
	"id",
	"tr",
] as const;

type TargetLanguageKey = typeof TARGET_LANGUAGE_KEYS[number];

export const SETTINGS_TABS = [
	{key: "basic", labelKey: "settings.tabs.basic"},
	{key: "api", labelKey: "settings.tabs.api"},
	{key: "dashboard", labelKey: "settings.tabs.dashboard"},
	{key: "prompt", labelKey: "settings.tabs.prompt"},
	{key: "tts", labelKey: "settings.tabs.tts"},
	{key: "image", labelKey: "settings.tabs.image"},
	{key: "result", labelKey: "settings.tabs.result"},
	{key: "advanced", labelKey: "settings.tabs.advanced"},
	{key: "about", labelKey: "settings.tabs.about"},
] as const;

const MACHINE_TRANSLATION_TARGETS: Record<string, TargetLanguageKey[]> = {
	deepl: ["zh-CN", "zh-TW", "en", "ja", "ko", "fr", "de", "es", "pt", "it", "ru", "nl", "pl", "sv"],
	baidu: ["zh-CN", "zh-TW", "en", "ja", "ko", "fr", "de", "es", "pt", "it", "ru", "ar", "th", "vi"],
	youdao: ["zh-CN", "zh-TW", "en", "ja", "ko", "fr", "de", "es", "pt", "it", "ru", "ar", "hi", "vi", "id"],
	deeplx: ["zh-CN", "zh-TW", "en", "ja", "ko", "fr", "de", "es", "pt", "it", "ru", "nl", "pl", "sv"],
	"google-cloud-translate": ["zh-CN", "zh-TW", "en", "ja", "ko", "fr", "de", "es", "pt", "it", "ru", "nl", "pl", "sv", "ar", "th", "vi", "hi", "id", "tr"],
	"azure-translator": ["zh-CN", "zh-TW", "en", "ja", "ko", "fr", "de", "es", "pt", "it", "ru", "nl", "pl", "sv", "ar", "th", "vi", "hi", "id", "tr"],
	"aws-translate": ["zh-CN", "zh-TW", "en", "ja", "ko", "fr", "de", "es", "pt", "it", "ru", "nl", "pl", "sv", "ar", "th", "vi", "hi", "id", "tr"],
};

export function getSourceLanguageOptions(locale?: string): Record<string, string> {
	const normalizedLocale = normalizeLocale(locale);
	return {
		auto: t(normalizedLocale, "language.auto"),
		...getLocalizedTargetLanguages(normalizedLocale),
	};
}

export function getTargetLanguageOptions(provider: TranslationProviderId, locale?: string): Record<string, string> {
	const normalizedLocale = normalizeLocale(locale);
	if (PROVIDER_KINDS[provider] !== "pure-translation") {
		return getLocalizedTargetLanguages(normalizedLocale);
	}

	const supported = MACHINE_TRANSLATION_TARGETS[provider];
	if (!supported) {
		return getLocalizedTargetLanguages(normalizedLocale);
	}

	return Object.fromEntries(supported.map(key => [key, t(normalizedLocale, `language.${key}`)]));
}

export function getImmersiveModeOptions(locale?: string): Record<string, string> {
	const normalizedLocale = normalizeLocale(locale);
	return {
		bilingual: t(normalizedLocale, "immersive.mode.bilingual"),
		"translation-only": t(normalizedLocale, "immersive.mode.translationOnly"),
		hover: t(normalizedLocale, "immersive.mode.hover"),
		write: t(normalizedLocale, "immersive.mode.write"),
	};
}

export function getImmersiveStyleOptions(locale?: string): Record<string, string> {
	const normalizedLocale = normalizeLocale(locale);
	return {
		blockquote: t(normalizedLocale, "immersive.style.blockquote"),
		weakened: t(normalizedLocale, "immersive.style.weakened"),
		border: t(normalizedLocale, "immersive.style.border"),
		background: t(normalizedLocale, "immersive.style.background"),
		custom: t(normalizedLocale, "immersive.style.custom"),
	};
}

export function getLanguageLabel(language: string, locale?: string): string {
	return t(normalizeLocale(locale), `language.${language}`);
}

function getLocalizedTargetLanguages(locale: PluginLocale): Record<string, string> {
	return Object.fromEntries(TARGET_LANGUAGE_KEYS.map(key => [key, t(locale, `language.${key}`)]));
}
