async function executeCode() {
    if (executionInProgress) {
        showError("Code execution already in progress");
        return;
    }
 
    const code = editor.getValue();
    if (!code.trim()) {
        showError("Please enter some code first");
        return;
    }
 
    if (!detectedLanguage) {
        showError("Please detect language first");
        return;
    }
 
    executionInProgress = true;
    document.getElementById("executeBtn").disabled = true;
 
    try {
        const apiKey = "0d145459famshf8b42e8969ce175p1da05djsn62def07da17a"; 
        const apiUrl = "https://api.jdoodle.com/v1/execute";
 
        const languageMap = {
            "Python": "python3",
            "C++": "cpp17",
            "Java": "java",
            "JavaScript": "nodejs",
            "HTML": "html"
        };
 
        const mappedLanguage = languageMap[detectedLanguage] || "text";
 
        // Use the client ID from environment variables
        const requestData = {
            clientId: "49038709dbe43079a2cf0bdd7e51508c", // Updated with actual client ID
            clientSecret: "84020f902959a829134e564df9a6c2cbe4d5741309eee5a0085f536972fb3d29", // Updated with actual client secret
            script: code,
            language: mappedLanguage,
            versionIndex: "0"
        };
 
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestData)
        });
 
        const data = await response.json();
 
        document.getElementById("resultContainer").style.display = "block";
 
        // Display output
        const outputHtml = data.error ?
            `<div class="error-output">${data.error}</div>` :
            `<div class="success-output">${data.output || "No output"}</div>`;
 
        document.getElementById("executionOutput").innerHTML = outputHtml;
 
    } catch (error) {
        showError("Error executing code: " + error.message);
    } finally {
        executionInProgress = false;
        document.getElementById("executeBtn").disabled = false;
    }
}
    // Initialize Lucide icons
    lucide.createIcons();
    
    // Initialize CodeMirror
    const editor = CodeMirror.fromTextArea(document.getElementById("codeEditor"), {
        lineNumbers: true,
        mode: "python",
        theme: "default",
        indentUnit: 4,
        indentWithTabs: false,
        smartIndent: true,
        lineWrapping: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        styleActiveLine: true
    });
    
    // Set initial empty editor
    editor.setValue("");
    
    // Variables
    let detectedLanguage = null;
    let isLoading = false;
    let executionId = null;
    let awaitingInput = false;
    const interactiveTerminal = document.createElement('div');
    interactiveTerminal.className = 'bg-cyber-dark-950 border border-blue-900/30 p-3 rounded-md font-mono text-sm whitespace-pre-wrap text-green-400 min-h-[150px] max-h-[300px] overflow-y-auto';
    interactiveTerminal.id = 'interactiveTerminal';
    
    // DOM Elements
    const detectBtn = document.getElementById('detectBtn');
    const runBtn = document.getElementById('runBtn');
    const detectAndRunBtn = document.getElementById('detectAndRunBtn');
    const timeComplexityBtn = document.getElementById('timeComplexityBtn');
    const spaceComplexityBtn = document.getElementById('spaceComplexityBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultsContainer = document.getElementById('resultsContainer');
    const languageSection = document.getElementById('languageSection');
    const detectedLanguageEl = document.getElementById('detectedLanguage');
    const outputSection = document.getElementById('outputSection');
    const executionOutput = document.getElementById('executionOutput');
    const executionStats = document.getElementById('executionStats');
    const executionTime = document.getElementById('executionTime');
    const executionMemory = document.getElementById('executionMemory');
    const executionStatus = document.getElementById('executionStatus');
    
    // Tab elements
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const outputTab = document.getElementById('outputTab');
    const timeComplexityTab = document.getElementById('timeComplexityTab');
    const spaceComplexityTab = document.getElementById('spaceComplexityTab');
    
    // Functions
    function showLoading(show) {
        isLoading = show;
        loadingIndicator.classList.toggle('hidden', !show);
        detectBtn.disabled = show;
        runBtn.disabled = show || !detectedLanguage;
        detectAndRunBtn.disabled = show;
    }
    
    function showTab(tabId) {
        // Remove active class from all tabs and contents
        tabButtons.forEach(button => {
            button.classList.remove('active');
            button.classList.remove('bg-deep-blue-800');
            button.classList.remove('border-b-2');
            button.classList.remove('border-blue-500');
        });
        
        tabContents.forEach(content => {
            content.classList.remove('active');
        });
        
        // Add active class to selected tab and content
        const selectedTab = document.querySelector(`[data-tab="${tabId}"]`);
        const selectedContent = document.getElementById(tabId);
        
        if (selectedTab && selectedContent) {
            selectedTab.classList.add('active');
            selectedTab.classList.add('bg-deep-blue-800');
            selectedTab.classList.add('border-b-2');
            selectedTab.classList.add('border-blue-500');
            selectedContent.classList.add('active');
        }
    }
    
    function detectLanguage() {
        if (isLoading) return;
        
        const code = editor.getValue();
        if (!code.trim()) {
            alert('Please enter some code first');
            return;
        }
        
        showLoading(true);
        
        // Make actual API call to your detect_language endpoint
        fetch('/detect_language', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: code })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
                return;
            }
            
            detectedLanguage = data.detected_language;
            detectedLanguageEl.textContent = detectedLanguage;
            languageSection.classList.remove('hidden');
            resultsContainer.classList.remove('hidden');
            runBtn.disabled = false;
            
            // Set editor mode based on detected language
            setEditorMode(detectedLanguage);
        })
        .catch(error => {
            alert('Error detecting language: ' + error.message);
        })
        .finally(() => {
            showLoading(false);
        });
    }
    
    function executeCode() {
        if (isLoading) return;
        
        const code = editor.getValue();
        if (!code.trim()) {
            alert('Please enter some code first');
            return;
        }
        
        const language = detectedLanguage || "";
        
        showLoading(true);
        awaitingInput = false;
        executionId = null;
        
        // Replace the current execution output with our interactive terminal
        executionOutput.innerHTML = '';
        executionOutput.appendChild(interactiveTerminal);
        interactiveTerminal.innerHTML = '';
        
        // Start execution process
        testForInputRequirements();
        fetch('/start_execution', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code: code,
                language: language
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                updateTerminal(data.error, true);
                showLoading(false);
            } else {
                executionId = data.execution_id;
                setTimeout(pollExecution, 500);
            }
            
            outputSection.classList.remove('hidden');
            resultsContainer.classList.remove('hidden');
        })
        .catch(error => {
            updateTerminal('Error executing code: ' + error.message, true);
            showLoading(false);
        });
    }
    function handleInput(event) {
        if (event.target.id === 'codeInput' && event.key === 'Enter' && awaitingInput) {
            event.preventDefault();
            const userInput = event.target.value;
            
            // Replace input element with static text
            const inputLine = event.target.parentNode;
            inputLine.remove();
            updateTerminal(`> ${userInput}`);
            
            // Send input to the server
            sendInput(userInput);
            awaitingInput = false;
        }
    }
    
    function pollExecution() {
        if (!executionId) return;
        
        fetch(`/poll_execution/${executionId}`)
        .then(response => response.json())
        .then(data => {
            // If there's new output, display it
            if (data.new_output) {
                updateTerminal(data.new_output);
                
                // Check if output contains common input prompts
                const inputIndicators = ['input', 'enter', 'Enter', 'Input', '?', ':'];
                const needsInput = inputIndicators.some(indicator => 
                    data.new_output.includes(indicator) && 
                    data.new_output.trim().endsWith(data.new_output.trim().split(indicator).pop())
                );
                
                if (needsInput && !awaitingInput) {
                    awaitingInput = true;
                    activateInputMode();
                }
            }
            
            // If waiting for input, show input prompt
            if (data.status === 'waiting_for_input' && !awaitingInput) {
                awaitingInput = true;
                activateInputMode();
            }
            
            // If execution still in progress, continue polling
            if (data.status !== 'completed' && data.status !== 'waiting_for_input') {
                setTimeout(pollExecution, 500);
            } else if (data.status === 'completed') {
                // Update stats once completed
                if (data.execution_time) {
                    executionTime.textContent = data.execution_time;
                    executionMemory.textContent = data.memory || "N/A";
                    executionStatus.textContent = data.status || "Completed";
                    executionStats.classList.remove('hidden');
                }
                showLoading(false);
            }
        })
        .catch(error => {
            updateTerminal('Error polling execution: ' + error.message, true);
            showLoading(false);
        });
    }
    
    
    
    function detectAndExecute() {
        if (isLoading) return;
        
        const code = editor.getValue();
        if (!code.trim()) {
            alert('Please enter some code first');
            return;
        }
        
        showLoading(true);
        
        // Make actual API call to your detect_and_execute endpoint
        fetch('/detect_and_execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: code })
        })
        .then(response => response.json())
        .then(data => {
            if (data.language) {
                detectedLanguage = data.language;
                detectedLanguageEl.textContent = detectedLanguage;
                languageSection.classList.remove('hidden');
                runBtn.disabled = false;
                
                // Set editor mode based on detected language
                setEditorMode(detectedLanguage);
            }
            
            if (data.error) {
                executionOutput.textContent = data.error;
                executionOutput.classList.add('text-red-400');
                executionOutput.classList.remove('text-green-400');
            } else {
                executionOutput.textContent = data.output || "Code executed successfully with no output";
                executionOutput.classList.add('text-green-400');
                executionOutput.classList.remove('text-red-400');
                
                if (data.execution_time) {
                    executionTime.textContent = data.execution_time;
                    executionMemory.textContent = data.memory || "N/A";
                    executionStatus.textContent = data.status || "Completed";
                    executionStats.classList.remove('hidden');
                }
            }
            
            outputSection.classList.remove('hidden');
            resultsContainer.classList.remove('hidden');
        })
        .catch(error => {
            alert('Error executing code: ' + error.message);
        })
        .finally(() => {
            showLoading(false);
        });
    }
    
    function setEditorMode(language) {
        let mode = "text/plain";
        
        switch(language) {
            case "Python":
                mode = "text/x-python";
                break;
            case "C++":
            case "C":
                mode = "text/x-c++src";
                break;
            case "Java":
                mode = "text/x-java";
                break;
            case "JavaScript":
                mode = "text/javascript";
                break;
            case "HTML":
                mode = "text/html";
                break;
            case "SQL":
                mode = "text/x-sql";
                break;
        }
        
        editor.setOption("mode", mode);
    }
    
    function analyzeTimeComplexity() {
        resultsContainer.classList.remove('hidden');
        showTab('timeComplexityContent');
        
        const code = editor.getValue();
        if (code.trim()) {
            // In a real implementation, you would call your API to analyze time complexity
            // For now, we'll just show a placeholder
            document.getElementById('timeComplexityValue').textContent = "O(n)";
            document.getElementById('timeComplexityExplanation').textContent =
                "Based on the code analysis, the algorithm appears to have linear time complexity.";
            document.getElementById('timeComplexityTips').textContent =
                "Consider using memoization or dynamic programming techniques to optimize recursive calls.";
        }
    }
    
    function analyzeSpaceComplexity() {
        resultsContainer.classList.remove('hidden');
        showTab('spaceComplexityContent');
        
        const code = editor.getValue();
        if (code.trim()) {
            // In a real implementation, you would call your API to analyze space complexity
            // For now, we'll just show a placeholder
            document.getElementById('spaceComplexityValue').textContent = "O(n)";
            document.getElementById('spaceComplexityExplanation').textContent =
                "Based on the code analysis, the algorithm appears to use linear space.";
            document.getElementById('spaceComplexityTips').textContent =
                "Consider using an iterative approach instead of recursion to reduce stack space usage.";
        }
    }
    

    // Event Listeners
    detectBtn.addEventListener('click', detectLanguage);
    runBtn.addEventListener('click', executeCode);
    detectAndRunBtn.addEventListener('click', detectAndExecute);
    
    timeComplexityBtn.addEventListener('click', analyzeTimeComplexity);
    spaceComplexityBtn.addEventListener('click', analyzeSpaceComplexity);
    
    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            showTab(tabId);
        });
    });
    
    // Initialize editor size after a short delay to ensure proper rendering
    setTimeout(() => {
        editor.refresh();
    }, 100);
    
    // Add this line to your existing event listeners
    document.addEventListener('keydown', handleInput);


// Add event listeners for the delete and copy buttons
const clearEditorBtn = document.getElementById("clearEditorBtn")
const copyEditorBtn = document.getElementById("copyEditorBtn")

// Clear editor button functionality
clearEditorBtn.addEventListener("click", () => {
  editor.setValue("") // Clear the CodeMirror editor
})

// Copy editor button functionality
copyEditorBtn.addEventListener("click", () => {
  const code = editor.getValue() // Get the code from CodeMirror

  // Copy to clipboard
  navigator.clipboard
    .writeText(code)
    .then(() => {
      // Show feedback that the code was copied
      const originalIcon = copyEditorBtn.innerHTML
      copyEditorBtn.innerHTML = '<i data-lucide="check" class="h-4 w-4"></i>'
      lucide.createIcons({
        icons: {
          check: copyEditorBtn.querySelector('[data-lucide="check"]'),
        },
      })

      // Reset the button icon after 1 seconds
      setTimeout(() => {
        copyEditorBtn.innerHTML = originalIcon
        lucide.createIcons({
          icons: {
            "clipboard-copy": copyEditorBtn.querySelector('[data-lucide="clipboard-copy"]'),
          },
        })
      }, 1000)
    })
    .catch((err) => {
      console.error("Failed to copy text: ", err)
      alert("Failed to copy code to clipboard")
    })
})

