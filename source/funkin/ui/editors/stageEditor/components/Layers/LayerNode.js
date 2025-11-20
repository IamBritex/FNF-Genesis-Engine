export class LayerNode {
    constructor(data, isFolder = false) {
        this.id = isFolder ? `folder_${Date.now()}_${Math.random()}` : data.id;
        this.name = isFolder ? (data.name || "Group") : (data.name || "Layer");
        this.type = isFolder ? 'folder' : 'item';
        this.phaserElement = isFolder ? null : data.element;
        this.parent = null; 
        this.children = []; 
        this.expanded = false; 
        this.isRenaming = false;
        this.isDragging = false;
        this.y = 0; 
        this.targetY = 0; 
        this.height = 0; 
        this.dom = null;
    }
}