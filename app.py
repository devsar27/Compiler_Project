from flask import Flask, request, jsonify, render_template
import os
import requests
import time
import traceback
import hashlib
from Code_Executor import CodeExecutor  # Import CodeExecutor from its module
from Language_detection import detect_language  # Import detect_language function from its m
app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')
 
@app.route('/detect_language', methods=['POST'])
def detect_language_endpoint():
    try:
        data = request.get_json()
        code = data.get('code', '')
       
        if not code:
            return jsonify({"error": "No code provided"}), 400
       
        language = detect_language(code)
       
        return jsonify({
            "detected_language": language
        })
   
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500
 
@app.route('/execute', methods=['POST'])
def execute_endpoint():
    try:
        data = request.get_json()
        code = data.get('code', '')
        language = data.get('language', '')
        user_input = data.get('input', '')
        
        if not code:
            return jsonify({"error": "No code provided"}), 400
        
        if not language:
            return jsonify({"error": "No language specified"}), 400
        
        if language == "Python" and "input(" in code:
            code = "import sys\n" + code if "import sys" not in code else code
        elif language == "C++" and ("cin" in code or "scanf" in code):
            timeout_value = 15
        
       
        executor = CodeExecutor()
        result = executor.execute_code(code, language, user_input)
        
        return jsonify(result)
    
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500
 
@app.route('/detect_and_execute', methods=['POST'])
def detect_and_execute():
    try:
        data = request.get_json()
        code = data.get('code', '')
        user_input = data.get('input', '')  
       
        if not code:
            return jsonify({"error": "No code provided"}), 400
       
        # Detect language
        language = detect_language(code)
       
        if language == "Unknown":
            return jsonify({"error": "Could not detect language"}), 400
       
        # Execute code
        executor = CodeExecutor()
        result = executor.execute_code(code, language, user_input)  # Pass user input to execution
       
        # Add language info to result
        result["language"] = language
       
        return jsonify(result)
   
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500
 
# For dynamic code execution with input support
executions = {}  # Store running executions
 
@app.route('/start_execution', methods=['POST'])
def start_execution():
    try:
        data = request.get_json()
        code = data.get('code', '')
        language = data.get('language', '')
       
        if not code:
            return jsonify({"error": "No code provided"}), 400
       
        if not language:
            language = detect_language(code)
       
        # Generate a unique execution ID
        import uuid
        execution_id = str(uuid.uuid4())
       
        # Store initial execution state
        executions[execution_id] = {
            'code': code,
            'language': language,
            'status': 'running',
            'output': '',
            'input_requests': [],
            'inputs_provided': []
        }
       
        # Return the execution ID immediately
        return jsonify({
            'execution_id': execution_id,
            'status': 'running'
        })
       
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500
 
@app.route('/poll_execution/<execution_id>', methods=['GET'])
def poll_execution(execution_id):
    if execution_id not in executions:
        return jsonify({"error": "Invalid execution ID"}), 404
   
    execution = executions[execution_id]
   
    # Check if execution needs input
    if execution['status'] == 'waiting_for_input':
        return jsonify({
            'status': 'waiting_for_input',
            'new_output': execution.get('last_output', '')
        })
   
    # If we're still in running status, execute the code
    if execution['status'] == 'running' and not execution.get('started', False):
        execution['started'] = True
       
        # Process the code to detect input requirements
        code = execution['code']
        language = execution['language']
       
   
    # Return current state
    return jsonify({
        'status': execution['status'],
        'new_output': execution.get('last_output', ''),
        'execution_time': execution.get('execution_time', '-'),
        'memory': execution.get('memory', '-')
    })
 
 
if __name__ == '__main__':
    # Check for environment variables
    if not os.environ.get("JUDGE0_API_KEY") and not os.environ.get("JDOODLE_CLIENT_ID"):
        print("WARNING: API keys not set in environment variables. Using placeholder values.")
   
    app.run(host='0.0.0.0', port=5000, debug=True)