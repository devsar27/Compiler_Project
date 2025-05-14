// Global variables for tracking input state
let currentExecution = null;
let pendingInputs = [];
let inputHistory = [];

// Initialize input handling
function initInputHandler() {
    const submitInputBtn = document.getElementById('submitInputBtn');
    const userInputField = document.getElementById('userInputField');
    
    // Handle submit button click
    submitInputBtn.addEventListener('click', () => {
        submitUserInput();
    });
    
    // Handle Enter key press in input field
    userInputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitUserInput();
        }
    });
}

// Function to show input section when needed
function showInputPrompt() {
    const inputSection = document.getElementById('inputSection');
    const userInputField = document.getElementById('userInputField');
    
    inputSection.classList.remove('hidden');
    userInputField.focus();
}

// Function to hide input section
function hideInputPrompt() {
    const inputSection = document.getElementById('inputSection');
    inputSection.classList.add('hidden');
}

// Function to submit user input
function submitUserInput() {
    const userInputField = document.getElementById('userInputField');
    const previousInputs = document.getElementById('previousInputs');
    const input = userInputField.value.trim();
    
    if (input === '') return;
    
    // Add to input history
    inputHistory.push(input);
    
    // Display in previous inputs
    const inputElement = document.createElement('div');
    inputElement.className = 'py-1';
    inputElement.innerHTML = `<span class="text-yellow-500">></span> ${input}`;
    previousInputs.appendChild(inputElement);
    
    // Clear input field
    userInputField.value = '';
    
    // Send the input to the server
    if (currentExecution) {
        sendInputToServer(currentExecution, input);
    } else {
        // Store for later if we're collecting inputs before execution
        pendingInputs.push(input);
    }
}

// Function to send input to server
function sendInputToServer(executionId, input) {
    fetch('/provide_input', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            execution_id: executionId,
            input: input
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'running') {
            // Continue polling for more input or completion
            pollExecution(executionId);
        } else if (data.status === 'waiting_for_input') {
            // Waiting for more input
            updateOutputWithPartialResults(data.new_output);
            showInputPrompt();
        } else {
            // Execution complete
            hideInputPrompt();
            handleExecutionComplete(data);
        }
    })
    .catch(error => {
        console.error('Error sending input:', error);
        displayError('Failed to send input to server: ' + error.message);
    });
}

// Function to start execution with input support
function startExecutionWithInputSupport(code, language) {
    // Reset state
    pendingInputs = [];
    inputHistory = [];
    
    // Clear previous inputs display
    const previousInputs = document.getElementById('previousInputs');
    previousInputs.innerHTML = '';
    
    // Show loading
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.classList.remove('hidden');
    
    // Hide results initially
    const resultsContainer = document.getElementById('resultsContainer');
    resultsContainer.classList.add('hidden');
    
    // Start execution
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
        // Hide loading indicator
        loadingIndicator.classList.add('hidden');
        
        // Show results container
        resultsContainer.classList.remove('hidden');
        
        if (data.error) {
            displayError(data.error);
            return;
        }
        
        // Store execution ID
        currentExecution = data.execution_id;
        
        // Start polling for results or input requests
        pollExecution(data.execution_id);
    })
    .catch(error => {
        console.error('Error starting execution:', error);
        loadingIndicator.classList.add('hidden');
        displayError('Failed to start execution: ' + error.message);
    });
}

// Function to poll execution status
function pollExecution(executionId) {
    fetch(`/poll_execution/${executionId}`, {
        method: 'GET'
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            displayError(data.error);
            return;
        }
        
        // Handle different statuses
        if (data.status === 'waiting_for_input') {
            // Show input prompt and update output
            updateOutputWithPartialResults(data.new_output);
            showInputPrompt();
        } else if (data.status === 'running') {
            // Keep polling
            setTimeout(() => pollExecution(executionId), 500);
        } else {
            // Execution complete
            hideInputPrompt();
            handleExecutionComplete(data);
        }
    })
    .catch(error => {
        console.error('Error polling execution:', error);
        displayError('Failed to poll execution: ' + error.message);
    });
}

// Update output with partial results (for streaming output)
function updateOutputWithPartialResults(output) {
    const executionOutput = document.getElementById('executionOutput');
    
    // Append new output
    if (output && output.trim() !== '') {
        executionOutput.textContent += output;
        
        // Scroll to bottom
        executionOutput.scrollTop = executionOutput.scrollHeight;
    }
}

// Handle execution complete
function handleExecutionComplete(data) {
    // Update execution output
    const executionOutput = document.getElementById('executionOutput');
    executionOutput.textContent = data.output || '';
    
    // Update stats
    const executionTime = document.getElementById('executionTime');
    const executionMemory = document.getElementById('executionMemory');
    const executionStatus = document.getElementById('executionStatus');
    
    executionTime.textContent = data.execution_time || '-';
    executionMemory.textContent = data.memory || '-';
    executionStatus.textContent = data.status || 'Completed';
    
    // Show stats section
    const executionStats = document.getElementById('executionStats');
    executionStats.classList.remove('hidden');
    
    // Reset execution state
    currentExecution = null;
}

// Display errors
function displayError(errorMessage) {
    const executionOutput = document.getElementById('executionOutput');
    executionOutput.textContent = 'Error: ' + errorMessage;
    executionOutput.classList.add('text-red-400');
    executionOutput.classList.remove('text-green-400');
    
    // Show output section
    const outputSection = document.getElementById('outputSection');
    outputSection.classList.remove('hidden');
    
    // Show results container
    const resultsContainer = document.getElementById('resultsContainer');
    resultsContainer.classList.remove('hidden');
    
    // Hide loading indicator
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.classList.add('hidden');
}

// Export functions to be used in main script
window.inputHandler = {
    init: initInputHandler,
    startExecution: startExecutionWithInputSupport
};