/**
 * PEA Car Report PWA - Service Worker Registration & Mobile Install Banner (Streamlined)
 */

(function () {
  'use strict';

  // 1. Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    });
  }

  // State
  let deferredPrompt = null;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  // DOM Elements injected dynamically
  function injectPWAComponents() {
    if (document.getElementById('pwaBanner')) return;

    // A. Slim Bottom Install Banner
    const banner = document.createElement('div');
    banner.id = 'pwaBanner';
    banner.className = 'pwa-banner-wrap';
    banner.innerHTML = `
      <div class="pwa-banner-left">
        <img src="icons/icon-192.png" alt="PEA Car Report" class="pwa-banner-icon" />
        <div class="pwa-banner-text">
          <div class="pwa-banner-title">เพิ่มทางลัดแอปตรวจรถ</div>
          <div class="pwa-banner-desc">เปิดใช้งานสะดวกรวดเร็วบนหน้าจอโฮม</div>
        </div>
      </div>
      <div class="pwa-banner-right">
        <button id="pwaInstallBtn" class="pwa-btn-install-mini">
          <span id="pwaInstallBtnText">${isIOS ? 'ดูวิธีติดตั้ง' : 'ติดตั้งแอป'}</span>
        </button>
        <button id="pwaDismissBtn" class="pwa-close-btn-mini" title="ปิด" aria-label="Close">✕</button>
      </div>
    `;
    document.body.appendChild(banner);

    // B. Guide Modal HTML (iOS / Universal Guide)
    const modal = document.createElement('div');
    modal.id = 'pwaModal';
    modal.className = 'pwa-modal-backdrop';
    modal.innerHTML = `
      <div class="pwa-modal-card">
        <div class="pwa-modal-header">
          <div class="pwa-modal-title">
            <span id="pwaModalIcon">📱</span>
            <span id="pwaModalHeading">วิธีเพิ่มทางลัดบนหน้าจอโฮม</span>
          </div>
          <button id="pwaModalCloseX" class="pwa-close-btn" aria-label="Close">✕</button>
        </div>
        
        <div id="pwaModalBody" class="pwa-step-list">
          <!-- Populated by JS -->
        </div>

        <button id="pwaModalDoneBtn" class="pwa-modal-close-btn">เข้าใจแล้ว ปิดหน้าต่าง</button>
      </div>
    `;
    document.body.appendChild(modal);

    // Event handlers
    document.getElementById('pwaDismissBtn').addEventListener('click', dismissBanner);
    document.getElementById('pwaInstallBtn').addEventListener('click', handleInstallClick);
    document.getElementById('pwaModalCloseX').addEventListener('click', hideGuideModal);
    document.getElementById('pwaModalDoneBtn').addEventListener('click', hideGuideModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideGuideModal();
    });

    // Attach to any #headerInstallBtn present on the page
    document.querySelectorAll('#headerInstallBtn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (typeof toggleMoreMenu === 'function') toggleMoreMenu(false);
        handleInstallClick();
      });
      if (isStandalone) {
        btn.innerHTML = '✅ <span>เปิดในแอป</span>';
      }
    });
  }

  // Intercept beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] beforeinstallprompt captured');

    // Show banner on mobile if not standalone and not recently dismissed
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && !isStandalone && !isDismissedRecently()) {
      setTimeout(showBanner, 1500);
    }
  });

  // Listen for appinstalled
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App successfully installed!');
    deferredPrompt = null;
    hideBanner();
    document.querySelectorAll('#headerInstallBtn').forEach((btn) => {
      btn.innerHTML = '✅ <span>ติดตั้งแล้ว</span>';
    });
    showToast('🎉 ติดตั้งแอปรายงานตรวจรถเรียบร้อยแล้ว!');
  });

  // Handle Install Click
  async function handleInstallClick() {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA] User choice:', outcome);
        if (outcome === 'accepted') {
          hideBanner();
        }
        deferredPrompt = null;
      } catch (err) {
        console.warn('[PWA] Prompt error:', err);
        showGuideModal(false);
      }
    } else if (isIOS) {
      showGuideModal(true);
    } else {
      showGuideModal(false);
    }
  }

  function showBanner() {
    if (isStandalone) return;
    const banner = document.getElementById('pwaBanner');
    if (banner) {
      banner.classList.add('pwa-visible');
    }
  }

  function hideBanner() {
    const banner = document.getElementById('pwaBanner');
    if (banner) {
      banner.classList.remove('pwa-visible');
    }
  }

  function dismissBanner() {
    hideBanner();
    try {
      localStorage.setItem('pwa_banner_dismissed_until', String(Date.now() + 3 * 24 * 60 * 60 * 1000));
    } catch (e) {}
  }

  function isDismissedRecently() {
    try {
      const until = localStorage.getItem('pwa_banner_dismissed_until');
      if (until && Number(until) > Date.now()) {
        return true;
      }
    } catch (e) {}
    return false;
  }

  // Guide Modal
  function showGuideModal(forceIOS = false) {
    const modal = document.getElementById('pwaModal');
    const modalHeading = document.getElementById('pwaModalHeading');
    const modalIcon = document.getElementById('pwaModalIcon');
    const modalBody = document.getElementById('pwaModalBody');
    if (!modal || !modalBody) return;

    if (isIOS || forceIOS) {
      modalIcon.textContent = '🍎';
      modalHeading.textContent = 'วิธีติดตั้งบน iPhone / iPad (Safari)';
      modalBody.innerHTML = `
        <div class="pwa-step-item">
          <div class="pwa-step-num">1</div>
          <div class="pwa-step-text">
            แตะที่ปุ่ม <strong>แชร์ (Share)</strong>
            <svg style="vertical-align:middle; margin:0 4px;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5b2c82" stroke-width="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
            ที่แถบเมนูด้านล่างของ Safari
          </div>
        </div>
        <div class="pwa-step-item">
          <div class="pwa-step-num">2</div>
          <div class="pwa-step-text">
            เลื่อนลงแล้วเลือก <strong>"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen ⊞)</strong>
          </div>
        </div>
        <div class="pwa-step-item">
          <div class="pwa-step-num">3</div>
          <div class="pwa-step-text">
            แตะคำว่า <strong>"เพิ่ม" (Add)</strong> ที่มุมบนขวา เพื่อเสร็จสิ้น
          </div>
        </div>
        <div class="pwa-ios-arrow-bounce">⬇️ แตะปุ่มแชร์ที่แถบด้านล่าง ⬇️</div>
      `;
    } else {
      modalIcon.textContent = '🤖';
      modalHeading.textContent = 'วิธีติดตั้งแอปบนหน้าจอมือถือ';
      modalBody.innerHTML = `
        <div class="pwa-step-item">
          <div class="pwa-step-num">1</div>
          <div class="pwa-step-text">
            แตะที่เมนู <strong>จุดสามจุด (⋮)</strong> ที่มุมบนหรือล่างของเบราว์เซอร์
          </div>
        </div>
        <div class="pwa-step-item">
          <div class="pwa-step-num">2</div>
          <div class="pwa-step-text">
            เลือก <strong>"ติดตั้งแอป" (Install App)</strong> หรือ <strong>"เพิ่มลงในหน้าจอหลัก" (Add to Home screen)</strong>
          </div>
        </div>
        <div class="pwa-step-item">
          <div class="pwa-step-num">3</div>
          <div class="pwa-step-text">
            กดยืนยัน <strong>"ติดตั้ง"</strong> เพื่อสร้างทางลัดบนหน้าจอโฮม
          </div>
        </div>
      `;
    }

    modal.classList.add('pwa-modal-open');
  }

  function hideGuideModal() {
    const modal = document.getElementById('pwaModal');
    if (modal) {
      modal.classList.remove('pwa-modal-open');
    }
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #10b981;
      color: #fff;
      padding: 10px 18px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 13px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      z-index: 10001;
      transition: all 0.3s ease;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    injectPWAComponents();

    // On mobile devices, show slim banner if not standalone and not dismissed
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && !isStandalone && !isDismissedRecently()) {
      setTimeout(showBanner, 1600);
    }
  }
})();
