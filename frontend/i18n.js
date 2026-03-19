import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './translations/en.json';
import hi from './translations/hi.json';
import bn from './translations/bn.json';
import ta from './translations/ta.json';
import te from './translations/te.json';
import mr from './translations/mr.json';
import kn from './translations/kn.json';
import pa from './translations/pa.json';
import ml from './translations/ml.json';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  bn: { translation: bn },
  ta: { translation: ta },
  te: { translation: te },
  mr: { translation: mr },
  kn: { translation: kn },
  pa: { translation: pa },
  ml: { translation: ml },
};

const LANGUAGE_DETECTOR = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    try {
      const savedData = await AsyncStorage.getItem('user-language');
      if (savedData) {
        return callback(savedData);
      }
      const locales = Localization.getLocales();
      return callback(locales[0].languageCode || 'en');
    } catch (error) {
      console.log('Error fetching language', error);
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: async (language) => {
    try {
      await AsyncStorage.setItem('user-language', language);
    } catch (error) {
      console.log('Error saving language', error);
    }
  },
};

i18n
  .use(LANGUAGE_DETECTOR)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
