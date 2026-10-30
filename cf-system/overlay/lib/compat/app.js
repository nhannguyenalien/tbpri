// Bản thay thế `firebase/app`: không còn gì để khởi tạo.
const APP = { name: '[DEFAULT]', options: {} };
export const initializeApp = () => APP;
export const getApps = () => [APP];
export const getApp = () => APP;
