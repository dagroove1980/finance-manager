// Main application logic
let currentPage = 'dashboard';
let accounts = [];
let categories = [];
let transactions = [];

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
    setupEventListeners();
    await loadDashboard();
});

async function initApp() {
    // Wait for Supabase to initialize
    await new Promise(resolve => {
        const checkSupabase = setInterval(() => {
            if (window.supabaseAPI) {
                clearInterval(checkSupabase);
                resolve();
            }
        }, 100);
    });
    
    // Load initial data
    accounts = await window.supabaseAPI.getAccounts();
    categories = await window.supabaseAPI.getCategories();
    transactions = await window.supabaseAPI.getTransactions({ limit: 100 });
    
    // Populate dropdowns
    populateAccountDropdowns();
    populateCategoryDropdowns();
    populateReportDateSelectors();
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const page = tab.dataset.page;
            switchPage(page);
        });
    });
    
    // Dashboard period selector
    document.getElementById('dashboard-period').addEventListener('change', async (e) => {
        await loadDashboard(e.target.value);
    });
    
    // Transaction filters
    document.getElementById('search-transactions').addEventListener('input', debounce(filterTransactions, 300));
    document.getElementById('filter-account').addEventListener('change', filterTransactions);
    document.getElementById('filter-category').addEventListener('change', filterTransactions);
    document.getElementById('filter-type').addEventListener('change', filterTransactions);
    document.getElementById('filter-date-from').addEventListener('change', filterTransactions);
    document.getElementById('filter-date-to').addEventListener('change', filterTransactions);
    
    // Buttons
    document.getElementById('import-transactions-btn').addEventListener('click', () => {
        document.getElementById('import-modal').classList.add('active');
    });
    
    document.getElementById('add-transaction-btn').addEventListener('click', () => {
        // TODO: Open add transaction modal
        alert('Add transaction feature coming soon!');
    });
    
    document.getElementById('add-account-btn').addEventListener('click', () => {
        // TODO: Open add account modal
        alert('Add account feature coming soon!');
    });
    
    // Modal close
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            document.getElementById('import-modal').classList.remove('active');
        });
    });
    
    // Import form
    document.getElementById('import-form').addEventListener('submit', handleImport);
    
    // Import source change - show bank links
    document.getElementById('import-source').addEventListener('change', (e) => {
        showBankLinks(e.target.value);
    });
    
    // File upload handling
    const fileInput = document.getElementById('csv-file');
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileSelected = document.getElementById('file-selected');
    const fileName = document.getElementById('file-name');
    const fileRemove = document.getElementById('file-remove');
    
    fileUploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            fileName.textContent = file.name;
            fileUploadArea.querySelector('.file-upload-placeholder').style.display = 'none';
            fileSelected.style.display = 'flex';
        }
    });
    
    fileRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.value = '';
        fileUploadArea.querySelector('.file-upload-placeholder').style.display = 'flex';
        fileSelected.style.display = 'none';
    });
    
    // Drag and drop
    fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadArea.classList.add('dragover');
    });
    
    fileUploadArea.addEventListener('dragleave', () => {
        fileUploadArea.classList.remove('dragover');
    });
    
    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const fileExt = files[0].name.toLowerCase();
            if (fileExt.endsWith('.csv') || fileExt.endsWith('.xlsx') || fileExt.endsWith('.xls')) {
                fileInput.files = files;
                fileName.textContent = files[0].name;
                fileUploadArea.querySelector('.file-upload-placeholder').style.display = 'none';
                fileSelected.style.display = 'flex';
            }
        }
    });
    
    // Cancel import
    document.getElementById('cancel-import').addEventListener('click', () => {
        document.getElementById('import-modal').classList.remove('active');
        document.getElementById('import-form').reset();
        fileUploadArea.querySelector('.file-upload-placeholder').style.display = 'flex';
        fileSelected.style.display = 'none';
    });
    
    // Report selectors
    document.getElementById('report-month').addEventListener('change', loadReport);
    document.getElementById('report-year').addEventListener('change', loadReport);
}

function switchPage(page) {
    currentPage = page;
    
    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.page === page);
    });
    
    // Update pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === `${page}-page`);
    });
    
    // Load page-specific data
    switch(page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'transactions':
            loadTransactions();
            break;
        case 'accounts':
            loadAccounts();
            break;
        case 'reports':
            loadReport();
            break;
        case 'insights':
            loadInsights();
            break;
    }
}

async function loadDashboard(period = 'month') {
    const stats = await window.supabaseAPI.getStatistics(period);
    if (!stats) return;
    
    // Update summary cards
    accounts = await window.supabaseAPI.getAccounts();
    const totalAssets = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);
    
    document.getElementById('total-assets').textContent = formatCurrency(totalAssets);
    document.getElementById('monthly-income').textContent = formatCurrency(stats.totalIncome);
    document.getElementById('monthly-expenses').textContent = formatCurrency(stats.totalExpenses);
    document.getElementById('net-flow').textContent = formatCurrency(stats.netFlow);
    
    // Update import status widget
    await renderImportStatus();
    
    // Update account balances
    renderAccountBalances(accounts);
    
    // Update charts
    await renderExpenseTrendChart(period);
    renderCategoryPieChart(stats.expensesByCategory);
    
    // Update recent transactions
    const recentTransactions = await window.supabaseAPI.getTransactions({ limit: 10 });
    renderRecentTransactions(recentTransactions);
}

function renderAccountBalances(accounts) {
    const container = document.getElementById('accounts-grid');
    container.innerHTML = accounts.map(acc => {
        let balanceText = formatCurrency(acc.balance || 0);
        let dateText = '';
        
        // Show "last known" with date if available
        if (acc.last_import_date) {
            const date = new Date(acc.last_import_date);
            const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            dateText = `<div class="account-balance-date">Last known: ${formattedDate}</div>`;
        } else if (acc.import_source) {
            dateText = `<div class="account-balance-date">No import yet</div>`;
        }
        
        return `
        <div class="account-card">
            <h4>${acc.name}</h4>
            <div class="account-balance">${balanceText}</div>
            ${dateText}
        </div>
    `;
    }).join('');
}

async function renderImportStatus() {
    const container = document.getElementById('import-status-widget');
    if (!container) return;
    
    // Get accounts that support imports
    const importableAccounts = accounts.filter(acc => 
        acc.import_source && 
        (acc.type === 'bank' || acc.type === 'credit_card' || acc.type === 'savings' || acc.type === 'investment')
    );
    
    if (importableAccounts.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    const today = new Date();
    const currentDay = today.getDate();
    const targetDay = 15; // Update reminder on 15th
    
    // Check if we're past the 15th of current month
    const isAfterTargetDate = currentDay >= targetDay;
    const targetDate = new Date(today.getFullYear(), today.getMonth(), targetDay);
    
    // Check import status for each account
    const accountStatuses = importableAccounts.map(acc => {
        const lastImport = acc.last_import_date ? new Date(acc.last_import_date) : null;
        const daysSinceImport = lastImport ? Math.floor((today - lastImport) / (1000 * 60 * 60 * 24)) : null;
        
        let status = 'needs-update';
        let statusText = 'Never imported';
        let statusClass = 'overdue';
        
        if (lastImport) {
            if (isAfterTargetDate) {
                // After 15th - check if imported this month after 15th
                const importMonth = lastImport.getMonth();
                const importYear = lastImport.getFullYear();
                const importDay = lastImport.getDate();
                
                if (importYear === today.getFullYear() && 
                    importMonth === today.getMonth() && 
                    importDay >= targetDay) {
                    status = 'up-to-date';
                    statusText = `Updated ${formatDate(lastImport.toISOString().split('T')[0])}`;
                    statusClass = 'up-to-date';
                } else {
                    status = 'needs-update';
                    statusText = `Last: ${formatDate(lastImport.toISOString().split('T')[0])} (${daysSinceImport} days ago)`;
                    statusClass = daysSinceImport > 30 ? 'overdue' : 'needs-update';
                }
            } else {
                // Before 15th - check if imported last month after 15th
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, targetDay);
                if (lastImport >= lastMonth) {
                    status = 'up-to-date';
                    statusText = `Updated ${formatDate(lastImport.toISOString().split('T')[0])}`;
                    statusClass = 'up-to-date';
                } else {
                    status = 'needs-update';
                    statusText = `Last: ${formatDate(lastImport.toISOString().split('T')[0])} (${daysSinceImport} days ago)`;
                    statusClass = daysSinceImport > 30 ? 'overdue' : 'needs-update';
                }
            }
        }
        
        return {
            account: acc,
            status,
            statusText,
            statusClass
        };
    });
    
    const needsUpdate = accountStatuses.filter(s => s.status === 'needs-update').length;
    const allUpToDate = needsUpdate === 0;
    
    container.innerHTML = `
        <div class="import-status-header">
            <h3>
                📥 Import Status
                <span class="import-status-badge ${allUpToDate ? 'up-to-date' : 'needs-update'}">
                    ${allUpToDate ? '✅ All Up to Date' : `⚠️ ${needsUpdate} Need Update`}
                </span>
            </h3>
        </div>
        <div class="import-accounts-list">
            ${accountStatuses.map(item => `
                <div class="import-account-item">
                    <div class="import-account-info">
                        <div class="import-account-name">${item.account.name}</div>
                        <div class="import-account-status ${item.statusClass}">${item.statusText}</div>
                    </div>
                    ${item.status === 'needs-update' ? `
                        <button class="import-quick-btn" onclick="quickImport('${item.account.id}', '${item.account.import_source}')">
                            Import Now
                        </button>
                    ` : ''}
                </div>
            `).join('')}
        </div>
        ${needsUpdate > 0 ? `
            <button class="import-all-btn" onclick="openImportModal()">
                📥 Import All Accounts
            </button>
        ` : ''}
    `;
}

function quickImport(accountId, importSource) {
    // Set the form values and open modal
    document.getElementById('import-account').value = accountId;
    document.getElementById('import-source').value = importSource;
    document.getElementById('import-modal').classList.add('active');
    showBankLinks(importSource);
}

function openImportModal() {
    document.getElementById('import-modal').classList.add('active');
}

// Make functions available globally
window.quickImport = quickImport;
window.openImportModal = openImportModal;

async function renderExpenseTrendChart(period) {
    const transactions = await window.supabaseAPI.getTransactions({
        type: 'expense',
        limit: 1000
    });
    
    // Group by date
    const grouped = {};
    transactions.forEach(t => {
        const date = t.transaction_date;
        grouped[date] = (grouped[date] || 0) + parseFloat(t.amount || 0);
    });
    
    const sortedDates = Object.keys(grouped).sort();
    const ctx = document.getElementById('expense-trend-chart');
    
    if (window.expenseTrendChart) {
        window.expenseTrendChart.destroy();
    }
    
    window.expenseTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [{
                label: 'Daily Expenses',
                data: sortedDates.map(d => grouped[d]),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₪' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function renderCategoryPieChart(expensesByCategory) {
    const ctx = document.getElementById('category-pie-chart');
    const labels = Object.keys(expensesByCategory);
    const data = Object.values(expensesByCategory);
    
    // Get colors for categories
    const colors = labels.map(label => {
        const cat = categories.find(c => c.name === label);
        return cat?.color || '#6b7280';
    });
    
    if (window.categoryPieChart) {
        window.categoryPieChart.destroy();
    }
    
    window.categoryPieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = formatCurrency(context.parsed);
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderRecentTransactions(transactions) {
    const container = document.getElementById('recent-transactions-list');
    container.innerHTML = transactions.slice(0, 10).map(t => `
        <div class="transaction-item" style="display: flex; justify-content: space-between; padding: 0.75rem; border-bottom: 1px solid var(--border);">
            <div>
                <div style="font-weight: 500;">${t.description}</div>
                <div style="font-size: 0.85rem; color: var(--text-light);">
                    ${t.category?.name || 'Uncategorized'} • ${formatDate(t.transaction_date)}
                </div>
            </div>
            <div class="${t.type === 'income' || t.type === 'investment' ? 'amount-income' : 'amount-expense'}">
                ${t.type === 'income' || t.type === 'investment' ? '+' : '-'}${formatCurrency(Math.abs(t.amount))}
            </div>
        </div>
    `).join('');
}

async function loadTransactions() {
    const filters = getTransactionFilters();
    transactions = await window.supabaseAPI.getTransactions(filters);
    renderTransactionsTable(transactions);
}

function getTransactionFilters() {
    return {
        account_id: document.getElementById('filter-account').value || null,
        category_id: document.getElementById('filter-category').value || null,
        type: document.getElementById('filter-type').value || null,
        date_from: document.getElementById('filter-date-from').value || null,
        date_to: document.getElementById('filter-date-to').value || null,
        search: document.getElementById('search-transactions').value || null
    };
}

function filterTransactions() {
    loadTransactions();
}

function renderTransactionsTable(transactions) {
    const tbody = document.getElementById('transactions-tbody');
    tbody.innerHTML = transactions.map(t => `
        <tr>
            <td>${formatDate(t.transaction_date)}</td>
            <td>${t.description}</td>
            <td>${t.category?.name || 'Uncategorized'}</td>
            <td>${t.account?.name || 'Unknown'}</td>
            <td class="text-right ${t.type === 'income' ? 'amount-income' : t.type === 'investment' ? 'amount-income' : 'amount-expense'}">
                ${t.type === 'income' || t.type === 'investment' ? '+' : '-'}${formatCurrency(Math.abs(t.amount))}
            </td>
            <td>
                <button class="btn btn-secondary" onclick="editTransaction('${t.id}')">Edit</button>
                <button class="btn btn-danger" onclick="deleteTransaction('${t.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function loadAccounts() {
    accounts = await window.supabaseAPI.getAccounts();
    const container = document.getElementById('accounts-list');
    container.innerHTML = accounts.map(acc => `
        <div class="card" style="margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3>${acc.name}</h3>
                    <p style="color: var(--text-light);">${acc.institution || ''} • ${acc.type}</p>
                </div>
                <div style="text-align: right;">
                    <div class="card-value">${formatCurrency(acc.balance)}</div>
                </div>
            </div>
        </div>
    `).join('');
}

async function loadReport() {
    const year = parseInt(document.getElementById('report-year').value);
    const month = parseInt(document.getElementById('report-month').value);
    
    let report = await window.supabaseAPI.getMonthlyReport(year, month);
    
    if (!report) {
        // Generate report if it doesn't exist
        report = await window.supabaseAPI.generateMonthlyReport(year, month);
    }
    
    if (report) {
        renderReport(report);
    } else {
        document.getElementById('report-content').innerHTML = '<p>No report available for this period.</p>';
    }
}

function renderReport(report) {
    const container = document.getElementById('report-content');
    container.innerHTML = `
        <div class="card">
            <h3>${report.year}-${String(report.month).padStart(2, '0')} Summary</h3>
            <div class="summary-cards" style="margin-top: 1rem;">
                <div class="card">
                    <h4>Total Income</h4>
                    <div class="card-value">${formatCurrency(report.total_income)}</div>
                </div>
                <div class="card">
                    <h4>Total Expenses</h4>
                    <div class="card-value">${formatCurrency(report.total_expenses)}</div>
                </div>
                <div class="card">
                    <h4>Net Flow</h4>
                    <div class="card-value">${formatCurrency(report.net_flow)}</div>
                </div>
            </div>
            ${report.insights_summary ? `<div style="margin-top: 2rem;"><h4>Insights</h4><p>${report.insights_summary}</p></div>` : ''}
        </div>
    `;
}

async function loadInsights() {
    const insights = await window.supabaseAPI.getInsights();
    const container = document.getElementById('insights-list');
    container.innerHTML = insights.map(insight => `
        <div class="insight-card ${insight.severity}">
            <h3>${insight.title}</h3>
            <p>${insight.message}</p>
            <div style="margin-top: 1rem;">
                <button class="btn btn-secondary" onclick="markInsightRead('${insight.id}')">Mark as Read</button>
            </div>
        </div>
    `).join('');
}

async function handleImport(e) {
    e.preventDefault();
    
    const accountId = document.getElementById('import-account').value;
    const importSource = document.getElementById('import-source').value;
    const fileInput = document.getElementById('csv-file');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a file');
        return;
    }
    
    const fileName = file.name.toLowerCase();
    let fileData;
    let fileType;
    
    // Determine file type and read accordingly
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Read XLSX file
        fileType = 'xlsx';
        try {
            // For Leumi imports, .xls files are actually HTML, so read as text
            if (importSource === 'leumi_csv' && fileName.endsWith('.xls')) {
                fileData = await file.text();
                fileType = 'xls'; // Mark as xls so backend knows it's HTML
            } else {
                // For real XLSX files, convert to CSV
                const arrayBuffer = await file.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                
                // Get first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Convert to CSV format for backend processing
                fileData = XLSX.utils.sheet_to_csv(worksheet);
            }
        } catch (error) {
            console.error('XLSX read error:', error);
            alert('Failed to read XLSX file. Please check the file format.');
            return;
        }
    } else if (fileName.endsWith('.csv')) {
        // Read CSV file
        fileType = 'csv';
        fileData = await file.text();
    } else {
        alert('Unsupported file format. Please use .csv, .xlsx, or .xls');
        return;
    }
    
    try {
        const response = await fetch('/api/import-transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                account_id: accountId,
                import_source: importSource,
                csv_data: fileData,
                file_type: fileType
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Import failed' }));
            throw new Error(errorData.error || 'Import failed');
        }
        
        const result = await response.json();
        
        // Show success message
        const successMsg = `✅ Successfully imported ${result.count} transaction${result.count !== 1 ? 's' : ''}!`;
        alert(successMsg);
        
        // Close modal and reset form
        document.getElementById('import-modal').classList.remove('active');
        document.getElementById('import-form').reset();
        document.getElementById('file-upload-area').querySelector('.file-upload-placeholder').style.display = 'flex';
        document.getElementById('file-selected').style.display = 'none';
        document.getElementById('bank-links-section').style.display = 'none';
        
        // Reload transactions
        if (currentPage === 'transactions') {
            loadTransactions();
        }
        
        // Reload transactions
        if (currentPage === 'transactions') {
            loadTransactions();
        }
    } catch (error) {
        console.error('Import error:', error);
        alert(`Failed to import transactions: ${error.message}`);
    }
}

function populateAccountDropdowns() {
    const selects = ['import-account', 'filter-account'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Select Account</option>' +
                accounts.map(acc => `<option value="${acc.id}">${acc.name}</option>`).join('');
        }
    });
}

function populateCategoryDropdowns() {
    const select = document.getElementById('filter-category');
    if (select) {
        select.innerHTML = '<option value="">All Categories</option>' +
            categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    }
}

function populateReportDateSelectors() {
    const now = new Date();
    const monthSelect = document.getElementById('report-month');
    const yearSelect = document.getElementById('report-year');
    
    // Populate months
    for (let i = 1; i <= 12; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = new Date(2000, i - 1).toLocaleString('default', { month: 'long' });
        if (i === now.getMonth() + 1) option.selected = true;
        monthSelect.appendChild(option);
    }
    
    // Populate years (last 2 years and current)
    for (let i = now.getFullYear() - 2; i <= now.getFullYear(); i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        if (i === now.getFullYear()) option.selected = true;
        yearSelect.appendChild(option);
    }
}

// Utility functions
function formatCurrency(amount) {
    return '₪' + parseFloat(amount || 0).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', { year: 'numeric', month: 'short', day: 'numeric' });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Show bank links based on import source
function showBankLinks(importSource) {
    const bankLinksSection = document.getElementById('bank-links-section');
    const bankLinkContent = document.getElementById('bank-link-content');
    
    const bankLinks = {
        'leumi_csv': {
            name: 'Leumi Bank',
            url: 'https://www.leumi.co.il/he',
            instructions: 'Log in → Accounts → Export → CSV format',
            icon: '🏦'
        },
        'max_csv': {
            name: 'Max Credit Card',
            url: 'https://www.max.co.il/',
            instructions: 'Log in → Statements → Download CSV',
            icon: '💳'
        },
        'phoenix_csv': {
            name: 'Phoenix Savings',
            url: 'https://www.fnx.co.il/',
            instructions: 'Log in → Account Statements → Export CSV',
            icon: '💰'
        },
        'ibi_csv': {
            name: 'IBI / Fiverr Vested',
            url: 'https://mycapital.ibi.co.il/portfolio',
            instructions: 'Log in → Portfolio → RS/RSU section → Export as CSV (shows grants, vesting dates, estimated values)',
            icon: '📈'
        },
        'generic_csv': {
            name: 'Generic CSV',
            url: null,
            instructions: 'Export your transactions as CSV from any source',
            icon: '📄'
        }
    };
    
    if (importSource && bankLinks[importSource]) {
        const bank = bankLinks[importSource];
        bankLinksSection.style.display = 'block';
        
        if (bank.url) {
            bankLinkContent.innerHTML = `
                <div class="bank-link-item">
                    <div class="bank-link-info">
                        <div class="bank-link-name">${bank.icon} ${bank.name}</div>
                        <div class="bank-link-instructions">${bank.instructions}</div>
                    </div>
                    <a href="${bank.url}" target="_blank" class="bank-link-button">
                        Open Site
                        <span>↗</span>
                    </a>
                </div>
            `;
        } else {
            bankLinkContent.innerHTML = `
                <div class="bank-link-item">
                    <div class="bank-link-info">
                        <div class="bank-link-name">${bank.icon} ${bank.name}</div>
                        <div class="bank-link-instructions">${bank.instructions}</div>
                    </div>
                </div>
            `;
        }
    } else {
        bankLinksSection.style.display = 'none';
    }
}

// Global functions for onclick handlers
window.editTransaction = async function(id) {
    // TODO: Implement edit transaction
    alert('Edit transaction feature coming soon!');
};

window.deleteTransaction = async function(id) {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    
    const success = await window.supabaseAPI.deleteTransaction(id);
    if (success) {
        loadTransactions();
    } else {
        alert('Failed to delete transaction');
    }
};

window.markInsightRead = async function(id) {
    const success = await window.supabaseAPI.markInsightRead(id);
    if (success) {
        loadInsights();
    }
};

