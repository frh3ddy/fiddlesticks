namespace SketchEditor {

    export class DualBoundsPathWarp extends paper.Group {

        static POINTS_PER_PATH = 200;
        static UPDATE_DEBOUNCE = 150;

        private _source: paper.CompoundPath;
        private _upper: StretchPath;
        private _lower: StretchPath;
        private _warped: paper.CompoundPath;
        private _outline: paper.Path;
        private _customStyle: SketchItemStyle;

        constructor(
            source: paper.CompoundPath,
            bounds?: { upper: paper.Segment[], lower: paper.Segment[] },
            customStyle?: SketchItemStyle) {

            super();

            // -- build children --

            this._source = source;
            this._source.remove();

            if (bounds) {
                this._upper = new StretchPath(bounds.upper);
                this._lower = new StretchPath(bounds.lower);
            } else {
                this._upper = new StretchPath([
                    new paper.Segment(source.bounds.topLeft),
                    new paper.Segment(source.bounds.topRight)
                ]);
                this._lower = new StretchPath([
                    new paper.Segment(source.bounds.bottomLeft),
                    new paper.Segment(source.bounds.bottomRight)
                ]);
            }

            this.controlBoundsOpacity = 0.75;

            this._upper.visible = this.selected;
            this._lower.visible = this.selected;

            this._outline = new paper.Path({ closed: true });
            this.updateOutlineShape();

            this._warped = new paper.CompoundPath(source.pathData);
            this.updateWarped();

            // -- add children --

            this.addChildren([this._outline, this._warped, this._upper, this._lower]);

            // -- assign style --

            this.customStyle = customStyle || {
                strokeColor: "gray"
            };

            // -- set up observers --

            Rx.Observable.merge(
                this._upper.pathChanged.observe(),
                this._lower.pathChanged.observe())
                .debounce(DualBoundsPathWarp.UPDATE_DEBOUNCE)
                .subscribe(path => {
                    this.updateOutlineShape();
                    this.updateWarped();
                    this._changed(PaperNotify.ChangeFlag.GEOMETRY);
                });

            this.subscribe(flags => {
                if (flags & PaperNotify.ChangeFlag.ATTRIBUTE) {
                    if (this._upper.visible !== this.selected) {
                        this._upper.visible = this.selected;
                        this._lower.visible = this.selected;
                    }
                }
            });
        }

        get upper(): paper.Path {
            return this._upper.path;
        }

        get lower(): paper.Path {
            return this._lower.path;
        }

        set source(value: paper.CompoundPath) {
            if (value) {
                this._source && this._source.remove();
                this._source = value;
                this.updateWarped();
            }
        }

        get customStyle(): SketchItemStyle {
            return this._customStyle;
        }

        set customStyle(value: SketchItemStyle) {
            this._customStyle = value;
            this._warped.style = value;
            if (value.backgroundColor) {
                this._outline.fillColor = value.backgroundColor;
                this._outline.opacity = 1;
            } else {
                this._outline.fillColor = "white";
                this._outline.opacity = 0;
            }
        }

        set controlBoundsOpacity(value: number) {
            this._upper.opacity = this._lower.opacity = value;
        }

        outlineContains(point: paper.Point) {
            return this._outline.contains(point);
        }

        private updateWarped() {
            let orthOrigin = this._source.bounds.topLeft;
            let orthWidth = this._source.bounds.width;
            let orthHeight = this._source.bounds.height;

            let projection = PaperHelpers.dualBoundsPathProjection(
                this._upper.path, this._lower.path);
            let transform = new FontShape.PathTransform(point => {
                if (!point) {
                    return point;
                }
                let relative = point.subtract(orthOrigin);
                let unit = new paper.Point(
                    relative.x / orthWidth,
                    relative.y / orthHeight);
                let projected = projection(unit);
                return projected;
            });

            const newPaths = this._source.children
                .map(item => {
                    const path = <paper.Path>item;
                    const xPoints = PaperHelpers.tracePathAsPoints(path,
                        DualBoundsPathWarp.POINTS_PER_PATH)
                        .map(p => transform.transformPoint(p));
                    const xPath = new paper.Path({
                        segments: xPoints,
                        closed: true,
                        clockwise: path.clockwise
                    });
                    return xPath;
                })
            this._warped.removeChildren();
            this._warped.addChildren(newPaths);
            for(const c of this._warped.children){
                (<paper.Path>c).simplify(0.002);
            }
        }

        private updateOutlineShape() {
            const lower = new paper.Path(this._lower.path.segments);
            lower.reverse();
            this._outline.segments = this._upper.path.segments.concat(lower.segments);
            lower.remove();
        }

    }

}