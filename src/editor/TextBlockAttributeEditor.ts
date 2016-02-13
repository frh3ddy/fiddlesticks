
class TextBlockAttributeEditor {

    change$: Rx.Observable<TextBlockAttr>;
    vdom$: Rx.Observable<VNode>;

    constructor(container: any,
        source: Rx.Observable<TextBlockAttr>) {
        let sink = new Rx.Subject<TextBlockAttr>();
        this.change$ = sink;

        this.vdom$ = VDomHelpers.liveRender(container, source, textBlock => {
            let attr = <TextBlockAttr>{
                textBlockId: textBlock.textBlockId,
                text: textBlock.text,
                textColor: textBlock.textColor,
                backgroundColor: textBlock.backgroundColor,
            };
            let tbChange = (alter: (tb: TextBlockAttr) => void) => {
                alter(attr);
                sink.onNext(attr);
            }
            return h('div', { style: { color: '#000' } }, [
                h('textarea',
                    {
                        text: textBlock.text,
                        on: {
                            keyup: e => tbChange(tb => tb.text = e.target.value),
                            change: e => tbChange(tb => tb.text = e.target.value)
                        }
                    }),
                h('input.text-color',
                    {
                        type: 'text',
                        hook: {
                            insert: (vnode) =>
                                this.setupColorPicker(
                                    vnode.elm,
                                    color => tbChange(tb => tb.textColor = color && color.toHexString())
                                )
                        }
                    }),
                h('input.background-color',
                    {
                        type: 'text',
                        hook: {
                            insert: (vnode) =>
                                this.setupColorPicker(
                                    vnode.elm,
                                    color => tbChange(tb => tb.backgroundColor = color && color.toHexString())
                                )
                        }
                    }),
                // h('button',
                //     {
                //         on: {
                //             click: e => tbChange(tb => { })
                //         }
                //     },
                //     'OK'
                // ),
            ]);
        });
    }

    setupColorPicker(elem, onChange) {
        let sel = <any>$(elem);
        (<any>$(elem)).spectrum({
            showInput: true,
            allowEmpty: true,
            preferredFormat: "hex",
            showButtons: false,
            showAlpha: true,
            showPalette: true,
            showSelectionPalette: true,
            palette: [
                ["#000", "#444", "#666", "#999", "#ccc", "#eee", "#f3f3f3", "#fff"],
                ["#f00", "#f90", "#ff0", "#0f0", "#0ff", "#00f", "#90f", "#f0f"],
                ["#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#d0e0e3", "#cfe2f3", "#d9d2e9", "#ead1dc"],
                ["#ea9999", "#f9cb9c", "#ffe599", "#b6d7a8", "#a2c4c9", "#9fc5e8", "#b4a7d6", "#d5a6bd"],
                ["#e06666", "#f6b26b", "#ffd966", "#93c47d", "#76a5af", "#6fa8dc", "#8e7cc3", "#c27ba0"],
                ["#c00", "#e69138", "#f1c232", "#6aa84f", "#45818e", "#3d85c6", "#674ea7", "#a64d79"],
                ["#900", "#b45f06", "#bf9000", "#38761d", "#134f5c", "#0b5394", "#351c75", "#741b47"],
                ["#600", "#783f04", "#7f6000", "#274e13", "#0c343d", "#073763", "#20124d", "#4c1130"]
            ],
            localStorageKey: "sketchtext",
            change: onChange
        });
    };
}