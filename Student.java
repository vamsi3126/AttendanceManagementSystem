import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;

public class Student implements Serializable {
    private static final long serialVersionUID = 1L;
    
    private String studentId;
    private String name;
    private String email;
    private String className;
    private Map<String, Boolean> attendance; // Date -> Present/Absent
    
    public Student() {
        this.attendance = new HashMap<>();
    }
    
    public Student(String studentId, String name, String email, String className) {
        this.studentId = studentId;
        this.name = name;
        this.email = email;
        this.className = className;
        this.attendance = new HashMap<>();
    }
    
    public String getStudentId() {
        return studentId;
    }
    
    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getClassName() {
        return className;
    }
    
    public void setClassName(String className) {
        this.className = className;
    }
    
    public Map<String, Boolean> getAttendance() {
        return attendance;
    }
    
    public void setAttendance(Map<String, Boolean> attendance) {
        this.attendance = attendance;
    }
    
    public void markPresent(String date) {
        attendance.put(date, true);
    }
    
    public void markAbsent(String date) {
        attendance.put(date, false);
    }
    
    public boolean isPresent(String date) {
        return attendance.getOrDefault(date, false);
    }
    
    public double getAttendancePercentage() {
        if (attendance.isEmpty()) {
            return 0.0;
        }
        
        long presentCount = attendance.values().stream()
                .mapToLong(present -> present ? 1 : 0)
                .sum();
        
        return (double) presentCount / attendance.size() * 100;
    }
    
    public int getTotalClasses() {
        return attendance.size();
    }
    
    public int getPresentClasses() {
        return (int) attendance.values().stream()
                .mapToLong(present -> present ? 1 : 0)
                .sum();
    }
    
    public int getAbsentClasses() {
        return getTotalClasses() - getPresentClasses();
    }
    
    @Override
    public String toString() {
        return String.format("Student{ID='%s', Name='%s', Email='%s', Class='%s', Attendance=%.1f%%}",
                studentId, name, email, className, getAttendancePercentage());
    }
    
    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Student student = (Student) obj;
        return studentId != null ? studentId.equals(student.studentId) : student.studentId == null;
    }
    
    @Override
    public int hashCode() {
        return studentId != null ? studentId.hashCode() : 0;
    }
}
