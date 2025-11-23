import { LayerNode } from './Layers/LayerNode.js';
import { LayerAssetManager } from './Layers/LayerAssetManager.js';

export class LayersPanel {

    constructor(scene, elementsManager) {
        this.scene = scene;
        this.elementsManager = elementsManager;
        
        this.assetManager = new LayerAssetManager(scene, elementsManager);
        
        this.rootNodes = []; 
        this.itemHeight = 40;
        this.folderHeaderHeight = 32;
        this.gap = 4;

        this.dragItem = null;
        this.pendingDragNode = null; 
        this.dragStartY = 0;
        this.dragStartItemY = 0; 
        this.mergeCandidate = null;
        
        this.dragThreshold = 5; 
        this.isMouseDown = false;

        this.domElement = null;
        this.listContainer = null;
        this.panelWidth = 300;
        this.isPanelOpen = true;
        this.isLoadingStage = false; 
        this.isDropdownOpen = false;
        
        this.originalWrapper = null;
        this.popupWindow = null;

        this.boundUpdate = this.update.bind(this);
        this.boundOnPointerMove = this.onGlobalMove.bind(this);
        this.boundOnPointerUp = this.onGlobalUp.bind(this);
        this.boundStopPropagation = (e) => e.stopPropagation();
        this.boundCloseDropdown = (e) => this.checkCloseDropdown(e);

        this.createPanel();

        if (this.elementsManager) {
            this.elementsManager.onElementRegistered = (el) => {
                 if (!this.isLoadingStage) this.fullRefresh(); 
            };
            this.elementsManager.onElementUnregistered = () => this.fullRefresh();
            this.elementsManager.onSelectionChanged = (el) => this.highlightSelection(el);
        }

        this.scene.events.on('update', this.boundUpdate);
        window.addEventListener('pointermove', this.boundOnPointerMove);
        window.addEventListener('pointerup', this.boundOnPointerUp);
        window.addEventListener('mousedown', this.boundCloseDropdown);

        this.fullRefresh();
    }

    get panelContainer() {
        if (this.popupWindow && !this.popupWindow.closed) {
            return this.popupWindow.document.body;
        }
        return this.domElement ? this.domElement.node : null;
    }

    refreshList() {
        if (!this.isLoadingStage) this.fullRefresh();
    }

    loadFromJSON(stageContent, elementsManager) {
        if (!stageContent || !stageContent.stage) return;
        this.isLoadingStage = true;
        this.rootNodes = []; 
        const registeredElements = elementsManager.registeredElements;
        const assignedElements = new Set(); 
        const findPhaserElement = (namePath) => {
            return registeredElements.find(el => 
                el.getData('characterName') === namePath && !assignedElements.has(el)
            );
        };
        const findCharacterElement = (roleName) => {
             let searchName = '';
             if (roleName === 'player') searchName = 'Player (BF)';
             if (roleName === 'enemy') searchName = 'Opponent (Dad)';
             if (roleName.includes('gf')) searchName = 'Girlfriend (GF)';
             return registeredElements.find(el => el.getData('characterName') === searchName);
        };
        const parseNodes = (jsonNodes) => {
            const nodes = [];
            for (const nodeData of jsonNodes) {
                const keys = Object.keys(nodeData);
                const groupKey = keys.find(k => nodeData[k] && nodeData[k].type === 'group');
                if (groupKey) {
                    const groupContent = nodeData[groupKey];
                    const folderNode = new LayerNode({ name: groupKey }, true);
                    if (groupContent.children) {
                        const children = parseNodes(groupContent.children);
                        children.forEach(child => {
                            child.parent = folderNode;
                            folderNode.children.push(child);
                        });
                    }
                    nodes.push(folderNode);
                    continue;
                }
                let itemContent = nodeData;
                if (!itemContent.type && keys.length === 1) itemContent = nodeData[keys[0]];
                let phaserEl = null;
                let nodeName = "Unknown";
                if (itemContent.type === 'image' || itemContent.type === 'spritesheet') {
                    phaserEl = findPhaserElement(itemContent.namePath);
                    nodeName = itemContent.namePath;
                } else if (itemContent.type === 'character' || keys[0] === 'player' || keys[0] === 'enemy' || keys[0] === 'gfVersion' || keys[0] === 'playergf') {
                     phaserEl = findCharacterElement(keys[0]);
                     nodeName = phaserEl ? phaserEl.getData('characterName') : keys[0];
                }
                if (phaserEl && !assignedElements.has(phaserEl)) {
                    const itemNode = new LayerNode({ id: phaserEl.name, name: nodeName, element: phaserEl });
                    assignedElements.add(phaserEl); 
                    nodes.push(itemNode);
                }
            }
            return nodes;
        };
        const newRoots = parseNodes(stageContent.stage);
        registeredElements.forEach(el => {
            if (!assignedElements.has(el)) {
                const name = el.getData('characterName') || el.type;
                newRoots.unshift(new LayerNode({ id: el.name, name: name, element: el }));
            }
        });
        this.rootNodes = newRoots;
        this.rebuildDOM();
        this.applyPhaserDepth();
        this.isLoadingStage = false;
    }

    createPanel() {
        const html = this.scene.cache.text.get('html_layers');
        const css = this.scene.cache.text.get('css_layers');

        const navBarHeight = 30;
        const startX = this.scene.scale.width - this.panelWidth;

        this.domElement = this.scene.add.dom(startX, navBarHeight)
            .setOrigin(0, 0)
            .createFromHTML(html);
        
        this.domElement.node.style.pointerEvents = 'none'; 
        
        this.originalWrapper = this.domElement.node.querySelector('.layers-panel-wrapper');
        
        const container = this.domElement.node.querySelector('.layers-panel-container');
        container.style.width = `${this.panelWidth}px`;
        container.style.height = `${this.scene.scale.height - navBarHeight}px`;

        ['mousedown', 'wheel', 'pointerdown', 'dblclick', 'keydown'].forEach(evt => {
            this.domElement.node.addEventListener(evt, this.boundStopPropagation);
        });

        this.listContainer = this.domElement.node.querySelector('.layers-list-content');
        
        const style = document.createElement('style');
        style.innerHTML = css;
        this.domElement.node.appendChild(style);

        this.domElement.node.querySelector('.layers-toggle-btn').addEventListener('click', () => this.togglePanel());
        this.domElement.node.querySelector('.layers-popup-btn').addEventListener('click', () => this.openInPopup());
        
        const btnAdd = this.domElement.node.querySelector('#btn-add-menu');
        const btnAsset = this.domElement.node.querySelector('#dd-add-asset');
        const btnObject = this.domElement.node.querySelector('#dd-add-object');
        const fileInput = this.domElement.node.querySelector('#layers-file-input');

        btnAdd.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        btnAsset.addEventListener('click', () => {
            this.toggleDropdown(false);
            fileInput.click();
        });

        btnObject.addEventListener('click', () => {
            this.toggleDropdown(false);
            this.assetManager.createBasicObject();
        });

        fileInput.addEventListener('change', (event) => {
            const files = event.target.files;
            if (files.length > 0) {
                this.assetManager.onAssetsSelected(files);
            }
            fileInput.value = '';
        });
    }

    toggleDropdown(forceState) {
        const container = this.panelContainer;
        if (!container) return; 

        const dropdown = container.querySelector('#layers-add-dropdown');
        if (!dropdown) return; 

        if (forceState !== undefined) {
            this.isDropdownOpen = forceState;
        } else {
            this.isDropdownOpen = !this.isDropdownOpen;
        }
        dropdown.style.display = this.isDropdownOpen ? 'flex' : 'none';
    }

    checkCloseDropdown(e) {
        if (this.isDropdownOpen) {
            const container = this.panelContainer;
            if (!container) return;
            
            const dropdown = container.querySelector('#layers-add-dropdown');
            const btn = container.querySelector('#btn-add-menu');
            
            if (!dropdown || !btn) return;

            if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
                this.toggleDropdown(false);
            }
        }
    }

    openInPopup() {
        const w = 320;
        const h = 600;
        const specs = `width=${w},height=${h},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes,alwaysOnTop=yes`;
        this.popupWindow = window.open("", "_blank", specs);

        if (!this.popupWindow) return;
        
        // Copiar estilos globales y específicos
        Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).forEach(styleNode => {
            this.popupWindow.document.head.appendChild(styleNode.cloneNode(true));
        });

        this.popupWindow.document.body.style.backgroundColor = '#2a1836';
        this.popupWindow.document.body.style.margin = '0';
        this.popupWindow.document.body.style.overflow = 'hidden';
        this.popupWindow.document.body.classList.add('editor-scope');

        const container = this.domElement.node.querySelector('.layers-panel-container');
        
        const popupBtn = container.querySelector('.layers-popup-btn');
        if(popupBtn) popupBtn.style.display = 'none';
        const toggleBtn = container.querySelector('.layers-toggle-btn');
        if(toggleBtn) toggleBtn.style.display = 'none';
        
        this.toggleDropdown(false);

        container.style.width = '100%';
        container.style.height = '100vh';
        container.style.border = 'none';

        this.popupWindow.document.body.appendChild(container);

        window.removeEventListener('pointermove', this.boundOnPointerMove);
        window.removeEventListener('pointerup', this.boundOnPointerUp);
        window.removeEventListener('mousedown', this.boundCloseDropdown);
        
        this.popupWindow.addEventListener('pointermove', this.boundOnPointerMove);
        this.popupWindow.addEventListener('pointerup', this.boundOnPointerUp);
        this.popupWindow.addEventListener('mousedown', this.boundCloseDropdown);

        this.domElement.setVisible(false);

        this.popupWindow.addEventListener('beforeunload', () => {
            if(popupBtn) popupBtn.style.display = 'flex';
            if(toggleBtn) toggleBtn.style.display = 'flex';

            const navBarHeight = 30;
            container.style.width = `${this.panelWidth}px`;
            container.style.height = `${this.scene.scale.height - navBarHeight}px`;
            container.style.border = '2px solid #663399';
            container.style.borderRight = 'none';

            if (this.originalWrapper) {
                this.originalWrapper.appendChild(container);
            }
            this.domElement.setVisible(true);

            if(this.popupWindow) {
                this.popupWindow.removeEventListener('pointermove', this.boundOnPointerMove);
                this.popupWindow.removeEventListener('pointerup', this.boundOnPointerUp);
                this.popupWindow.removeEventListener('mousedown', this.boundCloseDropdown);
            }

            window.addEventListener('pointermove', this.boundOnPointerMove);
            window.addEventListener('pointerup', this.boundOnPointerUp);
            window.addEventListener('mousedown', this.boundCloseDropdown);
            
            this.popupWindow = null;
        });
    }
    
    fullRefresh() {
        if (!this.elementsManager || this.isLoadingStage) return;
        const currentPhaserElements = this.elementsManager.registeredElements;
        const existingNodesMap = new Map();
        const mapNodes = (nodes) => {
            nodes.forEach(n => {
                if (n.phaserElement) existingNodesMap.set(n.phaserElement, n);
                if (n.type === 'folder') mapNodes(n.children);
            });
        };
        mapNodes(this.rootNodes);
        const processedElements = new Set();
        currentPhaserElements.forEach(el => {
            processedElements.add(el);
            const existingNode = existingNodesMap.get(el);
            const name = el.getData('characterName') || el.texture.key || 'Element';
            if (existingNode) {
                if (!existingNode.isRenaming) existingNode.name = name;
            } else {
                const newNode = new LayerNode({ id: el.name || `el_${Date.now()}`, name: name, element: el });
                this.rootNodes.unshift(newNode); 
            }
        });
        const cleanTree = (nodes) => {
            for (let i = nodes.length - 1; i >= 0; i--) {
                const node = nodes[i];
                if (node.type === 'item' && !processedElements.has(node.phaserElement)) {
                    nodes.splice(i, 1);
                } else if (node.type === 'folder') {
                    cleanTree(node.children);
                }
            }
        };
        cleanTree(this.rootNodes);
        this.rebuildDOM();
    }

    cleanupEmptyFolders() {
        const clean = (nodes) => {
            for (let i = nodes.length - 1; i >= 0; i--) {
                const node = nodes[i];
                if (node.type === 'folder') {
                    clean(node.children);
                    if (node.children.length === 0) nodes.splice(i, 1);
                }
            }
        };
        clean(this.rootNodes);
    }

    rebuildDOM() {
        this.listContainer.innerHTML = '';
        const renderTree = (nodes, depth) => {
            nodes.forEach(node => {
                const el = this.createNodeDOM(node, depth);
                this.listContainer.appendChild(el);
                node.dom = el;
                if (node.type === 'folder' && node.expanded) renderTree(node.children, depth + 1);
            });
        };
        renderTree(this.rootNodes, 0);
        this.calculateLayout(); 
        const syncPos = (nodes) => {
            nodes.forEach(n => {
                n.y = n.targetY;
                if(n.dom) n.dom.style.transform = `translateY(${n.y}px)`;
                if(n.children) syncPos(n.children);
            });
        };
        syncPos(this.rootNodes);
    }

    createNodeDOM(node, depth) {
        const wrapper = document.createElement('div');
        wrapper.className = 'layer-node-wrapper';
        const indent = depth * 15;
        wrapper.style.width = `calc(100% - ${indent}px)`;
        wrapper.style.left = `${indent}px`; 
        const content = document.createElement('div');
        content.className = node.type === 'folder' ? 'layer-folder-header' : 'layer-item';
        if (node.type === 'item' && this.elementsManager.selectedElement === node.phaserElement) {
            content.classList.add('selected');
        }
        if (node.type === 'folder') {
            const iconSrc = node.expanded ? 'public/images/ui/editors/collapse.svg' : 'public/images/ui/editors/expand.svg';
            content.innerHTML = `<div class="folder-arrow-btn"><img src="${iconSrc}" width="12" height="12" style="pointer-events:none;"></div><span class="folder-title">${node.name}</span>`;
            content.querySelector('.folder-arrow-btn').addEventListener('click', e => {
                e.stopPropagation();
                node.expanded = !node.expanded;
                this.rebuildDOM();
            });
            content.querySelector('.folder-title').addEventListener('dblclick', e => {
                e.stopPropagation();
                this.startRenaming(node, content, content.querySelector('.folder-title'));
            });
        } else {
            const visIcon = node.phaserElement.visible ? 'public/images/ui/editors/visibility.svg' : 'public/images/ui/editors/visibility_off.svg';
            content.innerHTML = `<div class="layer-content-inner"><span class="layer-name">${node.name}</span><div class="layer-buttons"><button class="btn-vis"><img src="${visIcon}" width="16"></button><span class="layer-grip">☰</span></div></div>`;
            content.querySelector('.btn-vis').addEventListener('click', e => {
                e.stopPropagation();
                node.phaserElement.visible = !node.phaserElement.visible;
                e.target.closest('img').src = node.phaserElement.visible ? 'public/images/ui/editors/visibility.svg' : 'public/images/ui/editors/visibility_off.svg';
            });
            content.addEventListener('click', () => {
                if (!node.isDragging) this.elementsManager.setSelected(node.phaserElement);
            });
        }
        content.addEventListener('pointerdown', (e) => this.onItemDown(e, node));
        wrapper.appendChild(content);
        return wrapper;
    }

    calculateLayout() {
        let currentY = 0;
        const traverse = (nodes) => {
            nodes.forEach(node => {
                node.targetY = currentY;
                const h = (node.type === 'folder') ? this.folderHeaderHeight : this.itemHeight;
                node.height = h;
                currentY += h + this.gap;
                if (node.type === 'folder' && node.expanded) {
                    traverse(node.children);
                }
            });
        };
        traverse(this.rootNodes);
        this.listContainer.style.height = `${currentY + 50}px`;
    }

    update() {
        const updateNode = (node) => {
            if (!node.isDragging) {
                const diff = node.targetY - node.y;
                if (Math.abs(diff) > 0.5) node.y += diff * 0.35; 
                else node.y = node.targetY;
            }
            if (node.dom) {
                node.dom.style.transform = `translateY(${node.y}px)`;
                if (node.isDragging) node.dom.style.zIndex = 9999;
                else node.dom.style.zIndex = 1; 
            }
        };
        const traverse = (nodes) => {
            nodes.forEach(node => {
                updateNode(node);
                if (node.type === 'folder' && node.expanded) traverse(node.children);
            });
        };
        traverse(this.rootNodes);
    }

    onItemDown(e, node) {
        if (e.button !== 0 || node.isRenaming) return;
        e.stopPropagation(); 

        this.isMouseDown = true;
        this.dragStartY = e.clientY;
        this.dragStartItemY = node.y;
        this.pendingDragNode = node; 
    }

    onGlobalMove(e) {
        if (this.dragItem) {
            const delta = e.clientY - this.dragStartY;
            this.dragItem.y = this.dragStartItemY + delta;
            this.handleDragInteractions(this.dragItem);
            return;
        }

        if (this.isMouseDown && this.pendingDragNode) {
            const dist = Math.abs(e.clientY - this.dragStartY);
            if (dist > this.dragThreshold) {
                this.dragItem = this.pendingDragNode;
                this.pendingDragNode = null; 
                this.dragItem.isDragging = true;

                const content = this.dragItem.dom.querySelector(this.dragItem.type === 'folder' ? '.layer-folder-header' : '.layer-item');
                if(content) content.classList.add('dragging');
            }
        }
    }

    onGlobalUp(e) {
        this.isMouseDown = false;

        if (this.pendingDragNode) {
            if (this.pendingDragNode.type === 'item' && this.elementsManager) {
                this.elementsManager.setSelected(this.pendingDragNode.phaserElement);
            }
            this.pendingDragNode = null;
        }

        if (!this.dragItem) return; 

        const item = this.dragItem;
        this.dragItem = null;
        item.isDragging = false;

        const content = item.dom.querySelector(item.type === 'folder' ? '.layer-folder-header' : '.layer-item');
        if(content) content.classList.remove('dragging');

        if (this.mergeCandidate) {
            this.executeMerge(item, this.mergeCandidate);
            this.clearMergeCandidate();
        }

        this.cleanupEmptyFolders();
        this.rebuildDOM(); 
        this.applyPhaserDepth(); 
    }
    
    handleDragInteractions(dragItem) {
        this.clearMergeCandidate();
        const visibleNodes = [];
        const traverse = (nodes) => {
            nodes.forEach(n => {
                visibleNodes.push(n);
                if (n.type === 'folder' && n.expanded) traverse(n.children);
            });
        };
        traverse(this.rootNodes);
        const dragCenter = dragItem.y + (dragItem.height / 2);
        for (const target of visibleNodes) {
            if (target === dragItem) continue;
            if (this.isDescendant(dragItem, target)) continue; 
            const targetCenter = target.y + (target.height / 2);
            const threshold = target.height / 2;
            const dist = Math.abs(dragCenter - targetCenter);
            if (dist < threshold) {
                const mergeZone = 10; 
                if (dist < mergeZone) {
                    if (target.type === 'folder' && dragItem.type !== 'folder') {
                         this.setMergeCandidate(target);
                         return; 
                    } else if (target.type === 'item' && dragItem.type === 'item' && !target.parent && !dragItem.parent) {
                         this.setMergeCandidate(target);
                         return;
                    }
                }
                if (dragItem.y > target.y && dragItem.targetY < target.targetY) this.swapNodes(dragItem, target, 'after');
                else if (dragItem.y < target.y && dragItem.targetY > target.targetY) this.swapNodes(dragItem, target, 'before');
            }
        }
    }

    swapNodes(dragNode, targetNode, direction) {
        this.removeNodeFromTree(dragNode);
        const targetList = targetNode.parent ? targetNode.parent.children : this.rootNodes;
        let targetIdx = targetList.indexOf(targetNode);
        if (direction === 'after') targetIdx++;
        targetList.splice(targetIdx, 0, dragNode);
        dragNode.parent = targetNode.parent;
        this.calculateLayout();
    }

    isDescendant(parent, child) {
        if (parent.type !== 'folder') return false;
        if (parent.children.includes(child)) return true;
        return parent.children.some(c => this.isDescendant(c, child));
    }

    removeNodeFromTree(node) {
        const list = node.parent ? node.parent.children : this.rootNodes;
        const idx = list.indexOf(node);
        if (idx > -1) list.splice(idx, 1);
    }

    setMergeCandidate(node) {
        if (this.mergeCandidate !== node) {
            this.clearMergeCandidate();
            this.mergeCandidate = node;
            const content = node.dom.querySelector(node.type === 'folder' ? '.layer-folder-header' : '.layer-item');
            if(content) content.classList.add('merge-target');
        }
    }

    clearMergeCandidate() {
        if (this.mergeCandidate) {
            const content = this.mergeCandidate.dom.querySelector(this.mergeCandidate.type === 'folder' ? '.layer-folder-header' : '.layer-item');
            if(content) content.classList.remove('merge-target');
            this.mergeCandidate = null;
        }
    }

    executeMerge(dragged, target) {
        this.removeNodeFromTree(dragged);
        if (target.type === 'folder') {
            target.children.unshift(dragged);
            dragged.parent = target;
            target.expanded = true;
        } else {
            const targetList = target.parent ? target.parent.children : this.rootNodes;
            const idx = targetList.indexOf(target);
            targetList.splice(idx, 1);
            const newFolder = new LayerNode({}, true);
            newFolder.parent = target.parent;
            newFolder.expanded = true; 
            newFolder.children.push(target);
            newFolder.children.push(dragged);
            target.parent = newFolder;
            dragged.parent = newFolder;
            targetList.splice(idx, 0, newFolder);
        }
    }

    applyPhaserDepth() {
        const allItems = [];
        const collect = (nodes) => {
            nodes.forEach(n => {
                if (n.type === 'item') allItems.push(n);
                if (n.type === 'folder') collect(n.children);
            });
        };
        collect(this.rootNodes);
        const maxDepth = allItems.length;
        allItems.forEach((node, index) => {
            if (node.phaserElement) {
                node.phaserElement.setDepth(maxDepth - index);
            }
        });
        if (this.scene.propertiesWindow) this.scene.propertiesWindow.refreshValues();
    }

    startRenaming(node, headerEl, titleSpan) {
        node.isRenaming = true;
        titleSpan.style.display = 'none';
        const input = document.createElement('input');
        input.type = 'text';
        input.value = node.name;
        input.className = 'folder-rename-input';
        headerEl.appendChild(input);
        input.focus();
        input.select();
        const save = () => {
            node.name = input.value || "Group";
            node.isRenaming = false;
            if (input.parentNode) input.parentNode.removeChild(input);
            titleSpan.textContent = node.name;
            titleSpan.style.display = 'inline';
        };
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
            e.stopPropagation(); 
            if (e.key === 'Enter') input.blur();
        });
        input.addEventListener('pointerdown', e => e.stopPropagation());
    }

    highlightSelection(el) {
        const traverse = (nodes) => {
            nodes.forEach(node => {
                if (node.dom) {
                    const content = node.dom.querySelector(node.type === 'folder' ? '.layer-folder-header' : '.layer-item');
                    if (content) {
                        if (node.type === 'item' && node.phaserElement === el) content.classList.add('selected');
                        else content.classList.remove('selected');
                    }
                }
                if (node.children) traverse(node.children);
            });
        };
        traverse(this.rootNodes);
    }

    togglePanel() {
        if (this.isAnimating) return;
        this.isPanelOpen = !this.isPanelOpen;
        this.isAnimating = true;
        const targetX = this.isPanelOpen ? (this.scene.scale.width - this.panelWidth) : this.scene.scale.width;
        const btn = this.domElement.node.querySelector('.layers-toggle-btn');
        this.scene.tweens.add({
            targets: this.domElement,
            x: targetX,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.isAnimating = false;
                btn.textContent = this.isPanelOpen ? '>' : '<';
            }
        });
    }

    destroy() {
        this.scene.events.off('update', this.boundUpdate);
        window.removeEventListener('pointermove', this.boundOnPointerMove);
        window.removeEventListener('pointerup', this.boundOnPointerUp);
        window.removeEventListener('mousedown', this.boundCloseDropdown);
        if (this.popupWindow) {
            this.popupWindow.removeEventListener('pointermove', this.boundOnPointerMove);
            this.popupWindow.removeEventListener('pointerup', this.boundOnPointerUp);
            this.popupWindow.close();
        }
        if (this.domElement) this.domElement.destroy();
    }
}