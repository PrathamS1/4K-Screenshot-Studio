chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'start_full_capture') {
    captureFullPage();
  }
});

function forceLoadAllImages() {
  const images = document.querySelectorAll('img');
  images.forEach(img => {
    if (img.getAttribute('loading') === 'lazy') {
      img.removeAttribute('loading');
    }
    const lazySrc = img.getAttribute('data-src') || img.getAttribute('lazy-src') || img.getAttribute('data-original');
    if (lazySrc) {
      img.src = lazySrc;
    }
  });
}

function overrideGSAP() {
  if (window.ScrollTrigger) {
    try {
      window.ScrollTrigger.getAll().forEach(trigger => {
        trigger.scroll(trigger.end);
        trigger.refresh();
      });
      console.log("4K Screenshotter: GSAP ScrollTriggers overridden to final states.");
    } catch (e) {
      console.warn("4K Screenshotter: Failed to override GSAP triggers:", e);
    }
  }
}

async function captureFullPage() {
  // Force load lazy-loaded image sources
  forceLoadAllImages();
  
  // Jump GSAP-driven triggers and timelines directly to their final states
  overrideGSAP();

  // 1. Setup and hide scrollbars, disable animations
  const style = document.createElement('style');
  style.textContent = `
    ::-webkit-scrollbar { display: none !important; }
    html { scrollbar-width: none !important; overflow: hidden !important; }
    body { scrollbar-width: none !important; overflow: hidden !important; }
    
    /* Disable all animations and transitions to prevent mid-animation captures */
    *, *::before, *::after {
      transition-duration: 0s !important;
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-delay: 0s !important;
      scroll-behavior: auto !important;
    }
    
    /* Force override on typical inline opacity/visibility hiding attributes */
    [style*="opacity: 0"], [style*="opacity:0"] {
      opacity: 1 !important;
    }
    [style*="visibility: hidden"], [style*="visibility:hidden"] {
      visibility: visible !important;
    }
    
    /* Force reveal for common scroll animation libraries */
    [data-aos], .aos-init, .aos-animate, 
    .wow, 
    .framer-motion,
    [class*="reveal"], [class*="fade"], [class*="animate"], [class*="appear"] {
      opacity: 1 !important;
      transform: none !important;
      visibility: visible !important;
    }
  `;

  const originalScrollBehavior = document.documentElement.style.scrollBehavior;
  const fixedElements = [];

  try {
    document.head.appendChild(style);
    document.documentElement.style.scrollBehavior = 'auto';

    // 2. Pre-scroll to load lazy content and trigger observers
    let currentScrollY = 0;
    const preScrollStep = window.innerHeight / 2;
    while (currentScrollY < document.documentElement.scrollHeight) {
      currentScrollY += preScrollStep;
      window.scrollTo(0, currentScrollY);
      await wait(50);
      if (currentScrollY > 15000) break; // Safety limit
    }
    window.scrollTo(0, 0);
    await wait(800); // Wait for top to render again and animations to settle

    // Recalculate total height after pre-scroll and cap at safe limits (max 12,000px logical height)
    let totalHeight = Math.max(
      document.body.scrollHeight, document.documentElement.scrollHeight,
      document.body.offsetHeight, document.documentElement.offsetHeight,
      document.body.clientHeight, document.documentElement.clientHeight
    );
    
    if (totalHeight > 12000) {
      console.warn("4K Screenshotter: Capping extremely tall page to 12000px to prevent canvas memory limits.");
      totalHeight = 12000;
    }
    
    const viewportHeight = window.innerHeight;

    // 3. Freeze fixed and sticky elements
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_ELEMENT);
    let node;
    while ((node = walker.nextNode())) {
      const compStyle = window.getComputedStyle(node);
      if (compStyle.position === 'fixed') {
        const rect = node.getBoundingClientRect();
        fixedElements.push({
          el: node,
          position: node.style.position,
          top: node.style.top,
          left: node.style.left,
          width: node.style.width,
          height: node.style.height,
          margin: node.style.margin,
          transform: node.style.transform
        });
        node.style.setProperty('position', 'absolute', 'important');
        node.style.setProperty('top', (rect.top + window.scrollY) + 'px', 'important');
        node.style.setProperty('left', (rect.left + window.scrollX) + 'px', 'important');
        node.style.setProperty('width', rect.width + 'px', 'important');
        node.style.setProperty('height', rect.height + 'px', 'important');
        node.style.setProperty('margin', '0', 'important');
        node.style.setProperty('transform', 'none', 'important');
      } else if (compStyle.position === 'sticky') {
        fixedElements.push({
          el: node,
          position: node.style.position
        });
        node.style.setProperty('position', 'relative', 'important');
      }
    }

    // Wait a bit for layout to settle after changing positions
    await wait(200);

    // 4. Take first screenshot to get exact pixel dimensions
    const firstFrameResponse = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'store_part' }, response => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(response);
      });
    });
    
    if (!firstFrameResponse || !firstFrameResponse.dataUrl) {
      throw new Error("Failed to capture first screen segment");
    }
    
    const firstImg = await loadImage(firstFrameResponse.dataUrl);
    const pixelRatio = firstImg.width / window.innerWidth;
    
    const canvas = document.createElement('canvas');
    canvas.width = firstImg.width;
    canvas.height = Math.round(totalHeight * pixelRatio);
    const ctx = canvas.getContext('2d');
    
    // Fill background to prevent black lines on fractional pixel gaps
    let bgColor = window.getComputedStyle(document.body).backgroundColor;
    if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
      bgColor = '#ffffff';
    }
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.imageSmoothingEnabled = false; // Disable smoothing to prevent blurry seams

    // Draw first frame
    ctx.drawImage(firstImg, 0, 0);

    // 5. Scroll and capture the rest
    let yPos = 0;
    const overlap = 30; // 30 pixels of overlap to completely eliminate horizontal line gaps
    const scrollStep = viewportHeight - overlap;

    while (yPos + viewportHeight < totalHeight) {
      yPos += scrollStep;
      if (yPos + viewportHeight > totalHeight) {
        yPos = totalHeight - viewportHeight;
      }
      
      window.scrollTo(0, Math.floor(yPos));
      await wait(400); // Increased wait time to ensure IntersectionObservers fire and render
      
      const actualY = window.scrollY;
      
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'store_part' }, response => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(response);
        });
      });
      
      if (!response || !response.dataUrl) {
        throw new Error("Failed to capture visible segment at y-axis coordinate " + actualY);
      }
      
      const img = await loadImage(response.dataUrl);
      
      // Draw the image at the exact scroll position.
      ctx.drawImage(img, 0, Math.round(actualY * pixelRatio));
      
      if (actualY + viewportHeight >= totalHeight) {
        break;
      }
    }

    // 6. Restore page coordinates
    window.scrollTo(0, 0);

    // 7. Download stitched image
    const finalDataUrl = canvas.toDataURL('image/png', 1.0);
    
    // Download directly from content script to avoid sendMessage size limits
    const date = new Date();
    const timestamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}-${String(date.getSeconds()).padStart(2, '0')}`;
    const filename = `screenshot_full_${timestamp}.png`;
    
    const a = document.createElement('a');
    a.href = finalDataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Save to storage and tell background to open editor
    chrome.storage.local.set({ latestScreenshot: finalDataUrl }, () => {
      chrome.runtime.sendMessage({ action: 'open_editor' });
    });

  } catch (error) {
    console.error("4K Screenshotter: Error during full page capture:", error);
    alert("Full page screenshot capture failed: " + error.message);
  } finally {
    // 8. CRITICAL RECOVERY CLEANUP: Always restore styles, scrollbars, elements and reset debugger
    fixedElements.forEach(item => {
      if (item.el) {
        item.el.style.position = item.position;
        if (item.top !== undefined) item.el.style.top = item.top;
        if (item.left !== undefined) item.el.style.left = item.left;
        if (item.width !== undefined) item.el.style.width = item.width;
        if (item.height !== undefined) item.el.style.height = item.height;
        if (item.margin !== undefined) item.el.style.margin = item.margin;
        if (item.transform !== undefined) item.el.style.transform = item.transform;
      }
    });

    if (style.parentNode) {
      style.parentNode.removeChild(style);
    }
    document.documentElement.style.scrollBehavior = originalScrollBehavior;

    // Reset emulations and detach debugger in background
    chrome.runtime.sendMessage({ action: 'capture_complete' });
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}