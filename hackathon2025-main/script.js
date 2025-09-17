
document.addEventListener('DOMContentLoaded', () => {
    // ============================================
    // STATE MANAGEMENT
    // ============================================
    let currentPage = 'login';
    let pageHistory = [];
    let file = null;
    let loading = false;
    let lastResult = null;
    let verificationHistory = [];

    // ============================================
    // DOM ELEMENT REFERENCES
    // ============================================
    
    // Navigation & Layout
    const loginBgAnimation = document.getElementById('login-bg-animation');
    const navbar = document.getElementById('navbar');
    const userGreeting = document.getElementById('user-greeting');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const backBtn = document.getElementById('back-btn');
    const navBrand = document.getElementById('nav-brand');
    const uploadCertBtn = document.getElementById('upload-cert-btn');

    // Menu Elements
    const menuBtn = document.getElementById('menu-btn');
    const menuDropdown = document.getElementById('menu-dropdown');
    const menuThemeToggle = document.getElementById('menu-theme-toggle');
    const menuHistoryBtn = document.getElementById('menu-history');
    const logoutBtn = document.getElementById('logout-btn');
    const menuDashboardLink = document.getElementById('menu-dashboard-link');

    // Upload Page Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const dropZoneContent = document.getElementById('drop-zone-content');
    const verifyBtn = document.getElementById('verify-btn');
    const verifyBtnText = document.getElementById('verify-btn-text');
    const loader = document.getElementById('loader');
    const viewResultBtn = document.getElementById('view-result-btn');

    // Results Page Elements
    const cacheIndicator = document.getElementById('cache-indicator');
    const resultStatusText = document.getElementById('result-status-text');
    const qrCodeSection = document.getElementById('qr-code-section');
    const qrCodeResult = document.getElementById('qr-code-result');
    const resultTamperScore = document.getElementById('result-tamper-score');
    const resultAnalysisSummary = document.getElementById('result-analysis-summary');
    const dynamicDetailsContainer = document.getElementById('dynamic-details-container');
    const verifyAnotherBtn = document.getElementById('verify-another-btn');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');

    // History Page Elements
    const historyList = document.getElementById('history-list');
    const noHistoryMsg = document.getElementById('no-history-msg');
    const historySearch = document.getElementById('history-search');
    const historyFilter = document.getElementById('history-filter');

    // Dashboard Elements
    const adminTotalVerifications = document.getElementById('admin-total-verifications');
    const adminHighRiskAlerts = document.getElementById('admin-high-risk-alerts');
    const adminSupportTickets = document.getElementById('admin-support-tickets');
    const instName = document.getElementById('inst-name');
    const instVerificationsToday = document.getElementById('inst-verifications-today');
    const instTotalRecords = document.getElementById('inst-total-records');

    // Modal Elements
    const errorModal = document.getElementById('error-modal');
    const errorMessage = document.getElementById('error-message');
    const closeErrorModal = document.getElementById('close-error-modal');
    const contactFab = document.getElementById('contact-fab');
    const contactModal = document.getElementById('contact-modal');
    const closeContactModal = document.getElementById('close-contact-modal');
    const contactForm = document.getElementById('contact-form');
    const contactTextarea = document.getElementById('contact-textarea');
    const contactSuccessMsg = document.getElementById('contact-success');

    // ============================================
    // THEME MANAGEMENT
    // ============================================
    
    const initializeTheme = () => {
        const theme = localStorage.getItem('theme') || 'light';
        document.documentElement.classList.toggle('dark', theme === 'dark');
        updateThemeToggle();
    };

    const toggleTheme = () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateThemeToggle();
    };

    const updateThemeToggle = () => {
        if (!menuThemeToggle) return;
        const isDark = document.documentElement.classList.contains('dark');
        menuThemeToggle.innerHTML = `
            <svg class="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${isDark ? 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707' : 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z'}"/>
            </svg>
            <span>${isDark ? 'Light Mode' : 'Dark Mode'}</span>
        `;
    };

    // ============================================
    // NAVIGATION SYSTEM
    // ============================================
    
    const navigateTo = (page, isBackAction = false) => {
        if (!isBackAction && currentPage !== page) {
            pageHistory.push(currentPage);
        }
        
        currentPage = page;
        
        // Hide all sections
        document.querySelectorAll('main section').forEach(section => {
            section.classList.add('hidden');
            section.classList.remove('animate-fade-in');
        });
        
        // Show target section
        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            setTimeout(() => targetPage.classList.add('animate-fade-in'), 10);
        }
        
        // Update navigation visibility
        navbar.classList.toggle('hidden', page === 'login');
        if (contactFab) contactFab.classList.toggle('hidden', page === 'login');
        loginBgAnimation.classList.toggle('hidden', page !== 'login');
        backBtn.classList.toggle('hidden', pageHistory.length === 0 || page === 'landing');
        
        // Page-specific initializations
        if (page === 'upload') {
            updateUploadPageUI();
        } else if (page === 'history') {
            renderHistory();
        } else if (page.includes('dashboard')) {
            loadDashboardData();
        }
        
        // Close menu dropdown
        if (menuDropdown) {
            menuDropdown.classList.add('hidden');
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBack = () => {
        const lastPage = pageHistory.pop();
        if (lastPage) {
            navigateTo(lastPage, true);
        }
    };

    // ============================================
    // AUTHENTICATION & USER MANAGEMENT
    // ============================================
    
    const handleLogin = async (e) => {
        e.preventDefault();
        loginError.classList.add('hidden');
        
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');
        
        // Add loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <div class="flex items-center justify-center space-x-2">
                <div class="loading-spinner"></div>
                <span>Signing In...</span>
            </div>
        `;
        
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }
            
            // Store authentication data
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userName', data.userName);
            localStorage.setItem('userRole', data.userRole);
            
            setupUIForLoggedInUser(data.userName, data.userRole);
            navigateTo('landing');
            
        } catch (error) {
            loginError.textContent = error.message;
            loginError.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    };

    const handleLogout = () => {
        // Clear all stored data
        localStorage.clear();
        sessionStorage.clear();
        
        // Reset state
        pageHistory = [];
        file = null;
        lastResult = null;
        verificationHistory = [];
        
        // Navigate to login
        navigateTo('login');
        
        // Show success message
        setTimeout(() => {
            showNotification('You have been logged out successfully', 'info');
        }, 500);
    };

    const checkExistingToken = async () => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            navigateTo('login');
            return;
        }
        
        try {
            const response = await fetch('/check_auth', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Session expired');
            
            const data = await response.json();
            setupUIForLoggedInUser(data.userName, data.userRole);
            navigateTo('landing');
            
        } catch (error) {
            console.warn('Token validation failed:', error);
            handleLogout();
        }
    };

    const setupUIForLoggedInUser = (name, role) => {
        if (userGreeting) {
            userGreeting.textContent = `Hello, ${name}`;
        }
        
        if (menuDashboardLink) {
            menuDashboardLink.classList.add('hidden');
            
            if (role === 'admin') {
                menuDashboardLink.innerHTML = `
                    <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    <span>Admin Dashboard</span>
                `;
                menuDashboardLink.dataset.page = "admin-dashboard";
                menuDashboardLink.classList.remove('hidden');
            } else if (role === 'institution') {
                menuDashboardLink.innerHTML = `
                    <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                    <span>Institution Dashboard</span>
                `;
                menuDashboardLink.dataset.page = "institution-dashboard";
                menuDashboardLink.classList.remove('hidden');
            }
        }
    };

    // ============================================
    // API & DATA HANDLING
    // ============================================
    
    const fetchWithAuth = async (url, options = {}) => {
        const token = localStorage.getItem('authToken');
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
        
        const response = await fetch(url, { ...options, headers });
        
        if (response.status === 401) {
            showNotification('Session expired. Please log in again.', 'error');
            handleLogout();
            throw new Error('Session expired');
        }
        
        return response;
    };

    const handleVerification = async () => {
        if (!file) {
            showErrorModal("Please select a file to verify.");
            return;
        }
        
        loading = true;
        updateVerifyButtonState();
        
        if (loader) {
            loader.classList.remove('hidden');
            loader.classList.add('flex');
        }
        
        if (verifyBtnText) {
            verifyBtnText.classList.add('hidden');
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        try {
            const response = await fetchWithAuth('/process_document', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Verification failed');
            }
            
            renderResults(data);
            navigateTo('results');
            showNotification('Document verification completed successfully!', 'success');
            
        } catch (error) {
            console.error('Verification error:', error);
            showErrorModal(error.message || 'An error occurred during verification. Please try again.');
        } finally {
            loading = false;
            updateVerifyButtonState();
            
            if (loader) {
                loader.classList.add('hidden');
                loader.classList.remove('flex');
            }
            
            if (verifyBtnText) {
                verifyBtnText.classList.remove('hidden');
            }
        }
    };

    const loadDashboardData = async () => {
        const role = localStorage.getItem('userRole');
        let url = '';
        
        if (role === 'admin') {
            url = '/admin/dashboard_data';
        } else if (role === 'institution') {
            url = '/institution/dashboard_data';
        } else {
            return;
        }
        
        try {
            const response = await fetchWithAuth(url);
            const data = await response.json();
            
            if (role === 'admin') {
                if (adminTotalVerifications) adminTotalVerifications.textContent = data.total_verifications || 0;
                if (adminHighRiskAlerts) adminHighRiskAlerts.textContent = data.high_risk_alerts || 0;
                if (adminSupportTickets) adminSupportTickets.textContent = data.support_tickets || 0;
            } else if (role === 'institution') {
                if (instName) instName.textContent = data.institution_name || 'Institution';
                if (instVerificationsToday) instVerificationsToday.textContent = data.verifications_today || 0;
                if (instTotalRecords) instTotalRecords.textContent = data.total_records_in_db || 0;
            }
            
        } catch (error) {
            console.error('Dashboard data loading error:', error);
            showErrorModal("Could not load dashboard data. Please refresh the page.");
        }
    };

    // ============================================
    // UI UPDATE FUNCTIONS
    // ============================================
    
    const updateFileDisplay = () => {
        if (!dropZone || !dropZoneContent) return;
        
        if (file) {
            dropZone.className = 'upload-zone border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 border-green-500 bg-green-50 dark:bg-green-900/20 active';
            dropZoneContent.innerHTML = `
                <svg class="w-16 h-16 text-green-500 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <h3 class="text-xl font-medium text-green-700 dark:text-green-300 mb-2">${file.name}</h3>
                <p class="text-green-600 dark:text-green-400 mb-4">File selected and ready to verify</p>
                <p class="text-sm text-green-500 dark:text-green-500">Size: ${formatFileSize(file.size)}</p>
            `;
        } else {
            dropZone.className = 'upload-zone border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-gray-700';
            dropZoneContent.innerHTML = `
                <svg class="w-16 h-16 text-gray-400 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
                <h3 class="text-xl font-medium text-gray-900 dark:text-white mb-2">Drag & Drop document</h3>
                <p class="text-gray-600 dark:text-gray-400 mb-4">or click to browse</p>
                <p class="text-sm text-gray-500 dark:text-gray-500">Supports PDF, PNG, JPG, JPEG (Max 10MB)</p>
            `;
        }
        
        updateVerifyButtonState();
    };

    const updateUploadPageUI = () => {
        updateFileDisplay();
        if (viewResultBtn) {
            viewResultBtn.classList.toggle('hidden', !lastResult);
        }
    };

    const updateVerifyButtonState = () => {
        if (!verifyBtn || !verifyBtnText) return;
        
        const hasFile = file !== null;
        verifyBtn.disabled = loading || !hasFile;
        
        if (!hasFile) {
            verifyBtn.className = 'flex-1 py-4 rounded-xl text-white font-medium transition-all duration-300 bg-gray-400 cursor-not-allowed';
            verifyBtnText.textContent = 'Select a file to verify';
        } else if (loading) {
            verifyBtn.className = 'flex-1 py-4 rounded-xl text-white font-medium transition-all duration-300 bg-blue-400 cursor-wait';
            verifyBtnText.textContent = 'Verifying document...';
        } else {
            verifyBtn.className = 'flex-1 py-4 rounded-xl text-white font-medium transition-all duration-300 button-gradient hover-lift hover-glow';
            verifyBtnText.textContent = 'Verify Document';
        }
    };

    // ============================================
    // FILE HANDLING
    // ============================================
    
    const handleFileSelect = (selectedFile) => {
        if (!selectedFile) return;
        
        // Validate file type
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(selectedFile.type)) {
            showErrorModal('Please select a valid file type (PDF, PNG, JPG, JPEG).');
            return;
        }
        
        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (selectedFile.size > maxSize) {
            showErrorModal('File size must be less than 10MB.');
            return;
        }
        
        file = selectedFile;
        updateFileDisplay();
        showNotification(`File "${selectedFile.name}" selected successfully!`, 'success');
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // ============================================
    // RESULTS RENDERING
    // ============================================
    
    const renderResults = (data) => {
        lastResult = data;
        
        // Cache indicator
        if (cacheIndicator && data.retrieved_from_cache) {
            cacheIndicator.classList.remove('hidden');
        } else if (cacheIndicator) {
            cacheIndicator.classList.add('hidden');
        }
        
        // QR Code section
        if (qrCodeSection && qrCodeResult) {
            if (data.qr_code_data) {
                qrCodeSection.classList.remove('hidden');
                qrCodeResult.textContent = data.qr_code_data;
            } else {
                qrCodeSection.classList.add('hidden');
            }
        }
        
        // Verification status
        if (resultStatusText) {
            const status = data.verification_status || 'Unknown';
            resultStatusText.textContent = status;
            
            if (status.toLowerCase().includes('verified') || status.toLowerCase().includes('authentic')) {
                resultStatusText.className = 'text-3xl font-bold status-verified animate-pulse-slow';
            } else {
                resultStatusText.className = 'text-3xl font-bold status-failed animate-pulse-slow';
            }
        }
        
        // Tamper analysis
        if (data.tamper_analysis) {
            const score = data.tamper_analysis.tamper_score || 0;
            const summary = data.tamper_analysis.analysis_summary || 'No analysis available';
            
            if (resultTamperScore) {
                resultTamperScore.textContent = `${score} / 100`;
                
                if (score > 70) {
                    resultTamperScore.className = 'font-bold text-2xl text-red-600 dark:text-red-400 animate-pulse-slow';
                } else if (score > 30) {
                    resultTamperScore.className = 'font-bold text-2xl text-yellow-600 dark:text-yellow-400';
                } else {
                    resultTamperScore.className = 'font-bold text-2xl text-green-600 dark:text-green-400';
                }
            }
            
            if (resultAnalysisSummary) {
                resultAnalysisSummary.textContent = summary;
            }
        }
        
        // Extracted details
        renderExtractedDetails(data.extracted_details || {});
        
        // Add to history if not already present
        if (!verificationHistory.some(item => item.file_hash === data.file_hash)) {
            verificationHistory.unshift({
                ...data,
                processing_timestamp: data.processing_timestamp || new Date().toISOString()
            });
        }
    };

    const renderExtractedDetails = (details) => {
        if (!dynamicDetailsContainer) return;
        
        dynamicDetailsContainer.innerHTML = '';
        
        if (!details || Object.keys(details).length === 0) {
            dynamicDetailsContainer.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <p class="text-gray-500 dark:text-gray-400">No structured details could be extracted from this document.</p>
                </div>
            `;
            return;
        }
        
        Object.entries(details).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '') return;
            
            const formattedKey = key.replace(/_/g, ' ')
                                  .replace(/\b\w/g, l => l.toUpperCase());
            
            const detailElement = document.createElement('div');
            const isLongValue = String(value).length > 40;
            detailElement.className = isLongValue ? 'md:col-span-2' : '';
            
            detailElement.innerHTML = `
                <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg hover-lift">
                    <dt class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">${formattedKey}</dt>
                    <dd class="text-sm text-gray-900 dark:text-white font-medium break-words">${value}</dd>
                </div>
            `;
            
            dynamicDetailsContainer.appendChild(detailElement);
        });
    };

    // ============================================
    // HISTORY MANAGEMENT
    // ============================================
    
    const renderHistory = () => {
        if (!historyList || !noHistoryMsg) return;
        
        const searchTerm = historySearch?.value.toLowerCase() || '';
        const filterStatus = historyFilter?.value || 'all';
        
        const filteredHistory = verificationHistory.filter(item => {
            const details = item.extracted_details || {};
            
            // Search filter
            const matchesSearch = !searchTerm || 
                Object.values(details).some(value => 
                    String(value).toLowerCase().includes(searchTerm)
                ) ||
                (item.verification_status && item.verification_status.toLowerCase().includes(searchTerm));
            
            // Status filter
            const matchesFilter = filterStatus === 'all' || 
                item.verification_status === filterStatus;
            
            return matchesSearch && matchesFilter;
        });
        
        historyList.innerHTML = '';
        
        if (filteredHistory.length === 0) {
            noHistoryMsg.classList.remove('hidden');
        } else {
            noHistoryMsg.classList.add('hidden');
            
            filteredHistory.forEach((item, index) => {
                const historyItem = createHistoryItem(item, index);
                historyList.appendChild(historyItem);
            });
        }
    };

    const createHistoryItem = (item, index) => {
        const div = document.createElement('div');
        div.className = 'card-modern p-6 hover-lift';
        
        const details = item.extracted_details || {};
        const status = item.verification_status || 'Unknown';
        const timestamp = new Date(item.processing_timestamp || Date.now()).toLocaleString();
        
        const statusClass = status.toLowerCase().includes('verified') 
            ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200'
            : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200';
        
        const score = item.tamper_analysis?.tamper_score || 0;
        const scoreColor = score > 70 ? 'text-red-600' : score > 30 ? 'text-yellow-600' : 'text-green-600';
        
        div.innerHTML = `
            <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        ${details.name || details.document_name || 'Unknown Document'}
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        Doc No: ${details.document_number || details.roll_no || 'N/A'}
                    </p>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-medium ${statusClass}">
                    ${status}
                </span>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                    <span class="text-gray-600 dark:text-gray-400">Verified:</span>
                    <span class="text-gray-900 dark:text-white ml-1">${timestamp}</span>
                </div>
                <div>
                    <span class="text-gray-600 dark:text-gray-400">Tamper Score:</span>
                    <span class="font-semibold ml-1 ${scoreColor} dark:${scoreColor.replace('600', '400')}">${score}/100</span>
                </div>
            </div>
            
            <div class="flex space-x-2">
                <button onclick="viewHistoryItem(${index})" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
                    View Details
                </button>
                <button onclick="deleteHistoryItem(${index})" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm">
                    Delete
                </button>
            </div>
        `;
        
        return div;
    };

    // ============================================
    // NOTIFICATION SYSTEM
    // ============================================
    
    const showNotification = (message, type = 'info') => {
        const notification = document.createElement('div');
        notification.className = `fixed top-20 right-4 z-50 max-w-sm p-4 rounded-xl shadow-lg animate-slide-up ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    ${type === 'success' ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>' :
                      type === 'error' ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>' :
                      type === 'warning' ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>' :
                      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>'}
                </svg>
                <span class="text-sm font-medium">${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    };

    // ============================================
    // MODAL MANAGEMENT
    // ============================================
    
    const showErrorModal = (message) => {
        if (!errorModal || !errorMessage) return;
        errorMessage.textContent = message || "An unexpected error occurred.";
        errorModal.classList.remove('hidden');
    };

    const hideErrorModal = () => {
        if (errorModal) {
            errorModal.classList.add('hidden');
        }
    };

    // ============================================
    // GLOBAL FUNCTIONS (for onclick handlers)
    // ============================================
    
    window.viewHistoryItem = (index) => {
        const item = verificationHistory[index];
        if (item) {
            renderResults(item);
            navigateTo('results');
        }
    };

    window.deleteHistoryItem = (index) => {
        if (confirm('Are you sure you want to delete this verification record?')) {
            verificationHistory.splice(index, 1);
            renderHistory();
            showNotification('Verification record deleted', 'success');
        }
    };

    // ============================================
    // EVENT LISTENERS
    // ============================================
    
    // Initialize theme
    initializeTheme();
    
    // Login form
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Theme toggle
    if (menuThemeToggle) {
        menuThemeToggle.addEventListener('click', toggleTheme);
    }
    
    // Navigation
    if (backBtn) {
        backBtn.addEventListener('click', handleBack);
    }
    
    // Menu toggle
    if (menuBtn && menuDropdown) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menuDropdown.classList.toggle('hidden');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!menuBtn.contains(e.target) && !menuDropdown.contains(e.target)) {
                menuDropdown.classList.add('hidden');
            }
        });
    }
    
    // Navigation buttons
    document.addEventListener('click', (e) => {
        if (e.target.dataset.page) {
            navigateTo(e.target.dataset.page);
        }
    });
    
    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // File upload
    if (dropZone && fileInput) {
        // Click to select file
        dropZone.addEventListener('click', () => fileInput.click());
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
            }
        });
        
        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
        });
        
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            if (!file) {
                dropZone.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
            }
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/20');
            
            const files = e.dataTransfer.files;
            if (files[0]) {
                handleFileSelect(files[0]);
            }
        });
    }
    
    // Verify button
    if (verifyBtn) {
        verifyBtn.addEventListener('click', handleVerification);
    }
    
    // View result button
    if (viewResultBtn) {
        viewResultBtn.addEventListener('click', () => {
            if (lastResult) {
                navigateTo('results');
            }
        });
    }
    
    // History search and filter
    if (historySearch) {
        historySearch.addEventListener('input', renderHistory);
    }
    
    if (historyFilter) {
        historyFilter.addEventListener('change', renderHistory);
    }
    
    // Contact modal
    if (contactFab && contactModal) {
        contactFab.addEventListener('click', () => {
            contactModal.classList.remove('hidden');
        });
    }
    
    if (closeContactModal && contactModal) {
        closeContactModal.addEventListener('click', () => {
            contactModal.classList.add('hidden');
        });
    }
    
    if (contactForm && contactSuccessMsg) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Here you would normally send the contact form data to your server
            contactSuccessMsg.classList.remove('hidden');
            setTimeout(() => {
                contactModal.classList.add('hidden');
                contactSuccessMsg.classList.add('hidden');
                contactForm.reset();
            }, 2000);
        });
    }
    
    // Error modal
    if (closeErrorModal) {
        closeErrorModal.addEventListener('click', hideErrorModal);
    }
    
    if (errorModal) {
        errorModal.addEventListener('click', (e) => {
            if (e.target === errorModal) {
                hideErrorModal();
            }
        });
    }
    
    // Download PDF button
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', () => {
            if (lastResult) {
                // This would typically generate and download a PDF report
                showNotification('PDF download functionality would be implemented here', 'info');
            }
        });
    }
    
    // ============================================
    // KEYBOARD SHORTCUTS
    // ============================================
    
    document.addEventListener('keydown', (e) => {
        // ESC key to close modals
        if (e.key === 'Escape') {
            if (errorModal && !errorModal.classList.contains('hidden')) {
                hideErrorModal();
            }
            if (contactModal && !contactModal.classList.contains('hidden')) {
                contactModal.classList.add('hidden');
            }
            if (menuDropdown && !menuDropdown.classList.contains('hidden')) {
                menuDropdown.classList.add('hidden');
            }
        }
        
        // Ctrl+U for upload page
        if (e.ctrlKey && e.key === 'u' && currentPage !== 'login') {
            e.preventDefault();
            navigateTo('upload');
        }
        
        // Ctrl+H for history page
        if (e.ctrlKey && e.key === 'h' && currentPage !== 'login') {
            e.preventDefault();
            navigateTo('history');
        }
        
        // Ctrl+L for logout
        if (e.ctrlKey && e.key === 'l' && currentPage !== 'login') {
            e.preventDefault();
            handleLogout();
        }
    });
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    // Check for existing authentication token
    checkExistingToken();
    
    // Set up periodic token validation (every 30 minutes)
    setInterval(() => {
        const token = localStorage.getItem('authToken');
        if (token && currentPage !== 'login') {
            checkExistingToken();
        }
    }, 30 * 60 * 1000); // 30 minutes
    
    // Initialize UI state
    updateFileDisplay();
    updateVerifyButtonState();
    
    console.log('Certificate Verifier Application Initialized Successfully');
});
