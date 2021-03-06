interface JQuery {
    selectpicker(...args: any[]);
    //replaceOptions(options: Array<{value: string, text?: string}>);
}

namespace SketchEditor {

    export class FontPicker {

        defaultFontFamily = "Roboto";
        previewFontSize = "28px";

        private store: Store;

        constructor(container: HTMLElement, store: Store, block: TextBlock) {
            this.store = store;
            const dom$ = Rx.Observable.just(block)
                .merge(
                store.events.textblock.attrChanged.observe()
                    .filter(m => m.data._id === block._id)
                    .map(m => m.data)
                )
                .map(tb => this.render(tb));
            ReactiveDom.renderStream(dom$, container);
        }

        render(block: TextBlock): VNode {
            let update = patch => {
                patch._id = block._id;
                this.store.actions.textBlock.updateAttr.dispatch(patch);
            };
            const elements: VNode[] = [];
            elements.push(
                h("select",
                    {
                        key: "selectPicker",
                        class: {
                            "family-picker": true
                        },
                        attrs: {
                        },
                        hook: {
                            insert: vnode => {
                                $(vnode.elm).selectpicker();
                            },
                            destroy: vnode => {
                                $(vnode.elm).selectpicker("destroy");
                            }
                        },
                        on: {
                            change: ev => update({
                                fontFamily: ev.target.value,
                                fontVariant: FontShape.FontCatalog.defaultVariant(
                                    this.store.resources.fontCatalog.getRecord(ev.target.value))
                            })
                        }
                    },
                    this.store.resources.fontCatalog
                        .getList(this.store.fontListLimit)
                        .map((record: FontShape.FamilyRecord) => h("option",
                            {
                                attrs: {
                                    selected: record.family === block.fontFamily,
                                    "data-content": `<span style="${FontHelpers.getStyleString(record.family, null, this.previewFontSize)}">${record.family}</span>`
                                },
                            },
                            [record.family])
                        )
                )
            );
            const selectedFamily = this.store.resources.fontCatalog.getRecord(block.fontFamily);
            if (selectedFamily && selectedFamily.variants
                && selectedFamily.variants.length > 1) {
                elements.push(h("select",
                    {
                        key: "variantPicker",
                        class: {
                            "variant-picker": true
                        },
                        attrs: {
                        },
                        hook: {
                            insert: vnode => {
                                $(vnode.elm).selectpicker();
                            },
                            destroy: vnode => {
                                $(vnode.elm).selectpicker("destroy")
                            },
                            postpatch: (oldVnode, vnode) => {
                                setTimeout(() => {
                                    // Q: why can't we just do selectpicker(refresh) here?
                                    // A: selectpicker has mental problems
                                    $(vnode.elm).selectpicker("destroy");
                                    $(vnode.elm).selectpicker();
                                });

                            }
                        },
                        on: {
                            change: ev => update({ fontVariant: ev.target.value })
                        }
                    },
                    selectedFamily.variants.map(v => {
                        return h("option",
                            {
                                attrs: {
                                    selected: v === block.fontVariant,
                                    value: v,
                                    "data-container": "body",
                                    "data-content": `<span style="${FontHelpers.getStyleString(selectedFamily.family, v, this.previewFontSize)}">${v}</span>`
                                }
                            },
                            [v])
                    }
                    )
                ));
            }
            return h("div",
                {
                    class: { "font-picker": true }
                },
                elements
            );
        }

    }

}