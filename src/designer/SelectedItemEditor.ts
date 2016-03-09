
class SelectedItemEditor {

    constructor(container: HTMLElement, store: Store) {

        const dom$ = store.events.mergeTyped<any>( 
                store.events.sketch.editingItemChanged,
                store.events.sketch.loaded
            ).map(i => {

            const posItem = <PositionedItem>i.data;

            const block = posItem
                && posItem.itemType === 'TextBlock'
                && _.find(store.state.retained.sketch.textBlocks, 
                    b => b._id === posItem.itemId);

            if (!block) {
                return h('div#editorOverlay',
                    {
                        style: {
                            display: "none"
                        }
                    });
            }

            return h('div#editorOverlay',
                {
                    style: {
                        left: posItem.clientX + "px",
                        top: posItem.clientY + "px",
                        "z-index": 1
                    }
                },
                [
                    new TextBlockEditor(store).render(block)
                ]);

        });

        ReactiveDom.renderStream(dom$, container);

    }
}
