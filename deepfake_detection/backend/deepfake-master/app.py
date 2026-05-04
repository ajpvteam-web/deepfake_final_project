import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
import numpy as np
from PIL import Image
import io
from datetime import timedelta
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras import layers, models
import cv2

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///deepfake_users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=30)

UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}
MAX_FILE_SIZE = 16 * 1024 * 1024

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Initialize extensions
db = SQLAlchemy(app)
jwt = JWTManager(app)

# Enable CORS
CORS(app, resources={r"/api/*": {"origins": "*"}, r"/auth/*": {"origins": "*"}})

# ==================== DATABASE MODELS ====================

class User(db.Model):
    """User model for authentication"""
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if provided password matches hash"""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

# ==================== MODEL LOADING ====================

MODEL_PATHS = [
    os.path.join('model', 'final_model.keras'),
    os.path.join('model', 'best_model.keras'),
]

def load_model(default_path=None):
    """Load the trained Keras model, or build an untrained MobileNetV2 as fallback"""
    paths_to_check = [default_path] if default_path else []
    paths_to_check.extend([
        os.path.join('model', 'final_model.keras'),
        os.path.join('model', 'best_model.keras'),
    ])

    for path in paths_to_check:
        if path and os.path.exists(path):
            try:
                print(f"[MODEL] Loading trained model from: {path}")
                model = tf.keras.models.load_model(path)
                print(f"[MODEL] Model loaded successfully! Input shape: {model.input_shape}")
                return model, True
            except Exception as e:
                print(f"[MODEL] Error loading {path}: {e}")

    # Fallback: Try loading from config.json and model.weights.h5
    config_path = os.path.join('model', 'config.json')
    weights_path = os.path.join('model', 'model.weights.h5')
    
    if os.path.exists(config_path) and os.path.exists(weights_path):
        try:
            print(f"[MODEL] Loading model from config and weights...")
            with open(config_path, 'r') as f:
                model_config = f.read()
            
            # Reconstruct model from JSON architecture
            model = tf.keras.models.model_from_json(model_config)
            # Load weights
            model.load_weights(weights_path)
            # Re-compile to avoid issues (MobileNetV2 architecture)
            model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
            
            print(f"[MODEL] Model loaded successfully from config/weights!")
            return model, True
        except Exception as e:
            print(f"[MODEL] Error loading from config/weights: {e}")

    # No trained model found - build untrained MobileNetV2 architecture as fallback
    print("[MODEL] No trained model found. Building untrained MobileNetV2 fallback...")
    print("[MODEL] To train a model, run: python train_pretrained.py")
    base_model = MobileNetV2(
        weights='imagenet',
        include_top=False,
        input_shape=(224, 224, 3)
    )
    base_model.trainable = False
    x = base_model.output
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dense(128, activation='relu')(x)
    x = layers.Dropout(0.5)(x)
    output = layers.Dense(1, activation='sigmoid')(x)
    model = models.Model(inputs=base_model.input, outputs=output)
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
    print("[MODEL] Untrained fallback model ready (predictions will not be accurate)")
    return model, False

# Load model at startup
ml_model, model_is_trained = load_model('model/final_model.keras')

# ==================== HELPER FUNCTIONS ====================

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def preprocess_image(image, target_size=(224, 224)):
    """Preprocess image for model prediction"""
    try:
        # Resize image
        image = image.resize(target_size)
        
        # Convert to numpy array and rescale (matching training: 1/255)
        img_array = np.array(image) / 255.0
        
        # Ensure 3 channels (RGB)
        if img_array.shape[-1] != 3:
            img_array = img_array[:, :, :3]
            
        # Add batch dimension
        img_array = np.expand_dims(img_array, axis=0)
        return img_array
    except Exception as e:
        print(f"[PREPROCESS] Error: {e}")
        return None

# ==================== AUTHENTICATION ROUTES ====================

@app.route('/auth/signup', methods=['POST'])
def signup():
    """Register a new user"""
    try:
        data = request.get_json()
        
        if not data or not data.get('email') or not data.get('password') or not data.get('username'):
            return jsonify({
                'success': False,
                'error': 'Missing required fields: email, username, password'
            }), 400
        
        email = data.get('email').lower().strip()
        username = data.get('username').strip()
        password = data.get('password')
        
        # Validate email
        if '@' not in email or '.' not in email:
            return jsonify({
                'success': False,
                'error': 'Invalid email format'
            }), 400
        
        # Validate password length
        if len(password) < 6:
            return jsonify({
                'success': False,
                'error': 'Password must be at least 6 characters'
            }), 400
        
        # Validate username length
        if len(username) < 3:
            return jsonify({
                'success': False,
                'error': 'Username must be at least 3 characters'
            }), 400
        
        # Check if user exists
        if User.query.filter_by(email=email).first():
            return jsonify({
                'success': False,
                'error': 'Email already registered'
            }), 409
        
        if User.query.filter_by(username=username).first():
            return jsonify({
                'success': False,
                'error': 'Username already taken'
            }), 409
        
        # Create new user
        user = User(email=email, username=username)
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        # Generate token
        access_token = create_access_token(identity=str(user.id))
        
        return jsonify({
            'success': True,
            'message': 'User created successfully',
            'user': user.to_dict(),
            'access_token': access_token
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Signup failed: {str(e)}'
        }), 500

@app.route('/auth/login', methods=['POST'])
def login():
    """Login user and return JWT token"""
    try:
        data = request.get_json()
        
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({
                'success': False,
                'error': 'Missing email or password'
            }), 400
        
        email = data.get('email').lower().strip()
        password = data.get('password')
        
        # Find user
        user = User.query.filter_by(email=email).first()
        
        if not user or not user.check_password(password):
            return jsonify({
                'success': False,
                'error': 'Invalid email or password'
            }), 401
        
        # Generate token
        access_token = create_access_token(identity=str(user.id))
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': user.to_dict(),
            'access_token': access_token
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Login failed: {str(e)}'
        }), 500

@app.route('/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        return jsonify({
            'success': True,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error: {str(e)}'
        }), 500

# ==================== HEALTH CHECK ====================

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    input_shape = ml_model.input_shape if ml_model else None
    return jsonify({
        "status": "ok",
        "message": "Backend is running",
        "model": "trained" if model_is_trained else "untrained (MobileNetV2 fallback)",
        "model_loaded": ml_model is not None,
        "model_input_shape": list(input_shape) if input_shape else None,
        "face_detection": face_cascade is not None and not face_cascade.empty()
    }), 200

# ==================== PREDICTION ROUTE (PROTECTED) ====================

@app.route('/api/predict', methods=['POST'])
@jwt_required()
def predict_route():
    """
    Predict if an image is deepfake or authentic (REQUIRES AUTHENTICATION)
    Expected: multipart/form-data with 'image' field + JWT token in Authorization header
    Returns: JSON with prediction result
    """
    try:
        # Get current user (already verified by @jwt_required())
        user_id = int(get_jwt_identity())
        
        # Check if image file is present
        if 'image' not in request.files:
            return jsonify({
                "success": False,
                "error": "No image file provided"
            }), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({
                "success": False,
                "error": "No file selected"
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                "success": False,
                "error": "File type not allowed. Supported: png, jpg, jpeg, gif, bmp"
            }), 400
        
        # Read image from file stream
        try:
            image = Image.open(io.BytesIO(file.read()))
            if image.mode != 'RGB':
                image = image.convert('RGB')
        except Exception as e:
            return jsonify({
                "success": False,
                "error": f"Failed to process image: {str(e)}"
            }), 400
        
        # Perform Face Detection
        img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        face_detected = False
        if len(faces) > 0:
            # Sort by area and pick the largest face
            faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
            x, y, w, h = faces[0]
            
            # Add some padding to the face crop (optional but often better)
            padding = int(min(w, h) * 0.1)
            y_start = max(0, y - padding)
            y_end = min(img_cv.shape[0], y + h + padding)
            x_start = max(0, x - padding)
            x_end = min(img_cv.shape[1], x + w + padding)
            
            # Crop the face
            face_img = image.crop((x_start, y_start, x_end, y_end))
            image_to_process = face_img
            face_detected = True
            print(f"[PREDICT] Face detected and cropped for analysis")
        else:
            image_to_process = image
            print(f"[PREDICT] No face detected, analyzing full image")

        # Get target size from model input
        # Standard MobileNetV2 is (224, 224), but we check the loaded model
        target_size = (224, 224)
        if ml_model and hasattr(ml_model, 'input_shape'):
            shape = ml_model.input_shape
            if shape and len(shape) >= 3:
                target_size = (shape[1], shape[2])
        
        # Preprocess and predict
        processed = preprocess_image(image_to_process, target_size=target_size)
        
        if processed is None:
            return jsonify({
                "success": False,
                "error": "Failed to preprocess image"
            }), 500

        prediction = ml_model.predict(processed, verbose=0)
        confidence = float(prediction[0][0])
        
        # Determine result
        # Model output: sigmoid value where >0.5 = Real, <=0.5 = Fake
        is_authentic = confidence > 0.5
        authenticity_score = (confidence * 100) if is_authentic else ((1 - confidence) * 100)
        
        result = {
            "success": True,
            "is_authentic": is_authentic,
            "confidence": round(confidence, 4),
            "authenticity_percentage": round(authenticity_score, 2),
            "label": "Real Image" if is_authentic else "Fake Image",
            "user_id": user_id,
            "model_trained": model_is_trained,
            "face_detected": face_detected,
            "input_size": f"{target_size[0]}x{target_size[1]}"
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Internal server error: {str(e)}"
        }), 500

# ==================== ERROR HANDLERS ====================

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_data):
    return jsonify({
        'success': False,
        'error': 'Token has expired'
    }), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({
        'success': False,
        'error': 'Invalid token'
    }), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify({
        'success': False,
        'error': 'Authorization token is missing'
    }), 401

# ==================== DATABASE INITIALIZATION ====================

def init_db():
    """Initialize database"""
    with app.app_context():
        db.create_all()
        print("[OK] Database initialized")

# ==================== MAIN ====================

if __name__ == '__main__':
    init_db()
    print("[*] Starting Deepfake Detection Backend with Authentication...")
    print(f"[AUTH] Authentication: JWT (email/password)")
    print(f"[MODEL] Model Status: {'Trained model loaded' if model_is_trained else 'Untrained MobileNetV2 fallback'}")
    print(f"[SERVER] Server: http://0.0.0.0:5000")
    print(f"\n[API] Endpoints:")
    print(f"   POST   /auth/signup          - Create new account")
    print(f"   POST   /auth/login           - Login and get token")
    print(f"   GET    /auth/me              - Get current user (requires token)")
    print(f"   POST   /api/predict          - Predict deepfake (requires token)")
    print(f"   GET    /health               - Health check")
    app.run(debug=True, host='0.0.0.0', port=5000)