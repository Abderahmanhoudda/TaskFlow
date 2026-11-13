-- TaskFlow Database Schema
-- MySQL 8.0+

-- Create database (run once):
-- CREATE DATABASE taskflow_db;
-- USE taskflow_db;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
    status ENUM('To Do', 'In Progress', 'Done') DEFAULT 'To Do',
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_tasks (user_id),
    INDEX idx_task_status (status),
    INDEX idx_task_priority (priority),
    INDEX idx_task_due_date (due_date)
);

-- Indexes for search and filtering
CREATE INDEX idx_task_title ON tasks(title(191));
CREATE INDEX idx_task_status_priority ON tasks(status, priority);

-- Sample query for dashboard:
-- SELECT 
--     COUNT(*) as total_tasks,
--     SUM(CASE WHEN status = 'To Do' THEN 1 ELSE 0 END) as todo_count,
--     SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress_count,
--     SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) as done_count
-- FROM tasks WHERE user_id = ?;