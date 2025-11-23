import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// 修复移动端Safari高度问题
const setViewportHeight = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};

// 确保DOM加载完成
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setViewportHeight();
  });
} else {
  setViewportHeight();
}

window.addEventListener('resize', setViewportHeight);
window.addEventListener('orientationchange', () => {
  setTimeout(setViewportHeight, 100);
});

// 错误处理
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});

try {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  rootElement.innerHTML = `
    <div style="padding: 20px; color: white; background: #02000A; height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column;">
      <h1>加载错误</h1>
      <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
      <p style="font-size: 12px; margin-top: 20px;">请刷新页面重试</p>
    </div>
  `;
}

