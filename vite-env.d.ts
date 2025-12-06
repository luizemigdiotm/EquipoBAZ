declare module 'html2canvas' {
    const html2canvas: (element: HTMLElement, options?: any) => Promise<HTMLCanvasElement>;
    export default html2canvas;
}

declare module 'jspdf' {
    export class jsPDF {
        constructor(options?: any);
        addImage(imageData: string, format: string, x: number, y: number, w: number, h: number, alias?: string, compression?: string, rotation?: number): void;
        save(filename: string): void;
        internal: {
            pageSize: {
                getWidth(): number;
                getHeight(): number;
            };
        };
        getImageProperties(imageData: string): { width: number; height: number };
        setFontSize(size: number): jsPDF;
        setTextColor(r: number, g: number, b: number): jsPDF;
        text(text: string | string[], x: number, y: number, options?: any, transform?: any): jsPDF;
    }
}