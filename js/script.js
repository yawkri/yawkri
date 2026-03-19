/* ============================================
   TEMPLATE MANAGER - FULL VERSION
   All features: CRUD, Search, Drag&Drop,
   Grid Control, Eye Preview, Expand, Delete Modal
   ============================================ */

class TemplateManager {
    constructor() {
        this.templates = this.load();
        this.columns = this.loadCols();
        this.currentEditId = null;
        this.pendingDeleteId = null;
        this.activeDropdownId = null;
        this.eyeHoverTimeout = null;
        this.currentPreviewId = null;

        // Drag state
        this.draggedId = null;
        this.dragOverId = null;

        this.cacheDOM();
        this.bindEvents();
        this.render();
    }

    /* ========== STORAGE ========== */
    load() {
        try {
            const data = localStorage.getItem('tm_templates');
            return data ? JSON.parse(data) : [];
        } catch { return []; }
    }

    save() {
        localStorage.setItem('tm_templates', JSON.stringify(this.templates));
    }

    loadCols() {
        return parseInt(localStorage.getItem('tm_cols') || '2', 10);
    }

    saveCols() {
        localStorage.setItem('tm_cols', String(this.columns));
    }

    /* ========== DOM CACHE ========== */
    cacheDOM() {
        // Buttons
        this.$newBtn = document.getElementById('newTemplateBtn');
        this.$emptyCreateBtn = document.getElementById('emptyCreateBtn');

        // Search
        this.$searchInput = document.getElementById('searchInput');
        this.$searchClear = document.getElementById('searchClear');

        // Grid
        this.$grid = document.getElementById('templatesGrid');
        this.$gridBtns = document.querySelectorAll('.grid-btn');

        // Sidebar list
        this.$sidebarList = document.getElementById('sidebarList');

        // States
        this.$emptyState = document.getElementById('emptyState');
        this.$noResults = document.getElementById('noResults');

        // Count
        this.$count = document.getElementById('templateCount');

        // CREATE/EDIT Modal
        this.$modalOverlay = document.getElementById('modalOverlay');
        this.$modalTitle = document.getElementById('modalTitle');
        this.$titleInput = document.getElementById('templateTitleInput');
        this.$contentInput = document.getElementById('templateContentInput');
        this.$modalClose = document.getElementById('modalClose');
        this.$modalCancel = document.getElementById('modalCancel');
        this.$modalSave = document.getElementById('modalSave');

        // DELETE Modal
        this.$deleteOverlay = document.getElementById('deleteOverlay');
        this.$deleteTemplateName = document.getElementById('deleteTemplateName');
        this.$deleteCancelBtn = document.getElementById('deleteCancelBtn');
        this.$deleteConfirmBtn = document.getElementById('deleteConfirmBtn');

        // Preview Tooltip
        this.$preview = document.getElementById('previewTooltip');
        this.$previewTitle = document.getElementById('previewTooltipTitle');
        this.$previewContent = document.getElementById('previewTooltipContent');
        this.$previewExtend = document.getElementById('previewExtendBtn');
        this.$previewCopy = document.getElementById('previewCopyBtn');

        // Expand Modal
        this.$expandOverlay = document.getElementById('expandOverlay');
        this.$expandTitle = document.getElementById('expandTitle');
        this.$expandContent = document.getElementById('expandContent');
        this.$expandCopy = document.getElementById('expandCopyBtn');
        this.$expandClose = document.getElementById('expandClose');
    }

    /* ========== EVENTS ========== */
    bindEvents() {
        // New template
        this.$newBtn.addEventListener('click', () => this.openCreateModal());
        this.$emptyCreateBtn.addEventListener('click', () => this.openCreateModal());

        // Search
        this.$searchInput.addEventListener('input', () => this.onSearch());
        this.$searchClear.addEventListener('click', () => this.clearSearch());

        // Grid size buttons
        this.$gridBtns.forEach(btn => {
            btn.addEventListener('click', () => this.setColumns(parseInt(btn.dataset.cols, 10)));
        });

        // CREATE/EDIT modal actions
        this.$modalClose.addEventListener('click', () => this.closeCreateModal());
        this.$modalCancel.addEventListener('click', () => this.closeCreateModal());
        this.$modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.$modalOverlay) this.closeCreateModal();
        });
        this.$modalSave.addEventListener('click', () => this.saveTemplate());

        // Title → Tab moves to content
        this.$titleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); this.$contentInput.focus(); }
        });

        // DELETE modal actions
        this.$deleteCancelBtn.addEventListener('click', () => this.closeDeleteModal());
        this.$deleteOverlay.addEventListener('click', (e) => {
            if (e.target === this.$deleteOverlay) this.closeDeleteModal();
        });
        this.$deleteConfirmBtn.addEventListener('click', () => this.confirmDelete());

        // Preview tooltip buttons
        this.$previewExtend.addEventListener('click', () => this.openExpand());
        this.$previewCopy.addEventListener('click', () => {
            const t = this.getById(this.currentPreviewId);
            if (t) this.copyText(t.content, this.$previewCopy);
        });

        // Expand modal
        this.$expandClose.addEventListener('click', () => this.closeExpand());
        this.$expandOverlay.addEventListener('click', (e) => {
            if (e.target === this.$expandOverlay) this.closeExpand();
        });
        this.$expandCopy.addEventListener('click', () => {
            const t = this.getById(this.currentPreviewId);
            if (t) this.copyText(t.content, this.$expandCopy);
        });

        // Close dropdown on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.card-menu-wrap')) this.closeDropdowns();
        });

        // Hide preview on scroll or resize
        window.addEventListener('scroll', () => this.hidePreview(), true);
        window.addEventListener('resize', () => this.hidePreview());
    }

    /* ========== SEARCH ========== */
    onSearch() {
        const q = this.$searchInput.value.trim();
        this.$searchClear.classList.toggle('visible', q.length > 0);
        this.render();
    }

    clearSearch() {
        this.$searchInput.value = '';
        this.$searchClear.classList.remove('visible');
        this.render();
    }

    /* Advanced search: all keywords must match (in any order) against title + content */
    getFilteredTemplates() {
        const q = this.$searchInput.value.trim().toLowerCase();
        if (!q) return [...this.templates];

        const keywords = q.split(/\s+/).filter(Boolean);

        return this.templates.filter(t => {
            const haystack = (t.title + ' ' + t.content).toLowerCase();
            return keywords.every(kw => haystack.includes(kw));
        });
    }

    /* ========== GRID COLUMNS ========== */
    setColumns(n) {
        this.columns = n;
        this.saveCols();
        this.$gridBtns.forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.cols, 10) === n);
        });
        this.$grid.setAttribute('data-cols', n);
    }

    /* ========== CREATE / EDIT MODAL ========== */
    openCreateModal(template = null) {
        this.currentEditId = template ? template.id : null;
        this.$modalTitle.textContent = template ? 'Edit Template' : 'New Template';
        this.$titleInput.value = template ? template.title : '';
        this.$contentInput.value = template ? template.content : '';
        this.$modalOverlay.classList.add('open');
        setTimeout(() => this.$titleInput.focus(), 150);
    }

    closeCreateModal() {
        this.$modalOverlay.classList.remove('open');
        this.currentEditId = null;
    }

    saveTemplate() {
        const title = this.$titleInput.value.trim();
        const content = this.$contentInput.value.trim();
        if (!title || !content) {
            // Highlight empty fields
            if (!title) this.$titleInput.style.borderColor = 'var(--sentiment-negative)';
            if (!content) this.$contentInput.style.borderColor = 'var(--sentiment-negative)';
            setTimeout(() => {
                this.$titleInput.style.borderColor = '';
                this.$contentInput.style.borderColor = '';
            }, 1500);
            return;
        }

        if (this.currentEditId) {
            const idx = this.templates.findIndex(t => t.id === this.currentEditId);
            if (idx !== -1) {
                this.templates[idx].title = title;
                this.templates[idx].content = content;
                this.templates[idx].updatedAt = Date.now();
            }
        } else {
            this.templates.push({
                id: Date.now().toString(),
                title,
                content,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
        }

        this.save();
        this.closeCreateModal();
        this.render();
    }

    /* ========== DELETE MODAL ========== */
    openDeleteModal(id) {
        this.closeDropdowns();
        const t = this.getById(id);
        if (!t) return;
        this.pendingDeleteId = id;
        this.$deleteTemplateName.textContent = t.title;
        this.$deleteOverlay.classList.add('open');
    }

    closeDeleteModal() {
        this.$deleteOverlay.classList.remove('open');
        this.pendingDeleteId = null;
    }

    confirmDelete() {
        if (!this.pendingDeleteId) return;
        this.templates = this.templates.filter(t => t.id !== this.pendingDeleteId);
        this.save();
        this.closeDeleteModal();
        this.render();
    }

    /* ========== DROPDOWNS ========== */
    toggleDropdown(id) {
        const isOpen = this.activeDropdownId === id;
        this.closeDropdowns();
        if (!isOpen) {
            this.activeDropdownId = id;
            const dd = document.getElementById('dd-' + id);
            if (dd) dd.classList.add('open');
        }
    }

    closeDropdowns() {
        this.activeDropdownId = null;
        document.querySelectorAll('.dropdown.open').forEach(el => el.classList.remove('open'));
    }

    /* ========== COPY ========== */
    copyText(text, btn) {
        navigator.clipboard.writeText(text).then(() => {
            // Swap icon to checkmark
            btn.classList.add('copied');
            const origSvg = btn.querySelector('svg').outerHTML;
            btn.querySelector('svg').outerHTML; // keep reference
            btn.querySelector('svg').setAttribute('viewBox', '0 0 24 24');
            btn.querySelector('svg').innerHTML = '<polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';

            setTimeout(() => {
                btn.classList.remove('copied');
                // Restore original icon
                btn.innerHTML = btn.dataset.origHtml || btn.innerHTML;
            }, 2000);
        }).catch(() => {
            // Fallback for older browsers
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        });
    }

    /* ========== EYE / PREVIEW ========== */
    onEyeMouseEnter(id, eyeBtn) {
        this.clearEyeTimeout();
        this.eyeHoverTimeout = setTimeout(() => {
            this.showPreview(id, eyeBtn);
        }, 500);
    }

    onEyeMouseLeave() {
        this.clearEyeTimeout();
        // Small delay before hiding so user can move mouse to tooltip
        setTimeout(() => {
            if (!this.$preview.matches(':hover')) this.hidePreview();
        }, 120);
    }

    clearEyeTimeout() {
        if (this.eyeHoverTimeout) {
            clearTimeout(this.eyeHoverTimeout);
            this.eyeHoverTimeout = null;
        }
    }

    showPreview(id, eyeBtn) {
        const t = this.getById(id);
        if (!t) return;
        this.currentPreviewId = id;

        this.$previewTitle.textContent = t.title;
        this.$previewContent.textContent = t.content;

        // Reset copy buttons
        this.$previewCopy.classList.remove('copied');
        this.$previewCopy.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;

        // Position tooltip near the eye button
        const rect = eyeBtn.getBoundingClientRect();
        const tooltipW = 320;
        const tooltipH = 300;
        let left = rect.left - tooltipW - 10;
        let top = rect.top - 40;

        // Flip if out of viewport
        if (left < 10) left = rect.right + 10;
        if (top + tooltipH > window.innerHeight - 10) top = window.innerHeight - tooltipH - 10;
        if (top < 10) top = 10;

        this.$preview.style.left = left + 'px';
        this.$preview.style.top = top + 'px';
        this.$preview.classList.add('visible');
    }

    hidePreview() {
        this.$preview.classList.remove('visible');
    }

    /* ========== EXPAND POPUP ========== */
    openExpand() {
        const t = this.getById(this.currentPreviewId);
        if (!t) return;
        this.hidePreview();
        this.$expandTitle.textContent = t.title;
        this.$expandContent.textContent = t.content;

        // Reset copy button
        this.$expandCopy.classList.remove('copied');
        this.$expandCopy.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;

        this.$expandOverlay.classList.add('open');
    }

    closeExpand() {
        this.$expandOverlay.classList.remove('open');
    }

    /* ========== DRAG & DROP ========== */
    onDragStart(e, id) {
        this.draggedId = id;
        e.dataTransfer.effectAllowed = 'move';
        // Slight delay to allow visual update
        setTimeout(() => {
            const box = document.querySelector(`[data-id="${id}"]`);
            if (box) box.classList.add('dragging');
        }, 0);
    }

    onDragEnd() {
        document.querySelectorAll('.template-box').forEach(el => {
            el.classList.remove('dragging', 'drag-over');
        });
        this.draggedId = null;
        this.dragOverId = null;
    }

    onDragOver(e, id) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (id === this.draggedId) return;
        // Remove previous drag-over
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        const box = document.querySelector(`[data-id="${id}"]`);
        if (box) box.classList.add('drag-over');
        this.dragOverId = id;
    }

    onDragLeave() {
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        this.dragOverId = null;
    }

    onDrop(e, id) {
        e.preventDefault();
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        if (!this.draggedId || this.draggedId === id) return;

        const fromIdx = this.templates.findIndex(t => t.id === this.draggedId);
        const toIdx = this.templates.findIndex(t => t.id === id);
        if (fromIdx === -1 || toIdx === -1) return;

        // Swap positions
        const [moved] = this.templates.splice(fromIdx, 1);
        this.templates.splice(toIdx, 0, moved);
        this.save();
        this.render();
    }

    /* ========== HELPERS ========== */
    getById(id) {
        return this.templates.find(t => t.id === id) || null;
    }

    escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    /* ========== RENDER ========== */
    render() {
        const filtered = this.getFilteredTemplates();
        const hasTemplates = this.templates.length > 0;
        const hasResults = filtered.length > 0;
        const isSearching = this.$searchInput.value.trim().length > 0;

        // States
        this.$emptyState.classList.toggle('active', !hasTemplates);
        this.$noResults.classList.toggle('active', hasTemplates && isSearching && !hasResults);
        this.$grid.style.display = hasResults ? 'grid' : 'none';

        // Count
        this.$count.textContent = `${this.templates.length} Template${this.templates.length !== 1 ? 's' : ''}`;

        // Grid columns
        this.$grid.setAttribute('data-cols', this.columns);

        // Render cards
        this.$grid.innerHTML = '';
        filtered.forEach(t => {
            this.$grid.appendChild(this.createCard(t));
        });

        // Sidebar list
        this.renderSidebar();
    }

    renderSidebar() {
        this.$sidebarList.innerHTML = '';
        this.templates.forEach(t => {
            const item = document.createElement('div');
            item.className = 'sidebar-item';
            item.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span>${this.escapeHtml(t.title)}</span>
            `;
            item.addEventListener('click', () => {
                // Scroll the card into view
                const card = document.querySelector(`[data-id="${t.id}"]`);
                if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
            this.$sidebarList.appendChild(item);
        });
    }

    createCard(t) {
        const card = document.createElement('div');
        card.className = 'template-box';
        card.setAttribute('data-id', t.id);
        card.setAttribute('draggable', 'true');

        card.innerHTML = `
            <!-- Header -->
            <div class="card-header">
                <div class="card-title">${this.escapeHtml(t.title)}</div>
                <div class="card-menu-wrap">
                    <button class="btn-dots" aria-label="More options">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
                    </button>
                    <div class="dropdown" id="dd-${t.id}">
                        <button class="dropdown-item" data-action="edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Edit
                        </button>
                        <button class="dropdown-item danger" data-action="delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            Delete
                        </button>
                    </div>
                </div>
            </div>

            <!-- Body -->
            <div class="card-body">
                <div class="card-content">${this.escapeHtml(t.content)}</div>
            </div>

            <!-- Footer -->
            <div class="card-footer">
                <button class="btn-copy" data-action="copy">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy
                </button>
                <button class="btn-eye" data-action="eye" aria-label="Preview">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
            </div>
        `;

        // --- Event Listeners on this card ---

        // Drag
        card.addEventListener('dragstart', (e) => this.onDragStart(e, t.id));
        card.addEventListener('dragend', () => this.onDragEnd());
        card.addEventListener('dragover', (e) => this.onDragOver(e, t.id));
        card.addEventListener('dragleave', () => this.onDragLeave());
        card.addEventListener('drop', (e) => this.onDrop(e, t.id));

        // Dots menu toggle
        card.querySelector('.btn-dots').addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown(t.id);
        });

        // Dropdown actions
        card.querySelector('[data-action="edit"]').addEventListener('click', () => {
            this.closeDropdowns();
            this.openCreateModal(t);
        });

        card.querySelector('[data-action="delete"]').addEventListener('click', () => {
            this.openDeleteModal(t.id);
        });

        // Copy button on card
        const copyBtn = card.querySelector('[data-action="copy"]');
        copyBtn.dataset.origHtml = copyBtn.innerHTML;
        copyBtn.addEventListener('click', () => {
            this.copyText(t.content, copyBtn);
        });

        // Eye button - hover preview
        const eyeBtn = card.querySelector('[data-action="eye"]');
        eyeBtn.addEventListener('mouseenter', () => this.onEyeMouseEnter(t.id, eyeBtn));
        eyeBtn.addEventListener('mouseleave', () => this.onEyeMouseLeave());

        return card;
    }
}

/* ========== PREVIEW TOOLTIP HOVER KEEP-ALIVE ========== */
document.addEventListener('DOMContentLoaded', () => {
    const tm = new TemplateManager();
    window._tm = tm; // expose for debugging

    // Keep preview visible when hovering over it
    const preview = document.getElementById('previewTooltip');
    preview.addEventListener('mouseenter', () => {
        tm.clearEyeTimeout();
    });
    preview.addEventListener('mouseleave', () => {
        tm.hidePreview();
    });
});
