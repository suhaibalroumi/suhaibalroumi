from flask import Flask, render_template, request, jsonify, send_file, session, redirect, url_for
from flask_cors import CORS
import json
import os
from datetime import datetime, timedelta
import io
import csv

app = Flask(__name__)
app.secret_key = 'kinash_secret_key_2024'
CORS(app)

class KinashDB:
    def __init__(self):
        self.data_file = 'data/database.json'
        self.init_db()
    
    def init_db(self):
        if not os.path.exists('data'):
            os.makedirs('data')
        
        if not os.path.exists(self.data_file):
            default_data = {
                "users": [
                    {
                        "username": "admin",
                        "password": "1234516",
                        "activation_key": 12345678910,
                        "is_active": False,
                        "created_at": datetime.now().isoformat()
                    }
                ],
                "customers": [],
                "suppliers": [],
                "transactions": [],
                "categories": [
                    {"id": 1, "name": "عادي", "type": "customer"},
                    {"id": 2, "name": "VIP", "type": "customer"},
                    {"id": 3, "name": "عادي", "type": "supplier"},
                    {"id": 4, "name": "مميز", "type": "supplier"}
                ],
                "reminders": [],
                "settings": {
                    "theme": "light",
                    "language": "ar", 
                    "currency": "د.ج",
                    "shop_name": "متجري",
                    "trial_end_date": (datetime.now() + timedelta(days=7)).isoformat(),
                    "is_activated": False,
                    "hide_balance": False
                }
            }
            self.save_data(default_data)
    
    def load_data(self):
        try:
            with open(self.data_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            self.init_db()
            return self.load_data()
    
    def save_data(self, data):
        with open(self.data_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
    
    def get_user(self, username):
        data = self.load_data()
        users = data.get('users', [])
        return next((u for u in users if u['username'] == username), None)
    
    def add_customer(self, customer_data):
        data = self.load_data()
        customer_id = max([c['id'] for c in data['customers']] or [0]) + 1
        customer_data['id'] = customer_id
        customer_data['created_at'] = datetime.now().isoformat()
        customer_data['balance'] = 0
        customer_data['transactions'] = []
        data['customers'].append(customer_data)
        self.save_data(data)
        return customer_data
    
    def update_customer(self, customer_id, customer_data):
        data = self.load_data()
        for i, customer in enumerate(data['customers']):
            if customer['id'] == customer_id:
                data['customers'][i].update(customer_data)
                self.save_data(data)
                return data['customers'][i]
        return None
    
    def delete_customer(self, customer_id):
        data = self.load_data()
        data['customers'] = [c for c in data['customers'] if c['id'] != customer_id]
        self.save_data(data)
        return True
    
    def add_supplier(self, supplier_data):
        data = self.load_data()
        supplier_id = max([s['id'] for s in data['suppliers']] or [0]) + 1
        supplier_data['id'] = supplier_id
        supplier_data['created_at'] = datetime.now().isoformat()
        supplier_data['balance'] = 0
        supplier_data['transactions'] = []
        data['suppliers'].append(supplier_data)
        self.save_data(data)
        return supplier_data
    
    def update_supplier(self, supplier_id, supplier_data):
        data = self.load_data()
        for i, supplier in enumerate(data['suppliers']):
            if supplier['id'] == supplier_id:
                data['suppliers'][i].update(supplier_data)
                self.save_data(data)
                return data['suppliers'][i]
        return None
    
    def delete_supplier(self, supplier_id):
        data = self.load_data()
        data['suppliers'] = [s for s in data['suppliers'] if s['id'] != supplier_id]
        self.save_data(data)
        return True
    
    def add_transaction(self, transaction_data):
        data = self.load_data()
        transaction_id = max([t['id'] for t in data['transactions']] or [0]) + 1
        transaction_data['id'] = transaction_id
        transaction_data['created_at'] = datetime.now().isoformat()
        data['transactions'].append(transaction_data)
        
        # تحديث رصيد العميل/المورد
        if transaction_data['type'] == 'customer_debt':
            for customer in data['customers']:
                if customer['id'] == transaction_data['person_id']:
                    if transaction_data['debt_type'] == 'taken':
                        customer['balance'] = customer.get('balance', 0) + transaction_data['amount']
                    else:
                        customer['balance'] = customer.get('balance', 0) - transaction_data['amount']
                    if 'transactions' not in customer:
                        customer['transactions'] = []
                    customer['transactions'].append(transaction_id)
        
        elif transaction_data['type'] == 'supplier_debt':
            for supplier in data['suppliers']:
                if supplier['id'] == transaction_data['person_id']:
                    if transaction_data['debt_type'] == 'taken':
                        supplier['balance'] = supplier.get('balance', 0) + transaction_data['amount']
                    else:
                        supplier['balance'] = supplier.get('balance', 0) - transaction_data['amount']
                    if 'transactions' not in supplier:
                        supplier['transactions'] = []
                    supplier['transactions'].append(transaction_id)
        
        self.save_data(data)
        return transaction_data

db = KinashDB()

# Routes
@app.route('/')
def index():
    if 'user' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        user = db.get_user(username)
        if user and user['password'] == password:
            session['user'] = username
            return jsonify({'success': True, 'message': 'تم تسجيل الدخول بنجاح'})
        else:
            return jsonify({'success': False, 'message': 'اسم المستخدم أو كلمة المرور غير صحيحة'})
    
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    if 'user' not in session:
        return redirect(url_for('login'))
    
    data = db.load_data()
    customers = data.get('customers', [])
    suppliers = data.get('suppliers', [])
    
    stats = {
        'customers_count': len(customers),
        'suppliers_count': len(suppliers),
        'customers_debt': sum(c.get('balance', 0) for c in customers),
        'suppliers_debt': sum(s.get('balance', 0) for s in suppliers),
        'cash_balance': 0
    }
    
    return render_template('dashboard.html', 
                         stats=stats, 
                         settings=data.get('settings', {}),
                         customers=customers[-5:],
                         suppliers=suppliers[-5:])

@app.route('/customers')
def customers():
    if 'user' not in session:
        return redirect(url_for('login'))
    
    data = db.load_data()
    return render_template('customers.html', 
                         customers=data.get('customers', []),
                         categories=[c for c in data.get('categories', []) if c['type'] == 'customer'])

@app.route('/customer/<int:customer_id>')
def customer_detail(customer_id):
    if 'user' not in session:
        return redirect(url_for('login'))
    
    data = db.load_data()
    customer = next((c for c in data.get('customers', []) if c['id'] == customer_id), None)
    if not customer:
        return redirect(url_for('customers'))
    
    transactions = [t for t in data.get('transactions', []) 
                   if t.get('type') == 'customer_debt' and t.get('person_id') == customer_id]
    
    return render_template('customer_detail.html', 
                         customer=customer, 
                         transactions=transactions)

@app.route('/suppliers')
def suppliers():
    if 'user' not in session:
        return redirect(url_for('login'))
    
    data = db.load_data()
    return render_template('suppliers.html', 
                         suppliers=data.get('suppliers', []),
                         categories=[c for c in data.get('categories', []) if c['type'] == 'supplier'])

@app.route('/supplier/<int:supplier_id>')
def supplier_detail(supplier_id):
    if 'user' not in session:
        return redirect(url_for('login'))
    
    data = db.load_data()
    supplier = next((s for s in data.get('suppliers', []) if s['id'] == supplier_id), None)
    if not supplier:
        return redirect(url_for('suppliers'))
    
    transactions = [t for t in data.get('transactions', []) 
                   if t.get('type') == 'supplier_debt' and t.get('person_id') == supplier_id]
    
    return render_template('supplier_detail.html', 
                         supplier=supplier, 
                         transactions=transactions)

@app.route('/cashbox')
def cashbox():
    if 'user' not in session:
        return redirect(url_for('login'))
    
    data = db.load_data()
    transactions = data.get('transactions', [])
    return render_template('cashbox.html', transactions=transactions)

@app.route('/reports')
def reports():
    if 'user' not in session:
        return redirect(url_for('login'))
    
    data = db.load_data()
    return render_template('reports.html', data=data)

@app.route('/settings')
def settings():
    if 'user' not in session:
        return redirect(url_for('login'))
    
    data = db.load_data()
    return render_template('settings.html', settings=data.get('settings', {}))

# API Routes
@app.route('/api/add_customer', methods=['POST'])
def api_add_customer():
    customer_data = {
        'name': request.json.get('name'),
        'phone': request.json.get('phone'),
        'category': request.json.get('category'),
        'notes': request.json.get('notes')
    }
    
    customer = db.add_customer(customer_data)
    return jsonify({'success': True, 'customer': customer})

@app.route('/api/update_customer/<int:customer_id>', methods=['POST'])
def api_update_customer(customer_id):
    customer_data = {
        'name': request.json.get('name'),
        'phone': request.json.get('phone'),
        'category': request.json.get('category'),
        'notes': request.json.get('notes')
    }
    
    customer = db.update_customer(customer_id, customer_data)
    if customer:
        return jsonify({'success': True, 'customer': customer})
    else:
        return jsonify({'success': False, 'message': 'العميل غير موجود'})

@app.route('/api/delete_customer/<int:customer_id>', methods=['POST'])
def api_delete_customer(customer_id):
    success = db.delete_customer(customer_id)
    return jsonify({'success': success})

@app.route('/api/add_supplier', methods=['POST'])
def api_add_supplier():
    supplier_data = {
        'name': request.json.get('name'),
        'phone': request.json.get('phone'),
        'category': request.json.get('category'),
        'notes': request.json.get('notes')
    }
    
    supplier = db.add_supplier(supplier_data)
    return jsonify({'success': True, 'supplier': supplier})

@app.route('/api/update_supplier/<int:supplier_id>', methods=['POST'])
def api_update_supplier(supplier_id):
    supplier_data = {
        'name': request.json.get('name'),
        'phone': request.json.get('phone'),
        'category': request.json.get('category'),
        'notes': request.json.get('notes')
    }
    
    supplier = db.update_supplier(supplier_id, supplier_data)
    if supplier:
        return jsonify({'success': True, 'supplier': supplier})
    else:
        return jsonify({'success': False, 'message': 'المورد غير موجود'})

@app.route('/api/delete_supplier/<int:supplier_id>', methods=['POST'])
def api_delete_supplier(supplier_id):
    success = db.delete_supplier(supplier_id)
    return jsonify({'success': success})

@app.route('/api/add_transaction', methods=['POST'])
def api_add_transaction():
    transaction_data = {
        'type': request.json.get('type'),
        'person_id': request.json.get('person_id'),
        'debt_type': request.json.get('debt_type'),
        'amount': float(request.json.get('amount')),
        'date': request.json.get('date'),
        'notes': request.json.get('notes')
    }
    
    transaction = db.add_transaction(transaction_data)
    return jsonify({'success': True, 'transaction': transaction})

@app.route('/api/get_customer/<int:customer_id>')
def api_get_customer(customer_id):
    data = db.load_data()
    customer = next((c for c in data.get('customers', []) if c['id'] == customer_id), None)
    if customer:
        return jsonify({'success': True, 'customer': customer})
    else:
        return jsonify({'success': False, 'message': 'العميل غير موجود'})

@app.route('/api/get_supplier/<int:supplier_id>')
def api_get_supplier(supplier_id):
    data = db.load_data()
    supplier = next((s for s in data.get('suppliers', []) if s['id'] == supplier_id), None)
    if supplier:
        return jsonify({'success': True, 'supplier': supplier})
    else:
        return jsonify({'success': False, 'message': 'المورد غير موجود'})

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)