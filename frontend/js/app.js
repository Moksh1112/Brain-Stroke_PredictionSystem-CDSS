// State Management
const state = {
    isLoading: false,
    result: null,
    errors: {}
};

// API Configuration
const API_URL = "http://localhost:5000";

// DOM Elements
const elements = {
    mobileNav: document.getElementById('mobileNav'),
    mobileMenuBtn: document.querySelector('.mobile-menu-btn'),
    menuIcon: document.querySelector('.menu-icon'),
    closeIcon: document.querySelector('.close-icon'),
    predictionForm: document.getElementById('predictionForm'),
    submitBtn: document.getElementById('submitBtn'),
    resultPlaceholder: document.getElementById('resultPlaceholder'),
    resultCard: document.getElementById('resultCard'),
    riskDisplay: document.getElementById('riskDisplay'),
    confidenceDisplay: document.getElementById('confidenceDisplay'),
    confidenceValue: document.getElementById('confidenceValue'),
    confidenceFill: document.getElementById('confidenceFill'),
    recommendationText: document.getElementById('recommendationText')
};

// Mobile Menu Toggle
function toggleMobileMenu() {
    const isActive = elements.mobileNav.classList.toggle('active');
    elements.mobileNav.style.display = isActive ? 'flex' : 'none';
    
    if (isActive) {
        elements.menuIcon.style.display = 'none';
        elements.closeIcon.style.display = 'block';
    } else {
        elements.menuIcon.style.display = 'block';
        elements.closeIcon.style.display = 'none';
    }
}

// Smooth Scroll to Section
function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Close mobile menu if open
    if (elements.mobileNav.classList.contains('active')) {
        toggleMobileMenu();
    }
}

// Form Field References
function getFormFields() {
    return {
        age: document.getElementById('age'),
        gender: document.getElementById('gender'),
        hypertension: document.getElementById('hypertension'),
        heartDisease: document.getElementById('heartDisease'),
        glucose: document.getElementById('glucose'),
        bmi: document.getElementById('bmi'),
        smoking: document.getElementById('smoking')
    };
}

// Validation
function validate() {
    const fields = getFormFields();
    const newErrors = {};
    
    // Age validation
    const age = fields.age.value;
    if (!age || isNaN(Number(age)) || Number(age) < 1 || Number(age) > 120) {
        newErrors.age = 'Enter a valid age (1-120)';
    }
    
    // Gender validation
    if (!fields.gender.value) {
        newErrors.gender = 'Select a gender';
    }
    
    // Hypertension validation
    if (!fields.hypertension.value) {
        newErrors.hypertension = 'Select an option';
    }
    
    // Heart Disease validation
    if (!fields.heartDisease.value) {
        newErrors.heartDisease = 'Select an option';
    }
    
    // Glucose validation
    const glucose = fields.glucose.value;
    if (!glucose || isNaN(Number(glucose)) || Number(glucose) < 30 || Number(glucose) > 500) {
        newErrors.glucose = 'Enter a valid glucose level (30-500 mg/dL)';
    }
    
    // BMI validation
    const bmi = fields.bmi.value;
    if (!bmi || isNaN(Number(bmi)) || Number(bmi) < 10 || Number(bmi) > 70) {
        newErrors.bmi = 'Enter a valid BMI (10-70)';
    }
    
    // Smoking status validation
    if (!fields.smoking.value) {
        newErrors.smoking = 'Select a smoking status';
    }
    
    state.errors = newErrors;
    displayErrors();
    
    return Object.keys(newErrors).length === 0;
}

// Display Errors
function displayErrors() {
    const fields = getFormFields();
    
    // Clear all previous errors
    Object.keys(fields).forEach(key => {
        const errorEl = document.getElementById(`${key === 'heartDisease' ? 'heartDisease' : key}-error`);
        if (errorEl) {
            errorEl.textContent = state.errors[key] || '';
        }
        
        // Update aria-invalid
        if (fields[key]) {
            fields[key].setAttribute('aria-invalid', !!state.errors[key]);
        }
    });
    
    // Enable/disable submit button based on form validity
    updateSubmitButton();
}

// Update Submit Button State
function updateSubmitButton() {
    const fields = getFormFields();
    const isValid = fields.age.value && fields.gender.value && 
                   fields.hypertension.value && fields.heartDisease.value &&
                   fields.glucose.value && fields.bmi.value && fields.smoking.value;
    
    elements.submitBtn.disabled = !isValid || state.isLoading;
}

// API Call to Flask Backend
async function predictStrokeRisk(data) {
    // Convert form values to API format
    const genderMap = { male: 0, female: 1, other: 2 };
    const smokingMap = { 
        never_smoked: 0, 
        formerly_smoked: 1, 
        smokes: 2, 
        unknown: 3 
    };

    const apiData = {
        age: data.age,
        gender: genderMap[data.gender] ?? 0,
        hypertension: data.hypertension === "yes" ? 1 : 0,
        heart_disease: data.heartDisease === "yes" ? 1 : 0,
        avg_glucose_level: data.glucoseLevel,
        bmi: data.bmi,
        smoking_status: smokingMap[data.smokingStatus] ?? 0
    };

    try {
        const response = await fetch(`${API_URL}/predict`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(apiData),
        });

        if (!response.ok) {
            throw new Error("API request failed");
        }

        const result = await response.json();
        
        // Convert API response to frontend format
        const riskLevelMap = {
            "Low Risk": "low",
            "Moderate Risk": "moderate",
            "High Risk": "high"
        };

        return {
            riskLevel: riskLevelMap[result.prediction] ?? "low",
            message: result.recommendation,
            confidence: result.confidence || 0.85
        };
    } catch (error) {
        console.error("API call failed, using local prediction:", error);
        // Fallback to local prediction
        return predictStrokeRiskLocal(data);
    }
}

// Local Fallback Prediction (same logic as Flask fallback)
function predictStrokeRiskLocal(data) {
    let score = 0;

    // Age factor
    if (data.age >= 65) score += 3;
    else if (data.age >= 50) score += 2;
    else if (data.age >= 40) score += 1;

    // Hypertension
    if (data.hypertension === "yes") score += 2;

    // Heart disease
    if (data.heartDisease === "yes") score += 2;

    // Glucose level
    if (data.glucoseLevel >= 200) score += 3;
    else if (data.glucoseLevel >= 140) score += 2;
    else if (data.glucoseLevel >= 100) score += 1;

    // BMI
    if (data.bmi >= 35) score += 2;
    else if (data.bmi >= 30) score += 1;

    // Smoking
    if (data.smokingStatus === "smokes") score += 2;
    else if (data.smokingStatus === "formerly_smoked") score += 1;

    if (score >= 8) {
        return {
            riskLevel: "high",
            message: "High stroke risk detected. Immediate medical consultation is strongly recommended. Please consult with a neurologist for comprehensive evaluation, including imaging and detailed risk factor management.",
            confidence: 0.92
        };
    } else if (score >= 4) {
        return {
            riskLevel: "moderate",
            message: "Moderate stroke risk identified. Lifestyle modifications and regular monitoring are advised. Consider scheduling a follow-up with your healthcare provider to discuss preventive measures.",
            confidence: 0.78
        };
    } else {
        return {
            riskLevel: "low",
            message: "Low stroke risk based on current parameters. Continue maintaining a healthy lifestyle with regular exercise, balanced diet, and routine health check-ups.",
            confidence: 0.95
        };
    }
}

// Handle Form Submit
async function handleSubmit(event) {
    event.preventDefault();
    
    if (!validate()) return;
    
    const fields = getFormFields();
    const formData = {
        age: Number(fields.age.value),
        gender: fields.gender.value,
        hypertension: fields.hypertension.value,
        heartDisease: fields.heartDisease.value,
        glucoseLevel: Number(fields.glucose.value),
        bmi: Number(fields.bmi.value),
        smokingStatus: fields.smoking.value
    };
    
    setLoading(true);
    
    try {
        const prediction = await predictStrokeRisk(formData);
        displayResult(prediction);
    } catch (error) {
        console.error("Prediction failed:", error);
    } finally {
        setLoading(false);
    }
}

// Set Loading State
function setLoading(isLoading) {
    state.isLoading = isLoading;
    
    const btnContent = elements.submitBtn.querySelector('.btn-content');
    const btnLoading = elements.submitBtn.querySelector('.btn-loading');
    
    if (isLoading) {
        btnContent.style.display = 'none';
        btnLoading.style.display = 'inline-flex';
        elements.submitBtn.disabled = true;
    } else {
        btnContent.style.display = 'inline-flex';
        btnLoading.style.display = 'none';
        updateSubmitButton();
    }
}

// Display Result
function displayResult(result) {
    state.result = result;
    
    // Hide placeholder, show result card
    elements.resultPlaceholder.style.display = 'none';
    elements.resultCard.style.display = 'block';
    
    // Risk level configurations
    const config = {
        low: {
            label: "Low Risk",
            class: "risk-low",
            glowClass: "risk-low-glow",
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
        },
        moderate: {
            label: "Moderate Risk",
            class: "risk-moderate",
            glowClass: "risk-moderate-glow",
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
        },
        high: {
            label: "High Risk",
            class: "risk-high",
            glowClass: "risk-high-glow",
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
        }
    };
    
    const level = result.riskLevel || 'low';
    const c = config[level];
    
    // Update risk display
    elements.riskDisplay.className = `result-risk-display ${c.class}`;
    elements.riskDisplay.innerHTML = `
        <div class="risk-icon">${c.icon}</div>
        <div class="risk-text">
            <p>${c.label}</p>
            <p>Stroke Risk Level</p>
        </div>
    `;
    
    // Update glow effect
    elements.riskDisplay.classList.add(c.glowClass);
    
    // Show confidence if available
    if (result.confidence) {
        elements.confidenceDisplay.style.display = 'block';
        const confidencePercent = Math.round(result.confidence * 100);
        elements.confidenceValue.textContent = `${confidencePercent}%`;
        elements.confidenceFill.style.width = `${confidencePercent}%`;
    } else {
        elements.confidenceDisplay.style.display = 'none';
    }
    
    // Update recommendation
    elements.recommendationText.textContent = result.message;
    
    // Scroll to result
    elements.resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Handle Form Reset
function handleReset() {
    const fields = getFormFields();
    
    // Reset form fields
    fields.age.value = '';
    fields.gender.value = '';
    fields.hypertension.value = '';
    fields.heartDisease.value = '';
    fields.glucose.value = '';
    fields.bmi.value = '';
    fields.smoking.value = '';
    
    // Reset state
    state.result = null;
    state.errors = {};
    
    // Reset display
    displayErrors();
    
    // Show placeholder, hide result card
    elements.resultPlaceholder.style.display = 'flex';
    elements.resultCard.style.display = 'none';
}

// Add Event Listeners for Input Changes
function setupInputListeners() {
    const fields = getFormFields();
    
    Object.values(fields).forEach(field => {
        field.addEventListener('change', () => {
            validate();
        });
        
        field.addEventListener('input', () => {
            // Clear error on input
            const fieldId = field.id === 'heartDisease' ? 'heartDisease' : field.id;
            const errorEl = document.getElementById(`${fieldId}-error`);
            if (errorEl && state.errors[fieldId]) {
                delete state.errors[fieldId];
                errorEl.textContent = '';
                field.setAttribute('aria-invalid', 'false');
            }
            updateSubmitButton();
        });
    });
}

// Initialize
function init() {
    // Setup input listeners
    setupInputListeners();
    
    // Initial button state
    updateSubmitButton();
    
    console.log('Stroke Prediction CDSS initialized');
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
