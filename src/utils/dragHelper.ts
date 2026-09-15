import { useEffect } from 'react';

/**
 * Auto-scroll the window smoothly when dragging near viewport edges.
 * Supports both desktop mouse drag and mobile touch drag across long lists (50-100+ items).
 */
export function useDragAutoScroll(isDragging: boolean) {
  useEffect(() => {
    if (!isDragging) return;

    let animationFrameId: number | null = null;
    let scrollSpeed = 0;

    const performScroll = () => {
      if (scrollSpeed !== 0) {
        window.scrollBy(0, scrollSpeed);
        animationFrameId = requestAnimationFrame(performScroll);
      } else {
        animationFrameId = null;
      }
    };

    const updateScrollSpeed = (clientY: number) => {
      const threshold = 120;
      const topDist = clientY;
      const bottomDist = window.innerHeight - clientY;

      if (topDist < threshold && topDist >= 0) {
        // Scroll up - speed scales with distance to top
        scrollSpeed = -Math.max(6, Math.round(((threshold - topDist) / threshold) * 25));
        if (!animationFrameId) {
          animationFrameId = requestAnimationFrame(performScroll);
        }
      } else if (bottomDist < threshold && bottomDist >= 0) {
        // Scroll down - speed scales with distance to bottom
        scrollSpeed = Math.max(6, Math.round(((threshold - bottomDist) / threshold) * 25));
        if (!animationFrameId) {
          animationFrameId = requestAnimationFrame(performScroll);
        }
      } else {
        scrollSpeed = 0;
      }
    };

    const handleDragOver = (e: DragEvent) => {
      updateScrollSpeed(e.clientY);
    };

    const handlePointerMove = (e: PointerEvent) => {
      updateScrollSpeed(e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        updateScrollSpeed(e.touches[0].clientY);
      }
    };

    const stopScroll = () => {
      scrollSpeed = 0;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('dragend', stopScroll);
    window.addEventListener('drop', stopScroll);
    window.addEventListener('pointerup', stopScroll);
    window.addEventListener('pointercancel', stopScroll);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', stopScroll);
    window.addEventListener('touchcancel', stopScroll);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('dragend', stopScroll);
      window.removeEventListener('drop', stopScroll);
      window.removeEventListener('pointerup', stopScroll);
      window.removeEventListener('pointercancel', stopScroll);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', stopScroll);
      window.removeEventListener('touchcancel', stopScroll);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isDragging]);
}

/**
 * Resolves the drag item ID, Index and Group ID under pointer coordinates for mouse/touch
 */
export function getPointerDragTarget(
  clientX: number,
  clientY: number,
  selector: string = '[data-drag-item="true"]'
): {
  id: string | null;
  index: number | null;
  groupId: string | null;
  element: HTMLElement | null;
} {
  try {
    const el = document.elementFromPoint(clientX, clientY);
    const item = (el?.closest(selector) as HTMLElement) || null;
    if (!item) return { id: null, index: null, groupId: null, element: null };
    const id = item.getAttribute('data-drag-id');
    const idxStr = item.getAttribute('data-drag-index');
    const groupId = item.getAttribute('data-drag-group-id') || item.getAttribute('data-drag-title-id');
    const index = idxStr !== null ? parseInt(idxStr, 10) : null;
    return { id, index: index !== null && !isNaN(index) ? index : null, groupId, element: item };
  } catch (e) {
    return { id: null, index: null, groupId: null, element: null };
  }
}

/**
 * Resolves the drag item ID and Index under touch coordinates for mobile devices
 */
export function getTouchDragTarget(
  touch: { clientX: number; clientY: number },
  selector: string = '[data-drag-item="true"]'
): {
  id: string | null;
  index: number | null;
} {
  try {
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const item = el?.closest(selector);
    if (!item) return { id: null, index: null };
    const id = item.getAttribute('data-drag-id');
    const idxStr = item.getAttribute('data-drag-index');
    const index = idxStr !== null ? parseInt(idxStr, 10) : null;
    return { id, index: index !== null && !isNaN(index) ? index : null };
  } catch (e) {
    return { id: null, index: null };
  }
}

