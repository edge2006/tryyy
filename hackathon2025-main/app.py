import os
import pytesseract
from flask import Flask, request, jsonify, render_template, Response
from PIL import Image
from pdf2image import convert_from_path
import json
from datetime import datetime
import google.generativeai as genai
import hashlib
import jwt
from werkzeug.security import check_password_hash
from functools import wraps
from fpdf import FPDF
import cv2
from pyzbar.pyzbar import decode as qr_decode

# --- Flask App Setup & Configuration ---
app = Flask(__name__)
app.config['SECRET_KEY'] = 'a-random-and-very-long-secret-key-for-jwt'

# --- File Paths ---
UPLOAD_FOLDER = "uploads"
JSON_FOLDER = os.path.join(UPLOAD_FOLDER, "json")
ALL_DATA_FILE_PATH = os.path.join(JSON_FOLDER, "all_data.json")
SUPPORT_TICKETS_PATH = "support_tickets.json"
DATABASE_PATH = "database.json"
USERS_PATH = "users.json"
ALERTS_PATH = "alerts.json"

# Create directories
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(JSON_FOLDER, exist_ok=True)

# --- AI Configuration ---
try:
    GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "AIzaSyD9mW-Dh29bx6VCmmGLZ3FhrttmWdI6TZw")
    if "YOUR_API_KEY" in GOOGLE_API_KEY: print("Warning: GOOGLE_API_KEY is not set.")
    genai.configure(api_key=GOOGLE_API_KEY)
except ImportError:
    print("Could not import google.generativeai.")
    genai = None

# --- Authentication & Roles ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers: token = request.headers['Authorization'].split(" ")[1]
        if not token: return jsonify({'message': 'Token is missing!'}), 401
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            kwargs['current_user'] = data
        except: return jsonify({'message': 'Token is invalid!'}), 401
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        if kwargs['current_user']['role'] != 'admin': return jsonify({'message': 'Admins only!'}), 403
        return f(*args, **kwargs)
    return decorated

def institution_required(f):
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        if kwargs['current_user']['role'] not in ['admin', 'institution']: return jsonify({'message': 'Institution or admin access required!'}), 403
        return f(*args, **kwargs)
    return decorated

# --- PDF Generation ---
class PDF(FPDF):
    def header(self): self.set_font('Helvetica', 'B', 16); self.cell(0, 10, 'ProofPoint Verification Report', 0, 1, 'C'); self.ln(10)
    def chapter_title(self, title): self.set_font('Helvetica', 'B', 12); self.cell(0, 10, title, 0, 1, 'L'); self.ln(2)
    def chapter_body(self, name, value, is_multiline=False):
        self.set_font('Helvetica', 'B', 10); self.cell(40, 6, name); self.set_font('Helvetica', '', 10)
        if is_multiline: self.multi_cell(0, 6, value)
        else: self.cell(0, 6, value)
        self.ln(6)
    def add_verification_data(self, data):
        self.chapter_title('Overall Verification Status')
        status = data.get('verification_status', 'N/A'); self.set_font('Helvetica', 'B', 12)
        if 'Verified' in status: self.set_text_color(0, 128, 0)
        else: self.set_text_color(220, 53, 69)
        self.cell(0, 10, status, 1, 1, 'C'); self.set_text_color(0, 0, 0); self.ln(10)
        details = data.get('extracted_details', {}); analysis = data.get('tamper_analysis', {})
        self.chapter_title('Extracted Document Details')
        # This part remains dynamic and works well with the reverted AI logic
        for key, value in details.items():
            formatted_key = key.replace("_", " ").title() + ":"
            self.chapter_body(formatted_key, str(value))
        self.ln(5)
        self.chapter_title('AI Tamper Analysis'); self.chapter_body('Tamper Score:', str(analysis.get('tamper_score', 'N/A')) + ' / 100'); self.chapter_body('AI Summary:', analysis.get('analysis_summary', 'N/A'), is_multiline=True); self.ln(5)
        self.chapter_title('Metadata'); self.chapter_body('Source File:', data.get('source_filename', 'N/A')); self.chapter_body('Verification Time:', data.get('processing_timestamp', 'N/A'))

# --- Helper Functions ---
def get_file_hash(file_stream):
    hash_sha256 = hashlib.sha256();
    for chunk in iter(lambda: file_stream.read(4096), b""): hash_sha256.update(chunk)
    file_stream.seek(0); return hash_sha256.hexdigest()

def find_record_by_hash(file_hash):
    if not os.path.exists(ALL_DATA_FILE_PATH): return None
    with open(ALL_DATA_FILE_PATH, "r") as f:
        try:
            records = json.load(f)
            for record in records:
                if record.get("file_hash") == file_hash: return record
        except (json.JSONDecodeError, IndexError): return None
    return None

def scan_for_qr_code(image_path):
    try:
        image = cv2.imread(image_path)
        if image is None: return None
        decoded_objects = qr_decode(image)
        if not decoded_objects: return None
        return decoded_objects[0].data.decode('utf-8')
    except Exception as e:
        print(f"QR code scan failed: {e}")
        return None

def extract_text(file_path):
    text = ""
    try:
        if file_path.lower().endswith((".pdf")):
            images = convert_from_path(file_path)
            for i, image in enumerate(images):
                temp_image_path = os.path.join(UPLOAD_FOLDER, f"temp_page_{i}.png")
                image.save(temp_image_path, "PNG")
                text += pytesseract.image_to_string(Image.open(temp_image_path)) + "\n"
                os.remove(temp_image_path)
        else:
            img = Image.open(file_path)
            text = pytesseract.image_to_string(img)
    except Exception as e: print(f"OCR ERROR: {e}"); raise
    return text.strip()

def clean_and_parse_json(ai_response_text):
    try:
        json_start = ai_response_text.find('{')
        json_end = ai_response_text.rfind('}') + 1
        if json_start != -1 and json_end != 0:
            json_string = ai_response_text[json_start:json_end]
            return json.loads(json_string)
        else:
            raise ValueError("No valid JSON object found in AI response.")
    except Exception as e:
        print(f"!!!!!! JSON PARSING FAILED !!!!!!!\nRaw Text: {ai_response_text}\nError: {e}\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        raise

def parse_text_with_ai(text):
    """
    Reverted to the stable, more constrained AI prompt.
    """
    if not genai: raise ConnectionError("Google AI library not available.")
    model = genai.GenerativeModel('gemini-1.5-flash')
    prompt = f"""
    Analyze the following text. Extract these specific details:
    - Name (use key "name")
    - Father's Name (use key "fathers_name")
    - A unique identifier like a "Roll No." or "Document Number". Use the key "roll_no" if it is a roll number, or "document_number" if it is another type of ID.

    Respond ONLY with a valid JSON object. If a field is not found, its value should be 'N/A'.

    Text: ---
    {text}
    ---
    """
    response = model.generate_content(prompt)
    return clean_and_parse_json(response.text)

def analyze_image_for_tampering(image_path):
    if not genai: raise ConnectionError("Google AI library not available.")
    model = genai.GenerativeModel('gemini-1.5-flash'); image_file = genai.upload_file(path=image_path)
    prompt = "Act as a forensic examiner. Analyze this image for tampering. Provide a 'tamper_score' (0-100) and a brief 'analysis_summary'. Respond ONLY with a valid JSON object."
    response = model.generate_content([prompt, image_file])
    return clean_and_parse_json(response.text)

def verify_against_database(extracted_data):
    with open(DATABASE_PATH, "r") as f: db = json.load(f)
    unique_id_key = next((key for key in ['roll_no', 'document_number'] if key in extracted_data), None)
    if not unique_id_key: return "Record Not Found (No ID)"
    for record in db:
        if (record.get("name", "").lower() == extracted_data.get("name", "").lower() and
            record.get(unique_id_key) == extracted_data.get(unique_id_key)):
            return "Verified"
    return "Record Not Found"

def append_to_json_file(new_data, file_path):
    records = [];
    if os.path.exists(file_path) and os.path.getsize(file_path) > 0:
        with open(file_path, "r") as f:
            try: records = json.load(f)
            except json.JSONDecodeError: records = []
    records.append(new_data);
    with open(file_path, "w") as f: json.dump(records, f, indent=4)

# --- Routes ---
@app.route("/")
def home(): return render_template("index.html")

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json(); email, password = data.get('email'), data.get('password')
    with open(USERS_PATH, "r") as f: users = json.load(f)
    user = next((u for u in users if u['email'] == email), None)
    if not user or not check_password_hash(user['password_hash'], password): return jsonify({'message': 'Invalid credentials'}), 401
    token = jwt.encode({'email': user['email'], 'name': user['name'], 'role': user['role']}, app.config['SECRET_KEY'], algorithm="HS256")
    return jsonify({'token': token, 'userName': user['name'], 'userRole': user['role']})

@app.route('/check_auth', methods=['POST'])
@token_required
def check_auth(current_user): return jsonify({'message': 'Token is valid', 'userName': current_user['name'], 'userRole': current_user['role']}), 200

@app.route('/process_document', methods=['POST'])
@token_required
def process_document(current_user):
    if "file" not in request.files: return jsonify({"error": "No file part"}), 400
    file = request.files["file"];
    if file.filename == "": return jsonify({"error": "No file selected"}), 400
    file_hash = get_file_hash(file); cached_result = find_record_by_hash(file_hash)
    if cached_result:
        cached_result["retrieved_from_cache"] = True; return jsonify(cached_result)
    temp_file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    try:
        file.save(temp_file_path)
        qr_data = scan_for_qr_code(temp_file_path)
        raw_text = extract_text(temp_file_path)
        if not raw_text.strip(): return jsonify({"error": "Could not extract text."}), 400

        extracted_details = parse_text_with_ai(raw_text)
        tamper_analysis = analyze_image_for_tampering(temp_file_path)

        if qr_data and (qr_data.startswith('http://') or qr_data.startswith('https://')):
            verification_status = "Verified via QR Code"
        else:
            verification_status = verify_against_database(extracted_details)

        if tamper_analysis.get('tamper_score', 0) > 75:
            alert_record = {"alert_type": "High Tamper Score", "score": tamper_analysis.get('tamper_score'), "filename": file.filename, "verified_by": current_user['email'], "timestamp": datetime.now().isoformat()}
            append_to_json_file(alert_record, ALERTS_PATH)

        final_result = {
            "file_hash": file_hash, "source_filename": file.filename, "processing_timestamp": datetime.now().isoformat(),
            "retrieved_from_cache": False, "extracted_details": extracted_details,
            "tamper_analysis": tamper_analysis, "verification_status": verification_status,
            "qr_code_data": qr_data
        }
        append_to_json_file(final_result, ALL_DATA_FILE_PATH); return jsonify(final_result)
    except Exception as e:
        detailed_error = f"An error occurred: {type(e).__name__} - {e}"; print(f"!!!!!! ERROR !!!!!!!\n{detailed_error}\n!!!!!!!!!!!!!!"); app.logger.error(detailed_error)
        return jsonify({"error": "Failed to process the file. Check terminal for details."}), 500
    finally:
        if os.path.exists(temp_file_path): os.remove(temp_file_path)

@app.route('/submit_ticket', methods=['POST'])
@token_required
def submit_ticket(current_user):
    data = request.get_json(); message = data.get('message')
    if not message: return jsonify({"error": "Message cannot be empty."}), 400
    ticket_record = {"user_email": current_user['email'], "user_name": current_user['name'], "timestamp": datetime.now().isoformat(), "message": message, "status": "open"}
    append_to_json_file(ticket_record, SUPPORT_TICKETS_PATH); return jsonify({"message": "Support ticket submitted successfully!"}), 201

@app.route('/generate_report', methods=['POST'])
@token_required
def generate_report(current_user):
    data = request.get_json(); pdf = PDF(); pdf.add_page(); pdf.add_verification_data(data)
    return Response(pdf.output(dest='S').encode('latin-1'), mimetype='application/pdf', headers={'Content-Disposition':'attachment;filename=report.pdf'})

@app.route('/admin/dashboard_data', methods=['GET'])
@admin_required
def admin_dashboard_data(current_user):
    return jsonify({
        "total_verifications": len(json.load(open(ALL_DATA_FILE_PATH))) if os.path.exists(ALL_DATA_FILE_PATH) else 0,
        "high_risk_alerts": len(json.load(open(ALERTS_PATH))) if os.path.exists(ALERTS_PATH) else 0,
        "support_tickets": len(json.load(open(SUPPORT_TICKETS_PATH))) if os.path.exists(SUPPORT_TICKETS_PATH) else 0
    })

@app.route('/institution/dashboard_data', methods=['GET'])
@institution_required
def institution_dashboard_data(current_user):
    return jsonify({ "institution_name": "Satyug Darshan Institute", "verifications_today": 5, "total_records_in_db": 2 })

if __name__ == "__main__":
    app.run(debug=True)

