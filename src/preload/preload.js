"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const api = {
    // Capture
    submitCapture: (question) => electron_1.ipcRenderer.invoke('capture:submit', { question }),
    // Questions
    listQuestions: (options) => electron_1.ipcRenderer.invoke('questions:list', options || {}),
    updateQuestion: (id, data) => electron_1.ipcRenderer.invoke('questions:update', { id, ...data }),
    deleteQuestion: (id) => electron_1.ipcRenderer.invoke('questions:delete', { id }),
    getAppNames: () => electron_1.ipcRenderer.invoke('questions:getAppNames'),
    // AI
    explainWithAI: (questionId) => electron_1.ipcRenderer.invoke('ai:explain', { questionId }),
    clearAICache: (questionId) => electron_1.ipcRenderer.invoke('ai:clearCache', { questionId }),
    onAIChunk: (callback) => {
        electron_1.ipcRenderer.on('ai:chunk', (_, { text }) => callback(text));
    },
    onAIDone: (callback) => {
        electron_1.ipcRenderer.on('ai:done', () => callback());
    },
    onAIError: (callback) => {
        electron_1.ipcRenderer.on('ai:error', (_, { message }) => callback(message));
    },
    removeAIListeners: () => {
        electron_1.ipcRenderer.removeAllListeners('ai:chunk');
        electron_1.ipcRenderer.removeAllListeners('ai:done');
        electron_1.ipcRenderer.removeAllListeners('ai:error');
    },
    // Settings
    getSetting: (key) => electron_1.ipcRenderer.invoke('settings:get', { key }),
    setSetting: (key, value) => electron_1.ipcRenderer.invoke('settings:set', { key, value }),
    getApiKey: () => electron_1.ipcRenderer.invoke('settings:getApiKey'),
    setApiKey: (apiKey) => electron_1.ipcRenderer.invoke('settings:setApiKey', { apiKey }),
    updateShortcut: (shortcut) => electron_1.ipcRenderer.invoke('settings:updateShortcut', { shortcut }),
    // Reminder
    snoozeReminder: () => electron_1.ipcRenderer.invoke('reminder:snooze'),
    getPendingCount: () => electron_1.ipcRenderer.invoke('reminder:getPendingCount'),
    onReminderShow: (callback) => {
        electron_1.ipcRenderer.on('reminder:show', () => callback());
    },
    removeReminderListener: () => {
        electron_1.ipcRenderer.removeAllListeners('reminder:show');
    },
    // Window
    hideCapture: () => electron_1.ipcRenderer.invoke('window:hideCapture'),
    openExternal: (url) => electron_1.ipcRenderer.invoke('window:openExternal', { url }),
    getScreenshotPath: (path) => electron_1.ipcRenderer.invoke('window:getScreenshotPath', { screenshotPath: path }),
    onNavigateSettings: (callback) => {
        electron_1.ipcRenderer.on('navigate:settings', () => callback());
    },
    removeNavigateSettingsListener: () => {
        electron_1.ipcRenderer.removeAllListeners('navigate:settings');
    },
    onQuestionsUpdated: (callback) => {
        electron_1.ipcRenderer.on('questions:updated', () => callback());
    },
    removeQuestionsUpdatedListener: () => {
        electron_1.ipcRenderer.removeAllListeners('questions:updated');
    },
    onCaptureFocus: (callback) => {
        electron_1.ipcRenderer.on('capture:focus', () => callback());
    },
    removeCaptureFocusListener: () => {
        electron_1.ipcRenderer.removeAllListeners('capture:focus');
    }
};
electron_1.contextBridge.exposeInMainWorld('electronAPI', api);
