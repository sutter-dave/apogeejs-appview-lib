import {uiutil,TreeEntry} from "/apogeejs-ui-lib/src/apogeeUiLib.js";
import {updateLink, removeLink} from "/apogeejs-view-lib/src/apogeeViewLib.js";

export default class ReferenceEntryView {

    constructor(app, referenceEntry,displayInfo) {
        this.app = app;
        this.referenceEntry = referenceEntry;
        this.displayInfo = displayInfo;
        this.treeEntry = this._createTreeEntry();
    }


/** This method loads the link onto the page. It returns a promise that
     * resolves when the link is loaded. */
    getTreeEntry() {
        return this.treeEntry;
    }

    onLinkUpdated(referenceEntry) {
        //make sure this is the right entry 
        if(referenceEntry.getId() != this.referenceEntry.getId()) return;
        
        this.referenceEntry = referenceEntry;
        if(referenceEntry.isFieldUpdated("data")) {
            let nickname = this.referenceEntry.getNickname();
            if(!nickname) nickname = "-unnamed entry-";
            this.treeEntry.setLabel(nickname);
        }

        if((referenceEntry.isFieldUpdated("state"))||(referenceEntry.isFieldUpdated("stateMsg"))) {
            this.treeEntry.setBannerState(this.referenceEntry.getState(),this.referenceEntry.getStateMsg());
        }
    }

    //===========================================
    // Private Methods
    //===========================================

    _createTreeEntry() {
        var iconUrl = uiutil.getResourcePath(this.displayInfo.ENTRY_ICON_PATH,"app");
        var label = this.referenceEntry.getNickname();
        var menuItemsCallback = () => this._getMenuItems();

        var treeEntry = new TreeEntry(label, iconUrl, null, menuItemsCallback, false);
        treeEntry.setBannerState(this.referenceEntry.getState(),this.referenceEntry.getStateMsg());
        return treeEntry;
    }

    _getMenuItems() {
        //menu items
        var menuItemList = [];

        //add the standard entries
        var itemInfo = {};
        itemInfo.title = "Update " + this.displayInfo.DISPLAY_NAME;
        itemInfo.callback = () => updateLink(this.app,this.referenceEntry,this.displayInfo);
        menuItemList.push(itemInfo);

        //add the standard entries
        var itemInfo = {};
        itemInfo.title = "Remove " + this.displayInfo.DISPLAY_NAME;
        itemInfo.callback = () => removeLink(this.app,this.referenceEntry,this.displayInfo);
        menuItemList.push(itemInfo);

        return menuItemList;
    }



}