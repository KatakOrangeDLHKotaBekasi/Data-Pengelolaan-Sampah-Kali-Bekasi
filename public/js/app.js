/* ============================================
   MAIN APP - Pasukan Katak Orange
   ============================================ */

const API_BASE = '';

const App = {
    // API helper
    async api(endpoint, options = {}) {
        const url = API_BASE + endpoint;
        const config = {
            headers: { 'Content-Type': 'application/json' },
            ...options
        };
        if (Auth.getToken()) {
            config.headers['Authorization'] = `Bearer ${Auth.getToken()}`;
        }
        const res = await fetch(url, config);
        return res.json();
    },

    // Toast notification
    showToast(message, type = 'success') {
        let toast = document.getElementById('app-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'app-toast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 4000);
    },

    // Format number with thousand separator
    formatNumber(num) {
        if (num == null || isNaN(num)) return '0';
        return parseFloat(num).toLocaleString('id-ID', { maximumFractionDigits: 1 });
    },

    // Animate counting numbers
    animateCounter(el, target, duration = 2000) {
        const start = 0;
        const startTime = performance.now();
        const suffix = el.dataset.suffix || '';
        const prefix = el.dataset.prefix || '';
        const decimals = target % 1 !== 0 ? 1 : 0;

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = start + (target - start) * eased;
            el.textContent = prefix + App.formatNumber(current.toFixed(decimals)) + suffix;
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    },

    // Initialize counter animations on scroll
    initCounters() {
        const counters = document.querySelectorAll('[data-count]');
        if (!counters.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.dataset.animated) {
                    entry.target.dataset.animated = 'true';
                    const target = parseFloat(entry.target.dataset.count);
                    App.animateCounter(entry.target, target);
                }
            });
        }, { threshold: 0.3 });

        counters.forEach(c => observer.observe(c));
    },

    // Scroll animations
    initScrollAnimations() {
        const els = document.querySelectorAll('.animate-on-scroll');
        if (!els.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fadeInUp');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        els.forEach(el => {
            el.style.opacity = '0';
            observer.observe(el);
        });
    },

    // Sticky navbar
    initNavbar() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        });

        // Mobile toggle
        const toggle = document.querySelector('.nav-toggle');
        const links = document.querySelector('.nav-links');
        if (toggle && links) {
            toggle.addEventListener('click', () => {
                links.classList.toggle('show');
            });

            // Close on link click
            links.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => links.classList.remove('show'));
            });
        }

        // Update auth UI
        Auth.updateNavUI();
    },

    // 3D Card tilt effect
    initTiltCards() {
        document.querySelectorAll('.card-3d, .stat-card, .chart-card').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                card.style.transform = `perspective(800px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) translateZ(10px)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    },

    // Build query string from filters
    _buildQuery(filters = {}) {
        const params = [];
        if (filters.bulan) params.push(`bulan=${encodeURIComponent(filters.bulan)}`);
        if (filters.kategori) params.push(`kategori=${encodeURIComponent(filters.kategori)}`);
        if (filters.tahun) params.push(`tahun=${encodeURIComponent(filters.tahun)}`);
        if (filters.tgl) params.push(`tgl=${encodeURIComponent(filters.tgl)}`);
        return params.length ? '?' + params.join('&') : '';
    },

    // Load reports from API (supports bulan, kategori, tahun, tgl filters)
    async loadReports(filters = {}) {
        try {
            const query = this._buildQuery(filters);
            const result = await this.api(`/api/reports${query}`);
            return result.success ? result.data : [];
        } catch (err) {
            console.error('Error loading reports:', err);
            return [];
        }
    },

    // Load statistics (no filters — global)
    async loadStatistics() {
        try {
            const result = await this.api('/api/statistics');
            return result.success ? result.data : null;
        } catch (err) {
            console.error('Error loading stats:', err);
            return null;
        }
    },

    // Load statistics with filters (bulan, kategori, tahun, tgl)
    async loadStatisticsFiltered(filters = {}) {
        try {
            const query = this._buildQuery(filters);
            const result = await this.api(`/api/statistics${query}`);
            return result.success ? result.data : null;
        } catch (err) {
            console.error('Error loading filtered stats:', err);
            return null;
        }
    },

    // Render data table
    renderTable(data, containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container || !data.length) {
            if (container) container.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding: 2rem;">Tidak ada data</p>';
            return;
        }

        const perPage = options.perPage || 20;
        const page = options.page || 1;
        const start = (page - 1) * perPage;
        const pageData = data.slice(start, start + perPage);
        const totalPages = Math.ceil(data.length / perPage);

        const getCategoryBadge = (cat) => {
            if (!cat) return '';
            const lower = cat.toLowerCase();
            if (lower.includes('organic') && !lower.includes('non')) return 'badge-organic';
            if (lower.includes('non')) return 'badge-non-organic';
            if (lower.includes('residu')) return 'badge-residu';
            return 'badge-non-organic';
        };

        let html = `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Tanggal</th>
              <th>Bulan</th>
              <th>Kategori</th>
              <th>Item Sampah</th>
              <th>Berat (kg)</th>
              <th>Rata/Hari</th>
              <th>Total (kg)</th>
            </tr>
          </thead>
          <tbody>`;

        pageData.forEach((row, i) => {
            html += `
        <tr>
          <td>${start + i + 1}</td>
          <td>${row.tgl}</td>
          <td>${row.bulan}</td>
          <td><span class="badge ${getCategoryBadge(row.kategori_sampah)}">${row.kategori_sampah}</span></td>
          <td>${row.item_sampah}</td>
          <td>${this.formatNumber(row.berat)}</td>
          <td>${row.rata_perhari ? this.formatNumber(row.rata_perhari) : '-'}</td>
          <td>${row.total_berat ? this.formatNumber(row.total_berat) : '-'}</td>
        </tr>`;
        });

        html += '</tbody></table></div>';

        // Pagination
        if (totalPages > 1) {
            html += '<div class="pagination">';
            if (page > 1) html += `<button class="page-btn" onclick="App.changePage('${containerId}', ${page - 1})">&laquo; Prev</button>`;
            for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) {
                html += `<button class="page-btn ${p === page ? 'active' : ''}" onclick="App.changePage('${containerId}', ${p})">${p}</button>`;
            }
            if (page < totalPages) html += `<button class="page-btn" onclick="App.changePage('${containerId}', ${page + 1})">Next &raquo;</button>`;
            html += '</div>';
        }

        container.innerHTML = html;
    },

    // Global data store for pagination
    _tableData: {},

    changePage(containerId, page) {
        const data = this._tableData[containerId];
        if (data) this.renderTable(data, containerId, { page, perPage: 20 });
    },

    // Init
    init() {
        this.initNavbar();
        this.initCounters();
        this.initScrollAnimations();
        setTimeout(() => this.initTiltCards(), 500);
    }
};

// Auto init on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => App.init());
