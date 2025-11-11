// JSON Viewer Component with Copy and Search functionality
class JsonViewer {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            theme: options.theme || 'dark',
            searchable: options.searchable !== false,
            copyable: options.copyable !== false,
            collapsible: options.collapsible !== false,
            maxHeight: options.maxHeight || '400px'
        };
        this.jsonData = null;
        this.searchTerm = '';
        this.init();
    }

    init() {
        if (!this.container) return;
        
        // Create viewer structure
        this.container.innerHTML = `
            <div class="json-viewer-wrapper">
                <div class="json-viewer-toolbar mb-2 p-2 bg-gray-100 rounded-t-lg">
                    <div class="flex flex-col gap-2">
                        <!-- First Row: Search, Collapse, and Action Buttons -->
                        <div class="flex flex-col sm:flex-row gap-2">
                            <!-- Search and Collapse -->
                            <div class="flex-1 flex items-center gap-2">
                                ${this.options.searchable ? `
                                    <div class="json-search-box flex items-center flex-1 max-w-xs">
                                        <input type="text" 
                                            class="json-search-input px-2 py-1 text-sm border rounded-l flex-1" 
                                            placeholder="Search JSON..."
                                            onkeyup="this.closest('.json-viewer-wrapper').jsonViewer.search(this.value)">
                                        <button class="json-search-clear px-2 py-1 text-sm bg-gray-300 rounded-r hover:bg-gray-400"
                                            onclick="this.closest('.json-viewer-wrapper').jsonViewer.clearSearch()">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
                                ` : ''}
                                ${this.options.collapsible ? `
                                    <button class="json-collapse-btn px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 whitespace-nowrap"
                                        onclick="this.closest('.json-viewer-wrapper').jsonViewer.toggleCollapse()">
                                        <i class="fas fa-compress-alt"></i> 
                                        <span class="hidden sm:inline">Collapse All</span>
                                    </button>
                                ` : ''}
                            </div>
                            <!-- Action Buttons -->
                            <div class="flex items-center gap-2">
                                ${this.options.copyable ? `
                                    <button class="json-copy-btn px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 whitespace-nowrap"
                                        onclick="this.closest('.json-viewer-wrapper').jsonViewer.copyJson()">
                                        <i class="fas fa-copy mr-1"></i>Copy
                                    </button>
                                ` : ''}
                                <button class="json-download-btn px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 whitespace-nowrap"
                                    onclick="this.closest('.json-viewer-wrapper').jsonViewer.downloadJson()">
                                    <i class="fas fa-download mr-1"></i>Download
                                </button>
                            </div>
                        </div>
                        <!-- Second Row: Stats (keys and size) -->
                        <div class="flex justify-end">
                            <span class="json-stats text-xs text-gray-600"></span>
                        </div>
                    </div>
                </div>
                <div class="json-viewer-content ${this.options.theme === 'dark' ? 'bg-gray-900' : 'bg-white'} p-4 rounded-b-lg overflow-auto" 
                     style="max-height: ${this.options.maxHeight}">
                    <pre class="json-content ${this.options.theme === 'dark' ? 'text-green-400' : 'text-gray-800'} text-xs font-mono"></pre>
                </div>
            </div>
        `;
        
        // Store reference to this instance
        this.container.querySelector('.json-viewer-wrapper').jsonViewer = this;
    }

    setJson(data, metadata = {}) {
        this.jsonData = data;
        this.metadata = metadata;
        const contentEl = this.container.querySelector('.json-content');
        
        if (!contentEl) return;
        
        // Format JSON with syntax highlighting
        const formatted = this.formatJson(data);
        contentEl.innerHTML = formatted;
        
        // Update stats
        this.updateStats();
        
        // Apply search if active
        if (this.searchTerm) {
            this.search(this.searchTerm);
        }
    }

    formatJson(data) {
        try {
            const jsonStr = JSON.stringify(data, null, 2);
            
            // Syntax highlighting
            return jsonStr
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"([^"]+)":/g, '<span class="json-key text-blue-400">"$1"</span>:')
                .replace(/: "([^"]*)"/g, ': <span class="json-string text-yellow-400">"$1"</span>')
                .replace(/: (\d+)/g, ': <span class="json-number text-purple-400">$1</span>')
                .replace(/: (true|false)/g, ': <span class="json-boolean text-orange-400">$1</span>')
                .replace(/: null/g, ': <span class="json-null text-gray-500">null</span>');
        } catch (e) {
            return '<span class="text-red-500">Invalid JSON</span>';
        }
    }

    search(term) {
        this.searchTerm = term.toLowerCase();
        const contentEl = this.container.querySelector('.json-content');
        
        if (!contentEl) return;
        
        // Reset highlighting
        const formatted = this.formatJson(this.jsonData);
        contentEl.innerHTML = formatted;
        
        if (!term) return;
        
        // Highlight search terms
        const html = contentEl.innerHTML;
        const regex = new RegExp(`(${term})`, 'gi');
        contentEl.innerHTML = html.replace(regex, '<mark class="bg-yellow-300 text-black">$1</mark>');
        
        // Update search count
        const matches = (html.match(regex) || []).length;
        const statsEl = this.container.querySelector('.json-stats');
        if (statsEl) {
            statsEl.textContent = matches > 0 ? `Found ${matches} matches` : 'No matches';
        }
    }

    clearSearch() {
        const searchInput = this.container.querySelector('.json-search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        this.search('');
        
        const statsEl = this.container.querySelector('.json-stats');
        if (statsEl) {
            statsEl.textContent = '';
        }
    }

    copyJson() {
        const jsonStr = JSON.stringify(this.jsonData, null, 2);
        navigator.clipboard.writeText(jsonStr).then(() => {
            const btn = this.container.querySelector('.json-copy-btn');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check mr-1"></i>Copied!';
            btn.classList.remove('bg-green-500');
            btn.classList.add('bg-green-600');
            
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.classList.remove('bg-green-600');
                btn.classList.add('bg-green-500');
            }, 2000);
        });
    }

    downloadJson() {
        const jsonStr = JSON.stringify(this.jsonData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.metadata.filename || 'data'}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    toggleCollapse() {
        // This would implement JSON tree collapse/expand functionality
        // For now, we'll toggle between full and compact view
        const contentEl = this.container.querySelector('.json-content');
        const btn = this.container.querySelector('.json-collapse-btn');
        
        if (contentEl.style.maxHeight === '100px') {
            contentEl.style.maxHeight = this.options.maxHeight;
            btn.innerHTML = '<i class="fas fa-compress-alt"></i> Collapse';
        } else {
            contentEl.style.maxHeight = '100px';
            btn.innerHTML = '<i class="fas fa-expand-alt"></i> Expand';
        }
    }

    updateStats() {
        const statsEl = this.container.querySelector('.json-stats');
        if (!statsEl || !this.jsonData) return;
        
        const size = new Blob([JSON.stringify(this.jsonData)]).size;
        const keys = this.countKeys(this.jsonData);
        
        statsEl.textContent = `${keys} keys, ${this.formatBytes(size)}`;
    }

    countKeys(obj) {
        let count = 0;
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                count++;
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    count += this.countKeys(obj[key]);
                }
            }
        }
        return count;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

// Helper function to create JSON viewers
function createJsonViewer(containerId, data, options = {}) {
    const viewer = new JsonViewer(containerId, options);
    if (data) {
        viewer.setJson(data, options.metadata || {});
    }
    return viewer;
}