CREATE DATABASE meditrack;
USE meditrack;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE medications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE intake_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    medication_id INT,
    intake_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (medication_id) REFERENCES medications(id)
);

CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(255),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO medications (user_id, name, dosage, frequency) VALUES 
(1, 'Aspirin', '100mg', 'Daily'),
(1, 'Vitamin D', '1000IU', 'Daily'),
(1, 'Metformin', '500mg', 'Twice daily');

INSERT INTO intake_records (user_id, medication_id) VALUES 
(1, 1),(1, 2),(1, 1),(1, 3);

INSERT INTO notifications (user_id, title, message) VALUES 
(1, 'Refill Reminder', 'Aspirin is running low'),
(1, 'Missed Dose', 'You missed Vitamin D today'),
(1, 'Appointment', 'Doctor visit tomorrow');