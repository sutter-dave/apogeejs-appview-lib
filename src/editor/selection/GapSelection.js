import {Selection, NodeSelection} from "/apogeejs-releases/releases/ext/prosemirror/a2.0.0/prosemirror-state.es.js"
import {Slice} from "/apogeejs-releases/releases/ext/prosemirror/a2.0.0/prosemirror-model.es.js"
import {isLeafBlock} from "./selectionUtils.js"

// ::- Gap cursor selections are represented using this class. Its
// `$anchor` and `$head` properties both point at the cursor position.
export class GapSelection extends Selection {
    // : (ResolvedPos)
    constructor($anchor, $head = $anchor) {
        super($anchor, $head)
        this.anchorIsGap = GapSelection.isGapLocation($anchor);
        this.headIsGap = ($anchor.pos !== $head.pos) ? GapSelection.isGapLocation($head) : false
    }

    get $cursor() { return this.$anchor.pos == this.$head.pos ? this.$head : null }

    map(doc, mapping) {
        let $head = doc.resolve(mapping.map(this.head))
        let $anchor = doc.resolve(mapping.map(this.anchor))
        //one end must be a gap
        if((GapSelection.isGapLocation($head))||(GapSelection.isGapLocation($head))) {
            return new GapSelection($anchor, $head)
        }
        else {
            //(standard default when selection not valid)
            return Selection.near($head);
        }
    }

    get visible() {
        return (this.$anchor.pos !== this.$head.pos);
    }

    replace(tr, content = Slice.empty) {
        super.replace(tr, content)
        if (content == Slice.empty) {
            let marks = this.$from.marksAcross(this.$to)
            if (marks) tr.ensureMarks(marks)
        }
    }

    eq(other) {
        return ((other instanceof GapSelection)&&(other.head == this.head)&&(other.anchor == this.anchor))
    }

    toJSON() {
        return {type: "gapselection", anchor: this.anchor, head: this.head}
    }

    static fromJSON(doc, json) {
        if (typeof json.anchor != "number" || typeof json.head != "number")
            throw new RangeError("Invalid input for GapSelection.fromJSON")
        return new GapSelection(doc.resolve(json.anchor), doc.resolve(json.head))
    }

    getBookmark() { return new GapSelectionBookmark(this.anchor, this.head) }

    /** This method is a gap location is the node before is or after it is a leaf block. 
     * We are currently making the assumption that the leaf blocks are only placed at the root level. */
    static isGapLocation($pos) {
        return ($pos.depth === 0) && ( (isLeafBlock($pos.nodeBefore))||(isLeafBlock($pos.nodeAfter)) );
    }

    static findFrom($pos, dir, mustMove) {
        search: for (;;) {
            if (!mustMove && GapSelection.isGapLocation($pos)) return $pos
            let pos = $pos.pos, next = null
            // Scan up from this position
            for (let d = $pos.depth;; d--) {
                let parent = $pos.node(d)
                if (dir > 0 ? $pos.indexAfter(d) < parent.childCount : $pos.index(d) > 0) {
                    next = parent.child(dir > 0 ? $pos.indexAfter(d) : $pos.index(d) - 1)
                    break
                } else if (d == 0) {
                    return null
                }
                pos += dir
                let $cur = $pos.doc.resolve(pos)
                if (GapSelection.isGapLocation($cur)) return $cur
            }

            // And then down into the next node
            for (;;) {
                let inside = dir > 0 ? next.firstChild : next.lastChild
                if (!inside) {
                    if (next.isAtom && !next.isText && !NodeSelection.isSelectable(next)) {
                        $pos = $pos.doc.resolve(pos + next.nodeSize * dir)
                        mustMove = false
                        continue search
                    }
                    break
                }
                next = inside
                pos += dir
                let $cur = $pos.doc.resolve(pos)
                if (GapSelection.isGapLocation($cur)) return $cur
            }

            return null
        }
    }
}

Selection.jsonID("gapselection", GapSelection)

class GapSelectionBookmark {
    constructor(anchor, head) {
        this.anchor = anchor
        this.head = head
    }
    map(mapping) {
        return new GapSelectionBookmark(mapping.map(this.anchor), mapping.map(this.head))
    }
    resolve(doc) {
        let $anchor = doc.resolve(this.anchor)
        let $head = doc.resolve(this.head)
        if((GapSelection.isGapLocation($anchor))||(GapSelection.isGapLocation($head))) {
            return GapSelection.between($anchor, $head)
        }
        else {
            return Selection.near($head)
        }
    }
}

function closedBefore($pos) {
    for (let d = $pos.depth; d >= 0; d--) {
        let index = $pos.index(d)
        // At the start of this parent, look at next one
        if (index == 0) continue
        // See if the node before (or its first ancestor) is closed
        for (let before = $pos.node(d).child(index - 1);; before = before.lastChild) {
            if ((before.childCount == 0 && !before.inlineContent) || before.isAtom || before.type.spec.isolating) return true
            if (before.inlineContent) return false
        }
    }
    // Hit start of document
    return true
}

function closedAfter($pos) {
    for (let d = $pos.depth; d >= 0; d--) {
        let index = $pos.indexAfter(d), parent = $pos.node(d)
        if (index == parent.childCount) continue
        for (let after = parent.child(index);; after = after.firstChild) {
            if ((after.childCount == 0 && !after.inlineContent) || after.isAtom || after.type.spec.isolating) return true
            if (after.inlineContent) return false
        }
    }
    return true
}
