// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const nameSpan = document.getElementById('name');
  const nameInput = document.getElementById('name-input');
  const updateButton = document.getElementById('update-button');
  const fetchApiButton = document.getElementById('fetch-api');
  const apiResponse = document.getElementById('api-response');
  
  // Update the greeting with input value
  updateButton.addEventListener('click', () => {
    const newName = nameInput.value.trim();
    
    if (newName) {
      nameSpan.textContent = newName;
      nameInput.value = '';
      
      // Add animation effect
      nameSpan.classList.add('highlight');
      setTimeout(() => {
        nameSpan.classList.remove('highlight');
      }, 1000);
    }
  });
  
  // Allow pressing Enter to update the name
  nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      updateButton.click();
    }
  });
  
  // Fetch from API endpoint
  fetchApiButton.addEventListener('click', async () => {
    // Show loading state
    fetchApiButton.disabled = true;
    fetchApiButton.textContent = 'Loading...';
    apiResponse.style.display = 'block';
    apiResponse.textContent = 'Fetching data...';
    
    try {
      // Get the current name from the span
      const currentName = nameSpan.textContent;
      
      // Make API request
      const response = await fetch(`/api/greeting?name=${encodeURIComponent(currentName)}`);
      const data = await response.json();
      
      // Display the response
      apiResponse.textContent = JSON.stringify(data, null, 2);
      
      // Success animation
      apiResponse.classList.add('success');
      setTimeout(() => {
        apiResponse.classList.remove('success');
      }, 1000);
    } catch (error) {
      // Handle error
      apiResponse.textContent = `Error: ${error.message}`;
      apiResponse.classList.add('error');
      setTimeout(() => {
        apiResponse.classList.remove('error');
      }, 1000);
    } finally {
      // Reset button state
      fetchApiButton.disabled = false;
      fetchApiButton.textContent = 'Fetch from API';
    }
  });
  
  // Add highlight effect CSS
  const style = document.createElement('style');
  style.textContent = `
    @keyframes highlight {
      0% { color: #3a4f9c; }
      50% { color: #e74c3c; }
      100% { color: #3a4f9c; }
    }
    
    .highlight {
      animation: highlight 1s ease;
    }
    
    .success {
      animation: fadeIn 0.5s;
      border-left: 4px solid #2ecc71;
    }
    
    .error {
      animation: fadeIn 0.5s;
      border-left: 4px solid #e74c3c;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
});