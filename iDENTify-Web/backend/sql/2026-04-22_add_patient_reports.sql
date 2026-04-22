CREATE TABLE IF NOT EXISTS patient_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  dentist_id INT NOT NULL,
  branch_id INT,
  reason TEXT NOT NULL,
  status ENUM('pending', 'reviewed', 'valid', 'dismissed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (dentist_id) REFERENCES dentists(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES clinic_branches(id) ON DELETE SET NULL
);