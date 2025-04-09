import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入翻译资源文件
import translationEN from './locales/en/translation.json';
import translationZH from './locales/zh-CN/translation.json';
import translationZH_TW from './locales/zh-TW/translation.json';

// 翻译资源
const resources = {
  en: {
    translation: translationEN
  },
  'zh-CN': {
    translation: translationZH
  },
  'zh-TW': {
    translation: translationZH_TW
  }
};

i18n
  // 检测用户语言
  .use(LanguageDetector)
  // 将i18n实例传递给react-i18next
  .use(initReactI18next)
  // 初始化i18next
  .init({
    resources,
    fallbackLng: 'zh-CN', // 默认语言
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false, // 不转义特殊字符
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    }
  });

export default i18n;