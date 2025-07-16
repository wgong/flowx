document.addEventListener('DOMContentLoaded', () => {
  const nameInput = document.getElementById('nameInput');
  const greetButton = document.getElementById('greetButton');
  const greetingMessage = document.getElementById('greetingMessage');
  const greetingTimestamp = document.getElementById('greetingTimestamp');
  const loadingSpinner = document.getElementById('loadingSpinner');

  // Function to format date in a readable format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Function to fetch greeting from API
  const fetchGreeting = async (name) => {
    try {
      // Show loading spinner
      loadingSpinner.style.display = 'flex';
      
      // Fetch data from API
      const response = await fetch(`/api/hello?name=${encodeURIComponent(name)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch greeting');
      }
      
      const data = await response.json();
      
      // Update UI with greeting
      greetingMessage.textContent = data.message;
      greetingTimestamp.textContent = `Timestamp: ${formatDate(data.timestamp)}`;
      
      // Apply animation
      greetingMessage.style.opacity = '0';
      greetingTimestamp.style.opacity = '0';
      
      setTimeout(() => {
        greetingMessage.style.opacity = '1';
        greetingTimestamp.style.opacity = '1';
      }, 100);
    } catch (error) {
      console.error('Error fetching greeting:', error);
      greetingMessage.textContent = 'Failed to fetch greeting. Please try again.';
      greetingTimestamp.textContent = '';
    } finally {
      // Hide loading spinner
      loadingSpinner.style.display = 'none';
    }
  };

  // Event listener for button click
  greetButton.addEventListener('click', () => {
    const name = nameInput.value.trim() || 'World';
    fetchGreeting(name);
  });

  // Event listener for Enter key in input
  nameInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      const name = nameInput.value.trim() || 'World';
      fetchGreeting(name);
    }
  });

  // Fetch default greeting on page load
  fetchGreeting('World');
});