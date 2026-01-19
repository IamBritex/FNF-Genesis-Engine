/**
 * @fileoverview Genesis FS API - File System Access Wrapper
 */

const Genesis = {
    fs: {
        /**
         * @param {Object} [options]
         * @returns {Promise<FileSystemFileHandle|null>}
         */
        async openFile(options = {}) {
            try {
                const [handle] = await window.showOpenFilePicker(options);
                return handle;
            } catch (e) {
                return null;
            }
        },

        /**
         * @returns {Promise<FileSystemDirectoryHandle|null>}
         */
        async openFolder() {
            try {
                return await window.showDirectoryPicker();
            } catch (e) {
                return null;
            }
        },

        /**
         * @param {FileSystemFileHandle} fileHandle
         * @returns {Promise<string>}
         */
        async readFile(fileHandle) {
            const file = await fileHandle.getFile();
            return await file.text();
        },

        /**
         * @param {FileSystemFileHandle} fileHandle
         * @param {string|Blob|BufferSource} content
         * @returns {Promise<void>}
         */
        async writeFile(fileHandle, content) {
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
        },

        /**
         * @param {string|Blob|BufferSource} content
         * @param {Object} [options]
         * @returns {Promise<FileSystemFileHandle|null>}
         */
        async saveAs(content, options = {}) {
            try {
                const handle = await window.showSaveFilePicker(options);
                const writable = await handle.createWritable();
                await writable.write(content);
                await writable.close();
                return handle;
            } catch (e) {
                return null;
            }
        },

        /**
         * @param {FileSystemDirectoryHandle} dirHandle
         * @param {string} name
         * @returns {Promise<FileSystemDirectoryHandle>}
         */
        async createDirectory(dirHandle, name) {
            return await dirHandle.getDirectoryHandle(name, { create: true });
        },

        /**
         * @param {FileSystemDirectoryHandle} dirHandle
         * @param {string} name
         * @returns {Promise<FileSystemFileHandle>}
         */
        async createFile(dirHandle, name) {
            return await dirHandle.getFileHandle(name, { create: true });
        },

        /**
         * @param {FileSystemDirectoryHandle} dirHandle
         * @param {string} name
         * @returns {Promise<void>}
         */
        async deleteEntry(dirHandle, name) {
            await dirHandle.removeEntry(name);
        },

        /**
         * @param {FileSystemDirectoryHandle} dirHandle
         * @param {string} name
         * @returns {Promise<FileSystemDirectoryHandle|FileSystemFileHandle|null>}
         */
        async getEntry(dirHandle, name) {
            try {
                return await dirHandle.getDirectoryHandle(name);
            } catch {
                try {
                    return await dirHandle.getFileHandle(name);
                } catch {
                    return null;
                }
            }
        }
    }
};

window.Genesis = Genesis;
export default Genesis;