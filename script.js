document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const resultsContainer = document.getElementById('resultsContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');

    // Define your file URLs directly (replace with your actual file URLs)
    const FILE_URLS = [
        { id: '001LVE2511.csv', url: 'https://drive.google.com/uc?export=download&id=1fDLIq2Fg1suJLqXZ-iQ3YOS5MbfW7WIv' },
        { id: '002LVE2511.csv', url: 'https://drive.google.com/uc?export=download&id=1wINyMcJt2WcGp3G02mOuQBG6Swms2pgp' },
        { id: '003LVE2511.csv', url: 'https://drive.google.com/uc?export=download&id=181er_FCWegvYr4kebhp1pVsuk1W5hVP7' },
        { id: '005LVE2511.csv', url: 'https://drive.google.com/uc?export=download&id=17Fh0a0xwzWwRcagf4wWB8G0wRN-f6t5m' }
    ];

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
            let allEmployees = [];
            
            // Fetch data from all CSV files
            for (const csvFile of FILE_URLS) {
                try {
                    const response = await fetch(csvFile.url);
                    
                    if (!response.ok) {
                        throw new Error(`Failed to fetch ${csvFile.id}: ${response.status}`);
                    }
                    
                    const csvText = await response.text();
                    const parsedData = parseComplexCSV(csvText);
                    
                    // Add company information to each employee record
                    const employeesWithCompany = parsedData.map(emp => ({
                        ...emp,
                        Company: csvFile.id // Add company identifier
                    }));
                    
                    allEmployees = allEmployees.concat(employeesWithCompany);
                } catch (fileError) {
                    console.error(`Error processing file ${csvFile.id}:`, fileError);
                    continue; // Continue with next file
                }
            }

            if (allEmployees.length === 0) {
                resultsContainer.innerHTML = '<div class="error-message">No valid files found or all files are empty</div>';
                return;
            }

            // Filter employees based on search term (case-insensitive partial match for surname, exact match for employee number)
            const matchingEmployees = allEmployees.filter(employee => {
                // Skip excluded employee
                if (employee['Employee Number'] === 'PPA091') {
                    return false;
                }

                // Safely check if Surname exists and is a string
                const surname = employee.Surname || '';
                const employeeNumber = employee['Employee Number'] || '';
                
                // Match either surname (partial, case-insensitive) or employee number (exact, case-sensitive)
                return (
                    surname.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                    employeeNumber === searchTerm
                );
            });

            // Process each matching employee
            const processedEmployees = matchingEmployees.map(emp => {
                // Calculate Total Annual Leave
                const annualLeave = parseFloat(emp['Annual Leave']) || 0;
                const accAnnual = parseFloat(emp['Acc Annual']) || 0;
                const totalAnnual = annualLeave + accAnnual;

                // Create a new object with the calculated value and company info
                const processedEmp = { 
                    ...emp,
                    'Total Annual Leave': totalAnnual,
                    Company: emp.Company // Keep company info
                };

                // Exclude Maternity Leave and Lost Leave from the response
                delete processedEmp['Maternity Leave'];
                delete processedEmp['Lost Leave'];

                return processedEmp;
            });

            displayResults(processedEmployees);
        } catch (error) {
            console.error('Error:', error);
            resultsContainer.innerHTML = `<div class="error-message">An error occurred while searching: ${error.message}</div>`;
        } finally {
            hideLoading();
        }
    }

    function parseComplexCSV(csvText) {
      const lines = csvText.split('\n');
      const employees = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        // Check if this line represents an employee record
        // Employee lines typically have format: Department Position EmployeeNumber Name Annual 15 ...
        const employeeMatch = line.match(/^([A-Z]{2,4}\s+[A-Z0-9]{2,4})\s+(PP[A-Z0-9]+)\s+([A-Za-z\s]+?)\s+Annual\s+\d+/);
        
        if (employeeMatch) {
          // Extract employee details
          const departmentPosition = employeeMatch[1]; // e.g., "MAN 25TH"
          const employeeNumber = employeeMatch[2]; // e.g., "PPA021"
          const surname = employeeMatch[3].trim(); // e.g., "Heshe L"
          
          // Look ahead for the next line which contains the actual leave values
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            // Use a more flexible regex to match the leave values
            const valuesMatch = nextLine.match(/Annual\s+\d+\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
            
            if (valuesMatch) {
              const annualLeave = valuesMatch[1] || 0; // Actual Annual Leave value
              const accAnnual = valuesMatch[2] || 0;   // Acc Annual value
              const maternityLeave = valuesMatch[3] || 0; // Maternity Leave value
              const lostLeave = valuesMatch[5] || 0;   // Lost Leave value (5th value after Annual)
              
              // Create employee object
              const employee = {
                'Employee Number': employeeNumber,
                'Surname': surname,
                'Annual Leave': annualLeave,
                'Acc Annual': accAnnual,
                'Maternity Leave': maternityLeave,
                'Lost Leave': lostLeave
              };
              
              // Skip the next line since we've processed it
              i++;
              
              // Look for Sick Leave if it exists after Annual
              if (i + 1 < lines.length) {
                const sickLine = lines[i + 1].trim();
                if (sickLine.startsWith("Sick Leave")) {
                  const sickMatch = sickLine.match(/Sick Leave\s+\d+\s+([\d.]+)\s+([\d.]+)/);
                  if (sickMatch) {
                    employee['Sick Leave'] = sickMatch[1] || 0;
                    // Skip this line too
                    i++;
                  }
                }
              }
              
              employees.push(employee);
            }
          }
        }
      }
      
      return employees;
    }

    function displayResults(employees) {
        let html = '';
        for (const emp of employees) {
            html += `
                <div class="employee-card">
                    <div class="employee-header">${emp.Surname}, ${emp['Employee Number']} (${emp.Company})</div>
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
