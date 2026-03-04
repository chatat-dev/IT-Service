-- Email Settings Table
CREATE TABLE IF NOT EXISTS email_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider ENUM('gmail', 'outlook', 'custom') DEFAULT 'custom',
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INT DEFAULT 587,
    smtp_user VARCHAR(255) NOT NULL,
    smtp_pass VARCHAR(255) NOT NULL,
    sender_name VARCHAR(255) DEFAULT 'IT Service',
    sender_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
