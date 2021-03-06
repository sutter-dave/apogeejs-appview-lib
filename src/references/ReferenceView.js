import apogeeutil from "/apogeejs-util-lib/src/apogeeUtilLib.js";
import {uiutil,TreeEntry} from "/apogeejs-ui-lib/src/apogeeUiLib.js";

import ReferenceListView from "/apogeejs-app-bundle/src/references/ReferenceListView.js";

export default class ReferenceView {

    constructor(app, referenceManager) {
        this.app = app;
        this.referenceManager = referenceManager;

        //get the view state
        let viewState = this.referenceManager.getCachedViewState();
        let listViewStates = ((viewState)&&(viewState.lists)) ? viewState.lists : {};

        //create the tree entry
        this.treeEntry = this._createTreeEntry(viewState);

        //initailize the child list views
        this.referenceListViews = {};
        let referenceClassArray = referenceManager.constructor.getReferenceClassArray();
        referenceClassArray.forEach( referenceClass => {
            let entryType = referenceClass.REFERENCE_TYPE;
            let referenceListView = this._createReferenceListView(entryType,listViewStates[entryType]); 
            this.referenceListViews[entryType] = referenceListView;
            let childTreeEntry = referenceListView.getTreeEntry();
            this.treeEntry.addChild(childTreeEntry);
        });

        app.addListener("referenceEntry_created",referenceEntry => this._onLinkCreated(referenceEntry));
        app.addListener("referenceEntry_updated",referenceEntry => this._onLinkUpdated(referenceEntry));
        app.addListener("referenceEntry_deleted",referenceEntry => this._onLinkDeleted(referenceEntry));
        app.addListener("referenceManager_updated",referenceManager => this._onReferenceManagerUpdated(referenceManager));

        this.referenceManager.setViewStateCallback(() => this.getViewState());
    }

    /** This returns the tree entry to display the reference entry for this reference manager. */
    getTreeEntry() {
        return this.treeEntry;
    }

    closeWorkspace() {
        //no action in ui for references
    }

    //-----------------------------------
    // Save methods
    //-----------------------------------
    
    getViewState() {
        let json = {};
        json.treeState = this.treeEntry.getState();
        json.lists = {};
        for(let entryType in this.referenceListViews) {
            let referenceList = this.referenceListViews[entryType];
            json.lists[entryType] = referenceList.getViewState();
        }
        return json;
    }

    //==================================
    // Private Methods
    //==================================

    _onLinkCreated(referenceEntry) {
        try {
            let referenceList = this.referenceListViews[referenceEntry.getEntryType()];
            if(referenceList) {
                referenceList.onLinkCreated(referenceEntry);
            }
        }
        catch(error) {
            if(error.stack) console.error(error.stack);

            apogeeUserAlert("Error updating display for created reference entry: " + error.toString());
        }
    }

    _onLinkUpdated(referenceEntry) {
        try {
            let referenceList = this.referenceListViews[referenceEntry.getEntryType()];
            if(referenceList) {
                referenceList.onLinkUpdated(referenceEntry);
            }
        }
        catch(error) {
            if(error.stack) console.error(error.stack);

            apogeeUserAlert("Error updating display for created reference entry: " + error.toString());
        }
    }

    _onLinkDeleted(referenceEntry) {
        try {
            let referenceList = this.referenceListViews[referenceEntry.getEntryType()];
            referenceList.onLinkDeleted(referenceEntry);
        }
        catch(error) {
            if(error.stack) console.error(error.stack);

            apogeeUserAlert("Error updating display for reference entry: " + error.toString());
        }
    }

    _onReferenceManagerUpdated(referenceManager) {
        try {
            this.referenceManager = referenceManager;
            this.referenceManager.setViewStateCallback(() => this.getViewState());
        }
        catch(error) {
            if(error.stack) console.error(error.stack);

            apogeeUserAlert("Error updating display for deleted reference entry: " + error.toString());
        }
    }

    /** @private */
    _createTreeEntry(viewState) {
        var iconUrl = uiutil.getResourcePath(REFERENCES_ICON_PATH,"app");
        let treeEntry = new TreeEntry("Libraries", iconUrl, null, null, false);

        if((viewState)&&(viewState.treeState !== undefined)) {
            treeEntry.setState(viewState.treeState)
        }

        return treeEntry;
    }

    _createReferenceListView(entryType,viewState) {
        let listDisplayInfo = LIST_DISPLAY_INFO[entryType];
        if(!listDisplayInfo) {
            listDisplayInfo = apogeeutil.jsonCopy(DEFAULT_LIST_DISPLAY_INFO);
            //set the proper entry type, and use that for the list name too
            listDisplayInfo.REFERENCE_TYPE = entryType;
            listDisplayInfo.LIST_NAME = entryType;
            listDisplayInfo.DISPLAY_NAME = entryTYpe;
        }
        return new ReferenceListView(this.app,entryType,listDisplayInfo,viewState);
    }

}

let REFERENCES_ICON_PATH = "/icons3/folderIcon.png";

/** This is the UI definition data for the added reference lists.
 * This should be placed somewhere else to make it easier for people to 
 * add additional reference types.
 */
let LIST_DISPLAY_INFO = {

    "amd module": {
        "REFERENCE_TYPE": "amd module",
        "LIST_NAME": "Web Modules",
        "DISPLAY_NAME":"Web Module",
        "FORM_BODY": [
            {
                type: "textField",
                label: "URL: ",
                size: 100,
                key: "url"
            },
            {
                type: "textField",
                label: "Display Name: ",
                size: 50,
                key: "nickname"
            }
        ],
        "LIST_ICON_PATH":"/icons3/folderIcon.png",
        "ENTRY_ICON_PATH":"/icons3/amdModuleIcon.png"
    },

    "css link": {
        "REFERENCE_TYPE": "css link",
        "LIST_NAME": "CSS Links",
        "DISPLAY_NAME":"CSS Link",
        "FORM_BODY": [
            {
                type: "textField",
                label: "URL: ",
                size: 100,
                key: "url"
            },
            {
                type: "textField",
                label: "Display Name: ",
                size: 50,
                key: "nickname"
            }
        ],
        "LIST_ICON_PATH":"/icons3/folderIcon.png",
        "ENTRY_ICON_PATH": "/icons3/cssLinkIcon.png"
    },

    "npm module": {
        "REFERENCE_TYPE": "npm module",
        "LIST_NAME": "NPM Modules",
        "DISPLAY_NAME":"NPM Module",
        "FORM_BODY": [
            {
                type: "textField",
                label: "NPM Module Name: ",
                size: 50,
                key: "url"
            },
            {
                type: "textField",
                label: "Display Name: ",
                size: 50,
                key: "nickname"
            },
            {
                type: "textField",
                label: "Server NPM Module Name: ",
                size: 50,
                key: "serverUrl",
                hint: "Optional",
                help: "This is used if a different module should be loaded when the workspace is run on the server."
            },
        ],
        "LIST_ICON_PATH":"/icons3/folderIcon.png",
        "ENTRY_ICON_PATH":"/icons3/npmModuleIcon.png"
    },

    "es module": {
        "REFERENCE_TYPE": "es module",
        "LIST_NAME": "Web Modules",
        "DISPLAY_NAME":"ES Web Module",
        "FORM_BODY": [
            {
                type: "textField",
                label: "URL: ",
                size: 100,
                key: "url"
            },
            {
                type: "textField",
                label: "Display Name: ",
                size: 50,
                key: "nickname"
            }
        ],
        "LIST_ICON_PATH":"/icons3/folderIcon.png",
        "ENTRY_ICON_PATH":"/icons3/esModuleIcon.png"
    },

    "js link": {
        "REFERENCE_TYPE": "js link",
        "LIST_NAME": "JS Scripts",
        "DISPLAY_NAME":"JS Script Link",
        "FORM_BODY": [
            {
                type: "textField",
                label: "URL: ",
                size: 100,
                key: "url"
            },
            {
                type: "textField",
                label: "Display Name: ",
                size: 50,
                key: "nickname"
            }
        ],
        "LIST_ICON_PATH":"/icons3/folderIcon.png",
        "ENTRY_ICON_PATH":"/icons3/jsLinkIcon.png"
    }
}

//if this is used, replace the reference type and list name
let DEFAULT_LIST_DISPLAY_INFO = {
    "REFERENCE_TYPE": "PUT THE ENTRY TYPE HERE!",
    "LIST_NAME": "PUT THE LIST NAME HERE!",
    "DISPLAY_NAME":"PUT THE DISPLAY NAME HERE!",
    "FORM_BODY": [
        {
            type: "textField",
            label: "URL: ",
            size: 100,
            key: "url"
        },
        {
            type: "textField",
            label: "Display Name: ",
            size: 50,
            key: "nickname"
        }
    ],
    "LIST_ICON_PATH":"/icons3/folderIcon.png",
    "ENTRY_ICON_PATH":"/icons3/javascriptLink.png"
}

