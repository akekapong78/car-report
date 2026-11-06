/**
 * PEA Car Report PWA - Shortcut & Install Manager
 *
 * Rules:
 * 1. If running as a Shortcut / standalone PWA, HIDE all install options completely.
 * 2. NO automatic bottom banner or inline text on page.
 * 3. Install / Shortcut is triggered ONLY from the More Menu ("⚙️ เมนู").
 * 4. Android: Directly prompts native installation (สร้างให้เลย).
 * 5. iOS: Directly triggers native iOS Share Sheet via navigator.share (เปิดหน้าแชร์ให้แตะ "เพิ่มไปยังหน้าจอโฮม" ทันที).
 */

(function () {
  'use strict';

  // 1. Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker active:', reg.scope);
          reg.update();
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    });

    // Auto reload when service worker updates to latest version
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }

  // 2. Detection of Shortcut / Standalone Mode
  function isRunningStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://') ||
      localStorage.getItem('pea_car_installed') === 'true' ||
      window.location.search.includes('source=pwa') ||
      window.location.search.includes('homescreen=1')
    );
  }

  const isStandalone = isRunningStandalone();
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  let deferredPrompt = null;

  // Mark body class immediately
  if (isStandalone) {
    document.documentElement.classList.add('is-pwa-standalone');
    if (document.body) document.body.classList.add('is-pwa-standalone');
  }

  // 3. Capture beforeinstallprompt (Android / Chrome)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] beforeinstallprompt captured and ready');
  });

  // 4. Capture appinstalled
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] Installed successfully!');
    deferredPrompt = null;
    try {
      localStorage.setItem('pea_car_installed', 'true');
    } catch (e) {}
    document.documentElement.classList.add('is-pwa-standalone');
    if (document.body) document.body.classList.add('is-pwa-standalone');
    hideAllInstallButtons();
    showToast('🎉 ติดตั้งแอปบนหน้าจอโฮมเรียบร้อยแล้ว!');
  });

  function hideAllInstallButtons() {
    document.querySelectorAll('#headerInstallBtn, .pwa-header-btn').forEach((btn) => {
      btn.style.display = 'none';
    });
  }

  // 5. Handle Install / Shortcut Creation Trigger (จากเมนูเท่านั้น)
  async function handleInstallTrigger() {
    // A. Android / Chromium: Direct native system install prompt (สร้างให้เลย)
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA] Native prompt outcome:', outcome);
        if (outcome === 'accepted') {
          try {
            localStorage.setItem('pea_car_installed', 'true');
          } catch (e) {}
          hideAllInstallButtons();
          showToast('🎉 กำลังเพิ่มแอปไปยังหน้าจอโฮม...');
        }
        deferredPrompt = null;
        return;
      } catch (err) {
        console.warn('[PWA] deferredPrompt error:', err);
      }
    }

    // B. iOS Safari: Open native Share Sheet directly (สร้างให้เลยผ่าน Share Sheet)
    if (isIOS) {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'รายงานตรวจรถ PEA',
            text: 'ระบบรายงานตรวจรถยนต์ กฟจ.นราธิวาส',
            url: window.location.href
          });
          return;
        } catch (err) {
          // User closed share sheet without action
          if (err.name === 'AbortError') return;
        }
      }
      // Fallback modal if navigator.share fails
      showFallbackModal(true);
      return;
    }

    // C. Other Desktop / Browsers without deferredPrompt
    showFallbackModal(false);
  }

  // 6. Fallback Modal (Only created and shown when explicitly triggered and needed)
  function showFallbackModal(forIOS) {
    let modal = document.getElementById('pwaModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pwaModal';
      modal.className = 'pwa-modal-backdrop';
      modal.innerHTML = `
        <div class="pwa-modal-card">
          <div class="pwa-modal-header">
            <div class="pwa-modal-title">
              <span id="pwaModalIcon">${forIOS ? '🍎' : '📱'}</span>
              <span id="pwaModalHeading">${forIOS ? 'เพิ่มทางลัดบน iPhone (Safari)' : 'เพิ่มทางลัดบนหน้าจอมือถือ'}</span>
            </div>
            <button id="pwaModalCloseX" class="pwa-close-btn" aria-label="Close">✕</button>
          </div>
          
          <div class="pwa-step-list">
            ${forIOS ? `
              <div class="pwa-step-item">
                <div class="pwa-step-num">1</div>
                <div class="pwa-step-text">
                  แตะปุ่ม <strong>แชร์ (Share)</strong>
                  <svg style="vertical-align:middle; margin:0 3px;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5b2c82" stroke-width="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                  ที่แถบด้านล่างของ Safari
                </div>
              </div>
              <div class="pwa-step-item">
                <div class="pwa-step-num">2</div>
                <div class="pwa-step-text">
                  เลื่อนลงแล้วแตะ <strong>"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen ⊞)</strong>
                </div>
              </div>
              <div class="pwa-step-item">
                <div class="pwa-step-num">3</div>
                <div class="pwa-step-text">
                  แตะ <strong>"เพิ่ม" (Add)</strong> มุมขวาบน เพื่อสร้างทางลัด
                </div>
              </div>
            ` : `
              <div class="pwa-step-item">
                <div class="pwa-step-num">1</div>
                <div class="pwa-step-text">
                  แตะเมนู <strong>จุดสามจุด (⋮)</strong> ของเบราว์เซอร์
                </div>
              </div>
              <div class="pwa-step-item">
                <div class="pwa-step-num">2</div>
                <div class="pwa-step-text">
                  เลือก <strong>"ติดตั้งแอป" (Install)</strong> หรือ <strong>"เพิ่มลงในหน้าจอหลัก"</strong>
                </div>
              </div>
            `}
          </div>

          <button id="pwaModalDoneBtn" class="pwa-modal-close-btn">เข้าใจแล้ว ปิดหน้าต่าง</button>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('pwaModalCloseX').addEventListener('click', () => {
        modal.classList.remove('pwa-modal-open');
      });
      document.getElementById('pwaModalDoneBtn').addEventListener('click', () => {
        modal.classList.remove('pwa-modal-open');
      });
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('pwa-modal-open');
      });
    }

    // Show modal
    setTimeout(() => {
      modal.classList.add('pwa-modal-open');
    }, 10);
  }

  // Toast helper
  function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #10b981;
      color: #fff;
      padding: 10px 18px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 13px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
      z-index: 100001;
      transition: all 0.3s ease;
      font-family: inherit;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // Initialize
  function setup() {
    if (isStandalone) {
      hideAllInstallButtons();
      return;
    }

    // Attach click handler to #headerInstallBtn inside More Menu
    document.querySelectorAll('#headerInstallBtn, .pwa-header-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (typeof toggleMoreMenu === 'function') toggleMoreMenu(false);
        handleInstallTrigger();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
