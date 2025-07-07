class HelloWorldApp {
    constructor() {
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadAppInfo();
    }
    
    bindEvents() {
        const greetBtn = document.getElementById('greetBtn');
        const nameInput = document.getElementById('nameInput');
        
        greetBtn.addEventListener('click', () => this.getGreeting());
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.getGreeting();
            }
        });
    }
    
    async getGreeting() {
        const name = document.getElementById('nameInput').value || 'World';
        const lang = document.getElementById('langSelect').value;
        const resultDiv = document.getElementById('greetingResult');
        
        try {
            resultDiv.innerHTML = '🤖 Agents are crafting your greeting...';
            
            const response = await fetch(`/api/greeting?name=${encodeURIComponent(name)}&lang=${lang}`);
            const data = await response.json();
            
            resultDiv.innerHTML = `
                <div style="font-size: 24px; font-weight: bold; color: #667eea;">
                    ${data.message}
                </div>
                <div style="margin-top: 10px; font-size: 14px; color: #666;">
                    Generated at: ${new Date(data.timestamp).toLocaleString()}<br>
                    Language: ${data.language} | Agent: ${data.agent}
                </div>
            `;
        } catch (error) {
            resultDiv.innerHTML = `
                <div style="color: #e74c3c;">
                    ❌ Error: ${error.message}
                </div>
            `;
        }
    }
    
    async loadAppInfo() {
        try {
            const response = await fetch('/api/info');
            const data = await response.json();
            
            const infoDiv = document.getElementById('appInfo');
            infoDiv.textContent = JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('Failed to load app info:', error);
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new HelloWorldApp();
});
