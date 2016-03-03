
class WorkspaceController {

    defaultSize = new paper.Size(50000, 40000);

    canvas: HTMLCanvasElement;
    workspace: Workspace;
    project: paper.Project;
    font: opentype.Font;

    private channels: Channels;
    private _sketch: Sketch;
    private _textBlockItems: { [textBlockId: string]: TextWarp } = {};

    constructor(channels: Channels, font: opentype.Font) {
        this.channels = channels;
        this.font = font;
        paper.settings.handleSize = 1;

        this.canvas = <HTMLCanvasElement>document.getElementById('mainCanvas');
        paper.setup(this.canvas);
        this.project = paper.project;

        const mouseTool = new MouseBehaviorTool(this.project);
        mouseTool.onToolMouseDown = ev => {
            this.channels.events.sketch.editingItemChanged.dispatch({});
            this.channels.actions.sketch.setSelection.dispatch({});
        };

        let mouseZoom = new ViewZoom(this.project);

        channels.events.sketch.loaded.subscribe(
            ev => {
                this._sketch = ev.data;
                this.project.clear();
                this.project.deselectAll();
                this._textBlockItems = {};

                this.workspace = new Workspace(this.defaultSize);
                this.workspace.backgroundColor = ev.data.attr.backgroundColor;
                let sheetBounds = this.workspace.sheet.bounds;
                mouseZoom.setZoomRange(
                    [sheetBounds.scale(0.005).size, sheetBounds.scale(0.25).size]);
                mouseZoom.zoomTo(sheetBounds.scale(0.05));
            }
        );

        channels.events.sketch.attrChanged.subscribe(
            ev => this.workspace.backgroundColor = ev.data.backgroundColor
        );

        channels.events.mergeTyped(
            channels.events.textblock.added,
            channels.events.textblock.loaded
        ).subscribe(
            ev => this.addBlock(ev.data));

        channels.events.textblock.attrChanged.subscribe(m => {
            let item = this._textBlockItems[m.data._id];
            if (item) {
                const textBlock = m.data;
                item.text = textBlock.text;
                item.customStyle = {
                    fontSize: textBlock.fontSize,
                    fillColor: textBlock.textColor,
                    backgroundColor: textBlock.backgroundColor
                }
            }
        });

        channels.events.textblock.removed.subscribe(m => {
            let item = this._textBlockItems[m.data._id];
            if (item) {
                item.remove();
                delete this._textBlockItems[m.data._id];
            }
        });

        channels.events.sketch.selectionChanged.subscribe(m => {

            if (!m.data || !m.data.itemId) {
                this.project.deselectAll();
                return;
            }
            
            // if (m.data.priorSelectionItemId) {
            //     let prior = this._textBlockItems[m.data.priorSelectionItemId];
            //     if (prior) {
            //         prior.selected = false;
            //     }
            // }

            let item = m.data.itemId && this._textBlockItems[m.data.itemId];
            if (item) {
                item.selected = true;
            }
        });

        channels.events.designer.saveLocalRequested.subscribe(m => {
            _.forOwn(this._textBlockItems, tbi => {
                const doc = this.project.exportJSON(false);
                console.log(doc);

            });

        });
    }

    addBlock(textBlock: TextBlock) {
        if (!textBlock) {
            return;
        }

        if (!textBlock._id) {
            console.error('received block without id', textBlock);
        }

        let item = this._textBlockItems[textBlock._id];
        if (item) {
            console.error("Received addBlock for block that is already loaded");
            return;
        }

        let bounds: { upper: paper.Segment[], lower: paper.Segment[] };

        if (textBlock.outline) {
            const loadSegment = (record: SegmentRecord) => {
                const point = record[0];
                if(point instanceof Array){
                    return new paper.Segment(
                        new paper.Point(record[0]),
                        record[1] && new paper.Point(record[1]),
                        record[2] && new paper.Point(record[2]));
                }
                // Single-point segments are stored as number[2]
                return new paper.Segment(new paper.Point(record));
            };
            bounds = {
                upper: textBlock.outline.top.segments.map(loadSegment),
                lower: textBlock.outline.bottom.segments.map(loadSegment)
            };
        }

        item = new TextWarp(
            this.font,
            textBlock.text,
            bounds,
            textBlock.fontSize, {
                fontSize: textBlock.fontSize,
                fillColor: textBlock.textColor || "red",    // textColor should have been set elsewhere 
                backgroundColor: textBlock.backgroundColor
            });

        if (!textBlock.outline && textBlock.position) {
            item.position = new paper.Point(textBlock.position);
        }

        // warning: MouseBehavior events are also set within StretchyPath. 
        //          Collision will happen eventuall.
        // todo: Fix drag handler in paper.js so it doesn't fire click.
        //       Then we can use the item.click event.
        item.mouseBehavior.onClick = ev => {
            item.bringToFront();
            const editorAt = this.project.view.projectToView(
                PaperHelpers.midpoint(item.bounds.topLeft, item.bounds.center));
            // select
            if (!item.selected) {
                this.channels.actions.sketch.setSelection.dispatch(
                    { itemId: textBlock._id, itemType: "TextBlock" });
            }
            // edit
            this.channels.actions.sketch.setEditingItem.dispatch(
                {
                    itemId: textBlock._id,
                    itemType: "TextBlock",
                    clientX: editorAt.x,
                    clientY: editorAt.y
                });
        };

        item.mouseBehavior.onDragStart = ev => {
            item.bringToFront();
            if (!item.selected) {
                this.channels.actions.sketch.setSelection.dispatch(
                    { itemId: textBlock._id, itemType: "TextBlock" });
            }
        };

        item.mouseBehavior.onDragMove = ev => {
            item.position = item.position.add(ev.delta);
        };

        item.mouseBehavior.onDragEnd = ev => {
            let block = <TextBlock>this.getBlockArrangement(item);
            block._id = textBlock._id;
            this.channels.actions.textBlock.updateArrange.dispatch(block);
        }

        item.observe(flags => {
            if (flags & PaperNotify.ChangeFlag.GEOMETRY) {
                let block = <TextBlock>this.getBlockArrangement(item);
                block._id = textBlock._id;
                this.channels.actions.textBlock.updateArrange.dispatch(block);
            }
        });

        item.data = textBlock._id;
        this.workspace.addChild(item);
        if (!textBlock.position) {
            item.position = this.project.view.bounds.point.add(
                new paper.Point(item.bounds.width / 2, item.bounds.height / 2)
                    .add(50));
        }
        this._textBlockItems[textBlock._id] = item;
    }

    private getBlockArrangement(item: TextWarp): BlockArrangement {
        // export returns an array with item type and serialized object:
        //   ["Path", { segments:[][] }]
        const top = <PathRecord>item.upper.exportJSON({ asString: false })[1];
        const bottom = <PathRecord>item.lower.exportJSON({ asString: false })[1];

        return {
            position: [item.position.x, item.position.y],
            outline: { top, bottom }
        }
    }
}