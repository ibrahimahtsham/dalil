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

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onWheel = this._onWheel.bind(this);

    this.container.addEventListener("pointerdown", this._onPointerDown);
    window.addEventListener("pointermove", this._onPointerMove);
    window.addEventListener("pointerup", this._onPointerUp);
    this.container.addEventListener("wheel", this._onWheel, { passive: false });

    this._applyTransform();
  }

  _onPointerDown(e) {
    this._dragging = true;
    this._lastX = e.clientX;
    this._lastY = e.clientY;
    this.container.classList.add("panning");
  }

  _onPointerMove(e) {
    if (!this._dragging) return;
    const dx = e.clientX - this._lastX;
    const dy = e.clientY - this._lastY;
    this._lastX = e.clientX;
    this._lastY = e.clientY;
    this.x += dx;
    this.y += dy;
    this._applyTransform();
  }

  _onPointerUp() {
    this._dragging = false;
    this.container.classList.remove("panning");
  }

  _onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    this.zoomBy(delta, e.clientX, e.clientY);
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
    this.target.setAttribute(
      "transform",
      `translate(${this.x}, ${this.y}) scale(${this.scale})`
    );
  }
}
