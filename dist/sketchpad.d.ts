export default class Sketchpad {
    readonly canvas: HTMLCanvasElement;
    private readonly ctx;
    private sketching;
    private isEraserActive;
    private _strokes;
    private undoneStrokes;
    private backgroundColor?;
    private readOnly;
    private aspectRatio;
    private lineWidth;
    private lineColor;
    private lineCap;
    private lineJoin;
    private lineMiterLimit;
    private isInterpolationDone;
    private eraserSize;
    private onDrawEnd?;
    circleCursor: HTMLDivElement | undefined;
    updateCircleCursor: ((e: MouseEvent | TouchEvent) => void) | undefined;
    constructor(el: HTMLElement, opts?: SketchpadOptionsI);
    get strokes(): Array<StrokeI>;
    get undos(): Array<StrokeI>;
    get opts(): SketchpadOptionsI;
    toJSON(): DataI;
    loadJSON(data: DataI): void;
    toDataURL(type: string): string;
    setCanvasSize(width: number, height: number): void;
    getCanvasSize(): RectI;
    setLineWidth(width: number): void;
    setEraserSize(size: number): void;
    toggleEraserMode(): void;
    setLineSize(size: number): void;
    setLineColor(color: string): void;
    setReadOnly(readOnly: boolean): void;
    undo(): void;
    redo(): void;
    clear(): void;
    drawLine(start: PointI, end: PointI, lineOpts: LineOptionsI): void;
    resize(width: number): void;
    getPointRelativeToCanvas(point: PointI): PointI;
    getLineSizeRelativeToCanvas(width: number): number;
    updateEraserIndicatorSize(): void;
    private setOptions;
    private getCursorRelativeToCanvas;
    private normalizePoint;
    private midPoint;
    private getLineWidthRelativeToCanvas;
    private normalizeLineWidth;
    private clearCanvas;
    private drawStroke;
    private drawQuadraticCurveStroke;
    private pushStroke;
    private pushPoint;
    private redraw;
    private listen;
    private startStrokeHandler;
    private drawStrokeHandler;
    private endStrokeHandler;
    private erasePoints;
    private createNewStrokesAfterErasing;
    private createNewStrokesAfterInterpolation;
    private interpolateExistingShapePaths;
    private eraserModeOn;
    private eraserModeOff;
    private eraserModeIndicatorOn;
    private eraserModeIndicatorOff;
    private interpolateQuadraticCurve;
    private deepClone;
}
interface PointI {
    readonly x: number;
    readonly y: number;
    readonly skipped: boolean;
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
export {};
