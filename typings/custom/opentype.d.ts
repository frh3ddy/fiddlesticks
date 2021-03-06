
declare var opentype: any;

declare module opentype {

    interface Font {
        getPath(text: string, 
            left: number, 
            bottom:number, 
            fontSize: number, 
            options?: FontOptions): Path;
            
        getPaths(text: string, 
            left: number, 
            bottom:number, 
            fontSize: number, 
            options?: FontOptions): Path[];    
    }
    
    interface Path {
        toPathData(decimalPlaces?: number): string;
        toSVG(decimalPlaces?: number);
    }
    
    interface FontOptions {
        kerning: boolean;
    }
}