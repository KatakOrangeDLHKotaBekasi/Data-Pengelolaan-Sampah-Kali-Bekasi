/* ============================================
   AUTH MODULE - Pasukan Katak Orange
   ============================================ */

const Auth = {
    TOKEN_KEY: 'pko_token',
    ROLE_KEY: 'pko_role',
    NAME_KEY: 'pko_name',

    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    },

    getRole() {
        return localStorage.getItem(this.ROLE_KEY);
    },

    getName() {
        return localStorage.getItem(this.NAME_KEY);
    },

    isLoggedIn() {
        return !!this.getToken();
    },

    isAdmin() {
        return this.getRole() === 'admin';
    },

    isMember() {
        return this.getRole() === 'member';
    },

    setSession(token, role, name) {
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.ROLE_KEY, role);
        localStorage.setItem(this.NAME_KEY, name);
    },

    clearSession() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.ROLE_KEY);
        localStorage.removeItem(this.NAME_KEY);
    },

    async login(username, password) {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) {
                this.setSession(data.token, data.role, data.name);
                return { success: true, role: data.role, name: data.name };
            }
            return { success: false, message: data.message || 'Login gagal' };
        } catch (err) {
            return { success: false, message: 'Tidak dapat terhubung ke server' };
        }
    },

    async verify() {
        const token = this.getToken();
        if (!token) return false;
        try {
            const res = await fetch('/api/auth/verify', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                this.clearSession();
                return false;
            }
            return true;
        } catch {
            return false;
        }
    },

    async logout() {
        const token = this.getToken();
        if (token) {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch { }
        }
        this.clearSession();
        window.location.href = '/login.html';
    },

    requireAuth(redirectTo = '/login.html') {
        if (!this.isLoggedIn()) {
            window.location.href = redirectTo;
            return false;
        }
        return true;
    },

    requireAdmin(redirectTo = '/login.html') {
        if (!this.isLoggedIn() || !this.isAdmin()) {
            window.location.href = redirectTo;
            return false;
        }
        return true;
    },

    authHeaders() {
        return {
            'Authorization': `Bearer ${this.getToken()}`,
            'Content-Type': 'application/json'
        };
    },

    updateNavUI() {
        const authNav = document.querySelector('.nav-auth');
        if (!authNav) return;

        if (this.isLoggedIn()) {
            const role = this.getRole();
            const name = this.getName();
            const dashLink = role === 'admin' ? '/admin.html' : '/member.html';
            authNav.innerHTML = `
        <a href="${dashLink}" class="btn-nav btn-nav-outline">
          <i class="fas fa-tachometer-alt"></i> Dashboard
        </a>
        <button onclick="Auth.logout()" class="btn-nav btn-nav-fill">
          <i class="fas fa-sign-out-alt"></i> Logout
        </button>
      `;
        } else {
            authNav.innerHTML = `
        <a href="/login.html" class="btn-nav btn-nav-fill">
          <i class="fas fa-sign-in-alt"></i> Login
        </a>
      `;
        }
    }
};
