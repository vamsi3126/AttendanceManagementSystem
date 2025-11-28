
let students = [];
let currentAttendance = {};
let attendanceManager = null;
let apiToken = null;
const apiBase = '';

document.addEventListener('DOMContentLoaded', function() {
    applyTheme();
    initializeApp();
    updateDashboard();
    updateStorageInfo();
    initializeAuthUI();
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

async function fetchJSON(url, opts = {}) {
    const headers = opts.headers || {};
    if (apiToken) headers['Authorization'] = 'Bearer ' + apiToken;
    headers['Content-Type'] = 'application/json';
    const res = await fetch(apiBase + url, { ...opts, headers });
    if (!res.ok) {
        const e = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(e.error || 'Request failed');
    }
    return res.json();
}

function showTab(e, tabName) {
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    if (e && e.target) e.target.classList.add('active');
    
    switch(tabName) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'students':
            loadClassesAndStudents();
            break;
        case 'attendance':
            loadClassesAndStudents();
            break;
        case 'reports':
            updateReportDropdowns();
            break;
        case 'data':
            updateStorageInfo();
            break;
        case 'auth':
            // nothing special
            break;
    }
}

function toggleTheme() {
    const current = localStorage.getItem('ams_theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    localStorage.setItem('ams_theme', next);
    applyTheme();
}

function applyTheme() {
    const theme = localStorage.getItem('ams_theme') || 'light';
    if (theme === 'dark') {
        document.body.classList.add('dark');
        const t = document.getElementById('themeToggle');
        if (t) t.textContent = 'Light Theme';
    } else {
        document.body.classList.remove('dark');
        const t = document.getElementById('themeToggle');
        if (t) t.textContent = 'Toggle Theme';
    }
}

// --- Auth (backend) ---
let currentUser = null;

function initializeAuthUI() {
    const status = document.getElementById('authStatus');
    const logoutActions = document.getElementById('logoutActions');
    if (!status || !logoutActions) return;
    if (currentUser) {
        status.textContent = `Logged in as ${currentUser.name} (${currentUser.role})`;
        logoutActions.style.display = 'flex';
    } else {
        status.textContent = 'Not logged in';
        logoutActions.style.display = 'none';
    }
}

async function registerUser(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    const role = document.getElementById('regRole').value;

    if (!name || !email || !password || !role) {
        showMessage('Please fill in all fields.', 'error');
        return;
    }

    try {
        await fetchJSON('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, role }) });
        showMessage('Registration successful! You can now login.', 'success');
    } catch (err) {
        showMessage(err.message, 'error');
        return;
    }
    document.getElementById('regName').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regRole').value = 'student';
}

async function loginUser(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    try {
        const data = await fetchJSON('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        apiToken = data.token;
        currentUser = data.user;
        localStorage.setItem('ams_token', apiToken);
        showMessage(`Welcome ${currentUser.name}!`, 'success');
        await loadClassesAndStudents();
    } catch (err) {
        showMessage(err.message, 'error');
        return;
    }
    initializeAuthUI();

    // Optional: gate features
    const studentsTabBtn = document.getElementById('tab-students');
    const attendanceTabBtn = document.getElementById('tab-attendance');
    if (currentUser.role === 'teacher' || currentUser.role === 'admin') {
        studentsTabBtn.disabled = false;
        attendanceTabBtn.disabled = false;
    } else {
        studentsTabBtn.disabled = false; // allow viewing
        attendanceTabBtn.disabled = true; // prevent marking attendance
    }
}

function logoutUser() {
    currentUser = null;
    apiToken = null;
    localStorage.removeItem('ams_token');
    initializeAuthUI();
    showMessage('Logged out.', 'success');
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

async function addStudent(event) {
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
    
    try {
        const classObj = classes.find(c => c.name === className);
        if (!classObj) {
            await createClass(className);
        }
        const targetClass = classes.find(c => c.name === className);
        await fetchJSON(`/api/classes/${targetClass.id}/students`, { method: 'POST', body: JSON.stringify({ studentId, name, email }) });
        showMessage('Student added successfully!', 'success');
        hideAddStudentForm();
        await loadClassesAndStudents();
        updateDashboard();
    } catch (err) {
        showMessage(err.message, 'error');
    }
}

function updateStudentsTable() {
    const tbody = document.getElementById('studentsTableBody');
    const list = getFilteredStudents();
    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No students found</td></tr>';
        return;
    }
    
    tbody.innerHTML = list.map(student => {
        const attendancePercentage = calculateStudentAttendancePercentage(student);
        return `
            <tr>
                <td>${student.studentId}</td>
                <td>${student.name}</td>
                <td>${student.email}</td>
                <td>${student.className}</td>
                <td>${attendancePercentage.toFixed(1)}%</td>
                <td>
                    <button class="btn btn-danger" onclick="removeStudent('${student._backendId || ''}')">Remove</button>
                </td>
            </tr>
        `;
    }).join('');
}

function getFilteredStudents() {
    const input = document.getElementById('studentSearch');
    const q = input ? input.value.toLowerCase().trim() : '';
    if (!q) return students;
    return students.filter(s => {
        return [s.studentId, s.name, s.email, s.className]
            .map(v => (v || '').toLowerCase())
            .some(v => v.includes(q));
    });
}

function filterStudentsTable() {
    updateStudentsTable();
}

async function removeStudent(backendId) {
    if (!backendId) return;
    if (confirm('Are you sure you want to remove this student?')) {
        try {
            await fetchJSON(`/api/students/${backendId}`, { method: 'DELETE' });
            await loadClassesAndStudents();
            updateDashboard();
            showMessage('Student removed successfully!', 'success');
        } catch (err) {
            showMessage(err.message, 'error');
        }
    }
}

async function loadStudentsForAttendance() {
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

async function updateAttendanceStatus(studentId, isPresent) {
    const date = document.getElementById('attendanceDate').value;
    const student = students.find(s => s.studentId === studentId);
    if (!student || !currentSession) return;
    try {
        const status = isPresent ? 'present' : 'absent';
        await fetchJSON('/api/attendance/mark', { method: 'POST', body: JSON.stringify({ sessionId: currentSession.id, studentId: student._backendId, status }) });
        student.attendance[date] = isPresent;
        saveDataToStorage();
    } catch (err) {
        showMessage(err.message, 'error');
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

async function saveAttendance() {
    try {
        if (currentSession) {
            await fetchJSON(`/api/sessions/${currentSession.id}/finalize`, { method: 'POST' });
        }
        showMessage('Attendance saved and session finalized!', 'success');
        updateDashboard();
    } catch (err) {
        showMessage(err.message, 'error');
    }
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
    const csvBtn = document.getElementById('downloadIndividualCsvBtn');
    if (csvBtn) csvBtn.style.display = 'inline-block';
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
    const csvBtn = document.getElementById('downloadClassCsvBtn');
    if (csvBtn) csvBtn.style.display = 'inline-block';
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
    const csvBtn = document.getElementById('downloadOverallCsvBtn');
    if (csvBtn) csvBtn.style.display = 'inline-block';
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

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showMessage('CSV downloaded successfully!', 'success');
}

function downloadIndividualCSV() {
    const studentId = document.getElementById('individualStudent').value;
    if (!studentId) return;
    const student = students.find(s => s.studentId === studentId);
    if (!student) return;
    const rows = [];
    rows.push(['Name', 'Student ID', 'Email', 'Class']);
    rows.push([student.name, student.studentId, student.email, student.className]);
    rows.push([]);
    rows.push(['Date', 'Status']);
    const keys = Object.keys(student.attendance);
    if (keys.length === 0) rows.push(['-', '-']);
    keys.forEach(d => {
        rows.push([d, student.attendance[d] ? 'Present' : 'Absent']);
    });
    const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
    downloadCSV(csv, `Individual_${student.name}_${student.studentId}.csv`);
}

function downloadClassCSV() {
    const className = document.getElementById('classReport').value;
    if (!className) return;
    const classStudents = students.filter(s => s.className === className);
    const rows = [];
    rows.push(['Student Name', 'Student ID', 'Email', 'Attendance %']);
    classStudents.forEach(st => {
        const percentage = calculateStudentAttendancePercentage(st);
        rows.push([st.name, st.studentId, st.email, percentage.toFixed(1)]);
    });
    const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
    downloadCSV(csv, `Class_${className.replace(/\s+/g, '_')}.csv`);
}

function downloadOverallCSV() {
    const rows = [];
    rows.push(['Metric', 'Value']);
    rows.push(['Total Students', students.length]);
    rows.push(['Total Classes', calculateTotalClasses()]);
    rows.push(['Overall Average Attendance', calculateAverageAttendance().toFixed(1) + '%']);
    rows.push(['Today\'s Attendance', calculateTodayAttendance().toFixed(1) + '%']);
    rows.push([]);
    rows.push(['Class Name', 'Students', 'Average Attendance %']);
    const classesSet = [...new Set(students.map(s => s.className))];
    classesSet.forEach(className => {
        const classStudents = students.filter(s => s.className === className);
        const classAvg = classStudents.reduce((sum, student) => sum + calculateStudentAttendancePercentage(student), 0) / classStudents.length;
        rows.push([className, classStudents.length, classAvg.toFixed(1)]);
    });
    const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
    downloadCSV(csv, `Overall_${new Date().toISOString().split('T')[0]}.csv`);
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

// Backend sync helpers
let classes = [];
let currentSession = null;

async function loadClassesAndStudents() {
    if (!apiToken) {
        updateStudentsTable();
        updateClassDropdowns();
        updateStudentDropdowns();
        return;
    }
    try {
        classes = await fetchJSON('/api/classes');
        const allStudents = [];
        for (const c of classes) {
            const cStudents = await fetchJSON(`/api/classes/${c.id}/students`);
            for (const s of cStudents) {
                allStudents.push({
                    _backendId: s.id,
                    studentId: s.student_ext_id,
                    name: s.name,
                    email: s.email || '',
                    className: classes.find(cls => cls.id === s.class_id)?.name || '',
                    attendance: {}
                });
            }
        }
        students = allStudents;
        updateStudentsTable();
        updateClassDropdowns();
        updateStudentDropdowns();
        // prepare session for selected class/date
        const selectedClassName = document.getElementById('selectedClass').value;
        if (selectedClassName) {
            const cls = classes.find(c => c.name === selectedClassName);
            const date = document.getElementById('attendanceDate').value;
            await ensureSession(cls?.id, date);
        }
    } catch (err) {
        console.error(err);
    }
}

async function ensureSession(classId, date) {
    if (!classId || !date) return;
    const existing = await fetchJSON(`/api/sessions?classId=${classId}&date=${date}`);
    if (existing.length > 0) {
        currentSession = existing[0];
        return;
    }
    // create open session with no times (allowed) – teachers only
    try {
        currentSession = await fetchJSON('/api/sessions', { method: 'POST', body: JSON.stringify({ classId, date }) });
    } catch (err) {
        showMessage('Unable to open session: ' + err.message, 'error');
    }
}

async function createClass(name) {
    await fetchJSON('/api/classes', { method: 'POST', body: JSON.stringify({ name }) });
}
