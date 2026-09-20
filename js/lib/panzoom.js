/**
 * Minimal manual pan/zoom controller for an SVG element.
 * Applies a translate/scale transform to `target` based on drag and wheel
 * events on `container`.
 */
export class PanZoom {
  /**
   * @param {SVGElement} container - element receiving pointer/wheel events
   * @param {SVGGElement} target - group element the transform is applied to
   * @param {{minScale?: number, maxScale?: number}} [options]
   */
  constructor(container, target, options = {}) {
    this.container = container;
    this.target = target;
    this.minScale = options.minScale ?? 0.3;
    this.maxScale = options.maxScale ?? 2.5;

    this.x = 0;
    this.y = 0;
    this.scale = 1;

    this._dragging = false;
    this._lastX = 0;
    this._lastY = 0;
    // Batches every pointermove/wheel update into one transform write per
    // animation frame. A touchmove stream on a phone fires far more often
    // than the screen can repaint; writing the SVG transform attribute
    // synchronously on each one is the difference between "fine on a
    // desktop CPU" and "janky on a phone" described in the issue this was
    // written to fix. null means no frame is currently scheduled.
    this._rafId = null;

    // Every currently-down pointer, by id, keyed to its last known client
    // position. One entry: an ordinary drag-to-pan. Two: a pinch, handled
    // as a combined zoom (from the change in distance between the two
    // points) and pan (from the change in their midpoint), which is what
    // makes two fingers translating together at a constant distance pan
    // rather than do nothing.
    this._pointers = new Map();
    this._pinchDistance = null;
    this._pinchMid = null;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onWheel = this._onWheel.bind(this);

    this.container.addEventListener("pointerdown", this._onPointerDown);
    window.addEventListener("pointermove", this._onPointerMove);
    window.addEventListener("pointerup", this._onPointerUp);
    window.addEventListener("pointercancel", this._onPointerUp);
    this.container.addEventListener("wheel", this._onWheel, { passive: false });

    this._applyTransform();
  }

  _onPointerDown(e) {
    // Deliberately no setPointerCapture here: capturing the pointer to
    // the container retargets its later pointerup to the container too,
    // which in some browsers suppresses the click the browser would
    // otherwise synthesize on whatever child element (a tree node) the
    // press actually landed on. Every listener here is already on
    // `window`, not just the container, so a drag that leaves the SVG's
    // bounds is tracked fine without it.
    this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this._pointers.size === 2) {
      this._dragging = false;
      const [p1, p2] = this._pointers.values();
      this._pinchDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      this._pinchMid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    } else if (this._pointers.size === 1) {
      this._dragging = true;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
      this.container.classList.add("panning");
    }
  }

  _onPointerMove(e) {
    if (!this._pointers.has(e.pointerId)) return;
    this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this._pointers.size === 2) {
      this._onPinchMove();
      return;
    }

    if (!this._dragging) return;
    const dx = e.clientX - this._lastX;
    const dy = e.clientY - this._lastY;
    this._lastX = e.clientX;
    this._lastY = e.clientY;
    this.x += dx;
    this.y += dy;
    this._scheduleTransform();
  }

  _onPinchMove() {
    const [p1, p2] = this._pointers.values();
    const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

    const rect = this.container.getBoundingClientRect();
    const originX = mid.x - rect.left;
    const originY = mid.y - rect.top;
    const newScale = Math.min(this.maxScale, Math.max(this.minScale, this.scale * (distance / this._pinchDistance)));
    const ratio = newScale / this.scale;

    // Zoom anchored at the current pinch midpoint...
    this.x = originX - ratio * (originX - this.x);
    this.y = originY - ratio * (originY - this.y);
    this.scale = newScale;
    // ...then separately pan by however far that midpoint itself moved
    // since the last frame, the part a pure zoom-anchor doesn't capture.
    this.x += mid.x - this._pinchMid.x;
    this.y += mid.y - this._pinchMid.y;

    this._pinchDistance = distance;
    this._pinchMid = mid;
    this._scheduleTransform();
  }

  _onPointerUp(e) {
    this._pointers.delete(e.pointerId);

    if (this._pointers.size === 1) {
      // Dropped from a pinch back to a single finger: resume as a plain
      // drag from here rather than jumping, using whichever pointer is
      // still down as the new drag origin.
      const [remaining] = this._pointers.values();
      this._dragging = true;
      this._lastX = remaining.x;
      this._lastY = remaining.y;
      this._pinchDistance = null;
      this._pinchMid = null;
    } else if (this._pointers.size === 0) {
      this._dragging = false;
      this._pinchDistance = null;
      this._pinchMid = null;
      this.container.classList.remove("panning");
    }
  }

  _onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    this.zoomBy(delta, e.clientX, e.clientY);
  }

  _scheduleTransform() {
    if (this._rafId !== null) return;
    this._rafId = requestAnimationFrame(() => {
      this._rafId = null;
      this._applyTransform();
    });
  }

  /**
   * Zooms by a multiplicative factor, keeping the point under (clientX, clientY)
   * fixed on screen when provided; otherwise zooms toward the container center.
   */
  zoomBy(factor, clientX, clientY) {
    const rect = this.container.getBoundingClientRect();
    const cx = clientX ?? rect.left + rect.width / 2;
    const cy = clientY ?? rect.top + rect.height / 2;

    const originX = cx - rect.left;
    const originY = cy - rect.top;

    const newScale = Math.min(this.maxScale, Math.max(this.minScale, this.scale * factor));
    const ratio = newScale / this.scale;

    this.x = originX - ratio * (originX - this.x);
    this.y = originY - ratio * (originY - this.y);
    this.scale = newScale;

    this._applyTransform();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.scale = 1;
    this._applyTransform();
  }

  _applyTransform() {
    // A CSS transform style, not the SVG `transform` presentation
    // attribute: browsers reliably hand CSS transforms to the compositor,
    // where an attribute write is more likely to force a synchronous
    // recalculation of the element and everything under it.
    this.target.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.scale})`;
  }
}
