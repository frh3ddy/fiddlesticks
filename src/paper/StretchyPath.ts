
class StretchyPath extends paper.Group {

    options: StretchyPathOptions;
        
    sourcePath: paper.CompoundPath;
    displayPath: paper.CompoundPath;
    corners: paper.Segment[];
    outline: paper.Path;
    shapeChanged: boolean;
    
    static OUTLINE_POINTS = 230;
    
    /**
     * For rebuilding the midpoint handles
     * as outline changes.
     */
    midpointGroup: paper.Group;
    segmentMarkersGroup: paper.Group;

    constructor(sourcePath: paper.CompoundPath, options?: StretchyPathOptions) {
        super();

        this.options = options || <StretchyPathOptions>{
            pathFillColor: 'gray'
        };

        this.setPath(sourcePath);
       
        this.createOutline();
        this.createSegmentMarkers();
        this.updateMidpiontMarkers();
        this.setEditElementsVisibility(false);

        this.arrangeContents();
       
        this.mouseBehavior = {
            onClick: () => {
                this.bringToFront();
                this.selected = true;
            },
            onDragStart: () => this.bringToFront(),
            onDragMove: event => {
                this.selected = true;
                this.position = this.position.add(event.delta);
            },
            onOverStart: () => this.setEditElementsVisibility(true),
            onOverEnd: () => this.setEditElementsVisibility(false)
        };
    }

    updatePath(path: paper.CompoundPath, options?: StretchyPathOptions){
        this.setPath(path);
        if(options){
            this.options = options;
        }
        if(!this.shapeChanged){
            this.outline.bounds.size = this.sourcePath.bounds.size;
            this.updateMidpiontMarkers();
            this.createSegmentMarkers();              
        }
        this.arrangeContents();
    }

    private setPath(path: paper.CompoundPath){
        if(this.sourcePath){
            this.sourcePath.remove();
        }
        this.sourcePath = path;
        path.visible = false;
    }

    setEditElementsVisibility(value: boolean){
        this.segmentMarkersGroup.visible = value;
        this.midpointGroup.visible = value;
        this.outline.strokeColor = value ? 'lightgray' : null; 
    }

    arrangeContents() {
        this.updateMidpiontMarkers();
        this.arrangePath();
    }

    arrangePath() {
        let orthOrigin = this.sourcePath.bounds.topLeft;
        let orthWidth = this.sourcePath.bounds.width;
        let orthHeight = this.sourcePath.bounds.height;
        let sides = this.getOutlineSides();
        
        let top = sides[0];
        let bottom = sides[2];
        bottom.reverse();
        let projection = PaperHelpers.sandwichPathProjection(top, bottom);
        let transform = new PathTransform(point => {
            let relative = point.subtract(orthOrigin);
            let unit = new paper.Point(
                relative.x / orthWidth,
                relative.y / orthHeight);
            let projected = projection(unit);
            return projected;
        });

        for(let side of sides){
            side.remove();
        }
        
        let newPath = PaperHelpers.traceCompoundPath(this.sourcePath, 
            StretchyPath.OUTLINE_POINTS);
        newPath.visible = true;
        newPath.fillColor = this.options.pathFillColor;
        
        this.setBackgroundColor();

        transform.transformPathItem(newPath);

        if (this.displayPath) {
            this.displayPath.remove();
        }

        this.displayPath = newPath;
        this.insertChild(1, newPath);
    }

    private getOutlineSides(): paper.Path[] {
        let sides: paper.Path[] = [];
        let segmentGroup: paper.Segment[] = [];
        
        let cornerPoints = this.corners.map(c => c.point);
        let first = cornerPoints.shift(); 
        cornerPoints.push(first);

        let targetCorner = cornerPoints.shift();
        let segmentList = this.outline.segments.map(x => x);
        let i = 0;
        segmentList.push(segmentList[0]);
        for(let segment of segmentList){
            segmentGroup.push(segment);
            if(targetCorner.isClose(segment.point, paper.Numerical.EPSILON)) {
                // finish path
                sides.push(new paper.Path(segmentGroup));
                segmentGroup = [segment];
                targetCorner = cornerPoints.shift();
            }
            i++;
        }
        
        if(sides.length !== 4){
            console.error('sides', sides);
            throw 'failed to get sides';
        }
        
        return sides;
    }
    
    private createOutline() {
        let bounds = this.sourcePath.bounds;
        let outline = new paper.Path(
            PaperHelpers.corners(this.sourcePath.bounds));

        outline.closed = true;
        outline.dashArray = [5, 5];
        this.outline = outline;

        // track corners so we know how to arrange the text
        this.corners = outline.segments.map(s => s);

        this.addChild(outline);
        this.setBackgroundColor();
    }

    private setBackgroundColor(){
        if(this.options.backgroundColor){
            this.outline.fillColor = this.options.backgroundColor;
            this.outline.opacity = .9;    
        } else {
            this.outline.fillColor = 'white';
            this.outline.opacity = 0;
        }
    }

    private createSegmentMarkers() {
        if(this.segmentMarkersGroup){
            this.segmentMarkersGroup.remove();
        }
        let bounds = this.sourcePath.bounds;
        this.segmentMarkersGroup = new paper.Group();
        for (let segment of this.outline.segments) {
            let handle = new SegmentHandle(segment);
            handle.onDragStart = () => this.shapeChanged = true;
            handle.onChangeComplete = () => this.arrangeContents();
            this.segmentMarkersGroup.addChild(handle);
        }
        this.addChild(this.segmentMarkersGroup);
    }
    
    private updateMidpiontMarkers() {
        if(this.midpointGroup){
            this.midpointGroup.remove();
        }
        this.midpointGroup = new paper.Group();
        this.outline.curves.forEach(curve => {
            // skip left and right sides
            if(curve.segment1 === this.corners[1]
                || curve.segment1 === this.corners[3]){
                    return;   
                }
            let handle = new CurveSplitterHandle(curve);
            handle.onDragStart = () => this.shapeChanged = true; 
            handle.onDragEnd = (newSegment, event) => {
                let newHandle = new SegmentHandle(newSegment);
                newHandle.onChangeComplete = () => this.arrangeContents();
                this.segmentMarkersGroup.addChild(newHandle);
                handle.remove();
                this.arrangeContents();
            };
            this.midpointGroup.addChild(handle);
        });
        this.addChild(this.midpointGroup);
    }
}

interface StretchyPathOptions {
    pathFillColor: string;
    backgroundColor: string;
}
