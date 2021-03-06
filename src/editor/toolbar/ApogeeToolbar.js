/**
 * Toolbar Plugin
 * - Allows toolbar items, such as buttons.
 * - Each item can have an optional "update" function. This will be called when the selection changes and allows
 * for corresponding changes to the button appearance or function. It is passed "selectionInfo". See below.
 * - Each item can have an optional "getMarkSelectionGenerator" function. This is generates an entry for the selection
 * info for a given mark. (Block selection info is handled automatically.) See below for format.
 * - Each item must have a "registerEditorView" function. This will be called to pass the editor view to the button, so it can
 * act on the view.
 * - Each item must have a "getElement" call, to retrive the DOM element for the item.
 * 
 * SelectionInfo is an object with two entries, "blocks" and "marks". The entry in blocks is automatically generated. The entry
 * for marks is generated by a function from the item itself. The item provides this from the "getMarkSelectionGenerator".
 * 
 * (FOR NOW - see code for examples of how these work)
*/

export default class ApogeeToolbar {
  constructor(items) {
    this.items = items
    
    this.dom = document.createElement("div")
    this.dom.className = "atb_toolbar"

    this.markSelectionGenerators = {};

    this.items.forEach(item => this._addToolbarItem(item))
    
  }

  setEditorView(editorView) {
    this.editorView = editorView;

    this.items.forEach(item => {
      item.registerEditorView(editorView);
    })
    this.update();
  }

  getElement() {
    return this.dom;
  }


  update() {
    var selectionInfo = this._getSelectionInfo();
    this.items.forEach(item => {
      item.update(selectionInfo);
    })
  }

  destroy() {
    //this.dom.remove()
  }

  _addToolbarItem(toolbarItem) {

    //this allows mark items to create custom information for themselves in a simple and efficient way
    //blocks are handled in standard way
    if(toolbarItem.getMarkSelectionGenerator) {
      this._registerMarkSelectionGenerator(toolbarItem.getMarkSelectionGenerator());
    }

    this.dom.appendChild(toolbarItem.getElement());
  }

  /** This function allows each mark to create information on selection to decide the item
   * status, such as if the press should turn the mark on or off */
  _registerMarkSelectionGenerator(selectionGenerator) {
    if(selectionGenerator.name) {
      this.markSelectionGenerators[selectionGenerator.name] = selectionGenerator;
    }
  }

  /** This function creates information on each selection event to update the status of the buttons */
  _getSelectionInfo() {

    let { $from, $to } = this.editorView.state.selection;
    let doc = this.editorView.state.doc;
    let schema = this.editorView.state.schema;

    //----------------------------
    //get block info
    //create a list of blocks present
    //-----------------------------
    let blockInfo = {};
    let startBlockIndex = $from.index(0);
    let endBlockIndex = $to.index(0);

    let blockMap = {};
    blockInfo.blockTypes = [];
    for(let index = startBlockIndex; index <= endBlockIndex; index++) {
      let childNode = doc.maybeChild(index);
      if((childNode)&&(!blockMap[childNode.type.name])) {
        blockMap[childNode.type.name] = true;
        blockInfo.blockTypes.push(childNode.type);
      }
    }

    //-------------------
    //get mark info
    //toolbar buttons register a function to create their own mark info entry
    //-------------------
    //initialize mark info
    let markInfo = {};
    for(let markName in this.markSelectionGenerators) {
      let initEntryFunction = this.markSelectionGenerators[markName].getEmptyInfo;
      markInfo[markName] = initEntryFunction ? initEntryFunction() : {};
    }

    //process marks for text nodes.
    let textNodeNumber = 0;
    let setMarkInfo = node => {
      if(node.isText) {
        node.marks.forEach( mark => {
          let markInfoUpdater = this.markSelectionGenerators[mark.type.name].updateInfo;
          if(markInfoUpdater) {
            let markInfoEntry = markInfo[mark.type.name];
            markInfoUpdater(mark,markInfoEntry,textNodeNumber);
          }
        });
        textNodeNumber++;
      }
    }

    doc.nodesBetween($from.pos,$to.pos,setMarkInfo);

    //call final update, if needed
    for(let markName in this.markSelectionGenerators) {
      let onCompleteFunction = this.markSelectionGenerators[markName].onComplete;
      let markInfoEntry = markInfo[markName];
      if(onCompleteFunction) onCompleteFunction(markInfoEntry,textNodeNumber);
    }
    
    //return selection info
    let selectionInfo = {};
    selectionInfo.blocks = blockInfo;
    selectionInfo.marks = markInfo;
    return selectionInfo;
  }

}
