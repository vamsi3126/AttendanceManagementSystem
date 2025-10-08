import java.io.*;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

public class AttendanceManager {
    private List<Student> students;
    private String dataFile;
    private DateTimeFormatter dateFormatter;
    
    public AttendanceManager() {
        this.students = new ArrayList<>();
        this.dataFile = "attendance_data.ser";
        this.dateFormatter = DateTimeFormatter.ofPattern("dd-MM-yyyy");
        loadData();
    }
    
    public boolean addStudent(Student student) {
        if (getStudentById(student.getStudentId()) != null) {
            return false;
        }
        students.add(student);
        saveData();
        return true;
    }
    
    public Student getStudentById(String studentId) {
        return students.stream()
                .filter(student -> student.getStudentId().equals(studentId))
                .findFirst()
                .orElse(null);
    }
    
    public List<Student> getAllStudents() {
        return new ArrayList<>(students);
    }
    
    public List<Student> getStudentsByClass(String className) {
        return students.stream()
                .filter(student -> student.getClassName().equals(className))
                .collect(Collectors.toList());
    }
    
    public Set<String> getAllClasses() {
        return students.stream()
                .map(Student::getClassName)
                .collect(Collectors.toSet());
    }
    
    public boolean removeStudent(String studentId) {
        boolean removed = students.removeIf(student -> student.getStudentId().equals(studentId));
        if (removed) {
            saveData();
        }
        return removed;
    }
    
    public void markAttendance(String studentId, String date, boolean present) {
        Student student = getStudentById(studentId);
        if (student != null) {
            if (present) {
                student.markPresent(date);
            } else {
                student.markAbsent(date);
            }
            saveData();
        }
    }
    
    public void markAttendanceForClass(String className, String date, Map<String, Boolean> attendanceMap) {
        List<Student> classStudents = getStudentsByClass(className);
        for (Student student : classStudents) {
            Boolean attendance = attendanceMap.get(student.getStudentId());
            if (attendance != null) {
                markAttendance(student.getStudentId(), date, attendance);
            }
        }
    }
    
    public boolean getAttendance(String studentId, String date) {
        Student student = getStudentById(studentId);
        return student != null ? student.isPresent(date) : false;
    }
    
    public Map<String, Boolean> getAttendanceForDate(String date) {
        Map<String, Boolean> attendanceMap = new HashMap<>();
        for (Student student : students) {
            attendanceMap.put(student.getStudentId(), student.isPresent(date));
        }
        return attendanceMap;
    }
    
    public Map<String, Boolean> getClassAttendanceForDate(String className, String date) {
        Map<String, Boolean> attendanceMap = new HashMap<>();
        List<Student> classStudents = getStudentsByClass(className);
        for (Student student : classStudents) {
            attendanceMap.put(student.getStudentId(), student.isPresent(date));
        }
        return attendanceMap;
    }
    
    public double getOverallAttendancePercentage() {
        if (students.isEmpty()) {
            return 0.0;
        }
        
        double totalPercentage = students.stream()
                .mapToDouble(Student::getAttendancePercentage)
                .sum();
        
        return totalPercentage / students.size();
    }
    
    public double getClassAttendancePercentage(String className) {
        List<Student> classStudents = getStudentsByClass(className);
        if (classStudents.isEmpty()) {
            return 0.0;
        }
        
        double totalPercentage = classStudents.stream()
                .mapToDouble(Student::getAttendancePercentage)
                .sum();
        
        return totalPercentage / classStudents.size();
    }
    
    public double getTodayAttendancePercentage() {
        String today = LocalDate.now().format(dateFormatter);
        Map<String, Boolean> todayAttendance = getAttendanceForDate(today);
        
        if (todayAttendance.isEmpty()) {
            return 0.0;
        }
        
        long presentCount = todayAttendance.values().stream()
                .mapToLong(present -> present ? 1 : 0)
                .sum();
        
        return (double) presentCount / todayAttendance.size() * 100;
    }
    
    public int getTotalClasses() {
        return students.stream()
                .mapToInt(Student::getTotalClasses)
                .max()
                .orElse(0);
    }
    
    public Map<String, Integer> getAttendanceSummary(String studentId) {
        Student student = getStudentById(studentId);
        if (student == null) {
            return null;
        }
        
        Map<String, Integer> summary = new HashMap<>();
        summary.put("totalClasses", student.getTotalClasses());
        summary.put("presentClasses", student.getPresentClasses());
        summary.put("absentClasses", student.getAbsentClasses());
        return summary;
    }
    
    public String generateIndividualReport(String studentId) {
        Student student = getStudentById(studentId);
        if (student == null) {
            return "Student not found.";
        }
        
        StringBuilder report = new StringBuilder();
        report.append("=== Individual Attendance Report ===\n");
        report.append("Student ID: ").append(student.getStudentId()).append("\n");
        report.append("Name: ").append(student.getName()).append("\n");
        report.append("Email: ").append(student.getEmail()).append("\n");
        report.append("Class: ").append(student.getClassName()).append("\n");
        report.append("Total Classes: ").append(student.getTotalClasses()).append("\n");
        report.append("Present Classes: ").append(student.getPresentClasses()).append("\n");
        report.append("Absent Classes: ").append(student.getAbsentClasses()).append("\n");
        report.append("Attendance Percentage: ").append(String.format("%.1f%%", student.getAttendancePercentage())).append("\n");
        
        return report.toString();
    }
    
    public String generateClassReport(String className) {
        List<Student> classStudents = getStudentsByClass(className);
        if (classStudents.isEmpty()) {
            return "No students found in class: " + className;
        }
        
        StringBuilder report = new StringBuilder();
        report.append("=== Class Attendance Report ===\n");
        report.append("Class: ").append(className).append("\n");
        report.append("Total Students: ").append(classStudents.size()).append("\n");
        report.append("Average Attendance: ").append(String.format("%.1f%%", getClassAttendancePercentage(className))).append("\n\n");
        
        report.append("Student Details:\n");
        for (Student student : classStudents) {
            report.append("- ").append(student.getName())
                  .append(" (").append(student.getStudentId()).append("): ")
                  .append(String.format("%.1f%%", student.getAttendancePercentage())).append("\n");
        }
        
        return report.toString();
    }
    
    public String generateOverallStats() {
        StringBuilder stats = new StringBuilder();
        stats.append("=== Overall Statistics ===\n");
        stats.append("Total Students: ").append(students.size()).append("\n");
        stats.append("Total Classes: ").append(getTotalClasses()).append("\n");
        stats.append("Overall Average Attendance: ").append(String.format("%.1f%%", getOverallAttendancePercentage())).append("\n");
        stats.append("Today's Attendance: ").append(String.format("%.1f%%", getTodayAttendancePercentage())).append("\n\n");
        
        stats.append("Class-wise Statistics:\n");
        for (String className : getAllClasses()) {
            stats.append("- ").append(className).append(": ")
                 .append(getStudentsByClass(className).size()).append(" students, ")
                 .append(String.format("%.1f%%", getClassAttendancePercentage(className)))
                 .append(" average attendance\n");
        }
        
        return stats.toString();
    }
    
    private void saveData() {
        try (ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream(dataFile))) {
            oos.writeObject(students);
        } catch (IOException e) {
            System.err.println("Error saving data: " + e.getMessage());
        }
    }
    
    private void loadData() {
        File file = new File(dataFile);
        if (file.exists()) {
            try (ObjectInputStream ois = new ObjectInputStream(new FileInputStream(file))) {
                students = (List<Student>) ois.readObject();
            } catch (IOException | ClassNotFoundException e) {
                System.err.println("Error loading data: " + e.getMessage());
                students = new ArrayList<>();
            }
        }
    }
    
    public String getCurrentDate() {
        return LocalDate.now().format(dateFormatter);
    }
    
    public boolean isValidDate(String date) {
        try {
            LocalDate.parse(date, dateFormatter);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
    
    public List<Student> searchStudents(String query) {
        String lowerQuery = query.toLowerCase();
        return students.stream()
                .filter(student -> 
                    student.getName().toLowerCase().contains(lowerQuery) ||
                    student.getStudentId().toLowerCase().contains(lowerQuery) ||
                    student.getEmail().toLowerCase().contains(lowerQuery) ||
                    student.getClassName().toLowerCase().contains(lowerQuery)
                )
                .collect(Collectors.toList());
    }
}
