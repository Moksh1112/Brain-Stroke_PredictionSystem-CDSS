from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import os

app = Flask(__name__)

# Enable CORS for all routes
CORS(app)

# Try to load the model, otherwise use fallback logic
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.pkl')
model = None

try:
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)
        print("Model loaded successfully!")
    else:
        print("Model file not found. Using fallback prediction logic.")
except Exception as e:
    print(f"Error loading model: {e}. Using fallback prediction logic.")

def preprocess_input(data):
    """Preprocess input data for the model."""
    return {
        'age': float(data.get('age', 0)),
        'gender': float(data.get('gender', 0)),
        'hypertension': float(data.get('hypertension', 0)),
        'heart_disease': float(data.get('heart_disease', 0)),
        'avg_glucose_level': float(data.get('avg_glucose_level', 0)),
        'bmi': float(data.get('bmi', 0)),
        'smoking_status': float(data.get('smoking_status', 0))
    }

def get_recommendation(prediction):
    """Get recommendation based on prediction result."""
    recommendations = {
        'Low Risk': 'Continue maintaining a healthy lifestyle with regular exercise, balanced diet, and routine health check-ups.',
        'Moderate Risk': 'Lifestyle modifications and regular monitoring are advised. Consider scheduling a follow-up with your healthcare provider to discuss preventive measures.',
        'High Risk': 'Immediate medical consultation is strongly recommended. Please consult with a neurologist for comprehensive evaluation, including imaging and detailed risk factor management.'
    }
    return recommendations.get(prediction, 'Please consult with your healthcare provider.')

def fallback_predict(data):
    """Fallback prediction logic using decision tree-like scoring."""
    score = 0
    
    # Age factor
    age = data.get('age', 0)
    if age >= 65:
        score += 3
    elif age >= 50:
        score += 2
    elif age >= 40:
        score += 1
    
    # Hypertension
    if data.get('hypertension', 0) == 1:
        score += 2
    
    # Heart disease
    if data.get('heart_disease', 0) == 1:
        score += 2
    
    # Glucose level
    glucose = data.get('avg_glucose_level', 0)
    if glucose >= 200:
        score += 3
    elif glucose >= 140:
        score += 2
    elif glucose >= 100:
        score += 1
    
    # BMI
    bmi = data.get('bmi', 0)
    if bmi >= 35:
        score += 2
    elif bmi >= 30:
        score += 1
    
    # Smoking status
    smoking = data.get('smoking_status', 0)
    if smoking == 2:  # smokes
        score += 2
    elif smoking == 1:  # formerly_smoked
        score += 1
    
    # Determine risk level
    if score >= 8:
        return 'High Risk'
    elif score >= 4:
        return 'Moderate Risk'
    else:
        return 'Low Risk'

def validate_input(data):
    """Validate input data."""
    errors = []
    
    age = data.get('age')
    if age is None or not isinstance(age, (int, float)) or age < 1 or age > 120:
        errors.append('Age must be between 1 and 120')
    
    gender = data.get('gender')
    if gender is None or gender not in [0, 1, 2]:
        errors.append('Gender must be 0, 1, or 2')
    
    hypertension = data.get('hypertension')
    if hypertension is None or hypertension not in [0, 1]:
        errors.append('Hypertension must be 0 or 1')
    
    heart_disease = data.get('heart_disease')
    if heart_disease is None or heart_disease not in [0, 1]:
        errors.append('Heart disease must be 0 or 1')
    
    avg_glucose_level = data.get('avg_glucose_level')
    if avg_glucose_level is None or not isinstance(avg_glucose_level, (int, float)) or avg_glucose_level < 30 or avg_glucose_level > 500:
        errors.append('Average glucose level must be between 30 and 500 mg/dL')
    
    bmi = data.get('bmi')
    if bmi is None or not isinstance(bmi, (int, float)) or bmi < 10 or bmi > 70:
        errors.append('BMI must be between 10 and 70')
    
    smoking_status = data.get('smoking_status')
    if smoking_status is None or smoking_status not in [0, 1, 2, 3]:
        errors.append('Smoking status must be 0, 1, 2, or 3')
    
    return errors

@app.route('/predict', methods=['POST'])
def predict():
    """Predict stroke risk based on input data."""
    try:
        # Get JSON data
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No input data provided'}), 400
        
        # Validate input
        errors = validate_input(data)
        if errors:
            return jsonify({'errors': errors}), 400
        
        # Preprocess input
        processed_data = preprocess_input(data)
        
        # Make prediction
        if model is not None:
            try:
                prediction = model.predict([list(processed_data.values())])[0]
                # Map prediction to risk level
                if prediction == 0:
                    risk_level = 'Low Risk'
                elif prediction == 1:
                    risk_level = 'Moderate Risk'
                else:
                    risk_level = 'High Risk'
            except Exception as e:
                print(f"Model prediction error: {e}. Using fallback.")
                risk_level = fallback_predict(processed_data)
        else:
            risk_level = fallback_predict(processed_data)
        
        # Get recommendation
        recommendation = get_recommendation(risk_level)
        
        return jsonify({
            'prediction': risk_level,
            'recommendation': recommendation
        }), 200
    
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None
    }), 200

if __name__ == '__main__':
    print("Starting Flask server on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=True)
