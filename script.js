
let students = [];
let currentAttendance = {};
let attendanceManager = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadSampleData();
    updateDashboard();
    updateStorageInfo();
});

function initializeApp() {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDate').value = today;
    
    // Load data from localStorage
    loadDataFromStorage();
    
    // Update all dropdowns and displays
    updateClassDropdowns();
    updateStudentDropdowns();
}

function loadSampleData() {
    const savedStudents = localStorage.getItem('attendanceStudents');
    if (!savedStudents && students.length === 0) {
        const sampleStudents = [
            {
                studentId: '22BCE7177',
                name: 'ABHIRAM',
                email: 'abhiram@email.com',
                className: '7th semester',
                attendance: {}
            },
            {
                studentId: '22BCE20458',
                name: 'Greeshma',
                email: 'greeshma@email.com',
                className: '7th semester',
                attendance: {}
            },
            {
                studentId: '22BCE9625',
                name: 'Sarath',
                email: 'sarath@email.com',
                className: '7th semester',
                attendance: {}
            },
            {
                studentId: '22BCE8382',
                name: 'Vamsi',
                email: 'vamsi@email.com',
                className: '7th semester',
                attendance: {}
            },
            {
                studentId: '22BCE7914',
                name: 'satish',
                email: 'satish@email.com',
                className: '7th semester',
                attendance: {}
            }
        ];
        
        students = sampleStudents;
        saveDataToStorage();
        updateDashboard();
        updateClassDropdowns();
        updateStudentDropdowns();
        updateStudentsTable();
    }
}

function showTab(tabName) {
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    
    event.target.classList.add('active');
    
    switch(tabName) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'students':
            updateStudentsTable();
            break;
        case 'attendance':
            // Update attendance tab if needed
            break;
        case 'reports':
            updateReportDropdowns();
            break;
        case 'data':
            updateStorageInfo();
            break;
    }
}

function updateDashboard() {
    const totalStudents = students.length;
    const todayAttendance = calculateTodayAttendance();
    const avgAttendance = calculateAverageAttendance();
    const totalClasses = calculateTotalClasses();
    
    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('todayAttendance').textContent = todayAttendance.toFixed(1) + '%';
    document.getElementById('avgAttendance').textContent = avgAttendance.toFixed(1) + '%';
    document.getElementById('totalClasses').textContent = totalClasses;
    
    updateRecentActivity();
}

function calculateTodayAttendance() {
    const today = new Date().toISOString().split('T')[0];
    let presentCount = 0;
    let totalCount = 0;
    
    students.forEach(student => {
        if (student.attendance[today] !== undefined) {
            totalCount++;
            if (student.attendance[today]) {
                presentCount++;
            }
        }
    });
    
    return totalCount > 0 ? (presentCount / totalCount) * 100 : 0;
}

function calculateAverageAttendance() {
    if (students.length === 0) return 0;
    
    const totalPercentage = students.reduce((sum, student) => {
        return sum + calculateStudentAttendancePercentage(student);
    }, 0);
    
    return totalPercentage / students.length;
}

function calculateStudentAttendancePercentage(student) {
    const attendanceValues = Object.values(student.attendance);
    if (attendanceValues.length === 0) return 0;
    
    const presentCount = attendanceValues.filter(present => present).length;
    return (presentCount / attendanceValues.length) * 100;
}

function calculateTotalClasses() {
    const allDates = new Set();
    students.forEach(student => {
        Object.keys(student.attendance).forEach(date => allDates.add(date));
    });
    return allDates.size;
}

function updateRecentActivity() {
    const activityList = document.getElementById('recentActivity');
    const recentActivities = [];
    
    // Get recent attendance activities
    students.forEach(student => {
        Object.keys(student.attendance).forEach(date => {
            recentActivities.push({
                date: date,
                student: student.name,
                present: student.attendance[date],
                type: 'attendance'
            });
        });
    });
    
    // Sort by date (most recent first)
    recentActivities.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Display last 5 activities
    const displayActivities = recentActivities.slice(0, 5);
    
    if (displayActivities.length === 0) {
        activityList.innerHTML = '<p>No recent activity</p>';
        return;
    }
    
    activityList.innerHTML = displayActivities.map(activity => {
        const status = activity.present ? 'Present' : 'Absent';
        const statusClass = activity.present ? 'success' : 'danger';
        return `
            <div class="activity-item">
                <span class="activity-date">${formatDate(activity.date)}</span>
                <span class="activity-student">${activity.student}</span>
                <span class="activity-status ${statusClass}">${status}</span>
            </div>
        `;
    }).join('');
}

function showAddStudentForm() {
    document.getElementById('addStudentForm').style.display = 'block';
    document.getElementById('studentName').focus();
}

function hideAddStudentForm() {
    document.getElementById('addStudentForm').style.display = 'none';
    document.getElementById('addStudentForm').reset();
}

function addStudent(event) {
    event.preventDefault();
    
    const studentId = document.getElementById('studentId').value.trim();
    const name = document.getElementById('studentName').value.trim();
    const email = document.getElementById('studentEmail').value.trim();
    const className = document.getElementById('studentClass').value.trim();
    
    if (!studentId || !name || !email || !className) {
        showMessage('Please fill in all fields.', 'error');
        return;
    }
    
    if (students.find(s => s.studentId === studentId)) {
        showMessage('Student ID already exists.', 'error');
        return;
    }
    
    const newStudent = {
        studentId: studentId,
        name: name,
        email: email,
        className: className,
        attendance: {}
    };
    
    students.push(newStudent);
    saveDataToStorage();
    
    showMessage('Student added successfully!', 'success');
    hideAddStudentForm();
    updateStudentsTable();
    updateClassDropdowns();
    updateStudentDropdowns();
    updateDashboard();
}

function updateStudentsTable() {
    const tbody = document.getElementById('studentsTableBody');
    
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No students found</td></tr>';
        return;
    }
    
    tbody.innerHTML = students.map(student => {
        const attendancePercentage = calculateStudentAttendancePercentage(student);
        return `
            <tr>
                <td>${student.studentId}</td>
                <td>${student.name}</td>
                <td>${student.email}</td>
                <td>${student.className}</td>
                <td>${attendancePercentage.toFixed(1)}%</td>
                <td>
                    <button class="btn btn-danger" onclick="removeStudent('${student.studentId}')">Remove</button>
                </td>
            </tr>
        `;
    }).join('');
}

function removeStudent(studentId) {
    if (confirm('Are you sure you want to remove this student?')) {
        students = students.filter(s => s.studentId !== studentId);
        saveDataToStorage();
        updateStudentsTable();
        updateClassDropdowns();
        updateStudentDropdowns();
        updateDashboard();
        showMessage('Student removed successfully!', 'success');
    }
}

function loadStudentsForAttendance() {
    const selectedClass = document.getElementById('selectedClass').value;
    const attendanceList = document.getElementById('attendanceList');
    
    if (!selectedClass) {
        attendanceList.style.display = 'none';
        return;
    }
    
    const classStudents = students.filter(s => s.className === selectedClass);
    
    if (classStudents.length === 0) {
        attendanceList.style.display = 'none';
        showMessage('No students found in this class.', 'error');
        return;
    }
    
    document.getElementById('className').textContent = selectedClass;
    const studentsList = document.getElementById('studentsAttendanceList');
    
    studentsList.innerHTML = classStudents.map(student => {
        const date = document.getElementById('attendanceDate').value;
        const isPresent = student.attendance[date] === true;
        
        return `
            <div class="student-attendance-item">
                <input type="checkbox" 
                       id="att_${student.studentId}" 
                       ${isPresent ? 'checked' : ''} 
                       onchange="updateAttendanceStatus('${student.studentId}', this.checked)">
                <div class="student-info">
                    <div class="student-name">${student.name}</div>
                    <div class="student-id">${student.studentId}</div>
                </div>
            </div>
        `;
    }).join('');
    
    attendanceList.style.display = 'block';
}

function updateAttendanceStatus(studentId, isPresent) {
    const date = document.getElementById('attendanceDate').value;
    const student = students.find(s => s.studentId === studentId);
    
    if (student) {
        student.attendance[date] = isPresent;
        saveDataToStorage();
    }
}

function markAllPresent() {
    const checkboxes = document.querySelectorAll('#studentsAttendanceList input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        const studentId = checkbox.id.replace('att_', '');
        updateAttendanceStatus(studentId, true);
    });
}

function markAllAbsent() {
    const checkboxes = document.querySelectorAll('#studentsAttendanceList input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        const studentId = checkbox.id.replace('att_', '');
        updateAttendanceStatus(studentId, false);
    });
}

function saveAttendance() {
    showMessage('Attendance saved successfully!', 'success');
    updateDashboard();
}

function updateReportDropdowns() {
    const classes = [...new Set(students.map(s => s.className))];
    const classSelects = ['reportClass', 'classReport'];
    
    classSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        const currentValue = select.value;
        
        select.innerHTML = '<option value="">All Classes</option>';
        classes.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            select.appendChild(option);
        });
        
        select.value = currentValue;
    });
    
    // Update student dropdown
    const studentSelect = document.getElementById('individualStudent');
    const currentStudentValue = studentSelect.value;
    
    studentSelect.innerHTML = '<option value="">Select Student</option>';
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.studentId;
        option.textContent = `${student.name} (${student.studentId})`;
        studentSelect.appendChild(option);
    });
    
    studentSelect.value = currentStudentValue;
}

function generateIndividualReport() {
    const studentId = document.getElementById('individualStudent').value;
    
    if (!studentId) {
        showMessage('Please select a student.', 'error');
        return;
    }
    
    const student = students.find(s => s.studentId === studentId);
    if (!student) {
        showMessage('Student not found.', 'error');
        return;
    }
    
    const attendancePercentage = calculateStudentAttendancePercentage(student);
    const attendanceValues = Object.values(student.attendance);
    const presentCount = attendanceValues.filter(present => present).length;
    const absentCount = attendanceValues.length - presentCount;
    
    const report = `
        <h4>${student.name} - Individual Report</h4>
        <p><strong>Student ID:</strong> ${student.studentId}</p>
        <p><strong>Email:</strong> ${student.email}</p>
        <p><strong>Class:</strong> ${student.className}</p>
        <p><strong>Total Classes:</strong> ${attendanceValues.length}</p>
        <p><strong>Present Classes:</strong> ${presentCount}</p>
        <p><strong>Absent Classes:</strong> ${absentCount}</p>
        <p><strong>Attendance Percentage:</strong> ${attendancePercentage.toFixed(1)}%</p>
    `;
    
    document.getElementById('individualReport').innerHTML = report;
    document.getElementById('downloadIndividualBtn').style.display = 'inline-block';
}

function generateClassReport() {
    const className = document.getElementById('classReport').value;
    
    if (!className) {
        showMessage('Please select a class.', 'error');
        return;
    }
    
    const classStudents = students.filter(s => s.className === className);
    
    if (classStudents.length === 0) {
        showMessage('No students found in this class.', 'error');
        return;
    }
    
    const totalStudents = classStudents.length;
    const avgAttendance = classStudents.reduce((sum, student) => {
        return sum + calculateStudentAttendancePercentage(student);
    }, 0) / totalStudents;
    
    let studentDetails = classStudents.map(student => {
        const percentage = calculateStudentAttendancePercentage(student);
        return `<li>${student.name} (${student.studentId}): ${percentage.toFixed(1)}%</li>`;
    }).join('');
    
    const report = `
        <h4>${className} - Class Report</h4>
        <p><strong>Total Students:</strong> ${totalStudents}</p>
        <p><strong>Average Attendance:</strong> ${avgAttendance.toFixed(1)}%</p>
        <h5>Student Details:</h5>
        <ul>${studentDetails}</ul>
    `;
    
    document.getElementById('classReportContent').innerHTML = report;
    document.getElementById('downloadClassBtn').style.display = 'inline-block';
}

function generateOverallStats() {
    const totalStudents = students.length;
    const overallAvg = calculateAverageAttendance();
    const todayAttendance = calculateTodayAttendance();
    const totalClasses = calculateTotalClasses();
    
    const classes = [...new Set(students.map(s => s.className))];
    let classStats = classes.map(className => {
        const classStudents = students.filter(s => s.className === className);
        const classAvg = classStudents.reduce((sum, student) => {
            return sum + calculateStudentAttendancePercentage(student);
        }, 0) / classStudents.length;
        
        return `<li>${className}: ${classStudents.length} students, ${classAvg.toFixed(1)}% average attendance</li>`;
    }).join('');
    
    const report = `
        <h4>Overall Statistics</h4>
        <p><strong>Total Students:</strong> ${totalStudents}</p>
        <p><strong>Total Classes:</strong> ${totalClasses}</p>
        <p><strong>Overall Average Attendance:</strong> ${overallAvg.toFixed(1)}%</p>
        <p><strong>Today's Attendance:</strong> ${todayAttendance.toFixed(1)}%</p>
        <h5>Class-wise Statistics:</h5>
        <ul>${classStats}</ul>
    `;
    
    document.getElementById('overallStats').innerHTML = report;
    document.getElementById('downloadOverallBtn').style.display = 'inline-block';
}

function updateClassDropdowns() {
    const classes = [...new Set(students.map(s => s.className))];
    const selects = ['selectedClass', 'reportClass', 'classReport'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        const currentValue = select.value;
        
        select.innerHTML = '<option value="">Select a class</option>';
        classes.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            select.appendChild(option);
        });
        
        select.value = currentValue;
    });
}

function updateStudentDropdowns() {
    const studentSelect = document.getElementById('individualStudent');
    const currentValue = studentSelect.value;
    
    studentSelect.innerHTML = '<option value="">Select Student</option>';
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.studentId;
        option.textContent = `${student.name} (${student.studentId})`;
        studentSelect.appendChild(option);
    });
    
    studentSelect.value = currentValue;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showMessage(message, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.success-message, .error-message');
    existingMessages.forEach(msg => msg.remove());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
    messageDiv.textContent = message;
    
    // Insert at the top of the active tab content
    const activeTab = document.querySelector('.tab-content.active');
    activeTab.insertBefore(messageDiv, activeTab.firstChild);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

function saveDataToStorage() {
    try {
        localStorage.setItem('attendanceStudents', JSON.stringify(students));
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

function loadDataFromStorage() {
    try {
        const savedData = localStorage.getItem('attendanceStudents');
        if (savedData) {
            students = JSON.parse(savedData);
            console.log('Data loaded from localStorage:', students.length, 'students');
        } else {
            console.log('No data found in localStorage');
        }
    } catch (error) {
        console.error('Error loading data:', error);
        students = [];
    }
}

function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
        localStorage.removeItem('attendanceStudents');
        students = [];
        saveDataToStorage();
        updateDashboard();
        updateClassDropdowns();
        updateStudentDropdowns();
        updateStudentsTable();
        showMessage('All data cleared successfully!', 'success');
    }
}

function exportData() {
    const dataStr = JSON.stringify(students, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'attendance_data.json';
    link.click();
    URL.revokeObjectURL(url);
    showMessage('Data exported successfully!', 'success');
}

function downloadIndividualReport() {
    const studentId = document.getElementById('individualStudent').value;
    if (!studentId) {
        showMessage('Please select a student first.', 'error');
        return;
    }
    
    const student = students.find(s => s.studentId === studentId);
    if (!student) {
        showMessage('Student not found.', 'error');
        return;
    }
    
    const attendancePercentage = calculateStudentAttendancePercentage(student);
    const attendanceValues = Object.values(student.attendance);
    const presentCount = attendanceValues.filter(present => present).length;
    const absentCount = attendanceValues.length - presentCount;
    
    const reportContent = `
INDIVIDUAL ATTENDANCE REPORT
============================

Student Information:
- Name: ${student.name}
- Student ID: ${student.studentId}
- Email: ${student.email}
- Class: ${student.className}

Attendance Summary:
- Total Classes: ${attendanceValues.length}
- Present Classes: ${presentCount}
- Absent Classes: ${absentCount}
- Attendance Percentage: ${attendancePercentage.toFixed(1)}%

Detailed Attendance Record:
${Object.keys(student.attendance).length > 0 ? Object.keys(student.attendance).map(date => {
    const status = student.attendance[date] ? 'Present' : 'Absent';
    return `- ${date}: ${status}`;
}).join('\n') : 'No attendance records found.'}

Report Generated: ${new Date().toLocaleString()}
    `.trim();
    
    downloadReport(reportContent, `Individual_Report_${student.name}_${studentId}.txt`);
}

function downloadClassReport() {
    const className = document.getElementById('classReport').value;
    if (!className) {
        showMessage('Please select a class first.', 'error');
        return;
    }
    
    const classStudents = students.filter(s => s.className === className);
    if (classStudents.length === 0) {
        showMessage('No students found in this class.', 'error');
        return;
    }
    
    const totalStudents = classStudents.length;
    const avgAttendance = classStudents.reduce((sum, student) => {
        return sum + calculateStudentAttendancePercentage(student);
    }, 0) / totalStudents;
    
    let studentDetails = classStudents.map(student => {
        const percentage = calculateStudentAttendancePercentage(student);
        const attendanceValues = Object.values(student.attendance);
        const presentCount = attendanceValues.filter(present => present).length;
        const absentCount = attendanceValues.length - presentCount;
        return `${student.name} (${student.studentId}):
  - Email: ${student.email}
  - Total Classes: ${attendanceValues.length}
  - Present: ${presentCount}
  - Absent: ${absentCount}
  - Attendance: ${percentage.toFixed(1)}%`;
    }).join('\n\n');
    
    const reportContent = `
CLASS ATTENDANCE REPORT
=======================

Class Information:
- Class Name: ${className}
- Total Students: ${totalStudents}
- Average Attendance: ${avgAttendance.toFixed(1)}%

Student Details:
${studentDetails}

Report Generated: ${new Date().toLocaleString()}
    `.trim();
    
    downloadReport(reportContent, `Class_Report_${className.replace(/\s+/g, '_')}.txt`);
}

function downloadOverallStats() {
    const totalStudents = students.length;
    const overallAvg = calculateAverageAttendance();
    const todayAttendance = calculateTodayAttendance();
    const totalClasses = calculateTotalClasses();
    
    const classes = [...new Set(students.map(s => s.className))];
    let classStats = classes.map(className => {
        const classStudents = students.filter(s => s.className === className);
        const classAvg = classStudents.reduce((sum, student) => {
            return sum + calculateStudentAttendancePercentage(student);
        }, 0) / classStudents.length;
        
        return `${className}:
  - Students: ${classStudents.length}
  - Average Attendance: ${classAvg.toFixed(1)}%`;
    }).join('\n\n');
    
    const reportContent = `
OVERALL ATTENDANCE STATISTICS
=============================

Summary:
- Total Students: ${totalStudents}
- Total Classes: ${totalClasses}
- Overall Average Attendance: ${overallAvg.toFixed(1)}%
- Today's Attendance: ${todayAttendance.toFixed(1)}%

Class-wise Statistics:
${classStats}

Report Generated: ${new Date().toLocaleString()}
    `.trim();
    
    downloadReport(reportContent, `Overall_Statistics_${new Date().toISOString().split('T')[0]}.txt`);
}

function downloadReport(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showMessage('Report downloaded successfully!', 'success');
}

function updateStorageInfo() {
    const storageStatus = document.getElementById('storageStatus');
    const storageStudents = document.getElementById('storageStudents');
    const storageSize = document.getElementById('storageSize');
    const lastUpdated = document.getElementById('lastUpdated');
    const localStorageStatus = document.getElementById('localStorageStatus');
    const browserSupport = document.getElementById('browserSupport');
    const availableSpace = document.getElementById('availableSpace');
    
    try {
        const savedData = localStorage.getItem('attendanceStudents');
        if (savedData) {
            storageStatus.textContent = 'Data Available';
            storageStatus.style.color = 'rgb(76, 175, 80)';
            storageStudents.textContent = students.length;
            storageSize.textContent = (savedData.length / 1024).toFixed(2) + ' KB';
            lastUpdated.textContent = new Date().toLocaleString();
        } else {
            storageStatus.textContent = 'No Data';
            storageStatus.style.color = 'rgb(220, 53, 69)';
            storageStudents.textContent = '0';
            storageSize.textContent = '0 KB';
            lastUpdated.textContent = 'Never';
        }
        
        localStorageStatus.textContent = 'Available';
        localStorageStatus.style.color = 'rgb(76, 175, 80)';
        
        if (typeof(Storage) !== "undefined") {
            browserSupport.textContent = 'Supported';
            browserSupport.style.color = 'rgb(76, 175, 80)';
        } else {
            browserSupport.textContent = 'Not Supported';
            browserSupport.style.color = 'rgb(220, 53, 69)';
        }
        
        let totalSize = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += localStorage[key].length;
            }
        }
        availableSpace.textContent = (totalSize / 1024).toFixed(2) + ' KB used';
        
    } catch (error) {
        storageStatus.textContent = 'Error';
        storageStatus.style.color = 'rgb(220, 53, 69)';
        localStorageStatus.textContent = 'Error';
        localStorageStatus.style.color = 'rgb(220, 53, 69)';
        console.error('Error updating storage info:', error);
    }
}
