document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let currentPage = 'login';
    let pageHistory = [];
    let file = null;
    let loading = false;
    let lastResult = null;
    let verificationHistory = [];

    // --- DOM ELEMENT REFERENCES ---
    const loginBgAnimation = document.getElementById('login-bg-animation');
    const navbar = document.getElementById('navbar');
    const userGreeting = document.getElementById('user-greeting');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const backBtn = document.getElementById('back-btn');
    const navBrand = document.getElementById('nav-brand');
    const uploadCertBtn = document.getElementById('upload-cert-btn');

    // Menu
    const menuBtn = document.getElementById('menu-btn');
    const menuDropdown = document.getElementById('menu-dropdown');
    const menuThemeToggle = document.getElementById('menu-theme-toggle');
    const menuHistoryBtn = document.getElementById('menu-history');
    const logoutBtn = document.getElementById('logout-btn');
    const menuDashboardLink = document.getElementById('menu-dashboard-link');

    // Upload Page
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const dropZoneContent = document.getElementById('drop-zone-content');
    const verifyBtn = document.getElementById('verify-btn');
    const verifyBtnText = document.getElementById('verify-btn-text');
    const loader = document.getElementById('loader');
    const viewResultBtn = document.getElementById('view-result-btn');

    // Results Page
    const cacheIndicator = document.getElementById('cache-indicator');
    const resultStatusText = document.getElementById('result-status-text');
    const qrCodeSection = document.getElementById('qr-code-section');
    const qrCodeResult = document.getElementById('qr-code-result');
    const resultTamperScore = document.getElementById('result-tamper-score');
    const resultAnalysisSummary = document.getElementById('result-analysis-summary');
    const dynamicDetailsContainer = document.getElementById('dynamic-details-container');
    const verifyAnotherBtn = document.getElementById('verify-another-btn');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');

    // History Page
    const historyList = document.getElementById('history-list');
    const noHistoryMsg = document.getElementById('no-history-msg');
    const historySearch = document.getElementById('history-search');
    const historyFilter = document.getElementById('history-filter');

    // Dashboards
    const adminTotalVerifications = document.getElementById('admin-total-verifications');
    const adminHighRiskAlerts = document.getElementById('admin-high-risk-alerts');
    const adminSupportTickets = document.getElementById('admin-support-tickets');
    const instName = document.getElementById('inst-name');
    const instVerificationsToday = document.getElementById('inst-verifications-today');
    const instTotalRecords = document.getElementById('inst-total-records');

    // Modals
    const errorModal = document.getElementById('error-modal');
    const errorMessage = document.getElementById('error-message');
    const closeErrorModal = document.getElementById('close-error-modal');
    const contactFab = document.getElementById('contact-fab');
    const contactModal = document.getElementById('contact-modal');
    const closeContactModal = document.getElementById('close-contact-modal');
    const contactForm = document.getElementById('contact-form');
    const contactTextarea = document.getElementById('contact-textarea');
    const contactSuccessMsg = document.getElementById('contact-success');


    // SVGs
    const sunIcon = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg> <span>Light Mode</span>`;
    const moonIcon = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg> <span>Dark Mode</span>`;

    // --- CORE FUNCTIONS ---

    const navigateTo = (page, isBackAction = false) => {
        if (!isBackAction && currentPage !== page) {
            pageHistory.push(currentPage);
        }
        currentPage = page;

        document.querySelectorAll('main section').forEach(p => p.classList.add('hidden'));
        const targetPage = document.getElementById(`${page}-page`);
        if (targetPage) {
            targetPage.classList.remove('hidden');
        }

        navbar.classList.toggle('hidden', page === 'login');
        if(contactFab) contactFab.classList.toggle('hidden', page === 'login');
        loginBgAnimation.classList.toggle('hidden', page !== 'login');
        backBtn.classList.toggle('hidden', pageHistory.length === 0 || page === 'landing');

        if (page === 'upload') {
            updateUploadPageUI();
        }
        if (page === 'history') {
            renderHistory();
        }
        if (page.includes('dashboard')) {
            loadDashboardData();
        }
        window.scrollTo(0, 0);
    };

    const showErrorModal = (message) => {
        errorMessage.textContent = message || "An unexpected error occurred.";
        errorModal.classList.remove('hidden');
    };

    const hideErrorModal = () => {
        errorModal.classList.add('hidden');
    };

    const handleBack = () => {
        const lastPage = pageHistory.pop();
        if (lastPage) {
            navigateTo(lastPage, true);
        }
    };

    // --- AUTHENTICATION & ROLES ---

    const handleLogin = async (e) => {
        e.preventDefault();
        loginError.classList.add('hidden');
        try {
            const response = await fetch('/login', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: e.target.email.value, password: e.target.password.value })
            });
            const data = await response.json();
            if (!response.ok) { throw new Error(data.message); }
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('userName', data.userName);
            localStorage.setItem('userRole', data.userRole);
            setupUIForLoggedInUser(data.userName, data.userRole);
            navigateTo('landing');
        } catch (error) {
            loginError.textContent = error.message;
            loginError.classList.remove('hidden');
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        pageHistory = [];
        navigateTo('login');
    };

    const checkExistingToken = async () => {
        const token = localStorage.getItem('authToken');
        if (!token) { navigateTo('login'); return; }
        try {
            const response = await fetch('/check_auth', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Session expired');
            const data = await response.json();
            setupUIForLoggedInUser(data.userName, data.userRole);
            navigateTo('landing');
        } catch (error) { handleLogout(); }
    };

    const setupUIForLoggedInUser = (name, role) => {
        userGreeting.textContent = `Hello, ${name}`;
        menuDashboardLink.classList.add('hidden');
        if (role === 'admin') {
            menuDashboardLink.innerHTML = `<span>Admin Dashboard</span>`;
            menuDashboardLink.dataset.page = "admin-dashboard";
            menuDashboardLink.classList.remove('hidden');
        } else if (role === 'institution') {
            menuDashboardLink.innerHTML = `<span>Institution Dashboard</span>`;
            menuDashboardLink.dataset.page = "institution-dashboard";
            menuDashboardLink.classList.remove('hidden');
        }
    };

    // --- API & DATA HANDLING ---

    const fetchWithAuth = async (url, options = {}) => {
        const token = localStorage.getItem('authToken');
        const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) { handleLogout(); throw new Error('Session expired.'); }
        return response;
    };

    const handleVerification = async () => {
        if (!file) { showErrorModal("Please select a file."); return; }
        loading = true; loader.classList.remove('hidden'); loader.classList.add('flex');
        verifyBtnText.classList.add('hidden'); updateVerifyButtonState();
        const formData = new FormData(); formData.append('file', file);
        try {
            const response = await fetchWithAuth('/process_document', { method: 'POST', body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            renderResults(data);
            navigateTo('results');
        } catch (error) {
            showErrorModal(error.message);
        } finally {
            loading = false; loader.classList.add('hidden'); loader.classList.remove('flex');
            verifyBtnText.classList.remove('hidden'); updateVerifyButtonState();
        }
    };

    const loadDashboardData = async () => {
        const role = localStorage.getItem('userRole');
        let url = '';
        if (role === 'admin') url = '/admin/dashboard_data';
        else if (role === 'institution') url = '/institution/dashboard_data';
        else return;
        try {
            const response = await fetchWithAuth(url);
            const data = await response.json();
            if (role === 'admin') {
                adminTotalVerifications.textContent = data.total_verifications;
                adminHighRiskAlerts.textContent = data.high_risk_alerts;
                adminSupportTickets.textContent = data.support_tickets;
            } else if (role === 'institution') {
                instName.textContent = data.institution_name;
                instVerificationsToday.textContent = data.verifications_today;
                instTotalRecords.textContent = data.total_records_in_db;
            }
        } catch(error) {
            showErrorModal("Could not load dashboard data.");
        }
    };

    // --- UI, RENDER & DISPLAY ---

    const updateFileDisplay = () => {
        if (file) {
            dropZone.className = 'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors border-green-500 bg-green-50 dark:bg-green-900/20';
            dropZoneContent.innerHTML = `<p class="text-green-700 dark:text-green-300 font-medium">${file.name}</p><p class="text-sm text-green-600 dark:text-green-400 mt-2">Ready to analyze</p>`;
        } else {
            dropZone.className = 'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-gray-700';
            dropZoneContent.innerHTML = `<svg class="h-12 w-12 mx-auto text-blue-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg><p class="text-gray-700 dark:text-gray-300 font-medium">Drag & Drop document</p><p class="text-sm text-gray-500 dark:text-gray-400 mt-2">or click to browse</p>`;
        }
        updateVerifyButtonState();
    };

    const updateUploadPageUI = () => { updateFileDisplay(); viewResultBtn.classList.toggle('hidden', !lastResult); };
    const updateVerifyButtonState = () => {
        const hasFile = file !== null;
        verifyBtn.disabled = loading || !hasFile;
        verifyBtn.className = `w-full py-3 rounded-md text-white font-medium transition ${!hasFile || loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`;
    };
    const handleFileSelect = (selectedFile) => { if (selectedFile) { file = selectedFile; updateFileDisplay(); } };

    const renderResults = (data) => {
        lastResult = data;
        cacheIndicator.classList.toggle('hidden', !data.retrieved_from_cache);
        if (data.qr_code_data) {
            qrCodeSection.classList.remove('hidden');
            qrCodeResult.textContent = data.qr_code_data;
        } else {
            qrCodeSection.classList.add('hidden');
        }
        const status = data.verification_status;
        resultStatusText.textContent = status;
        resultStatusText.className = status.includes('Verified') ? 'text-2xl font-bold text-green-600 dark:text-green-400' : 'text-2xl font-bold text-red-600 dark:text-red-400';
        const score = data.tamper_analysis.tamper_score;
        resultTamperScore.textContent = `${score} / 100`;
        resultAnalysisSummary.textContent = data.tamper_analysis.analysis_summary;
        if (score > 50) { resultTamperScore.className = 'font-bold text-xl text-red-600 dark:text-red-400'; }
        else if (score > 20) { resultTamperScore.className = 'font-bold text-xl text-yellow-600 dark:text-yellow-400'; }
        else { resultTamperScore.className = 'font-bold text-xl text-green-600 dark:text-green-400'; }

        const details = data.extracted_details;
        dynamicDetailsContainer.innerHTML = '';
        if (details && Object.keys(details).length > 0) {
            for (const key in details) {
                const value = details[key];
                const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const detailElement = document.createElement('div');
                const spanClass = String(value).length > 40 ? 'md:col-span-2' : '';
                detailElement.className = spanClass;
                detailElement.innerHTML = `<p class="text-sm text-gray-600 dark:text-gray-400">${formattedKey}</p><p class="font-medium break-words">${value}</p>`;
                dynamicDetailsContainer.appendChild(detailElement);
            }
        } else {
            dynamicDetailsContainer.innerHTML = `<p class="text-gray-500 md:col-span-2">No structured details could be extracted.</p>`;
        }

        if (!verificationHistory.some(item => item.file_hash === data.file_hash)) {
            verificationHistory.unshift(data);
        }
    };

    const renderHistory = () => {
        const searchTerm = historySearch.value.toLowerCase();
        const filterStatus = historyFilter.value;
        const filteredHistory = verificationHistory.filter(item => {
            const details = item.extracted_details;
            const matchesSearch = !searchTerm || (details.name && details.name.toLowerCase().includes(searchTerm)) || (details.document_number && details.document_number.toLowerCase().includes(searchTerm)) || (details.roll_no && details.roll_no.toLowerCase().includes(searchTerm));
            const matchesFilter = filterStatus === 'all' || item.verification_status === filterStatus;
            return matchesSearch && matchesFilter;
        });
        historyList.innerHTML = '';
        if (filteredHistory.length === 0) { noHistoryMsg.classList.remove('hidden'); }
        else {
            noHistoryMsg.classList.add('hidden');
            filteredHistory.forEach(item => {
                const li = document.createElement('div');
                li.className = 'bg-gray-100 dark:bg-gray-700 p-4 rounded-lg border dark:border-gray-600';
                const details = item.extracted_details, status = item.verification_status;
                let statusClass = status.includes('Verified') ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200';
                li.innerHTML = `<div class="flex justify-between items-center"><div><p class="font-semibold">${details.name || 'Unknown'}</p><p class="text-sm text-gray-500 dark:text-gray-400">Doc No: ${details.document_number || details.roll_no || 'N/A'}</p><p class="text-xs text-gray-400 dark:text-gray-500">Verified: ${new Date(item.processing_timestamp).toLocaleString()}</p></div><span class="px-3 py-1 rounded-full text-sm font-medium ${statusClass}">${status}</span></div>`;
                historyList.appendChild(li);
            });
        }
    };

    const resetVerification = () => { file = null; updateFileDisplay(); navigateTo('upload'); };

    const toggleTheme = () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.theme = isDark ? 'dark' : 'light';
        updateThemeToggleIcon();
    };

    const updateThemeToggleIcon = () => {
        menuThemeToggle.innerHTML = document.documentElement.classList.contains('dark') ? sunIcon : moonIcon;
    };

    const handleContactSubmit = async (e) => {
        e.preventDefault();
        const message = contactTextarea.value;
        if (message.trim().length < 10) { showErrorModal("Please provide a more detailed message."); return; }
        try {
            const response = await fetchWithAuth('/submit_ticket', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message })
            });
            if (!response.ok) throw new Error('Failed to submit ticket.');
            contactSuccessMsg.classList.remove('hidden');
            contactTextarea.value = '';
            setTimeout(() => {
                contactSuccessMsg.classList.add('hidden');
                contactModal.classList.add('hidden');
            }, 2000);
        } catch (error) { showErrorModal(error.message); }
    };

    const handleDownloadPdf = async () => {
        if (!lastResult) { showErrorModal("No result to download."); return; }
        try {
            const response = await fetchWithAuth('/generate_report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lastResult) });
            if (!response.ok) throw new Error('Failed to generate PDF report.');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `ProofPoint_Report_${lastResult.extracted_details.document_number || lastResult.extracted_details.roll_no || 'details'}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) { showErrorModal(error.message); }
    };

    // --- EVENT LISTENERS ---
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    uploadCertBtn.addEventListener('click', () => navigateTo('upload'));
    verifyBtn.addEventListener('click', handleVerification);
    viewResultBtn.addEventListener('click', () => navigateTo('results'));
    verifyAnotherBtn.addEventListener('click', resetVerification);
    closeErrorModal.addEventListener('click', hideErrorModal);
    backBtn.addEventListener('click', handleBack);
    navBrand.addEventListener('click', () => { pageHistory = []; navigateTo('landing'); });
    downloadPdfBtn.addEventListener('click', handleDownloadPdf);

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-blue-500'); });
    dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.classList.remove('border-blue-500'); });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500');
        handleFileSelect(e.dataTransfer.files[0]);
    });

    menuBtn.addEventListener('click', (e) => { e.stopPropagation(); menuDropdown.classList.toggle('hidden'); });
    menuThemeToggle.addEventListener('click', toggleTheme);
    menuHistoryBtn.addEventListener('click', () => navigateTo('history'));
    menuDashboardLink.addEventListener('click', (e) => navigateTo(e.currentTarget.dataset.page));

    historySearch.addEventListener('input', renderHistory);
    historyFilter.addEventListener('change', renderHistory);

    // ** THE FIX IS HERE **
    // Check if the contact form elements exist before adding listeners
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmit);
    }
    if (contactFab) {
        contactFab.addEventListener('click', () => {
            if (contactModal) contactModal.classList.remove('hidden');
        });
    }
    if (closeContactModal) {
        closeContactModal.addEventListener('click', () => {
            if (contactModal) contactModal.classList.add('hidden');
        });
    }

    document.addEventListener('click', (e) => {
        if (menuDropdown && menuBtn && !menuBtn.contains(e.target) && !menuDropdown.contains(e.target)) {
            menuDropdown.classList.add('hidden');
        }
    });

    // --- INITIALIZATION ---
    updateThemeToggleIcon();
    checkExistingToken();
});
