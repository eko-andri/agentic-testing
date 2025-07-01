-- Test History Database Schema
-- Stores metadata about test files, execution history, and context

-- Test Files table - stores information about test files
CREATE TABLE IF NOT EXISTS test_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL UNIQUE,
    filepath TEXT NOT NULL,
    test_type TEXT NOT NULL, -- 'core', 'business', 'integration', etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active', -- 'active', 'deprecated', 'archived'
    file_hash TEXT, -- SHA256 hash of file content for change detection
    metadata TEXT -- JSON metadata for additional info
);

-- Test Contexts table - stores business context that generated tests
CREATE TABLE IF NOT EXISTS test_contexts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    acceptance_criteria TEXT,
    context_hash TEXT NOT NULL, -- Hash of description+criteria for deduplication
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    field_count INTEGER DEFAULT 0,
    relevant_fields TEXT -- JSON array of filtered fields
);

-- Test Executions table - stores test run results
CREATE TABLE IF NOT EXISTS test_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_file_id INTEGER,
    execution_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL, -- 'passed', 'failed', 'skipped', 'error'
    duration_ms INTEGER,
    error_message TEXT,
    test_count INTEGER DEFAULT 0,
    passed_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    FOREIGN KEY (test_file_id) REFERENCES test_files(id)
);

-- Test Context Relations table - many-to-many relationship
CREATE TABLE IF NOT EXISTS test_context_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_file_id INTEGER,
    test_context_id INTEGER,
    relevance_score REAL DEFAULT 1.0, -- How relevant this context is to the test
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_file_id) REFERENCES test_files(id),
    FOREIGN KEY (test_context_id) REFERENCES test_contexts(id),
    UNIQUE(test_file_id, test_context_id)
);

-- Form Fields table - stores detected form fields
CREATE TABLE IF NOT EXISTS form_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    field_name TEXT NOT NULL,
    field_type TEXT NOT NULL,
    field_id TEXT,
    is_required BOOLEAN DEFAULT 0,
    validation_rules TEXT, -- JSON of validation rules
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(field_name, field_type)
);

-- Test Validations table - stores validated tests with backup content
CREATE TABLE IF NOT EXISTS test_validations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_file_id INTEGER,
    filepath TEXT NOT NULL,
    filename TEXT NOT NULL,
    validation_status TEXT DEFAULT 'draft', -- 'draft', 'validated', 'deprecated'
    validated_by TEXT,
    validated_at DATETIME,
    file_content_backup TEXT, -- Full backup of validated test content
    file_hash TEXT, -- Hash untuk detect changes
    validation_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (test_file_id) REFERENCES test_files(id),
    UNIQUE(filepath)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_files_status ON test_files(status);
CREATE INDEX IF NOT EXISTS idx_test_files_type ON test_files(test_type);
CREATE INDEX IF NOT EXISTS idx_test_contexts_hash ON test_contexts(context_hash);
CREATE INDEX IF NOT EXISTS idx_test_executions_status ON test_executions(status);
CREATE INDEX IF NOT EXISTS idx_test_executions_time ON test_executions(execution_time);
CREATE INDEX IF NOT EXISTS idx_form_fields_name ON form_fields(field_name);
CREATE INDEX IF NOT EXISTS idx_test_validations_status ON test_validations(validation_status);
CREATE INDEX IF NOT EXISTS idx_test_validations_filepath ON test_validations(filepath);

-- Views for common queries
CREATE VIEW IF NOT EXISTS test_summary AS
SELECT 
    tf.filename,
    tf.test_type,
    tf.status,
    tf.created_at,
    COUNT(te.id) as execution_count,
    MAX(te.execution_time) as last_execution,
    AVG(te.duration_ms) as avg_duration_ms,
    SUM(te.passed_count) as total_passed,
    SUM(te.failed_count) as total_failed
FROM test_files tf
LEFT JOIN test_executions te ON tf.id = te.test_file_id
GROUP BY tf.id;

CREATE VIEW IF NOT EXISTS recent_executions AS
SELECT 
    tf.filename,
    te.status,
    te.execution_time,
    te.duration_ms,
    te.test_count,
    te.passed_count,
    te.failed_count,
    te.error_message
FROM test_executions te
JOIN test_files tf ON te.test_file_id = tf.id
ORDER BY te.execution_time DESC
LIMIT 50;

-- View for validated tests with file status
CREATE VIEW IF NOT EXISTS validated_tests_summary AS
SELECT 
    tv.filepath,
    tv.filename,
    tv.validation_status,
    tv.validated_by,
    tv.validated_at,
    tv.validation_notes,
    tf.status as file_status,
    tf.test_type,
    tv.file_hash,
    CASE 
        WHEN tv.file_content_backup IS NOT NULL THEN 'BACKUP_AVAILABLE'
        ELSE 'NO_BACKUP'
    END as backup_status
FROM test_validations tv
LEFT JOIN test_files tf ON tv.test_file_id = tf.id
WHERE tv.validation_status = 'validated'
ORDER BY tv.validated_at DESC;
