document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsContainer = document.getElementById('resultsContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');

    // Replace with your deployed Google Apps Script Web App URL
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbz1TghEruLWupbFVTBdEyFQI3pHP1A32PYNj_Nn2wCZkuSfhIOvmgb6yV28w7s0RtNcig/exec';

    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    async function performSearch() {
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) {
            resultsContainer.innerHTML = '<div class="error-message">Please enter an employee number or surname.</div>';
            return;
        }

        showLoading();

        try {
            const response = await fetch(`${GAS_URL}?search=${encodeURIComponent(searchTerm)}`);
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                resultsContainer.innerHTML = `<div class="error-message">${data.error}</div>`;
            } else if (Array.isArray(data) && data.length > 0) {
                displayResults(data);
            } else {
                resultsContainer.innerHTML = '<div class="no-results">No employees found.</div>';
            }
        } catch (error) {
            console.error('Error:', error);
            resultsContainer.innerHTML = `<div class="error-message">An error occurred while searching: ${error.message}</div>`;
        } finally {
            hideLoading();
        }
    }

    function displayResults(employees) {
        let html = '';
        for (const emp of employees) {
            html += `
                <div class="employee-card">
                    <div class="employee-header">${emp.Surname}, ${emp['Employee Number']}</div>
                    <div class="leave-details">
                        <div class="leave-item">
                            <span class="leave-label">Total Annual Leave</span>
                            <span class="leave-value ${
                                parseFloat(emp['Total Annual Leave']) > 15 ? 'total-annual-leave-high' : 
                                parseFloat(emp['Total Annual Leave']) < 0 ? 'total-annual-leave-negative' : ''
                            }">${emp['Total Annual Leave']}</span>
                        </div>
                        ${emp['Sick Leave'] !== undefined ? `
                        <div class="leave-item">
                            <span class="leave-label">Sick Leave</span>
                            <span class="leave-value">${emp['Sick Leave']}</span>
                        </div>` : ''}
                        ${emp['Personal Leave'] !== undefined ? `
                        <div class="leave-item">
                            <span class="leave-label">Personal Leave</span>
                            <span class="leave-value">${emp['Personal Leave']}</span>
                        </div>` : ''}
                    </div>
                </div>
            `;
        }
        resultsContainer.innerHTML = html;
    }

    function showLoading() {
        loadingIndicator.classList.remove('hidden');
        resultsContainer.innerHTML = '';
    }

    function hideLoading() {
        loadingIndicator.classList.add('hidden');
    }
});
