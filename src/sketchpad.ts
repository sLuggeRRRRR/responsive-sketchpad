export default class Sketchpad {
  readonly canvas: HTMLCanvasElement;

  private readonly ctx: CanvasRenderingContext2D;
  private sketching = false;
  private isEraserActive = false;
  private _strokes: Array<Stroke> = []; // v2.0 - Rename to strokes
  private undoneStrokes: Array<Stroke> = [];

  // Options
  private backgroundColor?: string;
  private readOnly = false;
  private aspectRatio = 1; // v2.0 - Remove; rely on canvas as source-of-truth
  private lineWidth = 5;
  private lineColor = '#000';
  private lineCap: CanvasLineCap = 'round';
  private lineJoin: CanvasLineJoin = 'round';
  private lineMiterLimit = 10;
  private isInterpolationDone = false;
  private eraserSize = 20;
  private onDrawEnd?: () => void; // v2.0 - Remove
  circleCursor: HTMLDivElement | undefined;
  updateCircleCursor: ((e: MouseEvent | TouchEvent) => void) | undefined;

  constructor(el: HTMLElement, opts?: SketchpadOptionsI) {
    if (el == null) {
      throw new Error('Must pass in a container element');
    }
    if (opts != null) {
      this.setOptions(opts);
    }

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

    const width = opts?.width || el.clientWidth;
    const height = opts?.height || width * this.aspectRatio;
    this.setCanvasSize(width, height);

    el.appendChild(this.canvas);

    if (this._strokes.length > 0) {
      this.redraw();
    }

    this.listen();
  }

  // v2.0 - Remove; rename `_strokes`
  get strokes(): Array<StrokeI> {
    return this._strokes.map(function (stroke) {
      return {
        points: stroke.points,
        size: stroke.width,
        color: stroke.color,
        cap: stroke.cap,
        join: stroke.join,
        miterLimit: stroke.miterLimit,
        isInterpolationDone: stroke.isInterpolationDone,
      };
    });
  }

  // v2.0 - Remove
  get undos(): Array<StrokeI> {
    return this.undoneStrokes.map((s) => s.toObj());
  }

  // v2.0 - Remove
  get opts(): SketchpadOptionsI {
    return {
      backgroundColor: this.backgroundColor,
      readOnly: this.readOnly,
      width: this.canvas.width,
      height: this.canvas.height,
      aspectRatio: this.canvas.width / this.canvas.height,
      line: {
        size: this.lineWidth,
        color: this.lineColor,
        cap: this.lineCap,
        join: this.lineJoin,
        miterLimit: this.lineMiterLimit,
        isInterpolationDone: this.isInterpolationDone,
      },
    };
  }

  // Convert the sketchpad to a JSON object that can be loaded into
  // other sketchpads or stored on a server
  toJSON(): DataI {
    return {
      aspectRatio: this.canvas.width / this.canvas.height,
      strokes: this.strokes,
    };
  }

  // Load a json object into the sketchpad
  loadJSON(data: DataI): void {
    const strokeObjs = data.strokes || [];
    this._strokes = strokeObjs.map((s) => Stroke.fromObj(s));
    this.redraw();
  }

  // Converts to image File
  toDataURL(type: string): string {
    return this.canvas.toDataURL(type);
  }

  // Set the size of canvas
  setCanvasSize(width: number, height: number): void {
    this.canvas.setAttribute('width', width.toString());
    this.canvas.setAttribute('height', height.toString());
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
  }

  // Get the size of the canvas
  getCanvasSize(): RectI {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }

  // Set the line width
  setLineWidth(width: number): void {
    this.lineWidth = width;
  }

  // Set the eraser size
  setEraserSize(size: number): void {
    this.eraserSize = size;
    this.updateEraserIndicatorSize();
  }

  toggleEraserMode(): void {
    this.isEraserActive = !this.isEraserActive;
  }

  // Set the line width
  setLineSize(size: number): void {
    this.lineWidth = size;
  }

  // Set the line color
  setLineColor(color: string): void {
    this.lineColor = color;
  }

  // Set whether or not new strokes can be drawn on the canvas
  setReadOnly(readOnly: boolean): void {
    this.readOnly = readOnly;
  }

  // Undo the last stroke
  undo(): void {
    if (this._strokes.length === 0) {
      return;
    }

    this.undoneStrokes.push(this._strokes.pop() as Stroke);
    this.redraw();
  }

  // Redo the last undone stroke
  redo(): void {
    if (this.undoneStrokes.length === 0) {
      return;
    }

    this._strokes.push(this.undoneStrokes.pop() as Stroke);
    this.redraw();
  }

  // Clear the sketchpad
  clear(): void {
    this.undoneStrokes = [];
    this._strokes = [];
    this.redraw();
  }

  // Draw a straight line
  drawLine(start: PointI, end: PointI, lineOpts: LineOptionsI): void {
    this.setOptions({ line: lineOpts });
    start = this.getPointRelativeToCanvas(new Point(start.x, start.y));
    end = this.getPointRelativeToCanvas(new Point(end.x, end.y));
    this.pushStroke([start, end]);
    this.redraw();
  }

  // Resize the canvas maintaining original aspect ratio
  resize(width: number): void {
    const height = width * this.aspectRatio;
    this.lineWidth = this.lineWidth * (width / this.canvas.width);
    this.eraserSize = this.eraserSize * (width / this.canvas.width);

    this.setCanvasSize(width, height);
    this.redraw();
  }

  // Returns a points x,y locations relative to the size of the canvas
  getPointRelativeToCanvas(point: PointI): PointI {
    return {
      x: point.x / this.canvas.width,
      y: point.y / this.canvas.height,
      skipped: false,
    };
  }

  //  Get the line size relative to the size of the canvas
  getLineSizeRelativeToCanvas(width: number): number {
    return width / this.canvas.width;
  }

  updateEraserIndicatorSize(): void {
    if (this.isEraserActive && this.updateCircleCursor) {
      const circleCursor = this.canvas.parentNode?.lastChild as HTMLDivElement;

      circleCursor.style.width = `${this.eraserSize}px`;
      circleCursor.style.height = `${this.eraserSize}px`;

      this.updateCircleCursor(new MouseEvent('mousemove'));
    }
  }

  private setOptions(opts: SketchpadOptionsI): void {
    if (opts.backgroundColor) {
      this.backgroundColor = opts.backgroundColor;
    }
    if (opts.line?.size) {
      this.lineWidth = opts.line.size;
    }
    if (opts.line?.isInterpolationDone) {
      this.isInterpolationDone = opts.line.isInterpolationDone;
    }
    if (opts.line?.cap) {
      this.lineCap = opts.line.cap;
    }
    if (opts.line?.join) {
      this.lineJoin = opts.line.join;
    }
    if (opts.line?.miterLimit) {
      this.lineMiterLimit = opts.line.miterLimit;
    }
    if (opts.aspectRatio) {
      this.aspectRatio = opts.aspectRatio;
    }
    if (opts.data) {
      this._strokes = opts.data.strokes?.map((s) => Stroke.fromObj(s)) ?? [];
    }
    if (opts.onDrawEnd) {
      this.onDrawEnd = opts.onDrawEnd;
    }
  }

  // For a given event, get the point at which the event occurred
  // relative to the canvas
  private getCursorRelativeToCanvas(e: Event): Point {
    let point: Point;
    const rect = this.canvas.getBoundingClientRect();

    if (isTouchEvent(e)) {
      const touchEvent = e as TouchEvent;
      point = new Point(touchEvent.touches[0].clientX - rect.left, touchEvent.touches[0].clientY - rect.top);
    } else {
      const mouseEvent = e as MouseEvent;
      point = new Point(mouseEvent.clientX - rect.left, mouseEvent.clientY - rect.top);
    }

    return new Point(point.x / this.canvas.width, point.y / this.canvas.height);
  }

  private normalizePoint(p: Point): Point {
    return new Point(p.x * this.canvas.width, p.y * this.canvas.height);
  }

  private midPoint(p1: Point, p2: Point): Point {
    return new Point((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
  }

  private getLineWidthRelativeToCanvas(size: number): number {
    return size / this.canvas.width;
  }

  private normalizeLineWidth(width: number): number {
    return width * this.canvas.width;
  }

  // Erase the entire canvas
  private clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.backgroundColor) {
      this.ctx.fillStyle = this.backgroundColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  // Draw a single stroke
  private drawStroke(stroke: Stroke): void {
    if (stroke.points == null) return;

    this.ctx.beginPath();

    for (let i = 0; i < stroke.points.length - 1; i++) {
      const currentPoint = stroke.points[i];
      const nextPoint = stroke.points[i + 1];

      if (!(currentPoint.skipped || (nextPoint && nextPoint.skipped))) {
        const e = this.normalizePoint(currentPoint);
        const n = this.normalizePoint(nextPoint);
        this.ctx.moveTo(e.x, e.y);
        this.ctx.lineTo(n.x, n.y);
      }
    }
    this.ctx.closePath();

    if (stroke.color) {
      this.ctx.strokeStyle = stroke.color;
    }
    if (stroke.width) {
      this.ctx.lineWidth = this.normalizeLineWidth(stroke.width);
    }
    if (stroke.join) {
      this.ctx.lineJoin = stroke.join;
    }
    if (stroke.cap) {
      this.ctx.lineCap = stroke.cap;
    }
    if (stroke.miterLimit) {
      this.ctx.miterLimit = stroke.miterLimit;
    }

    this.ctx.stroke();
  }

  private drawQuadraticCurveStroke(stroke: Stroke): void {
    if (stroke.points == null) return;

    this.ctx.beginPath();

    let originPt = this.normalizePoint(stroke.points[0]);
    let controlPt = originPt;
    let destinationPt = originPt;
    if (stroke.points.length > 1) {
      destinationPt = this.normalizePoint(this.midPoint(stroke.points[0], stroke.points[1]));
    }
    if (!(originPt.skipped || (destinationPt && destinationPt.skipped))) {
      this.ctx.moveTo(originPt.x, originPt.y);
      this.ctx.quadraticCurveTo(controlPt.x, controlPt.y, destinationPt.x, destinationPt.y);
    }
    for (let i = 1; i < stroke.points.length - 1; i++) {
      originPt = destinationPt;
      controlPt = this.normalizePoint(stroke.points[i]);
      destinationPt = this.normalizePoint(this.midPoint(stroke.points[i], stroke.points[i + 1]));

      if (!(originPt.skipped || (destinationPt && destinationPt.skipped))) {
        this.ctx.quadraticCurveTo(controlPt.x, controlPt.y, destinationPt.x, destinationPt.y);
      }
    }

    if (stroke.color) {
      this.ctx.strokeStyle = stroke.color;
    }
    if (stroke.width) {
      this.ctx.lineWidth = this.normalizeLineWidth(stroke.width);
    }
    if (stroke.join) {
      this.ctx.lineJoin = stroke.join;
    }
    if (stroke.cap) {
      this.ctx.lineCap = stroke.cap;
    }
    if (stroke.miterLimit) {
      this.ctx.miterLimit = stroke.miterLimit;
    }

    this.ctx.stroke();
  }

  private pushStroke(points: Array<Point>): void {
    this._strokes.push(
      Stroke.fromObj({
        points: points,
        size: this.getLineWidthRelativeToCanvas(this.lineWidth),
        color: this.lineColor,
        cap: this.lineCap,
        join: this.lineJoin,
        miterLimit: this.lineMiterLimit,
        isInterpolationDone: this.isInterpolationDone,
      }),
    );
  }

  private pushPoint(point: Point): void {
    const stroke = this._strokes[this._strokes.length - 1];
    if (stroke.points) {
      stroke.points.push(point);
    }
  }

  // Redraw the whole canvas
  private redraw(): void {
    this.clearCanvas();
    if (this.isEraserActive) {
      this._strokes.forEach((s) => this.drawStroke(s));
    } else {
      this._strokes.forEach((s, index) => {
        if (index === this._strokes.length - 1) {
          if (this.sketching) {
            this.drawQuadraticCurveStroke(s);
          } else {
            this.drawStroke(s);
          }
        } else {
          this.drawStroke(s);
        }
      });
    }
  }

  private listen(): void {
    ['mousedown', 'touchstart'].forEach((name) =>
      this.canvas.addEventListener(name, (e) => this.startStrokeHandler(e)),
    );
    ['mousemove', 'touchmove'].forEach((name) => this.canvas.addEventListener(name, (e) => this.drawStrokeHandler(e)));
    ['mouseup', 'mouseleave', 'touchend'].forEach((name) =>
      this.canvas.addEventListener(name, (e) => this.endStrokeHandler(e)),
    );
  }

  private startStrokeHandler(e: Event): void {
    e.preventDefault();
    if (this.readOnly) {
      return;
    }

    this.sketching = true;

    const point = this.getCursorRelativeToCanvas(e);
    if (this.isEraserActive) {
      this.erasePoints(point);
    } else {
      this.pushStroke([point]);
    }
    this.redraw();
  }

  private drawStrokeHandler(e: Event): void {
    const point = this.getCursorRelativeToCanvas(e);
    e.preventDefault();
    if (!this.sketching) return;

    if (this.isEraserActive) {
      this.erasePoints(point);
    } else {
      this.pushPoint(point);
    }
    this.redraw();
  }

  private endStrokeHandler(e: Event): void {
    e.preventDefault();
    if (!this.sketching) return;
    this.sketching = false;

    if (isTouchEvent(e)) {
      return; // touchend events do not have a position
    }

    const point = this.getCursorRelativeToCanvas(e);
    if (this.isEraserActive) {
      this.erasePoints(point);
    } else {
      this.pushPoint(point);
      this.createNewStrokesAfterInterpolation(this._strokes[this._strokes.length - 1], 2);
    }
    this.createNewStrokesAfterErasing();
    this.redraw();

    if (this.onDrawEnd) {
      this.onDrawEnd();
    }
  }

  private erasePoints(cursor: Point): void {
    const eraserSize = this.getLineWidthRelativeToCanvas(this.eraserSize) / 2;
    const areaOfEraser = eraserSize * eraserSize;

    this._strokes.forEach((stroke: Stroke) => {
      // @ts-ignore
      stroke.points.forEach((point: Point) => {
        const dx = point.x - cursor.x;
        const dy = point.y - cursor.y;
        const distanceSquared = dx * dx + dy * dy;

        if (distanceSquared <= areaOfEraser) {
          point.skipped = true;
        }
      });
    });
  }

  private createNewStrokesAfterErasing(): void {
    const newStrokes = [];
    const previousStrokes: StrokeI[] = this.deepClone(this._strokes);
    for (let i = 0; i < previousStrokes.length; i++) {
      const points: PointI[] = previousStrokes[i].points || [];
      const newStroke = {
        // @ts-ignore
        width: previousStrokes[i].width,
        color: previousStrokes[i].color,
        cap: previousStrokes[i].cap,
        join: previousStrokes[i].join,
        miterLimit: previousStrokes[i].miterLimit,
        isInterpolationDone: previousStrokes[i].isInterpolationDone,
        points: [],
        toObj: () => {
          return {
            points: newStroke.points,
            size: newStroke.width,
            color: newStroke.color,
            cap: newStroke.cap,
            join: newStroke.join,
            miterLimit: newStroke.miterLimit,
            isInterpolationDone: newStroke.isInterpolationDone,
          };
        },
      };
      for (let j = 0; j < points.length; j++) {
        if (points[j].skipped) {
          if (newStroke.points.length > 0) {
            newStrokes.push(this.deepClone(newStroke));
            newStroke.points = [];
          }
        } else {
          // @ts-ignore
          newStroke.points.push(points[j]);
          if (j + 1 == points.length) {
            newStrokes.push(this.deepClone(newStroke));
          }
        }
      }
    }
    this._strokes = newStrokes;
  }

  private createNewStrokesAfterInterpolation(stroke: Stroke, interval: number): void {
    this._strokes.pop();
    const newStroke = this.interpolateExistingShapePaths(stroke, interval);
    this._strokes.push(newStroke);
  }

  private interpolateExistingShapePaths(stroke: Stroke, interval: number): Stroke {
    stroke.isInterpolationDone = true;
    const points: PointI[] = stroke.points || [];
    const transformedPoints = points.map((point) => ({
      x: point.x * this.canvas.width,
      y: point.y * this.canvas.height,
      skipped: false,
    }));
    const newStroke = {
      width: stroke.width,
      color: stroke.color,
      cap: stroke.cap,
      join: stroke.join,
      miterLimit: stroke.miterLimit,
      isInterpolationDone: stroke.isInterpolationDone,
      points: [],
      toObj: () => {
        return {
          points: newStroke.points,
          size: newStroke.width,
          color: newStroke.color,
          cap: newStroke.cap,
          join: newStroke.join,
          miterLimit: newStroke.miterLimit,
          isInterpolationDone: newStroke.isInterpolationDone,
        };
      },
    };

    // @ts-ignore
    newStroke.points.push({
      x: transformedPoints[0].x / this.canvas.width,
      y: transformedPoints[0].y / this.canvas.height,
    });
    let originPt = transformedPoints[0];
    let controlPt = originPt;
    let destinationPt = originPt;
    if (transformedPoints.length > 1) {
      destinationPt = this.midPoint(transformedPoints[0], transformedPoints[1]);
      const distance = Math.hypot(destinationPt.x - originPt.x, destinationPt.y - originPt.y);
      const numIntervals = Math.max(1, Math.ceil(distance / interval));

      const interpolatedPoints = this.interpolateQuadraticCurve(originPt, controlPt, destinationPt, numIntervals);

      interpolatedPoints.forEach((point) => {
        // @ts-ignore
        newStroke.points.push({ x: point.x / this.canvas.width, y: point.y / this.canvas.height, skipped: false });
      });
    }

    for (let j = 1; j < transformedPoints.length - 1; j++) {
      originPt = destinationPt;
      controlPt = transformedPoints[j];
      destinationPt = this.midPoint(transformedPoints[j], transformedPoints[j + 1]);

      const distance = Math.hypot(destinationPt.x - originPt.x, destinationPt.y - originPt.y);
      const numIntervals = Math.max(1, Math.ceil(distance / interval));

      const interpolatedPoints = this.interpolateQuadraticCurve(originPt, controlPt, destinationPt, numIntervals);

      interpolatedPoints.forEach((point) => {
        // @ts-ignore
        newStroke.points.push({ x: point.x / this.canvas.width, y: point.y / this.canvas.height, skipped: false });
      });
    }
    return newStroke;
  }

  private eraserModeOn(): void {
    this.isEraserActive = true;
    this.eraserModeIndicatorOn();
  }

  private eraserModeOff(): void {
    this.isEraserActive = false;
    this.eraserModeIndicatorOff();
  }

  private eraserModeIndicatorOn(): void {
    this.canvas.style.cursor = 'none'; // Hide the default cursor

    // Create a circle cursor element
    const circleCursor = document.createElement('div') as HTMLDivElement;
    circleCursor.style.position = 'absolute';
    circleCursor.style.width = `${this.eraserSize}px`;
    circleCursor.style.height = `${this.eraserSize}px`;
    circleCursor.style.border = '2px solid #000';
    circleCursor.style.borderRadius = '50%';
    circleCursor.style.pointerEvents = 'none'; // Make the cursor element not intercept mouse events
    circleCursor.style.zIndex = '999'; // Ensure the circle cursor is on top of other elements

    // Attach circle cursor to the canvas container
    this.canvas.parentNode?.appendChild(circleCursor);

    // Update circle cursor position on mouse move
    const updateCircleCursor = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Check if the mouse is within the canvas boundaries
      if (mouseX >= 0 && mouseX <= rect.width && mouseY >= 0 && mouseY <= rect.height) {
        const x = mouseX - this.eraserSize / 2;
        const y = mouseY - this.eraserSize / 2;
        circleCursor.style.left = `${x}px`;
        circleCursor.style.top = `${y}px`;
        circleCursor.style.display = 'block'; // Show the cursor only when inside the canvas
      } else {
        circleCursor.style.display = 'none'; // Hide the cursor if outside the canvas
      }
    };

    // Add event listeners to update circle cursor position
    window.addEventListener('mousemove', updateCircleCursor);

    // Store update function for later removal
    // @ts-ignore
    this.updateCircleCursor = updateCircleCursor;
  }

  private eraserModeIndicatorOff(): void {
    this.canvas.style.cursor = ''; // Restore the default cursor

    // Remove circle cursor and event listener
    if (this.updateCircleCursor) {
      const circleCursor = this.canvas.parentNode?.lastChild as HTMLDivElement;
      circleCursor?.remove();
      window.removeEventListener('mousemove', this.updateCircleCursor);
      // @ts-ignore
      this.updateCircleCursor = null;
    }
  }

  private interpolateQuadraticCurve(
    originPt: { x: number; y: number },
    controlPt: { x: number; y: number },
    destinationPt: { x: number; y: number },
    numPoints: number,
  ) {
    const interpolatedPoints = [];
    for (let pt = 0; pt < numPoints; pt += 1) {
      const t = pt / numPoints;
      const x = Math.pow(1 - t, 2) * originPt.x + 2 * (1 - t) * t * controlPt.x + Math.pow(t, 2) * destinationPt.x;
      const y = Math.pow(1 - t, 2) * originPt.y + 2 * (1 - t) * t * controlPt.y + Math.pow(t, 2) * destinationPt.y;
      interpolatedPoints.push({ x, y });
    }
    return interpolatedPoints;
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj)) as T;
  }
}

function isTouchEvent(e: Event): boolean {
  return e.type.indexOf('touch') !== -1; // v2.0 - Switch to startsWith
}

interface PointI {
  readonly x: number;
  readonly y: number;
  readonly skipped: boolean;
}

class Point implements PointI {
  constructor(
    public x: number,
    public y: number,
    public skipped: boolean = false,
  ) {}
}

interface RectI {
  readonly width: number;
  readonly height: number;
}

interface DataI {
  aspectRatio?: number;
  strokes?: Array<StrokeI>;
}

interface LineOptionsI {
  size?: number;
  color?: string;
  cap?: CanvasLineCap;
  join?: CanvasLineJoin;
  miterLimit?: number;
  isInterpolationDone?: boolean;
}

interface SketchpadOptionsI {
  backgroundColor?: string;
  readOnly?: boolean;
  width?: number;
  height?: number;
  aspectRatio?: number;
  line?: LineOptionsI;
  data?: DataI;
  onDrawEnd?: () => void;
}

interface StrokeI extends LineOptionsI {
  points?: Array<PointI>;
}

class Stroke {
  points?: Array<Point>;
  width?: number;
  color?: string;
  cap?: CanvasLineCap;
  join?: CanvasLineJoin;
  miterLimit?: number;
  isInterpolationDone?: boolean;

  static fromObj(s: StrokeI): Stroke {
    const stroke = new Stroke();
    stroke.points = s.points;
    stroke.width = s.size;
    stroke.color = s.color;
    stroke.cap = s.cap;
    stroke.join = s.join;
    stroke.miterLimit = s.miterLimit;
    stroke.isInterpolationDone = s.isInterpolationDone;
    return stroke;
  }

  toObj(): StrokeI {
    return {
      points: this.points,
      size: this.width,
      color: this.color,
      cap: this.cap,
      join: this.join,
      miterLimit: this.miterLimit,
      isInterpolationDone: this.isInterpolationDone,
    };
  }
}
