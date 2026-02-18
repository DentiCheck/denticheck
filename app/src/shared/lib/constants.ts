export const APP_SCHEME = 'denticheck://';
export const BASE_URL = 'http://10.0.2.2:8080';
/** 공유 링크용 웹 URL (하이퍼링크 인식용). 배포 시 실제 웹 도메인으로 설정 */
export const SHARE_WEB_BASE_URL = process.env.EXPO_PUBLIC_SHARE_WEB_BASE_URL ?? BASE_URL;
export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_CLIENT_ID = 'mock-client-id';
export const GOOGLE_REDIRECT_URI = 'http://10.0.2.2:8080/login/oauth2/code/google';
