// ==UserScript==
// @name         Cali8888 Button + WebSocket Hook
// @namespace    http://tampermonkey.net/
// @version      2025-07-28
// @description  Inject a button and hook WebSocket traffic on cali8888
// @author       You
// @match        https://www.cali8888.net/*
// @match        https://*.cali8888.net/*
// @run-at       document-start
// @all-frames   true
// @inject-into  page
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // --- 1) Inject WS hook into the PAGE context early (document-start) ---
  // Using an injected <script> guarantees we're in the same JS realm as the page,
  // so overriding window.WebSocket actually affects site code.
  const inject = (fn) => {
    const s = document.createElement('script');
    s.textContent = `(${fn})();`;
    // Use <html> if <head> not available yet at document-start
    (document.head || document.documentElement).appendChild(s);
    s.remove();
  };

  inject(function hookWebSocket() {
    try {
      const OriginalWS = window.WebSocket;
      if (!OriginalWS) return;

      // Avoid double-hooking
      if (OriginalWS.__isHooked) return;

      function HookedWS(url, protocols) {
        // Create the real socket
        const ws = new OriginalWS(url, protocols);

        // Listen to messages
        ws.addEventListener('message', (ev) => {
          try {
            console.log('[WS message]', ev.data);
          } catch (_) {}
        });

        // Wrap send
        const originalSend = ws.send;
        ws.send = function (data) {
          try {
            console.log('[WS send]', data);
          } catch (_) {}
          return originalSend.call(this, data);
        };

        return ws; // return the real instance
      }

      // Preserve prototype & static members
      HookedWS.prototype = OriginalWS.prototype;
      Object.setPrototypeOf(HookedWS, OriginalWS);
      // Copy common constants (some browsers still keep these)
      try {
        HookedWS.CONNECTING = OriginalWS.CONNECTING;
        HookedWS.OPEN = OriginalWS.OPEN;
        HookedWS.CLOSING = OriginalWS.CLOSING;
        HookedWS.CLOSED = OriginalWS.CLOSED;
      } catch (_) {}

      // Swap
      window.WebSocket = HookedWS;
      // Mark to prevent re-hook
      window.WebSocket.__isHooked = true;

      // Optional: expose a quick toggle to silence logs
      window.__wsHookLogEnabled = true;
      const _log = console.log;
      console.log = function (...args) {
        if (window.__wsHookLogEnabled) _log.apply(console, args);
      };
    } catch (e) {
      // Best-effort; never break the page
      try { console.warn('WS hook failed:', e); } catch (_) {}
    }
  });

  // --- 2) DOM: add button & styles when ready (since we run at document-start) ---
  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  onReady(() => {
    // Style (use native <style> to avoid CSP issues with GM_addStyle)
    const style = document.createElement('style');
    style.textContent = `
      .my-btn {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 9999;
        padding: 10px;
        background-color: #333;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);

    // Button
    const btn = document.createElement('button');
    btn.textContent = 'Notion 123123';
    btn.className = 'my-btn';
    btn.onclick = () => alert('tampered by tampermonkey');

    document.body.appendChild(btn);
  });
})();
