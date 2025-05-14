import os
import requests
import time
import hashlib

class CodeExecutor:
    def __init__(self):
        # Get API keys from environment variables
        self.JUDGE0_API_KEY = os.environ.get("JUDGE0_API_KEY", "your_judge0_api_key_here")
        self.JDOODLE_CLIENT_ID = os.environ.get("JDOODLE_CLIENT_ID", "your_jdoodle_client_id_here")
        self.JDOODLE_CLIENT_SECRET = os.environ.get("JDOODLE_CLIENT_SECRET", "your_jdoodle_client_secret_here")
       
        # API endpoints
        self.JUDGE0_API_URL = "https://judge0-ce.p.rapidapi.com/submissions"
        self.JDOODLE_API_URL = "https://api.jdoodle.com/v1/execute"
       
        # Headers for Judge0
        self.judge0_headers = {
            "X-RapidAPI-Key": self.JUDGE0_API_KEY,
            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
            "Content-Type": "application/json"
        }
       
        # Language mappings for different APIs
        self.judge0_language_map = {
            "Python": 71,
            "C++": 54,
            "Java": 62,
            "JavaScript": 63,
            "C": 50
        }
       
        self.jdoodle_language_map = {
            "Python": "python3",
            "C++": "cpp17",
            "Java": "java",
            "JavaScript": "nodejs"
        }
       
        # Simple in-memory cache
        self.cache = {}
       
        # Configuration
        self.MAX_CODE_SIZE = 10000  # 10KB code size limit
        self.MAX_EXECUTION_TIME = 5  # 5 seconds timeout
   
    def execute_code(self, code, language, user_input=""):
        """Execute code in the detected language with optional user input."""
        # Check code size
        if len(code) > self.MAX_CODE_SIZE:
            return {
                "output": "",
                "error": "Code size exceeds the maximum allowed limit (10KB)",
                "execution_time": "-",
                "status": "error"
            }
        
        # Increase execution time limit for C++ programs
        if language == "C++":
            self.MAX_EXECUTION_TIME = 15  # Increase timeout for C++
        else:
            self.MAX_EXECUTION_TIME = 5  # Default for other languages
        
        # Create a cache key based on language, code hash, and input hash
        input_hash = hashlib.md5(user_input.encode()).hexdigest()
        cache_key = f"{language}:{hashlib.md5(code.encode()).hexdigest()}:{input_hash}"
        
        # Check if result is in cache
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # Handle SQL differently
        if language == "SQL":
            result = self.execute_sql(code)
        else:
            # Try JDoodle first (more free credits per day)
            result = self.execute_with_jdoodle(code, language, user_input)
            
            # Fall back to Judge0 if JDoodle fails
            if result.get("status") == "error" and "API" in result.get("error", ""):
                result = self.execute_with_judge0(code, language, user_input)
        
        # Cache successful results
        if result.get("status") != "error":
            self.cache[cache_key] = result
            
        return result

    def execute_with_judge0(self, code, language, user_input=""):
        """Execute code using Judge0 API with optional user input."""
        language_id = self.judge0_language_map.get(language)
       
        if not language_id:
            return {
                "output": "",
                "error": f"Language '{language}' not supported by Judge0",
                "execution_time": "-",
                "status": "error"
            }
       
        # Request payload
        payload = {
            "source_code": code,
            "language_id": language_id,
            "stdin": user_input,
            "redirect_stderr_to_stdout": True
        }
       
        try:
            # Submit code
            response = requests.post(
                self.JUDGE0_API_URL,
                headers=self.judge0_headers,
                json=payload,
                timeout=10
            )
           
            if response.status_code != 201:
                return {
                    "output": "",
                    "error": f"Judge0 API error: {response.text}",
                    "execution_time": "-",
                    "status": "error"
                }
           
            # Get token for checking results
            submission_token = response.json().get("token")
           
            # Poll for results
            result_url = f"{self.JUDGE0_API_URL}/{submission_token}"
            start_time = time.time()
           
            while time.time() - start_time < self.MAX_EXECUTION_TIME:
                result_response = requests.get(
                    result_url,
                    headers=self.judge0_headers,
                    timeout=10
                )
               
                result_data = result_response.json()
                status_id = result_data.get("status", {}).get("id")
               
                # If execution is complete
                if status_id in [3, 4, 5]:  # 3=success, 4=error, 5=timeout
                    # Safely handle potentially None values
                    stdout = result_data.get("stdout") or ""
                    stderr = result_data.get("stderr") or ""
                    return {
                        "output": stdout.strip(),
                        "error": stderr.strip(),
                        "execution_time": f"{result_data.get('time', '-')}s",
                        "memory": f"{result_data.get('memory', '-')} KB",
                        "status": result_data.get("status", {}).get("description", "Unknown")
                    }
               
                time.sleep(0.5)
           
            return {
                "output": "",
                "error": "Execution timed out",
                "execution_time": f">={self.MAX_EXECUTION_TIME}s",
                "status": "error"
            }
           
        except Exception as e:
            return {
                "output": "",
                "error": f"Error connecting to Judge0: {str(e)}",
                "execution_time": "-",
                "status": "error"
            }
   
    def execute_with_jdoodle(self, code, language, user_input=""):
        """Execute code using JDoodle API with optional user input."""
        language_code = self.jdoodle_language_map.get(language)
       
        if not language_code:
            return {
                "output": "",
                "error": f"Language '{language}' not supported by JDoodle",
                "execution_time": "-",
                "status": "error"
            }
       
        payload = {
            "clientId": self.JDOODLE_CLIENT_ID,
            "clientSecret": self.JDOODLE_CLIENT_SECRET,
            "script": code,
            "language": language_code,
            "versionIndex": "0",
            "stdin": user_input
        }
       
        try:
            response = requests.post(
                self.JDOODLE_API_URL,
                json=payload,
                timeout=10
            )
           
            if response.status_code != 200:
                return {
                    "output": "",
                    "error": f"JDoodle API error: {response.text}",
                    "execution_time": "-",
                    "status": "error"
                }
           
            result = response.json()
           
            return {
                "output": result.get("output", "").strip(),
                "error": "",
                "execution_time": f"{result.get('cpuTime')}s",
                "memory": f"{result.get('memory')} KB",
                "status": "success"
            }
           
        except Exception as e:
            return {
                "output": "",
                "error": f"Error connecting to JDoodle: {str(e)}",
                "execution_time": "-",
                "status": "error"
            }
   
    def execute_sql(self, sql_code):
        """Execute SQL code using SQLite."""
        try:
            import sqlite3
           
            # Create an in-memory database
            conn = sqlite3.connect(':memory:')
            cursor = conn.cursor()
           
            # Execute SQL statements
            start_time = time.time()
            results = []
            error = None
           
            for statement in sql_code.split(';'):
                if statement.strip():
                    try:
                        cursor.execute(statement)
                        if cursor.description:  # If this was a SELECT statement
                            columns = [desc[0] for desc in cursor.description]
                            rows = cursor.fetchall()
                            results.append({
                                "statement": statement,
                                "columns": columns,
                                "rows": rows
                            })
                    except sqlite3.Error as e:
                        error = str(e)
                        break
           
            execution_time = time.time() - start_time
            conn.close()
           
            if error:
                return {
                    "output": "",
                    "error": f"SQL error: {error}",
                    "execution_time": f"{execution_time:.3f}s",
                    "status": "error"
                }
           
            # Format SQL results as a readable string
            output = []
            for result in results:
                if not result["columns"]:
                    output.append("Statement executed successfully.")
                    continue
               
                # Add column headers
                output.append(" | ".join(result["columns"]))
                output.append("-" * (sum(len(col) for col in result["columns"]) + 3 * (len(result["columns"]) - 1)))
               
                # Add rows
                for row in result["rows"]:
                    output.append(" | ".join(str(cell) for cell in row))
               
                # Add separator between results
                if result != results[-1]:
                    output.append("\n")
           
            return {
                "output": "\n".join(output),
                "error": "",
                "execution_time": f"{execution_time:.3f}s",
                "status": "success"
            }
           
        except Exception as e:
            return {
                "output": "",
                "error": f"Error executing SQL: {str(e)}",
                "execution_time": "-",
                "status": "error"
            }