from flask import Flask, jsonify, request, send_file, session
import psycopg2
import pandas as pd
from flask_cors import CORS
from dotenv import load_dotenv
import os
import openai
from openai import OpenAI
import json
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
from flask_session import Session
import sys
import httpx

import jwt
from datetime import datetime, timedelta
from functools import wraps

from datetime import datetime, timedelta
import hashlib
from functools import wraps
import time
from collections import defaultdict
import secrets
import traceback



# Update the REPORTS_DIR constant
REPORTS_DIR = os.path.abspath('/app/reports')
os.makedirs(REPORTS_DIR, exist_ok=True)

# Set default encoding to UTF-8
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer)
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer)

MAX_HISTORY_LENGTH = 10

app = Flask(__name__)
CORS(app, 
     resources={r"/*": {
         "origins": "*",
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
         "supports_credentials": False
     }},
     supports_credentials=True)

# Set OpenAI API key from environment variable
parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
env_path = os.path.join(parent_dir, '.env')
load_dotenv(env_path)

TRUSTED_PROXIES = os.getenv('VPN_SUBNET')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config['SESSION_TYPE'] = 'filesystem'
Session(app)


# Initialize OpenAI client
try:
    # Fixed version
    client = OpenAI(
        api_key=os.getenv('OPENAI_API_KEY'),
        base_url="https://api.openai.com/v1",
        http_client=httpx.Client()  # Explicitly create the HTTP client without proxies
    )
except Exception as e:
    print(f"Warning: OpenAI client initialization failed: {e}")
    client = None

# Make sure you have the USERS list and SECRET_KEY defined
USERS = [
    {
        "username": "admin",
        "password": "admin123",
        "role": "admin"
    },
    {
        "username": "user",
        "password": "user123",
        "role": "user"
    }
]

# Add this near the top of your file, after the app creation
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')


# Security configurations
class SecurityConfig:
    RATE_LIMIT_WINDOW = 300  # 5 minutes
    MAX_ATTEMPTS = 5  # Maximum login attempts per window
    LOCKOUT_DURATION = 900  # 15 minutes lockout after too many attempts
    PASSWORD_SALT = os.getenv('PASSWORD_SALT', secrets.token_hex(16))  # Get from environment or generate
    JWT_EXPIRY = 24 * 60 * 60  # 24 hours in seconds

# Store login attempts and lockouts in memory (replace with Redis in production)
login_attempts = defaultdict(list)  # {ip_address: [timestamp1, timestamp2, ...]}
account_lockouts = defaultdict(float)  # {username: lockout_end_timestamp}

def hash_password(password, salt=SecurityConfig.PASSWORD_SALT):
    """Hash a password with SHA-256 and a salt"""
    return hashlib.pbkdf2_hmac(
        'sha256', 
        password.encode('utf-8'), 
        salt.encode('utf-8'), 
        100000  # Number of iterations
    ).hex()

# Initialize users with hashed passwords
USERS = [
    {
        "username": "admin",
        "password": hash_password("admin123"),  # Store hashed password
        "role": "admin"
    },
    {
        "username": "user",
        "password": hash_password("user123"),  # Store hashed password
        "role": "user"
    }
]

def is_rate_limited(ip_address):
    """Check if an IP address has exceeded the rate limit"""
    now = time.time()
    # Remove attempts outside the current window
    login_attempts[ip_address] = [
        attempt for attempt in login_attempts[ip_address]
        if now - attempt < SecurityConfig.RATE_LIMIT_WINDOW
    ]
    
    return len(login_attempts[ip_address]) >= SecurityConfig.MAX_ATTEMPTS

def is_account_locked(username):
    """Check if an account is currently locked out"""
    lockout_end = account_lockouts.get(username, 0)
    return time.time() < lockout_end

def record_failed_attempt(ip_address, username):
    """Record a failed login attempt and possibly trigger lockout"""
    now = time.time()
    login_attempts[ip_address].append(now)
    
    # If max attempts reached, trigger lockout
    if len(login_attempts[ip_address]) >= SecurityConfig.MAX_ATTEMPTS:
        account_lockouts[username] = now + SecurityConfig.LOCKOUT_DURATION

# Enhanced token verification
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401

        if not token:
            return jsonify({'error': 'Token is missing'}), 401

        try:
            data = jwt.decode(
                token, 
                app.config['SECRET_KEY'], 
                algorithms=["HS256"]
            )
            
            # Verify user still exists and has same role
            current_user = next(
                (user for user in USERS if user['username'] == data['username'] 
                 and user['role'] == data['role']),
                None
            )
            
            if not current_user:
                return jsonify({'error': 'User no longer valid'}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401

        return f(*args, **kwargs)
    return decorated

# Add password change endpoint
@app.route('/api/auth/change-password', methods=['POST'])
@token_required
def change_password():
    try:
        data = request.get_json()
        if not data or not data.get('old_password') or not data.get('new_password'):
            return jsonify({'error': 'Missing required fields'}), 400

        # Find current user
        auth_header = request.headers['Authorization']
        token = auth_header.split(" ")[1]
        user_data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
        
        user = next(
            (user for user in USERS if user['username'] == user_data['username']),
            None
        )

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Verify old password
        if user['password'] != hash_password(data['old_password']):
            return jsonify({'error': 'Invalid current password'}), 401

        # Update password
        user['password'] = hash_password(data['new_password'])
        
        return jsonify({'message': 'Password updated successfully'})

    except Exception as e:
        print(f"Password change error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500



# Add these imports and data structures to server.py
from datetime import datetime
from typing import Dict, List

# Store login history
LOGIN_HISTORY = []  # List to store login events
MAX_HISTORY_ENTRIES = 1000  # Limit the size of history

class LoginEvent:
    def __init__(self, username: str, ip_address: str, success: bool, timestamp: datetime = None):
        self.username = username
        self.ip_address = ip_address
        self.success = success
        self.timestamp = timestamp or datetime.utcnow()
    
    def to_dict(self):
        return {
            'username': self.username,
            'ip_address': self.ip_address,
            'success': self.success,
            'timestamp': self.timestamp.isoformat(),
        }

# Remove the second login route and keep only this one with the enhanced security
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        print("=== Login Attempt ===")
        client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        
        # Check rate limiting
        if is_rate_limited(client_ip):
            # Record failed login attempt due to rate limiting
            event = LoginEvent(
                username=request.json.get('username', ''),
                ip_address=client_ip,
                success=False
            )
            LOGIN_HISTORY.append(event)
            
            # Maintain maximum history size
            while len(LOGIN_HISTORY) > MAX_HISTORY_ENTRIES:
                LOGIN_HISTORY.pop(0)
                
            return jsonify({
                'error': 'Too many login attempts. Please try again later.',
                'wait_time': SecurityConfig.RATE_LIMIT_WINDOW
            }), 429

        auth = request.get_json()
        print(f"Received login data: {auth}")
        
        if not auth or not auth.get('username') or not auth.get('password'):
            # Record failed login attempt due to missing credentials
            event = LoginEvent(
                username=auth.get('username', '') if auth else '',
                ip_address=client_ip,
                success=False
            )
            LOGIN_HISTORY.append(event)
            return jsonify({'error': 'Username and password are required'}), 401

        username = auth['username']
        
        # Check account lockout
        if is_account_locked(username):
            # Record failed login attempt due to account lockout
            event = LoginEvent(
                username=username,
                ip_address=client_ip,
                success=False
            )
            LOGIN_HISTORY.append(event)
            lockout_end = account_lockouts[username]
            wait_time = int(lockout_end - time.time())
            return jsonify({
                'error': 'Account temporarily locked. Please try again later.',
                'wait_time': wait_time
            }), 429

        user = next(
            (user for user in USERS if user['username'] == username),
            None
        )

        if not user or user['password'] != hash_password(auth['password']):
            # Record failed login attempt due to invalid credentials
            event = LoginEvent(
                username=username,
                ip_address=client_ip,
                success=False
            )
            LOGIN_HISTORY.append(event)
            record_failed_attempt(client_ip, username)
            return jsonify({'error': 'Invalid credentials'}), 401

        # Clear any existing failed attempts on successful login
        login_attempts[client_ip] = []
        if username in account_lockouts:
            del account_lockouts[username]

        # Generate token
        token = jwt.encode({
            'username': user['username'],
            'role': user['role'],
            'exp': datetime.utcnow() + timedelta(seconds=SecurityConfig.JWT_EXPIRY),
            'jti': secrets.token_hex(16)
        }, app.config['SECRET_KEY'])

        # Record successful login
        event = LoginEvent(
            username=username,
            ip_address=client_ip,
            success=True
        )
        LOGIN_HISTORY.append(event)
        
        # Maintain maximum history size
        while len(LOGIN_HISTORY) > MAX_HISTORY_ENTRIES:
            LOGIN_HISTORY.pop(0)

        print("Login successful, returning token")
        return jsonify({
            'token': token,
            'username': user['username'],
            'role': user['role'],
            'expires_in': SecurityConfig.JWT_EXPIRY
        })

    except Exception as e:
        # Record failed login attempt due to error
        try:
            event = LoginEvent(
                username=request.json.get('username', '') if request.json else '',
                ip_address=client_ip,
                success=False
            )
            LOGIN_HISTORY.append(event)
        except:
            pass  # If we can't record the event, continue with the error response
            
        print(f"Login error: {str(e)}")
        print("Full traceback:")
        traceback.print_exc()
        return jsonify({'error': 'Internal server error'}), 500
# Add admin endpoints
@app.route('/api/admin/login-history', methods=['GET'])
@token_required
def get_login_history():
    # Get token data
    token = request.headers['Authorization'].split(" ")[1]
    user_data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
    
    # Check if user is admin
    if user_data.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    # Get query parameters
    username_filter = request.args.get('username')
    success_filter = request.args.get('success')
    limit = int(request.args.get('limit', 50))
    
    # Filter and convert history to list of dicts
    filtered_history = LOGIN_HISTORY
    
    if username_filter:
        filtered_history = [
            event for event in filtered_history 
            if event.username == username_filter
        ]
        
    if success_filter is not None:
        success_bool = success_filter.lower() == 'true'
        filtered_history = [
            event for event in filtered_history 
            if event.success == success_bool
        ]
    
    # Return most recent events first, limited by limit parameter
    history_dicts = [
        event.to_dict() 
        for event in reversed(filtered_history[-limit:])
    ]
    
    return jsonify(history_dicts)

@app.route('/api/admin/users', methods=['GET'])
@token_required
def get_users():
    # Get token data
    token = request.headers['Authorization'].split(" ")[1]
    user_data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
    
    # Check if user is admin
    if user_data.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    # Return user list without passwords
    safe_users = [
        {k: v for k, v in user.items() if k != 'password'}
        for user in USERS
    ]
    
    return jsonify(safe_users)

@app.route('/api/admin/stats', methods=['GET'])
@token_required
def get_stats():
    # Get token data
    token = request.headers['Authorization'].split(" ")[1]
    user_data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
    
    # Check if user is admin
    if user_data.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    # Calculate statistics from LOGIN_HISTORY
    if not LOGIN_HISTORY:
        return jsonify({
            'total_attempts': 0,
            'successful_attempts': 0,
            'failed_attempts': 0,
            'unique_users': 0,
            'unique_ips': 0,
            'potentially_malicious_ips': {}
        })
    
    # Calculate statistics
    total_attempts = len(LOGIN_HISTORY)
    successful_attempts = sum(1 for event in LOGIN_HISTORY if event.success)
    unique_users = len(set(event.username for event in LOGIN_HISTORY))
    unique_ips = len(set(event.ip_address for event in LOGIN_HISTORY))
    
    # Get recent failed attempts grouped by IP
    recent_failed = defaultdict(int)
    cutoff_time = datetime.utcnow() - timedelta(minutes=5)
    
    for event in LOGIN_HISTORY:
        if not event.success and event.timestamp > cutoff_time:
            recent_failed[event.ip_address] += 1
    
    potentially_malicious = {
        ip: count for ip, count in recent_failed.items()
        if count >= SecurityConfig.MAX_ATTEMPTS
    }
    
    return jsonify({
        'total_attempts': total_attempts,
        'successful_attempts': successful_attempts,
        'failed_attempts': total_attempts - successful_attempts,
        'unique_users': unique_users,
        'unique_ips': unique_ips,
        'potentially_malicious_ips': potentially_malicious
    })


# Function to connect to the database
def connect_to_db():
    print("=== Database Connection Attempt ===")
    try:
        # Get environment variables
        instance_connection_name = os.getenv('INSTANCE_CONNECTION_NAME')
        db_user = os.getenv('DB_USER', 'postgres')
        db_pass = os.getenv('DB_PASSWORD')
        db_name = os.getenv('DB_NAME', 'ServitecInvoiceDataBase')

        # Check if running on Cloud Run
        if os.getenv('K_SERVICE'):
            print("Running on Cloud Run, using Unix socket")
            # Use Unix socket
            host = f'/cloudsql/{instance_connection_name}'
        else:
            print("Running locally, using TCP connection")
            host = os.getenv('DB_HOST', '34.175.111.125')

        print(f"Connecting with: host={host}, db={db_name}, user={db_user}")
        
        conn = psycopg2.connect(
            dbname=db_name,
            user=db_user,
            password=db_pass,
            host=host
        )
        
        print("Database connection successful")
        return conn
        
    except Exception as e:
        print(f"Database connection error: {str(e)}")
        print("\nConnection details:")
        print(f"- Running on Cloud Run: {os.getenv('K_SERVICE') is not None}")
        print(f"- INSTANCE_CONNECTION_NAME: {os.getenv('INSTANCE_CONNECTION_NAME')}")
        print(f"- DB_HOST: {os.getenv('DB_HOST')}")
        print(f"- DB_NAME: {db_name}")
        print(f"- DB_USER: {db_user}")
        raise

@app.route('/api/debug/config')
@token_required  
def debug_config():
    return jsonify({
        'DB_HOST': os.getenv('DB_HOST'),
        'DB_NAME': os.getenv('DB_NAME'),
        'DB_USER': os.getenv('DB_USER'),
    })

@app.route('/api/debug/environment')
def debug_environment():
    return jsonify({
        'K_SERVICE': os.getenv('K_SERVICE'),
        'running_on_cloud_run': os.getenv('K_SERVICE') is not None,
        'DB_HOST': os.getenv('DB_HOST'),
        'INSTANCE_CONNECTION_NAME': os.getenv('INSTANCE_CONNECTION_NAME'),
        'DB_SOCKET_DIR': '/cloudsql' if os.getenv('K_SERVICE') else None,
        'DB_NAME': os.getenv('DB_NAME'),
        'DB_USER': os.getenv('DB_USER')
    })

@app.route('/api/test-db-connection', methods=['GET'])
def test_db_connection():
    print("\n=== Testing Database Connection ===")
    try:
        # First test TCP connection
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(5)
        
        print(f"Testing TCP connection to {os.getenv('DB_HOST', '34.175.111.125 ')}:5432")
        result = s.connect_ex((os.getenv('DB_HOST', '34.175.111.125 '), 5432))
        if result == 0:
            print("TCP Connection: SUCCESS")
        else:
            print(f"TCP Connection: FAILED (error code {result})")
        s.close()
        
        # Now test PostgreSQL connection
        print("\nTesting PostgreSQL connection...")
        print(f"DB_HOST: {os.getenv('DB_HOST', '34.175.111.125 ')}")
        print(f"DB_NAME: {os.getenv('DB_NAME', 'ServitecInvoiceDataBase')}")
        print(f"DB_USER: {os.getenv('DB_USER', 'postgres')}")
        
        conn = connect_to_db()
        cur = conn.cursor()
        
        # Test query
        cur.execute('SELECT version()')
        version = cur.fetchone()
        
        # Test a table
        cur.execute('SELECT COUNT(*) FROM projects')
        count = cur.fetchone()
        
        cur.close()
        conn.close()
        
        return jsonify({
            'status': 'success',
            'database': {
                'connection': 'successful',
                'version': version[0] if version else None,
                'projects_count': count[0] if count else 0,
                'host': os.getenv('DB_HOST', '34.175.111.125 '),
                'database': os.getenv('DB_NAME', 'ServitecInvoiceDataBase'),
                'user': os.getenv('DB_USER', 'postgres')
            }
        })
        
    except Exception as e:
        print(f"Database test failed: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e),
            'database': {
                'host': os.getenv('DB_HOST', '34.175.111.125 '),
                'database': os.getenv('DB_NAME', 'ServitecInvoiceDataBase'),
                'user': os.getenv('DB_USER', 'postgres')
            }
        }), 500
        
@app.route('/api/health')  # Changed from /health to /api/health to match API convention
def health_check():
    print("\n=== Health Check Started ===")
    try:
        # Test database connection
        conn = connect_to_db()
        cur = conn.cursor()
        
        # Test a simple query
        print("Testing database query...")
        cur.execute('SELECT 1')
        result = cur.fetchone()
        
        # Get database version
        cur.execute('SELECT version()')
        version = cur.fetchone()
        
        cur.close()
        conn.close()
        
        print("Health check passed")
        return jsonify({
            "status": "healthy",
            "database": {
                "connected": True,
                "version": version[0] if version else ""
            },
            "timestamp": pd.Timestamp.now().isoformat()
        }), 200
    except Exception as e:
        print(f"✗ Health check failed: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "database": {
                "connected": False,
                "error": str(e)
            },
            "timestamp": pd.Timestamp.now().isoformat()
        }), 500

def execute_db_query(query, params=None):
    try:
        conn = connect_to_db()
        cur = conn.cursor()
        if params:
            cur.execute(query, params)
        else:
            cur.execute(query)
        data = cur.fetchall()
        columns = [desc[0] for desc in cur.description]
        result = [dict(zip(columns, row)) for row in data]
        return result
    except Exception as e:
        print(f"Query execution error: {str(e)}")
        raise
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


def get_database_schema():
    conn = connect_to_db()
    cur = conn.cursor()
    schema = {}

    # Get list of tables in the public schema
    cur.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    """)
    tables = cur.fetchall()

    # Get columns for each table
    for (table_name,) in tables:
        cur.execute(f"""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = '{table_name}';
        """)
        columns = cur.fetchall()
        schema[table_name] = [column_name for (column_name,) in columns]

    # Get foreign key relationships between tables
    cur.execute("""
        SELECT 
            tc.table_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY';
    """)
    foreign_keys = cur.fetchall()
    schema['foreign_keys'] = [
        {
            'table_name': fk[0],
            'column_name': fk[1],
            'foreign_table_name': fk[2],
            'foreign_column_name': fk[3]
        }
        for fk in foreign_keys
    ]

    cur.close()
    conn.close()
    return schema

def build_system_prompt(schema):
    schema_description = "Database Schema and Relationships:\n"
    for table, columns in schema.items():
        if table != 'foreign_keys':
            schema_description += f"Table: {table}\n"
            schema_description += "Columns:\n"
            for column in columns:
                schema_description += f"  - {column}\n"
            schema_description += "\n"

    schema_description += "Foreign Key Relationships:\n"
    for fk in schema['foreign_keys']:
        schema_description += f"- {fk['table_name']}.{fk['column_name']} -> {fk['foreign_table_name']}.{fk['foreign_column_name']}\n"

    return schema_description

# Static instruction (loaded only once per session)
STATIC_INSTRUCTIONS = """
You are an AI assistant designed to help users interact with a PostgreSQL database using natural language. Expect to be spoken in Spanish or Catalan. Your primary functions include:
- Providing information about the application's capabilities.
- Engaging in conversations.
- Retrieving specific data.
- Generating structured reports.

Instructions for Generating SQL Queries:
- Generate only SQL `SELECT` statements.
- Use table and column names accurately as per schema.
- Use `ILIKE` for case-insensitive searches.
- Respond in the same language as the user's request.

Instructions for Interpreting User Requests:
This application is a data management and reporting tool designed to help users organize, filter, view, and download information on projects, invoices, and elements associated with specific projects. 
The app provides a graphical interface with DataGrids, filterable search, and selectable item lists to assist users in managing large sets of structured data.
Reports can be generated in Excel from the DataGrids by selecting the items and clicking the download selected button, or from custom queries from the chatbot.
Be prepared to be flexible with the user's request. If you get a query request and have 0 results, guide the user to try to specify full names within "".
"""

# Define the function schema with descriptions
function_schema = {
    "name": "interpret_user_request",
    "description": (
        "Interprets the user's request and generates the appropriate action and SQL query if needed."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["query_data", "generate_report", "instruct_user", "conversation"],
                "description": "The action to perform."
            },
            "sql_query": {
                "type": "string",
                "description": "The SQL query to execute for 'query_data' or 'generate_report' actions."
            },
            "report_type": {
                "type": "string",
                "enum": ["pdf", "excel"],
                "description": "The report format, required when action is 'generate_report'. Defaults to 'excel'."
            },
            "message": {
                "type": "string",
                "description": "Assistant's message for 'instruct_user' or 'conversation' actions."
            }
        },
        "required": ["action"]
    }
}

def execute_db_query(query):
    engine = connect_to_db()
    with engine.connect() as conn:
        result = conn.execute(query)
        rows = result.fetchall()
        columns = result.keys()
        return [dict(zip(columns, row)) for row in rows]


def is_safe_query(query):
    # Basic check to prevent dangerous queries
    disallowed_statements = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'GRANT', 'REVOKE', 'TRUNCATE', 'RENAME', 'COMMENT', 'MODIFY']
    tokens = query.upper().split()
    for token in tokens:
        if token in disallowed_statements:
            return False
    return True

# API Endpoint to get all projects
@app.route('/api/projects', methods=['GET'])
@app.route('/api/projects/<project_name>', methods=['GET'])
def get_projects(project_name=None):
    print("=== GET Projects Request ===")
    try:
        conn = connect_to_db()
        cur = conn.cursor()
        
        print("Executing projects query...")
        query = """
            SELECT name, client, autonomous_community, size_of_construction,
                   construction_type, number_of_floors, ground_quality_study, end_state
            FROM projects
            WHERE 1=1
        """
        params = []
        
        if project_name:
            query += " AND name = %s"
            params.append(project_name)
            
        print(f"Query: {query}")
        print(f"Params: {params}")
        
        cur.execute(query, params)
        projects = cur.fetchall()
        print(f"Found {len(projects)} projects")
        
        columns = [
            'name', 'client', 'autonomous_community', 'size_of_construction',
            'construction_type', 'number_of_floors', 'ground_quality_study', 'end_state'
        ]
        
        projects_list = [dict(zip(columns, project)) for project in projects]
        return jsonify(projects_list)
    except Exception as e:
        print(f"! Error in get_projects: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()


# API Endpoint for chat
@app.route('/api/chat', methods=['POST'])
def chat():
    user_message = request.json.get('message')
    print(f"Received message from user: {user_message}")


    # Initialize session-based instructions at the start of each session
    if 'system_instructions' not in session:
        session['system_instructions'] = STATIC_INSTRUCTIONS
        session['conversation_history'] = []
        
    # Get the database schema
    schema = get_database_schema()

    # Build the system prompt with schema information
    system_prompt = build_system_prompt(schema)

    # Retrieve conversation history from session
    conversation_history = session.get('conversation_history', [])
    conversation_history.append({"role": "user", "content": user_message})

    # Limit the conversation history
    if len(conversation_history) > MAX_HISTORY_LENGTH:
        conversation_history = conversation_history[-MAX_HISTORY_LENGTH:]

    messages = [{"role": "system", "content": system_prompt}] + conversation_history

    try:
        # Call OpenAI API with function calling
        chat_response = client.chat.completions.create(
            model="gpt-4o-mini",  # Use GPT-4 for better performance
            messages=messages,
            functions=[function_schema],
            function_call={"name": "interpret_user_request"},
            temperature=0
            )

        # Access the function call arguments
        choice = chat_response.choices[0]
        function_call_args = choice.message.function_call.arguments
                    
        # Parse the arguments as JSON
        interpretation = json.loads(function_call_args)

        print(f"Interpretation: {interpretation}")

        # Extract information from the interpretation
        action = interpretation.get('action', None)  # 'action' is required, but None if missing for safety
        sql_query = interpretation.get('sql_query', None)  # Default to None if not present
        report_type = interpretation.get('report_type', 'excel')  # Default to 'excel'
        assistant_message = interpretation.get('message', "")  # Default to empty string

        if action == 'query_data':
            if not sql_query:
                return jsonify({'reply': "Error: No SQL query provided.", 'format': 'markdown'}), 400

            # Check if the query is safe
            if not is_safe_query(sql_query):
                return jsonify({'reply': "Error: Unsafe SQL query detected.", 'format': 'markdown'}), 400
            # Execute the query and fetch data
            conn = connect_to_db()
            cur = conn.cursor()
            cur.execute(sql_query)
            
            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            result = [dict(zip(columns, row)) for row in rows]

            # Format the data for natural language response
            natural_language_responses = []
            if result:
                for row in result:
                    row_text = ', '.join(f"{col.replace('_', ' ').capitalize()}: {val}" for col, val in row.items())
                    natural_language_responses.append(row_text)
            else:
                natural_language_responses.append("No results found.")

            # Close the database connection
            cur.close()
            conn.close()

            # Create a summary message for OpenAI to generate a natural language response
            data_summary = (
                "Here are the data you need to answer the user's previous question. "
                "Create a natural language response based on the data, question, and context:\n" +
                "\n".join(natural_language_responses)
            )
            messages.append({"role": "user", "content": data_summary})

            # Limit the conversation history if necessary
            if len(messages) > MAX_HISTORY_LENGTH:
                messages = messages[-MAX_HISTORY_LENGTH:]

            # Call OpenAI again to generate the final natural language response
            final_response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages
            )

            # Retrieve the final response content
            if final_response.choices and final_response.choices[0].message.content:
                final_content = final_response.choices[0].message.content.strip()
                # Append assistant's response to conversation history
                conversation_history.append({"role": "assistant", "content": final_content})
                session['conversation_history'] = conversation_history
                return jsonify({'reply': final_content, 'format': 'markdown'})
            else:
                return jsonify({'reply': "Error: No content in final response.", 'format': 'markdown'}), 500
        
        elif action == 'generate_report':
            sql_query = interpretation.get('sql_query')
            report_type = interpretation.get('report_type', 'excel')
            
            try:
                # Execute query and get data
                conn = connect_to_db()
                cur = conn.cursor()
                cur.execute(sql_query)
                data = cur.fetchall()
                columns = [desc[0] for desc in cur.description]
                df = pd.DataFrame(data, columns=columns)
                cur.close()
                conn.close()

                # Generate timestamp and filename (same pattern as downloadSelected)
                timestamp = pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')
                filename = f"chat_report_{timestamp}.xlsx"
                filepath = os.path.join(REPORTS_DIR, filename)
                
                # Ensure directory exists
                os.makedirs(os.path.dirname(filepath), exist_ok=True)

                # Save Excel file
                with pd.ExcelWriter(filepath, engine='xlsxwriter') as writer:
                    df.to_excel(writer, index=False, sheet_name='Report')
                    workbook = writer.book
                    worksheet = writer.sheets['Report']
                    header_format = workbook.add_format({'bold': True, 'bg_color': '#D3D3D3'})
                    for col_num, value in enumerate(df.columns.values):
                        worksheet.write(0, col_num, value, header_format)

                # Return the download URL using the same pattern as downloadSelected
                report_url = f'/api/download/{filename}'
                
                return jsonify({
                    'reply': "Report generated successfully. You can download it using the button below.",
                    'format': 'markdown',
                    'report_url': report_url
                })

            except Exception as e:
                print(f"Error generating report: {str(e)}")
                return jsonify({
                    'reply': f"Error generating report: {str(e)}", 
                    'format': 'markdown'
                }), 500
                
        elif action in ['instruct_user', 'conversation']:
            if not assistant_message:
                return jsonify({'reply': "Error: No message provided by assistant.", 'format': 'markdown'}), 400

            # Append assistant's response to conversation history
            conversation_history.append({"role": "assistant", "content": assistant_message})
            session['conversation_history'] = conversation_history

            return jsonify({'reply': assistant_message, 'format': 'markdown'})

        else:
            return jsonify({'reply': f"Error: Unrecognized action '{action}'.", 'format': 'markdown'}), 400

    except Exception as e:
        print(f"Error in chat function: {e}")
        return jsonify({'reply': "An error occurred during processing. Please try again.", 'format': 'markdown'}), 500

# Update the download endpoint
@app.route('/api/download/<path:filename>', methods=['GET'])
def download_file(filename):
    try:
        print(f"\n=== Download Request ===")
        print(f"Download request received for file: {filename}")
        print(f"Reports directory: {REPORTS_DIR}")
        
        # Clean the filename
        filename = os.path.basename(filename)
        filepath = os.path.join(REPORTS_DIR, filename)
        
        print(f"Full file path: {filepath}")
        print(f"File exists: {os.path.exists(filepath)}")
        print(f"Directory contents: {os.listdir(REPORTS_DIR)}")
        
        if not os.path.exists(filepath):
            print(f"File not found at path: {filepath}")
            return jsonify({'error': 'File not found'}), 404
            
        print(f"File exists, size: {os.path.getsize(filepath)} bytes")
        
        try:
            return send_file(
                filepath,
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                as_attachment=True,
                download_name=filename
            )
        except Exception as e:
            print(f"Error sending file: {str(e)}")
            return jsonify({'error': f'Error sending file: {str(e)}'}), 500
            
    except Exception as e:
        print(f"Error in download_file: {str(e)}")
        return jsonify({'error': str(e)}), 500

        
@app.route('/api/test-download', methods=['GET'])
def test_download():
    try:
        print("\n=== Test Download ===")
        # Create a test Excel file
        test_df = pd.DataFrame({'test': ['data1', 'data2'], 'column2': ['value1', 'value2']})
        test_file = os.path.join(REPORTS_DIR, 'test.xlsx')
        
        # Ensure directory exists
        os.makedirs(REPORTS_DIR, exist_ok=True)
        
        print(f"Creating test file at: {test_file}")
        
        # Write test file
        with pd.ExcelWriter(test_file, engine='xlsxwriter') as writer:
            test_df.to_excel(writer, index=False, sheet_name='Test')
            workbook = writer.book
            worksheet = writer.sheets['Test']
            header_format = workbook.add_format({'bold': True, 'bg_color': '#D3D3D3'})
            for col_num, value in enumerate(test_df.columns.values):
                worksheet.write(0, col_num, value, header_format)
            
        # Set permissions
        os.chmod(test_file, 0o666)
        
        print(f"Test file created successfully")
        print(f"File exists: {os.path.exists(test_file)}")
        print(f"File size: {os.path.getsize(test_file)} bytes")
        print(f"File permissions: {oct(os.stat(test_file).st_mode)[-3:]}")
        print(f"Directory contents: {os.listdir(REPORTS_DIR)}")
        
        return jsonify({
            'message': 'Test file created successfully',
            'download_url': '/api/download/test.xlsx'
        })
    except Exception as e:
        print(f"Test download error: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/invoices', methods=['GET'])
@app.route('/api/invoices/<project_name>', methods=['GET'])
def get_invoices(project_name=None):
    print("=== GET Invoices Request ===")
    try:
        conn = connect_to_db()
        cur = conn.cursor()

        # Debug logging
        print("Received request args:", request.args)
        print("Folder type filters:", {
            'adicionals': request.args.get('folderTypeFilters[adicionals]'),
            'pressupost': request.args.get('folderTypeFilters[pressupost]')
        })

        # Build base query
        query = """
            SELECT
                id,
                file_name,
                folder_type,
                project_name
            FROM invoices
        """
        params = []

        # Start WHERE clause
        if project_name:
            query += " WHERE project_name = %s"
            params.append(project_name)
        else:
            query += " WHERE 1=1"

        # Get folder type filters
        folder_type_adicionals = request.args.get('folderTypeFilters[adicionals]') == 'true'
        folder_type_pressupost = request.args.get('folderTypeFilters[pressupost]') == 'true'

        # Apply folder type filters if either checkbox is checked
        if folder_type_adicionals or folder_type_pressupost:
            filter_values = []
            if folder_type_adicionals:
                filter_values.append('Adicionals')
            if folder_type_pressupost:
                filter_values.append('Pressupost contracte')
            if filter_values:
                placeholders = ', '.join(['%s'] * len(filter_values))
                query += f" AND folder_type IN ({placeholders})"
                params.extend(filter_values)

        # Apply additional filters
        start_date = request.args.get('startDate')
        if start_date:
            query += " AND date >= %s"
            params.append(start_date)

        end_date = request.args.get('endDate')
        if end_date:
            query += " AND date <= %s"
            params.append(end_date)

        file_name_keyword = request.args.get('FileNameKeyword')
        if file_name_keyword:
            query += " AND file_name ILIKE %s"
            params.append(f'%{file_name_keyword}%')

        print(f"Query: {query}")
        print(f"Params: {params}")

        # Execute query
        cur.execute(query, params)
        invoices = cur.fetchall()
        print(f"Found {len(invoices)} invoices")

        # Get column names from cursor description
        columns = ['id', 'file_name', 'folder_type', 'project_name']
        
        # Convert to list of dictionaries
        invoices_list = [dict(zip(columns, invoice)) for invoice in invoices]
        
        return jsonify(invoices_list)

    except Exception as e:
        print(f"Error in get_invoices: {str(e)}")
        return jsonify({"error": str(e)}), 500
        
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

# API Endpoint to get subelements by element ID
@app.route('/api/subelements/<element_id>', methods=['GET'])
def get_subelements(element_id):
    conn = connect_to_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM subelements WHERE element_id = %s;", (element_id,))
    subelements = cur.fetchall()
    columns = [desc[0] for desc in cur.description]
    cur.close()
    conn.close()
    subelements_list = [dict(zip(columns, subelement)) for subelement in subelements]
    return jsonify(subelements_list)

# API Endpoint to get all elements or elements by project name
@app.route('/api/elements', methods=['GET'])
@app.route('/api/elements/<project_name>', methods=['GET'])
def get_elements(project_name=None):
    conn = connect_to_db()
    cur = conn.cursor()

    print("Received request args:", request.args)
    print("Folder type filters:", {
        'adicionals': request.args.get('folderTypeFilters[adicionals]'),
        'pressupost': request.args.get('folderTypeFilters[pressupost]')
    })
    
    # Get filters from query parameters
    nameKeyword = request.args.get('nameKeyword')
    invoiceNameKeyword = request.args.get('invoiceNameKeyword')
    invoiceid = request.args.get('invoiceid')
    min_price = request.args.get('minPrice')
    max_price = request.args.get('maxPrice')
    quantity = request.args.get('quantity')
    
# Base query with JOIN to get invoice information
    query = """
        SELECT 
            elements.*,
            EXISTS (
                SELECT 1 
                FROM subelements 
                WHERE subelements.element_id = elements.id
            ) AS has_subelements,
            invoices.file_name as invoice_name,
            invoices.folder_type as folder_type,
            invoices.project_name as project_name
        FROM elements
        LEFT JOIN invoices ON elements.invoice_id = invoices.id
    """

    params = []

    # Start WHERE clause
    if project_name:
        query += " WHERE invoices.project_name = %s"
        params.append(project_name)
    else:
        query += " WHERE 1=1"  # This ensures we can always add AND conditions

    # Get folder type filters
    folder_type_adicionals = request.args.get('folderTypeFilters[adicionals]') == 'true'
    folder_type_pressupost = request.args.get('folderTypeFilters[pressupost]') == 'true'
    
    # Apply folder type filter if either checkbox is checked
    if folder_type_adicionals or folder_type_pressupost:
        filter_values = []
        if folder_type_adicionals:
            filter_values.append('Adicionals')
        if folder_type_pressupost:
            filter_values.append('Pressupost contracte')
        if filter_values:
            query += " AND invoices.folder_type IN %s"  # Changed from IN ({placeholders})
            params.append(tuple(filter_values))  # Keep as tuple      

    # Apply additional filters
    if nameKeyword:
        query += " AND elements.name ILIKE %s"
        params.append(f'%{nameKeyword}%')
    if invoiceNameKeyword:
        query += " AND invoices.file_name ILIKE %s"
        params.append(f'%{invoiceNameKeyword}%')
    if invoiceid:
        query += " AND elements.invoice_id = %s"
        params.append(invoiceid)
    if min_price:
        query += " AND elements.price_per_unit >= %s"
        params.append(min_price)
    if max_price:
        query += " AND elements.price_per_unit <= %s"
        params.append(max_price)
    if quantity:
        query += " AND elements.quantity = %s"
        params.append(quantity)


    cur.execute(query, params)
    elements = cur.fetchall()
    columns = [desc[0] for desc in cur.description]
    cur.close()
    conn.close()

    elements_list = [dict(zip(columns, elem)) for elem in elements]
    return jsonify(elements_list)

@app.route('/api/download_selected/<entity_type>', methods=['POST'])
def download_selected(entity_type):
    try:
        selected_ids = request.json.get('selectedIds', [])
        if not selected_ids:
            return jsonify({'error': 'No items selected'}), 400

        conn = connect_to_db()
        cur = conn.cursor()

        if entity_type == 'elements':
            elements_query = """
                SELECT 
                    e.id,
                    e.chapter_title,
                    e.subchapter_code,
                    e.name,
                    e.unit,
                    e.quantity,
                    e.price_per_unit,
                    e.total_price,
                    e.description,
                    i.file_name AS invoice_name,
                    i.folder_type,
                    i.project_name
                FROM elements e
                LEFT JOIN invoices i ON e.invoice_id = i.id
                WHERE e.id = ANY(%s::integer[])
                ORDER BY i.file_name
            """
            
            subelements_query = """
                SELECT 
                    s.element_id,
                    s.title,
                    s.unit,
                    s.n,
                    s.l,
                    s.h,
                    s.w,
                    s.unit_price,
                    s.total_price
                FROM subelements s
                WHERE s.element_id = ANY(%s::integer[])
                ORDER BY s.element_id, s.id
            """
            
            cur.execute(elements_query, (selected_ids,))
            elements_data = cur.fetchall()
            elements_columns = [desc[0] for desc in cur.description]
            
            cur.execute(subelements_query, (selected_ids,))
            subelements_data = cur.fetchall()
            subelements_columns = [desc[0] for desc in cur.description]
            
            df = pd.DataFrame(elements_data, columns=elements_columns)
            subelements_df = pd.DataFrame(subelements_data, columns=subelements_columns)
            
        else:
            if entity_type == 'projects':
                query = """
                    SELECT *
                    FROM projects
                    WHERE name = ANY(%s)
                """
            elif entity_type == 'invoices':
                query = """
                    SELECT 
                        i.folder_type,
                        i.file_name,
                        i.project_name,
                        p.name AS project_name
                    FROM invoices i
                    LEFT JOIN projects p ON i.project_name = p.name
                    WHERE i.id = ANY(%s::integer[])
                """
            else:
                return jsonify({'error': 'Invalid entity type'}), 400

            cur.execute(query, (selected_ids,))
            rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description]
            
            if not rows:
                return jsonify({'error': 'No data found for selected items'}), 404
            
            df = pd.DataFrame(rows, columns=columns)

        timestamp = pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{entity_type}_report_{timestamp}.xlsx"
        filepath = os.path.join(REPORTS_DIR, filename)
        
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        with pd.ExcelWriter(filepath, engine='xlsxwriter') as writer:
            workbook = writer.book
            
            header_format = workbook.add_format({
                'bold': True,
                'bg_color': '#4F81BD',
                'font_color': 'white',
                'border': 1,
                'text_wrap': True,
                'valign': 'vcenter',
                'align': 'center'
            })
            
            number_format = workbook.add_format({
                'num_format': '#,##0.00',
                'border': 1,
                'align': 'right'
            })
            
            highlighted_cell_format = workbook.add_format({
                'bg_color': '#FFE5CC',  # Light orange color
                'align': 'left'
            })

            
            highlighted_number_format = workbook.add_format({
                'bg_color': '#FFE5CC',  # Light orange color
                'num_format': '#,##0.00',
                'align': 'right'
            })


            if entity_type == 'elements':
                worksheet = workbook.add_worksheet('Elements')
                current_row = 0

                element_columns = list(df.columns)
                element_columns = element_columns[1:]  # Skip the id column
                subelement_columns = ['Sub Title', 'Sub Unit', 'N', 'L', 'H', 'W', 'Sub Unit Price', 'Sub Total Price']
                all_columns = element_columns + subelement_columns
                
                # Set consistent column width for all columns
                for col in range(len(all_columns)):
                    worksheet.set_column(col, col, 19)  # Set default width to 15, VERY IMPORTANT

                # Write headers
                for col, header in enumerate(all_columns):
                    worksheet.write(current_row, col, header, header_format)


                current_row = 1
                for _, row in df.iterrows():
                    # Write element data with conditional formatting
                    for col, value in enumerate(row.values[1:]):
                        header = element_columns[col]
                        if header in ['name', 'price_per_unit', 'invoice_name','Sub Unit Price']:
                            if isinstance(value, (int, float)):
                                worksheet.write_number(current_row, col, value, highlighted_number_format)
                            else:
                                worksheet.write(current_row, col, value, highlighted_cell_format)
                        else:
                            if isinstance(value, (int, float)):
                                worksheet.write_number(current_row, col, value, number_format)
                            else:
                                worksheet.write(current_row, col, value)
                    
                    # Add subelements if they exist
                    element_subs = subelements_df[subelements_df['element_id'] == row.iloc[0]]
                    if not element_subs.empty:
                        for _, sub_row in element_subs.iterrows():
                            current_row += 1
                            for col in range(len(element_columns)):
                                worksheet.write(current_row, col, '')
                            
                            col_offset = len(element_columns)
                            worksheet.write(current_row, col_offset, sub_row['title'])
                            worksheet.write(current_row, col_offset + 1, sub_row['unit'])
                            if sub_row['n']: worksheet.write_number(current_row, col_offset + 2, sub_row['n'], number_format)
                            if sub_row['l']: worksheet.write_number(current_row, col_offset + 3, sub_row['l'], number_format)
                            if sub_row['h']: worksheet.write_number(current_row, col_offset + 4, sub_row['h'], number_format)
                            if sub_row['w']: worksheet.write_number(current_row, col_offset + 5, sub_row['w'], number_format)
                            if sub_row['unit_price']:
                                worksheet.write_number(current_row, col_offset + 6, sub_row['unit_price'], number_format)
                            if sub_row['total_price']: 
                                worksheet.write_number(current_row, col_offset + 7, sub_row['total_price'], number_format)
                    
                    current_row += 1
                    
            else:
                worksheet = workbook.add_worksheet('Data')
                
                for col in range(len(df.columns)):
                    worksheet.set_column(col, col, 19)

                for col, header in enumerate(df.columns):
                    worksheet.write(0, col, header, header_format)

                for row_idx, row in df.iterrows():
                    for col_idx, value in enumerate(row):
                        if isinstance(value, (int, float)):
                            worksheet.write_number(row_idx + 1, col_idx, value, number_format)
                        else:
                            worksheet.write(row_idx + 1, col_idx, value)

            worksheet.freeze_panes(1, 0)
            worksheet.autofilter(0, 0, len(df), len(df.columns) - 1)

        return send_file(
            filepath,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )

    except Exception as e:
        print(f"Error in download_selected: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        if 'cur' in locals():
            cur.close()
        if 'conn' in locals():
            conn.close()

# Run the Flask app
if __name__ == '__main__':
    port = int(os.getenv('PORT', 8080))
    app.run(host='0.0.0.0', port=port)