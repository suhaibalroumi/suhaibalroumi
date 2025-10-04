class KinashApp {
    constructor() {
        this.currentCustomerId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.applyTheme();
        this.checkTrialPeriod();
    }

    setupEventListeners() {
        // تبديل الثيم
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // تبديل عرض الرصيد
        document.getElementById('toggle-balance')?.addEventListener('click', () => {
            this.toggleBalanceVisibility();
        });

        // إضافة عميل
        document.getElementById('add-customer-btn')?.addEventListener('click', () => {
            this.showAddCustomerModal();
        });

        document.getElementById('add-first-customer')?.addEventListener('click', () => {
            this.showAddCustomerModal();
        });

        // حفظ عميل
        document.getElementById('customer-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCustomer();
        });

        // حفظ دين
        document.getElementById('debt-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveDebt();
        });

        // إغلاق النوافذ
        document.querySelectorAll('.close, .close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModals();
            });
        });

        // النقر خارج النافذة يغلقها
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModals();
                }
            });
        });

        // الإضافة السريعة
        document.getElementById('quick-action')?.addEventListener('click', () => {
            this.showQuickAddModal();
        });

        document.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                this.handleQuickAction(type);
            });
        });

        // البحث والتصفية
        document.getElementById('customer-search')?.addEventListener('input', (e) => {
            this.filterCustomers(e.target.value);
        });

        document.getElementById('category-filter')?.addEventListener('change', (e) => {
            this.filterCustomers();
        });

        document.getElementById('balance-filter')?.addEventListener('change', (e) => {
            this.filterCustomers();
        });

        // تصدير البيانات
        document.getElementById('export-customers')?.addEventListener('click', () => {
            this.exportCustomersPDF();
        });
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('kinash_theme', newTheme);
        
        // تحديث الأيقونة
        const themeIcon = document.querySelector('#theme-toggle i');
        if (themeIcon) {
            themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    applyTheme() {
        const savedTheme = localStorage.getItem('kinash_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        const themeIcon = document.querySelector('#theme-toggle i');
        if (themeIcon) {
            themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    toggleBalanceVisibility() {
        const balanceElements = document.querySelectorAll('.balance, .stat-number');
        const toggleIcon = document.querySelector('#toggle-balance i');
        
        balanceElements.forEach(element => {
            element.classList.toggle('balance-hidden');
        });
        
        if (toggleIcon) {
            if (document.querySelector('.balance-hidden')) {
                toggleIcon.className = 'fas fa-eye';
            } else {
                toggleIcon.className = 'fas fa-eye-slash';
            }
        }
    }

    showAddCustomerModal() {
        document.getElementById('add-customer-modal').style.display = 'flex';
        document.getElementById('customer-form').reset();
    }

    showAddDebtModal(customerId, customerName) {
        this.currentCustomerId = customerId;
        document.getElementById('debt-modal-title').textContent = `إضافة دين - ${customerName}`;
        document.getElementById('debt-form').reset();
        document.getElementById('debt-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('add-debt-modal').style.display = 'flex';
    }

    showQuickAddModal() {
        document.getElementById('quick-add-modal').style.display = 'flex';
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        this.currentCustomerId = null;
    }

    async saveCustomer() {
        const formData = {
            name: document.getElementById('customer-name').value,
            phone: document.getElementById('customer-phone').value,
            category: document.getElementById('customer-category').value,
            notes: document.getElementById('customer-notes').value
        };

        try {
            const response = await fetch('/api/add_customer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('تم إضافة العميل بنجاح', 'success');
                this.closeModals();
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                this.showNotification('حدث خطأ أثناء إضافة العميل', 'error');
            }
        } catch (error) {
            this.showNotification('حدث خطأ في الاتصال', 'error');
        }
    }

    async saveDebt() {
        if (!this.currentCustomerId) return;

        const formData = {
            type: 'customer_debt',
            person_id: this.currentCustomerId,
            debt_type: document.getElementById('debt-type').value,
            amount: parseFloat(document.getElementById('debt-amount').value),
            date: document.getElementById('debt-date').value,
            notes: document.getElementById('debt-notes').value
        };

        try {
            const response = await fetch('/api/add_transaction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('تم إضافة العملية بنجاح', 'success');
                this.closeModals();
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                this.showNotification('حدث خطأ أثناء إضافة العملية', 'error');
            }
        } catch (error) {
            this.showNotification('حدث خطأ في الاتصال', 'error');
        }
    }

    handleQuickAction(type) {
        this.closeModals();
        
        switch (type) {
            case 'customer':
                this.showAddCustomerModal();
                break;
            case 'supplier':
                window.location.href = '/suppliers?add=new';
                break;
            case 'debt':
                this.showNotification('اختر عميلاً لإضافة دين', 'info');
                break;
            case 'payment':
                this.showNotification('اختر عميلاً لتسديد دين', 'info');
                break;
        }
    }

    filterCustomers(searchTerm = '') {
        const rows = document.querySelectorAll('#customers-table tbody tr');
        const categoryFilter = document.getElementById('category-filter')?.value || '';
        const balanceFilter = document.getElementById('balance-filter')?.value || '';

        rows.forEach(row => {
            const name = row.cells[0].textContent.toLowerCase();
            const phone = row.cells[1].textContent.toLowerCase();
            const category = row.cells[2].textContent;
            const balanceClass = row.cells[3].querySelector('.balance').classList;

            let show = true;

            // تصفية بالبحث
            if (searchTerm && !name.includes(searchTerm.toLowerCase()) && !phone.includes(searchTerm.toLowerCase())) {
                show = false;
            }

            // تصفية بالتصنيف
            if (categoryFilter && category !== categoryFilter) {
                show = false;
            }

            // تصفية بالرصيد
            if (balanceFilter) {
                if (balanceFilter === 'positive' && !balanceClass.contains('positive')) show = false;
                if (balanceFilter === 'negative' && !balanceClass.contains('negative')) show = false;
                if (balanceFilter === 'zero' && !balanceClass.contains('zero')) show = false;
            }

            row.style.display = show ? '' : 'none';
        });
    }

    async exportCustomersPDF() {
        try {
            const response = await fetch('/api/export_pdf?type=customers');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'customers_report.pdf';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            this.showNotification('تم تصدير التقرير بنجاح', 'success');
        } catch (error) {
            this.showNotification('حدث خطأ أثناء التصدير', 'error');
        }
    }

    checkTrialPeriod() {
        // يمكن إضافة منطق التحقق من فترة التجربة هنا
        const trialDays = 7; // افتراضي
        if (trialDays <= 0) {
            this.showActivationModal();
        }
    }

    showActivationModal() {
        // نافذة تفعيل التطبيق
        this.showNotification('فترة التجربة انتهت، يرجى تفعيل التطبيق', 'warning');
    }

    showNotification(message, type = 'info') {
        // إنشاء عنصر الإشعار
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;

        // إضافة الأنماط إذا لم تكن موجودة
        if (!document.querySelector('.notification-styles')) {
            const styles = document.createElement('style');
            styles.className = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    left: 20px;
                    background: white;
                    padding: 1rem 1.5rem;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    z-index: 10000;
                    transform: translateX(-100%);
                    transition: transform 0.3s ease;
                }
                .notification.show {
                    transform: translateX(0);
                }
                .notification-success { border-right: 4px solid #27AE60; }
                .notification-error { border-right: 4px solid #E74C3C; }
                .notification-warning { border-right: 4px solid #F39C12; }
                .notification-info { border-right: 4px solid #3498DB; }
                .notification-close {
                    background: none;
                    border: none;
                    font-size: 1.2rem;
                    cursor: pointer;
                    color: #95A5A6;
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // إظهار الإشعار
        setTimeout(() => notification.classList.add('show'), 100);

        // إخفاء تلقائي بعد 5 ثوانٍ
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);

        // إغلاق يدوي
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
    }
}

// دوال عامة للاستخدام في الأزرار
function viewCustomer(id) {
    window.location.href = `/customer/${id}`;
}

function addCustomerDebt(id) {
    const customerName = document.querySelector(`tr[data-customer-id="${id}"] td:first-child`).textContent;
    window.app.showAddDebtModal(id, customerName);
}

function editCustomer(id) {
    window.app.showNotification('ميزة التعديل قيد التطوير', 'info');
}

function deleteCustomer(id) {
    if (confirm('هل أنت متأكد من حذف هذا العميل؟ سيتم حذف جميع معاملاته أيضاً.')) {
        window.app.showNotification('ميزة الحذف قيد التطوير', 'info');
    }
}

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', () => {
    window.app = new KinashApp();
});

// منع عرض مصدر الصفحة
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        alert('غير مسموح بعرض مصدر الصفحة');
    }
});

// منع النقر بزر الماوس الأيمن
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
});